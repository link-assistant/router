//! Permanent client setup: one name, one targeting rule, one reversal.
//!
//! `configure` answers the question `clients setup` and `with --global`
//! answered differently. It acts on the router this machine is pointed at,
//! rather than on this CLI's own `--host`/`--port` default; it stores the
//! credential it minted from that router, so the client works when the command
//! returns rather than after the operator sets an environment variable; and it
//! is reversed by its own name, through the hash-verified restore that was the
//! better of the two mechanisms already present (issue #296).

use std::process::ExitCode;

use crate::cli::ConfigureArgs;
use crate::clients::{ClientKind, ClientManager, ManagedCredential, TokenSource};
use crate::managed_server::{ResolvedServer, prepare_run_credential, resolve};

type AnyError = Box<dyn std::error::Error + Send + Sync>;

/// Why a client cannot be pointed at the router by writing a file.
///
/// Reported and skipped rather than treated as a failure: a workstation being
/// pointed at a deployment wants the clients that can be configured, and being
/// told which ones cannot is more useful than stopping at the first.
fn unconfigurable(client: ClientKind) -> Option<String> {
    match client {
        ClientKind::Cursor | ClientKind::GeminiCli => Some(
            client
                .setup_limitation()
                .unwrap_or("this client cannot be configured through a file")
                .to_string(),
        ),
        _ => None,
    }
}

/// Whether this client is configured only by its shell environment.
///
/// Grok CLI has no persistent base-URL setting, so the credential file is the
/// whole configuration. Refusing it outright, as `with --global` did, withheld
/// the half that does work.
const fn environment_only(client: ClientKind) -> bool {
    matches!(client, ClientKind::GrokCli)
}

/// Run one `router configure` invocation.
pub async fn run(args: &ConfigureArgs) -> ExitCode {
    match run_inner(args).await {
        Ok(code) => code,
        Err(error) => {
            eprintln!(
                "error: {}",
                crate::login_url::redact_secrets(&error.to_string())
            );
            ExitCode::from(1)
        }
    }
}

async fn run_inner(args: &ConfigureArgs) -> Result<ExitCode, AnyError> {
    let manager = ClientManager::from_env()?;
    if args.undo {
        return undo(args, &manager).await;
    }
    let explicit_token = if args.token_stdin {
        Some(crate::server_command::read_token()?)
    } else {
        args.token.clone()
    };
    let server = target(args, explicit_token).await?;
    println!("router: {} (from {})", server.base_url, server.source);
    let mut configured = 0_usize;
    let mut skipped = Vec::new();
    let mut failed = Vec::new();
    for client in args.clients() {
        if let Some(reason) = unconfigurable(client) {
            skipped.push((client, reason));
            continue;
        }
        if args.all && !manager.status(client).is_ok_and(|status| status.installed) {
            skipped.push((client, "not installed on this machine".to_string()));
            continue;
        }
        match configure_one(args, &manager, &server, client).await {
            Ok(()) => configured += 1,
            // `--all` reports every client rather than stopping at the first
            // that refuses: a failure on one says nothing about the rest.
            Err(error) if args.all => failed.push((client, error.to_string())),
            Err(error) => return Err(error),
        }
    }
    for (client, reason) in &skipped {
        println!("skipped {}: {reason}", client.display_name());
    }
    for (client, error) in &failed {
        eprintln!("error: {}: {error}", client.display_name());
    }
    if args.all {
        println!("configured {configured} client(s); undo: router configure --undo <CLIENT>");
    }
    Ok(if failed.is_empty() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(1)
    })
}

/// Which router the client is pointed at.
///
/// The rule settled in issue #294: act on the router this machine is pointed
/// at. `--local` declines a remote selection and uses the router running here,
/// `--server` names one, and the default follows the selection — which is what
/// `clients setup` did not do, writing this CLI's own listen address into a
/// client while a different router was selected.
async fn target(
    args: &ConfigureArgs,
    explicit_token: Option<String>,
) -> Result<ResolvedServer, AnyError> {
    if args.target.local {
        let mut server = crate::managed_server::discovered_local_router()
            .await
            .ok_or("no router is listening on this machine; start one with `router serve`, or drop --local to use the selected server")?;
        if let Some(token) = explicit_token {
            server.token = Some(token);
        }
        return Ok(server);
    }
    let server = resolve(
        args.target.server.as_deref(),
        explicit_token,
        None,
        args.target.managed,
    )
    .await?;
    if server.source == "managed local container" {
        crate::managed_server::start_managed()?;
    }
    Ok(server)
}

async fn configure_one(
    args: &ConfigureArgs,
    manager: &ClientManager,
    server: &ResolvedServer,
    client: ClientKind,
) -> Result<(), AnyError> {
    // Minted from the target, by the rule `clients setup` already used, and
    // stored outside the client's configuration at 0600. `with --global`
    // stopped short of this and told the user to set a variable themselves,
    // which means the command did half its job (issue #296).
    let credential =
        prepare_run_credential(server, &format!("configure-{client}"), args.ttl_hours).await?;
    let record = ManagedCredential {
        client: client.to_string(),
        // Minted only when this command actually issued one: a token the
        // operator supplied is often shared with other machines, so `--undo`
        // must not take it away from them.
        source: if credential.id().is_some() && args.token.is_none() && !args.token_stdin {
            TokenSource::Minted
        } else {
            TokenSource::Supplied
        },
        token_id: credential.id(),
        label: Some(format!("configure-{client}")),
        issued_at: Some(chrono::Utc::now().timestamp()),
        router: Some(server.base_url.clone()),
    };
    if !environment_only(client) {
        let models = crate::clients::usable_models(client, credential.models());
        let path = crate::client_global::apply(client, &server.base_url, &models)?;
        println!("configured {} in {}", client.display_name(), path.display());
    }
    let environment = manager.write_environment(client, &server.base_url, &credential.token)?;
    manager.write_credential_metadata(client, &record)?;
    println!("credentials: {} (mode 0600)", environment.display());
    if environment_only(client) {
        println!(
            "{} has no persistent base-URL setting, so the exports above are the whole \
             configuration; source them from your shell profile",
            client.display_name()
        );
    }
    println!("undo: router configure --undo {client}");
    Ok(())
}

async fn undo(args: &ConfigureArgs, manager: &ClientManager) -> Result<ExitCode, AnyError> {
    let mut restored = 0_usize;
    for client in args.clients() {
        // The same check `configure` itself makes. Reversal used to report
        // success for a client whose configuration the router can never have
        // written (issue #303).
        if let Some(reason) = unconfigurable(client) {
            if args.all {
                continue;
            }
            return Err(reason.into());
        }
        let record = manager.credential_metadata(client).ok().flatten();
        // The configuration comes back first. A hash-verified restore can
        // refuse — an edit made after `configure` is preserved rather than
        // overwritten — and revoking there would strip the credential from a
        // setup that is still in place and still working.
        let config = crate::client_global::undo(client)?;
        // Then the token, before the file that holds it is deleted. Deleting
        // first leaves a live credential nobody can name any more, which is
        // the regression from issue #190 — and `configure` mints for a year,
        // so the window is not a short one.
        if let Some(record) = record
            .as_ref()
            .filter(|record| record.revocable_by_default())
        {
            report_revocation(args, record).await;
        }
        let environment = manager.environment_path(client);
        let had_credential = environment.exists();
        if had_credential {
            std::fs::remove_file(&environment)?;
        }
        let metadata = manager.credential_metadata_path(client);
        if metadata.exists() {
            std::fs::remove_file(&metadata)?;
        }
        match config {
            Some(path) => {
                println!("restored {} exactly", path.display());
                restored += 1;
            }
            None if had_credential => {
                println!(
                    "removed the stored credential for {}",
                    client.display_name()
                );
                restored += 1;
            }
            None if !args.all => {
                return Err(format!(
                    "no configuration saved by `configure` exists for {client}; nothing was restored"
                )
                .into());
            }
            None => {}
        }
    }
    if args.all {
        println!("restored {restored} client(s)");
    }
    Ok(ExitCode::SUCCESS)
}

/// Revoke the credential this client was configured with, or say why not.
///
/// A failure here is reported rather than fatal, and always names the token
/// and the router holding it: the local files still have to come off, and an
/// operator left without the id cannot finish the job by hand.
async fn report_revocation(args: &ConfigureArgs, record: &ManagedCredential) {
    let (Some(router), Some(id)) = (record.router.as_deref(), record.token_id.as_deref()) else {
        return;
    };
    let Some(admin) = admin_token_for(args, router) else {
        println!(
            "note: token {id} on {router} was left in place; revoke it with \
             `router tokens revoke {id} --server {router}`"
        );
        return;
    };
    match crate::managed_server::revoke(router, &admin, id).await {
        Ok(()) => println!("revoked token {id} on {router}"),
        Err(error) => {
            eprintln!("warning: {error}");
            println!(
                "note: token {id} on {router} is still live; revoke it with \
                 `router tokens revoke {id} --server {router}`"
            );
        }
    }
}

/// A credential able to revoke on `router`, without starting anything.
///
/// Undo removes local files and must keep working offline, so this never
/// resolves a target: it asks only what is already to hand.
fn admin_token_for(args: &ConfigureArgs, router: &str) -> Option<String> {
    if let Some(token) = args.token.clone() {
        return Some(token);
    }
    if let Ok(token) = std::env::var("LINK_ASSISTANT_ROUTER_TOKEN")
        .or_else(|_| std::env::var("LINK_ASSISTANT_TOKEN"))
    {
        return Some(token);
    }
    crate::managed_server::load_persisted()
        .ok()
        .flatten()
        .filter(|persisted| persisted.server.trim_end_matches('/') == router.trim_end_matches('/'))
        .and_then(|persisted| persisted.token)
}
