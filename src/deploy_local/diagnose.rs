//! Read-only diagnosis and explicit adoption of an inconsistent local
//! deployment (issue #631).
//!
//! A running relay and backend whose durable `active` record is missing or
//! unparseable still serve clients. Status describes that topology instead
//! of stopping at the first disagreement, and the next ordinary `router
//! deploy` records the running topology without touching a container, so
//! established streams and issued tokens survive the repair.

use std::process::ExitCode;

use super::state::{Active, ActiveRecord};
use super::{Coordinator, Existing, LABEL_KEY, RELAY, SPEC_VERSION};

impl Coordinator<'_> {
    /// The record the running topology proves, or why it proves none.
    pub(super) fn adoptable(&self) -> Result<Active, String> {
        match self.state.active_record() {
            ActiveRecord::Absent | ActiveRecord::Corrupt(_) => {}
            ActiveRecord::Valid(active) => {
                return Err(format!(
                    "the active record names {} and disagrees with the running topology",
                    active.backend
                ));
            }
            ActiveRecord::Unsupported(reason) => {
                return Err(format!(
                    "the active record is not ours to replace: {reason}"
                ));
            }
        }
        let backend = self
            .state
            .current()?
            .ok_or("the relay pointer names no backend")?;
        if !self.docker.owned(&backend, self.root, "backend") {
            return Err(format!(
                "pointer backend {backend} is absent or not owned by this root"
            ));
        }
        if self.label(&backend, "spec").as_deref() != Some(SPEC_VERSION) {
            return Err(format!(
                "pointer backend {backend} has an unknown launch specification"
            ));
        }
        if !self.docker.owned(RELAY, self.root, "relay")
            || self.label(RELAY, "spec").as_deref() != Some(SPEC_VERSION)
        {
            return Err(format!("{RELAY} is absent or not owned by this root"));
        }
        let port = self
            .label(RELAY, "port")
            .and_then(|port| port.parse().ok())
            .ok_or_else(|| format!("{RELAY} has no published port label"))?;
        Ok(Active {
            version: 1,
            image_ref: self.docker.image_ref(&backend)?,
            image_id: self.docker.container_image_id(&backend)?,
            backend,
            port,
        })
    }

    fn label(&self, container: &str, suffix: &str) -> Option<String> {
        self.docker
            .label(container, &format!("{LABEL_KEY}.{suffix}"))
    }

    /// Print the diagnosis for a status run; never a success.
    pub(super) fn diagnose(&self, error: &str) -> ExitCode {
        eprintln!("warning: local deployment state is inconsistent: {error}");
        for line in self.diagnosis(error) {
            println!("{line}");
        }
        ExitCode::from(1)
    }

    /// Describe every fact status can read, then the safe recovery plan.
    /// Only inspections and read-only `exec`s run here.
    pub(super) fn diagnosis(&self, error: &str) -> Vec<String> {
        let mut lines = vec![
            format!("deployment_root={}", self.root.display()),
            format!("candidate_image={}", self.image),
            self.claude.status_line(self.root),
            format!("consistency=inconsistent reason={error:?}"),
            format!("active_record={}", self.state.active_record().describe()),
        ];
        let pointer = self.state.current();
        lines.push(match &pointer {
            Ok(Some(backend)) => format!("relay_pointer={backend}"),
            Ok(None) => "relay_pointer=absent".to_string(),
            Err(reason) => format!("relay_pointer=unreadable reason={reason:?}"),
        });
        lines.push(match self.state.transaction() {
            Ok(Some(transaction)) => format!("transaction={:?}", transaction.phase),
            Ok(None) => "transaction=absent".to_string(),
            Err(reason) => format!("transaction=unreadable reason={reason:?}"),
        });
        let mut containers = self.docker.owned_containers(self.root).unwrap_or_default();
        containers.sort();
        let pointer = pointer.ok().flatten();
        for container in &containers {
            lines.push(self.describe_container(container, pointer.as_deref()));
        }
        if self.docker.exists(RELAY) && !containers.iter().any(|name| name == RELAY) {
            lines.push(format!(
                "container={RELAY} owner=foreign root={}",
                self.label(RELAY, "root").as_deref().unwrap_or("unlabelled")
            ));
        }
        if let Some(backend) = pointer.as_deref().filter(|backend| {
            containers.iter().any(|name| name == backend)
                && self.docker.running(backend).unwrap_or(false)
        }) {
            lines.push(match self.connection_count(backend) {
                Ok(count) => format!("connections={count}"),
                Err(reason) => format!("connections=unknown reason={reason:?}"),
            });
            lines.push(match self.inventory(backend) {
                Ok(inventory) => format!(
                    "run_inventory runs={} blockers={}",
                    inventory.runs.len(),
                    inventory.blockers().count()
                ),
                Err(reason) => format!("run_inventory=unknown reason={reason:?}"),
            });
        }
        match self.adoptable() {
            Ok(active) => {
                lines.push(format!(
                    "recovery_plan=adopt backend={} image={} port={} mutation=active-record-only containers_unchanged=true",
                    active.backend, active.image_ref, active.port
                ));
                lines.push(
                    "next: rerun `router deploy` without --status; it records the running topology, keeps established streams and issued tokens, and then converges normally"
                        .to_string(),
                );
            }
            Err(reason) => {
                lines.push(format!("recovery_plan=manual reason={reason:?}"));
                lines.push(
                    "next: `router deploy --down --yes` removes only this root's containers and retains credentials, data and issued tokens; then rerun `router deploy`"
                        .to_string(),
                );
            }
        }
        lines.push("status_is_read_only=true".to_string());
        lines
    }

    fn describe_container(&self, container: &str, pointer: Option<&str>) -> String {
        let role = self.label(container, "role");
        let mut line = format!(
            "container={container} role={} running={} image={} spec={}",
            role.as_deref().unwrap_or("unlabelled"),
            self.docker
                .running(container)
                .map_or_else(|_| "unknown".to_string(), |running| running.to_string()),
            self.docker
                .image_ref(container)
                .unwrap_or_else(|_| "unknown".to_string()),
            self.label(container, "spec")
                .as_deref()
                .unwrap_or("unknown"),
        );
        let detail = match role.as_deref() {
            Some("relay") => format!(
                " port={}",
                self.label(container, "port")
                    .as_deref()
                    .unwrap_or("unknown")
            ),
            Some("backend") => format!(
                " claude_credentials={} pointer={}",
                self.claude_label(container),
                pointer == Some(container)
            ),
            _ => String::new(),
        };
        line.push_str(&detail);
        line
    }

    /// Record the running topology under the update lock. No container is
    /// started, stopped or replaced; a corrupt record is kept beside it.
    pub(super) fn adopt(&self, error: &str) -> Result<Existing, String> {
        self.adoptable().map_err(|reason| {
            format!(
                "{error}; automatic recovery refused: {reason}; inspect with `router deploy --status`"
            )
        })?;
        self.create_directories()?;
        let _lock = self.acquire_lock()?;
        let active = self.adoptable()?;
        if matches!(self.state.active_record(), ActiveRecord::Corrupt(_)) {
            let aside = self.state.set_aside_active()?;
            println!("set_aside_active_record={}", aside.display());
        }
        self.state.write_active(&active)?;
        println!(
            "recovery=adopted backend={} image={} port={} containers_unchanged=true",
            active.backend, active.image_ref, active.port
        );
        self.existing()
    }
}
