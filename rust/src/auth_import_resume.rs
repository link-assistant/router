//! Resolve opaque credential-import transaction IDs without exposing paths.

use std::path::{Path, PathBuf};

use link_assistant_router::cli::ImportProvider;
use link_assistant_router::subscription::SubscriptionProvider;

use super::import_result::ImportFailure;

fn validate_transaction_id(transaction_id: &str) -> Result<(), ImportFailure> {
    if transaction_id.is_empty()
        || transaction_id.len() > 128
        || !transaction_id
            .bytes()
            .all(|byte| byte.is_ascii_alphanumeric() || matches!(byte, b'-' | b'_'))
    {
        return Err(ImportFailure::not_attempted(
            "the retained import transaction ID is invalid",
        ));
    }
    Ok(())
}

#[derive(Debug)]
pub(super) struct ResumeCandidate {
    pub(super) provider: ImportProvider,
    pub(super) source: String,
    pub(super) transaction_root: PathBuf,
    pub(super) transaction_id: String,
    _claim: Option<link_assistant_router::durable_file::FileLockGuard>,
}

/// Find exactly one owner-only candidate transaction by its reported opaque ID.
pub(super) fn resolve(
    data_dir: &Path,
    transaction_id: &str,
) -> Result<ResumeCandidate, ImportFailure> {
    validate_transaction_id(transaction_id)?;
    let root = data_dir.join("auth-import-candidates");
    let entries = std::fs::read_dir(&root).map_err(|_| {
        ImportFailure::not_attempted("the retained import transaction was not found")
    })?;
    let prefix = format!("{transaction_id}-");
    let mut matches = entries
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .file_type()
                .is_ok_and(|file_type| file_type.is_dir() && !file_type.is_symlink())
                && entry.file_name().to_string_lossy().starts_with(&prefix)
        })
        .map(|entry| entry.path())
        .collect::<Vec<_>>();
    if matches.len() != 1 {
        return Err(ImportFailure::not_attempted(if matches.is_empty() {
            "the retained import transaction was not found"
        } else {
            "the retained import transaction ID is ambiguous"
        }));
    }
    let transaction_root = matches.pop().expect("one transaction was checked");
    let providers = SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| {
            std::fs::symlink_metadata(transaction_root.join(provider.as_str()))
                .is_ok_and(|metadata| metadata.file_type().is_dir())
        })
        .collect::<Vec<_>>();
    let [subscription] = providers.as_slice() else {
        return Err(ImportFailure::not_attempted(
            "the retained import transaction has no unique provider candidate",
        ));
    };
    let provider = match subscription {
        SubscriptionProvider::Claude => ImportProvider::Claude,
        SubscriptionProvider::Codex => ImportProvider::Codex,
        SubscriptionProvider::Gemini => ImportProvider::Gemini,
        SubscriptionProvider::Qwen => ImportProvider::Qwen,
    };
    let source = transaction_root
        .join(subscription.as_str())
        .to_string_lossy()
        .into_owned();
    Ok(ResumeCandidate {
        provider,
        source,
        transaction_root,
        transaction_id: transaction_id.to_string(),
        _claim: None,
    })
}

/// Resolve and exclusively claim one retained transaction for the complete
/// validation/promotion/retirement attempt. The lock lives outside the
/// transaction directory so successful retirement works on Windows too.
pub(super) async fn resolve_claimed(
    data_dir: &Path,
    transaction_id: &str,
) -> Result<ResumeCandidate, ImportFailure> {
    // Validate before interpolating caller input into a path. Otherwise a
    // traversal-shaped ID creates a lock outside the private transaction root
    // even though resolution later rejects it (issues #413, #424).
    validate_transaction_id(transaction_id)?;
    let lock_path = data_dir
        .join("auth-import-candidates")
        .join(format!(".resume-{transaction_id}.lock"));
    let claim = link_assistant_router::durable_file::lock_exclusive_async(
        &lock_path,
        std::time::Duration::from_secs(1),
    )
    .await
    .map_err(|_| {
        ImportFailure::not_attempted("the retained import transaction is already being resumed")
    })?;
    let candidate = resolve(data_dir, transaction_id)?;
    Ok(ResumeCandidate {
        provider: candidate.provider,
        source: candidate.source,
        transaction_root: candidate.transaction_root,
        transaction_id: candidate.transaction_id,
        _claim: Some(claim),
    })
}

/// Remove the predecessor transaction after a newer durable candidate replaces
/// it. A failed cleanup never changes the already reported credential outcome.
pub(super) fn retire(candidate: &ResumeCandidate) -> Result<(), String> {
    std::fs::remove_dir_all(&candidate.transaction_root)
        .map_err(|_| "could not retire the resumed import transaction".to_string())
}
