//! Deployment paths: config-relative paths and target-specific home expansion.

use std::path::{Path, PathBuf};

/// Expand the current user's `~` or `~/` without evaluating shell expressions.
pub fn expand_home(value: &str) -> Result<PathBuf, String> {
    let home = crate::operation_context::var_os("HOME")
        .or_else(|| crate::operation_context::var_os("USERPROFILE"));
    expand_with_home(value, home.as_deref().map(Path::new))
}

fn expand_with_home(value: &str, home: Option<&Path>) -> Result<PathBuf, String> {
    if !value.starts_with('~') {
        return Ok(PathBuf::from(value));
    }
    let relative = if value == "~" {
        ""
    } else {
        value.strip_prefix("~/").ok_or_else(|| {
            "deployment paths support only `~` or `~/`, not another user's home; use an absolute path".to_string()
        })?
    };
    let home = home.filter(|home| home.is_absolute()).ok_or_else(|| {
        "could not expand `~`: HOME (or USERPROFILE) must name an absolute home directory"
            .to_string()
    })?;
    Ok(home.join(relative))
}

/// Resolve an ordinary config path against its file's directory.
///
/// A deployment root's home belongs to the selected target. Preserve that
/// prefix until local dispatch or the SSH agent expands the appropriate home.
pub fn config_path(value: &str, base: Option<&Path>, target_home: bool) -> Result<PathBuf, String> {
    if target_home && (value == "~" || value.starts_with("~/")) {
        return Ok(PathBuf::from(value));
    }
    let path = expand_home(value)?;
    Ok(match base {
        Some(base) if path.is_relative() => base.join(path),
        _ => path,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn home_expansion_is_explicit_and_does_not_execute_shell_text() {
        let home = std::env::temp_dir().join("router-home");
        assert_eq!(expand_with_home("~", Some(&home)).unwrap(), home);
        assert_eq!(
            expand_with_home("~/Data", Some(&home)).unwrap(),
            home.join("Data")
        );
        assert!(expand_with_home("~/Data", None).is_err());
        assert!(expand_with_home("~other/Data", Some(&home)).is_err());
        assert_eq!(
            expand_with_home("$HOME/$(command)", Some(&home)).unwrap(),
            PathBuf::from("$HOME/$(command)")
        );
    }

    #[test]
    fn a_target_home_is_deferred_but_other_relative_roots_use_the_config_directory() {
        let base = std::env::temp_dir().join("config");
        assert_eq!(
            config_path("~/data", Some(&base), true).unwrap(),
            PathBuf::from("~/data")
        );
        assert_eq!(
            config_path("data", Some(&base), true).unwrap(),
            base.join("data")
        );
    }
}
