//! The optional on-disk runtime configuration and live setting snapshots.

use std::ffi::OsString;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex, OnceLock, RwLock};
use std::time::Duration;

use clap::{ArgMatches, Command};
use schemars::JsonSchema;
use serde::Deserialize;
use serde_json::{Map, Value, json};
use tower_http::cors::CorsLayer;

use crate::cli::Cli;

pub(crate) mod api;
mod cli_settings;
pub(crate) mod cors;
pub(crate) mod egress;
mod payload;
mod pointer;
mod redaction;
mod storage;

#[derive(Debug, Default, Deserialize, JsonSchema)]
#[serde(default, deny_unknown_fields)]
struct Shape {
    cli: Map<String, Value>,
    cors: cors::Cors,
    payload: payload::Payload,
}

pub(super) fn schema() -> &'static Value {
    static SCHEMA: OnceLock<Value> = OnceLock::new();
    SCHEMA.get_or_init(|| {
        let mut schema = schemars::schema_for!(Shape).to_value();
        schema["title"] = json!("Router runtime configuration");
        schema["properties"]["cli"] = cli_settings::schema();
        schema
    })
}

#[derive(Default)]
struct Live {
    rules: Arc<payload::Rules>,
    cors: Option<CorsLayer>,
}

impl Live {
    fn from_document(document: &Value) -> Result<Self, &'static str> {
        static VALIDATOR: OnceLock<jsonschema::Validator> = OnceLock::new();
        let validator = VALIDATOR.get_or_init(|| {
            jsonschema::validator_for(schema()).expect("runtime configuration schema is valid")
        });
        if !validator.is_valid(document) {
            return Err("runtime configuration does not match its schema");
        }
        let shape: Shape = serde_json::from_value(document.clone())
            .map_err(|_| "runtime configuration does not match its schema")?;
        drop(shape.cli);
        Ok(Self {
            rules: Arc::new(shape.payload.compile()?),
            cors: shape.cors.layer()?,
        })
    }
}

/// Configuration selected for one Router instance.
pub struct RuntimeConfig {
    path: PathBuf,
    audit_path: PathBuf,
    boot: Value,
    disk: Mutex<Disk>,
    live: RwLock<Live>,
}

impl std::fmt::Debug for RuntimeConfig {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("RuntimeConfig")
            .finish_non_exhaustive()
    }
}

struct Disk {
    // Keep the parser and scoped dependencies behind the same poison boundary
    // as the document they validate.
    input: cli_settings::Input,
    operation: Option<crate::operation_context::OperationContext>,
    seen: Option<String>,
    document: Value,
    error: Option<&'static str>,
}

#[derive(Debug)]
pub(super) enum Edit {
    Replace(Value),
    Merge(Value),
    Put(Vec<String>, Value),
    Delete(Vec<String>),
}

#[derive(Clone, Copy, Debug)]
pub(super) enum Failure {
    Invalid(&'static str),
    Missing,
    Conflict(&'static str),
    Io,
}

impl From<std::io::Error> for Failure {
    fn from(_: std::io::Error) -> Self {
        Self::Io
    }
}

impl From<pointer::PathError> for Failure {
    fn from(error: pointer::PathError) -> Self {
        match error {
            pointer::PathError::Invalid => Self::Invalid("invalid configuration pointer"),
            pointer::PathError::Missing => Self::Missing,
        }
    }
}

impl RuntimeConfig {
    pub(crate) fn load(
        base: Cli,
        command: Command,
        arguments: Vec<OsString>,
        matches: &ArgMatches,
    ) -> Result<Cli, &'static str> {
        let data_dir = base
            .data_dir
            .clone()
            .unwrap_or_else(crate::config::default_data_dir);
        let path = crate::operation_context::var_os("ROUTER_RUNTIME_CONFIG")
            .filter(|path| !path.is_empty())
            .map_or_else(|| data_dir.join("runtime.toml"), PathBuf::from);
        let path = absolute(path)?;
        let audit_path = absolute(data_dir.join("runtime-config-audit.jsonl"))?;
        require_distinct_audit_path(&path, &audit_path)?;
        let bytes =
            storage::read(&path).map_err(|_| "could not read runtime configuration file")?;
        let input = cli_settings::Input::new(command, arguments, matches);
        let (mut cli, document, live) = if let Some(bytes) = &bytes {
            let (_, document) = storage::decode(bytes)?;
            let live = Live::from_document(&document)?;
            let cli = input.resolve(&document)?;
            (cli, document, live)
        } else {
            (base, json!({}), Live::default())
        };
        if let Some(destination) = cli.audit_log.as_deref() {
            require_distinct_audit_path(&path, destination)?;
        }
        cli.runtime_config = Some(Arc::new(Self {
            path,
            audit_path,
            boot: document.clone(),
            disk: Mutex::new(Disk {
                input,
                operation: crate::operation_context::current(),
                seen: bytes,
                document,
                error: None,
            }),
            live: RwLock::new(live),
        }));
        Ok(cli)
    }

    /// Start the file watcher. Its weak reference lets it stop with the server.
    pub(crate) fn watch(self: &Arc<Self>) {
        let store = Arc::downgrade(self);
        tokio::spawn(async move {
            loop {
                tokio::time::sleep(Duration::from_secs(1)).await;
                let Some(config) = store.upgrade() else { break };
                if let Err(error) = tokio::task::spawn_blocking(move || {
                    let _result = config.reload_as("file");
                })
                .await
                {
                    tracing::warn!("runtime configuration watcher failed: {error}");
                    break;
                }
            }
        });
    }

    pub(crate) fn rules(&self) -> Arc<payload::Rules> {
        Arc::clone(
            &self
                .live
                .read()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                .rules,
        )
    }

    pub(crate) fn cors(&self) -> Option<CorsLayer> {
        self.live
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .cors
            .clone()
    }

    fn document(&self, path: &[String]) -> Result<Value, Failure> {
        let disk = self
            .disk
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        // Redact the whole tree first so pointers into protected values have
        // the same visibility as the full document.
        pointer::get(&redaction::view(&disk.document), path)
            .cloned()
            .ok_or(Failure::Missing)
    }

    fn status(&self) -> Value {
        let disk = self
            .disk
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        self.status_for(&disk)
    }

    fn status_for(&self, disk: &Disk) -> Value {
        let boot = self.boot["cli"].as_object().into_iter().flat_map(Map::keys);
        let desired = disk.document["cli"]
            .as_object()
            .into_iter()
            .flat_map(Map::keys);
        let mut restart_required = Vec::new();
        let mut overridden = Vec::new();
        let mut keys: std::collections::BTreeSet<_> = boot.collect();
        keys.extend(desired);
        for key in keys {
            if disk.input.overridden.contains(key) {
                if disk.document["cli"].get(key).is_some() {
                    overridden.push(key);
                }
            } else if self.boot["cli"].get(key) != disk.document["cli"].get(key) {
                restart_required.push(key);
            }
        }
        json!({
            "restart_required": restart_required,
            "overridden": overridden,
            "reload_error": disk.error
        })
    }

    fn reload_as(&self, actor: &str) -> Result<Value, Failure> {
        let mut disk = self
            .disk
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        self.refresh(&mut disk, actor)?;
        Ok(self.status_for(&disk))
    }

    fn refresh(&self, disk: &mut Disk, actor: &str) -> Result<(), Failure> {
        let bytes = storage::read(&self.path).map_err(|_| {
            note_error(disk, "could not read runtime configuration file");
            Failure::Conflict("could not read runtime configuration file")
        })?;
        if bytes == disk.seen && disk.error.is_none() {
            return Ok(());
        }
        let result = self.read_candidate(disk, bytes.as_deref());
        let (document, live) = match result {
            Ok(document) => document,
            Err(error) => {
                note_error(disk, error);
                return Err(Failure::Conflict(error));
            }
        };
        if document != disk.document
            && let Err(error) = self.audit(actor, "reload", &disk.document, &document)
        {
            note_error(disk, "could not audit runtime configuration reload");
            return Err(error);
        }
        self.apply(disk, bytes, document, live);
        Ok(())
    }

    fn edit(&self, edit: Edit, actor: &str) -> Result<Value, Failure> {
        let mut name = self.path.file_name().ok_or(Failure::Io)?.to_os_string();
        name.push(".lock");
        let lock = self.path.with_file_name(name);
        crate::durable_file::with_exclusive_lock(&lock, || self.edit_locked(edit, actor))
    }

    fn edit_locked(&self, edit: Edit, actor: &str) -> Result<Value, Failure> {
        let mut disk = self
            .disk
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        self.refresh(&mut disk, "file")?;
        let mut next = disk.document.clone();
        let action = match edit {
            Edit::Replace(value) => {
                next = value;
                "replace"
            }
            Edit::Merge(value) => {
                pointer::merge(&mut next, value);
                "patch"
            }
            Edit::Put(path, value) => {
                pointer::edit(&mut next, &path, Some(value), false)?;
                "put_pointer"
            }
            Edit::Delete(path) => {
                pointer::edit(&mut next, &path, None, false)?;
                "delete_pointer"
            }
        };
        redaction::restore_masks(&mut next, &disk.document);
        cli_settings::require_local_changes(&disk.document, &next).map_err(Failure::Invalid)?;
        let live = self.validate(&disk, &next).map_err(Failure::Invalid)?;
        let toml = storage::decode(disk.seen.as_deref().unwrap_or_default())
            .map_err(Failure::Invalid)?
            .0;
        let bytes = storage::encode(toml, &next).map_err(Failure::Invalid)?;
        if storage::read(&self.path).map_err(|_| Failure::Io)? != disk.seen {
            return Err(Failure::Conflict(
                "configuration file changed during the edit",
            ));
        }
        self.audit(actor, action, &disk.document, &next)?;
        crate::durable_file::atomic_write_owner_only(&self.path, bytes.as_bytes())
            .map_err(|_| Failure::Io)?;
        self.apply(&mut disk, Some(bytes), next, live);
        let status = self.status_for(&disk);
        drop(disk);
        Ok(status)
    }

    fn audit(
        &self,
        actor: &str,
        action: &str,
        before: &Value,
        after: &Value,
    ) -> Result<(), Failure> {
        crate::audit::write_runtime_config_event(
            &self.audit_path,
            &json!({
                "phase": "runtime_config_change",
                "time": crate::operation_context::now().to_rfc3339(),
                "actor": actor,
                "action": action,
                "diff": redaction::diff(before, after)
            }),
        )
        .map_err(|_| Failure::Io)
    }

    fn read_candidate(
        &self,
        disk: &Disk,
        bytes: Option<&str>,
    ) -> Result<(Value, Live), &'static str> {
        let (_, document) = storage::decode(bytes.unwrap_or_default())?;
        let live = self.validate(disk, &document)?;
        Ok((document, live))
    }

    fn validate(&self, disk: &Disk, document: &Value) -> Result<Live, &'static str> {
        let live = Live::from_document(document)?;
        let cli = disk.input.resolve(document)?;
        let configure = || {
            if let Some(destination) = cli.audit_log.as_deref() {
                require_distinct_audit_path(&self.path, destination)?;
            }
            cli.into_config()
                .map_err(|_| "runtime configuration is invalid for this server")
        };
        let config = disk
            .operation
            .as_ref()
            .map_or_else(configure, |context| context.scope(configure))?;
        crate::management_config::ManagementConfig::validate_secrets(
            &config.token_secret,
            config.admin_key.as_deref(),
        )
        .map_err(|_| "runtime configuration includes a published example credential")?;
        Ok(live)
    }

    fn apply(&self, disk: &mut Disk, bytes: Option<String>, document: Value, live: Live) {
        *self
            .live
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner) = live;
        disk.seen = bytes;
        disk.document = document;
        disk.error = None;
    }
}

fn require_distinct_audit_path(path: &Path, destination: &Path) -> Result<(), &'static str> {
    if destination.as_os_str().is_empty() {
        return Ok(());
    }
    let destination = absolute(destination.to_path_buf())?;
    if path == destination
        || matches!(
            (file_location(path), file_location(&destination)),
            (Some(config_file), Some(audit_file)) if config_file == audit_file
        )
    {
        return Err("runtime configuration and audit log require different paths");
    }
    Ok(())
}

fn file_location(path: &Path) -> Option<PathBuf> {
    path.canonicalize().ok().or_else(|| {
        let directory = path.parent()?.canonicalize().ok()?;
        Some(directory.join(path.file_name()?))
    })
}

fn absolute(path: PathBuf) -> Result<PathBuf, &'static str> {
    if path.is_absolute() {
        Ok(path)
    } else {
        crate::operation_context::current_dir()
            .map(|current| current.join(path))
            .map_err(|_| "could not resolve runtime configuration path")
    }
}

fn note_error(disk: &mut Disk, error: &'static str) {
    if disk.error != Some(error) {
        tracing::warn!(error, "runtime configuration reload refused");
    }
    disk.error = Some(error);
}

#[cfg(test)]
mod tests;
