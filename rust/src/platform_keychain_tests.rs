//! Unit tests for [`crate::platform_keychain`].
//!
//! These never touch the user's real login Keychain: reading a live
//! subscription is exactly the thing this module must not do casually, and a
//! test that depended on one credential existing on one machine would be
//! untestable in CI anyway. What is asserted here is the *policy* — which
//! providers have a store, and what a missing store must degrade to.

use super::*;

/// Claude on macOS is the store issue #249 measured; the service name is the
/// one the vendor client writes, so a typo here silently reinstates the bug.
#[test]
fn claude_names_the_vendor_service_on_macos() {
    let service = service_name(SubscriptionProvider::Claude);
    if cfg!(target_os = "macos") {
        assert_eq!(service, Some("Claude Code-credentials"));
    } else {
        assert_eq!(service, None, "no keychain convention is known off macOS");
    }
}

/// Providers with no known vendor keychain must not guess at a service name.
///
/// Guessing would turn every lookup into a miss that looks like a real absence
/// and, worse, could bind a provider to a store its client never writes.
#[test]
fn providers_without_a_known_store_have_no_service_name() {
    for provider in [
        SubscriptionProvider::Codex,
        SubscriptionProvider::Gemini,
        SubscriptionProvider::Qwen,
    ] {
        assert_eq!(
            service_name(provider),
            None,
            "{provider} has no documented keychain store"
        );
    }
}

/// A provider with no store must yield no credential rather than an error:
/// the file remains the source, which is the pre-#249 behaviour everywhere.
#[test]
fn a_provider_without_a_store_looks_up_nothing() {
    assert!(lookup(SubscriptionProvider::Gemini).is_none());
    assert!(lookup(SubscriptionProvider::Qwen).is_none());
}

/// The store label is what `doctor` prints, and the whole point of #249 was
/// that an operator could not tell which store the router had read.
#[test]
fn each_origin_names_itself_distinctly() {
    assert_eq!(Origin::File.label(), "file");
    assert_eq!(Origin::ExternalFile.label(), "external file");
    assert_eq!(Origin::AdoptedFile.label(), "adopted file");
    assert_eq!(Origin::Keychain.label(), "keychain");
    assert_ne!(Origin::File.label(), Origin::Keychain.label());
}

/// A service with no entry must yield `None`, not an error or a panic.
///
/// This drives the real lookup — the `security` subprocess on macOS, the empty
/// stub elsewhere — against a name that cannot exist, so the absent-entry
/// branch is exercised without reading anybody's actual credential.
#[test]
fn an_absent_entry_reads_as_no_credential() {
    let absent = read_generic_password("link-assistant-router-nonexistent-service-a8f3c1");

    assert!(
        absent.is_none(),
        "a service with no entry must not produce a credential"
    );
}

/// The whole lookup, including the store probe, must be safe to call for a
/// provider that has no store: this is what every non-macOS platform does on
/// every credential read.
#[test]
fn looking_up_a_storeless_provider_touches_no_store() {
    assert!(lookup(SubscriptionProvider::Codex).is_none());
}

/// Claude Code names a per-directory entry after the SHA-256 of the
/// `CLAUDE_CONFIG_DIR` value; an unset or empty variable means the default
/// entry (issue #653).
#[test]
fn claude_service_is_scoped_by_the_config_directory() {
    assert_eq!(claude_service_for(None), "Claude Code-credentials");
    assert_eq!(
        claude_service_for(Some(std::ffi::OsStr::new(""))),
        "Claude Code-credentials"
    );
    // sha256("/tmp/claude-a") = f6bf8f9d…
    let scoped = claude_service_for(Some(std::ffi::OsStr::new("/tmp/claude-a")));
    assert_eq!(scoped, "Claude Code-credentials-f6bf8f9d");
    assert_ne!(
        scoped,
        claude_service_for(Some(std::ffi::OsStr::new("/tmp/claude-b")))
    );
}

/// The presence probe has no store to ask off macOS, and never errors.
#[test]
#[cfg(not(target_os = "macos"))]
fn presence_is_false_without_a_platform_store() {
    assert!(!has_entry("Claude Code-credentials"));
}
