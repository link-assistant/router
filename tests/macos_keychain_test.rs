//! Real macOS Keychain lookups (issue #674).
//!
//! These tests read the login Keychain, so they run only when
//! `ROUTER_TEST_KEYCHAIN=1` is set on macOS: the `macOS Keychain` workflow
//! creates a throwaway keychain, makes it the default, and seeds it with fake
//! Claude Code items before running them. Everywhere else they return early,
//! so no test ever reads a developer's real credential.
//!
//! The workflow seeds:
//!
//! - `Claude Code-credentials` holding [`SEEDED_ACCESS_TOKEN`] (expiring far in
//!   the future), the entry Claude Code writes for the default config dir;
//! - the entry Claude Code writes when `CLAUDE_CONFIG_DIR` is [`SCOPED_DIR`];
//! - `~/.claude/.credentials.json` holding [`STALE_FILE_TOKEN`] with an older
//!   expiry, the stale snapshot issue #249 was about.

use link_assistant_router::platform_keychain::{self, Origin};
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};

const SEEDED_ACCESS_TOKEN: &str = "keychain-ci-fake-access-token";
const STALE_FILE_TOKEN: &str = "file-ci-stale-access-token";
const SCOPED_DIR: &str = "/tmp/router-keychain-ci";

/// Whether the seeded throwaway keychain is in place.
fn seeded() -> bool {
    let enabled =
        cfg!(target_os = "macos") && std::env::var("ROUTER_TEST_KEYCHAIN").as_deref() == Ok("1");
    if !enabled {
        eprintln!("skipped: set ROUTER_TEST_KEYCHAIN=1 on macOS with the seeded keychain");
    }
    enabled
}

#[test]
fn the_seeded_claude_entry_is_found_and_read() {
    if !seeded() {
        return;
    }
    assert_eq!(
        platform_keychain::service_name(SubscriptionProvider::Claude),
        Some("Claude Code-credentials")
    );
    assert!(platform_keychain::has_entry("Claude Code-credentials"));
    let raw = platform_keychain::lookup(SubscriptionProvider::Claude)
        .expect("the seeded Claude Code entry is readable");
    assert!(
        raw.contains(SEEDED_ACCESS_TOKEN),
        "unexpected entry: {}",
        raw.len()
    );
    // Providers without a vendor keychain entry never consult it.
    assert!(platform_keychain::lookup(SubscriptionProvider::Codex).is_none());
}

#[test]
fn a_config_directory_scoped_entry_is_found_by_its_hashed_name() {
    if !seeded() {
        return;
    }
    let scoped = platform_keychain::claude_service_for(Some(std::ffi::OsStr::new(SCOPED_DIR)));
    assert_ne!(scoped, "Claude Code-credentials");
    assert!(platform_keychain::has_entry(&scoped), "{scoped} not found");
    assert!(!platform_keychain::has_entry(
        "link-assistant-router-nonexistent-service-a8f3c1"
    ));
}

#[test]
fn the_live_keychain_credential_beats_a_stale_file() {
    if !seeded() {
        return;
    }
    let home = std::env::var("HOME").expect("HOME is set");
    let reader = SubscriptionReader::from_user_home(SubscriptionProvider::Claude, &home);
    let (token, origin) = reader.read_token_from().expect("a Claude credential");
    assert_eq!(
        origin,
        Origin::Keychain,
        "the newer Keychain entry must win"
    );
    assert_eq!(token.access_token, SEEDED_ACCESS_TOKEN);
    assert_ne!(token.access_token, STALE_FILE_TOKEN);
    assert!(reader.has_platform_store_credential());
}
