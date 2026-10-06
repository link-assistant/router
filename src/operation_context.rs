//! Injectable environment, filesystem roots, clock and subprocess runner.
use std::collections::BTreeMap;
use std::ffi::{OsStr, OsString};
use std::path::PathBuf;
use std::process::{Command, Output};
use std::sync::{Arc, Mutex};
use std::time::Duration;

/// A process dependency; tests can return fixtures without spawning commands.
pub trait ProcessRunner: Send + Sync {
    /// Execute an external dependency with a finite deadline.
    fn output(&self, command: &mut Command, deadline: Duration) -> std::io::Result<Output>;

    /// Start an owned background dependency; override to launch a test fixture.
    fn spawn(&self, command: &mut Command) -> std::io::Result<std::process::Child> {
        command.spawn()
    }
}

/// Output accumulated by the operation; never redirected process-wide.
#[derive(Default)]
pub(crate) struct CapturedOutput {
    pub stdout: String,
    pub stderr: String,
    pub data: Option<serde_json::Value>,
}

/// Parameters scoped to one library operation. Clones share dependency objects.
#[derive(Clone)]
pub struct OperationContext {
    /// Environment snapshot; reads do not mutate the process environment.
    pub environment: BTreeMap<OsString, OsString>,
    /// Optional filesystem home root.
    pub home: Option<PathBuf>,
    /// Optional persistent Router state root.
    pub data_dir: Option<PathBuf>,
    /// Working directory for subprocesses and relative operation paths.
    pub working_directory: PathBuf,
    /// Injected timestamp; `None` uses the actual clock.
    pub now: Option<chrono::DateTime<chrono::Utc>>,
    /// Injected external dependency runner; `None` uses native bounded execution.
    pub process_runner: Option<Arc<dyn ProcessRunner>>,
    /// Finite deadline for noninteractive external dependencies.
    pub process_deadline: Duration,
    pub(crate) output: Arc<Mutex<CapturedOutput>>,
    pub(crate) deployment_instance: Arc<Mutex<Option<String>>>,
    pub(crate) deployment_settings: Arc<Mutex<crate::deploy_local::runtime_env::LocalSettings>>,
}

impl Default for OperationContext {
    fn default() -> Self {
        Self {
            environment: std::env::vars_os().collect(),
            home: None,
            data_dir: None,
            working_directory: std::env::current_dir().unwrap_or_else(|_| PathBuf::from(".")),
            now: None,
            process_runner: None,
            process_deadline: Duration::from_secs(60),
            output: Arc::new(Mutex::new(CapturedOutput::default())),
            deployment_instance: Arc::default(),
            deployment_settings: Arc::default(),
        }
    }
}

impl OperationContext {
    /// Use an isolated home/state directory while preserving required PATH.
    #[must_use]
    pub fn isolated(root: impl Into<PathBuf>) -> Self {
        let root = root.into();
        let mut context = Self {
            home: Some(root.clone()),
            data_dir: Some(root.join("router-data")),
            ..Self::default()
        };
        for name in [
            "HOME",
            "USERPROFILE",
            "XDG_CONFIG_HOME",
            "XDG_DATA_HOME",
            "XDG_CACHE_HOME",
            "CLAUDE_CONFIG_DIR",
            "CODEX_HOME",
        ] {
            context.environment.remove(OsStr::new(name));
        }
        context
            .environment
            .insert("HOME".into(), root.into_os_string());
        context
    }

    /// Scope a synchronous preparation step without changing global dependencies.
    pub fn scope<T>(&self, operation: impl FnOnce() -> T) -> T {
        ACTIVE.sync_scope(self.clone(), operation)
    }

    /// Scope asynchronous dependencies for a lower-level operation.
    pub async fn scope_async<T>(&self, operation: impl std::future::Future<Output = T>) -> T {
        ACTIVE.scope(self.clone(), operation).await
    }

    /// Override one environment dependency without changing global state.
    pub fn set_env(&mut self, name: impl Into<OsString>, value: impl Into<OsString>) {
        self.environment.insert(name.into(), value.into());
    }
}

tokio::task_local! {
    pub(crate) static ACTIVE: OperationContext;
}

pub(crate) fn current() -> Option<OperationContext> {
    ACTIVE.try_with(Clone::clone).ok()
}

/// Read a variable from the current operation, or the native environment.
pub fn var_os(name: impl AsRef<OsStr>) -> Option<OsString> {
    ACTIVE
        .try_with(|context| context.environment.get(name.as_ref()).cloned())
        .unwrap_or_else(|_| std::env::var_os(name.as_ref()))
}

/// Read a Unicode environment dependency.
pub fn var(name: impl AsRef<OsStr>) -> Result<String, std::env::VarError> {
    var_os(name.as_ref())
        .ok_or(std::env::VarError::NotPresent)
        .and_then(|value| value.into_string().map_err(std::env::VarError::NotUnicode))
}

/// Read the operation clock.
#[must_use]
pub fn now() -> chrono::DateTime<chrono::Utc> {
    ACTIVE
        .try_with(|context| context.now)
        .ok()
        .flatten()
        .unwrap_or_else(chrono::Utc::now)
}

/// Preserve native wall-clock precision while honoring the scoped timestamp.
pub(crate) fn system_time() -> std::time::SystemTime {
    ACTIVE
        .try_with(|context| context.now)
        .ok()
        .flatten()
        .map_or_else(std::time::SystemTime::now, Into::into)
}

/// Resolve filesystem paths against the caller's working directory.
pub fn current_dir() -> std::io::Result<PathBuf> {
    ACTIVE
        .try_with(|context| context.working_directory.clone())
        .or_else(|_| std::env::current_dir())
}

/// Create a dependency command using the operation environment and directory.
/// A later explicit `env_clear()` remains authoritative (verification relies on it).
pub fn command(program: impl AsRef<OsStr>) -> Command {
    let mut command = Command::new(program);
    if let Some(context) = current() {
        command
            .env_clear()
            .envs(&context.environment)
            .current_dir(&context.working_directory);
    }
    command
}

/// Execute an external dependency with the operation's finite deadline.
pub fn process_output(command: &mut Command) -> std::io::Result<Output> {
    let deadline = current().map_or(Duration::from_secs(60), |context| context.process_deadline);
    bounded_output(command, deadline)
}

/// Bound an external dependency with an explicit deadline and injectable runner.
pub fn bounded_output(command: &mut Command, deadline: Duration) -> std::io::Result<Output> {
    if let Some(runner) = current().and_then(|context| context.process_runner) {
        runner.output(command, deadline)
    } else {
        crate::bounded_process::output(command, deadline)
    }
}

/// Start a background dependency through the operation runner, preserving its pipes.
pub fn spawn_process(command: &mut Command) -> std::io::Result<std::process::Child> {
    if let Some(runner) = current().and_then(|context| context.process_runner) {
        runner.spawn(command)
    } else {
        command.spawn()
    }
}
