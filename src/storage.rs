//! Token persistence backends.
//!
//! Issue #7 requires that the router persist issued tokens with **two**
//! formats by default — a Lino-style text encoding (so humans can audit
//! the token database with a text editor) **and** a binary encoding that
//! is compatible with the [`link-cli`] storage layer.
//!
//! This module provides:
//!
//! - The [`TokenStore`] trait — a small async-ish (sync, for now) API for
//!   listing, persisting, and revoking [`TokenRecord`]s.
//! - [`MemoryTokenStore`] — an in-memory implementation, used in tests and
//!   for [`StoragePolicy::Memory`].
//! - [`TextTokenStore`] — persists records as a Lino-style text file at
//!   `<data_dir>/tokens.lino`. This is the format recommended by
//!   `lino-objects-codec`. We implement a minimal subset of the encoder
//!   internally so we don't depend on the (currently unpublished) crate.
//! - [`BinaryTokenStore`] — persists records as a length-prefixed
//!   binary file at `<data_dir>/tokens.bin`. The format is intentionally
//!   simple and round-trippable; it interoperates with `link-cli` when
//!   the [`crate::cli_backend`] adapter is wired up but does not require
//!   `clink` to be installed.
//! - [`DualTokenStore`] — fans writes out to two stores (typically text +
//!   binary) and reads from the *first* store, falling back to the second
//!   on miss. This is the default when [`StoragePolicy::Both`] is set.
//! - [`build_token_store`] — factory that picks the right combination of
//!   stores based on the [`StoragePolicy`] from configuration.
//!
//! All persistence operations are best-effort: failures are surfaced as
//! [`StorageError`] but never panic, and all read paths gracefully tolerate
//! missing files (returning an empty record set).

// We intentionally hold a write guard across the (insert + flush) pair for
// atomicity; clippy's `significant_drop_tightening` would push us into
// chained calls that lose readability without helping contention in practice.
#![allow(clippy::significant_drop_tightening)]

use std::collections::HashMap;
use std::fs;
use std::io::{self, Read, Write};
use std::path::{Path, PathBuf};
use std::sync::{Arc, RwLock};

use serde::{Deserialize, Serialize};

use crate::config::StoragePolicy;

/// One persisted token record.
///
/// `id` is the JWT `sub` (a UUID); the JWT itself is NOT stored — only the
/// metadata required to list/expire/revoke.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct TokenRecord {
    pub id: String,
    pub label: String,
    pub issued_at: i64,
    pub expires_at: i64,
    pub revoked: bool,
    /// Optional account identifier the token is bound to (multi-account mode).
    #[serde(default)]
    pub account: Option<String>,
}

/// Errors a [`TokenStore`] can return.
#[derive(Debug)]
pub enum StorageError {
    Io(io::Error),
    Codec(String),
    LockPoisoned,
}

impl std::fmt::Display for StorageError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Io(e) => write!(f, "storage I/O error: {e}"),
            Self::Codec(msg) => write!(f, "storage codec error: {msg}"),
            Self::LockPoisoned => write!(f, "storage lock poisoned"),
        }
    }
}

impl std::error::Error for StorageError {}

impl From<io::Error> for StorageError {
    fn from(e: io::Error) -> Self {
        Self::Io(e)
    }
}

/// Persistent token store API.
///
/// Implementations must be cheap to clone (use `Arc` internally) — the
/// router shares them across handler tasks.
pub trait TokenStore: Send + Sync {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError>;
    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError>;
    fn put(&self, record: TokenRecord) -> Result<(), StorageError>;
    fn delete(&self, id: &str) -> Result<bool, StorageError>;
    fn revoke(&self, id: &str) -> Result<bool, StorageError> {
        if let Some(mut rec) = self.get(id)? {
            if rec.revoked {
                return Ok(false);
            }
            rec.revoked = true;
            self.put(rec)?;
            return Ok(true);
        }
        Ok(false)
    }
    fn revoked_ids(&self) -> Result<Vec<String>, StorageError> {
        Ok(self
            .list()?
            .into_iter()
            .filter(|r| r.revoked)
            .map(|r| r.id)
            .collect())
    }
}

/// Trivial in-memory store. No persistence. Useful for tests.
#[derive(Default, Clone)]
pub struct MemoryTokenStore {
    inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
}

impl MemoryTokenStore {
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }
}

impl TokenStore for MemoryTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        guard.insert(record.id.clone(), record);
        Ok(())
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.remove(id).is_some())
    }
}

/// Lino-style text token store.
///
/// File layout (one record per line):
///
/// ```text
/// (token <id> (label "<label>") (issued_at <iat>) (expires_at <exp>) (revoked <bool>) (account "<account>"))
/// ```
///
/// We use a hand-rolled encoder so we don't depend on the unpublished
/// `lino-objects-codec` crate. The shape mirrors Lino syntax (parens, atoms
/// and quoted strings) and round-trips cleanly via the encoder/decoder
/// helpers in this module.
#[derive(Clone)]
pub struct TextTokenStore {
    path: PathBuf,
    inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
}

impl TextTokenStore {
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, StorageError> {
        let path = path.into();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let records = if path.exists() {
            let contents = fs::read_to_string(&path)?;
            decode_lino(&contents).map_err(StorageError::Codec)?
        } else {
            Vec::new()
        };
        let map: HashMap<_, _> = records.into_iter().map(|r| (r.id.clone(), r)).collect();
        Ok(Self {
            path,
            inner: Arc::new(RwLock::new(map)),
        })
    }

    fn flush(&self, guard: &HashMap<String, TokenRecord>) -> Result<(), StorageError> {
        let mut sorted: Vec<&TokenRecord> = guard.values().collect();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        let body = encode_lino(sorted.iter().copied());
        atomic_write(&self.path, body.as_bytes())
    }
}

impl TokenStore for TextTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        guard.insert(record.id.clone(), record);
        self.flush(&guard)
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        let removed = guard.remove(id).is_some();
        if removed {
            self.flush(&guard)?;
        }
        Ok(removed)
    }
}

/// Length-prefixed binary token store.
///
/// File layout:
/// ```text
/// magic = b"LARTOK01"  // 8 bytes
/// repeat:
///     u32 LE record_len
///     <record_len> bytes of JSON-encoded TokenRecord
/// ```
///
/// JSON-on-binary is intentional: it keeps the format trivially auditable
/// and round-trippable while still being length-prefixed and
/// non-text-editor-friendly enough that operators won't accidentally edit
/// it. The [`crate::cli_backend`] adapter can substitute a `clink`-driven
/// implementation when configured.
#[derive(Clone)]
pub struct BinaryTokenStore {
    path: PathBuf,
    inner: Arc<RwLock<HashMap<String, TokenRecord>>>,
}

const BIN_MAGIC: &[u8; 8] = b"LARTOK01";

impl BinaryTokenStore {
    pub fn open(path: impl Into<PathBuf>) -> Result<Self, StorageError> {
        let path = path.into();
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let records = if path.exists() {
            decode_binary(&path)?
        } else {
            Vec::new()
        };
        let map: HashMap<_, _> = records.into_iter().map(|r| (r.id.clone(), r)).collect();
        Ok(Self {
            path,
            inner: Arc::new(RwLock::new(map)),
        })
    }

    fn flush(&self, guard: &HashMap<String, TokenRecord>) -> Result<(), StorageError> {
        let mut sorted: Vec<&TokenRecord> = guard.values().collect();
        sorted.sort_by(|a, b| a.id.cmp(&b.id));
        let mut buf: Vec<u8> = Vec::with_capacity(8 + sorted.len() * 128);
        buf.extend_from_slice(BIN_MAGIC);
        for rec in sorted {
            let json = serde_json::to_vec(rec).map_err(|e| StorageError::Codec(e.to_string()))?;
            let len = u32::try_from(json.len())
                .map_err(|_| StorageError::Codec("record too large".into()))?;
            buf.extend_from_slice(&len.to_le_bytes());
            buf.extend_from_slice(&json);
        }
        atomic_write(&self.path, &buf)
    }
}

impl TokenStore for BinaryTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.values().cloned().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        let guard = self.inner.read().map_err(|_| StorageError::LockPoisoned)?;
        Ok(guard.get(id).cloned())
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        guard.insert(record.id.clone(), record);
        self.flush(&guard)
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let mut guard = self.inner.write().map_err(|_| StorageError::LockPoisoned)?;
        let removed = guard.remove(id).is_some();
        if removed {
            self.flush(&guard)?;
        }
        Ok(removed)
    }
}

fn decode_binary(path: &Path) -> Result<Vec<TokenRecord>, StorageError> {
    let mut f = fs::File::open(path)?;
    let mut magic = [0u8; 8];
    if let Err(e) = f.read_exact(&mut magic) {
        if e.kind() == io::ErrorKind::UnexpectedEof {
            return Ok(Vec::new());
        }
        return Err(e.into());
    }
    if &magic != BIN_MAGIC {
        return Err(StorageError::Codec("invalid binary magic header".into()));
    }
    let mut out = Vec::new();
    loop {
        let mut len_buf = [0u8; 4];
        match f.read_exact(&mut len_buf) {
            Ok(()) => {}
            Err(e) if e.kind() == io::ErrorKind::UnexpectedEof => break,
            Err(e) => return Err(e.into()),
        }
        let len = u32::from_le_bytes(len_buf) as usize;
        let mut data = vec![0u8; len];
        f.read_exact(&mut data)?;
        let rec: TokenRecord =
            serde_json::from_slice(&data).map_err(|e| StorageError::Codec(e.to_string()))?;
        out.push(rec);
    }
    Ok(out)
}

/// Dual-write store: every mutation goes to *both* primary and secondary;
/// reads consult the primary first, falling back to the secondary on miss.
///
/// Used for [`StoragePolicy::Both`] so the text and binary files stay in
/// sync. The configured order is `text` (primary) → `binary` (secondary).
pub struct DualTokenStore {
    pub primary: Arc<dyn TokenStore>,
    pub secondary: Arc<dyn TokenStore>,
}

impl TokenStore for DualTokenStore {
    fn list(&self) -> Result<Vec<TokenRecord>, StorageError> {
        let mut by_id: HashMap<String, TokenRecord> = HashMap::new();
        for rec in self.primary.list()? {
            by_id.insert(rec.id.clone(), rec);
        }
        for rec in self.secondary.list()? {
            by_id.entry(rec.id.clone()).or_insert(rec);
        }
        Ok(by_id.into_values().collect())
    }

    fn get(&self, id: &str) -> Result<Option<TokenRecord>, StorageError> {
        if let Some(rec) = self.primary.get(id)? {
            return Ok(Some(rec));
        }
        self.secondary.get(id)
    }

    fn put(&self, record: TokenRecord) -> Result<(), StorageError> {
        self.primary.put(record.clone())?;
        self.secondary.put(record)?;
        Ok(())
    }

    fn delete(&self, id: &str) -> Result<bool, StorageError> {
        let a = self.primary.delete(id)?;
        let b = self.secondary.delete(id)?;
        Ok(a || b)
    }
}

/// Build a [`TokenStore`] following the configured [`StoragePolicy`].
pub fn build_token_store(
    policy: StoragePolicy,
    data_dir: &Path,
) -> Result<Arc<dyn TokenStore>, StorageError> {
    match policy {
        StoragePolicy::Memory => Ok(Arc::new(MemoryTokenStore::new())),
        StoragePolicy::Text => {
            let s = TextTokenStore::open(data_dir.join("tokens.lino"))?;
            Ok(Arc::new(s))
        }
        StoragePolicy::Binary => {
            let s = BinaryTokenStore::open(data_dir.join("tokens.bin"))?;
            Ok(Arc::new(s))
        }
        StoragePolicy::Both => {
            let text = Arc::new(TextTokenStore::open(data_dir.join("tokens.lino"))?);
            let binary = Arc::new(BinaryTokenStore::open(data_dir.join("tokens.bin"))?);
            Ok(Arc::new(DualTokenStore {
                primary: text,
                secondary: binary,
            }))
        }
    }
}

// =====================================================================
// Lino-style text codec
// =====================================================================

fn encode_lino<'a>(records: impl IntoIterator<Item = &'a TokenRecord>) -> String {
    let mut out = String::new();
    out.push_str("# Link.Assistant.Router token store\n");
    out.push_str("# Format: (token <id> (label \"...\") ...)\n");
    for rec in records {
        out.push('(');
        out.push_str("token ");
        out.push_str(&rec.id);
        out.push_str(" (label ");
        write_quoted(&mut out, &rec.label);
        out.push_str(") (issued_at ");
        out.push_str(&rec.issued_at.to_string());
        out.push_str(") (expires_at ");
        out.push_str(&rec.expires_at.to_string());
        out.push_str(") (revoked ");
        out.push_str(if rec.revoked { "true" } else { "false" });
        out.push(')');
        if let Some(ref acc) = rec.account {
            out.push_str(" (account ");
            write_quoted(&mut out, acc);
            out.push(')');
        }
        out.push_str(")\n");
    }
    out
}

fn write_quoted(out: &mut String, s: &str) {
    out.push('"');
    for ch in s.chars() {
        match ch {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c => out.push(c),
        }
    }
    out.push('"');
}

fn decode_lino(input: &str) -> Result<Vec<TokenRecord>, String> {
    let mut out = Vec::new();
    for raw in input.lines() {
        let line = raw.trim();
        if line.is_empty() || line.starts_with('#') {
            continue;
        }
        out.push(parse_record_line(line)?);
    }
    Ok(out)
}

fn parse_record_line(line: &str) -> Result<TokenRecord, String> {
    // Expected outer shape: (token <id> <fields...>)
    let inner = line
        .strip_prefix('(')
        .and_then(|s| s.strip_suffix(')'))
        .ok_or_else(|| format!("expected parens around record: {line}"))?
        .trim();
    let mut tokens = LinoTokens::new(inner);
    let kind = tokens
        .next_atom()
        .ok_or_else(|| "missing record kind".to_string())?;
    if kind != "token" {
        return Err(format!("unexpected record kind: {kind}"));
    }
    let id = tokens
        .next_atom()
        .ok_or_else(|| "missing token id".to_string())?
        .to_string();
    let mut label = String::new();
    let mut issued_at = 0i64;
    let mut expires_at = 0i64;
    let mut revoked = false;
    let mut account: Option<String> = None;
    while let Some(field) = tokens.next_paren_group() {
        let mut inner = LinoTokens::new(field);
        let key = inner
            .next_atom()
            .ok_or_else(|| "field missing key".to_string())?;
        match key {
            "label" => {
                label = inner
                    .next_string()
                    .ok_or_else(|| "label missing value".to_string())?;
            }
            "issued_at" => {
                let v = inner
                    .next_atom()
                    .ok_or_else(|| "issued_at missing value".to_string())?;
                issued_at = v
                    .parse()
                    .map_err(|e: std::num::ParseIntError| e.to_string())?;
            }
            "expires_at" => {
                let v = inner
                    .next_atom()
                    .ok_or_else(|| "expires_at missing value".to_string())?;
                expires_at = v
                    .parse()
                    .map_err(|e: std::num::ParseIntError| e.to_string())?;
            }
            "revoked" => {
                let v = inner
                    .next_atom()
                    .ok_or_else(|| "revoked missing value".to_string())?;
                revoked = matches!(v, "true" | "1" | "yes");
            }
            "account" => {
                account = inner.next_string();
            }
            other => return Err(format!("unknown field: {other}")),
        }
    }
    Ok(TokenRecord {
        id,
        label,
        issued_at,
        expires_at,
        revoked,
        account,
    })
}

struct LinoTokens<'a> {
    rest: &'a str,
}

impl<'a> LinoTokens<'a> {
    const fn new(input: &'a str) -> Self {
        Self { rest: input }
    }

    fn skip_ws(&mut self) {
        self.rest = self.rest.trim_start();
    }

    fn next_atom(&mut self) -> Option<&'a str> {
        self.skip_ws();
        if self.rest.is_empty() || self.rest.starts_with('(') || self.rest.starts_with('"') {
            return None;
        }
        let end = self
            .rest
            .find(|c: char| c.is_whitespace() || c == '(' || c == ')')
            .unwrap_or(self.rest.len());
        let (atom, rest) = self.rest.split_at(end);
        self.rest = rest;
        Some(atom)
    }

    fn next_string(&mut self) -> Option<String> {
        self.skip_ws();
        let bytes = self.rest.as_bytes();
        if bytes.first() != Some(&b'"') {
            return None;
        }
        let mut out = String::new();
        let mut i = 1usize;
        while i < bytes.len() {
            let c = bytes[i];
            if c == b'\\' && i + 1 < bytes.len() {
                let esc = bytes[i + 1];
                match esc {
                    b'"' => out.push('"'),
                    b'\\' => out.push('\\'),
                    b'n' => out.push('\n'),
                    b'r' => out.push('\r'),
                    b't' => out.push('\t'),
                    other => out.push(other as char),
                }
                i += 2;
            } else if c == b'"' {
                self.rest = &self.rest[i + 1..];
                return Some(out);
            } else {
                out.push(c as char);
                i += 1;
            }
        }
        None
    }

    fn next_paren_group(&mut self) -> Option<&'a str> {
        self.skip_ws();
        if !self.rest.starts_with('(') {
            return None;
        }
        let bytes = self.rest.as_bytes();
        let mut depth = 0i32;
        let mut in_str = false;
        let mut escape = false;
        let mut end = 0usize;
        for (idx, &b) in bytes.iter().enumerate() {
            if escape {
                escape = false;
                continue;
            }
            if in_str {
                match b {
                    b'\\' => escape = true,
                    b'"' => in_str = false,
                    _ => {}
                }
                continue;
            }
            match b {
                b'"' => in_str = true,
                b'(' => depth += 1,
                b')' => {
                    depth -= 1;
                    if depth == 0 {
                        end = idx + 1;
                        break;
                    }
                }
                _ => {}
            }
        }
        if end == 0 {
            return None;
        }
        let group = &self.rest[1..end - 1];
        self.rest = &self.rest[end..];
        Some(group)
    }
}

fn atomic_write(path: &Path, contents: &[u8]) -> Result<(), StorageError> {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let tmp = path.with_extension("tmp");
    {
        let mut f = fs::File::create(&tmp)?;
        f.write_all(contents)?;
        f.sync_all()?;
    }
    fs::rename(&tmp, path)?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample_record(id: &str) -> TokenRecord {
        TokenRecord {
            id: id.into(),
            label: "test \"label\"".into(),
            issued_at: 1_700_000_000,
            expires_at: 1_700_001_000,
            revoked: false,
            account: Some("primary".into()),
        }
    }

    #[test]
    fn memory_store_roundtrip() {
        let s = MemoryTokenStore::new();
        s.put(sample_record("a")).unwrap();
        assert_eq!(s.list().unwrap().len(), 1);
        assert!(s.get("a").unwrap().is_some());
        assert!(s.delete("a").unwrap());
        assert!(s.get("a").unwrap().is_none());
    }

    #[test]
    fn text_store_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.lino");
        let s = TextTokenStore::open(&path).unwrap();
        s.put(sample_record("a")).unwrap();
        s.put(sample_record("b")).unwrap();
        let s2 = TextTokenStore::open(&path).unwrap();
        let mut list = s2.list().unwrap();
        list.sort_by(|x, y| x.id.cmp(&y.id));
        assert_eq!(list.len(), 2);
        assert_eq!(list[0].id, "a");
        assert_eq!(list[0].label, "test \"label\"");
        assert_eq!(list[0].account.as_deref(), Some("primary"));
    }

    #[test]
    fn binary_store_roundtrip() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.bin");
        let s = BinaryTokenStore::open(&path).unwrap();
        s.put(sample_record("a")).unwrap();
        s.put(sample_record("b")).unwrap();
        let s2 = BinaryTokenStore::open(&path).unwrap();
        let mut list = s2.list().unwrap();
        list.sort_by(|x, y| x.id.cmp(&y.id));
        assert_eq!(list.len(), 2);
        assert_eq!(list[1].id, "b");
    }

    #[test]
    fn dual_store_writes_both() {
        let dir = tempdir().unwrap();
        let text = Arc::new(TextTokenStore::open(dir.path().join("a.lino")).unwrap());
        let bin = Arc::new(BinaryTokenStore::open(dir.path().join("a.bin")).unwrap());
        let dual = DualTokenStore {
            primary: text.clone(),
            secondary: bin.clone(),
        };
        dual.put(sample_record("a")).unwrap();
        assert_eq!(text.list().unwrap().len(), 1);
        assert_eq!(bin.list().unwrap().len(), 1);
    }

    #[test]
    fn revoke_marks_record() {
        let s = MemoryTokenStore::new();
        s.put(sample_record("a")).unwrap();
        assert!(s.revoke("a").unwrap());
        assert!(s.get("a").unwrap().unwrap().revoked);
        // second revoke is a no-op
        assert!(!s.revoke("a").unwrap());
        // unknown id returns false
        assert!(!s.revoke("missing").unwrap());
    }

    #[test]
    fn build_token_store_dispatches_correctly() {
        let dir = tempdir().unwrap();
        let mem = build_token_store(StoragePolicy::Memory, dir.path()).unwrap();
        mem.put(sample_record("m")).unwrap();
        assert!(mem.get("m").unwrap().is_some());

        let text = build_token_store(StoragePolicy::Text, dir.path()).unwrap();
        text.put(sample_record("t")).unwrap();
        assert!(dir.path().join("tokens.lino").exists());

        let bin = build_token_store(StoragePolicy::Binary, dir.path()).unwrap();
        bin.put(sample_record("b")).unwrap();
        assert!(dir.path().join("tokens.bin").exists());

        let dual = build_token_store(StoragePolicy::Both, dir.path()).unwrap();
        dual.put(sample_record("d")).unwrap();
        // both files updated
        let text_contents = std::fs::read_to_string(dir.path().join("tokens.lino")).unwrap();
        assert!(text_contents.contains("(token d "));
    }

    #[test]
    fn lino_codec_handles_special_chars() {
        let rec = TokenRecord {
            id: "id1".into(),
            label: "with \"quote\" and \\ backslash and\nnewline".into(),
            issued_at: 1,
            expires_at: 2,
            revoked: true,
            account: None,
        };
        let s = encode_lino(std::iter::once(&rec));
        let parsed = decode_lino(&s).unwrap();
        assert_eq!(parsed.len(), 1);
        assert_eq!(parsed[0], rec);
    }
}
