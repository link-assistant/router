use super::*;

#[test]
fn current_codex_activates_history_notes_through_the_router_identity() {
    if !enabled() {
        return;
    }
    assert!(
        command_exists(CODEX.executable),
        "{} is required for the real-client gate",
        CODEX.executable
    );
    let home = tempfile::tempdir().expect("temporary Codex home");
    let codex_home = home.path().join(".codex");
    std::fs::create_dir_all(&codex_home).expect("create Codex home");
    std::fs::write(
        codex_home.join("config.toml"),
        concat!(
            "[features.token_budget]\n",
            "enabled = true\n",
            "use_history_notes_extension = true\n\n",
            "[model_providers.link-assistant]\n",
            "name = \"Legacy Router profile\"\n",
            "base_url = \"http://127.0.0.1:9/v1\"\n",
            "env_key = \"LINK_ASSISTANT_TOKEN\"\n",
            "wire_api = \"responses\"\n",
        ),
    )
    .expect("enable the current history/notes extension");
    let version = version_output(CODEX, home.path());
    assert!(version.status.success());
    assert!(
        format!(
            "{}{}",
            String::from_utf8_lossy(&version.stdout),
            String::from_utf8_lossy(&version.stderr)
        )
        .contains(CODEX.version)
    );

    let router = MockRouter::start(CODEX);
    let output = run_wrapper(
        CODEX,
        Path::new(env!("CARGO_MANIFEST_DIR")),
        home.path(),
        &router.origin,
    );
    assert!(
        output.status.success(),
        "Codex history/notes activation failed; stdout: {}; stderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    let hint = {
        let requests = router.requests.lock().expect("read history requests");
        requests
            .iter()
            .find(|request| {
                request.method == "POST"
                    && request.path == "/api/services/codex/v1/alpha/notes/v2/thread_hint"
            })
            .cloned()
    }
    .unwrap_or_else(|| {
        panic!(
            "current Codex did not request its history/notes thread hint; routes: {:?}",
            router.routes()
        )
    });
    let expected_alias = format!("Bearer {}", run_token(CODEX).replacen("la_sk_", "at-", 1));
    assert_eq!(hint.header("authorization"), Some(expected_alias.as_str()));
    assert_eq!(hint.header("chatgpt-account-id"), Some("acct_offline"));
    assert!(
        hint.header("x-openai-tool-output-truncation-policy")
            .is_some_and(|value| value.contains("4000")),
        "missing current truncation policy: {:?}",
        hint.headers
    );
    assert!(hint.header("x-openai-encrypted-tool-arguments").is_none());
    let body = hint.json_body();
    assert!(
        body.pointer("/context/session_id")
            .and_then(Value::as_str)
            .is_some_and(|value| !value.is_empty())
    );
    assert!(
        body.pointer("/context/current_agent_name")
            .and_then(Value::as_str)
            .is_some_and(|value| !value.is_empty())
    );
}
