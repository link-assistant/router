//! Structured local status facts, recorded alongside the existing human report.
use serde_json::{Value, json};

use super::{
    Coordinator, Existing, LEGACY, RELAY, data_backup,
    state::{PreviousKind, Transaction},
};

impl Coordinator<'_> {
    pub(super) fn status_report(&self, mode: &str, status: &str) -> Value {
        json!({
            "schema": "link-assistant-router/local-deployment/v1",
            "mode": mode,
            "status": status,
            "deployment_root": self.root,
            "candidate_image": self.image,
            "listener": {"host": "127.0.0.1", "port": self.port},
            "host_router": null,
            "host_process": null,
            "backend": null,
            "relay": null,
            "converged": null,
            "connections": null,
            "runs": null,
            "blockers": [],
            "force_update_interrupts": false,
            "token_secret": null,
            "rollback_command": null,
            "transaction": null,
            "status_is_read_only": true,
        })
    }
}

pub(super) fn blocker(name: &str, reason: &str, forceable: bool) -> Value {
    json!({"name": name, "reason": reason, "forceable": forceable})
}

impl Coordinator<'_> {
    pub(super) fn print_status(&self, existing: &Existing) -> Result<bool, String> {
        let mut report = self.status_report("container", "absent");
        println!("deployment_root={}", self.root.display());
        println!("candidate_image={}", self.image);
        println!("listener=127.0.0.1:{}", self.port);
        println!(
            "credential_ownership=shared-data durable-per-credential-locks single-refresh-writer"
        );
        println!("{}", self.claude.status_line(self.root));
        self.print_provider_exhaustion();
        match data_backup::checkpoint_status(self.root) {
            Ok(line) => println!("{line}"),
            Err(reason) => println!(
                "blocker=data-checkpoint forceable=false reason={}",
                serde_json::to_string(&reason).unwrap_or_default()
            ),
        }
        match existing {
            Existing::Absent => {
                println!("old_backend=absent");
                println!("candidate_backend=not-started image={}", self.image);
                println!("connections=0");
                println!("run_inventory live=0 stale=0 blockers=0");
                println!("force_update_interrupts=false");
                report["converged"] = false.into();
                report["connections"] = 0.into();
                report["runs"] = serde_json::json!([]);
                crate::operation_output::record(report);
                Ok(false)
            }
            Existing::Legacy => {
                println!("old_backend={LEGACY} topology=legacy-direct");
                println!("candidate_backend=not-started image={}", self.image);
                println!("connections=unknown");
                let inventory = self.inventory(LEGACY);
                let inventory_known = inventory.is_ok();
                if let Ok(inventory) = &inventory {
                    inventory.print();
                } else if let Err(error) = &inventory {
                    println!("run_inventory=unknown blockers=unknown reason={error}");
                }
                println!("blocker=legacy-direct-front-door has unknown established connections");
                self.print_secret(LEGACY);
                if let Ok(inventory) = inventory {
                    report["runs"] = serde_json::json!(inventory.runs);
                    for run in &inventory.runs {
                        println!(
                            "force_impact run_id={} label={} state={}",
                            run.id,
                            serde_json::to_string(&run.label).unwrap_or_else(|_| "null".into()),
                            run.state.as_str()
                        );
                    }
                }
                println!("force_update_interrupts=true");
                let running = self.docker.running(LEGACY)?;
                report["status"] = "legacy".into();
                report["backend"] =
                    serde_json::json!({"name": LEGACY, "image": null, "running": running});
                report["blockers"] = serde_json::json!([blocker(
                    "legacy-direct-front-door",
                    "established connections are unknown",
                    false
                )]);
                report["force_update_interrupts"] = true.into();
                crate::operation_output::record(report);
                Ok(running && inventory_known)
            }
            Existing::Managed(active) => {
                let backend_running = self.docker.running(&active.backend)?;
                let relay_running = self.docker.running(&RELAY.value()).unwrap_or(false);
                println!("old_backend={} image={}", active.backend, active.image_ref);
                println!(
                    "old_backend_claude_credentials={}",
                    self.claude_label(&active.backend)
                );
                println!("candidate_backend=not-started image={}", self.image);
                let connections = self.connection_count(&active.backend)?;
                println!("connections={connections}");
                println!("backend_running={backend_running}");
                println!("relay={RELAY} running={relay_running} port={}", active.port);
                let inventory = self.inventory(&active.backend);
                let force_interrupts = match &inventory {
                    Ok(inventory) => {
                        inventory.print();
                        for blocker in inventory.blockers() {
                            println!(
                                "blocker=legacy-unpinned run_id={} label={}",
                                blocker.id,
                                serde_json::to_string(&blocker.label)
                                    .unwrap_or_else(|_| "null".into())
                            );
                        }
                        inventory.blockers().next().is_some() || active.port != self.port
                    }
                    Err(error) => {
                        println!("run_inventory=unknown blockers=unknown reason={error}");
                        true
                    }
                };
                if active.port != self.port {
                    println!(
                        "blocker=stable-listener-change old_port={} candidate_port={}",
                        active.port, self.port
                    );
                }
                let force_interrupts = self.print_secret(&active.backend) || force_interrupts;
                println!("force_update_interrupts={force_interrupts}");
                // Mixed images are never reported as converged (issue #627).
                let versions_match = self.print_versions(active)?;
                let converged = backend_running && relay_running && versions_match;
                println!("converged={converged}");
                report["status"] = "managed".into();
                report["backend"] = serde_json::json!({"name": active.backend, "image": active.image_ref, "running": backend_running});
                report["relay"] = serde_json::json!({"name": RELAY.value(), "port": active.port, "running": relay_running});
                report["connections"] = connections.into();
                report["converged"] = converged.into();
                report["force_update_interrupts"] = force_interrupts.into();
                report["runs"] = inventory
                    .as_ref()
                    .ok()
                    .map_or(serde_json::Value::Null, |inventory| {
                        serde_json::json!(inventory.runs)
                    });
                let mut blockers = Vec::new();
                match &inventory {
                    Ok(inventory) => {
                        for run in inventory.blockers() {
                            blockers.push(blocker(
                                "legacy-unpinned",
                                &format!("run {} has no lease", run.id),
                                true,
                            ));
                        }
                    }
                    Err(error) => blockers.push(blocker("run-inventory-unknown", error, false)),
                }
                if active.port != self.port {
                    blockers.push(blocker(
                        "stable-listener-change",
                        "the candidate listener changes the active port",
                        true,
                    ));
                }
                if !versions_match {
                    blockers.push(blocker(
                        "version-mismatch",
                        "serving components have different versions",
                        false,
                    ));
                }
                report["blockers"] = serde_json::json!(blockers);
                crate::operation_output::record(report);
                Ok(converged && inventory.is_ok())
            }
        }
    }

    pub(super) fn print_interrupted(&self, transaction: &Transaction) -> Result<(), String> {
        let mut report = self.status_report("container", "interrupted");
        report["transaction"] = serde_json::json!(transaction);
        report["blockers"] = serde_json::json!([blocker(
            "pending-transaction",
            "an interrupted update requires recovery",
            false
        )]);
        crate::operation_output::record(report);
        println!("deployment_root={}", self.root.display());
        println!("transaction_phase={:?}", transaction.phase);
        println!(
            "old_backend={}",
            transaction.previous.as_deref().unwrap_or("absent")
        );
        println!("candidate_backend={}", transaction.candidate);
        println!("candidate_image={}", transaction.image_ref);
        println!(
            "relay_pointer={}",
            self.state.current()?.as_deref().unwrap_or("absent")
        );
        if transaction.previous_kind == PreviousKind::Managed
            && let Some(previous) = transaction.previous.as_deref()
        {
            println!("old_connections={}", self.connection_count(previous)?);
        } else if transaction.previous_kind == PreviousKind::Legacy {
            println!("old_connections=unknown");
        }
        println!(
            "candidate_connections={}",
            self.connection_count(&transaction.candidate)?
        );
        let inventory_backend = self
            .state
            .current()?
            .or_else(|| transaction.previous.clone())
            .unwrap_or_else(|| transaction.candidate.clone());
        match self.inventory(&inventory_backend) {
            Ok(inventory) => inventory.print(),
            Err(error) => println!("run_inventory=unknown blockers=unknown reason={error}"),
        }
        println!(
            "credential_ownership=shared-data durable-per-credential-locks single-refresh-writer"
        );
        println!("recovery_required=true status_is_read_only=true");
        Ok(())
    }
}
