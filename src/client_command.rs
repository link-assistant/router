//! Output and dispatch layer for the `clients` CLI command.

use std::fmt::Write as _;
use std::path::Path;
use std::process::ExitCode;

use crate::cli::ClientOp;
use crate::clients::{
    ClientKind, ClientManager, ManagedCredential, OwnershipState, RepairResult, TokenSource,
};
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
        ClientOp::List { json } => list(&manager, *json),
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
        ClientOp::Show { client, .. } => show(&manager, *client),
        ClientOp::Remove {
            client,
            revoke_supplied,
            force,
        } => remove(config, &manager, *client, *revoke_supplied, *force),
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

async fn repair(
    manager: &ClientManager,
    client: Option<ClientKind>,
    all: bool,
    dry_run: bool,
    json: bool,
    rollback: Option<&str>,
) -> ExitCode {
    let clients = if all {
        ClientKind::ALL.to_vec()
    } else if let Some(client) = client {
        vec![client]
    } else {
        return failed("choose one client or pass --all");
    };

    if let Some(id) = rollback {
        let result = manager.rollback_repair(clients[0], id);
        return print_repair_result(result, json, "rolled back");
    }

    if dry_run {
        let mut plans = Vec::new();
        let mut errors = Vec::new();
        for client in clients {
            match manager.repair_plan(client) {
                Ok(plan) => plans.push(plan),
                Err(error) => errors.push(serde_json::json!({
                    "client": client.canonical_name(),
                    "error": error.to_string(),
                })),
            }
        }
        if json {
            println!(
                "{}",
                serde_json::to_string_pretty(&serde_json::json!({
                    "dry_run": true,
                    "plans": plans,
                    "errors": errors,
                }))
                .unwrap_or_default()
            );
        } else {
            for plan in &plans {
                println!(
                    "{}: {}; action={}{}",
                    plan.client,
                    plan.state,
                    plan.action,
                    if plan.conflicts.is_empty() {
                        String::new()
                    } else {
                        format!("; conflicts={}", plan.conflicts.join(","))
                    }
                );
            }
            for error in &errors {
                eprintln!("error: {error}");
            }
        }
        return if errors.is_empty() {
            ExitCode::SUCCESS
        } else {
            ExitCode::from(1)
        };
    }

    let mut results = Vec::new();
    let mut errors = Vec::new();
    for client in clients {
        match repair_one(manager, client).await {
            Ok(result) => results.push(result),
            Err(error) => errors.push(serde_json::json!({
                "client": client.canonical_name(),
                "error": crate::login_url::redact_secrets(&error.to_string()),
            })),
        }
    }
    if json {
        println!(
            "{}",
            serde_json::to_string_pretty(&serde_json::json!({
                "results": results,
                "errors": errors,
            }))
            .unwrap_or_default()
        );
    } else {
        for result in &results {
            if result.changed {
                println!(
                    "repaired {} (backup {})",
                    result.client,
                    result.backup_id.as_deref().unwrap_or("none")
                );
                if result.restart_required {
                    println!(
                        "restart Claude Code to refresh its gateway catalog; its cache was left intact"
                    );
                }
            } else {
                println!("{} is already managed and intact", result.client);
            }
        }
        for error in &errors {
            eprintln!("error: {error}");
        }
    }
    if errors.is_empty() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    }
}

fn print_repair_result(
    result: Result<RepairResult, crate::clients::ClientError>,
    json: bool,
    verb: &str,
) -> ExitCode {
    match result {
        Ok(result) => {
            if json {
                println!(
                    "{}",
                    serde_json::to_string_pretty(&result).unwrap_or_default()
                );
            } else {
                println!("{verb} {} using repair snapshot", result.client);
            }
            ExitCode::SUCCESS
        }
        Err(error) => failed(error),
    }
}

async fn repair_one(
    manager: &ClientManager,
    client: ClientKind,
) -> Result<RepairResult, Box<dyn std::error::Error + Send + Sync>> {
    let analysis = manager.analyze(client)?;
    let old_metadata = manager.credential_metadata(client).ok().flatten();
    if analysis.state == OwnershipState::ManagedIntact {
        return Ok(RepairResult {
            client,
            before: analysis.state,
            after: analysis.state,
            changed: false,
            restart_required: false,
            backup_id: None,
        });
    }
    if let Some(limitation) = client.setup_limitation() {
        return Err(limitation.into());
    }

    // A drifted managed installation keeps its existing credential. Foreign,
    // incomplete and unconfigured installations acquire and validate a
    // candidate first; no client file is touched until that succeeds.
    if analysis.state == OwnershipState::ManagedDrifted
        && let (Some(token), Some(metadata)) = (
            manager.managed_token(client)?,
            manager.credential_metadata(client)?,
        )
        && let Some(base_url) = metadata.router.as_deref()
    {
        let models = manager.catalog(client, base_url, &token).await?;
        let usable = crate::clients::usable_models(client, &models);
        let result = manager.apply_repair(client, base_url, &token, &metadata, &usable)?;
        if let Err(error) = manager.catalog(client, base_url, &token).await {
            if let Some(id) = result.backup_id.as_deref() {
                manager.rollback_repair(client, id)?;
            }
            return Err(format!("post-repair catalog validation failed: {error}").into());
        }
        return Ok(result);
    }

    let server = crate::managed_server::resolve(None, None, None, false).await?;
    let candidate = crate::managed_server::prepare_repair_credential(
        &server,
        client,
        &format!("client-repair-{client}"),
        24,
    )
    .await?;
    debug_assert!(candidate.was_minted());
    let metadata = ManagedCredential {
        client: client.to_string(),
        source: TokenSource::Minted,
        token_id: candidate.id(),
        label: candidate
            .was_minted()
            .then(|| format!("client-repair-{client}")),
        issued_at: candidate
            .was_minted()
            .then(|| chrono::Utc::now().timestamp()),
        router: Some(server.base_url.clone()),
        principal_id: candidate
            .was_minted()
            .then(|| crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string()),
    };
    let models = crate::clients::usable_models(client, candidate.models());
    let applied = manager.apply_repair(
        client,
        &server.base_url,
        &candidate.token,
        &metadata,
        &models,
    );
    let result = match applied {
        Ok(result) => result,
        Err(error) => {
            return match crate::managed_server::cleanup_run_credential(candidate).await {
                Ok(()) => Err(error.into()),
                Err(cleanup) => Err(format!(
                    "{error}; the unused minted repair credential could not be revoked: {cleanup}"
                )
                .into()),
            };
        }
    };
    if let Err(error) = manager
        .catalog(client, &server.base_url, &candidate.token)
        .await
    {
        let rollback = result
            .backup_id
            .as_deref()
            .map_or(Ok(()), |id| manager.rollback_repair(client, id).map(|_| ()));
        let cleanup = crate::managed_server::cleanup_run_credential(candidate).await;
        let mut message = format!("post-repair catalog validation failed: {error}");
        if let Err(rollback) = rollback {
            let _ = write!(message, "; automatic rollback also failed: {rollback}");
        }
        if let Err(cleanup) = cleanup {
            let _ = write!(
                message,
                "; the unused minted repair credential could not be revoked: {cleanup}"
            );
        }
        return Err(message.into());
    }
    if candidate.was_minted()
        && let (Some(old), Some(old_id), Some(new_id), Some(admin_token)) = (
            old_metadata.as_ref(),
            old_metadata
                .as_ref()
                .filter(|old| old.source == TokenSource::Minted)
                .and_then(|old| old.token_id.as_deref()),
            metadata.token_id.as_deref(),
            server.token.as_deref(),
        )
        && old_id != new_id
        && old.router.as_deref() == Some(server.base_url.as_str())
        && let Err(error) =
            crate::managed_server::revoke(&server.base_url, admin_token, old_id).await
    {
        eprintln!(
            "warning: repaired {client}, but the replaced Router-owned token could not be revoked: {}",
            crate::login_url::redact_secrets(&error.to_string())
        );
    }
    // The candidate intentionally remains live: it is now the credential
    // named by the private environment and secret-free metadata files.
    Ok(result)
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
    // `setup` mints from *this* deployment's token store, so the credential it
    // writes is only valid here. Defaulting the address to this CLI's own
    // `--host`/`--port` while another router was selected produced a client
    // pointed at a deployment that may not even be running, with no error
    // (issue #296). It cannot follow the selection either — a locally signed
    // token would be rejected there — so it says which command can.
    let base_url = match base_url {
        Some(base_url) => base_url.to_string(),
        None => match crate::managed_server::selected_server() {
            Some(selected) => {
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
            None => local_client_base_url(config),
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
    let (token, credential) = match supplied_token {
        Some(token) => {
            let binding = match local_token_binding(config, token, client) {
                Ok(binding) => binding,
                Err(error) => return failed(error),
            };
            (
                token.to_string(),
                ManagedCredential {
                    client: client.to_string(),
                    source: TokenSource::Supplied,
                    token_id: binding.as_ref().map(|binding| binding.token_id.clone()),
                    label: None,
                    issued_at: None,
                    router: Some(base_url.clone()),
                    principal_id: binding.and_then(|binding| binding.principal_id),
                },
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
                    principal_id: Some(
                        crate::credential_recovery_store::PRIMARY_ACCOUNT.to_string(),
                    ),
                },
            ),
            Err(error) => return failed(error),
        },
    };
    let models = if matches!(
        client,
        ClientKind::Opencode | ClientKind::QwenCode | ClientKind::Agent
    ) {
        match manager.catalog(client, &base_url, &token).await {
            // Filtered by the same rule `with` and `doctor` use, so a client
            // config cannot embed a model the launcher would refuse to start
            // it on (issue #301).
            Ok(models) => crate::clients::usable_models(client, &models),
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

/// Validate that a supplied local token is bound to exactly this adapter.
struct LocalTokenBinding {
    token_id: String,
    principal_id: Option<String>,
}

fn local_token_binding(
    config: &Config,
    token: &str,
    client: ClientKind,
) -> Result<Option<LocalTokenBinding>, Box<dyn std::error::Error>> {
    let manager = token_manager(config)?;
    let Ok(claims) = manager.validate_token(token) else {
        // The supplied credential can belong to a remote Router with a
        // different signing key. Its catalog endpoint is the authority for
        // that credential; only locally verifiable tokens can be inspected or
        // revoked from this data directory.
        return Ok(None);
    };
    let Some(client_name) = claims.client_kind.as_deref() else {
        if claims.principal_id.is_some() {
            return Err("the supplied token has an incomplete managed-client binding".into());
        }
        // Legacy and deliberately generic tokens remain usable with ordinary
        // API-key providers. The server still denies them access to every
        // consumer subscription because they carry no signed client/principal
        // entitlement.
        return Ok(Some(LocalTokenBinding {
            token_id: claims.sub,
            principal_id: None,
        }));
    };
    let bound_client = ClientKind::from_str_opt(client_name)
        .ok_or("the supplied token has an unknown managed-client binding")?;
    if bound_client != client {
        return Err(format!(
            "the supplied token is bound to {}, not {}",
            bound_client.display_name(),
            client.display_name()
        )
        .into());
    }
    let principal = claims
        .principal_id
        .filter(|value| !value.is_empty())
        .ok_or("the supplied token has no subscriber principal")?;
    Ok(Some(LocalTokenBinding {
        token_id: claims.sub,
        principal_id: Some(principal),
    }))
}

fn token_manager(config: &Config) -> Result<TokenManager, Box<dyn std::error::Error>> {
    if !config.data_dir.exists() {
        std::fs::create_dir_all(&config.data_dir)?;
    }
    let store = build_token_store(config.storage_policy, &config.data_dir)?;
    crate::token_secret::ensure_real(&config.token_secret)?;
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
        account: Some(crate::credential_recovery_store::PRIMARY_ACCOUNT),
        max_requests: None,
        max_tokens: None,
        rate_limit_per_minute: None,
        scope: "",
        github_repos: Vec::new(),
        sliding_window_seconds: None,
        client_kind: Some(client.canonical_name()),
        principal_id: Some(crate::credential_recovery_store::PRIMARY_ACCOUNT),
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
