//! Repair implementation for the `clients` command.

use std::fmt::Write as _;
use std::process::ExitCode;

use crate::client_command::{ensure_codex_bridge, failed};
use crate::clients::{
    ClientKind, ClientManager, ManagedCredential, OwnershipState, RepairResult, TokenSource,
};

pub async fn repair(
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
    let bridge = if let Some(base_url) = old_metadata
        .as_ref()
        .and_then(|metadata| metadata.router.as_deref())
    {
        ensure_codex_bridge(manager, client, base_url).await?
    } else {
        None
    };
    let codex_backend_base_url = bridge
        .as_ref()
        .map(|bridge| bridge.backend_base_url().to_string());
    let bridge_matches = bridge.as_ref().is_none_or(|bridge| {
        manager
            .codex_backend_matches(bridge.backend_base_url())
            .unwrap_or(false)
    });
    if analysis.state == OwnershipState::ManagedIntact && bridge_matches {
        if client == ClientKind::Codex && bridge.is_none() {
            crate::codex_loopback_bridge::stop_persistent(
                &manager.codex_loopback_bridge_state_path(),
            )
            .await?;
        }
        if let Some(bridge) = bridge {
            bridge.commit();
        }
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
    if matches!(
        analysis.state,
        OwnershipState::ManagedDrifted | OwnershipState::ManagedIntact
    ) && let (Some(token), Some(metadata)) = (
        manager.managed_token(client)?,
        manager.credential_metadata(client)?,
    ) && let Some(base_url) = metadata.router.as_deref()
    {
        let models = manager.catalog(client, base_url, &token).await?;
        let usable = crate::clients::usable_models(client, &models);
        let result = manager.apply_repair_with_codex_backend(
            client,
            base_url,
            &token,
            &metadata,
            &usable,
            codex_backend_base_url.as_deref(),
        )?;
        if let Err(error) = manager.catalog(client, base_url, &token).await {
            if let Some(id) = result.backup_id.as_deref() {
                manager.rollback_repair(client, id)?;
            }
            return Err(format!("post-repair catalog validation failed: {error}").into());
        }
        if client == ClientKind::Codex && bridge.is_none() {
            crate::codex_loopback_bridge::stop_persistent(
                &manager.codex_loopback_bridge_state_path(),
            )
            .await?;
        }
        if let Some(bridge) = bridge {
            bridge.commit();
        }
        return Ok(result);
    }

    drop(bridge);
    let server = crate::managed_server::resolve(None, None, None, None, false).await?;
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
        management_server: Some(server.management_url.clone()),
        principal_id: candidate
            .was_minted()
            .then(|| candidate.principal_id().to_string()),
        config_sha256: None,
    };
    let models = crate::clients::usable_models(client, candidate.models());
    let bridge = ensure_codex_bridge(manager, client, &server.base_url).await?;
    let codex_backend_base_url = bridge
        .as_ref()
        .map(crate::codex_loopback_bridge::PersistentBridge::backend_base_url);
    let applied = manager.apply_repair_with_codex_backend(
        client,
        &server.base_url,
        &candidate.token,
        &metadata,
        &models,
        codex_backend_base_url,
    );
    let result = match applied {
        Ok(result) => result,
        Err(error) => {
            let bridge_cleanup = if let Some(bridge) = bridge {
                bridge.rollback().await.err()
            } else {
                None
            };
            return match crate::managed_server::cleanup_run_credential(candidate).await {
                Ok(()) if bridge_cleanup.is_none() => Err(error.into()),
                Ok(()) => Err(format!(
                    "{error}; the unused Codex bridge could not be removed: {}",
                    bridge_cleanup.expect("checked above")
                )
                .into()),
                Err(cleanup) => Err(format!(
                    "{error}; the unused minted repair credential could not be revoked: {cleanup}{}",
                    bridge_cleanup.map_or_else(String::new, |bridge| format!(
                        "; the unused Codex bridge could not be removed: {bridge}"
                    ))
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
    if client == ClientKind::Codex && bridge.is_none() {
        crate::codex_loopback_bridge::stop_persistent(&manager.codex_loopback_bridge_state_path())
            .await?;
    }
    if let Some(bridge) = bridge {
        bridge.commit();
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
            crate::managed_server::revoke(&server.management_url, admin_token, old_id).await
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
