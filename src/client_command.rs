//! Output and dispatch layer for the `clients` CLI command.

use std::path::Path;
use std::process::ExitCode;

use crate::cli::ClientOp;
use crate::clients::{ClientKind, ClientManager, ManagedCredential, TokenSource};
use crate::config::Config;
use crate::storage::build_token_store;
use crate::token::{IssueRequest, TokenManager};

/// Environment variable holding an existing router token for `clients setup`.
pub const CLIENT_TOKEN_ENV: &str = "LINK_ASSISTANT_ROUTER_TOKEN";
/// Compatibility alias shared with the client integrations themselves.
pub const CLIENT_TOKEN_ENV_ALIAS: &str = "LINK_ASSISTANT_TOKEN";

/// Run one local client-management operation.
pub async fn run(config: &Config, home: Option<&Path>, op: &ClientOp) -> ExitCode {
    let manager = match home {
        Some(home) => ClientManager::isolated(home),
        None => match ClientManager::from_env() {
            Ok(manager) => manager,
            Err(error) => return failed(error),
        },
    };
    match op {
        ClientOp::List => list(&manager),
        ClientOp::Setup {
            client,
            token,
            token_stdin,
            base_url,
            ttl_hours,
        } => {
            let supplied = match resolve_supplied_token(token.clone(), *token_stdin) {
                Ok(token) => token,
                Err(error) => return failed(error),
            };
            setup(
                config,
                &manager,
                *client,
                supplied.as_deref(),
                base_url.as_deref(),
                *ttl_hours,
            )
            .await
        }
        ClientOp::Show { client } => show(&manager, *client),
        ClientOp::Remove {
            client,
            revoke_supplied,
            force,
        } => remove(config, &manager, *client, *revoke_supplied, *force),
        ClientOp::Doctor { client } => match manager.doctor(*client).await {
            Ok(message) => {
                println!("ok: {message}");
                ExitCode::SUCCESS
            }
            Err(error) => failed(error),
        },
    }
}

/// Resolve an existing router token from argv, standard input, or the
/// environment, in that order. Returns `None` when setup should mint one.
fn resolve_supplied_token(
    token: Option<String>,
    token_stdin: bool,
) -> Result<Option<String>, Box<dyn std::error::Error + Send + Sync>> {
    if token_stdin {
        return crate::server_command::read_token().map(Some);
    }
    if let Some(token) = token {
        return Ok(Some(token));
    }
    Ok(std::env::var(CLIENT_TOKEN_ENV)
        .or_else(|_| std::env::var(CLIENT_TOKEN_ENV_ALIAS))
        .ok()
        .map(|token| token.trim().to_string())
        .filter(|token| !token.is_empty()))
}

fn list(manager: &ClientManager) -> ExitCode {
    println!(
        "{:<12}  {:<9}  {:<11}  {:<19}  config",
        "client", "installed", "configured", "dialect"
    );
    for client in ClientKind::ALL {
        match manager.status(client) {
            Ok(status) => println!(
                "{:<12}  {:<9}  {:<11}  {:<19}  {}",
                status.client,
                status.installed,
                status.configured,
                status.dialect,
                status.config_path.display()
            ),
            Err(error) => return failed(format!("could not read {client}: {error}")),
        }
    }
    ExitCode::SUCCESS
}

async fn setup(
    config: &Config,
    manager: &ClientManager,
    client: ClientKind,
    supplied_token: Option<&str>,
    base_url: Option<&str>,
    ttl_hours: i64,
) -> ExitCode {
    if supplied_token.is_some_and(|token| !token.starts_with("la_sk_")) {
        eprintln!(
            "error: the supplied router token must begin with la_sk_ (checked --token, --token-stdin, then {CLIENT_TOKEN_ENV})"
        );
        return ExitCode::from(2);
    }
    let base_url = base_url.map_or_else(|| local_client_base_url(config), str::to_string);
    if let Some(limitation) = client.setup_limitation() {
        return failed(limitation);
    }
    if client.token_env().is_none() {
        return failed(format!(
            "{} has no router token environment",
            client.display_name()
        ));
    }
    let (token, credential) = match supplied_token {
        Some(token) => (
            token.to_string(),
            ManagedCredential {
                client: client.to_string(),
                source: TokenSource::Supplied,
                // Recorded only when this router can recognise the token, so
                // `--revoke-supplied` has an id to act on.
                token_id: local_token_id(config, token),
                label: None,
                issued_at: None,
            },
        ),
        None => match issue_client_token(config, client, ttl_hours) {
            Ok((token, id)) => (
                token,
                ManagedCredential {
                    client: client.to_string(),
                    source: TokenSource::Minted,
                    token_id: Some(id),
                    label: Some(format!("client-{client}")),
                    issued_at: Some(chrono::Utc::now().timestamp()),
                },
            ),
            Err(error) => return failed(error),
        },
    };
    let models = if matches!(
        client,
        ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent
    ) {
        match manager.catalog(&base_url, &token).await {
            Ok(models) => models,
            Err(error) => return failed(error),
        }
    } else {
        Vec::new()
    };
    let result = match manager.setup(client, &base_url, &models) {
        Ok(result) => result,
        Err(error) => return failed(error),
    };
    let environment_path = match manager.write_environment(client, &base_url, &token) {
        Ok(path) => path,
        Err(error) => return failed(error),
    };
    // Written after the secret so a recorded token id always describes a
    // credential that actually exists on disk.
    if let Err(error) = manager.write_credential_metadata(client, &credential) {
        return failed(error);
    }
    if client == ClientKind::GrokCli {
        println!(
            "{} uses shell environment; no client config was changed",
            client.display_name()
        );
    } else if result.changed {
        println!(
            "configured {} in {}",
            client.display_name(),
            result.path.display()
        );
    } else {
        println!(
            "{} is already configured in {}",
            client.display_name(),
            result.path.display()
        );
    }
    if let Some(backup) = result.backup {
        println!("backup: {}", backup.display());
    }
    println!(
        "credentials: {} (mode 0600); run: source {}",
        environment_path.display(),
        shell_quote(&environment_path.display().to_string())
    );
    println!("The token is not stored in the client config or printed to the terminal.");
    ExitCode::SUCCESS
}

fn show(manager: &ClientManager, client: ClientKind) -> ExitCode {
    match manager.status(client) {
        Ok(status) => {
            println!(
                "{}",
                serde_json::to_string_pretty(&status).unwrap_or_default()
            );
            ExitCode::SUCCESS
        }
        Err(error) => failed(error),
    }
}

/// Remove the local settings, revoking the credential they contain first.
///
/// Order matters: the token is revoked before the environment file that holds
/// it is deleted. Deleting first would leave a live credential that nobody can
/// name any more, which is exactly the regression from issue #190.
fn remove(
    config: &Config,
    manager: &ClientManager,
    client: ClientKind,
    revoke_supplied: bool,
    force: bool,
) -> ExitCode {
    let credential = match manager.credential_metadata(client) {
        Ok(credential) => credential,
        Err(error) if force => {
            eprintln!("warning: {error}; continuing because --force was given");
            None
        }
        Err(error) => return failed(error),
    };
    let revoked = match revoke_managed_credential(config, credential.as_ref(), revoke_supplied) {
        Ok(revoked) => revoked,
        Err(error) => {
            if !force {
                eprintln!("error: {error}");
                eprintln!(
                    "the credential file was left in place; revoke the token with `link-assistant-router tokens revoke <ID>` against the router's DATA_DIR and rerun `link-assistant-router clients remove {client}`, or pass --force to delete the local settings anyway"
                );
                return ExitCode::from(1);
            }
            eprintln!("warning: {error}; continuing because --force was given");
            None
        }
    };
    match manager.remove(client) {
        Ok(result) => {
            if result.changed {
                println!("removed router settings from {}", result.path.display());
            } else {
                println!(
                    "no managed router settings found in {}",
                    result.path.display()
                );
            }
            if let Some(backup) = result.backup {
                println!("backup: {}", backup.display());
            }
            if let Some(id) = revoked {
                println!("revoked managed token {id}");
            }
            ExitCode::SUCCESS
        }
        Err(error) => failed(error),
    }
}

/// Revoke the recorded token when removal owns it. Returns the revoked id.
fn revoke_managed_credential(
    config: &Config,
    credential: Option<&ManagedCredential>,
    revoke_supplied: bool,
) -> Result<Option<String>, Box<dyn std::error::Error>> {
    let Some(credential) = credential else {
        return Ok(None);
    };
    let wanted = credential.revocable_by_default()
        || (revoke_supplied && credential.source == TokenSource::Supplied);
    if !wanted {
        return Ok(None);
    }
    let Some(id) = credential.token_id.as_deref() else {
        if revoke_supplied {
            return Err(format!(
                "the token configured for {} was supplied by the operator and this router does not recognise it, so it cannot be revoked here",
                credential.client
            )
            .into());
        }
        return Ok(None);
    };
    token_manager(config)?.revoke_token(id)?;
    Ok(Some(id.to_string()))
}

/// Recognise a supplied token issued by this router and return its record id.
fn local_token_id(config: &Config, token: &str) -> Option<String> {
    token_manager(config)
        .ok()?
        .validate_token(token)
        .ok()
        .map(|claims| claims.sub)
}

fn token_manager(config: &Config) -> Result<TokenManager, Box<dyn std::error::Error>> {
    if !config.data_dir.exists() {
        std::fs::create_dir_all(&config.data_dir)?;
    }
    let store = build_token_store(config.storage_policy, &config.data_dir)?;
    Ok(TokenManager::with_store(&config.token_secret, store))
}

fn issue_client_token(
    config: &Config,
    client: ClientKind,
    ttl_hours: i64,
) -> Result<(String, String), Box<dyn std::error::Error>> {
    let manager = token_manager(config)?;
    Ok(manager.issue_with_id(&IssueRequest {
        ttl_hours,
        label: &format!("client-{client}"),
        account: None,
        max_requests: None,
        max_tokens: None,
        rate_limit_per_minute: None,
        scope: "",
        github_repos: Vec::new(),
    })?)
}

fn local_client_base_url(config: &Config) -> String {
    let host = match config.listen_addr.ip() {
        std::net::IpAddr::V4(ip) if ip.is_unspecified() => "127.0.0.1".to_string(),
        std::net::IpAddr::V6(ip) if ip.is_unspecified() => "[::1]".to_string(),
        ip => ip.to_string(),
    };
    format!("http://{host}:{}", config.listen_addr.port())
}

fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

fn failed(error: impl std::fmt::Display) -> ExitCode {
    eprintln!(
        "error: {}",
        crate::login_url::redact_secrets(&error.to_string())
    );
    ExitCode::from(1)
}
