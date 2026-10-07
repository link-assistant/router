//! Synchronous, owner-only operational records with bounded shared rotation.
use std::fs::{self, File, OpenOptions};
use std::io::{self, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};

const MAX_BYTES: usize = 2 * 1024 * 1024;
const BACKUPS: usize = 4;

#[derive(Clone)]
pub struct OperationalLog {
    state: Arc<Mutex<State>>,
    console: bool,
}

struct State {
    directory: PathBuf,
    lock: File,
    secrets: Vec<String>,
    max_bytes: usize,
    backups: usize,
}

impl OperationalLog {
    pub(crate) fn open(directory: &Path, console: bool, secrets: Vec<String>) -> io::Result<Self> {
        let mut builder = fs::DirBuilder::new();
        builder.recursive(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::DirBuilderExt as _;
            builder.mode(0o700);
        }
        builder.create(directory)?;
        reject_symlink(directory)?;
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt as _;
            fs::set_permissions(directory, fs::Permissions::from_mode(0o700))?;
        }
        let lock = open_private(&directory.join("operational.lock"))?;
        // Fail before discovery/preflight if no persistent sink can be opened.
        open_private(&directory.join("operational.log"))?;
        Ok(Self {
            state: Arc::new(Mutex::new(State {
                directory: directory.to_path_buf(),
                lock,
                secrets,
                max_bytes: MAX_BYTES,
                backups: BACKUPS,
            })),
            console,
        })
    }

    pub(crate) fn record(&self, message: &str) -> io::Result<()> {
        self.record_with_console(message, self.console)
    }

    pub(crate) fn record_file(&self, message: &str) -> io::Result<()> {
        self.record_with_console(message, false)
    }

    fn record_with_console(&self, message: &str, console: bool) -> io::Result<()> {
        let state = self
            .state
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let mut message =
            crate::login_url::redact_secrets(&crate::logging::redaction::urls(message));
        for secret in &state.secrets {
            message = crate::login_url::redact_value(&message, secret);
        }
        let mut record = format!("pid={} {message}", std::process::id());
        if !record.ends_with('\n') {
            record.push('\n');
        }
        if record.len() > state.max_bytes {
            let mut end = state.max_bytes.saturating_sub(" [truncated]\n".len());
            while !record.is_char_boundary(end) {
                end -= 1;
            }
            record.truncate(end);
            record.push_str(" [truncated]\n");
        }
        fs2::FileExt::lock_exclusive(&state.lock)?;
        let result = state.append(record.as_bytes());
        let unlock = fs2::FileExt::unlock(&state.lock);
        drop(state);
        result.and(unlock)?;
        if console {
            std::io::stderr().lock().write_all(record.as_bytes())?;
        }
        Ok(())
    }
}

impl State {
    fn path(&self, generation: usize) -> PathBuf {
        self.directory.join(if generation == 0 {
            "operational.log".to_string()
        } else {
            format!("operational.log.{generation}")
        })
    }

    fn append(&self, bytes: &[u8]) -> io::Result<()> {
        let path = self.path(0);
        let file = open_private(&path)?;
        if file.metadata()?.len() + bytes.len() as u64 > self.max_bytes as u64 {
            // Close before renaming: Windows does not rename open log files.
            drop(file);
            let oldest = self.path(self.backups);
            match fs::remove_file(oldest) {
                Err(error) if error.kind() != io::ErrorKind::NotFound => return Err(error),
                _ => {}
            }
            for generation in (0..self.backups).rev() {
                let source = self.path(generation);
                if source.exists() {
                    open_private(&source)?;
                    fs::rename(source, self.path(generation + 1))?;
                }
            }
        }
        let mut file = open_private(&path)?;
        file.write_all(bytes)?;
        // No asynchronous queue: an error/exit record is on disk before return.
        file.sync_data()
    }
}

fn reject_symlink(path: &Path) -> io::Result<()> {
    match fs::symlink_metadata(path) {
        Ok(metadata) if metadata.file_type().is_symlink() => Err(io::Error::other(
            "operational log paths must not be symlinks",
        )),
        Err(error) if error.kind() != io::ErrorKind::NotFound => Err(error),
        _ => Ok(()),
    }
}

fn open_private(path: &Path) -> io::Result<File> {
    reject_symlink(path)?;
    let mut options = OpenOptions::new();
    options.create(true).append(true);
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

pub struct RecordWriter {
    log: OperationalLog,
    bytes: Vec<u8>,
}

impl<'a> tracing_subscriber::fmt::MakeWriter<'a> for OperationalLog {
    type Writer = RecordWriter;
    fn make_writer(&'a self) -> Self::Writer {
        RecordWriter {
            log: self.clone(),
            bytes: Vec::new(),
        }
    }
}

impl Write for RecordWriter {
    fn write(&mut self, bytes: &[u8]) -> io::Result<usize> {
        self.bytes.extend_from_slice(bytes);
        Ok(bytes.len())
    }
    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

impl Drop for RecordWriter {
    fn drop(&mut self) {
        if let Err(error) = self.log.record(&String::from_utf8_lossy(&self.bytes)) {
            // No recursive tracing when the sink itself fails.
            static REPORTED: std::sync::atomic::AtomicBool =
                std::sync::atomic::AtomicBool::new(false);
            if !REPORTED.swap(true, std::sync::atomic::Ordering::Relaxed) {
                std::eprintln!("operational log write failed: {error}");
            }
        }
    }
}

#[cfg(test)]
#[path = "operational_log_tests.rs"]
mod tests;
