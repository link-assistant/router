//! Scoped, private diagnostics for ordinary Claude launches (issue #717).

use std::fs::{self, File, OpenOptions};
use std::io::{self, Seek as _, SeekFrom, Write};
use std::path::{Path, PathBuf};
use std::process::ExitCode;
use std::sync::{Arc, Mutex};

use serde_json::json;
use tracing::instrument::WithSubscriber as _;

mod redaction;

const MAX_BYTES: u64 = 1024 * 1024;
const ARCHIVES: usize = 5;
const MAX_MESSAGE_BYTES: usize = 16 * 1024;

tokio::task_local! {
    static ACTIVE: Arc<DiagnosticLog>;
}

struct DiagnosticLog {
    directory: PathBuf,
    launch_id: String,
    terminal: bool,
    secrets: Mutex<Vec<String>>,
    failure: Mutex<Option<String>>,
}

impl DiagnosticLog {
    fn open(data_dir: &Path, terminal: bool) -> io::Result<Arc<Self>> {
        let directory = data_dir.join("launcher");
        reject_symlink(&directory)?;
        let mut builder = fs::DirBuilder::new();
        builder.recursive(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::{DirBuilderExt as _, PermissionsExt as _};
            builder.mode(0o700);
            builder.create(&directory)?;
            fs::set_permissions(&directory, fs::Permissions::from_mode(0o700))?;
        }
        #[cfg(not(unix))]
        builder.create(&directory)?;
        // Fail before discovery if either the lock or destination is unavailable.
        let _lock = private_file(&directory.join("launcher.lock"))?;
        let _file = private_file(&directory.join("launcher.log"))?;
        let secrets = crate::operation_context::current()
            .map_or_else(
                || {
                    std::env::vars_os()
                        .map(|(name, value)| {
                            (
                                name.to_string_lossy().into_owned(),
                                value.to_string_lossy().into_owned(),
                            )
                        })
                        .collect::<Vec<_>>()
                },
                |context| {
                    context
                        .environment
                        .iter()
                        .map(|(name, value)| {
                            (
                                name.to_string_lossy().into_owned(),
                                value.to_string_lossy().into_owned(),
                            )
                        })
                        .collect()
                },
            )
            .into_iter()
            .filter_map(|(name, value)| redaction::secret_name(&name).then_some(value))
            .filter(|value| !value.is_empty())
            .collect();
        Ok(Arc::new(Self {
            directory,
            launch_id: uuid::Uuid::new_v4().to_string(),
            terminal,
            secrets: Mutex::new(secrets),
            failure: Mutex::new(None),
        }))
    }

    fn sanitize(&self, text: &str) -> String {
        redaction::sanitize(text, &self.secrets.lock().expect("launcher secrets lock"))
    }

    fn record(&self, event: &str, message: &str) {
        let mut message = self.sanitize(message);
        if message.len() > MAX_MESSAGE_BYTES {
            let mut end = MAX_MESSAGE_BYTES;
            while !message.is_char_boundary(end) {
                end -= 1;
            }
            message.truncate(end);
            message.push_str(" [truncated]");
        }
        let record = json!({
            "timestamp": chrono::Utc::now().to_rfc3339(),
            "launch_id": self.launch_id,
            "event": event,
            "message": message.trim_end(),
        });
        if let Err(error) = self.append(format!("{record}\n").as_bytes()) {
            *self.failure.lock().expect("launcher failure lock") = Some(error.to_string());
        }
        if let Err(error) = crate::logging::event_file(format_args!(
            "launch_id={} {event} {}",
            self.launch_id,
            message.trim_end()
        )) {
            *self.failure.lock().expect("launcher failure lock") = Some(error.to_string());
        }
    }

    fn append(&self, bytes: &[u8]) -> io::Result<()> {
        let lock = private_file(&self.directory.join("launcher.lock"))?;
        fs2::FileExt::lock_exclusive(&lock)?;
        // Open under the lock each time: another process may have rotated the file.
        let path = self.directory.join("launcher.log");
        let mut file = private_file(&path)?;
        if file.metadata()?.len() + bytes.len() as u64 > MAX_BYTES {
            drop(file);
            for number in (1..=ARCHIVES).rev() {
                let destination = self.directory.join(format!("launcher.log.{number}"));
                reject_symlink(&destination)?;
                if destination.exists() {
                    fs::remove_file(&destination)?;
                }
                let source = if number == 1 {
                    path.clone()
                } else {
                    self.directory.join(format!("launcher.log.{}", number - 1))
                };
                reject_symlink(&source)?;
                if source.exists() {
                    fs::rename(source, destination)?;
                }
            }
            file = private_file(&path)?;
        }
        // Windows append-only handles lack the access required by file locks
        // and sync_data. Seek while holding the lock on a read/write handle.
        file.seek(SeekFrom::End(0))?;
        file.write_all(bytes)?;
        file.sync_data()
        // Dropping the lock releases it on success and on every error path.
    }

    fn check(&self) -> Result<(), String> {
        self.failure
            .lock()
            .expect("launcher failure lock")
            .as_ref()
            .map_or(Ok(()), |error| {
                Err(format!("could not persist launcher diagnostics: {error}"))
            })
    }
}

fn reject_symlink(path: &Path) -> io::Result<()> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => Err(io::Error::other(
            "launcher log destination must not be a symlink",
        )),
        Ok(_) => Ok(()),
        Err(error) if error.kind() == io::ErrorKind::NotFound => Ok(()),
        Err(error) => Err(error),
    }
}

fn private_file(path: &Path) -> io::Result<File> {
    reject_symlink(path)?;
    let mut options = OpenOptions::new();
    options.create(true).read(true).write(true).truncate(false);
    #[cfg(unix)]
    {
        use std::os::unix::fs::OpenOptionsExt as _;
        options.mode(0o600);
    }
    let file = options.open(path)?;
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        file.set_permissions(fs::Permissions::from_mode(0o600))?;
    }
    Ok(file)
}

/// Open Claude diagnostics before the process-wide operational log or preflight.
pub async fn run_process(
    args: &crate::cli::WithArgs,
    data_dir: &Path,
    verbose: bool,
    work: impl std::future::Future<Output = ExitCode>,
) -> ExitCode {
    if args.client == crate::clients::ClientKind::ClaudeCode && !args.global && !args.undo {
        run(args, Some(data_dir), verbose, async { Ok(work.await) }).await
    } else {
        work.await
    }
}

pub fn is_active() -> bool {
    ACTIVE.try_with(|_| ()).is_ok()
}

/// Run a Claude invocation with logging already open before polling its work.
pub async fn run(
    args: &crate::cli::WithArgs,
    data_dir: Option<&Path>,
    verbose: bool,
    work: impl std::future::Future<Output = Result<ExitCode, super::with_command::AnyError>>,
) -> ExitCode {
    let directory = data_dir.map_or_else(crate::config::default_data_dir, Path::to_path_buf);
    let log = match DiagnosticLog::open(&directory, verbose) {
        Ok(log) => log,
        Err(error) => {
            // An unwritable destination must never allow an unlogged launch.
            // Structured callers still receive an inspectable error result.
            if verbose || crate::operation_context::current().is_some() {
                eprintln!(
                    "error: could not open launcher log {}: {error}",
                    directory.display()
                );
            }
            return ExitCode::from(1);
        }
    };
    if let Some(token) = &args.token {
        log.secrets.lock().unwrap().push(token.clone());
    }
    log.record("launch_started", "Claude launcher diagnostics opened");
    if let Err(error) = log.check() {
        if verbose || crate::operation_context::current().is_some() {
            eprintln!("error: {error}");
        }
        return ExitCode::from(1);
    }
    let writer = log.clone();
    let subscriber = tracing_subscriber::fmt()
        .with_ansi(false)
        .with_env_filter(crate::logging::env_filter(
            verbose,
            crate::operation_context::var("RUST_LOG").ok().as_deref(),
        ))
        .with_writer(move || TraceWriter {
            log: writer.clone(),
            bytes: Vec::new(),
        })
        .finish();
    ACTIVE
        .scope(
            log.clone(),
            async {
                let code = match work.await {
                    Ok(code) => {
                        if code != ExitCode::SUCCESS {
                            record("launch_failed", &format!("launcher exit status: {code:?}"));
                        }
                        record(
                            "launch_finished",
                            &format!("launcher exit status: {code:?}"),
                        );
                        code
                    }
                    Err(error) => {
                        record("launch_failed", &error.to_string());
                        eprintln!("error: {error}");
                        ExitCode::from(1)
                    }
                };
                if let Err(error) = log.check() {
                    eprintln!("error: {error}");
                    ExitCode::from(1)
                } else {
                    code
                }
            }
            .with_subscriber(subscriber),
        )
        .await
}

/// Route Router output while leaving the vendor's inherited descriptors alone.
pub fn capture(arguments: std::fmt::Arguments<'_>) -> bool {
    ACTIVE
        .try_with(|log| {
            let original = arguments.to_string();
            log.record("diagnostic", &original);
            if log.terminal || crate::operation_context::current().is_some() {
                let message = log.sanitize(&original);
                crate::operation_output::write_passthrough(true, format_args!("{message}"));
            }
        })
        .is_ok()
}

pub fn record(event: &str, message: &str) {
    let _ = ACTIVE.try_with(|log| log.record(event, message));
}

pub fn add_secret(secret: Option<&str>) {
    if let Some(secret) = secret.filter(|secret| !secret.is_empty()) {
        let _ = ACTIVE.try_with(|log| log.secrets.lock().unwrap().push(secret.to_string()));
    }
}

pub fn check() -> Result<(), String> {
    ACTIVE.try_with(|log| log.check()).unwrap_or(Ok(()))
}

struct TraceWriter {
    log: Arc<DiagnosticLog>,
    bytes: Vec<u8>,
}

impl Write for TraceWriter {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

impl Drop for TraceWriter {
    fn drop(&mut self) {
        if !self.bytes.is_empty() {
            let original = String::from_utf8_lossy(&self.bytes);
            self.log.record("trace", &original);
            if self.log.terminal {
                let message = self.log.sanitize(&original);
                crate::operation_output::write_passthrough(true, format_args!("{message}"));
            }
        }
    }
}

#[cfg(test)]
#[path = "launcher_log_tests.rs"]
mod tests;
