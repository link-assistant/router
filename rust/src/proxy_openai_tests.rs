use super::*;

#[test]
fn native_claude_routes_ignore_the_anthropic_bridge_override() {
    assert_eq!(
        resource::canonical_openai_model(
            UpstreamProvider::Anthropic,
            true,
            Some("unrelated-codex-bridge-model"),
            "claude-future-native",
        ),
        "claude-future-native"
    );
}

#[test]
fn dropped_tools_are_logged_locally_without_a_wire_header() {
    let data = tempfile::tempdir().expect("data dir");
    let state = AppState::for_tests(data.path());
    let response = report_dropped_tools(
        &state,
        &HeaderMap::new(),
        Response::new(axum::body::Body::empty()),
        &["multi_agent_v1".to_string()],
    );

    assert!(response.headers().get("x-router-dropped-tools").is_none());
    let written = std::fs::read_to_string(
        state
            .request_log
            .path()
            .join("unauthenticated/requests.lino"),
    )
    .expect("translation diagnostic");
    assert!(written.contains("translation_diagnostic"));
    assert!(written.contains("multi_agent_v1"));
}
