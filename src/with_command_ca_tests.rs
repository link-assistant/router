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
        profile_root: Some(directory.path()),
        codex_reasoning_effort: None,
        codex_backend_base_url: None,
        ca_cert: Some(&certificate),
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
