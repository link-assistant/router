//! Black-box client setup coverage for disjoint Router origins.

mod common;

use common::{mock_admin_router, mock_router, router};
use std::fs;

#[test]
fn setup_uses_disjoint_management_and_inference_origins() {
    let home = tempfile::tempdir().expect("temp home");
    let (management_url, management) = mock_admin_router(&[("gpt-live", "openai")], "opencode", 2);
    let (base_url, inference) = mock_router(&[("gpt-live", "openai")], 2);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            "la_sk_admin",
            "--server",
            &base_url,
            "--management-server",
            &management_url,
        ],
    );
    let management = management.join().expect("management server");
    let inference = inference.join().expect("inference server");
    assert!(
        setup.status.success(),
        "{}{}\nmanagement={management:#?}\ninference={inference:#?}",
        String::from_utf8_lossy(&setup.stdout),
        String::from_utf8_lossy(&setup.stderr)
    );
    assert!(management[0].starts_with("GET /api/management/tokens "));
    assert!(management[1].starts_with("POST /api/management/tokens/client "));
    assert!(inference[0].starts_with("GET /api/health "));
    assert!(inference[1].starts_with("GET /api/services/openai/v1/models "));
    let settings = fs::read_to_string(home.path().join(".config/opencode/opencode.json"))
        .expect("OpenCode settings");
    assert!(settings.contains(&base_url));
    assert!(!settings.contains(&management_url));
}

#[test]
fn failed_split_setup_revokes_on_management_and_preserves_local_files() {
    let home = tempfile::tempdir().expect("temp home");
    let config = home.path().join(".config/opencode/opencode.json");
    fs::create_dir_all(config.parent().expect("config parent")).expect("create config parent");
    let original = br#"{"theme":"keep-me"}"#;
    fs::write(&config, original).expect("seed config");
    let obstructed = home
        .path()
        .join(".config/link-assistant-router/clients/opencode.credential.json");
    fs::create_dir_all(&obstructed).expect("obstruct metadata write");
    let (management_url, management) = mock_admin_router(&[("gpt-live", "openai")], "opencode", 3);
    let (base_url, inference) = mock_router(&[("gpt-live", "openai")], 2);
    let setup = router(
        home.path(),
        &[
            "clients",
            "setup",
            "opencode",
            "--token",
            "la_sk_admin",
            "--server",
            &base_url,
            "--management-server",
            &management_url,
        ],
    );
    assert!(
        !setup.status.success(),
        "obstructed setup unexpectedly worked"
    );
    assert_eq!(fs::read(&config).expect("preserved config"), original);
    assert!(
        !home
            .path()
            .join(".config/link-assistant-router/clients/opencode.env")
            .exists()
    );
    let management = management.join().expect("management server");
    let inference = inference.join().expect("inference server");
    assert!(management[0].starts_with("GET /api/management/tokens "));
    assert!(management[1].starts_with("POST /api/management/tokens/client "));
    assert!(management[2].starts_with("POST /api/management/tokens/revoke "));
    assert!(inference[0].starts_with("GET /api/health "));
    assert!(inference[1].starts_with("GET /api/services/openai/v1/models "));
}
