use super::*;

pub(super) async fn assert_native_responses_identity(
    codex: &TestRouter,
    requested: &str,
    served: &str,
) {
    let response = codex
        .post(
            "/api/services/codex/v1/responses",
            &json!({"model": requested, "input": "hi", "stream": false}),
        )
        .send()
        .await
        .expect("native buffered responses response");
    assert!(response.headers().get("x-router-upstream-model").is_none());
    let payload = response_payload(response).await;
    assert_eq!(
        payload["model"], served,
        "native buffered responses identity"
    );
    assert!(payload.get("x_router_upstream_model").is_none());

    let stream = codex
        .post(
            "/api/services/codex/v1/responses",
            &json!({"model": requested, "input": "hi", "stream": true}),
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
        [served, served],
        "native lifecycle model identity"
    );
    assert!(!stream.contains("x_router_"));
}

#[tokio::test]
async fn advertised_aliases_report_the_concrete_served_identity_on_every_openai_surface() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;

    let catalog: Value = codex
        .get("/api/services/codex/v1/models")
        .send()
        .await
        .expect("model catalog response")
        .json()
        .await
        .expect("model catalog JSON");
    let ids = catalog["models"]
        .as_array()
        .expect("Codex ModelInfo array")
        .iter()
        .filter_map(|model| model["slug"].as_str().map(str::to_string))
        .collect::<Vec<_>>();
    assert_eq!(ids, ["gpt-5", "codex-auto-review"]);

    for id in &ids {
        let expected = if id == "codex-auto-review" {
            "gpt-5.6-luna"
        } else {
            id.as_str()
        };
        let payload: Value = codex
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model": id, "messages": [{"role":"user","content":"hi"}]}),
            )
            .send()
            .await
            .expect("buffered chat response")
            .json()
            .await
            .expect("chat JSON");
        assert_eq!(payload["model"], expected, "buffered chat identity");
        assert!(payload.get("x_router_upstream_model").is_none());

        let stream = codex
            .post(
                "/api/services/openai/v1/chat/completions",
                &json!({"model": id, "messages": [{"role":"user","content":"hi"}], "stream": true}),
            )
            .send()
            .await
            .expect("streamed chat response")
            .text()
            .await
            .expect("SSE body");
        for chunk in stream
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|payload| *payload != "[DONE]")
            .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        {
            assert_eq!(chunk["model"], expected, "streamed chat identity");
        }

        let response = codex
            .post(
                "/api/services/openai/v1/responses",
                &json!({"model": id, "input": "hi"}),
            )
            .send()
            .await
            .expect("buffered responses response");
        assert!(response.headers().get("x-router-upstream-model").is_none());
        let payload = response_payload(response).await;
        assert_eq!(payload["model"], expected, "buffered responses identity");
        assert!(payload.get("x_router_upstream_model").is_none());

        let stream = codex
            .post(
                "/api/services/openai/v1/responses",
                &json!({"model": id, "input": "hi", "stream": true}),
            )
            .send()
            .await
            .expect("streamed responses response")
            .text()
            .await
            .expect("SSE body");
        for event in stream
            .lines()
            .filter_map(|line| line.strip_prefix("data: "))
            .filter(|payload| *payload != "[DONE]")
            .filter_map(|payload| serde_json::from_str::<Value>(payload).ok())
        {
            let Some(model) = event["response"]["model"].as_str() else {
                continue;
            };
            assert_eq!(model, expected, "streamed responses identity: {event}");
        }

        assert_native_responses_identity(&codex, id, expected).await;
    }

    let audit = std::fs::read_to_string(&codex.audit_path).expect("read model identity audit");
    let events = audit
        .lines()
        .map(|line| serde_json::from_str::<Value>(line).expect("audit JSON line"))
        .collect::<Vec<_>>();
    assert!(
        events.iter().any(|event| {
            event["phase"] == "response_completed"
                && event["model"] == "codex-auto-review"
                && event["served_model"] == "gpt-5.6-luna"
                && event["provider_account"] == "primary"
                && event["selector_kind"] == "provider_dynamic_alias"
                && event["resolution_reason"] == "provider_dynamic_alias"
                && event["model_policy"]["allow_substitution"]
                    .as_bool()
                    .is_none_or(|enabled| !enabled)
        }),
        "alias audit must retain requested and served identities: {events:?}"
    );
    assert!(
        events.iter().any(|event| {
            event["phase"] == "response_model_verified"
                && event["model"] == "codex-auto-review"
                && event["served_model"] == "gpt-5.6-luna"
                && event["provider_account"] == "primary"
                && event["selector_kind"] == "provider_dynamic_alias"
                && event["resolution_reason"] == "provider_dynamic_alias"
        }),
        "stream audit must retain alias resolution provenance: {events:?}"
    );
}
