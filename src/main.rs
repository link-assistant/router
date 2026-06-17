//! Link.Assistant.Router binary entry point.
//!
//! Parses the [`Cli`] (lino-arguments + clap), then either:
//!
//! 1. Runs the HTTP server (default — `Command::Serve` or no subcommand), or
//! 2. Dispatches a CLI subcommand (`tokens`, `accounts`, `doctor`) that runs
//!    locally and exits without binding a port.
//!
//! All shared services (config, token store, multi-account router, metrics)
//! are constructed in `build_runtime()` so the CLI subcommands operate on the
//! exact same backing state the HTTP server would.

use std::process::ExitCode;
use std::sync::Arc;
use std::time::Duration;

use axum::Router;
use axum::routing::{get, post};
use link_assistant_router::accounts::{AccountRouter, SelectionStrategy};
use link_assistant_router::activitypub;
use link_assistant_router::cli::{AccountOp, Cli, Command, ProviderOp, TokenOp};
use link_assistant_router::config::{Config, RoutingMode, StoragePolicy};
use link_assistant_router::crater::{ForgeFedTaskProvider, TaskProvider};
use link_assistant_router::metrics::Metrics;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::provider_proxy;
use link_assistant_router::providers::{ProviderStore, ProviderUpsert};
use link_assistant_router::proxy::{self, AppState};
use link_assistant_router::storage::{TokenStore, build_token_store};
use link_assistant_router::token::TokenManager;
use link_assistant_router::token_admin;
use log_lazy::{LogLazy, levels};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

type SharedState = (Arc<dyn TokenStore>, Option<AccountRouter>);
type AnyError = Box<dyn std::error::Error>;

#[tokio::main]
async fn main() -> ExitCode {
    let cli = <Cli as lino_arguments::Parser>::parse();

    let verbose = cli.verbose;

    init_tracing(verbose);

    let logger = build_logger(verbose);

    tracing::info!("Link.Assistant.Router v{}", link_assistant_router::VERSION);
    if verbose {
        tracing::info!("Verbose logging enabled");
    }

    let config = match cli.into_config() {
        Ok(c) => c,
        Err(e) => {
            tracing::error!("Configuration error: {e}");
            return ExitCode::from(2);
        }
    };

    match cli.command.as_ref() {
        None | Some(Command::Serve) => match run_server(config, logger).await {
            Ok(()) => ExitCode::SUCCESS,
            Err(e) => {
                tracing::error!("server error: {e}");
                ExitCode::from(1)
            }
        },
        Some(Command::Tokens { op }) => run_tokens(&config, op),
        Some(Command::Accounts { op }) => run_accounts(&config, op),
        Some(Command::Providers { op }) => run_providers(&config, op),
        Some(Command::Doctor) => run_doctor(&config),
    }
}

fn init_tracing(verbose: bool) {
    let default_filter = if verbose { "debug" } else { "info" };
    tracing_subscriber::fmt()
        .with_env_filter(
            EnvFilter::from_default_env().add_directive(default_filter.parse().unwrap()),
        )
        .init();
}

fn build_logger(verbose: bool) -> LogLazy {
    let log_level = if verbose {
        levels::ALL
    } else {
        levels::PRODUCTION
    };
    LogLazy::with_sink(log_level, |level, message| match level {
        log_lazy::Level::FATAL | log_lazy::Level::ERROR => tracing::error!("{message}"),
        log_lazy::Level::WARN => tracing::warn!("{message}"),
        log_lazy::Level::INFO => tracing::info!("{message}"),
        log_lazy::Level::DEBUG => tracing::debug!("{message}"),
        _ => tracing::trace!("{message}"),
    })
}

/// Construct the persistent token store and the optional multi-account router
/// for the given [`Config`]. Both are needed by both the server and the CLI
/// subcommands.
fn build_shared_state(config: &Config) -> Result<SharedState, AnyError> {
    if !config.data_dir.exists() {
        std::fs::create_dir_all(&config.data_dir)?;
    }
    let store = build_token_store(config.storage_policy, &config.data_dir)?;
    let account_router = if config.additional_account_dirs.is_empty() {
        None
    } else {
        Some(AccountRouter::new(
            std::path::PathBuf::from(&config.claude_code_home),
            &config.additional_account_dirs,
            SelectionStrategy::default(),
            Duration::from_secs(60),
        ))
    };
    Ok((store, account_router))
}

async fn run_server(config: Config, logger: LogLazy) -> Result<(), Box<dyn std::error::Error>> {
    tracing::info!("Upstream: {}", config.upstream_base_url);
    tracing::info!("Upstream provider: {:?}", config.upstream_provider);
    tracing::info!("Claude Code home: {}", config.claude_code_home);
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
    let oauth_provider = OAuthProvider::new(&config.claude_code_home);
    let metrics = Arc::new(Metrics::default());
    let provider_store = ProviderStore::open(&config.data_dir, &config.token_secret)?;

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()?;
    let crater_provider =
        if config.upstream_provider == link_assistant_router::config::UpstreamProvider::Crater {
            Some(Arc::new(ForgeFedTaskProvider::new(
                client.clone(),
                config.crater.clone(),
            )) as Arc<dyn TaskProvider>)
        } else {
            None
        };

    // Vendor-subscription upstreams (Codex/Gemini/Qwen) read their OAuth token
    // from the vendor CLI's credential file. Claude keeps using `oauth_provider`.
    let subscription_reader = match config.upstream_provider.subscription_provider() {
        Some(provider)
            if provider != link_assistant_router::subscription::SubscriptionProvider::Claude =>
        {
            let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
            let reader = link_assistant_router::subscription::SubscriptionReader::from_user_home(
                provider, &user_home,
            );
            tracing::info!(
                "Subscription provider {provider}: reading credentials from {}",
                reader.home().display()
            );
            Some(reader)
        }
        _ => None,
    };

    let state = AppState {
        client,
        token_manager,
        oauth_provider,
        account_router,
        subscription_reader,
        upstream_base_url: config.upstream_base_url.clone(),
        upstream_provider: config.upstream_provider,
        gonka: link_assistant_router::gonka::GonkaConfig::new(
            config.gonka_private_key.clone(),
            &config.gonka_source_url,
            config.gonka_model.clone(),
        ),
        crater: crater_provider,
        openai_compatible: config.openai_compatible.clone(),
        provider_store,
        logger,
        admin_key: config.admin_key.clone(),
        metrics: Arc::clone(&metrics),
        activitypub_actor_base_url: config.activitypub_actor_base_url.clone(),
        activitypub_public_key_pem: config.activitypub_public_key_pem.clone(),
        mpp: config.mpp.clone(),
    };

    let mut app = Router::new()
        .route("/health", get(proxy::health))
        .route("/actor/code", get(activitypub::actor))
        .route("/inbox/code", post(activitypub::inbox))
        .route("/outbox/code", get(activitypub::outbox))
        .route("/actors/code/followers", get(activitypub::followers))
        .route(
            "/activities/follow-problemsets-code-001",
            get(activitypub::follow_problemsets),
        )
        .route("/api/tokens", post(token_admin::issue_token))
        .route("/api/tokens/list", get(token_admin::list_tokens))
        .route("/api/tokens/revoke", post(token_admin::revoke_token))
        .route(
            "/api/providers",
            get(provider_proxy::list_providers).post(provider_proxy::upsert_provider),
        )
        .route(
            "/api/providers/{name}",
            get(provider_proxy::show_provider).delete(provider_proxy::delete_provider),
        );

    if config.enable_anthropic_api {
        app = app
            .route("/v1/messages", post(proxy::proxy_handler))
            .route("/v1/messages/count_tokens", post(proxy::proxy_handler))
            .route("/invoke", post(proxy::proxy_handler))
            .route("/invoke-with-response-stream", post(proxy::proxy_handler));
    }

    if config.enable_openai_api {
        app = app
            .route("/v1/chat/completions", post(proxy::openai_chat_completions))
            .route("/v1/responses", post(proxy::openai_responses))
            .route("/v1/models", get(proxy::openai_models));
    }

    if config.enable_metrics {
        app = app
            .route("/metrics", get(proxy::metrics_endpoint))
            .route("/v1/usage", get(proxy::usage_endpoint))
            .route("/v1/accounts", get(proxy::accounts_endpoint));
    }

    let app = app
        .fallback(proxy::proxy_handler)
        .with_state(state)
        .layer(TraceLayer::new_for_http());

    tracing::info!("Listening on {}", config.listen_addr);

    let listener = tokio::net::TcpListener::bind(config.listen_addr).await?;
    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;
    Ok(())
}

fn run_tokens(config: &Config, op: &TokenOp) -> ExitCode {
    let (store, _account_router) = match build_shared_state(config) {
        Ok(v) => v,
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::from(1);
        }
    };
    let mgr = TokenManager::with_store(&config.token_secret, store);
    match op {
        TokenOp::Issue {
            ttl_hours,
            label,
            account,
            max_requests,
        } => match mgr.issue_token_full(*ttl_hours, label, account.as_deref(), *max_requests) {
            Ok(t) => {
                println!("{t}");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        TokenOp::List => match mgr.list_tokens() {
            Ok(records) => {
                println!(
                    "{:<36}  {:<10}  {:<10}  {:<8}  {:<13}  label",
                    "id", "issued_at", "expires_at", "revoked", "requests"
                );
                for r in records {
                    let requests = r.max_requests.map_or_else(
                        || format!("{}/-", r.used_requests),
                        |max| format!("{}/{max}", r.used_requests),
                    );
                    println!(
                        "{:<36}  {:<10}  {:<10}  {:<8}  {:<13}  {}",
                        r.id, r.issued_at, r.expires_at, r.revoked, requests, r.label
                    );
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        TokenOp::Revoke { id } | TokenOp::Expire { id } => match mgr.revoke_token(id) {
            Ok(()) => {
                println!("revoked {id}");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        TokenOp::Show { id } => match mgr.list_tokens() {
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
            AccountRouter::new(
                std::path::PathBuf::from(&config.claude_code_home),
                &[],
                SelectionStrategy::default(),
                Duration::from_secs(60),
            )
        }
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::from(1);
        }
    };
    match op {
        AccountOp::List => {
            let snap = router.health_snapshot();
            println!("{:<16}  {:<8}  {:<6}  home", "name", "healthy", "used");
            for h in snap {
                println!(
                    "{:<16}  {:<8}  {:<6}  {}",
                    h.name,
                    h.healthy,
                    h.used,
                    h.home.display()
                );
            }
            ExitCode::SUCCESS
        }
    }
}

fn run_providers(config: &Config, op: &ProviderOp) -> ExitCode {
    let store = match ProviderStore::open(&config.data_dir, &config.token_secret) {
        Ok(store) => store,
        Err(e) => {
            eprintln!("error: {e}");
            return ExitCode::from(1);
        }
    };
    match op {
        ProviderOp::List => match store.list_redacted() {
            Ok(records) => {
                println!(
                    "{:<20}  {:<18}  {:<32}  {:<10}  default_model",
                    "name", "kind", "base_url", "enabled"
                );
                for record in records {
                    println!(
                        "{:<20}  {:<18}  {:<32}  {:<10}  {}",
                        record.name,
                        record.kind.as_str(),
                        record.base_url,
                        record.enabled,
                        record.default_model.unwrap_or_default()
                    );
                }
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        ProviderOp::Add {
            name,
            kind,
            base_url,
            model,
            models,
            api_key,
            api_key_env,
            enabled,
        } => {
            let input = ProviderUpsert {
                name: name.clone(),
                kind: Some(kind.clone()),
                base_url: base_url.clone(),
                default_model: model.clone(),
                models: Some(models.clone()),
                api_key: api_key.clone(),
                api_key_env: api_key_env.clone(),
                encrypted_api_key: None,
                enabled: Some(*enabled),
            };
            match store.upsert(input) {
                Ok(record) => {
                    println!(
                        "{}",
                        serde_json::to_string_pretty(&record.redacted()).unwrap_or_default()
                    );
                    ExitCode::SUCCESS
                }
                Err(e) => {
                    eprintln!("error: {e}");
                    ExitCode::from(1)
                }
            }
        }
        ProviderOp::Show { name } => match store.get(name) {
            Ok(Some(record)) => {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&record.redacted()).unwrap_or_default()
                );
                ExitCode::SUCCESS
            }
            Ok(None) => {
                eprintln!("not found: {name}");
                ExitCode::from(2)
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        ProviderOp::Remove { name } => match store.delete(name) {
            Ok(true) => {
                println!("removed {name}");
                ExitCode::SUCCESS
            }
            Ok(false) => {
                eprintln!("not found: {name}");
                ExitCode::from(2)
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
        ProviderOp::Import { path } => match store.import_file(path) {
            Ok(count) => {
                println!("imported {count} provider(s)");
                ExitCode::SUCCESS
            }
            Err(e) => {
                eprintln!("error: {e}");
                ExitCode::from(1)
            }
        },
    }
}

fn run_doctor(config: &Config) -> ExitCode {
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
        "admin_key              : {}",
        if config.admin_key.is_some() {
            "set"
        } else {
            "<unset>"
        }
    );
    println!(
        "mpp_openai_charge      : {}",
        if config.mpp.is_configured() {
            "enabled"
        } else {
            "disabled"
        }
    );

    // Probe credentials. Use the OAuth provider so the report covers every
    // candidate file the router actually reads, including the dotfile
    // `.credentials.json` and the nested `claudeAiOauth` layout.
    let primary = OAuthProvider::new(&config.claude_code_home);
    match primary.discover_credential_path() {
        Some(path) => {
            let readable = primary.get_token().is_ok();
            println!(
                "primary credentials    : {} ({})",
                path.display(),
                if readable {
                    "found, token OK"
                } else {
                    "found, NO TOKEN"
                }
            );
        }
        None => println!(
            "primary credentials    : {} (MISSING)",
            std::path::Path::new(&config.claude_code_home)
                .join(".credentials.json")
                .display()
        ),
    }
    for (i, dir) in config.additional_account_dirs.iter().enumerate() {
        let provider = OAuthProvider::new(&dir.to_string_lossy());
        match provider.discover_credential_path() {
            Some(path) => println!(
                "extra account {}        : {} (found)",
                i + 1,
                path.display()
            ),
            None => println!(
                "extra account {}        : {} (MISSING)",
                i + 1,
                dir.join(".credentials.json").display()
            ),
        }
    }

    // Probe vendor-subscription credentials (Codex/Gemini/Qwen). These are the
    // OAuth files written by each vendor's CLI; the router reads them read-only
    // when the matching upstream provider is active.
    let user_home = std::env::var("HOME").unwrap_or_else(|_| ".".to_string());
    for provider in link_assistant_router::subscription::SubscriptionProvider::ALL {
        use link_assistant_router::subscription::SubscriptionProvider;
        if provider == SubscriptionProvider::Claude {
            continue; // covered by the primary Claude probe above
        }
        let reader = link_assistant_router::subscription::SubscriptionReader::from_user_home(
            provider, &user_home,
        );
        let label = format!("{provider} subscription");
        match reader.discover_credential_path() {
            Some(path) => {
                let status = reader.read_token().map_or("found, NO TOKEN", |token| {
                    let now_ms = chrono::Utc::now().timestamp_millis();
                    if token.is_expired(now_ms) {
                        "found, token EXPIRED"
                    } else {
                        "found, token OK"
                    }
                });
                println!("{label:<23}: {} ({status})", path.display());
            }
            None => println!("{label:<23}: {} (MISSING)", reader.home().display()),
        }
    }

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

    ExitCode::SUCCESS
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
    tracing::info!("Shutdown signal received");
}
