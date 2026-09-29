//! Moving the stable listener between the containers and the host Router.

use std::path::Path;
use std::process::ExitCode;
#[cfg(not(test))]
use std::thread;
#[cfg(not(test))]
use std::time::Duration;

use link_assistant_router::cli::DeployArgs;

use super::super::host_runtime::{HostRuntime, Launch};
use super::super::secret::{SecretMatch, fingerprint, probe_accepted};
use super::super::state::Host;
use super::super::{Coordinator, RELAY, result_code};
use super::{Plan, ROLLBACK_COMMAND};

#[cfg(not(test))]
const HOST_READY_ATTEMPTS: usize = 60;
#[cfg(test)]
const HOST_READY_ATTEMPTS: usize = 2;

impl Coordinator<'_> {
    pub(super) fn migrate_to_host(
        &self,
        plan: &Plan,
        runtime: &dyn HostRuntime,
    ) -> Result<(), String> {
        self.create_directories()?;
        let _lock = self.acquire_lock()?;
        let probe = plan.secret == SecretMatch::Matches;
        let serving = plan.from.is_some() || plan.record_serving;
        if serving {
            // Nothing changes until a host Router with this data and secret
            // has proven it accepts the deployment's tokens.
            let port = runtime.free_port()?;
            let log = self.state.directory().join("host-candidate.log");
            let pid = self.launch(runtime, &plan.executable, port, &log)?;
            let validated = self.validate_host(runtime, plan, pid, port, probe);
            let stopped = runtime.terminate(pid);
            validated.map_err(|error| {
                format!(
                    "host candidate failed validation: {error}; nothing was changed and the current deployment keeps serving (log: {})",
                    log.display()
                )
            })?;
            stopped?;
            println!("host_candidate=validated listener=127.0.0.1:{port}");
        }
        if let Some(active) = &plan.from {
            let connections = self.connection_count(&active.backend)?;
            if connections > 0 && !self.force {
                return Err(format!(
                    "{connections} connection(s) opened during validation; nothing was changed, rerun when idle"
                ));
            }
            self.docker.stop(RELAY)?;
            println!("relay={RELAY} stopped=true retained=true");
            if let Err(error) = self.start_host(plan, runtime, Some(&active.backend), probe) {
                let restored = self.docker.start(RELAY).and_then(|()| {
                    self.wait_healthy(&active.backend, &format!("http://{RELAY}:8080"))
                });
                return Err(match restored {
                    Ok(()) => format!(
                        "{error}; {RELAY} was restarted and the container deployment keeps serving"
                    ),
                    Err(restore) => format!(
                        "{error}; restarting {RELAY} also failed: {restore}. Run `{ROLLBACK_COMMAND}`"
                    ),
                });
            }
            match self.docker.stop(&active.backend) {
                Ok(()) => println!(
                    "container_backend={} stopped=true retained-for-rollback=true",
                    active.backend
                ),
                Err(error) => eprintln!(
                    "warning: {} keeps running without traffic: {error}",
                    active.backend
                ),
            }
        } else {
            let previous = plan
                .record
                .as_ref()
                .and_then(|record| record.previous_backend.clone());
            if let Some(record) = plan.record.as_ref().filter(|_| plan.record_serving) {
                runtime.terminate(record.pid)?;
            }
            self.start_host(plan, runtime, previous.as_deref(), probe)?;
        }
        println!(
            "host deployment ready on 127.0.0.1:{}; restore the containers with `{ROLLBACK_COMMAND}`",
            self.port
        );
        Ok(())
    }

    fn launch(
        &self,
        runtime: &dyn HostRuntime,
        executable: &Path,
        port: u16,
        log: &Path,
    ) -> Result<u32, String> {
        runtime.spawn(&Launch {
            executable,
            port,
            data_dir: &self.root.join("data"),
            token_secret: self.token_secret,
            log,
        })
    }

    /// Start the host Router on the stable port and record it before it is
    /// validated, so an interrupted run still knows which process to stop.
    fn start_host(
        &self,
        plan: &Plan,
        runtime: &dyn HostRuntime,
        previous_backend: Option<&str>,
        probe: bool,
    ) -> Result<(), String> {
        let log = self.state.directory().join("host.log");
        let pid = self.launch(runtime, &plan.executable, self.port, &log)?;
        self.state.write_host(&Host {
            version: 1,
            pid,
            port: self.port,
            executable: plan.executable.display().to_string(),
            router_version: link_assistant_router::VERSION.to_string(),
            token_secret: fingerprint(self.token_secret),
            previous_backend: previous_backend.map(str::to_string),
            started_at: chrono::Utc::now().timestamp(),
        })?;
        if let Err(error) = self.validate_host(runtime, plan, pid, self.port, probe) {
            let _ = runtime.terminate(pid);
            self.state.clear_host()?;
            return Err(format!(
                "host Router failed validation on 127.0.0.1:{}: {error} (log: {})",
                self.port,
                log.display()
            ));
        }
        println!("host_process=pid:{pid} listener=127.0.0.1:{}", self.port);
        Ok(())
    }

    fn validate_host(
        &self,
        runtime: &dyn HostRuntime,
        plan: &Plan,
        pid: u32,
        port: u16,
        probe: bool,
    ) -> Result<(), String> {
        let mut healthy = false;
        for _ in 0..HOST_READY_ATTEMPTS {
            if !runtime.serving(pid, &plan.executable) {
                return Err(format!("host Router process {pid} exited"));
            }
            if runtime.status(port, "/api/health", None) == Some(200) {
                healthy = true;
                break;
            }
            #[cfg(not(test))]
            thread::sleep(Duration::from_secs(1));
        }
        if !healthy {
            return Err("host Router did not become healthy".to_string());
        }
        if !probe {
            println!("token_probe=skipped reason=forced TOKEN_SECRET rotation");
            return Ok(());
        }
        let token = self.probe_token()?;
        let status = runtime
            .status(port, "/api/models", Some(&token))
            .ok_or_else(|| "token probe got no HTTP answer".to_string())?;
        if !probe_accepted(status) {
            return Err(format!(
                "it rejected a token signed with the deployment's secret (HTTP {status}); issued client tokens would stop working"
            ));
        }
        println!("token_probe=accepted status={status}");
        Ok(())
    }

    /// `--down` with a host deployment: stop the host Router, then let the
    /// container teardown continue when a container runtime exists.
    pub(super) fn host_down(
        &self,
        record: &Host,
        yes: bool,
        runtime: &dyn HostRuntime,
    ) -> Option<ExitCode> {
        if !yes {
            eprintln!("error: deploy --down stops the serving host Router; rerun with --yes");
            return Some(ExitCode::from(2));
        }
        let stopped = (|| {
            let _lock = self.acquire_lock()?;
            if runtime.serving(record.pid, Path::new(&record.executable)) {
                runtime.terminate(record.pid)?;
            }
            self.state.clear_host()?;
            println!("host_process=pid:{} stopped=true", record.pid);
            Ok(())
        })();
        if stopped.is_err() || self.docker.available().is_err() {
            return Some(result_code(stopped));
        }
        None
    }

    /// `--mode container` with a host deployment: restore the containers,
    /// then continue with the container coordinator.
    pub(super) fn leave_host(
        &self,
        args: &DeployArgs,
        record: &Host,
        runtime: &dyn HostRuntime,
    ) -> Option<ExitCode> {
        let serving = runtime.serving(record.pid, Path::new(&record.executable));
        if args.status {
            println!("mode=host requested=container");
            println!(
                "host_process=pid:{} port={} serving={serving}",
                record.pid, record.port
            );
            if let Some(backend) = &record.previous_backend {
                println!("plan step=1 action=start-backend container={backend}");
                println!("plan step=2 action=stop-host pid={}", record.pid);
                println!("plan step=3 action=start-relay container={RELAY}");
                println!("on_failure=restart the host Router; it keeps serving");
            } else {
                println!("plan step=1 action=stop-host pid={}", record.pid);
                println!("plan step=2 action=deploy-containers");
            }
            println!("status_is_read_only=true");
            return Some(ExitCode::SUCCESS);
        }
        if let Err(error) = self.docker.available() {
            eprintln!("error: container runtime unavailable: {error}");
            return Some(ExitCode::from(1));
        }
        match self.restore_containers(record, runtime, serving) {
            Ok(()) => None,
            Err(error) => Some(result_code(Err(error))),
        }
    }

    fn restore_containers(
        &self,
        record: &Host,
        runtime: &dyn HostRuntime,
        serving: bool,
    ) -> Result<(), String> {
        let _lock = self.acquire_lock()?;
        let Some(backend) = &record.previous_backend else {
            if serving {
                runtime.terminate(record.pid)?;
            }
            return self.state.clear_host();
        };
        self.docker.start(backend)?;
        self.wait_healthy(backend, "http://127.0.0.1:8080")?;
        if serving {
            runtime.terminate(record.pid)?;
        }
        let relayed = self
            .docker
            .start(RELAY)
            .and_then(|()| self.wait_healthy(backend, &format!("http://{RELAY}:8080")));
        if let Err(error) = relayed {
            let _ = self.docker.stop(RELAY);
            if serving {
                self.respawn(record, runtime)?;
            }
            return Err(format!(
                "{RELAY} did not become healthy: {error}; the host Router keeps serving"
            ));
        }
        self.state.clear_host()?;
        println!("host_process=pid:{} stopped=true", record.pid);
        println!("container deployment restored: {RELAY} -> {backend}");
        Ok(())
    }

    fn respawn(&self, record: &Host, runtime: &dyn HostRuntime) -> Result<(), String> {
        let log = self.state.directory().join("host.log");
        let pid = self.launch(runtime, Path::new(&record.executable), record.port, &log)?;
        self.state.write_host(&Host {
            pid,
            started_at: chrono::Utc::now().timestamp(),
            ..record.clone()
        })
    }
}
