//! Ownership-state and dry-run contract for client repair (#393).

mod common;

use common::{bound_client_token, mock_admin_router, mock_router, router, router_with_env};
use link_assistant_router::clients::{ClientKind, ClientManager, OwnershipState};
use std::fs;

const fn helper_claude_settings() -> &'static str {
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

    let (base_url, catalog) = mock_router(&[("claude-future-2099", "anthropic")], 1);
    let token = bound_client_token("claude", "ownership-principal");
    let setup = router(
        home.path(),
        &[
            "clients", "setup", "claude", "--token", &token, "--server", &base_url,
        ],
    );
    assert!(
        setup.status.success(),
        "{}",
        String::from_utf8_lossy(&setup.stderr)
    );
    let requests = catalog.join().expect("catalog server");
    assert!(requests[0].starts_with("GET /api/models "));
    let configured: serde_json::Value =
        serde_json::from_slice(&fs::read(&settings).unwrap()).unwrap();
    assert_eq!(
        configured["env"]["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"], "1",
        "setup must preserve a user-owned value"
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
    value["env"]["CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY"] = "0".into();
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
        "status: {}; stdout: {}; stderr: {}",
        output.status,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );
    assert_eq!(fs::read(&settings).unwrap(), before);
    assert!(
        !home
            .path()
            .join(".config/link-assistant-router/repairs")
            .exists()
    );
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(stdout.contains("foreign"), "{stdout}");
    assert!(!stdout.contains("z.ai-secret"), "{stdout}");
}

#[test]
fn foreign_repair_validates_then_commits_is_idempotent_and_rolls_back() {
    let home = tempfile::tempdir().expect("isolated home");
    let settings = home.path().join(".claude/settings.json");
    fs::create_dir_all(settings.parent().unwrap()).unwrap();
    fs::write(&settings, helper_claude_settings()).unwrap();
    let original = fs::read(&settings).unwrap();
    let vendor_auth = home.path().join(".claude/.credentials.json");
    fs::write(&vendor_auth, b"vendor-auth-must-stay-exact").unwrap();
    let external = home.path().join(".chelper/state.json");
    fs::create_dir_all(external.parent().unwrap()).unwrap();
    fs::write(&external, b"external-tool-state").unwrap();

    let (base_url, server) = mock_admin_router(&[("claude-future-2099", "anthropic")], "claude", 5);
    let output = router_with_env(
        home.path(),
        &["clients", "repair", "claude", "--json"],
        &[
            ("LINK_ASSISTANT_ROUTER_URL", &base_url),
            ("LINK_ASSISTANT_ROUTER_TOKEN", "la_sk_selected"),
        ],
    );
    assert!(
        output.status.success(),
        "status: {}; stdout: {}; stderr: {}",
        output.status,
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
    );
    let requests = server.join().unwrap();
    assert_eq!(requests.len(), 5, "{requests:?}");
    assert!(requests[0].starts_with("GET /api/health "));
    assert!(requests[1].starts_with("GET /api/management/tokens "));
    assert!(requests[2].starts_with("POST /api/management/tokens/client "));
    assert!(requests[3].starts_with("GET /api/services/anthropic/v1/models "));
    assert!(requests[4].starts_with("GET /api/models "), "{requests:?}");
    let stdout = String::from_utf8_lossy(&output.stdout);
    assert!(!stdout.contains("la_sk_selected"));
    assert!(!stdout.contains("z.ai-secret"));
    let value: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    let id = value["results"][0]["backup_id"]
        .as_str()
        .expect("backup id")
        .to_string();

    let repaired = fs::read(&settings).unwrap();
    let repairs = home.path().join(".config/link-assistant-router/repairs");
    let snapshot_count = fs::read_dir(&repairs).unwrap().count();
    let second = router(home.path(), &["clients", "repair", "claude", "--json"]);
    assert!(
        second.status.success(),
        "{}",
        String::from_utf8_lossy(&second.stderr)
    );
    assert_eq!(fs::read(&settings).unwrap(), repaired);
    assert_eq!(fs::read_dir(&repairs).unwrap().count(), snapshot_count);

    let rollback = router(
        home.path(),
        &["clients", "repair", "claude", "--rollback", &id],
    );
    assert!(
        rollback.status.success(),
        "{}",
        String::from_utf8_lossy(&rollback.stderr)
    );
    assert_eq!(fs::read(&settings).unwrap(), original);
    assert_eq!(
        fs::read(&vendor_auth).unwrap(),
        b"vendor-auth-must-stay-exact"
    );
    assert_eq!(fs::read(&external).unwrap(), b"external-tool-state");
}

#[test]
fn repair_uses_disjoint_management_and_inference_origins() {
    let home = tempfile::tempdir().expect("isolated home");
    let settings = home.path().join(".config/opencode/opencode.json");
    fs::create_dir_all(settings.parent().unwrap()).unwrap();
    fs::write(&settings, r#"{"theme":"preserved"}"#).unwrap();
    let (management_url, management) =
        mock_admin_router(&[("gpt-future", "openai")], "opencode", 2);
    let (base_url, inference) = mock_router(&[("gpt-future", "openai")], 3);

    let output = router_with_env(
        home.path(),
        &["clients", "repair", "opencode", "--json"],
        &[
            ("LINK_ASSISTANT_ROUTER_URL", &base_url),
            ("LINK_ASSISTANT_ROUTER_MANAGEMENT_URL", &management_url),
            ("LINK_ASSISTANT_ROUTER_TOKEN", "la_sk_admin"),
        ],
    );
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let management = management.join().expect("management listener");
    let inference = inference.join().expect("inference listener");
    assert!(management[0].starts_with("GET /api/management/tokens "));
    assert!(management[1].starts_with("POST /api/management/tokens/client "));
    assert!(inference[0].starts_with("GET /api/health "));
    assert!(
        inference[1].starts_with("GET /api/services/openai/v1/models "),
        "{inference:?}"
    );
    assert!(
        inference[2].starts_with("GET /api/models "),
        "{inference:?}"
    );
    let rendered = fs::read_to_string(settings).expect("repaired config");
    assert!(rendered.contains(&base_url));
    assert!(!rendered.contains(&management_url));
}

#[test]
fn ambient_claude_precedence_is_reported_without_leaking_endpoint_details() {
    let home = tempfile::tempdir().expect("isolated home");
    let output = router_with_env(
        home.path(),
        &["clients", "show", "claude"],
        &[
            (
                "ANTHROPIC_BASE_URL",
                "https://operator:password@router.example:8443/private/path?token=secret#fragment",
            ),
            ("ANTHROPIC_API_KEY", "private-api-key"),
            ("ANTHROPIC_MODEL", "foreign-model-pin"),
            ("ANTHROPIC_DEFAULT_OPUS_MODEL", "foreign-family-pin"),
            ("CLAUDE_CODE_SUBAGENT_MODEL", "foreign-subagent-pin"),
            ("CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY", "0"),
            ("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1"),
        ],
    );
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let report = String::from_utf8_lossy(&output.stdout);
    assert!(report.contains("https://router.example:8443"), "{report}");
    for private in [
        "operator",
        "password",
        "/private/path",
        "token=secret",
        "private-api-key",
        "foreign-model-pin",
        "foreign-family-pin",
        "foreign-subagent-pin",
    ] {
        assert!(
            !report.contains(private),
            "report leaked {private}: {report}"
        );
    }
    for conflict in [
        "ambient:ANTHROPIC_API_KEY",
        "ambient:ANTHROPIC_MODEL",
        "ambient:ANTHROPIC_DEFAULT_OPUS_MODEL",
        "ambient:CLAUDE_CODE_SUBAGENT_MODEL",
        "ambient:CLAUDE_CODE_ENABLE_GATEWAY_MODEL_DISCOVERY",
        "ambient:CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    ] {
        assert!(report.contains(conflict), "missing {conflict}: {report}");
    }
}
