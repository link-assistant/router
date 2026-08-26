//! Link.Assistant.Router binary entry point.
//!
//! Parses the [`Cli`](link_assistant_router::cli::Cli) (lino-arguments + clap), then either:
//!
//! 1. Runs the HTTP server (default — `Command::Serve` or no subcommand), or
//! 2. Dispatches a CLI subcommand (`tokens`, `accounts`, `providers`, `clients`,
//!    `auth`, `logs`, `tls`, `doctor`, `configure`, `with`) and exits without
//!    binding a port. Those that read or change router state act on the router
//!    this machine is pointed at, which may be a remote deployment (issue
//!    #294); `configure`, `clients` and `auth --local` act here.
//!
//! Shared services are constructed together so the CLI subcommands operate on the
//! exact same backing state the HTTP server would.

use std::process::ExitCode;
use std::sync::Arc;
use std::time::Duration;

mod auth_cli;
mod auth_import;
#[path = "logs_cli.rs"]
mod logs_cli;

use axum::middleware::from_fn_with_state;
use link_assistant_router::accounts::{AccountRouter, AccountRouterOptions};
use link_assistant_router::cli::{AccountOp, Command, TokenOp};
use link_assistant_router::config::{Config, RoutingMode, StoragePolicy};
use link_assistant_router::crater::{ForgeFedTaskProvider, TaskProvider};
use link_assistant_router::login::LoginManager;
use link_assistant_router::metrics::Metrics;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::providers::ProviderStore;
use link_assistant_router::proxy::AppState;
use link_assistant_router::storage::{TokenStore, build_token_store};
use link_assistant_router::subscription::SubscriptionReader;
use link_assistant_router::token::{ADMIN_SCOPE, IssueRequest, TokenManager};
use log_lazy::LogLazy;
use tower_http::trace::TraceLayer;

type SharedState = (Arc<dyn TokenStore>, Option<AccountRouter>);
type AnyError = Box<dyn std::error::Error>;

fn main() -> ExitCode {
    link_assistant_router::entrypoint::run_on_a_deep_stack(run)
}

async fn run() -> ExitCode {
    let arguments =
        link_assistant_router::cli::protect_client_arguments(std::env::args_os().collect(), true);
    let cli = link_assistant_router::cli::parse_arguments(arguments);

    // The wrapper and managed-server commands do not start a router and must
    // not require server-only configuration or pollute client stdout with
    // router startup logs.
    match cli.command.as_ref() {
        Some(Command::With(args)) => {
            return link_assistant_router::with_command::run(args).await;
        }
        Some(Command::Server { op }) => {
            return link_assistant_router::server_command::run(op).await;
        }
        // Permanent client setup mints its credential from the router it is
        // pointing the client at, over that router's admin API. It never signs
        // a token here, so the local signing secret is not its to hold — the
        // same reasoning as the remote commands in issue #294.
        Some(Command::Configure(args)) => {
            return link_assistant_router::configure::run(args).await;
        }
        _ => {}
    }

    let verbose = cli.verbose;
    let request_log = cli.request_log.clone();
    let request_log_max_bytes = cli.request_log_max_bytes;
    let request_log_max_total_bytes = cli.request_log_max_total_bytes;

    link_assistant_router::logging::init(verbose);

    let logger = link_assistant_router::logging::build_lazy(verbose);

    tracing::info!("Link.Assistant.Router v{}", link_assistant_router::VERSION);
    if verbose {
        tracing::info!("Verbose logging enabled");
    }

    // `TOKEN_SECRET` is required where signing happens, not per command family
    // (issues #300, #308).
    let cli = link_assistant_router::remote_command::relax_token_secret_for_cli(cli);

    let config = match cli.into_config() {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Configuration error: {e}");
            return ExitCode::from(2);
        }
    };

    if let Some(command) = cli.command.as_ref()
        && let Some(code) = link_assistant_router::remote_command::refuse_managed(command)
    {
        return code;
    }
    // One targeting rule for every command that reads or changes router state:
    // act on the router this machine is pointed at (issue #294).
    if let Some(command) = cli.command.as_ref()
        && link_assistant_router::remote_command::may_be_remote(command)
        && let Some(target) = link_assistant_router::remote_command::target_of(command)
        // `--data-dir` and `--claude-code-home` name this machine's state, so
        // a discovered router must not answer for them; an explicit `--server`
        // still wins.
        && (target.server.is_some()
            || !link_assistant_router::remote_command::names_local_state(&cli))
    {
        match link_assistant_router::remote_command::resolve(target).await {
            Ok(link_assistant_router::remote_command::Target::Remote(server)) => {
                return run_remote_command(&server, command).await;
            }
            Ok(link_assistant_router::remote_command::Target::Local) => {}
            Err(code) => return code,
        }
    }

    match cli.command.as_ref() {
        None | Some(Command::Serve) => match run_server(
            config,
            logger,
            request_log.as_deref(),
            request_log_max_bytes,
            request_log_max_total_bytes,
        )
        .await
        {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                tracing::error!("server error: {e}");
                ExitCode::from(1)
            }
        },
        Some(Command::Tokens { op }) => run_tokens(&config, op),
        Some(Command::Accounts { op }) => run_accounts(&config, op),
        Some(Command::Providers { op }) => link_assistant_router::providers_cli::run(&config, op),
        Some(Command::Clients { op }) => {
            link_assistant_router::client_command::run(&config, cli.home.as_deref(), op).await
        }
        Some(Command::With(_) | Command::Server { .. } | Command::Configure(_)) => {
            unreachable!("handled before config")
        }
        Some(Command::Auth { op }) => {
            auth_cli::run(
                &config,
                op,
                link_assistant_router::remote_command::names_local_state(&cli),
            )
            .await
        }
        Some(Command::Doctor { .. }) => run_doctor(&config).await,
        Some(Command::Tls { op }) => link_assistant_router::tls_cli::run(&config, op),
        Some(Command::Logs { op }) => logs_cli::run(&config, request_log.as_deref(), op),
    }
}

/// Construct the persistent token store and the optional multi-account router
/// for the given [`Config`]. Both are needed by both the server and the CLI
/// subcommands.
fn build_shared_state(config: &Config) -> Result<SharedState, AnyError> {
    if !config.data_dir.exists() {
        std::fs::create_dir_all(&config.data_dir)?;
    }
    let store = build_token_store(config.storage_policy, &config.data_dir)?;
    let account_router =
        if config.additional_account_dirs.is_empty() && config.account_request_limits.is_empty() {
            None
        } else {
            let (provider, primary) = config.subscription_pool();
            let options = AccountRouterOptions {
                strategy: config.account_routing_strategy,
                cooldown: Duration::from_secs(config.account_cooldown_secs),
                session_affinity_ttl: Duration::from_secs(config.session_affinity_ttl_secs),
                request_limits: config
                    .account_request_limits
                    .iter()
                    .map(|limit| (*limit != 0).then_some(*limit))
                    .collect(),
            };
            Some(AccountRouter::new_for_provider(
                primary,
                &config.additional_account_dirs,
                provider,
                options,
            ))
        };
    Ok((store, account_router))
}

/// TTL of the admin token minted on first start, in hours (one year).
const BOOTSTRAP_ADMIN_TTL_HOURS: i64 = 24 * 365;

/// Label recorded on the auto-generated bootstrap admin token.
const BOOTSTRAP_ADMIN_LABEL: &str = "bootstrap-admin";

/// Make sure the deployment starts with a closed, reachable admin surface.
///
/// A fresh deployment that configures no admin credential would otherwise
/// have to choose between "open to everyone" and "impossible to administer".
/// Instead we mint one admin-scoped token and print it once — the pattern used
/// by most self-hosted services. Nothing is minted when the operator already
/// provisioned a credential externally (`TOKEN_ADMIN_KEY`), when a usable
/// admin token already exists in the store, or when anonymous admin access was
/// explicitly opted into.
fn announce_admin_access(config: &Config, token_manager: &TokenManager) {
    if config.allow_anonymous_admin {
        tracing::warn!(
            "--allow-anonymous-admin is set: /api/tokens*, /api/providers* and /api/login* accept unauthenticated requests"
        );
        return;
    }
    if config.admin_key.is_some() {
        tracing::info!("Admin access: TOKEN_ADMIN_KEY configured (bootstrap credential)");
        return;
    }
    match token_manager.has_active_admin_token() {
        Ok(true) => {
            tracing::info!("Admin access: existing admin token found in the token store");
            return;
        }
        Ok(false) => {}
        Err(e) => {
            tracing::warn!("could not inspect the token store for admin tokens: {e}");
            return;
        }
    }
    match token_manager.issue_admin_token(BOOTSTRAP_ADMIN_TTL_HOURS, BOOTSTRAP_ADMIN_LABEL) {
        Ok(token) => {
            // Printed to stdout as well as the log: this value is shown once
            // and never recoverable afterwards (only its metadata is stored).
            println!("─────────────────────────────────────────────────────────────");
            println!("Admin token (shown once, store it now): {token}");
            println!("Use it as: Authorization: Bearer <token>");
            println!("Rotate it with: link-assistant-router tokens rotate <id>");
            println!("─────────────────────────────────────────────────────────────");
            tracing::info!("Generated a bootstrap admin token; admin endpoints are closed");
        }
        Err(e) => tracing::error!("failed to generate a bootstrap admin token: {e}"),
    }
}

async fn run_server(
    config: Config,
    logger: LogLazy,
    request_log: Option<&std::path::Path>,
    request_log_max_bytes: u64,
    request_log_max_total_bytes: u64,
) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Upstream: {}", config.upstream_base_url);
    tracing::info!("Upstream provider: {:?}", config.upstream_provider);
    let (subscription_provider, subscription_home) = config.subscription_pool();
    tracing::info!(
        "Subscription home ({subscription_provider}): {}",
        subscription_home.display()
    );
    tracing::info!("Routing mode: {:?}", config.routing_mode);
    tracing::info!("Storage policy: {:?}", config.storage_policy);
    if config.routing_mode == RoutingMode::Cli || config.routing_mode == RoutingMode::Hybrid {
        tracing::warn!(
            "RoutingMode::{:?} is configured but the CLI backend is not yet wired; falling back to direct.",
            config.routing_mode
        );
    }

    let (store, account_router) = build_shared_state(&config)?;
    if let Some(router) = account_router.as_ref() {
        tracing::info!("Multi-account routing enabled ({} accounts)", router.len());
    }

    let token_manager = TokenManager::with_store(&config.token_secret, store);
    // Requests in flight when the previous process stopped never settled their
    // spend reservations. Nothing is in flight yet, so any reservation still on
    // disk is stale and would otherwise pin budget against the cap forever.
    match token_manager.release_stale_reservations() {
        Ok(0) => {}
        Ok(cleared) => tracing::info!("released {cleared} stale token spend reservation(s)"),
        Err(error) => tracing::warn!("failed to release stale token reservations: {error}"),
    }
    announce_admin_access(&config, &token_manager);
    let oauth_provider = OAuthProvider::new(&config.claude_code_home);
    let metrics = Arc::new(Metrics::default());
    let provider_store = ProviderStore::open(&config.data_dir, &config.token_secret)?;

    let client = link_assistant_router::upstream_client::build_upstream_client()?;
    let crater_provider =
        if config.upstream_provider == link_assistant_router::config::UpstreamProvider::Crater {
            Some(Arc::new(ForgeFedTaskProvider::new(
                client.clone(),
                config.crater.clone(),
            )) as Arc<dyn TaskProvider>)
        } else {
            None
        };

    // Keep readers for every vendor so automatic routing can discover all
    // mounted subscriptions. Claude's configured home may differ from HOME.
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let subscription_readers = link_assistant_router::subscription::all_subscription_readers(
        &config.claude_code_home,
        &user_home,
    );
    for reader in &subscription_readers {
        tracing::info!(
            "Subscription provider {}: reading credentials from {}",
            reader.provider(),
            reader.home().display()
        );
    }
    let subscription_reader = link_assistant_router::subscription::active_subscription_reader(
        config.upstream_provider,
        &subscription_readers,
    );
    let model_catalogs = Arc::new(link_assistant_router::model_catalog::ModelCatalogCache::new());

    // The admin credential: a deploy-time key when provided, otherwise the
    // persisted first-visitor claim (unclaimed until someone confirms one).
    // The claim mints its credential through the shared token manager, so a
    // first-visitor administrator holds the same admin-scoped `la_sk_` JWT the
    // CLI and the bootstrap path hand out — one credential model, one store.
    let admin_claim = Arc::new(
        link_assistant_router::admin::AdminClaim::load(
            config.admin_key.clone(),
            &config.data_dir,
            config.admin_ui.candidate_ttl,
        )
        .with_token_manager(token_manager.clone()),
    );

    let state = AppState {
        client,
        token_manager,
        oauth_provider,
        account_router,
        subscription_reader,
        subscription_base_url: None,
        subscription_readers,
        model_catalogs: Arc::clone(&model_catalogs),
        subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
        upstream_base_url: config.upstream_base_url.clone(),
        upstream_provider: config.upstream_provider,
        gonka: link_assistant_router::gonka::GonkaConfig::new(
            config.gonka_private_key.clone(),
            &config.gonka_source_url,
            config.gonka_model.clone(),
        ),
        bridge_model: config.bridge_model.clone(),
        bridge_model_policy: config.bridge_model_policy,
        audit: std::sync::Arc::new(link_assistant_router::audit::AuditLog::to_path(
            config.audit_log.as_deref(),
        )),
        request_log: link_assistant_router::logging::request_log(
            &config.data_dir,
            request_log,
            request_log_max_bytes,
            request_log_max_total_bytes,
        ),
        crater: crater_provider,
        openai_compatible: config.openai_compatible.clone(),
        provider_store,
        logger,
        max_proxy_request_bytes: config.max_proxy_request_bytes,
        admin: Arc::clone(&admin_claim),
        admin_key: config.admin_key.clone(),
        allow_anonymous_admin: config.allow_anonymous_admin,
        metrics: Arc::clone(&metrics),
        activitypub_actor_base_url: config.activitypub_actor_base_url.clone(),
        activitypub_public_key_pem: config.activitypub_public_key_pem.clone(),
        mpp: config.mpp.clone(),
        login_manager: LoginManager::new(config.login.clone()),
        // The resolved directory, not `DATA_DIR`: clap merged the flag and the
        // environment into `config.data_dir`, and only that value knows which
        // one the operator used (issue #282).
        github: link_assistant_router::github_proxy::GitHubProxyConfig::from_env_with_data_dir(
            Some(config.data_dir.as_path()),
        )
        .map_err(std::io::Error::other)?,
    };

    state.register_credential_recovery(&link_assistant_router::app_state::VendorClis {
        claude: config.claude_cli_bin.as_deref(),
        codex: config.codex_cli_bin.as_deref(),
    });
    // Persist terminal refusals so the CLI — a separate short-lived process
    // that performs no refresh — can report a revoked chain too (issue #245).
    state
        .subscription_cache
        .persist_rejections_in(&config.data_dir);

    let catalog_refresh = tokio::spawn(
        link_assistant_router::model_catalog::refresh_catalogs_forever(
            state.client.clone(),
            state.subscription_readers.clone(),
            Arc::clone(&state.subscription_cache),
            Arc::clone(&state.model_catalogs),
        ),
    );

    let app = link_assistant_router::server_router::router(state.clone(), &config)
        .layer(from_fn_with_state(
            state.clone(),
            link_assistant_router::request_log::log_http_exchange,
        ))
        .layer(TraceLayer::new_for_http());

    tracing::info!("Listening on {}", config.listen_addr);

    let admin_server = if config.admin_ui.enabled {
        let admin_addr = config.admin_ui.listen_addr;
        let admin_app = link_assistant_router::admin_api::router(state.clone())
            .layer(from_fn_with_state(
                state.clone(),
                link_assistant_router::request_log::log_http_exchange,
            ))
            .layer(TraceLayer::new_for_http());
        let admin_listener = tokio::net::TcpListener::bind(admin_addr).await?;
        tracing::info!("Admin UI listening on {admin_addr}");
        if admin_claim.is_claimed() {
            tracing::info!("Admin credential present; bootstrap is closed");
        } else {
            tracing::warn!(
                "Admin is unclaimed: the first visitor to {admin_addr} that confirms a claim becomes admin"
            );
        }
        Some(tokio::spawn(async move {
            if let Err(e) = axum::serve(admin_listener, admin_app)
                .with_graceful_shutdown(shutdown_signal())
                .await
            {
                tracing::error!("admin UI server error: {e}");
            }
        }))
    } else {
        tracing::info!("Admin UI disabled (set --admin-port / ADMIN_PORT to enable)");
        None
    };

    let chat_channels = spawn_chat_channels(&config, &state, Arc::clone(&admin_claim));

    // A unix socket is the one plaintext route `gh` accepts, so it reaches the
    // proxy without a certificate it has no way to trust (issue #265).
    // Unix domain sockets do not exist on Windows, so the listener is compiled
    // only where it can be served.
    #[cfg(unix)]
    let socket_server = link_assistant_router::unix_listener::serve_configured(app.clone()).await?;
    #[cfg(not(unix))]
    let socket_server: Option<tokio::task::JoinHandle<()>> = None;

    // `gh` will not talk plaintext to a custom host, so a router that cannot
    // serve HTTPS cannot mediate GitHub traffic at all without a separate
    // terminator in front of it (issue #263).
    match link_assistant_router::tls::from_env(std::path::Path::new(&config.data_dir)) {
        Ok(link_assistant_router::tls::TlsSetup::Enabled { cert, key }) => {
            // Boxed so the HTTPS serve future is heap-allocated: it is large,
            // and embedding it here would put it in every subcommand's frame.
            let serve = link_assistant_router::tls::serve_https(config.listen_addr, app, cert, key);
            Box::pin(serve)
                .await
                .map_err(|error| -> AnyError { error.to_string().into() })?;
        }
        Ok(link_assistant_router::tls::TlsSetup::Disabled) => {
            let listener = tokio::net::TcpListener::bind(config.listen_addr).await?;
            axum::serve(listener, app)
                .with_graceful_shutdown(shutdown_signal())
                .await?;
        }
        Err(error) => return Err(error.into()),
    }
    if let Some(handle) = socket_server {
        handle.abort();
    }
    if let Some(handle) = admin_server {
        handle.abort();
    }
    for handle in chat_channels {
        handle.abort();
    }
    catalog_refresh.abort();
    Ok(())
}

/// Start the optional Telegram and VK admin channels.
///
/// Both are off unless a bot token is configured, so an upgrade adds no new
/// behaviour; when they do run they share the *same*
/// [`link_assistant_router::admin::AdminClaim`] as the web
/// UI, which is what makes the first-admin claim system-wide rather than one
/// per channel.
fn spawn_chat_channels(
    config: &Config,
    state: &AppState,
    admin_claim: Arc<link_assistant_router::admin::AdminClaim>,
) -> Vec<tokio::task::JoinHandle<()>> {
    let chat_config = config.chat_admin.clone();
    if !chat_config.telegram_enabled() && !chat_config.vk_enabled() {
        tracing::info!(
            "Chat admin channels disabled (set TELEGRAM_BOT_TOKEN and/or VK_BOT_TOKEN to enable)"
        );
        return Vec::new();
    }
    let chat = Arc::new(
        link_assistant_router::chat_admin::ChatAdmin::new(
            admin_claim,
            state.token_manager.clone(),
            config.admin_key.clone(),
            chat_config.clone(),
        )
        .with_status(Arc::new(state.clone())),
    );
    let mut handles = Vec::new();
    if chat_config.telegram_enabled() {
        let chat = Arc::clone(&chat);
        let client = state.client.clone();
        handles.push(tokio::spawn(async move {
            link_assistant_router::telegram::run(chat, client).await;
        }));
    }
    if chat_config.vk_enabled() {
        let chat = Arc::clone(&chat);
        let client = state.client.clone();
        handles.push(tokio::spawn(async move {
            link_assistant_router::vk::run(chat, client).await;
        }));
    }
    if chat.admin_claim().is_claimed() {
        tracing::info!("Chat admin: a credential exists; /start will ask for one");
    } else {
        tracing::warn!(
            "Chat admin: unclaimed — the first private-chat user to confirm a /start becomes admin"
        );
    }
    handles
}

/// Run a state-touching command against the *selected* router.
///
/// Where the deployment already answers the operation over its admin API, it
/// is honoured. Where it does not, the command says so and names the target,
/// which is the shape issue #284 gave `auth gh` — an error naming the real
/// target is honest, where one describing local state as though it were the
/// target is not (issue #294).
async fn run_remote_command(
    server: &link_assistant_router::managed_server::ResolvedServer,
    command: &Command,
) -> ExitCode {
    use link_assistant_router::remote_command::{no_remote_form, refuse};

    match command {
        // The routes exist and are admin-gated; only the wiring was missing.
        Command::Tokens { op } => link_assistant_router::tokens_remote::run(server, op).await,
        Command::Accounts { .. } => link_assistant_router::auth_remote::accounts(server).await,
        Command::Providers { op } => {
            link_assistant_router::providers_cli::run_remote(server, op).await
        }
        // The request log is written to the deployment's own disk and no
        // endpoint serves it back, so there is nothing to ask for. Saying that
        // beats answering from this machine's log, which is a different
        // deployment's traffic.
        Command::Logs { .. } => refuse(no_remote_form(
            "logs",
            server,
            "the request log lives on that deployment's disk and no endpoint serves it; \
             run `router logs` there",
        )),
        // `doctor` reports on the machine it runs on — its files, config and
        // credentials. `auth status` already answers the credential half for a
        // remote deployment.
        Command::Doctor { .. } => refuse(no_remote_form(
            "doctor",
            server,
            "run `router doctor` on that deployment; `router auth status` reports its \
             credentials from here",
        )),
        // The certificate and its key live on the deployment's own disk, and
        // no endpoint serves either. Printing this machine's PEM instead would
        // not be a wrong report — it would be trust in the wrong key, which is
        // why silence was the one unacceptable answer here (issue #308).
        Command::Tls { .. } => refuse(no_remote_form(
            "tls",
            server,
            "the certificate is generated on the deployment that serves it; run `router tls` \
             there and distribute the PEM it prints",
        )),
        // Never reached: `target_of` returns `None` for every other command.
        _ => ExitCode::from(1),
    }
}

fn run_tokens(config: &Config, op: &TokenOp) -> ExitCode {
    let (store, _account_router) = match build_shared_state(config) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::from(1);
        }
    };
    // Required where signing happens, not per family. `list`, `show` and
    // `revoke` read and edit the store; none of them mints or validates a
    // token, and refusing to *start* without a secret they never use only
    // taught operators to keep a deployment's signing secret exported in their
    // shell (issue #308). Issuing and rotating still sign, so they still need
    // it — and `TokenManager` refuses the stand-in at the point of use anyway.
    if matches!(op, TokenOp::Issue { .. } | TokenOp::Rotate { .. })
        && let Err(error) = link_assistant_router::token_secret::ensure_real(&config.token_secret)
    {
        eprintln!("error: {error}");
        return ExitCode::from(2);
    }
    let mgr = TokenManager::with_store(&config.token_secret, store);
    match op {
        TokenOp::Issue {
            ttl_hours,
            label,
            account,
            max_requests,
            max_tokens,
            rate_limit_per_minute,
            admin,
            github_repo,
            ..
        } => {
            let request = IssueRequest {
                ttl_hours: *ttl_hours,
                label,
                account: account.as_deref(),
                max_requests: *max_requests,
                max_tokens: *max_tokens,
                rate_limit_per_minute: *rate_limit_per_minute,
                scope: if *admin { ADMIN_SCOPE } else { "" },
                github_repos: github_repo.clone(),
            };
            // Shared with the HTTP and chat surfaces (issue #194).
            if let Err(message) = request.validate() {
                eprintln!("error: {message}");
                return ExitCode::from(2);
            }
            match mgr.issue(&request) {
                Ok(t) => {
                    println!("{t}");
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: {e}");
                    ExitCode::from(1)
                }
            }
        }
        TokenOp::Rotate {
            id,
            ttl_hours,
            label,
            max_requests,
            max_tokens,
            rate_limit_per_minute,
            account,
            ..
        } => match mgr.rotate_token_with(
            id,
            &link_assistant_router::token::RotateOverrides {
                label: (!label.is_empty()).then_some(label.as_str()),
                ttl_hours: Some(*ttl_hours),
                max_requests: *max_requests,
                max_tokens: *max_tokens,
                rate_limit_per_minute: *rate_limit_per_minute,
                account: account.as_deref(),
            },
        ) {
            Ok(t) => {
                println!("{t}");
                eprintln!("revoked {id}");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        TokenOp::List { json, .. } => match mgr.list_tokens() {
            Ok(records) => {
                // Rendered by the shared printer, so the local and remote
                // tables cannot drift: an operator reading one has no way to
                // tell which machine answered (issue #293).
                let rows: Vec<serde_json::Value> = records
                    .into_iter()
                    .map(|record| serde_json::to_value(record).unwrap_or_default())
                    .collect();
                if *json {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&rows).unwrap_or_else(|_| "[]".to_string())
                    );
                } else {
                    link_assistant_router::token_report::print_table(&rows);
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        TokenOp::Revoke { id, .. } | TokenOp::Expire { id, .. } => match mgr.revoke_token(id) {
            Ok(()) => {
                println!("revoked {id}");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        TokenOp::Show { id, .. } => match mgr.list_tokens() {
            Ok(records) => records.into_iter().find(|r| r.id == *id).map_or_else(
                || {
                    eprintln!("not found: {id}");
                    ExitCode::from(2)
                },
                |r| {
                    println!("{}", serde_json::to_string_pretty(&r).unwrap_or_default());
                    ExitCode::SUCCESS
                },
            ),
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
    }
}

fn run_accounts(config: &Config, op: &AccountOp) -> ExitCode {
    let router = match build_shared_state(config) {
        Ok((_, Some(r))) => r,
        Ok((_, None)) => {
            // Single-account mode: synthesise a one-account router for inspection.
            let (provider, primary) = config.subscription_pool();
            AccountRouter::new_for_provider(
                primary,
                &[],
                provider,
                AccountRouterOptions {
                    strategy: config.account_routing_strategy,
                    cooldown: Duration::from_secs(config.account_cooldown_secs),
                    session_affinity_ttl: Duration::from_secs(config.session_affinity_ttl_secs),
                    request_limits: config
                        .account_request_limits
                        .iter()
                        .map(|limit| (*limit != 0).then_some(*limit))
                        .collect(),
                },
            )
        }
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::from(1);
        }
    };
    // The CLI performs no refresh of its own, so it reads what a running
    // router recorded rather than guessing from the file alone (issue #245).
    let refreshes = link_assistant_router::refresh::TokenCache::new();
    refreshes.persist_rejections_in(&config.data_dir);
    link_assistant_router::accounts_cli::run(&router, Some(&refreshes), op)
}

async fn run_doctor(config: &Config) -> ExitCode {
    println!("Link.Assistant.Router v{}", link_assistant_router::VERSION);
    println!("listen_addr            : {}", config.listen_addr);
    println!("upstream_base_url      : {}", config.upstream_base_url);
    println!("upstream_provider      : {:?}", config.upstream_provider);
    println!(
        "openai_provider        : {} ({})",
        config.openai_compatible.provider_name, config.openai_compatible.base_url
    );
    println!(
        "crater_inbox           : {}",
        config.crater.inbox.as_deref().unwrap_or("<unset>")
    );
    println!("crater_actor           : {}", config.crater.actor);
    println!("claude_code_home       : {}", config.claude_code_home);
    println!("routing_mode           : {:?}", config.routing_mode);
    println!("storage_policy         : {:?}", config.storage_policy);
    println!("data_dir               : {}", config.data_dir.display());
    println!("enable_openai_api      : {}", config.enable_openai_api);
    println!("enable_anthropic_api   : {}", config.enable_anthropic_api);
    println!("enable_metrics         : {}", config.enable_metrics);
    println!(
        "additional_account_dirs: {} configured",
        config.additional_account_dirs.len()
    );
    println!(
        "account_routing_strategy: {:?}",
        config.account_routing_strategy
    );
    println!("account_cooldown_secs   : {}", config.account_cooldown_secs);
    println!(
        "account_request_limits  : {:?}",
        config.account_request_limits
    );
    println!(
        "session_affinity_ttl   : {}",
        config.session_affinity_ttl_secs
    );
    println!(
        "admin_key              : {}",
        if config.admin_key.is_some() {
            "set"
        } else {
            "<unset>"
        }
    );
    println!(
        "admin_ui               : {}",
        if config.admin_ui.enabled {
            format!("enabled on {}", config.admin_ui.listen_addr)
        } else {
            "disabled".to_string()
        }
    );
    {
        let claim = link_assistant_router::admin::AdminClaim::load(
            config.admin_key.clone(),
            &config.data_dir,
            config.admin_ui.candidate_ttl,
        );
        let status = claim.status();
        println!(
            "admin_credential       : {}",
            match status.credential_kind {
                link_assistant_router::admin::CredentialKind::Environment =>
                    "provisioned by environment".to_string(),
                link_assistant_router::admin::CredentialKind::Jwt => format!(
                    "claimed admin JWT {} (first-visitor bootstrap closed)",
                    status.token_id.as_deref().unwrap_or("<unknown>")
                ),
                link_assistant_router::admin::CredentialKind::LegacyOpaque =>
                    "claimed (first-visitor bootstrap closed)".to_string(),
                link_assistant_router::admin::CredentialKind::None =>
                    "UNCLAIMED (bootstrap open)".to_string(),
            }
        );
        if status.credential_kind == link_assistant_router::admin::CredentialKind::LegacyOpaque {
            println!(
                "admin_credential_warning: WARNING legacy opaque `la_admin_` credential; \
                 it carries no expiry, scope or revocation. Rotate it into an admin JWT \
                 with POST /api/admin/rotate (or /rotate in the chat admin bot)."
            );
        }
    }
    println!(
        "admin_endpoints        : {}",
        if config.allow_anonymous_admin {
            "OPEN (--allow-anonymous-admin)"
        } else {
            "closed (admin key or admin-scoped token required)"
        }
    );
    println!(
        "telegram_admin_bot     : {}",
        if config.chat_admin.telegram_enabled() {
            "enabled (private chats only)"
        } else {
            "disabled"
        }
    );
    println!(
        "vk_admin_bot           : {}",
        if config.chat_admin.vk_enabled() {
            "enabled (private chats only)"
        } else {
            "disabled"
        }
    );
    println!(
        "login_api              : {}",
        if config.login.enabled {
            "enabled (POST /api/login)"
        } else {
            "disabled"
        }
    );
    println!(
        "login_cli              : {} {}",
        config.login.command,
        config.login.args.join(" ")
    );
    // Whether each auth mode can run here, before any login is attempted.
    for line in link_assistant_router::doctor::login_mode_report(&config.login) {
        println!("{line}");
    }
    // What this deployment discloses upstream, so the property can be checked
    // without reading the source or the request store (issue #332).
    for line in link_assistant_router::doctor::forwarded_header_report() {
        println!("{line}");
    }
    println!(
        "mpp_openai_charge      : {}",
        if config.mpp.is_configured() {
            "enabled"
        } else {
            "disabled"
        }
    );

    // Probe the active pool with its vendor-specific credential layout.
    let (active_provider, primary_home) = config.subscription_pool();
    let primary = SubscriptionReader::new(active_provider, &primary_home);
    match primary.discover_credential_path() {
        Some(path) => {
            let status = primary.read_token().map_or("found, NO TOKEN", |token| {
                if token.is_expired(chrono::Utc::now().timestamp_millis()) {
                    "found, token EXPIRED on disk"
                } else {
                    "found, token OK"
                }
            });
            println!("primary credentials    : {} ({})", path.display(), status);
        }
        None => println!(
            "primary credentials    : {} (MISSING)",
            primary_home.display()
        ),
    }
    for (i, dir) in config.additional_account_dirs.iter().enumerate() {
        let reader = SubscriptionReader::new(active_provider, dir);
        match reader.discover_credential_path() {
            Some(path) => println!(
                "extra account {}        : {} (found)",
                i + 1,
                path.display()
            ),
            None => println!(
                "extra account {}        : {} (MISSING)",
                i + 1,
                dir.display()
            ),
        }
    }

    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    let catalog_error = link_assistant_router::doctor::subscription_catalog_diagnostics(
        active_provider,
        &config.claude_code_home,
        &user_home,
        Some(&config.data_dir),
    )
    .await;

    // Probe data dir.
    if config.data_dir.exists() {
        println!("data_dir                : present");
    } else {
        println!("data_dir                : will be created on first write");
    }

    if matches!(
        config.storage_policy,
        StoragePolicy::Text | StoragePolicy::Both
    ) {
        let p = config.data_dir.join("tokens.lino");
        println!(
            "lino store              : {} ({})",
            p.display(),
            if p.exists() { "present" } else { "<empty>" }
        );
    }
    if matches!(
        config.storage_policy,
        StoragePolicy::Binary | StoragePolicy::Both
    ) {
        let p = config.data_dir.join("tokens.bin");
        println!(
            "binary store            : {} ({})",
            p.display(),
            if p.exists() { "present" } else { "<empty>" }
        );
    }
    let p = config.data_dir.join("providers.lenv");
    println!(
        "provider store         : {} ({})",
        p.display(),
        if p.exists() { "present" } else { "<empty>" }
    );

    if catalog_error {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    }
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
    tracing::info!("Shutdown signal received");
}
