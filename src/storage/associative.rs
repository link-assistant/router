use std::collections::{BTreeMap, BTreeSet, HashMap, HashSet};
use std::fs::{self, OpenOptions};
use std::path::{Path, PathBuf};

use base64::Engine;
use base64::engine::general_purpose::STANDARD_NO_PAD;
use doublets::{Doublets, DoubletsExt, Links, unit};
use lino_objects_codec::LinoValue;

use super::file_mapped::LoadedFileMapped;
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

type FileStore = unit::Store<usize, LoadedFileMapped>;

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
                    "max_requests",
                    record.max_requests.map_or(LinoValue::Null, |value| {
                        LinoValue::String(value.to_string())
                    }),
                ),
                (
                    "used_requests",
                    LinoValue::String(record.used_requests.to_string()),
                ),
                ("scope", LinoValue::String(record.scope.clone())),
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
        max_requests: optional_u64_field(fields, "max_requests", "record value")?,
        used_requests: expect_u64_field(fields, "used_requests", "record value")?,
        scope: expect_string_field(fields, "scope", "record value")?.to_string(),
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
    match object_field(value, key, context)? {
        LinoValue::Null => Ok(None),
        LinoValue::String(value) => value
            .parse()
            .map(Some)
            .map_err(|error| format!("{context}.{key} is invalid: {error}")),
        _ => Err(format!("{context}.{key} must be a string or null")),
    }
}

pub(super) fn write_binary<'a>(
    path: &Path,
    records: impl IntoIterator<Item = &'a TokenRecord>,
) -> Result<(), StorageError> {
    let parent = path
        .parent()
        .ok_or_else(|| std::io::Error::other("storage path has no parent directory"))?;
    fs::create_dir_all(parent)?;
    let tmp = temporary_path(path)?;
    let result = (|| {
        let mut options = OpenOptions::new();
        options.read(true).write(true).create_new(true);
        #[cfg(unix)]
        {
            use std::os::unix::fs::OpenOptionsExt;
            options.mode(0o600);
        }
        let file = options.open(&tmp)?;
        let mapped = LoadedFileMapped::new(file)?;
        let mut store = unit::Store::<usize, _>::new(mapped)
            .map_err(|error| codec_error("initialize doublets store", error))?;
        write_semantic_links(&mut store, records)?;
        drop(store);
        OpenOptions::new().read(true).open(&tmp)?.sync_all()?;
        if let Ok(metadata) = fs::metadata(path) {
            fs::set_permissions(&tmp, metadata.permissions())?;
        }
        fs::rename(&tmp, path)?;
        Ok(())
    })();
    if result.is_err() {
        let _ = fs::remove_file(tmp);
    }
    result
}

pub(super) fn read_binary(path: &Path) -> Result<Vec<TokenRecord>, StorageError> {
    let file = OpenOptions::new().read(true).write(true).open(path)?;
    let mapped = LoadedFileMapped::new(file)?;
    let store = unit::Store::<usize, _>::new(mapped)
        .map_err(|error| codec_error("open doublets store", error))?;
    let links = read_semantic_links(&store)?;
    links_to_records(&links).map_err(StorageError::Codec)
}

fn write_semantic_links<'a>(
    store: &mut FileStore,
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
    let mut string_nodes = HashMap::new();
    for link in links {
        let source = intern_string(store, &mut string_nodes, &link.source)?;
        let target = intern_string(store, &mut string_nodes, &link.target)?;
        let pair = store
            .create_link(source, target)
            .map_err(|error| codec_error("create semantic pair", error))?;
        store
            .create_link(EDGE_TAG, pair)
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
    let mut sequence = EMPTY_SEQUENCE;
    for byte in value.as_bytes().iter().rev() {
        sequence = store
            .create_link(BYTE_NODE_START + usize::from(*byte), sequence)
            .map_err(|error| codec_error("encode string byte", error))?;
    }
    let node = store
        .create_link(STRING_TAG, sequence)
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
    add_field(&mut links, &value, "scope", &record.scope);
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
            return Err("token doublets graph is missing Type -> SubType -> Value schema".into());
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
        label: required_field(&fields, "label")?.to_string(),
        issued_at: parse_field(&fields, "issued_at")?,
        expires_at: parse_field(&fields, "expires_at")?,
        revoked: parse_field(&fields, "revoked")?,
        account: fields.get("account").cloned(),
        max_requests: optional_parsed_field(&fields, "max_requests")?,
        used_requests: parse_field(&fields, "used_requests")?,
        scope: required_field(&fields, "scope")?.to_string(),
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

fn temporary_path(path: &Path) -> Result<PathBuf, StorageError> {
    let parent = path
        .parent()
        .ok_or_else(|| std::io::Error::other("storage path has no parent directory"))?;
    let name = path
        .file_name()
        .and_then(|name| name.to_str())
        .ok_or_else(|| std::io::Error::other("storage file name is not valid UTF-8"))?;
    Ok(parent.join(format!(
        ".{name}.{}.{}.tmp",
        std::process::id(),
        uuid::Uuid::new_v4()
    )))
}

fn codec_error(context: &str, error: impl std::fmt::Debug) -> StorageError {
    StorageError::Codec(format!("{context}: {error:?}"))
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::tempdir;

    fn sample_record() -> TokenRecord {
        TokenRecord {
            id: "id/with spaces".into(),
            label: "label with \"quotes\" and a newline\n".into(),
            issued_at: i64::MIN,
            expires_at: i64::MAX,
            revoked: true,
            account: Some(String::new()),
            max_requests: Some(u64::MAX),
            used_requests: u64::MAX,
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
    fn native_doublets_graph_reopens_across_growth_boundary() {
        let dir = tempdir().unwrap();
        let path = dir.path().join("tokens.bin");
        let mut record = sample_record();
        record.label = "large associative value".repeat(500);
        write_binary(&path, std::iter::once(&record)).unwrap();

        let file = OpenOptions::new()
            .read(true)
            .write(true)
            .open(&path)
            .unwrap();
        let memory = LoadedFileMapped::new(file).unwrap();
        let graph = unit::Store::<usize, _>::new(memory).unwrap();
        assert!(
            graph.count() > 8 * 1024,
            "fixture must cross the upstream bootstrap page boundary"
        );
        drop(graph);

        assert_eq!(read_binary(&path).unwrap(), vec![record]);
    }
}
