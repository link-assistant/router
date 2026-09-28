//! Trust propagation tests for temporary client launches.

use super::*;

/// The CA associated with the inference origin reaches Node-based clients as
/// additional trust without disabling certificate or hostname validation.
#[test]
fn claude_receives_the_selected_router_ca_as_additional_trust() {
    let directory = tempfile::tempdir().expect("profile root");
    let certificate = directory.path().join("router-ca.pem");
    std::fs::write(&certificate, "test certificate").expect("certificate fixture");
    let prepared = TemporaryClient::prepare(&Preparation {
        client: ClientKind::ClaudeCode,
        base_url: "https://router.example",
        token: "la_sk_test",
        model_override: None,
        models: &[],
        isolated_config: false,
        extend_user_configuration: true,
        one_shot: true,
        user_model_selection: None,
        profile_root: Some(directory.path()),
        codex_reasoning_effort: None,
        codex_backend_base_url: None,
        ca_cert: Some(&certificate),
        user_claude_settings: None,
    })
    .expect("prepare Claude");
    let environment = prepared
        .command
        .get_envs()
        .collect::<std::collections::HashMap<_, _>>();
    assert_eq!(
        environment
            .get(std::ffi::OsStr::new("NODE_EXTRA_CA_CERTS"))
            .and_then(|value| *value),
        Some(certificate.as_os_str())
    );
    assert!(
        environment
            .keys()
            .all(|name| *name != "NODE_TLS_REJECT_UNAUTHORIZED"),
        "trust must not disable verification"
    );
}

/// Preparing an extended Claude launch reads only the settings file its caller
/// resolved, never the host's own profile. A developer whose Claude had saved
/// `opus` made the test above fail against its empty catalog (issue #613).
#[test]
fn an_extended_claude_launch_reads_only_the_saved_model_it_is_given() {
    let directory = tempfile::tempdir().expect("profile root");
    let external = directory.path().join("external-claude/settings.json");
    std::fs::create_dir_all(external.parent().expect("parent")).expect("external profile");
    std::fs::write(&external, r#"{"model":"opus"}"#).expect("saved model");
    let preparation = |user_claude_settings| Preparation {
        client: ClientKind::ClaudeCode,
        base_url: "https://router.example",
        token: "la_sk_test",
        model_override: None,
        models: &[],
        isolated_config: false,
        extend_user_configuration: true,
        one_shot: true,
        user_model_selection: None,
        profile_root: Some(directory.path()),
        codex_reasoning_effort: None,
        codex_backend_base_url: None,
        ca_cert: None,
        user_claude_settings,
    };
    let Err(error) = TemporaryClient::prepare(&preparation(Some(&external))) else {
        panic!("a saved `opus` cannot run on an empty catalog");
    };
    assert!(error.to_string().contains("`opus`"), "{error}");
    // Without a resolved profile there is no saved model to honour, whatever
    // the process environment's HOME or CLAUDE_CONFIG_DIR hold.
    TemporaryClient::prepare(&preparation(None)).expect("no external profile consulted");
}
