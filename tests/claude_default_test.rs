mod common;
use common::{bound_client_token, catalog_server, mock_router, router};
use std::fs;
fn test_token(client: &str) -> String {
    bound_client_token(client, "default-test")
}

#[test]
fn fresh_zai_claude_uses_flagship_and_reconfiguration_keeps_saved_flash() {
    let home = tempfile::tempdir().expect("home");
    let (origin, server) = mock_router(&[("glm-5.3", "z.ai"), ("glm-5.3-flashx", "z.ai")], 2);
    let token = test_token("claude");
    let args = [
        "clients", "setup", "claude", "--token", &token, "--server", &origin,
    ];
    assert!(router(home.path(), &args).status.success());
    let path = home.path().join(".claude/settings.json");
    let mut settings: serde_json::Value =
        serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    assert_eq!(settings["env"]["ANTHROPIC_MODEL"], "glm-5.3");
    settings["model"] = serde_json::json!("glm-5.3-flashx");
    fs::write(&path, serde_json::to_vec(&settings).unwrap()).unwrap();
    assert!(router(home.path(), &args).status.success());
    server.join().unwrap();
    let settings: serde_json::Value = serde_json::from_slice(&fs::read(&path).unwrap()).unwrap();
    assert_eq!(settings["model"], "glm-5.3-flashx");
    assert!(settings["env"].get("ANTHROPIC_MODEL").is_none());
}

#[test]
fn claude_setup_retains_an_explicit_user_environment_model() {
    let home = tempfile::tempdir().expect("home");
    fs::create_dir_all(home.path().join(".claude")).unwrap();
    fs::write(
        home.path().join(".claude/settings.json"),
        r#"{"env":{"ANTHROPIC_MODEL":"glm-5.3-flashx"}}"#,
    )
    .unwrap();
    let (origin, server) = catalog_server(&[("glm-5.3", "z.ai"), ("glm-5.3-flashx", "z.ai")]);
    let token = test_token("claude");
    assert!(
        router(
            home.path(),
            &[
                "clients", "setup", "claude", "--token", &token, "--server", &origin
            ]
        )
        .status
        .success()
    );
    server.join().unwrap();
    let settings: serde_json::Value =
        serde_json::from_slice(&fs::read(home.path().join(".claude/settings.json")).unwrap())
            .unwrap();
    assert_eq!(settings["env"]["ANTHROPIC_MODEL"], "glm-5.3-flashx");
}

#[test]
fn a_withdrawn_saved_claude_model_refuses_without_changing_settings() {
    let home = tempfile::tempdir().expect("home");
    fs::create_dir_all(home.path().join(".claude")).unwrap();
    let path = home.path().join(".claude/settings.json");
    let before = br#"{"model":"withdrawn-model"}"#;
    fs::write(&path, before).unwrap();
    let (origin, server) = catalog_server(&[("glm-5.3", "z.ai")]);
    let token = test_token("claude");
    let output = router(
        home.path(),
        &[
            "clients", "setup", "claude", "--token", &token, "--server", &origin,
        ],
    );
    server.join().unwrap();
    assert!(!output.status.success());
    assert_eq!(fs::read(&path).unwrap(), before);
}
