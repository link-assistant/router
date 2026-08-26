//! Unit tests for [`crate::env_paths`].

use super::*;

/// A set-but-empty variable is unset, not configured.
///
/// `var_os` returns `Some("")` for it, which was taken as a root: the config
/// root became the empty string, every state path turned relative, and the
/// router wrote `server.json` — holding a live `la_sk_` token — into whatever
/// directory the command ran from (issue #340).
#[test]
fn an_empty_variable_reads_as_unset() {
    let value = |text: &str| Some(std::ffi::OsString::from(text));

    assert_eq!(
        from_value(value("/tmp/configured")),
        Some(PathBuf::from("/tmp/configured")),
        "a real value is still read"
    );
    assert_eq!(
        from_value(value("")),
        None,
        "an empty value must fall through to the next candidate"
    );
    assert_eq!(from_value(None), None, "an unset value is unset");
    // The point of the fix: empty and absent are now indistinguishable, so an
    // `or_else` chain behaves the same either way.
    assert_eq!(from_value(value("")), from_value(None));
}

/// A relative root is refused rather than used.
///
/// Whatever combination of variables produced it, a root that is not absolute
/// is a broken environment — and failing loudly beats writing a credential
/// into the process working directory.
#[test]
fn a_relative_root_is_refused_rather_than_written_to() {
    let absolute = require_absolute(PathBuf::from("/var/lib/router"), "the state directory")
        .expect("an absolute root is usable");
    assert_eq!(absolute, PathBuf::from("/var/lib/router"));

    for relative in ["", "link-assistant-router", ".config", "./state", "../up"] {
        let refused = require_absolute(PathBuf::from(relative), "the state directory")
            .expect_err("a relative root must be refused");
        assert!(
            refused.contains("relative"),
            "the refusal must say why: {refused}"
        );
        assert!(
            refused.contains("XDG_CONFIG_HOME"),
            "and name where to look: {refused}"
        );
    }
}
