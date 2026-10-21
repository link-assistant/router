//! `router tokens import`: bring durable token records back after a rollback,
//! a data-root switch or a restore (issue #644).
//!
//! A rollback from 1.14.3 to an existing 1.11.2 deployment served the older
//! data root, which had never seen the active Claude run token. The token's
//! signature was fine; its durable record was simply absent, so the running
//! session got `401 invalid token`. The repair was to copy exactly that record
//! across — no rotation, no secret change, no other credential touched — and
//! until now it had to be done by hand.
//!
//! The default is additive: a record the target lacks is copied with every
//! field intact (binding, scope, revocation, expiry, lease, budgets, usage,
//! reservations, rate window, model policy), and a record the target already
//! holds is never touched. Where the two copies disagree the difference is
//! reported, field by field, and left for the operator.
//!
//! `--replace` is the explicit, destructive alternative for those conflicts.
//! Even then a revoked record stays revoked and recorded usage never goes
//! down ([`merge_safer_record`]), and the target's records are exported to a
//! private backup file before anything is written.
//!
//! Records hold no token values — only metadata keyed by the token id — so
//! nothing printed here can authenticate anyone.

use std::collections::{BTreeMap, BTreeSet};
use std::fs;
use std::path::{Path, PathBuf};

use serde::Serialize;

use crate::config::StoragePolicy;
use crate::storage::{TokenRecord, TokenStore, build_token_store_read_only, merge_safer_record};

/// Directory, under the target data root, that `--replace` backups go to.
pub const BACKUP_DIRECTORY: &str = "token-import-backups";

/// What to do with a record both sides hold but that differs.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub enum ImportMode {
    /// Copy only missing records; report conflicts and leave them alone.
    MergeMissing,
    /// Also overwrite conflicting records, never reviving a revoked one or
    /// lowering recorded usage.
    Replace,
}

impl ImportMode {
    const fn name(self) -> &'static str {
        match self {
            Self::MergeMissing => "merge-missing",
            Self::Replace => "replace",
        }
    }
}

/// One record both sides hold with different contents.
#[derive(Clone, Debug, Serialize, PartialEq, Eq, schemars::JsonSchema)]
pub struct Conflict {
    pub id: String,
    /// The record fields whose values differ.
    pub fields: Vec<String>,
}

/// The outcome of one import, printed as the command's result.
#[derive(Clone, Debug, Default, Serialize, PartialEq, Eq, schemars::JsonSchema)]
pub struct ImportReport {
    pub mode: &'static str,
    pub dry_run: bool,
    pub source_records: usize,
    pub target_records_before: usize,
    /// Records the target lacked and now holds (or would, in a dry run).
    pub added: Vec<String>,
    /// Records already identical on both sides.
    pub unchanged: Vec<String>,
    /// Records that differ and were left as they are.
    pub conflicts: Vec<Conflict>,
    /// Records overwritten by `--replace`.
    pub replaced: Vec<Conflict>,
    /// Replaced records that stayed revoked because the target had revoked
    /// them: an import never revives a credential.
    pub kept_revoked: Vec<String>,
    /// `--id` values the source does not hold.
    pub missing_from_source: Vec<String>,
    /// Export of the target's records taken before `--replace` wrote.
    #[serde(skip_serializing_if = "Option::is_none")]
    pub backup: Option<PathBuf>,
}

impl ImportReport {
    /// Whether the import changes (or, in a dry run, would change) the target.
    #[must_use]
    pub const fn writes(&self) -> bool {
        !self.added.is_empty() || !self.replaced.is_empty()
    }
}

/// Read every record a source holds, without creating or changing anything.
///
/// Accepted sources:
///
/// * a data directory holding `tokens.lino` and/or `tokens.bin`;
/// * a deployment root whose `data/` directory holds them;
/// * a `router deploy` checkpoint directory (`tokens.json`, `tokens.lino`);
/// * a single `*.lino`, `*.bin` or `*.json` token file under any name.
///
/// # Errors
///
/// A missing path, an unrecognised file, or a store that cannot be decoded.
pub fn read_source(path: &Path) -> Result<Vec<TokenRecord>, String> {
    let metadata =
        fs::metadata(path).map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    if metadata.is_file() {
        return read_file(path);
    }
    let data = path.join("data");
    let directory = if !holds_tokens(path) && holds_tokens(&data) {
        data
    } else {
        path.to_path_buf()
    };
    if !holds_tokens(&directory) {
        return Err(format!(
            "{} holds no tokens.lino, tokens.bin or tokens.json",
            path.display()
        ));
    }
    let mut records = read_directory(&directory)?;
    let checkpoint = directory.join("tokens.json");
    if checkpoint.is_file() {
        merge_into(&mut records, read_json(&checkpoint)?);
    }
    Ok(records.into_values().collect())
}

fn holds_tokens(directory: &Path) -> bool {
    ["tokens.lino", "tokens.bin", "tokens.json"]
        .iter()
        .any(|name| directory.join(name).is_file())
}

fn read_directory(directory: &Path) -> Result<BTreeMap<String, TokenRecord>, String> {
    let store = build_token_store_read_only(StoragePolicy::Both, directory)
        .map_err(|error| format!("cannot decode tokens in {}: {error}", directory.display()))?;
    let records = store.list().map_err(|error| error.to_string())?;
    Ok(records
        .into_iter()
        .map(|record| (record.id.clone(), record))
        .collect())
}

fn read_json(path: &Path) -> Result<Vec<TokenRecord>, String> {
    let bytes =
        fs::read(path).map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    serde_json::from_slice(&bytes)
        .map_err(|error| format!("{} is not a token export: {error}", path.display()))
}

/// A lone store file is decoded from a private copy under its canonical name,
/// so the ordinary read-only decoders apply whatever the file is called.
fn read_file(path: &Path) -> Result<Vec<TokenRecord>, String> {
    let extension = path
        .extension()
        .and_then(|extension| extension.to_str())
        .unwrap_or_default();
    let canonical = match extension {
        "json" => return read_json(path),
        "lino" => "tokens.lino",
        "bin" => "tokens.bin",
        _ => {
            return Err(format!(
                "{} is not a .lino, .bin or .json token file",
                path.display()
            ));
        }
    };
    let workspace = tempfile::tempdir().map_err(|error| error.to_string())?;
    fs::copy(path, workspace.path().join(canonical))
        .map_err(|error| format!("cannot read {}: {error}", path.display()))?;
    Ok(read_directory(workspace.path())?.into_values().collect())
}

/// Two copies of one record in one source (text and binary projections) are
/// reconciled the way the store itself reconciles them.
fn merge_into(records: &mut BTreeMap<String, TokenRecord>, more: Vec<TokenRecord>) {
    for record in more {
        records
            .entry(record.id.clone())
            .and_modify(|current| merge_safer_record(current, &record))
            .or_insert(record);
    }
}

/// The names of the fields in which two records differ.
fn differing_fields(left: &TokenRecord, right: &TokenRecord) -> Vec<String> {
    let as_map = |record: &TokenRecord| match serde_json::to_value(record) {
        Ok(serde_json::Value::Object(map)) => map,
        _ => serde_json::Map::new(),
    };
    let (left, right) = (as_map(left), as_map(right));
    let keys: BTreeSet<&String> = left.keys().chain(right.keys()).collect();
    keys.into_iter()
        .filter(|key| left.get(*key) != right.get(*key))
        .cloned()
        .collect()
}

/// Options for [`import`].
#[derive(Clone, Copy, Debug)]
pub struct ImportOptions<'a> {
    pub mode: ImportMode,
    pub dry_run: bool,
    /// Import only these ids; empty imports every source record.
    pub ids: &'a [String],
    /// Where `--replace` writes its backup of the target's records.
    pub backup_directory: Option<&'a Path>,
}

/// Plan the import against the target's current records and, unless this is
/// a dry run, apply it one record at a time.
///
/// Each write is one ordinary store `put`, taken under the store's own
/// cross-process lock, so a running router keeps serving and sees each record
/// as it lands. An interrupted import leaves every record either fully
/// imported or untouched; running it again finishes the rest, and a completed
/// import run again changes nothing.
///
/// # Errors
///
/// The target store cannot be read or written, or the backup cannot be taken.
pub fn import(
    target: &dyn TokenStore,
    source: Vec<TokenRecord>,
    options: ImportOptions<'_>,
) -> Result<ImportReport, String> {
    let current: BTreeMap<String, TokenRecord> = target
        .list()
        .map_err(|error| format!("cannot read the target token store: {error}"))?
        .into_iter()
        .map(|record| (record.id.clone(), record))
        .collect();
    let mut source: BTreeMap<String, TokenRecord> = source
        .into_iter()
        .map(|record| (record.id.clone(), record))
        .collect();
    let mut report = ImportReport {
        mode: options.mode.name(),
        dry_run: options.dry_run,
        source_records: source.len(),
        target_records_before: current.len(),
        ..ImportReport::default()
    };
    if !options.ids.is_empty() {
        let wanted: BTreeSet<&String> = options.ids.iter().collect();
        report.missing_from_source = wanted
            .iter()
            .filter(|id| !source.contains_key(**id))
            .map(|id| (*id).clone())
            .collect();
        source.retain(|id, _| wanted.contains(id));
    }

    let mut writes = Vec::new();
    for (id, incoming) in source {
        let Some(existing) = current.get(&id) else {
            report.added.push(id);
            writes.push(incoming);
            continue;
        };
        if *existing == incoming {
            report.unchanged.push(id);
            continue;
        }
        let fields = differing_fields(existing, &incoming);
        match options.mode {
            ImportMode::MergeMissing => report.conflicts.push(Conflict { id, fields }),
            ImportMode::Replace => {
                let mut replacement = incoming;
                merge_safer_record(&mut replacement, existing);
                if existing.revoked {
                    report.kept_revoked.push(id.clone());
                }
                if replacement == *existing {
                    report.unchanged.push(id);
                    continue;
                }
                report.replaced.push(Conflict { id, fields });
                writes.push(replacement);
            }
        }
    }

    if options.dry_run || writes.is_empty() {
        return Ok(report);
    }
    if !report.replaced.is_empty() {
        let directory = options
            .backup_directory
            .ok_or("--replace needs a backup location for the target's records")?;
        report.backup = Some(write_backup(directory, &current)?);
    }
    for record in writes {
        let id = record.id.clone();
        target.put(record).map_err(|error| {
            format!(
                "importing {id} failed: {error}; records before it were imported, rerun to finish"
            )
        })?;
    }
    Ok(report)
}

fn write_backup(
    directory: &Path,
    records: &BTreeMap<String, TokenRecord>,
) -> Result<PathBuf, String> {
    let path = directory.join(format!(
        "tokens-{}-{}.json",
        crate::operation_context::now().format("%Y%m%dT%H%M%SZ"),
        &uuid::Uuid::new_v4().simple().to_string()[..8]
    ));
    let records: Vec<&TokenRecord> = records.values().collect();
    let bytes = serde_json::to_vec_pretty(&records).map_err(|error| error.to_string())?;
    fs::create_dir_all(directory)
        .and_then(|()| crate::durable_file::atomic_write_owner_only(&path, &bytes))
        .map_err(|error| {
            format!("cannot back up the target's records; nothing imported: {error}")
        })?;
    Ok(path)
}

/// Human-readable summary of a report.
#[must_use]
pub fn render(report: &ImportReport) -> String {
    use std::fmt::Write as _;
    let verb = if report.dry_run { "would add" } else { "added" };
    let mut text = format!(
        "{verb} {} record(s), {} unchanged, {} conflict(s) left alone, {} replaced ({} source, {} target before; mode {})\n",
        report.added.len(),
        report.unchanged.len(),
        report.conflicts.len(),
        report.replaced.len(),
        report.source_records,
        report.target_records_before,
        report.mode,
    );
    for id in &report.added {
        let _ = writeln!(text, "  + {id}");
    }
    for conflict in &report.conflicts {
        let _ = writeln!(
            text,
            "  ! {} differs in {}; pass --replace to overwrite",
            conflict.id,
            conflict.fields.join(", ")
        );
    }
    for conflict in &report.replaced {
        let _ = writeln!(text, "  ~ {} ({})", conflict.id, conflict.fields.join(", "));
    }
    for id in &report.kept_revoked {
        let _ = writeln!(text, "  - {id} stays revoked");
    }
    for id in &report.missing_from_source {
        let _ = writeln!(text, "  ? {id} is not in the source");
    }
    if let Some(backup) = &report.backup {
        let _ = writeln!(text, "previous records saved to {}", backup.display());
    }
    text
}

/// Flags of `router tokens import`.
#[derive(Clone, Copy, Debug)]
pub struct ImportCommand<'a> {
    pub from: &'a Path,
    pub ids: &'a [String],
    pub replace: bool,
    pub dry_run: bool,
    pub json: bool,
}

/// Run `router tokens import` against the local store in `data_dir`.
///
/// Exit status: 0 when every requested record is present afterwards, 1 on an
/// error, 2 when a requested `--id` is not in the source or conflicts were
/// left alone, so a script notices an import that did not fully happen.
#[must_use]
pub fn run_cli(
    target: &dyn TokenStore,
    data_dir: &Path,
    command: &ImportCommand<'_>,
) -> std::process::ExitCode {
    use std::process::ExitCode;
    let outcome = read_source(command.from).and_then(|source| {
        import(
            target,
            source,
            ImportOptions {
                mode: if command.replace {
                    ImportMode::Replace
                } else {
                    ImportMode::MergeMissing
                },
                dry_run: command.dry_run,
                ids: command.ids,
                backup_directory: Some(&data_dir.join(BACKUP_DIRECTORY)),
            },
        )
    });
    let report = match outcome {
        Ok(report) => report,
        Err(error) => {
            eprintln!("error: {error}");
            return ExitCode::from(1);
        }
    };
    if command.json {
        println!(
            "{}",
            serde_json::to_string_pretty(&report).unwrap_or_default()
        );
    } else {
        print!("{}", render(&report));
    }
    if report.missing_from_source.is_empty() && report.conflicts.is_empty() {
        ExitCode::SUCCESS
    } else {
        ExitCode::from(2)
    }
}

/// Why `tokens import` refuses with another router selected.
#[must_use]
pub fn refusal(server: &crate::managed_server::ResolvedServer) -> String {
    format!(
        "`tokens import` writes the token store of the machine it runs on, and {} is selected. \
         Run it on that deployment — `docker exec <container> router tokens import ...` for a \
         containerised one — or pass --local to import into this machine's store.",
        server.base_url
    )
}
