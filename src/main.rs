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

use axum::routing::{get, post};
use axum::Router;
use link_assistant_router::accounts::{AccountRouter, SelectionStrategy};
use link_assistant_router::cli::{AccountOp, Cli, Command, TokenOp};
use link_assistant_router::config::{Config, RoutingMode, StoragePolicy};
use link_assistant_router::metrics::Metrics;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::proxy::{self, AppState};
use link_assistant_router::storage::{build_token_store, TokenStore};
use link_assistant_router::token::TokenManager;
use log_lazy::{levels, LogLazy};
use tower_http::trace::TraceLayer;
use tracing_subscriber::EnvFilter;

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
fn build_shared_state(
    config: &Config,
) -> Result<(Arc<dyn TokenStore>, Option<AccountRouter>), Box<dyn std::error::Error>> {
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

    let client = reqwest::Client::builder()
        .redirect(reqwest::redirect::Policy::none())
        .build()?;

    let state = AppState {
        client,
        token_manager,
        oauth_provider,
        account_router,
        upstream_base_url: config.upstream_base_url.clone(),
        logger,
        admin_key: config.admin_key.clone(),
        metrics: Arc::clone(&metrics),
    };

    let mut app = Router::new()
        .route("/health", get(proxy::health))
        .route("/api/tokens", post(proxy::issue_token))
        .route("/api/tokens/list", get(proxy::list_tokens))
        .route("/api/tokens/revoke", post(proxy::revoke_token));

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
        } => match mgr.issue_token_for(*ttl_hours, label, account.as_deref()) {
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
                    "{:<36}  {:<10}  {:<10}  {:<10}  {}",
                    "id", "issued_at", "expires_at", "revoked", "label"
                );
                for r in records {
                    println!(
                        "{:<36}  {:<10}  {:<10}  {:<10}  {}",
                        r.id, r.issued_at, r.expires_at, r.revoked, r.label
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
            Ok(records) => match records.into_iter().find(|r| r.id == *id) {
                Some(r) => {
                    println!("{}", serde_json::to_string_pretty(&r).unwrap_or_default());
                    ExitCode::SUCCESS
                }
                None => {
                    eprintln!("not found: {id}");
                    ExitCode::from(2)
                }
            },
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
            println!(
                "{:<16}  {:<8}  {:<6}  {}",
                "name", "healthy", "used", "home"
            );
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

fn run_doctor(config: &Config) -> ExitCode {
    println!("Link.Assistant.Router v{}", link_assistant_router::VERSION);
    println!("listen_addr            : {}", config.listen_addr);
    println!("upstream_base_url      : {}", config.upstream_base_url);
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

    // Probe credentials.
    let probe_path = std::path::Path::new(&config.claude_code_home).join("credentials.json");
    println!(
        "primary credentials    : {} ({})",
        probe_path.display(),
        if probe_path.exists() {
            "found"
        } else {
            "MISSING"
        }
    );
    for (i, dir) in config.additional_account_dirs.iter().enumerate() {
        let p = dir.join("credentials.json");
        println!(
            "extra account {}        : {} ({})",
            i + 1,
            p.display(),
            if p.exists() { "found" } else { "MISSING" }
        );
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

    ExitCode::SUCCESS
}

async fn shutdown_signal() {
    tokio::signal::ctrl_c()
        .await
        .expect("Failed to install CTRL+C signal handler");
    tracing::info!("Shutdown signal received");
}
