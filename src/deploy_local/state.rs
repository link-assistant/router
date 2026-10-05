//! Durable local cutover identity and hard-kill recovery decisions.

use std::path::{Path, PathBuf};

use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(super) enum PreviousKind {
    None,
    Managed,
    Legacy,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub(super) struct Active {
    pub version: u8,
    pub backend: String,
    pub image_ref: String,
    pub image_id: String,
    pub port: u16,
}

/// The Router process serving this root from the host (issue #626). Its
/// containers stay stopped, not removed, so returning is one command.
#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub(super) struct Host {
    pub version: u8,
    pub pid: u32,
    pub port: u16,
    pub executable: String,
    pub router_version: String,
    /// [`super::secret::fingerprint`] of the secret it was started with.
    pub token_secret: String,
    /// Runtime environment fingerprint (`--env`, issue #679), when any.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub runtime_env: Option<String>,
    /// The container backend it replaced, retained stopped for rollback.
    pub previous_backend: Option<String>,
    pub started_at: i64,
}

/// What the durable active record says, classified without failing, so a
/// read-only status can describe a damaged record instead of stopping at it
/// (issue #631).
#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) enum ActiveRecord {
    Absent,
    Valid(Active),
    /// Unparseable bytes or an unsafe backend name; safe to set aside.
    Corrupt(String),
    /// Unreadable, or written by a newer Router; never overwritten.
    Unsupported(String),
}

impl ActiveRecord {
    pub(super) fn describe(&self) -> String {
        match self {
            Self::Absent => "absent".to_string(),
            Self::Valid(active) => format!("present backend={}", active.backend),
            Self::Corrupt(reason) => format!("corrupt reason={reason:?}"),
            Self::Unsupported(reason) => format!("unsupported reason={reason:?}"),
        }
    }
}

#[derive(Clone, Copy, Debug, Deserialize, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(super) enum Phase {
    Prepared,
    Accepted,
    Complete,
}

#[derive(Clone, Debug, Deserialize, Eq, PartialEq, Serialize)]
pub(super) struct Transaction {
    pub version: u8,
    pub phase: Phase,
    pub previous: Option<String>,
    pub previous_kind: PreviousKind,
    pub previous_port: Option<u16>,
    pub candidate: String,
    pub image_ref: String,
    pub image_id: String,
    pub port: u16,
}

#[derive(Clone, Debug, Eq, PartialEq)]
pub(super) enum Recovery {
    None,
    RollBack(Transaction),
    FinishAccepted(Transaction),
}

pub(super) struct State {
    directory: PathBuf,
}

impl State {
    pub(super) fn new(root: &Path) -> Self {
        Self {
            directory: root.join("state"),
        }
    }

    pub(super) fn directory(&self) -> &Path {
        &self.directory
    }

    pub(super) fn current_path(&self) -> PathBuf {
        self.directory.join("current")
    }

    pub(super) fn current(&self) -> Result<Option<String>, String> {
        let path = self.current_path();
        match std::fs::read_to_string(&path) {
            Ok(value) => {
                let backend = value.trim();
                valid_backend(backend)?;
                Ok(Some(backend.to_string()))
            }
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(None),
            Err(error) => Err(format!("could not read {}: {error}", path.display())),
        }
    }

    pub(super) fn set_current(&self, backend: &str) -> Result<(), String> {
        valid_backend(backend)?;
        link_assistant_router::durable_file::atomic_write_owner_only(
            &self.current_path(),
            format!("{backend}\n").as_bytes(),
        )
        .map_err(|error| format!("could not publish the relay pointer: {error}"))
    }

    pub(super) fn clear_current(&self) -> Result<(), String> {
        remove_if_present(&self.current_path())
    }

    pub(super) fn active(&self) -> Result<Option<Active>, String> {
        let active: Option<Active> = read_json(&self.directory.join("active"))?;
        if let Some(active) = &active {
            if active.version != 1 {
                return Err(format!(
                    "unsupported local deployment state v{}",
                    active.version
                ));
            }
            valid_backend(&active.backend)?;
        }
        Ok(active)
    }

    pub(super) fn active_record(&self) -> ActiveRecord {
        let path = self.directory.join("active");
        let bytes = match std::fs::read(&path) {
            Ok(bytes) => bytes,
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => {
                return ActiveRecord::Absent;
            }
            Err(error) => return ActiveRecord::Unsupported(format!("unreadable: {error}")),
        };
        let active = match serde_json::from_slice::<Active>(&bytes) {
            Ok(active) => active,
            Err(error) => {
                // A newer record may add fields but keeps `version`; only a
                // record that says it is v1 (or says nothing) is ours to judge.
                let version = serde_json::from_slice::<serde_json::Value>(&bytes)
                    .ok()
                    .and_then(|value| value.get("version").and_then(serde_json::Value::as_u64));
                return match version {
                    Some(version) if version != 1 => ActiveRecord::Unsupported(format!(
                        "unsupported local deployment state v{version}"
                    )),
                    _ => ActiveRecord::Corrupt(format!("could not parse: {error}")),
                };
            }
        };
        if active.version != 1 {
            return ActiveRecord::Unsupported(format!(
                "unsupported local deployment state v{}",
                active.version
            ));
        }
        match valid_backend(&active.backend) {
            Ok(()) => ActiveRecord::Valid(active),
            Err(error) => ActiveRecord::Corrupt(error),
        }
    }

    /// Keep a damaged record for inspection instead of deleting it.
    pub(super) fn set_aside_active(&self) -> Result<PathBuf, String> {
        let path = self.directory.join("active");
        let aside = self.directory.join(format!(
            "active.corrupt-{}",
            chrono::Utc::now().format("%Y%m%dT%H%M%S%.fZ")
        ));
        std::fs::rename(&path, &aside)
            .map_err(|error| format!("could not set aside {}: {error}", path.display()))?;
        Ok(aside)
    }

    pub(super) fn write_active(&self, active: &Active) -> Result<(), String> {
        write_json(&self.directory.join("active"), active)
    }

    pub(super) fn host(&self) -> Result<Option<Host>, String> {
        let host: Option<Host> = read_json(&self.directory.join("host"))?;
        if let Some(host) = &host
            && host.version != 1
        {
            return Err(format!("unsupported host-mode record v{}", host.version));
        }
        Ok(host)
    }

    pub(super) fn write_host(&self, host: &Host) -> Result<(), String> {
        write_json(&self.directory.join("host"), host)
    }

    pub(super) fn clear_host(&self) -> Result<(), String> {
        remove_if_present(&self.directory.join("host"))
    }

    pub(super) fn transaction(&self) -> Result<Option<Transaction>, String> {
        let transaction: Option<Transaction> = read_json(&self.directory.join("transaction"))?;
        if let Some(transaction) = &transaction {
            validate_transaction(transaction)?;
        }
        Ok(transaction)
    }

    pub(super) fn write_transaction(&self, transaction: &Transaction) -> Result<(), String> {
        write_json(&self.directory.join("transaction"), transaction)
    }

    pub(super) fn clear_deployment_records(&self) -> Result<(), String> {
        for name in ["current", "active", "transaction"] {
            remove_if_present(&self.directory.join(name))?;
        }
        Ok(())
    }

    pub(super) fn recovery(&self) -> Result<Recovery, String> {
        let Some(transaction) = self.transaction()? else {
            return Ok(Recovery::None);
        };
        match transaction.phase {
            Phase::Prepared => {
                let current = self.current()?;
                let expected_previous = match transaction.previous_kind {
                    PreviousKind::Managed => transaction.previous.as_ref(),
                    PreviousKind::None | PreviousKind::Legacy => None,
                };
                if current.as_ref() != Some(&transaction.candidate)
                    && current.as_ref() != expected_previous
                {
                    return Err(
                        "interrupted transaction disagrees with the durable relay pointer"
                            .to_string(),
                    );
                }
                Ok(Recovery::RollBack(transaction))
            }
            Phase::Accepted => {
                if self.current()?.as_deref() != Some(&transaction.candidate) {
                    return Err(
                        "accepted transaction has no matching candidate relay pointer".to_string(),
                    );
                }
                Ok(Recovery::FinishAccepted(transaction))
            }
            Phase::Complete => Ok(Recovery::None),
        }
    }
}

fn valid_backend(backend: &str) -> Result<(), String> {
    if !backend.is_empty()
        && backend.len() <= 128
        && backend
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'.' | b'_' | b'-'))
    {
        Ok(())
    } else {
        Err("deployment state contains an unsafe backend name".to_string())
    }
}

fn validate_transaction(transaction: &Transaction) -> Result<(), String> {
    if transaction.version != 1 {
        return Err(format!(
            "unsupported local deployment transaction v{}",
            transaction.version
        ));
    }
    valid_backend(&transaction.candidate)?;
    if let Some(previous) = &transaction.previous {
        valid_backend(previous)?;
    }
    let shape_is_valid = match transaction.previous_kind {
        PreviousKind::None => transaction.previous.is_none() && transaction.previous_port.is_none(),
        PreviousKind::Managed => {
            transaction.previous.is_some() && transaction.previous_port.is_some()
        }
        PreviousKind::Legacy => {
            transaction.previous.as_deref() == Some(super::LEGACY)
                && transaction.previous_port.is_some()
        }
    };
    if !shape_is_valid {
        return Err("local deployment transaction has inconsistent previous state".to_string());
    }
    Ok(())
}

fn read_json<T: serde::de::DeserializeOwned>(path: &Path) -> Result<Option<T>, String> {
    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => return Ok(None),
        Err(error) => return Err(format!("could not read {}: {error}", path.display())),
    };
    serde_json::from_slice(&bytes)
        .map(Some)
        .map_err(|error| format!("could not parse {}: {error}", path.display()))
}

fn write_json(path: &Path, value: &impl Serialize) -> Result<(), String> {
    let mut bytes = serde_json::to_vec_pretty(value)
        .map_err(|error| format!("could not encode {}: {error}", path.display()))?;
    bytes.push(b'\n');
    link_assistant_router::durable_file::atomic_write_owner_only(path, &bytes)
        .map_err(|error| format!("could not write {}: {error}", path.display()))
}

fn remove_if_present(path: &Path) -> Result<(), String> {
    match std::fs::remove_file(path) {
        Ok(()) => Ok(()),
        Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(format!("could not remove {}: {error}", path.display())),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn transaction(phase: Phase, previous_kind: PreviousKind) -> Transaction {
        Transaction {
            version: 1,
            phase,
            previous: (previous_kind != PreviousKind::None).then(|| "old".to_string()),
            previous_kind,
            previous_port: Some(8080),
            candidate: "candidate".into(),
            image_ref: "router:1.2.3".into(),
            image_id: "sha256:new".into(),
            port: 8080,
        }
    }

    #[test]
    fn a_hard_kill_on_either_side_of_pointer_switch_has_one_safe_answer() {
        let root = tempfile::tempdir().unwrap();
        let state = State::new(root.path());
        std::fs::create_dir_all(state.directory()).unwrap();
        let prepared = transaction(Phase::Prepared, PreviousKind::Managed);
        state.write_transaction(&prepared).unwrap();

        state.set_current("old").unwrap();
        assert_eq!(
            state.recovery().unwrap(),
            Recovery::RollBack(prepared.clone())
        );

        // Simulates SIGKILL after atomic pointer rename but before the next
        // transaction write. The still-prepared record restores the old side.
        state.set_current("candidate").unwrap();
        assert_eq!(state.recovery().unwrap(), Recovery::RollBack(prepared));

        let mut accepted = transaction(Phase::Accepted, PreviousKind::Managed);
        state.write_transaction(&accepted).unwrap();
        assert_eq!(
            state.recovery().unwrap(),
            Recovery::FinishAccepted(accepted.clone())
        );

        accepted.phase = Phase::Complete;
        state.write_transaction(&accepted).unwrap();
        assert_eq!(state.recovery().unwrap(), Recovery::None);
    }

    #[test]
    fn malformed_or_future_transactions_are_refused_before_recovery() {
        let root = tempfile::tempdir().unwrap();
        let state = State::new(root.path());
        std::fs::create_dir_all(state.directory()).unwrap();
        let mut record = transaction(Phase::Prepared, PreviousKind::Managed);
        record.version = 2;
        state.write_transaction(&record).unwrap();
        assert!(state.transaction().unwrap_err().contains("transaction v2"));

        record.version = 1;
        record.previous = None;
        state.write_transaction(&record).unwrap();
        assert!(
            state
                .transaction()
                .unwrap_err()
                .contains("inconsistent previous state")
        );
    }
}
