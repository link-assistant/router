//! Serve a local deployment from the host instead of containers (issue #626).
//!
//! On macOS Claude Code keeps its live, rotating login in the Keychain, which
//! no container can read or update, so `--claude-credentials share` is
//! refused and a container deployment cannot expose Anthropic. Host mode runs
//! this Router binary on the host, where the Keychain is read in place, with
//! the deployment's own data directory (token store, request logs, provider
//! configuration), the same signing secret, and the same loopback port, so
//! issued client tokens and every client profile pointing at that endpoint
//! keep working and exactly one local endpoint exists.
//!
//! The migration is candidate-first. A host candidate on an ephemeral
//! loopback port must become healthy and accept a token signed with the
//! running deployment's secret before anything changes. Only then is the
//! relay stopped and the host process started on the stable port and
//! validated again; any failure restarts the relay, so the container
//! deployment keeps serving. The containers are stopped, not removed, and
//! `router deploy --mode container` restores them. OAuth bytes are never read
//! by this command: the Keychain is consulted for presence only, and the host
//! Router reads it itself.

use std::path::{Path, PathBuf};
use std::process::ExitCode;

use link_assistant_router::cli::{DeployArgs, DeployMode};

use super::host_runtime::{ClaudeLogin, HostRuntime};
use super::inventory::{Inventory, RunState};
use super::secret::{SecretMatch, fingerprint};
use super::state::{Active, Host, Phase};

use super::{Coordinator, Existing, RELAY, result_code};

/// The one command that returns a host deployment to its containers.
pub(super) const ROLLBACK_COMMAND: &str = "router deploy --mode container";

struct Blocker {
    name: &'static str,
    reason: String,
    forceable: bool,
}

/// What a host migration starts from, gathered without changing anything.
struct Plan {
    executable: PathBuf,
    login: ClaudeLogin,
    /// The managed container deployment host mode replaces.
    from: Option<Active>,
    record: Option<Host>,
    /// The recorded host process is alive and answers its health check.
    record_serving: bool,
    secret: SecretMatch,
    inventory: Option<Inventory>,
    converged: bool,
    /// The predicted pre-move data checkpoint, when it fits.
    checkpoint: Option<String>,
    blockers: Vec<Blocker>,
}

impl Plan {
    fn block(&mut self, name: &'static str, reason: impl Into<String>, forceable: bool) {
        self.blockers.push(Blocker {
            name,
            reason: reason.into(),
            forceable,
        });
    }
}

/// Route a run that requests host mode or finds it in effect; `None`
/// continues with the container coordinator.
pub(super) fn dispatch(
    coordinator: &Coordinator<'_>,
    args: &DeployArgs,
    runtime: &dyn HostRuntime,
) -> Option<ExitCode> {
    let record = match coordinator.state.host() {
        Ok(record) => record,
        Err(error) => return Some(result_code(Err(error))),
    };
    if args.down {
        return coordinator.host_down(&record?, args.yes, runtime);
    }
    match (args.mode, record) {
        (Some(DeployMode::Host), record) | (None, record @ Some(_)) => {
            Some(coordinator.host_mode(args, record, runtime))
        }
        (Some(DeployMode::Container), Some(record)) => {
            coordinator.leave_host(args, &record, runtime)
        }
        (Some(DeployMode::Container) | None, None) => None,
    }
}

impl Coordinator<'_> {
    fn host_mode(
        &self,
        args: &DeployArgs,
        record: Option<Host>,
        runtime: &dyn HostRuntime,
    ) -> ExitCode {
        if args.claude_credentials.is_some() {
            eprintln!(
                "error: --claude-credentials selects a container backend's login; host mode \
                 reads this machine's Claude Code login in place, including the macOS Keychain"
            );
            return ExitCode::from(2);
        }
        let plan = match self.host_plan(record, runtime) {
            Ok(plan) => plan,
            Err(error) => return result_code(Err(error)),
        };
        self.print_host_plan(&plan);
        if args.status {
            let ready = plan.converged || plan.blockers.is_empty();
            return if ready {
                ExitCode::SUCCESS
            } else {
                ExitCode::from(1)
            };
        }
        if plan.converged {
            println!(
                "host deployment is already converged; no process, container, token, or credential changed"
            );
            return ExitCode::SUCCESS;
        }
        for blocker in &plan.blockers {
            if !blocker.forceable {
                eprintln!(
                    "host mode refused before deployment mutation: {}",
                    blocker.reason
                );
                return ExitCode::from(2);
            }
        }
        if let Some(blocker) = plan.blockers.first() {
            if !self.force {
                eprintln!(
                    "host mode refused before deployment mutation: {}; rerun with --force-update after reviewing the plan",
                    blocker.reason
                );
                return ExitCode::from(2);
            }
            for blocker in &plan.blockers {
                println!("force_update accepted {}", blocker.name);
            }
        }
        if plan.secret == SecretMatch::NotSupplied {
            eprintln!("{}", link_assistant_router::token_secret::refusal());
            return ExitCode::from(2);
        }
        result_code(self.migrate_to_host(&plan, runtime))
    }

    fn host_plan(&self, record: Option<Host>, runtime: &dyn HostRuntime) -> Result<Plan, String> {
        let executable = runtime.executable()?;
        let data = self.root.join("data");
        let mut plan = Plan {
            executable,
            login: runtime.claude_login(),
            from: None,
            record_serving: record.as_ref().is_some_and(|record| {
                runtime.serving(record.pid, Path::new(&record.executable))
                    && runtime.status(record.port, "/api/health", None) == Some(200)
            }),
            record,
            secret: SecretMatch::Matches,
            inventory: None,
            converged: false,
            checkpoint: None,
            blockers: Vec::new(),
        };
        let docker = self.docker.available().is_ok();
        if docker {
            match self.state.transaction() {
                Ok(Some(transaction)) if transaction.phase != Phase::Complete => plan.block(
                    "pending-transaction",
                    format!(
                        "an interrupted container update must be recovered first; run `{ROLLBACK_COMMAND}`"
                    ),
                    false,
                ),
                Err(error) => plan.block("inconsistent-state", error, false),
                Ok(_) => {}
            }
        }
        if plan.record.is_none() {
            if docker {
                match self.existing() {
                    Ok(Existing::Absent) => {}
                    Ok(Existing::Legacy) => plan.block(
                        "legacy-direct-front-door",
                        "the legacy direct container cannot prove it is idle; migrate it with `router deploy` first",
                        false,
                    ),
                    Ok(Existing::Managed(active)) => plan.from = Some(active),
                    // The relay name is machine-wide; another root's relay is
                    // not this deployment and only matters if it holds the port.
                    Err(_)
                        if self.state.active()?.is_none()
                            && !self.docker.owned(RELAY, self.root, "relay") => {}
                    Err(error) => plan.block("inconsistent-state", error, false),
                }
            } else if self.state.current()?.is_some()
                || self.state.active().ok().flatten().is_some()
            {
                plan.block(
                    "container-runtime-unavailable",
                    "the container deployment cannot be stopped without its container runtime",
                    false,
                );
            }
        }
        self.assess_source(&mut plan, runtime)?;
        if let Some(uid) = runtime.user_id()
            && data.exists()
            && let Some(stranger) = super::claude_share::foreign_entry(&data, uid)
        {
            plan.block(
                "foreign-owned-data",
                format!(
                    "{} belongs to another user (a container backend ran as root), so the host Router could not write it. Run `sudo chown -R {uid} {}` first",
                    stranger.display(),
                    data.display()
                ),
                false,
            );
        }
        // Every move or update checkpoints first; predict it so the plan names
        // the blocker the real run would hit (issue #658).
        match super::data_backup::checkpoint_status(self.root) {
            Ok(line) => plan.checkpoint = Some(line),
            Err(reason) => plan.block("data-checkpoint", reason, false),
        }
        let fingerprint = fingerprint(self.token_secret);
        plan.converged = plan.from.is_none()
            && plan.record_serving
            && plan.record.as_ref().is_some_and(|record| {
                Path::new(&record.executable) == plan.executable
                    && record.router_version == link_assistant_router::VERSION
                    && record.port == self.port
                    && record.token_secret == fingerprint
            });
        Ok(plan)
    }

    /// Secret, listener, connections and runs of whatever serves now.
    fn assess_source(&self, plan: &mut Plan, runtime: &dyn HostRuntime) -> Result<(), String> {
        let placeholder = link_assistant_router::token_secret::is_placeholder(self.token_secret);
        if let Some(active) = plan.from.clone() {
            plan.secret = self.secret_match(&active.backend);
            if matches!(plan.secret, SecretMatch::Changed | SecretMatch::Unknown) {
                plan.block(
                    "token-secret-change",
                    format!(
                        "{} verifies tokens with another or unknown TOKEN_SECRET; its issued client tokens would be rejected with HTTP 401",
                        active.backend
                    ),
                    true,
                );
            }
            if active.port != self.port {
                plan.block(
                    "stable-listener-change",
                    format!(
                        "host mode keeps the stable listener; pass --port {}",
                        active.port
                    ),
                    false,
                );
            }
            let foreign = self
                .docker
                .listeners_on(self.port)?
                .into_iter()
                .filter(|name| name != RELAY)
                .collect::<Vec<_>>();
            if !foreign.is_empty() {
                plan.block(
                    "port-in-use",
                    format!("port {} is published by {}", self.port, foreign.join(", ")),
                    false,
                );
            }
            let connections = self.connection_count(&active.backend)?;
            if connections > 0 {
                plan.block(
                    "established-connections",
                    format!(
                        "{connections} established connection(s) through {RELAY} would be cut when the listener moves"
                    ),
                    true,
                );
            }
            let rendered = if self.docker.running(&active.backend)? {
                self.docker.token_inventory(&active.backend)
            } else {
                runtime.token_inventory(&plan.executable, &self.root.join("data"))
            };
            Self::assess_runs(plan, rendered);
        } else if let Some(record) = plan.record.clone() {
            plan.secret = if placeholder {
                SecretMatch::NotSupplied
            } else if record.token_secret == fingerprint(self.token_secret) {
                SecretMatch::Matches
            } else {
                plan.block(
                    "token-secret-change",
                    "the host Router verifies tokens with another TOKEN_SECRET; its issued client tokens would be rejected with HTTP 401",
                    true,
                );
                SecretMatch::Changed
            };
            if record.port != self.port {
                plan.block(
                    "stable-listener-change",
                    format!(
                        "host mode keeps the stable listener; pass --port {}",
                        record.port
                    ),
                    false,
                );
            }
            let outdated = Path::new(&record.executable) != plan.executable
                || record.router_version != link_assistant_router::VERSION;
            if plan.record_serving && outdated {
                plan.block(
                    "host-restart",
                    format!(
                        "replacing the running host Router {} with {} closes its open connections",
                        record.router_version,
                        link_assistant_router::VERSION
                    ),
                    true,
                );
            }
            if plan.record_serving && (outdated || plan.secret != SecretMatch::Matches) {
                let rendered = runtime.token_inventory(&plan.executable, &self.root.join("data"));
                Self::assess_runs(plan, rendered);
            }
            if !plan.record_serving && runtime.status(self.port, "/api/health", None).is_some() {
                plan.block(
                    "port-in-use",
                    format!(
                        "another process answers on 127.0.0.1:{}, not the recorded host Router",
                        self.port
                    ),
                    false,
                );
            }
        } else {
            plan.secret = if placeholder {
                SecretMatch::NotSupplied
            } else {
                SecretMatch::Matches
            };
            if runtime.status(self.port, "/api/health", None).is_some() {
                plan.block(
                    "port-in-use",
                    format!("another process answers on 127.0.0.1:{}", self.port),
                    false,
                );
            }
        }
        Ok(())
    }

    /// A live run's next request would meet a closed listener during the
    /// swap, so live runs refuse the move unless it is forced.
    fn assess_runs(plan: &mut Plan, rendered: Result<String, String>) {
        let inventory = rendered
            .and_then(|rendered| Inventory::from_json(&rendered, chrono::Utc::now().timestamp()));
        match inventory {
            Ok(inventory) => {
                for run in &inventory.runs {
                    if run.state != RunState::StalePinned {
                        plan.block(
                            "live-run",
                            format!(
                                "run {} ({}) is {} and would be interrupted",
                                run.id,
                                serde_json::to_string(&run.label).unwrap_or_else(|_| "null".into()),
                                run.state.as_str()
                            ),
                            true,
                        );
                    }
                }
                plan.inventory = Some(inventory);
            }
            Err(error) => plan.block(
                "run-inventory-unknown",
                format!("refusing to move the listener without a run inventory: {error}"),
                false,
            ),
        }
    }

    fn print_host_plan(&self, plan: &Plan) {
        println!("mode=host");
        println!("deployment_root={}", self.root.display());
        println!(
            "host_router={} version={}",
            plan.executable.display(),
            link_assistant_router::VERSION
        );
        println!(
            "data_dir={} preserved=token-store,signing-secret,request-logs,provider-configuration",
            self.root.join("data").display()
        );
        println!(
            "listener=127.0.0.1:{} client_profiles_unchanged=true",
            self.port
        );
        println!(
            "claude_login={} read_in_place=true oauth_bytes_copied=0",
            plan.login.as_str()
        );
        println!("token_secret={}", plan.secret.as_str());
        match &plan.from {
            Some(active) => {
                println!(
                    "container_backend={} image={} running={}",
                    active.backend,
                    active.image_ref,
                    self.docker.running(&active.backend).unwrap_or(false)
                );
                println!(
                    "relay={RELAY} running={} port={}",
                    self.docker.running(RELAY).unwrap_or(false),
                    active.port
                );
                println!(
                    "connections={}",
                    self.connection_count(&active.backend)
                        .map_or_else(|_| "unknown".to_string(), |count| count.to_string())
                );
            }
            None => println!(
                "container_backend={}",
                plan.record
                    .as_ref()
                    .and_then(|record| record.previous_backend.as_deref())
                    .map_or_else(
                        || "absent".to_string(),
                        |backend| format!("{backend} stopped=retained-for-rollback")
                    )
            ),
        }
        if let Some(inventory) = &plan.inventory {
            inventory.print();
        }
        match &plan.record {
            Some(record) => println!(
                "host_process=pid:{} port={} version={} serving={}",
                record.pid, record.port, record.router_version, plan.record_serving
            ),
            None => println!("host_process=absent"),
        }
        if !plan.converged {
            let mut step = 0;
            let mut print = |action: String| {
                step += 1;
                println!("plan step={step} {action}");
            };
            if plan.from.is_some() {
                print("action=validate-host-candidate listener=127.0.0.1:ephemeral token_probe=required".into());
                print(format!("action=stop-relay container={RELAY} retained=true"));
            }
            print(format!(
                "action=start-host listener=127.0.0.1:{} validate=health,token_probe",
                self.port
            ));
            if let Some(active) = &plan.from {
                print(format!(
                    "action=stop-backend container={} retained=true",
                    active.backend
                ));
            }
            if plan.from.is_some() {
                println!("on_failure=restart {RELAY}; the container deployment keeps serving");
            }
        }
        println!("rollback_command=\"{ROLLBACK_COMMAND}\"");
        if let Some(line) = &plan.checkpoint {
            println!("{line}");
        }
        for blocker in &plan.blockers {
            println!(
                "blocker={} forceable={} reason={}",
                blocker.name,
                blocker.forceable,
                serde_json::to_string(&blocker.reason).unwrap_or_default()
            );
        }
        println!(
            "force_update_interrupts={}",
            plan.blockers.iter().any(|blocker| blocker.forceable)
        );
        println!("converged={}", plan.converged);
        println!("status_is_read_only=true");
    }
}

#[path = "host_migrate.rs"]
mod migrate;
