//! Repository files read by workflow, script and documentation tests.
//!
//! `cargo test` runs integration tests in the package directory (`rust/`),
//! while workflows, scripts, the Dockerfile and most documentation live at the
//! repository root, so a bare relative path no longer names them.

use std::path::{Path, PathBuf};

/// Resolves `relative` in the package directory, then at the repository root.
///
/// # Panics
///
/// Panics if the package directory has no parent, which a checkout never has.
#[must_use]
pub fn path(relative: &str) -> PathBuf {
    let package = Path::new(env!("CARGO_MANIFEST_DIR"));
    let candidate = package.join(relative);
    if candidate.exists() {
        candidate
    } else {
        package
            .parent()
            .expect("the package sits inside the repository")
            .join(relative)
    }
}
