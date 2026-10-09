//! Exact model evidence cannot cross account, endpoint, protocol or model scope.
use link_assistant_router::model_contract::{ModelRouteScope, ModelTruthDescriptor};
use link_assistant_router::thinking::{self, ThinkingProtocol as P};
use serde_json::{Value, json};

fn truth() -> ModelTruthDescriptor {
    ModelTruthDescriptor {
        upstream_request_model: Some("exact".into()),
        route: ModelRouteScope {
            provider: Some("gemini".into()),
            account: Some("account-a".into()),
            endpoint: Some("https://fixture.invalid/models".into()),
            protocols: vec!["gemini".into()],
        },
        capabilities: json!({"thinking":{"supported":true,"min_budget_tokens":128,"max_budget_tokens":20000}}),
        capability_provenance: json!({"fields":{"thinking":{
            "source_kind":"authenticated_live_model_catalog","unknown":false,"conflict":false,
            "scope":{"provider":"gemini","account":"account-a","endpoint":"https://fixture.invalid/models",
                "protocols":["gemini"],"model":"exact"}
        }}}),
        ..ModelTruthDescriptor::default()
    }
}

fn apply(evidence: &ModelTruthDescriptor, target: P) -> Value {
    let mut body = json!({"model":"exact(32768)"});
    let source = body.clone();
    thinking::apply_thinking(
        &mut body,
        &source,
        "exact(32768)",
        P::OpenAIChat,
        target,
        Some(evidence),
    )
    .unwrap();
    body
}

#[test]
fn only_matching_trusted_evidence_clamps() {
    assert_eq!(
        apply(&truth(), P::Gemini)["generationConfig"]["thinkingConfig"]["thinkingBudget"],
        20000
    );
    for (path, value) in [
        ("/upstream_request_model", json!("sibling")),
        ("/route/account", json!("account-b")),
        ("/route/endpoint", json!("https://other.invalid/models")),
        ("/route/provider", json!("other")),
        (
            "/capability_provenance/fields/thinking/unknown",
            json!(true),
        ),
        (
            "/capability_provenance/fields/thinking/conflict",
            json!(true),
        ),
        (
            "/capability_provenance/fields/thinking/source_kind",
            json!("router_fixture"),
        ),
    ] {
        let mut encoded = serde_json::to_value(truth()).unwrap();
        *encoded.pointer_mut(path).unwrap() = value;
        let evidence = serde_json::from_value(encoded).unwrap();
        assert_eq!(
            apply(&evidence, P::Gemini)["generationConfig"]["thinkingConfig"]["thinkingBudget"],
            32768,
            "{path}"
        );
    }
}

#[test]
fn different_target_protocol_cannot_borrow_budget_limits() {
    assert_eq!(
        apply(&truth(), P::Anthropic)["thinking"]["budget_tokens"],
        32768
    );
}

#[test]
fn verified_unsupported_drops_amount_and_keeps_summary_independent() {
    let mut evidence = truth();
    evidence.capabilities["thinking"] = json!({"supported":false});
    let mut body = json!({"model":"exact(high)","generationConfig":{"thinkingConfig":{"thinkingBudget":8192}}});
    let source = json!({"reasoning_effort":"high"});
    thinking::apply_thinking(
        &mut body,
        &source,
        "exact(high)",
        P::OpenAIChat,
        P::Gemini,
        Some(&evidence),
    )
    .unwrap();
    assert!(body.pointer("/generationConfig/thinkingConfig").is_none());
    assert_eq!(body["model"], "exact");
}

#[test]
fn malformed_control_containers_are_rejected_without_mutation() {
    for (source, protocol) in [
        (json!({"reasoning":"high"}), P::OpenAIResponses),
        (json!({"thinking":{"type":true}}), P::Anthropic),
        (
            json!({"generationConfig":{"thinkingConfig":"high"}}),
            P::Gemini,
        ),
        (json!({"enable_thinking":"true"}), P::Qwen),
        (
            json!({"generationConfig":{"thinkingConfig":{"thinkingBudget":4_294_967_296_u64}}}),
            P::Gemini,
        ),
    ] {
        let mut body = json!({"model":"exact(high)","unchanged":true});
        let before = body.clone();
        assert!(
            thinking::apply_thinking(&mut body, &source, "exact(high)", protocol, protocol, None)
                .is_err(),
            "{source}"
        );
        assert_eq!(body, before);
    }
}

#[test]
fn qwen_and_vertex_apply_native_controls_without_extra_effort_fields() {
    for (selector, expected) in [
        ("exact(none)", json!({"enable_thinking":false})),
        ("exact(auto)", json!({"enable_thinking":true})),
        (
            "exact(8192)",
            json!({"enable_thinking":true,"thinking_budget":8192}),
        ),
    ] {
        let mut body = json!({"model":selector});
        let source = body.clone();
        thinking::apply_thinking(&mut body, &source, selector, P::Qwen, P::Qwen, None).unwrap();
        assert_eq!(body["model"], "exact");
        assert_eq!(body["enable_thinking"], expected["enable_thinking"]);
        assert_eq!(body.get("thinking_budget"), expected.get("thinking_budget"));
        assert!(body.get("reasoning_effort").is_none());
    }
    let mut body = json!({"model":"exact(8192)"});
    let source = body.clone();
    thinking::apply_thinking(
        &mut body,
        &source,
        "exact(8192)",
        P::Vertex,
        P::Vertex,
        None,
    )
    .unwrap();
    assert_eq!(
        body["generationConfig"]["thinkingConfig"]["thinkingBudget"],
        8192
    );
}

#[test]
fn served_identity_uses_exact_base_without_allowing_sibling_substitution() {
    use link_assistant_router::model_contract::validate_served_model;
    assert_eq!(
        validate_served_model("exact(high)", Some("exact"), false).unwrap(),
        "exact"
    );
    assert!(validate_served_model("exact(high)", Some("exact-sibling"), false).is_err());
    assert!(validate_served_model("exact(unknown)", Some("exact"), false).is_err());
}
