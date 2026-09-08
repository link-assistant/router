use super::*;

pub(super) async fn assert_native_responses_identity(codex: &TestRouter, id: &str) {
    let response = codex
        .post(
            "/api/services/codex/v1/responses",
            &json!({"model": id, "input": "hi", "stream": false}),
        )
        .send()
        .await
        .expect("native buffered responses response");
    assert!(response.headers().get("x-router-upstream-model").is_none());
    let payload = response_payload(response).await;
    assert_eq!(payload["model"], id, "native buffered responses identity");
    assert!(payload.get("x_router_upstream_model").is_none());

    let stream = codex
        .post(
            "/api/services/codex/v1/responses",
            &json!({"model": id, "input": "hi", "stream": true}),
        )
        .send()
        .await
        .expect("native streamed responses response");
    assert!(stream.headers().get("x-router-upstream-model").is_none());
    let stream = stream.text().await.expect("native Responses SSE body");
    let lifecycle_models = stream
        .lines()
        .filter_map(|line| line.strip_prefix("data: "))
        .filter(|payload| *payload != "[DONE]")
        .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        .filter_map(|event| event["response"]["model"].as_str().map(str::to_string))
        .collect::<Vec<_>>();
    assert_eq!(
        lifecycle_models,
        [id, id],
        "native lifecycle model identity"
    );
    assert!(!stream.contains("x_router_"));
}
