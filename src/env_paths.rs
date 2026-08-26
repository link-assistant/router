//! Reading directory paths from the environment.
//!
//! `std::env::var_os` returns `Some("")` for a variable that is *set but
//! empty*, which is a different thing from unset and was being treated as the
//! same. An empty `XDG_CONFIG_HOME` therefore became the config root, every
//! state path turned relative, and the router read and wrote its state — a
//! `server.json` holding a live `la_sk_` token — into whatever directory the
//! command happened to run from (issue #340).
//!
//! It is easy to hit unintentionally: `env: { XDG_CONFIG_HOME: '' }` is the
//! natural way to say "do not inherit the user's config" in most CI runners,
//! and it did the opposite here.

use std::path::PathBuf;

/// The value of `name`, treating a set-but-empty variable as unset.
///
/// This is the whole fix: with `Some("")` filtered out, an `or_else` chain
/// falls through to the next candidate and the "…are unset" error at its end
/// can actually fire.
#[must_use]
pub fn directory(name: &str) -> Option<PathBuf> {
    from_value(std::env::var_os(name))
}

/// The rule itself, separated from the lookup so it can be tested.
///
/// Setting a variable is process-wide and this crate forbids `unsafe`, so a
/// test that manipulated the real environment could neither be written here
/// nor run reliably beside its neighbours.
#[must_use]
pub fn from_value(value: Option<std::ffi::OsString>) -> Option<PathBuf> {
    value.filter(|value| !value.is_empty()).map(PathBuf::from)
}

/// Refuse a resolved root that is not absolute.
///
/// A relative root is a broken environment rather than a location anyone
/// chose, and failing loudly beats writing a credential into `$PWD`. The
/// message names the variable so the cause is findable.
///
/// # Errors
///
/// Returns a message when `root` is relative.
pub fn require_absolute(root: PathBuf, what: &str) -> Result<PathBuf, String> {
    if root.is_absolute() {
        return Ok(root);
    }
    Err(format!(
        "refusing to use the relative path {} for {what}: check HOME, XDG_CONFIG_HOME and \
         APPDATA, one of which is set to something relative or empty",
        root.display()
    ))
}

#[cfg(test)]
#[path = "env_paths_tests.rs"]
mod tests;
