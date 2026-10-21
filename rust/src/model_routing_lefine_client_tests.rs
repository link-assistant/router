use super::provider_tests::{bearer_for, lefine_upstream, store_lefine};
use super::tests::auto_state;
use axum::extract::{Query, State};
use axum::http::{HeaderValue, StatusCode};
use http_body_util::BodyExt as _;
use std::collections::BTreeMap;

#[tokio::test]
async fn every_lefine_compatible_client_preserves_the_complete_chat_fixture() {
    const SUCCESS: &str = r#"{"id":"chat-native","object":"chat.completion","model":"vendor/live-exact","choices":[{"index":0,"message":{"role":"assistant","content":null,"tool_calls":[{"id":"call-1","type":"function","function":{"name":"lookup","arguments":"{}"}}]},"finish_reason":"tool_calls"}],"usage":{"prompt_tokens":7,"completion_tokens":3,"total_tokens":10}}"#;
    for client in [
        crate::clients::ClientKind::Opencode,
        crate::clients::ClientKind::GrokCli,
        crate::clients::ClientKind::QwenCode,
    ] {
        let (base_url, requests, task) =
            lefine_upstream(StatusCode::OK, "application/json", SUCCESS).await;
        let data_dir = tempfile::tempdir().expect("data dir");
        let state = auto_state(Vec::new(), data_dir.path());
        store_lefine(&state, base_url);
        let mut headers = bearer_for(&state, client);
        headers.insert("content-type", HeaderValue::from_static("application/json"));
        headers.insert("connection", HeaderValue::from_static("x-hop-secret"));
        headers.insert("x-hop-secret", HeaderValue::from_static("private-hop"));
        headers.insert(
            "x-forwarded-client-cert",
            HeaderValue::from_static("By=spiffe://private;Subject=client"),
        );
        let request_body = serde_json::json!({
            "model": "vendor/live-exact",
            "messages": [
                {"role": "system", "content": "be exact"},
                {"role": "user", "content": "use a tool"}
            ],
            "tools": [{"type":"function","function":{"name":"lookup","parameters":{"type":"object"}}}],
            "tool_choice": "auto"
        });

        let response = crate::proxy::openai_chat_completions(
            State(state),
            Query(BTreeMap::new()),
            headers,
            Ok(axum::Json(request_body.clone())),
        )
        .await;

        assert_eq!(response.status(), StatusCode::OK, "{client:?}");
        assert_eq!(
            response
                .into_body()
                .collect()
                .await
                .unwrap()
                .to_bytes()
                .as_ref(),
            SUCCESS.as_bytes(),
            "{client:?}"
        );
        let captured = requests.lock().unwrap();
        assert_eq!(captured.len(), 1, "{client:?}");
        assert_eq!(
            serde_json::from_slice::<serde_json::Value>(&captured[0].body).unwrap(),
            request_body,
            "{client:?}"
        );
        assert_eq!(captured[0].headers["authorization"], "Bearer lefine-secret");
        assert!(!captured[0].headers.contains_key("connection"));
        assert!(!captured[0].headers.contains_key("x-hop-secret"));
        assert!(!captured[0].headers.contains_key("x-forwarded-client-cert"));
        drop(captured);
        task.abort();
    }
}
