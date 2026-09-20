//! Connection-preserving local deployment coordinator (issue #598).

use std::fs::OpenOptions;
use std::path::Path;
use std::process::ExitCode;
use std::thread;
use std::time::Duration;

use link_assistant_router::cli::DeployArgs;

mod docker;
mod inventory;
mod state;
#[cfg(test)]
#[path = "deploy_local_tests.rs"]
mod tests;

use docker::Docker;
use inventory::Inventory;
use state::{Active, Phase, PreviousKind, Recovery, State, Transaction};

pub const RELAY: &str = link_assistant_router::deploy::RELAY;
pub const NETWORK: &str = link_assistant_router::deploy::NETWORK;
pub const LABEL_KEY: &str = link_assistant_router::deploy::LABEL_KEY;
const LEGACY: &str = link_assistant_router::deploy::CONTAINER;
pub const SPEC_VERSION: &str = "local-v1";
#[cfg(not(test))]
const READY_ATTEMPTS: usize = 300;
#[cfg(test)]
const READY_ATTEMPTS: usize = 2;

#[derive(Debug)]
enum Existing {
    Absent,
    Legacy,
    Managed(Active),
}

struct Coordinator<'a> {
    docker: Docker,
    state: State,
    root: &'a Path,
    image: &'a str,
    build: Option<&'a str>,
    port: u16,
    token_secret: &'a str,
    force: bool,
}

impl Coordinator<'_> {
    fn existing(&self) -> Result<Existing, String> {
        if let Some(active) = self.state.active()? {
            if self.state.current()?.as_deref() != Some(&active.backend) {
                return Err("active deployment disagrees with the relay pointer".to_string());
            }
            if !self.docker.owned(&active.backend, self.root, "backend") {
                return Err(format!(
                    "active backend {} is absent or not owned by this root",
                    active.backend
                ));
            }
            if self.docker.image_ref(&active.backend)? != active.image_ref
                || self.docker.container_image_id(&active.backend)? != active.image_id
                || self
                    .docker
                    .label(&active.backend, &format!("{LABEL_KEY}.spec"))
                    .as_deref()
                    != Some(SPEC_VERSION)
            {
                return Err(format!(
                    "backend {} launch specification differs from its active record",
                    active.backend
                ));
            }
            let expected_port = active.port.to_string();
            if self.docker.exists(RELAY)
                && (!self.docker.owned(RELAY, self.root, "relay")
                    || self
                        .docker
                        .label(RELAY, &format!("{LABEL_KEY}.spec"))
                        .as_deref()
                        != Some(SPEC_VERSION)
                    || self
                        .docker
                        .label(RELAY, &format!("{LABEL_KEY}.port"))
                        .as_deref()
                        != Some(expected_port.as_str()))
            {
                return Err("relay launch specification differs from its active record".to_string());
            }
            return Ok(Existing::Managed(active));
        }
        if self.docker.exists(RELAY) {
            return Err(format!(
                "{RELAY} exists without a durable active deployment record"
            ));
        }
        if self.docker.exists(LEGACY) {
            if self.docker.legacy_owned(LEGACY, self.root) {
                return Ok(Existing::Legacy);
            }
            return Err(format!("refusing unowned container {LEGACY}"));
        }
        Ok(Existing::Absent)
    }

    fn inventory(&self, backend: &str) -> Result<Inventory, String> {
        let rendered = self.docker.token_inventory(backend).map_err(|error| {
            format!("could not inventory run credentials in {backend}: {error}")
        })?;
        Inventory::from_json(&rendered, chrono::Utc::now().timestamp())
    }

    fn connection_count(&self, backend: &str) -> Result<u64, String> {
        let value = self.docker.relay_connection_count(backend)?;
        value
            .trim()
            .parse()
            .map_err(|error| format!("relay connection count for {backend} is invalid: {error}"))
    }

    fn print_status(&self, existing: &Existing) -> Result<bool, String> {
        println!("deployment_root={}", self.root.display());
        println!("candidate_image={}", self.image);
        println!(
            "credential_ownership=shared-data durable-per-credential-locks single-refresh-writer"
        );
        match existing {
            Existing::Absent => {
                println!("old_backend=absent");
                println!("candidate_backend=not-started image={}", self.image);
                println!("connections=0");
                println!("run_inventory live=0 stale=0 blockers=0");
                println!("force_update_interrupts=false");
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
                if let Ok(inventory) = inventory {
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
                Ok(self.docker.running(LEGACY)? && inventory_known)
            }
            Existing::Managed(active) => {
                let backend_running = self.docker.running(&active.backend)?;
                let relay_running = self.docker.running(RELAY).unwrap_or(false);
                println!("old_backend={} image={}", active.backend, active.image_ref);
                println!("candidate_backend=not-started image={}", self.image);
                println!("connections={}", self.connection_count(&active.backend)?);
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
                println!("force_update_interrupts={force_interrupts}");
                Ok(backend_running && relay_running && inventory.is_ok())
            }
        }
    }

    fn print_interrupted(&self, transaction: &Transaction) -> Result<(), String> {
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

    fn preflight(&self, existing: &Existing) -> Result<Option<Inventory>, String> {
        let allowed_holder = match existing {
            Existing::Legacy => Some(LEGACY),
            Existing::Managed(active) if active.port == self.port => Some(RELAY),
            Existing::Absent | Existing::Managed(_) => None,
        };
        let foreign = self
            .docker
            .listeners_on(self.port)?
            .into_iter()
            .filter(|name| Some(name.as_str()) != allowed_holder)
            .collect::<Vec<_>>();
        if !foreign.is_empty() {
            return Err(format!(
                "port {} is already published by {}",
                self.port,
                foreign.join(", ")
            ));
        }
        match existing {
            Existing::Absent => {
                self.print_status(existing)?;
                Ok(None)
            }
            Existing::Legacy => {
                let inventory = self.inventory(LEGACY)?;
                self.print_status(existing)?;
                if !self.force {
                    return Err(
                        "legacy local deployment cannot prove established connections are idle; rerun with --force-update after reviewing force_impact"
                            .to_string(),
                    );
                }
                println!("force_update accepted impact=legacy-direct-front-door");
                Ok(Some(inventory))
            }
            Existing::Managed(active) => {
                let inventory = self.inventory(&active.backend)?;
                self.print_status(existing)?;
                let blockers = inventory.blockers().collect::<Vec<_>>();
                if active.port != self.port && !self.force {
                    return Err(
                        "changing the stable listener can interrupt clients; rerun with --force-update after reviewing the status report"
                            .to_string(),
                    );
                }
                if !blockers.is_empty() && !self.force {
                    return Err(
                        "legacy-unpinned run credentials cannot be presented as exact-model protected; let them expire or rerun with --force-update"
                            .to_string(),
                    );
                }
                if self.force {
                    for blocker in blockers {
                        println!(
                            "force_update accepted run_id={} label={} state=legacy-unpinned",
                            blocker.id,
                            serde_json::to_string(&blocker.label).unwrap_or_else(|_| "null".into())
                        );
                    }
                    if active.port != self.port {
                        println!(
                            "force_update accepted stable_listener={}->{} connections={}",
                            active.port,
                            self.port,
                            self.connection_count(&active.backend)?
                        );
                    }
                }
                Ok(Some(inventory))
            }
        }
    }

    fn create_directories(&self) -> Result<(), String> {
        for path in [
            self.root.join("credentials"),
            self.root.join("data"),
            self.root.join("state"),
        ] {
            std::fs::create_dir_all(&path)
                .map_err(|error| format!("could not create {}: {error}", path.display()))?;
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt as _;
                let _ = std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o700));
            }
        }
        Ok(())
    }

    fn acquire_lock(&self) -> Result<std::fs::File, String> {
        let path = self.state.directory().join("update.lock");
        let file = OpenOptions::new()
            .create(true)
            .read(true)
            .write(true)
            .truncate(false)
            .open(&path)
            .map_err(|error| {
                format!("could not open deployment lock {}: {error}", path.display())
            })?;
        file.lock()
            .map_err(|error| format!("could not acquire deployment lock: {error}"))?;
        Ok(file)
    }

    fn wait_healthy(&self, container: &str, origin: &str) -> Result<(), String> {
        for _ in 0..READY_ATTEMPTS {
            if self.docker.health(container, origin) {
                return Ok(());
            }
            #[cfg(not(test))]
            thread::sleep(Duration::from_secs(1));
        }
        Err(format!("{container} did not become healthy"))
    }

    fn ensure_deploy_token(&self, backend: &str) {
        let present = self
            .docker
            .token_inventory(backend)
            .ok()
            .and_then(|rendered| serde_json::from_str::<Vec<serde_json::Value>>(&rendered).ok())
            .is_some_and(|records| {
                records.iter().any(|record| {
                    record.get("label").and_then(serde_json::Value::as_str) == Some("deploy")
                        && !record
                            .get("revoked")
                            .and_then(serde_json::Value::as_bool)
                            .unwrap_or(false)
                })
            });
        if !present {
            match self
                .docker
                .exec(backend, &["router", "tokens", "issue", "--label", "deploy"])
            {
                Ok(_) => println!("issued deploy client token (value withheld)"),
                Err(error) => println!("deploy client token skipped: {error}"),
            }
        }
    }

    fn drain(&self, backend: &str) -> Result<(), String> {
        let mut last = u64::MAX;
        let mut zero_observations = 0_u8;
        loop {
            let count = self.connection_count(backend)?;
            if count != last {
                println!("draining backend={backend} connections={count}");
                last = count;
            }
            if count == 0 {
                zero_observations = zero_observations.saturating_add(1);
                if zero_observations == 2 {
                    return Ok(());
                }
            } else {
                zero_observations = 0;
            }
            thread::sleep(Duration::from_secs(1));
        }
    }

    fn remove_backend(&self, backend: &str) -> Result<(), String> {
        if !self.docker.exists(backend) {
            return Ok(());
        }
        if !self.docker.owned(backend, self.root, "backend") {
            return Err(format!("refusing to remove unowned backend {backend}"));
        }
        self.docker.remove(backend)
    }

    fn remove_relay(&self) -> Result<(), String> {
        if !self.docker.exists(RELAY) {
            return Ok(());
        }
        if !self.docker.owned(RELAY, self.root, "relay") {
            return Err(format!("refusing to remove unowned relay {RELAY}"));
        }
        self.docker.remove(RELAY)
    }

    fn finish_accepted(&self, transaction: &Transaction) -> Result<(), String> {
        if !self
            .docker
            .owned(&transaction.candidate, self.root, "backend")
        {
            return Err("accepted candidate is absent or not owned by this deployment".to_string());
        }
        if let Some(previous) = transaction.previous.as_deref() {
            if transaction.previous_kind == PreviousKind::Managed {
                self.drain(previous)?;
                self.remove_backend(previous)?;
            } else if transaction.previous_kind == PreviousKind::Legacy {
                if previous != LEGACY || !self.docker.legacy_owned(previous, self.root) {
                    return Err("refusing to remove an unowned legacy deployment".to_string());
                }
                self.docker.remove(previous)?;
            }
        }
        let active = Active {
            version: 1,
            backend: transaction.candidate.clone(),
            image_ref: transaction.image_ref.clone(),
            image_id: transaction.image_id.clone(),
            port: transaction.port,
        };
        self.state.write_active(&active)?;
        let mut complete = transaction.clone();
        complete.phase = Phase::Complete;
        self.state.write_transaction(&complete)
    }

    fn rollback(&self, transaction: &Transaction) -> Result<(), String> {
        match transaction.previous_kind {
            PreviousKind::Managed => {
                let previous = transaction
                    .previous
                    .as_deref()
                    .ok_or("managed rollback has no previous backend")?;
                if !self.docker.owned(previous, self.root, "backend") {
                    return Err(format!("cannot restore unowned backend {previous}"));
                }
                self.state.set_current(previous)?;
                if transaction.previous_port != Some(transaction.port) {
                    self.remove_relay()?;
                    self.docker.run_relay(
                        &self.docker.image_ref(previous)?,
                        self.root,
                        transaction.previous_port.unwrap_or(transaction.port),
                    )?;
                }
                self.drain(&transaction.candidate)?;
            }
            PreviousKind::Legacy => {
                let previous = transaction
                    .previous
                    .as_deref()
                    .filter(|previous| *previous == LEGACY)
                    .ok_or("legacy rollback has no valid legacy backend")?;
                if self.docker.exists(previous) && !self.docker.legacy_owned(previous, self.root) {
                    return Err("cannot restore an unowned legacy deployment".to_string());
                }
                self.remove_relay()?;
                self.state.clear_current()?;
                if self.docker.exists(previous) && !self.docker.running(previous)? {
                    self.docker.start(previous)?;
                }
            }
            PreviousKind::None => {
                self.remove_relay()?;
                self.state.clear_current()?;
            }
        }
        self.remove_backend(&transaction.candidate)?;
        let mut complete = transaction.clone();
        complete.phase = Phase::Complete;
        self.state.write_transaction(&complete)
    }

    fn recover(&self) -> Result<(), String> {
        match self.state.recovery()? {
            Recovery::None => Ok(()),
            Recovery::RollBack(transaction) => {
                println!("recovering interrupted pre-acceptance candidate");
                self.rollback(&transaction)
            }
            Recovery::FinishAccepted(transaction) => {
                println!("finishing interrupted accepted cutover");
                self.finish_accepted(&transaction)
            }
        }
    }

    fn no_op(&self, active: &Active) -> Result<bool, String> {
        if self.build.is_some()
            || active.image_ref != self.image
            || active.port != self.port
            || self.state.current()?.as_deref() != Some(&active.backend)
            || !self.docker.owned(&active.backend, self.root, "backend")
        {
            return Ok(false);
        }
        Ok(true)
    }

    fn restore_topology(&self, active: &Active) -> Result<bool, String> {
        let mut changed = if self.docker.running(&active.backend)? {
            false
        } else {
            self.docker.start(&active.backend)?;
            println!("restored backend={}", active.backend);
            true
        };
        if !self.docker.exists(RELAY) {
            self.docker
                .run_relay(&active.image_ref, self.root, active.port)?;
            println!("restored relay={RELAY}");
            changed = true;
        } else if !self.docker.owned(RELAY, self.root, "relay") {
            return Err(format!("refusing unowned relay {RELAY}"));
        } else if !self.docker.running(RELAY)? {
            self.docker.start(RELAY)?;
            println!("restored relay={RELAY}");
            changed = true;
        }
        self.wait_healthy(&active.backend, &format!("http://{RELAY}:8080"))?;
        Ok(changed)
    }

    fn topology_needs_repair(&self, active: &Active) -> Result<bool, String> {
        Ok(!self.docker.running(&active.backend)?
            || !self.docker.exists(RELAY)
            || !self.docker.running(RELAY)?)
    }

    fn deploy(&self, existing: &Existing) -> Result<(), String> {
        let image_id = self.docker.ensure_image(self.image, self.build)?;
        self.docker.create_network(self.root)?;
        let candidate = format!(
            "{}{}",
            link_assistant_router::deploy::BACKEND_PREFIX,
            uuid::Uuid::new_v4().simple()
        );
        let (previous, previous_kind, previous_port) = match &existing {
            Existing::Absent => (None, PreviousKind::None, None),
            Existing::Legacy => (
                Some(LEGACY.to_string()),
                PreviousKind::Legacy,
                Some(self.port),
            ),
            Existing::Managed(active) => (
                Some(active.backend.clone()),
                PreviousKind::Managed,
                Some(active.port),
            ),
        };
        let mut transaction = Transaction {
            version: 1,
            phase: Phase::Prepared,
            previous,
            previous_kind,
            previous_port,
            candidate: candidate.clone(),
            image_ref: self.image.to_string(),
            image_id,
            port: self.port,
        };
        self.state.write_transaction(&transaction)?;
        if let Err(error) =
            self.docker
                .run_backend(&candidate, self.image, self.root, self.token_secret)
        {
            self.rollback(&transaction)?;
            return Err(format!("could not start candidate: {error}"));
        }
        if let Err(error) = self.wait_healthy(&candidate, "http://127.0.0.1:8080") {
            self.rollback(&transaction)?;
            return Err(error);
        }
        self.ensure_deploy_token(&candidate);
        println!("candidate_backend={candidate} verified=true");

        match &existing {
            Existing::Absent => {
                self.state.set_current(&candidate)?;
                if let Err(error) = self
                    .docker
                    .run_relay(self.image, self.root, self.port)
                    .and_then(|()| self.wait_healthy(&candidate, &format!("http://{RELAY}:8080")))
                {
                    self.rollback(&transaction)?;
                    return Err(format!("first cutover failed and was rolled back: {error}"));
                }
            }
            Existing::Legacy => {
                self.docker.stop(LEGACY)?;
                self.state.set_current(&candidate)?;
                if let Err(error) = self
                    .docker
                    .run_relay(self.image, self.root, self.port)
                    .and_then(|()| self.wait_healthy(&candidate, &format!("http://{RELAY}:8080")))
                {
                    self.rollback(&transaction)?;
                    return Err(format!(
                        "legacy migration failed and was rolled back: {error}"
                    ));
                }
            }
            Existing::Managed(active) => {
                self.state.set_current(&candidate)?;
                if active.port != self.port {
                    self.remove_relay()?;
                    if let Err(error) = self.docker.run_relay(self.image, self.root, self.port) {
                        self.rollback(&transaction)?;
                        return Err(format!(
                            "listener update failed and was rolled back: {error}"
                        ));
                    }
                }
                if let Err(error) = self.wait_healthy(&candidate, &format!("http://{RELAY}:8080")) {
                    self.rollback(&transaction)?;
                    return Err(format!(
                        "post-cutover verification failed and rolled back: {error}"
                    ));
                }
            }
        }

        transaction.phase = Phase::Accepted;
        self.state.write_transaction(&transaction)?;
        self.finish_accepted(&transaction)?;
        println!(
            "deployment is ready: relay={RELAY} backend={candidate} port={}",
            self.port
        );
        println!(
            "next: `router with claude --server http://127.0.0.1:{}`",
            self.port
        );
        Ok(())
    }

    fn down(&self) -> Result<(), String> {
        if !self.root.exists()
            && self.docker.owned_containers(self.root)?.is_empty()
            && !(self.docker.exists(LEGACY) && self.docker.legacy_owned(LEGACY, self.root))
        {
            println!("deployment is already absent");
            return Ok(());
        }
        self.create_directories()?;
        let _lock = self.acquire_lock()?;
        for container in self.docker.owned_containers(self.root)? {
            if self.docker.owned(&container, self.root, "backend")
                || self.docker.owned(&container, self.root, "relay")
            {
                self.docker.remove(&container)?;
                println!("removed {container}");
            }
        }
        if self.docker.exists(LEGACY) && self.docker.legacy_owned(LEGACY, self.root) {
            self.docker.remove(LEGACY)?;
            println!("removed {LEGACY}");
        }
        self.docker.remove_network(self.root)?;
        self.state.clear_deployment_records()?;
        println!(
            "deployment is down; retained credentials and data at {}",
            self.root.display()
        );
        Ok(())
    }
}

pub fn run(args: &DeployArgs, root: &Path, image: &str, token_secret: &str) -> ExitCode {
    run_with_docker(args, root, image, token_secret, Docker::default())
}

fn run_with_docker(
    args: &DeployArgs,
    root: &Path,
    image: &str,
    token_secret: &str,
    docker: Docker,
) -> ExitCode {
    let coordinator = Coordinator {
        docker,
        state: State::new(root),
        root,
        image,
        build: args.build.as_deref(),
        port: args.port,
        token_secret,
        force: args.force_update,
    };
    if let Err(error) = coordinator.docker.available() {
        eprintln!("error: container runtime unavailable: {error}");
        return ExitCode::from(1);
    }
    if args.down {
        if !args.yes {
            eprintln!("error: deploy --down removes serving containers; rerun with --yes");
            return ExitCode::from(2);
        }
        return result_code(coordinator.down());
    }
    if let Err(error) = link_assistant_router::deploy::immutable_ref(image) {
        eprintln!("error: image-ref: {error}");
        return ExitCode::from(2);
    }
    let transaction = match coordinator.state.transaction() {
        Ok(transaction) => transaction,
        Err(error) => return result_code(Err(error)),
    };
    let interrupted = transaction
        .as_ref()
        .filter(|transaction| transaction.phase != Phase::Complete);
    if args.status
        && let Some(transaction) = interrupted
    {
        return match coordinator.print_interrupted(transaction) {
            Ok(()) => ExitCode::from(1),
            Err(error) => result_code(Err(error)),
        };
    }
    if interrupted.is_some() && !args.status {
        if let Err(error) = coordinator.create_directories() {
            return result_code(Err(error));
        }
        let _recovery_lock = match coordinator.acquire_lock() {
            Ok(lock) => lock,
            Err(error) => return result_code(Err(error)),
        };
        if let Err(error) = coordinator.recover() {
            return result_code(Err(error));
        }
    }
    let existing = match coordinator.existing() {
        Ok(existing) => existing,
        Err(error) => return result_code(Err(error)),
    };
    if args.status {
        return match coordinator.print_status(&existing) {
            Ok(true) => ExitCode::SUCCESS,
            Ok(false) => ExitCode::from(1),
            Err(error) => result_code(Err(error)),
        };
    }
    if !matches!(&existing, Existing::Managed(_))
        && let Err(error) = coordinator.preflight(&existing)
    {
        eprintln!("update refused before deployment mutation: {error}");
        return ExitCode::from(2);
    }
    if let Err(error) = coordinator.create_directories() {
        return result_code(Err(error));
    }
    let _lock = match coordinator.acquire_lock() {
        Ok(lock) => lock,
        Err(error) => return result_code(Err(error)),
    };
    if let Err(error) = coordinator.recover() {
        return result_code(Err(error));
    }
    let existing = match coordinator.existing() {
        Ok(existing) => existing,
        Err(error) => return result_code(Err(error)),
    };
    let mut preflight_complete = false;
    if let Existing::Managed(active) = &existing {
        if let Err(error) = coordinator.print_status(&existing) {
            return result_code(Err(error));
        }
        // Even a repair starts serving processes. Refuse that mutation when
        // the old backend cannot provide the complete run inventory first.
        if let Err(error) = coordinator.inventory(&active.backend) {
            return result_code(Err(format!(
                "refusing topology mutation without a run inventory: {error}"
            )));
        }
        let specification_matches = match coordinator.no_op(active) {
            Ok(matches) => matches,
            Err(error) => return result_code(Err(error)),
        };
        let needs_repair = match coordinator.topology_needs_repair(active) {
            Ok(needs_repair) => needs_repair,
            Err(error) => return result_code(Err(error)),
        };
        // A healthy exact no-op does not interrupt anything and therefore does
        // not require force even if its inventory contains a legacy record.
        // Repair and replacement do mutate serving state, so classify and
        // refuse unsafe runs before either operation.
        if (!specification_matches || needs_repair)
            && let Err(error) = coordinator.preflight(&existing)
        {
            eprintln!("update refused before serving-state mutation: {error}");
            return ExitCode::from(2);
        }
        preflight_complete = true;
        let restored = match coordinator.restore_topology(active) {
            Ok(restored) => restored,
            Err(error) => return result_code(Err(error)),
        };
        if specification_matches {
            if restored {
                println!("deployment specification already matched; serving topology restored");
            } else {
                println!(
                    "deployment is already converged; no container, pointer, token, or credential changed"
                );
            }
            return ExitCode::SUCCESS;
        }
    }
    if !preflight_complete && let Err(error) = coordinator.preflight(&existing) {
        eprintln!("update refused before serving-state mutation: {error}");
        return ExitCode::from(2);
    }
    result_code(coordinator.deploy(&existing))
}

fn result_code(result: Result<(), String>) -> ExitCode {
    match result {
        Ok(()) => ExitCode::SUCCESS,
        Err(error) => {
            eprintln!("error: {error}");
            ExitCode::from(1)
        }
    }
}
