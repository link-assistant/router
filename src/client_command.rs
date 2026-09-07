//! Output and dispatch layer for the `clients` CLI command.

use std::path::Path;
use std::process::ExitCode;

use crate::cli::ClientOp;
use crate::client_repair_command::repair;
use crate::clients::{ClientKind, ClientManager, ManagedCredential, TokenSource};
use crate::config::Config;
use crate::storage::{build_token_store, build_token_store_read_only};
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
        ClientOp::List { json } => list(&manager, *json),
        ClientOp::Setup {
            client,
            token,
            token_stdin,
            base_url,
            management_server,
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
                management_server.as_deref(),
                *ttl_hours,
            )
            .await
        }
        ClientOp::Show { client, .. } => show(&manager, *client),
        ClientOp::Remove {
            client,
            revoke_supplied,
            force,
        } => remove(config, &manager, *client, *revoke_supplied, *force).await,
        ClientOp::Repair {
            client,
            all,
            dry_run,
            json,
            rollback,
        } => {
            repair(
                &manager,
                *client,
                *all,
                *dry_run,
                *json,
                rollback.as_deref(),
            )
            .await
        }
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

/// Print one row per client, then say what could not be read.
///
/// A listing never ends early. Stopping at the first damaged file hid every
/// client after it, and named a *different* client than the one missing, so a
/// reader had no reason to suspect the table was incomplete (issue #304).
fn list(manager: &ClientManager, json: bool) -> ExitCode {
    let mut rows = Vec::new();
    if !json {
        println!(
            "{:<12}  {:<9}  {:<16}  {:<19}  config",
            "client", "installed", "ownership", "dialect"
        );
    }
    let mut unreadable = Vec::new();
    let mut failures = Vec::new();
    for client in ClientKind::ALL {
        match manager.status(client) {
            Ok(status) => {
                let ownership = if status.unreadable.is_some() {
                    "unreadable".to_string()
                } else {
                    status.ownership_state.to_string()
                };
                if json {
                    rows.push(status.clone());
                } else {
                    println!(
                        "{:<12}  {:<9}  {:<16}  {:<19}  {}",
                        status.client,
                        status.installed,
                        ownership,
                        status.dialect,
                        status.config_path.display()
                    );
                }
                if let Some(reason) = status.unreadable {
                    unreadable.push((client, reason));
                }
            }
            Err(error) => {
                if !json {
                    println!("{client:<12}  {:<9}  {:<16}  {:<19}  -", "?", "error", "?");
                }
                failures.push((client, error.to_string()));
            }
        }
    }
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&rows).unwrap_or_else(|_| "[]".to_string())
        );
    }
    for (client, reason) in unreadable.iter().chain(&failures) {
        eprintln!("error: could not read {client}: {reason}");
    }
    if unreadable.is_empty() && failures.is_empty() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}

pub(crate) async fn ensure_codex_bridge(
    manager: &ClientManager,
    client: ClientKind,
    base_url: &str,
) -> Result<Option<crate::codex_loopback_bridge::PersistentBridge>, String> {
    if client != ClientKind::Codex || !crate::codex_loopback_bridge::required(base_url)? {
        return Ok(None);
    }
    crate::codex_loopback_bridge::ensure_persistent(
        &manager.codex_loopback_bridge_state_path(),
        base_url,
    )
    .await
    .map(Some)
}

async fn setup(
    config: &Config,
    manager: &ClientManager,
    client: ClientKind,
    supplied_token: Option<&str>,
    base_url: Option<&str>,
    management_server: Option<&str>,
    ttl_hours: i64,
) -> ExitCode {
    if supplied_token.is_some_and(|token| !token.starts_with("la_sk_")) {
        eprintln!(
            "error: the supplied router token must begin with la_sk_ (checked --token, --token-stdin, then {CLIENT_TOKEN_ENV})"
        );
        return ExitCode::from(2);
    }
    if let Some(management_server) = management_server {
        let Some(base_url) = base_url else {
            return failed("--management-server requires --server");
        };
        return setup_remote(
            manager,
            client,
            supplied_token,
            base_url,
            management_server,
            ttl_hours,
        )
        .await;
    }

    // `setup` mints from *this* deployment's token store, so the credential it
    // writes is only valid here. Defaulting the address to this CLI's own
    // `--host`/`--port` while another router was selected produced a client
    // pointed at a deployment that may not even be running, with no error
    // (issue #296). It cannot follow the selection either — a locally signed
    // token would be rejected there — so it says which command can.
    let base_url = match base_url {
        Some(base_url) => match crate::managed_server::canonical_server_origin(base_url) {
            Ok(base_url) => base_url,
            Err(error) => return failed(error),
        },
        None => match crate::managed_server::selected_server() {
            Ok(Some(selected)) => {
                eprintln!(
                    "error: `clients setup` configures the router it can mint a token for, which \
                     is this machine, but {selected} is selected."
                );
                eprintln!(
                    "note: run `router configure {client}` to point {} at the selected router, or \
                     pass --base-url to name an address for this one.",
                    client.display_name()
                );
                return ExitCode::from(1);
            }
            Ok(None) => local_client_base_url(config),
            Err(error) => return failed(error),
        },
    };
    if let Some(limitation) = client.setup_limitation() {
        return failed(limitation);
    }
    if client.token_env().is_none() {
        return failed(format!(
            "{} has no router token environment",
            client.display_name()
        ));
    }
    match manager.managed_target_matches(client, &base_url) {
        Ok(true)
            if manager
                .managed_token(client)
                .ok()
                .flatten()
                .as_deref()
                .is_some_and(|token| {
                    local_token_binding(config, token, client)
                        .is_ok_and(|binding| binding.is_some())
                }) =>
        {
            let bridge = match ensure_codex_bridge(manager, client, &base_url).await {
                Ok(bridge) => bridge,
                Err(error) => return failed(error),
            };
            let bridge_matches = bridge.as_ref().is_none_or(|bridge| {
                manager
                    .codex_backend_matches(bridge.backend_base_url())
                    .unwrap_or(false)
            });
            if bridge_matches {
                if client == ClientKind::Codex && bridge.is_none() {
                    let state = manager.codex_loopback_bridge_state_path();
                    if let Err(error) = crate::codex_loopback_bridge::stop_persistent(&state).await
                    {
                        return failed(error);
                    }
                }
                println!(
                    "{} is already configured in {}",
                    client.display_name(),
                    manager.config_path(client).display()
                );
                println!(
                    "credentials: {} (mode 0600)",
                    manager.environment_path(client).display()
                );
                if let Some(bridge) = bridge {
                    bridge.commit();
                }
                return ExitCode::SUCCESS;
            } else if let Some(bridge) = bridge {
                let _ = bridge.rollback().await;
            }
        }
        Ok(_) => {}
        Err(error) => return failed(error),
    }
    let (token, credential, verified_models) = match supplied_token {
        Some(token) => {
            let binding = match local_token_binding(config, token, client) {
                Ok(binding) => binding,
                Err(error) => return failed(error),
            };
            let (binding, verified_models) = if let Some(binding) = binding {
                (binding, None)
            } else {
                let binding = match decoded_token_binding(token, client) {
                    Ok(binding) => binding,
                    Err(error) => return failed(error),
                };
                let models = match manager.catalog(client, &base_url, token).await {
                    Ok(models) => models,
                    Err(error) => return failed(error),
                };
                (binding, Some(models))
            };
            (
                token.to_string(),
                ManagedCredential {
                    client: client.to_string(),
                    source: TokenSource::Supplied,
                    token_id: Some(binding.token_id),
                    label: None,
                    issued_at: None,
                    router: Some(base_url.clone()),
                    management_server: None,
                    principal_id: Some(binding.principal_id),
                    config_sha256: None,
                },
                verified_models,
            )
        }
        None => match issue_client_token(config, client, ttl_hours) {
            Ok((token, id)) => (
                token,
                ManagedCredential {
                    client: client.to_string(),
                    source: TokenSource::Minted,
                    token_id: Some(id),
                    label: Some(format!("client-{client}")),
                    issued_at: Some(chrono::Utc::now().timestamp()),
                    router: Some(base_url.clone()),
                    management_server: None,
                    principal_id: Some(
                        crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                    ),
                    config_sha256: None,
                },
                None,
            ),
            Err(error) => return failed(error),
        },
    };
    let minted_id = (credential.source == TokenSource::Minted)
        .then(|| credential.token_id.clone())
        .flatten();
    let models = if let Some(models) = verified_models {
        crate::clients::usable_models(client, &models)
    } else if matches!(
        client,
        ClientKind::ClaudeCode | ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent
    ) {
        match manager.catalog(client, &base_url, &token).await {
            // Filtered by the same rule `with` and `doctor` use, so a client
            // config cannot embed a model the launcher would refuse to start
            // it on (issue #301).
            Ok(models) => crate::clients::usable_models(client, &models),
            Err(error) => {
                return failed_after_local_candidate(config, minted_id.as_deref(), error);
            }
        }
    } else {
        Vec::new()
    };
    let bridge = match ensure_codex_bridge(manager, client, &base_url).await {
        Ok(bridge) => bridge,
        Err(error) => {
            return failed_after_local_candidate(config, minted_id.as_deref(), error);
        }
    };
    let codex_backend_base_url = bridge
        .as_ref()
        .map(crate::codex_loopback_bridge::PersistentBridge::backend_base_url);
    let result = match manager.apply_setup_transaction_with_codex_backend(
        client,
        &base_url,
        &token,
        &credential,
        &models,
        codex_backend_base_url,
    ) {
        Ok(result) => result,
        Err(error) => {
            let error = if let Some(bridge) = bridge {
                bridge.rollback().await.map_or_else(
                    |cleanup| {
                        format!("{error}; the unused Codex bridge could not be removed: {cleanup}")
                    },
                    |()| error.to_string(),
                )
            } else {
                error.to_string()
            };
            return failed_after_local_candidate(config, minted_id.as_deref(), error);
        }
    };
    if client == ClientKind::Codex && bridge.is_none() {
        let state = manager.codex_loopback_bridge_state_path();
        if let Err(error) = crate::codex_loopback_bridge::stop_persistent(&state).await {
            return failed(error);
        }
    }
    if let Some(bridge) = bridge {
        bridge.commit();
    }
    let environment_path = manager.environment_path(client);
    if client == ClientKind::GrokCli {
        // A token was minted and two files written, so the operation did
        // change this machine — `SetupResult` describes the client's *own*
        // config, which is a different question (issue #303).
        println!(
            "configured {} through its environment; its own config file was not changed",
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

async fn setup_remote(
    manager: &ClientManager,
    client: ClientKind,
    supplied_token: Option<&str>,
    base_url: &str,
    management_server: &str,
    ttl_hours: i64,
) -> ExitCode {
    if let Some(limitation) = client.setup_limitation() {
        return failed(limitation);
    }
    if client.token_env().is_none() {
        return failed(format!(
            "{} has no router token environment",
            client.display_name()
        ));
    }
    let base_url = match crate::managed_server::canonical_server_origin(base_url) {
        Ok(base_url) => base_url,
        Err(error) => return failed(error),
    };
    if let Err(error) = crate::managed_server::canonical_server_origin(management_server) {
        return failed(error);
    }
    match manager.managed_target_matches(client, &base_url) {
        Ok(true)
            if let Some(token) = manager.managed_token(client).ok().flatten()
                && manager.catalog(client, &base_url, &token).await.is_ok() =>
        {
            let bridge = match ensure_codex_bridge(manager, client, &base_url).await {
                Ok(bridge) => bridge,
                Err(error) => return failed(error),
            };
            let bridge_matches = bridge.as_ref().is_none_or(|bridge| {
                manager
                    .codex_backend_matches(bridge.backend_base_url())
                    .unwrap_or(false)
            });
            if bridge_matches {
                if client == ClientKind::Codex && bridge.is_none() {
                    let state = manager.codex_loopback_bridge_state_path();
                    if let Err(error) = crate::codex_loopback_bridge::stop_persistent(&state).await
                    {
                        return failed(error);
                    }
                }
                println!(
                    "{} is already configured in {}",
                    client.display_name(),
                    manager.config_path(client).display()
                );
                println!(
                    "credentials: {} (mode 0600)",
                    manager.environment_path(client).display()
                );
                if let Some(bridge) = bridge {
                    bridge.commit();
                }
                return ExitCode::SUCCESS;
            }
            if let Some(bridge) = bridge {
                let _ = bridge.rollback().await;
            }
        }
        Ok(_) => {}
        Err(error) => return failed(error),
    }
    let server = match crate::managed_server::resolve(
        Some(&base_url),
        Some(management_server),
        supplied_token.map(str::to_string),
        None,
        false,
    )
    .await
    {
        Ok(server) => server,
        Err(error) => return failed(error),
    };
    let candidate = match crate::managed_server::prepare_run_credential(
        &server,
        client,
        &format!("client-{client}"),
        ttl_hours,
        false,
    )
    .await
    {
        Ok(candidate) => candidate,
        Err(error) => return failed(error),
    };
    let record = ManagedCredential {
        client: client.to_string(),
        source: if candidate.was_minted() {
            TokenSource::Minted
        } else {
            TokenSource::Supplied
        },
        token_id: candidate.id(),
        label: Some(format!("client-{client}")),
        issued_at: Some(chrono::Utc::now().timestamp()),
        router: Some(server.base_url.clone()),
        management_server: Some(server.management_url.clone()),
        principal_id: Some(candidate.principal_id().to_string()),
        config_sha256: None,
    };
    let models = crate::clients::usable_models(client, candidate.models());
    let bridge = match ensure_codex_bridge(manager, client, &server.base_url).await {
        Ok(bridge) => bridge,
        Err(error) => {
            return match crate::managed_server::cleanup_run_credential(candidate).await {
                Ok(()) => failed(error),
                Err(cleanup) => failed(format!(
                    "{error}; the unused minted credential could not be revoked: {cleanup}"
                )),
            };
        }
    };
    let codex_backend_base_url = bridge
        .as_ref()
        .map(crate::codex_loopback_bridge::PersistentBridge::backend_base_url);
    let result = manager.apply_setup_transaction_with_codex_backend(
        client,
        &server.base_url,
        &candidate.token,
        &record,
        &models,
        codex_backend_base_url,
    );
    let result = match result {
        Ok(result) => result,
        Err(error) => {
            let bridge_cleanup = if let Some(bridge) = bridge {
                bridge.rollback().await.err()
            } else {
                None
            };
            return match crate::managed_server::cleanup_run_credential(candidate).await {
                Ok(()) if bridge_cleanup.is_none() => failed(error),
                Ok(()) => failed(format!(
                    "{error}; the unused Codex bridge could not be removed: {}",
                    bridge_cleanup.expect("checked above")
                )),
                Err(cleanup) => failed(format!(
                    "{error}; the unused minted credential could not be revoked: {cleanup}{}",
                    bridge_cleanup.map_or_else(String::new, |bridge| format!(
                        "; the unused Codex bridge could not be removed: {bridge}"
                    ))
                )),
            };
        }
    };
    if client == ClientKind::Codex && bridge.is_none() {
        let state = manager.codex_loopback_bridge_state_path();
        if let Err(error) = crate::codex_loopback_bridge::stop_persistent(&state).await {
            return failed(error);
        }
    }
    if let Some(bridge) = bridge {
        bridge.commit();
    }
    let environment_path = manager.environment_path(client);
    if client == ClientKind::GrokCli {
        println!(
            "configured {} through its environment; its own config file was not changed",
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

fn failed_after_local_candidate(
    config: &Config,
    minted_id: Option<&str>,
    error: impl std::fmt::Display,
) -> ExitCode {
    let error = error.to_string();
    if let Some(id) = minted_id
        && let Err(cleanup) = token_manager(config).and_then(|manager| {
            manager
                .revoke_token(id)
                .map_err(|error| Box::new(error) as Box<dyn std::error::Error>)
        })
    {
        return failed(format!(
            "{error}; the unused minted credential could not be revoked: {cleanup}"
        ));
    }
    failed(error)
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
async fn remove(
    config: &Config,
    manager: &ClientManager,
    client: ClientKind,
    revoke_supplied: bool,
    force: bool,
) -> ExitCode {
    // `setup` and `doctor` check this; `remove` did not, so it reported
    // success on a file the router can never write (issue #303).
    if let Some(limitation) = client.setup_limitation() {
        return failed(limitation);
    }
    let credential = match manager.credential_metadata(client) {
        Ok(credential) => credential,
        Err(error) if force => {
            eprintln!("warning: {error}; continuing because --force was given");
            None
        }
        Err(error) => return failed(error),
    };
    let revoked = match revoke_managed_credential(config, credential.as_ref(), revoke_supplied)
        .await
    {
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
            if client == ClientKind::Codex {
                let state = manager.codex_loopback_bridge_state_path();
                if let Err(error) = crate::codex_loopback_bridge::stop_persistent(&state).await {
                    return failed(error);
                }
            }
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
async fn revoke_managed_credential(
    config: &Config,
    credential: Option<&ManagedCredential>,
    revoke_supplied: bool,
) -> Result<Option<String>, String> {
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
            ));
        }
        return Ok(None);
    };
    if let Some(management_server) = credential.management_server.as_deref() {
        let router = credential.router.as_deref().unwrap_or(management_server);
        let admin_token = remote_revocation_token(router).ok_or_else(|| {
            format!(
                "token {id} was issued through {management_server}, but no administrative credential for {router} is available; set LINK_ASSISTANT_ROUTER_TOKEN or select that router with `link-assistant-router server use {router} --token-stdin`"
            )
        })?;
        crate::managed_server::revoke(management_server, &admin_token, id)
            .await
            .map_err(|error| error.to_string())?;
    } else {
        token_manager(config)
            .map_err(|error| error.to_string())?
            .revoke_token(id)
            .map_err(|error| error.to_string())?;
    }
    Ok(Some(id.to_string()))
}

/// Find authority for a previously selected remote Router without persisting
/// it in per-client metadata. Environment credentials deliberately win.
fn remote_revocation_token(router: &str) -> Option<String> {
    std::env::var(CLIENT_TOKEN_ENV)
        .or_else(|_| std::env::var(CLIENT_TOKEN_ENV_ALIAS))
        .ok()
        .or_else(|| {
            crate::managed_server::load_persisted()
                .ok()
                .flatten()
                .filter(|persisted| {
                    crate::managed_server::canonical_server_origin(&persisted.server).ok()
                        == crate::managed_server::canonical_server_origin(router).ok()
                })
                .and_then(|persisted| persisted.token)
        })
}

#[path = "client_command_token.rs"]
mod token_support;
pub(crate) use token_support::failed;
use token_support::{
    decoded_token_binding, issue_client_token, local_client_base_url, local_token_binding,
    shell_quote, token_manager,
};
