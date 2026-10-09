//! Opt-in, bounded downloads of consumed upstream error responses.
use std::fs;
use std::io;
use std::io::Read as _;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};

use futures_util::StreamExt as _;
use reqwest::ResponseBuilderExt as _;
use serde_json::{Value, json};

/// Default total error-file budget when capture is explicitly enabled.
pub const DEFAULT_MAX_BYTES: u64 = 10 * 1024 * 1024;
const MAX_BODY_BYTES: usize = 1024 * 1024;
const MAX_DOCUMENT_BYTES: u64 = 8 * 1024 * 1024;

/// Private error store, separate from request, operational, and audit logs.
#[derive(Debug)]
pub struct ErrorLog {
    root: PathBuf,
    max_bytes: u64,
    generation: Mutex<u64>,
}

impl ErrorLog {
    /// Create a store; no directory is created until the first captured error.
    #[must_use]
    pub const fn new(root: PathBuf, max_bytes: u64) -> Self {
        Self {
            root,
            max_bytes,
            generation: Mutex::new(0),
        }
    }

    /// Enable capture only for a nonempty `ERROR_LOG_DIR`.
    #[must_use]
    pub fn from_env() -> Option<Arc<Self>> {
        let root = crate::operation_context::var_os("ERROR_LOG_DIR").filter(|v| !v.is_empty())?;
        let max_bytes = crate::operation_context::var("ERROR_LOG_MAX_BYTES")
            .ok()
            .and_then(|v| v.parse().ok())
            .unwrap_or(DEFAULT_MAX_BYTES);
        Some(Arc::new(Self::new(root.into(), max_bytes)))
    }

    /// Enumerate only Router-owned regular files, oldest first.
    pub fn list(&self) -> io::Result<Vec<Value>> {
        let _guard = self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        self.files().map(|files| {
            files
                .into_iter()
                .map(|(name, bytes)| json!({"name": name, "bytes": bytes}))
                .collect()
        })
    }

    /// Read a named capture without accepting paths or symlinks.
    pub fn read(&self, name: &str) -> io::Result<Vec<u8>> {
        let _guard = self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if !valid_name(name) {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "invalid error filename",
            ));
        }
        let files = self.files()?;
        if !files.iter().any(|(file, _)| file == name) {
            return Err(io::Error::from(io::ErrorKind::NotFound));
        }
        let mut contents = Vec::new();
        let limit = self.max_bytes.min(MAX_DOCUMENT_BYTES);
        fs::File::open(self.root.join(name))?
            .take(limit.saturating_add(1))
            .read_to_end(&mut contents)?;
        if contents.len() as u64 > limit {
            return Err(io::Error::other("error document exceeds download limit"));
        }
        Ok(contents)
    }

    /// Clear captures and invalidate buffers from requests already in flight.
    pub fn clear(&self) -> io::Result<()> {
        let mut generation = self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *generation = generation.wrapping_add(1);
        for (name, _) in self.files()? {
            fs::remove_file(self.root.join(name))?;
        }
        drop(generation);
        Ok(())
    }

    fn files(&self) -> io::Result<Vec<(String, u64)>> {
        let metadata = match fs::symlink_metadata(&self.root) {
            Ok(metadata) => metadata,
            Err(error) if error.kind() == io::ErrorKind::NotFound => return Ok(Vec::new()),
            Err(error) => return Err(error),
        };
        if !metadata.is_dir() {
            return Err(io::Error::new(
                io::ErrorKind::InvalidInput,
                "error log root must be a directory",
            ));
        }
        let mut files = Vec::new();
        for entry in fs::read_dir(&self.root)? {
            let entry = entry?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if valid_name(&name) && entry.file_type()?.is_file() {
                files.push((name, entry.metadata()?.len()));
            }
        }
        files.sort_by(|a, b| a.0.cmp(&b.0));
        Ok(files)
    }

    fn save(&self, capture: &Capture) -> io::Result<()> {
        let generation = self
            .generation
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        if *generation != capture.generation || self.max_bytes == 0 {
            return Ok(());
        }
        let body = if capture.truncated || !capture.complete {
            json!("[OMITTED: incomplete or oversized error body]")
        } else {
            crate::request_log::redacted_body(&capture.bytes)
        };
        let contents = serde_json::to_vec(&json!({
            "id": capture.id, "status": capture.status, "body": body,
            "complete": capture.complete, "truncated": capture.truncated,
        }))?;
        if contents.len() as u64 > self.max_bytes.min(MAX_DOCUMENT_BYTES) {
            return Ok(());
        }
        // Validate before tightening permissions or writing through a symlink.
        let files = self.files()?;
        let mut total = files
            .iter()
            .fold(0_u64, |total, (_, bytes)| total.saturating_add(*bytes));
        for (name, bytes) in files {
            if total.saturating_add(contents.len() as u64) <= self.max_bytes {
                break;
            }
            fs::remove_file(self.root.join(name))?;
            total = total.saturating_sub(bytes);
        }
        crate::request_log::owner_only::ensure_owner_only_dir(&self.root)?;
        let time = std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(io::Error::other)?
            .as_nanos();
        let name = format!("error-{time:020}-{}.json", uuid::Uuid::new_v4());
        let result =
            crate::request_log::owner_only::write_owner_only(&self.root.join(name), &contents);
        drop(generation);
        result
    }

    /// Tee an error stream without eager reads, extra requests, or response changes.
    pub(crate) fn wrap(
        self: &Arc<Self>,
        id: &str,
        response: reqwest::Response,
    ) -> reqwest::Response {
        if !response.status().is_client_error() && !response.status().is_server_error() {
            return response;
        }
        let status = response.status();
        let headers = response.headers().clone();
        let version = response.version();
        let url = response.url().clone();
        let capture = Capture {
            log: Arc::clone(self),
            id: id.to_owned(),
            status: status.as_u16(),
            generation: *self
                .generation
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner),
            bytes: Vec::new(),
            complete: false,
            truncated: false,
        };
        let stream = futures_util::stream::unfold(
            (response.bytes_stream().boxed(), capture),
            |(mut stream, mut capture)| async move {
                if let Some(chunk) = stream.next().await {
                    if let Ok(bytes) = &chunk {
                        let limit = MAX_BODY_BYTES
                            .min(usize::try_from(capture.log.max_bytes).unwrap_or(MAX_BODY_BYTES));
                        let take = bytes.len().min(limit.saturating_sub(capture.bytes.len()));
                        capture.bytes.extend_from_slice(&bytes[..take]);
                        capture.truncated |= take < bytes.len();
                    } else {
                        capture.truncated = true;
                    }
                    Some((chunk, (stream, capture)))
                } else {
                    capture.complete = true;
                    drop(capture);
                    None
                }
            },
        );
        let mut replacement = http::Response::builder()
            .status(status)
            .version(version)
            .url(url)
            .body(reqwest::Body::wrap_stream(stream))
            .expect("valid upstream response");
        *replacement.headers_mut() = headers;
        replacement.into()
    }
}

struct Capture {
    log: Arc<ErrorLog>,
    id: String,
    status: u16,
    generation: u64,
    bytes: Vec<u8>,
    complete: bool,
    truncated: bool,
}

impl Drop for Capture {
    fn drop(&mut self) {
        if let Err(error) = self.log.save(self) {
            tracing::warn!("error capture write failed: {error}");
        }
    }
}

fn valid_name(name: &str) -> bool {
    name.strip_prefix("error-")
        .and_then(|v| v.strip_suffix(".json"))
        .and_then(|v| v.split_once('-'))
        .is_some_and(|(time, id)| {
            time.len() == 20
                && time.bytes().all(|v| v.is_ascii_digit())
                && uuid::Uuid::parse_str(id).is_ok()
        })
}
