//! Scoped checkpoint capture shared by native and library callers.
use super::data_backup;
use std::path::Path;

/// Capture a logical checkpoint, excluding OAuth credentials and preserving token records.
/// Individual files are consistent; callers needing a quiescent snapshot must stop writers.
/// ```no_run
/// # fn example() -> std::io::Result<()> {
/// let snapshot = link_assistant_router::deploy::checkpoint::capture(&Default::default(), "/tmp/router-deploy".as_ref(), &[], "signing-secret")?;
/// assert!(snapshot.join("manifest.json").exists());
/// # Ok(()) }
/// ```
pub fn capture_checkpoint(
    context: &crate::operation_context::OperationContext,
    root: &Path,
    records: &[crate::storage::TokenRecord],
    secret: &str,
) -> std::io::Result<std::path::PathBuf> {
    context.scope(|| data_backup::capture(root, records, secret))
}
