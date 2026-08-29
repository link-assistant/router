use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};

use base64::Engine;
use base64::engine::general_purpose::STANDARD_NO_PAD;
use doublets::mem::unit::LinkPart;
use doublets::{Doublets, DoubletsExt, Links, unit};
use link_cli::storage::PersistentFileMapped;
use lino_objects_codec::LinoValue;

use super::{StorageError, TokenRecord};

const TYPE: &str = "Type";
const TOKEN_RECORD: &str = "TokenRecord";
const SUBTYPE: &str = "SubType";
const VALUE: &str = "Value";
const STORAGE_FORMAT: &str = "StorageFormat";
const FORMAT_VERSION: &str = "router-token-doublets-v1";
const RECORD_PREFIX: &str = "Record/";

const STRING_TAG: usize = 1;
const EDGE_TAG: usize = 2;
const EMPTY_SEQUENCE: usize = 3;
const BYTE_NODE_START: usize = 4;
const SCHEMA_NODE_COUNT: usize = 259;

/// The mapping the store is built on.
///
/// `link-cli`'s `PersistentFileMapped` is the maintained answer to the one
/// thing the router used to keep an `unsafe` adapter of its own for: `doublets`
/// grows its memory through `RawMem::grow_filled`, whose default fills the
/// *whole* new region -- including the part already backed by bytes on disk --
/// so reopening a file-mapped store zeroed it. `PersistentFileMapped` forwards
/// to `grow_filled_exact`, which fills only the genuinely uninitialised tail
/// (issue #372).
type FileStore = unit::Store<usize, PersistentFileMapped<LinkPart<usize>>>;

#[derive(Debug, Clone, PartialEq, Eq, PartialOrd, Ord)]
struct SemanticLink {
    source: String,
    target: String,
}

impl SemanticLink {
    fn new(source: impl Into<String>, target: impl Into<String>) -> Self {
        Self {
            source: source.into(),
            target: target.into(),
        }
    }
}

pub(super) fn encode_text<'a>(records: impl IntoIterator<Item = &'a TokenRecord>) -> String {
    let records = records
        .into_iter()
        .map(record_to_lino_value)
        .collect::<Vec<_>>();
    lino_objects_codec::encode(&LinoValue::object([
        ("type", LinoValue::String("RouterState".into())),
        ("subtype", LinoValue::String("TokenStore".into())),
        ("value", LinoValue::Array(records)),
    ]))
}

pub(super) fn decode_text(input: &str) -> Result<Vec<TokenRecord>, String> {
    let root = lino_objects_codec::decode(input).map_err(|error| error.to_string())?;
    expect_string_field(&root, "type", "token store")?
        .eq("RouterState")
        .then_some(())
        .ok_or_else(|| "token store type must be RouterState".to_string())?;
    expect_string_field(&root, "subtype", "token store")?
        .eq("TokenStore")
        .then_some(())
        .ok_or_else(|| "token store subtype must be TokenStore".to_string())?;
    let records = object_field(&root, "value", "token store")?;
    let LinoValue::Array(records) = records else {
        return Err("token store value must be an array".into());
    };
    records.iter().map(record_from_lino_value).collect()
}

fn record_to_lino_value(record: &TokenRecord) -> LinoValue {
    LinoValue::object([
        ("type", LinoValue::String(TOKEN_RECORD.into())),
        ("subtype", LinoValue::String(record.id.clone())),
        (
            "value",
            LinoValue::object([
                ("id", LinoValue::String(record.id.clone())),
                ("label", LinoValue::String(record.label.clone())),
                ("issued_at", LinoValue::Int(record.issued_at)),
                ("expires_at", LinoValue::Int(record.expires_at)),
                ("revoked", LinoValue::Bool(record.revoked)),
                (
                    "account",
                    record
                        .account
                        .as_ref()
                        .map_or(LinoValue::Null, |value| LinoValue::String(value.clone())),
                ),
                (
                    "sliding_window_seconds",
                    record
                        .sliding_window_seconds
                        .map_or(LinoValue::Null, |value| {
                            LinoValue::String(value.to_string())
                        }),
                ),
                (
                    "max_requests",
                    record.max_requests.map_or(LinoValue::Null, |value| {
                        LinoValue::String(value.to_string())
                    }),
                ),
                (
                    "used_requests",
                    LinoValue::String(record.used_requests.to_string()),
                ),
                (
                    "max_tokens",
                    record.max_tokens.map_or(LinoValue::Null, |value| {
                        LinoValue::String(value.to_string())
                    }),
                ),
                (
                    "used_tokens",
                    LinoValue::String(record.used_tokens.to_string()),
                ),
                (
                    "reserved_tokens",
                    LinoValue::String(record.reserved_tokens.to_string()),
                ),
                (
                    "rate_limit_per_minute",
                    record
                        .rate_limit_per_minute
                        .map_or(LinoValue::Null, |value| {
                            LinoValue::String(value.to_string())
                        }),
                ),
                (
                    "rate_window_started_at",
                    LinoValue::String(record.rate_window_started_at.to_string()),
                ),
                (
                    "rate_window_requests",
                    LinoValue::String(record.rate_window_requests.to_string()),
                ),
                ("scope", LinoValue::String(record.scope.clone())),
                (
                    // Joined rather than nested: the record shape is flat
                    // scalars, and a repository name cannot contain a comma.
                    "github_repos",
                    LinoValue::String(record.github_repos.join(",")),
                ),
            ]),
        ),
    ])
}

fn record_from_lino_value(value: &LinoValue) -> Result<TokenRecord, String> {
    if expect_string_field(value, "type", "record")? != TOKEN_RECORD {
        return Err("record type must be TokenRecord".into());
    }
    let subtype = expect_string_field(value, "subtype", "record")?;
    let fields = object_field(value, "value", "record")?;
    let id = expect_string_field(fields, "id", "record value")?.to_string();
    if subtype != id {
        return Err("record subtype must match its id".into());
    }
    Ok(TokenRecord {
        id,
        label: expect_string_field(fields, "label", "record value")?.to_string(),
        issued_at: expect_i64_field(fields, "issued_at", "record value")?,
        expires_at: expect_i64_field(fields, "expires_at", "record value")?,
        revoked: expect_bool_field(fields, "revoked", "record value")?,
        account: optional_string_field(fields, "account", "record value")?,
        sliding_window_seconds: optional_u64_field(
            fields,
            "sliding_window_seconds",
            "record value",
        )?
        .and_then(|value| i64::try_from(value).ok()),
        max_requests: optional_u64_field(fields, "max_requests", "record value")?,
        used_requests: expect_u64_field(fields, "used_requests", "record value")?,
        max_tokens: optional_u64_field(fields, "max_tokens", "record value")?,
        used_tokens: optional_u64_field(fields, "used_tokens", "record value")?.unwrap_or(0),
        reserved_tokens: optional_u64_field(fields, "reserved_tokens", "record value")?
            .unwrap_or(0),
        rate_limit_per_minute: optional_u64_field(fields, "rate_limit_per_minute", "record value")?,
        rate_window_started_at: optional_i64_string_field(
            fields,
            "rate_window_started_at",
            "record value",
        )?
        .unwrap_or(0),
        rate_window_requests: optional_u64_field(fields, "rate_window_requests", "record value")?
            .unwrap_or(0),
        scope: expect_string_field(fields, "scope", "record value")?.to_string(),
        github_repos: split_repository_list(
            // Absent in every record written before this field existed, so a
            // missing key is "unrestricted" rather than a malformed store.
            &optional_string_field(fields, "github_repos", "record value")
                .unwrap_or_default()
                .unwrap_or_default(),
        ),
    })
}

fn object_field<'a>(
    value: &'a LinoValue,
    key: &str,
    context: &str,
) -> Result<&'a LinoValue, String> {
    let LinoValue::Object(fields) = value else {
        return Err(format!("{context} must be an object"));
    };
    fields
        .iter()
        .find_map(|(field, value)| (field == key).then_some(value))
        .ok_or_else(|| format!("{context} is missing {key}"))
}

fn expect_string_field<'a>(
    value: &'a LinoValue,
    key: &str,
    context: &str,
) -> Result<&'a str, String> {
    match object_field(value, key, context)? {
        LinoValue::String(value) => Ok(value),
        _ => Err(format!("{context}.{key} must be a string")),
    }
}

fn expect_i64_field(value: &LinoValue, key: &str, context: &str) -> Result<i64, String> {
    match object_field(value, key, context)? {
        LinoValue::Int(value) => Ok(*value),
        _ => Err(format!("{context}.{key} must be an integer")),
    }
}

fn expect_bool_field(value: &LinoValue, key: &str, context: &str) -> Result<bool, String> {
    match object_field(value, key, context)? {
        LinoValue::Bool(value) => Ok(*value),
        _ => Err(format!("{context}.{key} must be a boolean")),
    }
}

fn expect_u64_field(value: &LinoValue, key: &str, context: &str) -> Result<u64, String> {
    expect_string_field(value, key, context)?
        .parse()
        .map_err(|error| format!("{context}.{key} is invalid: {error}"))
}

/// Split a stored repository allow-list back into its entries.
///
/// Empty means unrestricted, which is what every record written before this
/// field carried, so an older store keeps working unchanged (issue #262).
fn split_repository_list(joined: &str) -> Vec<String> {
    joined
        .split(',')
        .map(str::trim)
        .filter(|entry| !entry.is_empty())
        .map(str::to_string)
        .collect()
}

fn optional_string_field(
    value: &LinoValue,
    key: &str,
    context: &str,
) -> Result<Option<String>, String> {
    match object_field(value, key, context)? {
        LinoValue::Null => Ok(None),
        LinoValue::String(value) => Ok(Some(value.clone())),
        _ => Err(format!("{context}.{key} must be a string or null")),
    }
}

fn optional_u64_field(value: &LinoValue, key: &str, context: &str) -> Result<Option<u64>, String> {
    let LinoValue::Object(fields) = value else {
        return Err(format!("{context} must be an object"));
    };
    let Some(value) = fields
        .iter()
        .find_map(|(field, value)| (field == key).then_some(value))
    else {
        return Ok(None);
    };
    match value {
        LinoValue::Null => Ok(None),
        LinoValue::String(value) => value
            .parse()
            .map(Some)
            .map_err(|error| format!("{context}.{key} is invalid: {error}")),
        _ => Err(format!("{context}.{key} must be a string or null")),
    }
}

fn optional_i64_string_field(
    value: &LinoValue,
    key: &str,
    context: &str,
) -> Result<Option<i64>, String> {
    let LinoValue::Object(fields) = value else {
        return Err(format!("{context} must be an object"));
    };
    let Some(value) = fields
        .iter()
        .find_map(|(field, value)| (field == key).then_some(value))
    else {
        return Ok(None);
    };
    match value {
        LinoValue::String(value) => value
            .parse()
            .map(Some)
            .map_err(|error| format!("{context}.{key} is invalid: {error}")),
        _ => Err(format!("{context}.{key} must be a string")),
    }
}

/// A doublets store held open for the lifetime of the process.
///
/// The store this crate is built on is a memory-mapped file, and it is meant to
/// be opened once and kept. Reopening it per access cost a full open-map-build
/// -teardown cycle every time, and on the write path a complete reconstruction
/// of the semantic links network -- which is what made a read-only `list()` take
/// seconds while the underlying disk write was a fraction of that (issue #357).
///
/// Writing through the held mapping is also what makes holding it *safe*. The
/// previous write path built a fresh file and `rename`d it over the old one,
/// which replaces the inode: a process holding the store would have kept
/// reading the replaced inode and never seen another process's writes. Mutating
/// the mapping in place keeps every process pointed at the same inode, and the
/// mapping is `MAP_SHARED`, so a write is visible to the others as soon as it
/// lands. Durability is the kernel's: dirty pages are written back on its own
/// schedule, and the mapping is synced when it is closed.
pub(super) struct PersistentStore {
    store: FileStore,
    path: PathBuf,
    /// The rebuild in progress, not yet in place of [`Self::path`].
    pending: Option<PathBuf>,
}

impl PersistentStore {
    /// Open the file once, creating it when it does not exist yet.
    pub(super) fn open(path: &Path) -> Result<Self, StorageError> {
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent)?;
        }
        let mut options = OpenOptions::new();
        options.read(true).write(true).create(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let file = options.open(path)?;
        let mapped = PersistentFileMapped::new(file)?;
        let store = unit::Store::<usize, _>::new(mapped)
            .map_err(|error| codec_error("open doublets store", error))?;
        Ok(Self {
            store,
            path: path.to_path_buf(),
            pending: None,
        })
    }

    /// Point this store at the file the path names now, if it moved.
    ///
    /// Another process rebuilds by renaming a replacement over the path, which
    /// swaps the inode. Our mapping still refers to the old one, so it has to
    /// be dropped and remade or this store answers from a file nobody writes
    /// to any more (issue #357).
    pub(super) fn remap(&mut self) -> Result<(), StorageError> {
        let file = OpenOptions::new().read(true).write(true).open(&self.path)?;
        let mapped = PersistentFileMapped::new(file)?;
        self.store = unit::Store::<usize, _>::new(mapped)
            .map_err(|error| codec_error("reopen doublets store", error))?;
        Ok(())
    }

    /// Every record currently in the store.
    pub(super) fn records(&self) -> Result<Vec<TokenRecord>, StorageError> {
        // A store that has never been written has no schema to validate.
        if self.store.count() == 0 {
            return Ok(Vec::new());
        }
        let links = read_semantic_links(&self.store)?;
        links_to_records(&links).map_err(StorageError::Codec)
    }

    /// Replace the store's contents with `records`.
    ///
    /// The links network is rebuilt from empty, so the old one has to go first;
    /// see [`Self::reset`] for why it goes by being replaced rather than
    /// emptied in place.
    pub(super) fn replace<'a>(
        &mut self,
        records: impl IntoIterator<Item = &'a TokenRecord>,
    ) -> Result<(), StorageError> {
        self.reset()?;
        let mut strings = HashMap::new();
        write_semantic_links(&mut self.store, &mut strings, records)?;
        self.publish()
    }

    /// Empty the store by replacing the file, then remap the new one.
    ///
    /// doublets 0.5 fixed `Doublets::delete_all`, which on 0.4 either panicked
    /// with `attempt to subtract with overflow` inside `platform-trees`'
    /// `detach_core` or failed to terminate on a store holding real links.
    /// Emptying in place is therefore possible now -- and still wrong here, for
    /// a second reason the 0.4 defect used to hide.
    ///
    /// A second router process learns that this one wrote by `stat`ing the
    /// file: `BinaryTokenStore` compares length and modification time before
    /// every read, so it pays a full parse only when they moved (issue #357).
    /// A write through a mapping this process *holds* moves neither. Linux
    /// bumps `mtime` from `filemap_page_mkwrite`, when a **clean** page is
    /// first dirtied; a rebuild that lands on pages already dirty from the
    /// previous one bumps nothing, and the length does not change because the
    /// mapping never shrinks. `experiments/issue-372` measures exactly that --
    /// two consecutive rebuilds through one held mapping leave an identical
    /// `(len, mtime)` -- so an in-place reset would make the other process miss
    /// the write entirely.
    ///
    /// Replacing the file moves both. `set_len(0)` on the live file would move
    /// them too, and is not an option either: it unmaps the pages another
    /// process is still reading, and that process dies with **SIGBUS** the
    /// moment it touches one -- observed as exit code 138 from a concurrent
    /// `tokens issue`. So the rebuild goes to a temporary and [`Self::publish`]
    /// renames it into place.
    fn reset(&mut self) -> Result<(), StorageError> {
        let parent = self
            .path
            .parent()
            .ok_or_else(|| std::io::Error::other("storage path has no parent directory"))?;
        fs::create_dir_all(parent)?;
        let temporary = self.path.with_extension("rebuild");
        let _ = fs::remove_file(&temporary);
        let mut options = OpenOptions::new();
        options.read(true).write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let file = options.open(&temporary)?;
        let mapped = PersistentFileMapped::new(file)?;
        self.store = unit::Store::<usize, _>::new(mapped)
            .map_err(|error| codec_error("reopen doublets store", error))?;
        self.pending = Some(temporary);
        Ok(())
    }

    /// Put the rebuilt file in place of the old one.
    fn publish(&mut self) -> Result<(), StorageError> {
        let Some(temporary) = self.pending.take() else {
            return Ok(());
        };
        if let Ok(metadata) = fs::metadata(&self.path) {
            fs::set_permissions(&temporary, metadata.permissions())?;
        }
        fs::rename(&temporary, &self.path)?;
        if let Some(parent) = self.path.parent() {
            crate::durable_file::sync_directory(parent)?;
        }
        Ok(())
    }
}

fn write_semantic_links<'a>(
    store: &mut FileStore,
    string_nodes: &mut HashMap<String, usize>,
    records: impl IntoIterator<Item = &'a TokenRecord>,
) -> Result<(), StorageError> {
    initialize_schema(store)?;
    let mut links = BTreeSet::from([
        SemanticLink::new(STORAGE_FORMAT, FORMAT_VERSION),
        SemanticLink::new(TYPE, TOKEN_RECORD),
        SemanticLink::new(TOKEN_RECORD, SUBTYPE),
        SemanticLink::new(SUBTYPE, VALUE),
    ]);
    for record in records {
        links.extend(record_to_links(record));
    }
    for link in links {
        let source = intern_string(store, string_nodes, &link.source)?;
        let target = intern_string(store, string_nodes, &link.target)?;
        // Same reason as `intern_string`: a pair the store already holds must
        // be reused, not created again (linksplatform/doublets-rs#57).
        let pair = store
            .get_or_create(source, target)
            .map_err(|error| codec_error("create semantic pair", error))?;
        store
            .get_or_create(EDGE_TAG, pair)
            .map_err(|error| codec_error("mark semantic pair", error))?;
    }
    Ok(())
}

fn initialize_schema(store: &mut FileStore) -> Result<(), StorageError> {
    for expected in 1..=SCHEMA_NODE_COUNT {
        let actual = store
            .create_point()
            .map_err(|error| codec_error("create doublets schema point", error))?;
        if actual != expected {
            return Err(StorageError::Codec(format!(
                "unexpected doublets schema point {actual}; expected {expected}"
            )));
        }
    }
    Ok(())
}

fn intern_string(
    store: &mut FileStore,
    nodes: &mut HashMap<String, usize>,
    value: &str,
) -> Result<usize, StorageError> {
    if let Some(node) = nodes.get(value) {
        return Ok(*node);
    }
    // `get_or_create`, not `create_link`. Sequences are built right to left,
    // so every string ending in the same byte would otherwise create its own
    // `(byte, EMPTY_SEQUENCE)` link -- a second link with a `(source, target)`
    // pair the store already holds. `doublets` 0.4 accepts that and cannot
    // represent it: `count()` sees both copies while `count_by([any, source,
    // target])` sees one, and the sources/targets trees' sizes then disagree
    // with the storage, so any later deletion underflows in `platform-trees`
    // (panic in debug, a silent wrap in release). C# forbids the duplicate
    // outright with `LinkWithSameValueAlreadyExistsException`; the Rust port
    // declares `Error::AlreadyExists` but never raises it
    // (linksplatform/doublets-rs#57).
    //
    // Sharing the suffix is also simply correct: two strings ending in the
    // same bytes describe the same tail, which is what the encoding means.
    let mut sequence = EMPTY_SEQUENCE;
    for byte in value.as_bytes().iter().rev() {
        sequence = store
            .get_or_create(BYTE_NODE_START + usize::from(*byte), sequence)
            .map_err(|error| codec_error("encode string byte", error))?;
    }
    let node = store
        .get_or_create(STRING_TAG, sequence)
        .map_err(|error| codec_error("encode string node", error))?;
    nodes.insert(value.to_string(), node);
    Ok(node)
}

fn read_semantic_links(store: &FileStore) -> Result<BTreeSet<SemanticLink>, StorageError> {
    validate_schema(store)?;
    let any = store.constants().any;
    let mut strings = HashMap::new();
    let mut links = BTreeSet::new();
    for marker in store.each_iter([any, EDGE_TAG, any]) {
        if marker.index == EDGE_TAG {
            continue;
        }
        let pair = store
            .get_link(marker.target)
            .ok_or_else(|| StorageError::Codec("semantic edge points to a missing pair".into()))?;
        let source = decode_string(store, pair.source, &mut strings)?;
        let target = decode_string(store, pair.target, &mut strings)?;
        links.insert(SemanticLink::new(source, target));
    }
    if !links.contains(&SemanticLink::new(STORAGE_FORMAT, FORMAT_VERSION)) {
        return Err(StorageError::Codec(
            "doublets store has an unsupported token schema".into(),
        ));
    }
    Ok(links)
}

fn validate_schema(store: &FileStore) -> Result<(), StorageError> {
    for expected in 1..=SCHEMA_NODE_COUNT {
        let point = store.get_link(expected).ok_or_else(|| {
            StorageError::Codec(format!("doublets schema is incomplete at point {expected}"))
        })?;
        if point.index != expected || point.source != expected || point.target != expected {
            return Err(StorageError::Codec(
                "doublets schema contains an invalid point".into(),
            ));
        }
    }
    Ok(())
}

fn decode_string(
    store: &FileStore,
    node: usize,
    cache: &mut HashMap<usize, String>,
) -> Result<String, StorageError> {
    if let Some(value) = cache.get(&node) {
        return Ok(value.clone());
    }
    let string = store
        .get_link(node)
        .ok_or_else(|| StorageError::Codec("semantic edge points to a missing string".into()))?;
    if string.source != STRING_TAG {
        return Err(StorageError::Codec(
            "semantic edge points to a non-string node".into(),
        ));
    }
    let mut bytes = Vec::new();
    let mut sequence = string.target;
    let mut visited = HashSet::new();
    while sequence != EMPTY_SEQUENCE {
        if !visited.insert(sequence) {
            return Err(StorageError::Codec("cyclic string sequence".into()));
        }
        let part = store
            .get_link(sequence)
            .ok_or_else(|| StorageError::Codec("string sequence is incomplete".into()))?;
        let Some(byte) = part.source.checked_sub(BYTE_NODE_START) else {
            return Err(StorageError::Codec(
                "string sequence has an invalid byte".into(),
            ));
        };
        bytes.push(
            u8::try_from(byte)
                .map_err(|_| StorageError::Codec("string sequence has an invalid byte".into()))?,
        );
        sequence = part.target;
    }
    let value = String::from_utf8(bytes)
        .map_err(|error| StorageError::Codec(format!("string is not UTF-8: {error}")))?;
    cache.insert(node, value.clone());
    Ok(value)
}

fn record_to_links(record: &TokenRecord) -> BTreeSet<SemanticLink> {
    let root = record_root(&record.id);
    let subtype = format!("{root}/{SUBTYPE}");
    let value = format!("{root}/{VALUE}");
    let mut links = BTreeSet::from([
        SemanticLink::new(&root, TYPE),
        SemanticLink::new(&root, &subtype),
        SemanticLink::new(&subtype, encoded_value_node(&subtype, &record.id)),
        SemanticLink::new(&root, &value),
    ]);
    add_field(&mut links, &value, "id", &record.id);
    add_field(&mut links, &value, "label", &record.label);
    add_field(
        &mut links,
        &value,
        "issued_at",
        &record.issued_at.to_string(),
    );
    add_field(
        &mut links,
        &value,
        "expires_at",
        &record.expires_at.to_string(),
    );
    add_field(&mut links, &value, "revoked", &record.revoked.to_string());
    if let Some(account) = &record.account {
        add_field(&mut links, &value, "account", account);
    }
    if let Some(window) = record.sliding_window_seconds {
        add_field(
            &mut links,
            &value,
            "sliding_window_seconds",
            &window.to_string(),
        );
    }
    if let Some(max_requests) = record.max_requests {
        add_field(
            &mut links,
            &value,
            "max_requests",
            &max_requests.to_string(),
        );
    }
    add_field(
        &mut links,
        &value,
        "used_requests",
        &record.used_requests.to_string(),
    );
    if let Some(max_tokens) = record.max_tokens {
        add_field(&mut links, &value, "max_tokens", &max_tokens.to_string());
    }
    add_field(
        &mut links,
        &value,
        "used_tokens",
        &record.used_tokens.to_string(),
    );
    add_field(
        &mut links,
        &value,
        "reserved_tokens",
        &record.reserved_tokens.to_string(),
    );
    if let Some(rate_limit) = record.rate_limit_per_minute {
        add_field(
            &mut links,
            &value,
            "rate_limit_per_minute",
            &rate_limit.to_string(),
        );
    }
    add_field(
        &mut links,
        &value,
        "rate_window_started_at",
        &record.rate_window_started_at.to_string(),
    );
    add_field(
        &mut links,
        &value,
        "rate_window_requests",
        &record.rate_window_requests.to_string(),
    );
    add_field(&mut links, &value, "scope", &record.scope);
    add_field(
        &mut links,
        &value,
        "github_repos",
        &record.github_repos.join(","),
    );
    links
}

fn add_field(links: &mut BTreeSet<SemanticLink>, value: &str, name: &str, raw: &str) {
    let field = format!("{value}/Field/{name}");
    links.insert(SemanticLink::new(value, &field));
    links.insert(SemanticLink::new(&field, encoded_value_node(&field, raw)));
}

fn encoded_value_node(parent: &str, raw: &str) -> String {
    format!("{parent}/Value/{}", STANDARD_NO_PAD.encode(raw))
}

fn decode_value_node(parent: &str, node: &str) -> Result<String, String> {
    let prefix = format!("{parent}/Value/");
    let encoded = node
        .strip_prefix(&prefix)
        .ok_or_else(|| format!("value node is not below {parent}"))?;
    let bytes = STANDARD_NO_PAD
        .decode(encoded)
        .map_err(|error| format!("value node is invalid base64: {error}"))?;
    String::from_utf8(bytes).map_err(|error| format!("value node is not UTF-8: {error}"))
}

fn record_root(id: &str) -> String {
    format!("{RECORD_PREFIX}{}", STANDARD_NO_PAD.encode(id))
}

fn links_to_records(links: &BTreeSet<SemanticLink>) -> Result<Vec<TokenRecord>, String> {
    for edge in [
        SemanticLink::new(TYPE, TOKEN_RECORD),
        SemanticLink::new(TOKEN_RECORD, SUBTYPE),
        SemanticLink::new(SUBTYPE, VALUE),
    ] {
        if !links.contains(&edge) {
            return Err(
                "token doublets links network is missing Type -> SubType -> Value schema".into(),
            );
        }
    }
    links
        .iter()
        .filter(|link| link.target == TYPE && link.source.starts_with(RECORD_PREFIX))
        .map(|link| record_from_links(&link.source, links))
        .collect()
}

fn record_from_links(root: &str, links: &BTreeSet<SemanticLink>) -> Result<TokenRecord, String> {
    let subtype = format!("{root}/{SUBTYPE}");
    if !links.contains(&SemanticLink::new(root, &subtype)) {
        return Err(format!("record {root} is missing its SubType relation"));
    }
    let subtype_value = one_target(links, &subtype)?;
    let subtype_id = decode_value_node(&subtype, subtype_value)?;
    let value = format!("{root}/{VALUE}");
    if !links.contains(&SemanticLink::new(root, &value)) {
        return Err(format!("record {root} is missing its Value relation"));
    }
    let fields = field_values(links, &value)?;
    let id = required_field(&fields, "id")?.to_string();
    let encoded_id = root
        .strip_prefix(RECORD_PREFIX)
        .ok_or_else(|| format!("record root {root} has an invalid prefix"))?;
    let root_id = String::from_utf8(
        STANDARD_NO_PAD
            .decode(encoded_id)
            .map_err(|error| format!("record root {root} has an invalid id: {error}"))?,
    )
    .map_err(|error| format!("record root {root} id is not UTF-8: {error}"))?;
    if id != subtype_id || id != root_id {
        return Err(format!(
            "record {root} identity relations do not match its id"
        ));
    }
    Ok(TokenRecord {
        id,
        sliding_window_seconds: fields
            .get("sliding_window_seconds")
            .and_then(|value| value.parse().ok()),
        label: required_field(&fields, "label")?.to_string(),
        issued_at: parse_field(&fields, "issued_at")?,
        expires_at: parse_field(&fields, "expires_at")?,
        revoked: parse_field(&fields, "revoked")?,
        account: fields.get("account").cloned(),
        max_requests: optional_parsed_field(&fields, "max_requests")?,
        used_requests: parse_field(&fields, "used_requests")?,
        max_tokens: optional_parsed_field(&fields, "max_tokens")?,
        used_tokens: optional_parsed_field(&fields, "used_tokens")?.unwrap_or(0),
        reserved_tokens: optional_parsed_field(&fields, "reserved_tokens")?.unwrap_or(0),
        rate_limit_per_minute: optional_parsed_field(&fields, "rate_limit_per_minute")?,
        rate_window_started_at: optional_parsed_field(&fields, "rate_window_started_at")?
            .unwrap_or(0),
        rate_window_requests: optional_parsed_field(&fields, "rate_window_requests")?.unwrap_or(0),
        scope: required_field(&fields, "scope")?.to_string(),
        github_repos: split_repository_list(fields.get("github_repos").map_or("", String::as_str)),
    })
}

fn field_values(
    links: &BTreeSet<SemanticLink>,
    value: &str,
) -> Result<BTreeMap<String, String>, String> {
    let prefix = format!("{value}/Field/");
    let mut fields = BTreeMap::new();
    for link in links.iter().filter(|link| link.source == value) {
        let Some(name) = link.target.strip_prefix(&prefix) else {
            continue;
        };
        let raw = decode_value_node(&link.target, one_target(links, &link.target)?)?;
        if fields.insert(name.to_string(), raw).is_some() {
            return Err(format!("record has duplicate {name} field"));
        }
    }
    Ok(fields)
}

fn one_target<'a>(links: &'a BTreeSet<SemanticLink>, source: &str) -> Result<&'a str, String> {
    let mut targets = links
        .iter()
        .filter_map(|link| (link.source == source).then_some(link.target.as_str()));
    let target = targets
        .next()
        .ok_or_else(|| format!("{source} has no value"))?;
    if targets.next().is_some() {
        return Err(format!("{source} has multiple values"));
    }
    Ok(target)
}

fn required_field<'a>(fields: &'a BTreeMap<String, String>, name: &str) -> Result<&'a str, String> {
    fields
        .get(name)
        .map(String::as_str)
        .ok_or_else(|| format!("record is missing {name}"))
}

fn parse_field<T>(fields: &BTreeMap<String, String>, name: &str) -> Result<T, String>
where
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    required_field(fields, name)?
        .parse()
        .map_err(|error| format!("record {name} is invalid: {error}"))
}

fn optional_parsed_field<T>(
    fields: &BTreeMap<String, String>,
    name: &str,
) -> Result<Option<T>, String>
where
    T: std::str::FromStr,
    T::Err: std::fmt::Display,
{
    fields
        .get(name)
        .map(|value| {
            value
                .parse()
                .map_err(|error| format!("record {name} is invalid: {error}"))
        })
        .transpose()
}

fn codec_error(context: &str, error: impl std::fmt::Debug) -> StorageError {
    StorageError::Codec(format!("{context}: {error:?}"))
}

/// Every `(source, target)` pair physically present in the store.
///
/// For the duplicate-pair invariant test; see
/// `the_encoded_links_network_contains_no_duplicate_pairs`.
#[cfg(test)]
pub(super) fn encoded_pairs_for_test(path: &Path) -> Result<Vec<(usize, usize)>, StorageError> {
    let store = PersistentStore::open(path)?;
    let any = store.store.constants().any;
    Ok(store
        .store
        .each_iter([any, any, any])
        .map(|link| (link.source, link.target))
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample_record() -> TokenRecord {
        TokenRecord {
            github_repos: Vec::new(),
            id: "id/with spaces".into(),
            label: "label with \"quotes\" and a newline\n".into(),
            issued_at: i64::MIN,
            expires_at: i64::MAX,
            revoked: true,
            sliding_window_seconds: None,
            account: Some(String::new()),
            max_requests: Some(u64::MAX),
            used_requests: u64::MAX,
            max_tokens: Some(u64::MAX),
            used_tokens: u64::MAX,
            reserved_tokens: u64::MAX,
            rate_limit_per_minute: Some(u64::MAX),
            rate_window_started_at: i64::MAX,
            rate_window_requests: u64::MAX,
            scope: "admin".into(),
        }
    }

    #[test]
    fn semantic_reduction_is_lossless() {
        let record = sample_record();
        let mut links = BTreeSet::from([
            SemanticLink::new(STORAGE_FORMAT, FORMAT_VERSION),
            SemanticLink::new(TYPE, TOKEN_RECORD),
            SemanticLink::new(TOKEN_RECORD, SUBTYPE),
            SemanticLink::new(SUBTYPE, VALUE),
        ]);
        links.extend(record_to_links(&record));

        assert_eq!(links_to_records(&links).unwrap(), vec![record]);
    }

    #[test]
    fn official_lino_codec_roundtrip_is_lossless() {
        let record = sample_record();
        let encoded = encode_text(std::iter::once(&record));

        assert_eq!(decode_text(&encoded).unwrap(), vec![record]);
    }

    #[test]
    fn native_doublets_links_network_reopens_across_growth_boundary() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.bin");
        let mut record = sample_record();
        record.label = "large associative value".repeat(500);
        {
            let mut store = PersistentStore::open(&path).unwrap();
            store.replace(std::iter::once(&record)).unwrap();
        }

        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .open(&path)
            .unwrap();
        let memory = PersistentFileMapped::new(file).unwrap();
        let links_network = unit::Store::<usize, _>::new(memory).unwrap();
        assert!(
            links_network.count() > 8 * 1024,
            "fixture must cross the upstream bootstrap page boundary"
        );
        drop(links_network);

        // Reopened from scratch: what one process wrote in place is what the
        // next one reads, across the growth boundary.
        let reopened = PersistentStore::open(&path).unwrap();
        assert_eq!(reopened.records().unwrap(), vec![record]);
    }
}
