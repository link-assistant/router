//! Output and dispatch layer for the `clients` CLI command.

use std::process::ExitCode;

use crate::cli::ClientOp;
use crate::clients::{ClientKind, ClientManager};
use crate::config::Config;
use crate::storage::build_token_store;
use crate::token::{IssueRequest, TokenManager};

/// Run one local client-management operation.
pub async fn run(config: &Config, op: &ClientOp) -> ExitCode {
    let manager = match ClientManager::from_env() {
        Ok(manager) => manager,
        Err(error) => return failed(error),
    };
    match op {
        ClientOp::List => list(&manager),
        ClientOp::Setup {
            client,
            token,
            base_url,
            ttl_hours,
        } => setup(
            config,
            &manager,
            *client,
            token.as_deref(),
            base_url.as_deref(),
            *ttl_hours,
        ),
        ClientOp::Show { client } => show(&manager, *client),
        ClientOp::Remove { client } => remove(&manager, *client),
        ClientOp::Doctor { client } => match manager.doctor(*client).await {
            Ok(message) => {
                println!("ok: {message}");
                ExitCode::SUCCESS
            }
            Err(error) => failed(error),
        },
    }
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

fn setup(
    config: &Config,
    manager: &ClientManager,
    client: ClientKind,
    supplied_token: Option<&str>,
    base_url: Option<&str>,
    ttl_hours: i64,
) -> ExitCode {
    if supplied_token.is_some_and(|token| !token.starts_with("la_sk_")) {
        eprintln!("error: --token must be a router token beginning with la_sk_");
        return ExitCode::from(2);
    }
    let base_url = base_url.map_or_else(|| local_client_base_url(config), str::to_string);
    let result = match manager.setup(client, &base_url) {
        Ok(result) => result,
        Err(error) => return failed(error),
    };
    let Some(token_env) = client.token_env() else {
        return failed(format!(
            "{} has no router token environment",
            client.display_name()
        ));
    };
    let token = match supplied_token {
        Some(token) => token.to_string(),
        None => match issue_client_token(config, client, ttl_hours) {
            Ok(token) => token,
            Err(error) => return failed(error),
        },
    };
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
    if let Some(base_url_env) = client.base_url_env() {
        println!(
            "export {}={}",
            base_url_env,
            shell_quote(&format!("{}/v1", base_url.trim_end_matches('/')))
        );
    }
    println!("export {}={}", token_env, shell_quote(&token));
    println!(
        "The token is not stored in the client config; export it in each shell that launches {}.",
        client.display_name()
    );
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

fn remove(manager: &ClientManager, client: ClientKind) -> ExitCode {
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
            ExitCode::SUCCESS
        }
        Err(error) => failed(error),
    }
}

fn issue_client_token(
    config: &Config,
    client: ClientKind,
    ttl_hours: i64,
) -> Result<String, Box<dyn std::error::Error>> {
    if !config.data_dir.exists() {
        std::fs::create_dir_all(&config.data_dir)?;
    }
    let store = build_token_store(config.storage_policy, &config.data_dir)?;
    let manager = TokenManager::with_store(&config.token_secret, store);
    Ok(manager.issue(&IssueRequest {
        ttl_hours,
        label: &format!("client-{client}"),
        account: None,
        max_requests: None,
        scope: "",
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
    eprintln!("error: {error}");
    ExitCode::from(1)
}
