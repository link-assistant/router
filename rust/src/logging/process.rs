//! Process adapter for persistent diagnostics and explicit console mirroring.
use std::fmt::Arguments;
use std::path::{Path, PathBuf};
use std::process::{ExitCode, ExitStatus};
use std::sync::OnceLock;
use tracing_subscriber::prelude::*;

use crate::operational_log::OperationalLog;

static LOG: OnceLock<OperationalLog> = OnceLock::new();
static DATA_DIR: OnceLock<PathBuf> = OnceLock::new();
tokio::task_local! { pub(crate) static FILE_DIAGNOSTICS: bool; }

pub fn data_dir() -> PathBuf {
    DATA_DIR
        .get()
        .cloned()
        .unwrap_or_else(crate::config::default_data_dir)
}

pub fn install(data_dir: &Path, verbose: bool, mut secrets: Vec<String>) -> std::io::Result<()> {
    if LOG.get().is_some() {
        return Ok(());
    }
    secrets.extend(std::env::vars_os().filter_map(|(name, value)| {
        let name = name.to_string_lossy().to_ascii_uppercase();
        (["TOKEN", "SECRET", "KEY", "COOKIE", "PASSWORD"]
            .iter()
            .any(|suffix| name.ends_with(suffix)))
        .then(|| value.to_string_lossy().into_owned())
    }));
    secrets.retain(|secret| secret.trim().len() >= 4);
    secrets.sort_by_key(|secret| std::cmp::Reverse(secret.len()));
    secrets.dedup();
    let log = OperationalLog::open(&data_dir.join("logs"), verbose, secrets)?;
    let filter = super::env_filter(
        verbose,
        crate::operation_context::var("RUST_LOG").ok().as_deref(),
    );
    let baseline = filter.to_string();
    let (filter, handle) = tracing_subscriber::reload::Layer::new(filter);
    tracing_subscriber::registry()
        .with(filter)
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(log.clone())
                .with_ansi(false),
        )
        .try_init()
        .map_err(std::io::Error::other)?;
    let _ = super::runtime_debug::CONTROL
        .set(super::runtime_debug::RuntimeDebug::new(handle, baseline));
    let _ = DATA_DIR.set(data_dir.to_path_buf());
    let _ = LOG.set(log);
    Ok(())
}

pub fn diagnostic(arguments: Arguments<'_>, quiet: bool) {
    if let Some(log) = LOG.get() {
        let record = format!("{} WARN {}", chrono::Utc::now().to_rfc3339(), arguments);
        let result = if quiet {
            log.record(&record)
        } else {
            // Explicit command diagnostics already retain their console channel.
            log.record_file(&record)
        };
        if let Err(error) = result {
            write_failure(&error);
        }
    }
}

pub fn event(arguments: Arguments<'_>) {
    if let Some(log) = LOG.get() {
        let record = format!("{} INFO {}", chrono::Utc::now().to_rfc3339(), arguments);
        if let Err(error) = log.record(&record) {
            write_failure(&error);
        }
    }
}

/// Mirror sanitized launcher records without adding another console copy.
pub fn event_file(arguments: Arguments<'_>) -> std::io::Result<()> {
    LOG.get().map_or(Ok(()), |log| {
        log.record_file(&format!(
            "{} INFO {}",
            chrono::Utc::now().to_rfc3339(),
            arguments
        ))
    })
}

fn write_failure(error: &std::io::Error) {
    if !crate::launcher_log::capture(format_args!("operational log write failed: {error}\n")) {
        std::eprintln!("operational log write failed: {error}");
    }
}

/// Record a managed child's termination without reading its stdout/stderr.
pub fn child_exit(role: &str, pid: Option<u32>, status: ExitStatus) {
    #[cfg(unix)]
    let signal = {
        use std::os::unix::process::ExitStatusExt as _;
        status.signal()
    };
    #[cfg(not(unix))]
    let signal: Option<i32> = None;
    event(format_args!(
        "{role}_exit child_pid={pid:?} exit_code={:?} signal={signal:?} status={status}",
        status.code()
    ));
}

struct ProcessExit(bool);
impl ProcessExit {
    fn finish(mut self, code: ExitCode) -> ExitCode {
        self.0 = true;
        let number = (0..=u8::MAX)
            .find(|number| ExitCode::from(*number) == code)
            .unwrap_or(1);
        event(format_args!(
            "process_exit exit_code={number} outcome={}",
            if number == 0 { "success" } else { "error" }
        ));
        code
    }
}
impl Drop for ProcessExit {
    fn drop(&mut self) {
        if !self.0 {
            event(format_args!(
                "process_exit exit_code=1 outcome=panic_or_cancelled"
            ));
        }
    }
}

pub async fn run(
    data_dir: &Path,
    verbose: bool,
    operation: &str,
    secrets: Vec<String>,
    quiet: bool,
    future: impl std::future::Future<Output = ExitCode>,
) -> ExitCode {
    if let Err(error) = install(data_dir, verbose, secrets) {
        // A missing/unwritable log must never silently discard the failure.
        eprintln!(
            "cannot initialize operational log at {}: {error}",
            data_dir.join("logs").display()
        );
        return ExitCode::from(1);
    }
    event(format_args!(
        "process_start version={} source_commit={} operation={operation}",
        crate::VERSION,
        crate::SOURCE_COMMIT
    ));
    let guard = ProcessExit(false);
    let code = FILE_DIAGNOSTICS.scope(quiet, future).await;
    guard.finish(code)
}

/// Execute the standalone launcher with the same file/console policy as `router with`.
pub async fn run_launcher(args: &crate::cli::WithArgs, data_dir: &Path, verbose: bool) -> ExitCode {
    let work = Box::pin(run(
        data_dir,
        verbose,
        "with",
        args.token.clone().into_iter().collect(),
        !args.global && !args.undo,
        crate::with_command::run_with_logging(args, Some(data_dir), verbose),
    ));
    crate::launcher_log::run_process(args, data_dir, verbose, work).await
}
