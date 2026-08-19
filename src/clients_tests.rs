//! Tests for [`crate::clients`].
//!
//! Split from `clients.rs` to keep that file within the repository's 1000-line
//! limit.

use clap::ValueEnum as _;

/// The name every surface advertises must be the command the client
/// actually installs as. Advertising `claude-code` while the user's shell
/// has `claude` taught a name that does not exist (issue #220).
///
/// One assertion over the existing table, so the two cannot drift apart.
#[test]
fn the_canonical_name_is_the_real_command() {
    for integration in super::CLIENT_INTEGRATIONS {
        let advertised = integration
            .kind
            .to_possible_value()
            .expect("every client is selectable")
            .get_name()
            .to_string();
        assert_eq!(
            advertised, integration.command,
            "{advertised} is advertised but the command is {}",
            integration.command
        );
        // `Display` drives `clients list` and the managed file names, so it
        // must agree with what the parser advertises.
        assert_eq!(integration.kind.to_string(), integration.command);
        assert_eq!(integration.kind.canonical_name(), integration.command);
    }
}

/// The superseded long forms must keep parsing, so this rename does not
/// break existing scripts or the commands already documented elsewhere.
#[test]
fn every_legacy_client_name_still_parses() {
    for (legacy, expected) in [
        ("claude-code", super::ClientKind::ClaudeCode),
        ("cursor", super::ClientKind::Cursor),
        ("gemini-cli", super::ClientKind::GeminiCli),
        ("grok-cli", super::ClientKind::GrokCli),
        ("qwen-code", super::ClientKind::QwenCode),
    ] {
        assert_eq!(
            super::ClientKind::from_str(legacy, true),
            Ok(expected),
            "{legacy} must remain accepted"
        );
    }
    // And the canonical names parse, naturally.
    for integration in super::CLIENT_INTEGRATIONS {
        assert_eq!(
            super::ClientKind::from_str(integration.command, true),
            Ok(integration.kind),
            "{} must parse",
            integration.command
        );
    }
}

/// A managed file written under the pre-rename name must still be found.
/// These paths are derived from the client name, so without the fallback an
/// existing installation's `claude-code.env` would simply stop being seen
/// and the user would be told to run a setup they had already run.
#[test]
fn a_file_written_under_the_legacy_name_is_still_found() {
    let home = tempfile::tempdir().expect("temp home");
    let clients = home.path().join(".config/link-assistant-router/clients");
    std::fs::create_dir_all(&clients).expect("create managed directory");
    let legacy = clients.join("claude-code.env");
    std::fs::write(&legacy, "TOKEN=x").expect("write legacy file");

    let manager = super::ClientManager::isolated(home.path());
    assert_eq!(
        manager.environment_path(super::ClientKind::ClaudeCode),
        legacy,
        "an existing legacy file must be honoured"
    );
}

/// A fresh installation uses the canonical name, so the legacy names do not
/// outlive the migration.
#[test]
fn a_fresh_installation_uses_the_canonical_name() {
    let home = tempfile::tempdir().expect("temp home");
    let manager = super::ClientManager::isolated(home.path());
    let path = manager.environment_path(super::ClientKind::ClaudeCode);
    assert!(
        path.ends_with("claude.env"),
        "expected the canonical name, got {}",
        path.display()
    );
}

/// Every variant is covered by the legacy table, so the file-migration
/// fallback cannot silently miss one.
#[test]
fn every_client_has_a_legacy_name() {
    for kind in super::ClientKind::ALL {
        assert!(!kind.legacy_name().is_empty(), "{kind} has no legacy name");
    }
}

use super::*;

#[test]
fn rejects_non_http_router_urls() {
    assert!(normalize_base_url("router.internal:8080").is_err());
}

#[test]
fn compact_diagnostics_do_not_echo_unbounded_upstream_bodies() {
    let body = "x".repeat(500);
    let compact = compact_body(&body);
    assert!(compact.ends_with('…'));
    assert!(compact.chars().count() <= 241);
}
