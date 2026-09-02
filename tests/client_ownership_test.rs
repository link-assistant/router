//! Ownership-state and dry-run contract for client repair (#393).

mod common;

use common::router;
use link_assistant_router::clients::{ClientKind, ClientManager, OwnershipState};
use std::fs;

fn helper_claude_settings() -> &'static str {
    r#"{
  "permissions": {"allow": ["Read"]},
  "env": {
    "ANTHROPIC_AUTH_TOKEN": "z.ai-secret-that-must-never-be-reported",
    "ANTHROPIC_BASE_URL": "https://api.z.ai/api/anthropic",
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC": "1",
    "ANTHROPIC_DEFAULT_OPUS_MODEL": "future-helper-pin",
    "CLAUDE_CODE_MAX_OUTPUT_CHARS": "50000"
  }
}"#
}

#[test]
fn claude_ownership_distinguishes_foreign_intact_drifted_and_ambiguous() {
    let home = tempfile::tempdir().expect("isolated home");
    let manager = ClientManager::isolated(home.path());
    assert_eq!(
        manager
            .analyze(ClientKind::ClaudeCode)
            .expect("empty analysis")
            .state,
        OwnershipState::Unconfigured
    );

    let settings = home.path().join(".claude/settings.json");
    fs::create_dir_all(settings.parent().unwrap()).unwrap();
    fs::write(&settings, helper_claude_settings()).unwrap();
    let foreign = manager.analyze(ClientKind::ClaudeCode).expect("foreign");
    assert_eq!(foreign.state, OwnershipState::Foreign);
    assert!(
        foreign
            .conflicts
            .iter()
            .any(|key| key.contains("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"))
    );
    let report = serde_json::to_string(&foreign).unwrap();
    assert!(!report.contains("z.ai-secret"), "analysis leaked a secret");

    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "claude",
            "--token",
            "la_sk_managed_secret",
            "--server",
            "http://router.test:8080",
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    assert_eq!(
        manager
            .analyze(ClientKind::ClaudeCode)
            .expect("intact")
            .state,
        OwnershipState::ManagedIntact
    );

    let mut value: serde_json::Value =
        serde_json::from_slice(&fs::read(&settings).unwrap()).unwrap();
    value["env"]["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"] = "1".into();
    fs::write(&settings, serde_json::to_vec_pretty(&value).unwrap()).unwrap();
    assert_eq!(
        manager
            .analyze(ClientKind::ClaudeCode)
            .expect("drifted")
            .state,
        OwnershipState::ManagedDrifted
    );

    fs::write(
        home.path()
            .join(".claude/.link-assistant-router-client.json"),
        "not json",
    )
    .unwrap();
    assert_eq!(
        manager
            .analyze(ClientKind::ClaudeCode)
            .expect("ambiguous")
            .state,
        OwnershipState::Ambiguous
    );
}

#[test]
fn repair_dry_run_is_byte_identical_and_needs_no_router() {
    let home = tempfile::tempdir().expect("isolated home");
    let settings = home.path().join(".claude/settings.json");
    fs::create_dir_all(settings.parent().unwrap()).unwrap();
    fs::write(&settings, helper_claude_settings()).unwrap();
    let before = fs::read(&settings).unwrap();

    let output = router(
        home.path(),
        &["clients", "repair", "claude", "--dry-run", "--json"],
    );
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert_eq!(fs::read(&settings).unwrap(), before);
    assert!(!home.path().join(".config/link-assistant-router/repairs").exists());
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("foreign"), "{stdout}");
    assert!(!stdout.contains("z.ai-secret"), "{stdout}");
}
