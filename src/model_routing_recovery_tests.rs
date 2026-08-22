//! Credential-recovery registration tests for [`crate::model_routing`].
//!
//! Split from `model_routing_tests.rs` to keep that file within the
//! repository's 1000-line limit.

use super::tests::auto_state;
use super::*;
use std::fs;
use tempfile::tempdir;

/// Registration is what lets a refresh on the serving path re-read and write
/// back the same credential file the catalog poller uses; without it a rotation
/// performed while serving is lost at restart (issue #239). The vendor-client
/// rung stays inert until an operator configures a binary.
#[test]
fn credential_recovery_registers_stores_and_only_an_asked_for_vendor_client() {
    let dir = tempdir().unwrap();
    let home = dir.path().join("claude-home");
    fs::create_dir_all(&home).unwrap();
    fs::write(
        home.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"a","refreshToken":"r","expiresAt":1}}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(SubscriptionProvider::Claude, &home)];

    let without = auto_state(readers.clone(), dir.path());
    without.register_credential_recovery(&crate::app_state::VendorClis::default());
    assert!(
        without
            .subscription_cache
            .store_for_subscription(SubscriptionProvider::Claude, "primary")
            .is_some(),
        "the serving path must know where the credential lives"
    );
    assert!(
        without
            .subscription_cache
            .vendor_cli_for(SubscriptionProvider::Claude, "primary")
            .is_none(),
        "running a vendor binary must be opt-in"
    );

    let claude_binary = dir.path().join("claude");
    let with = auto_state(readers, dir.path());
    with.register_credential_recovery(&crate::app_state::VendorClis {
        claude: Some(&claude_binary),
        codex: None,
    });
    let registered = with
        .subscription_cache
        .vendor_cli_for(SubscriptionProvider::Claude, "primary")
        .expect("the configured client is registered");
    assert_eq!(registered.provider(), SubscriptionProvider::Claude);
}

/// The rung reaches Codex too, and each provider's binary is opt-in on its own.
///
/// A deployment used to recover a Claude subscription automatically and require
/// an operator for Codex, which is not a difference the credentials justify —
/// both are OAuth chains with the same single-use rotation (issue #275).
#[test]
fn credential_recovery_registers_a_codex_client_independently() {
    let dir = tempdir().unwrap();
    let codex_home = dir.path().join("codex-home");
    fs::create_dir_all(&codex_home).unwrap();
    fs::write(
        codex_home.join("auth.json"),
        r#"{"tokens":{"access_token":"a","refresh_token":"r"}}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Codex,
        &codex_home,
    )];

    let codex_binary = dir.path().join("codex");
    let state = auto_state(readers, dir.path());
    state.register_credential_recovery(&crate::app_state::VendorClis {
        claude: None,
        codex: Some(&codex_binary),
    });

    let registered = state
        .subscription_cache
        .vendor_cli_for(SubscriptionProvider::Codex, "primary")
        .expect("the configured Codex client is registered");
    assert_eq!(registered.provider(), SubscriptionProvider::Codex);
    assert!(
        state
            .subscription_cache
            .vendor_cli_for(SubscriptionProvider::Claude, "primary")
            .is_none(),
        "configuring one vendor binary must not enable another"
    );
}
