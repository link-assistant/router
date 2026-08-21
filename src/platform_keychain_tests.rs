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
    assert_eq!(Origin::Keychain.label(), "keychain");
    assert_ne!(Origin::File.label(), Origin::Keychain.label());
}
