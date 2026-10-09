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

fn truth_for(target: P) -> ModelTruthDescriptor {
    let (provider, protocol) = match target {
        P::Anthropic => ("claude", "anthropic_messages"),
        P::OpenAIChat => ("openai-compatible", "openai_chat"),
        P::OpenAIResponses => ("openai-compatible", "openai_responses"),
        P::Codex => ("codex", "openai_responses"),
        P::Qwen => ("qwen", "qwen"),
        P::Gemini | P::Vertex => ("gemini", "gemini_native"),
        _ => panic!("unexpected target"),
    };
    let mut evidence = truth();
    evidence.route.provider = Some(provider.into());
    evidence.route.protocols = vec![protocol.into()];
    evidence.capability_provenance["fields"]["thinking"]["scope"] = json!({
        "provider":provider, "account":evidence.route.account,
        "endpoint":evidence.route.endpoint, "protocols":[protocol], "model":"exact"
    });
    evidence
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
        (json!({"thinking":{"type":"experimental"}}), P::Anthropic),
        (json!({"reasoning":{"effort":5}}), P::OpenAIChat),
        (json!(null), P::Gemini),
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
    let mut target = json!([]);
    assert!(
        thinking::apply_thinking(
            &mut target,
            &json!({"reasoning_effort":"high"}),
            "exact",
            P::OpenAIChat,
            P::OpenAIChat,
            None,
        )
        .is_err()
    );
    assert_eq!(target, json!([]));
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
        (
            "exact(minimal)",
            json!({"enable_thinking":true,"thinking_budget":512}),
        ),
        (
            "exact(max)",
            json!({"enable_thinking":true,"thinking_budget":128_000}),
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

#[test]
fn scoped_legacy_reasoning_level_metadata_constrains_only_its_own_account() {
    for levels in [
        json!(["low", "high"]),
        json!([{"effort":"low"}, {"effort":"high"}]),
    ] {
        let mut evidence = truth_for(P::OpenAIChat);
        evidence.capabilities = json!({"supported_reasoning_levels":levels});
        let provenance = evidence.capability_provenance["fields"]["thinking"].clone();
        evidence.capability_provenance =
            json!({"fields":{"supported_reasoning_levels":provenance}});
        assert_eq!(apply(&evidence, P::OpenAIChat)["reasoning_effort"], "high");
        evidence.capability_provenance["fields"]["supported_reasoning_levels"]["scope"]["account"] =
            json!("account-b");
        assert_eq!(apply(&evidence, P::OpenAIChat)["reasoning_effort"], "xhigh");
    }
}

#[test]
fn unsupported_native_controls_are_removed_without_removing_other_fields() {
    let cases = [
        (
            P::Anthropic,
            json!({"thinking":{"type":"adaptive"},
                "output_config":{"effort":"high","format":{"type":"json"}}}),
            json!({"output_config":{"format":{"type":"json"}}}),
        ),
        (
            P::OpenAIChat,
            json!({"reasoning_effort":"high","enable_thinking":true,"thinking_budget":8192,
                "reasoning":{"effort":"low","summary":"detailed"}}),
            json!({"reasoning":{"summary":"detailed"}}),
        ),
        (
            P::OpenAIResponses,
            json!({"reasoning":{"effort":"high","summary":"auto"}}),
            json!({"reasoning":{"summary":"auto"}}),
        ),
        (
            P::Codex,
            json!({"reasoning":{"effort":"high","summary":"concise"}}),
            json!({"reasoning":{"summary":"concise"}}),
        ),
        (
            P::Qwen,
            json!({"enable_thinking":true,"thinking_budget":8192,
                "reasoning_effort":"high","reasoning":{"effort":"high","summary":"none"}}),
            json!({"reasoning":{"summary":"none"}}),
        ),
        (
            P::Gemini,
            json!({"generationConfig":{"temperature":0.4,"thinkingConfig":{"thinkingBudget":8192}},
                "generation_config":{"temperature":0.5,"thinking_config":{"include_thoughts":true}}}),
            json!({"generationConfig":{"temperature":0.4},"generation_config":{"temperature":0.5}}),
        ),
        (
            P::Vertex,
            json!({"generation_config":{"temperature":0.5,"thinking_config":{"thinking_budget":8192}}}),
            json!({"generation_config":{"temperature":0.5}}),
        ),
    ];
    for (target, mut body, mut expected) in cases {
        let mut evidence = truth_for(target);
        evidence.capabilities["thinking"] = json!({"supported":false});
        body["model"] = json!("exact(high)");
        expected["model"] = json!("exact");
        let replay =
            json!({"signature":"opaque-signature","encrypted_content":"opaque-ciphertext"});
        body["replay"] = replay.clone();
        expected["replay"] = replay;
        let source = body.clone();
        thinking::apply_thinking(
            &mut body,
            &source,
            "exact(high)",
            target,
            target,
            Some(&evidence),
        )
        .unwrap();
        assert_eq!(body, expected, "{target:?}");
    }
}

#[test]
fn partial_or_conflicting_capabilities_never_imply_unsupported_thinking() {
    for (support, expected) in [
        (json!({}), json!({"thinkingBudget":32768})),
        (
            json!({"min_budget_tokens":40000}),
            json!({"thinkingBudget":40000}),
        ),
        (
            json!({"max_budget_tokens":2048}),
            json!({"thinkingBudget":2048}),
        ),
        (
            json!({"levels":["low","high"]}),
            json!({"thinkingLevel":"high"}),
        ),
        (
            json!({"zero_allowed":true}),
            json!({"thinkingBudget":32768}),
        ),
        (
            json!({"dynamic_allowed":true}),
            json!({"thinkingBudget":32768}),
        ),
        (json!({"adaptive":false}), json!({"thinkingBudget":32768})),
        (
            json!({"min_budget_tokens":10000,"max_budget_tokens":8000}),
            json!({"thinkingBudget":32768}),
        ),
    ] {
        let mut evidence = truth_for(P::Gemini);
        evidence.capabilities["thinking"] = support;
        assert_eq!(
            apply(&evidence, P::Gemini)["generationConfig"]["thinkingConfig"],
            expected
        );
    }
}

#[test]
fn qwen_native_budget_errors_and_suffix_clamping_use_the_same_scoped_limits() {
    let mut evidence = truth_for(P::Qwen);
    evidence.capabilities["thinking"] = json!({"min_budget_tokens":1024,"max_budget_tokens":8192});
    let mut body = json!({"model":"exact","enable_thinking":true,"thinking_budget":32768});
    let source = body.clone();
    let error = thinking::apply_thinking(
        &mut body,
        &source,
        "exact",
        P::Qwen,
        P::Qwen,
        Some(&evidence),
    )
    .unwrap_err();
    assert!(error.contains("outside [1024, 8192]"));
    assert_eq!(body, source);
    let source = json!({"model":"exact(32768)","temperature":0.4});
    let mut body = source.clone();
    thinking::apply_thinking(
        &mut body,
        &source,
        "exact(32768)",
        P::Qwen,
        P::Qwen,
        Some(&evidence),
    )
    .unwrap();
    assert_eq!(
        body,
        json!({"model":"exact","temperature":0.4,
        "enable_thinking":true,"thinking_budget":8192})
    );
}

#[test]
fn legacy_gemini_controls_migrate_without_overwriting_camel_case_precedence() {
    for (canonical, expected_budget, expected_visibility) in [
        (None, 4096, true),
        (
            Some(json!({"thinkingBudget":8192,"includeThoughts":false})),
            8192,
            false,
        ),
    ] {
        let mut body = json!({"model":"exact(high)","generation_config":{
            "temperature":0.4,"thinking_config":{"thinking_budget":4096,"include_thoughts":true}}});
        if let Some(canonical) = canonical {
            body["generationConfig"] = json!({"thinkingConfig":canonical});
        }
        let source = body.clone();
        thinking::apply_thinking(
            &mut body,
            &source,
            "exact(high)",
            P::Gemini,
            P::Gemini,
            None,
        )
        .unwrap();
        assert_eq!(body["model"], "exact");
        assert_eq!(body["generation_config"], json!({"temperature":0.4}));
        assert_eq!(
            body["generationConfig"]["thinkingConfig"],
            json!({
            "thinkingBudget":expected_budget,"includeThoughts":expected_visibility})
        );
    }
}

#[test]
fn native_url_suffix_defaults_keep_body_precedence_and_do_not_add_a_model_field() {
    let original = json!({"contents":[{"parts":[{"text":"hello"}]}]});
    let mut body = original.clone();
    assert_eq!(
        thinking::normalize_native_request("models/exact(high)", &mut body, P::Gemini).unwrap(),
        "models/exact"
    );
    assert_eq!(body["contents"], original["contents"]);
    assert!(body.get("model").is_none());
    assert_eq!(
        body["generationConfig"]["thinkingConfig"]["thinkingBudget"],
        24576
    );
    let mut body = json!({"generationConfig":{"thinkingConfig":{"thinkingBudget":2048}}});
    let before = body.clone();
    assert_eq!(
        thinking::normalize_native_request("models/exact(high)", &mut body, P::Gemini).unwrap(),
        "models/exact"
    );
    assert_eq!(body, before);
    assert_eq!(
        thinking::normalize_native_request("models/exact", &mut body, P::Gemini).unwrap(),
        "models/exact"
    );
    assert_eq!(body, before);
    let mut invalid = json!({"generationConfig":false});
    assert!(
        thinking::normalize_native_request("models/exact(high)", &mut invalid, P::Gemini).is_err()
    );
    assert_eq!(invalid, json!({"generationConfig":false}));
}

#[test]
fn anthropic_suffix_budgets_respect_explicit_output_limits() {
    for (max, expected) in [
        (1024, json!({"type":"disabled"})),
        (2048, json!({"type":"enabled","budget_tokens":2047})),
    ] {
        let mut body =
            json!({"model":"exact(8192)","max_tokens":max,"temperature":0.4,"top_p":0.5});
        let source = body.clone();
        thinking::apply_thinking(
            &mut body,
            &source,
            "exact(8192)",
            P::OpenAIChat,
            P::Anthropic,
            None,
        )
        .unwrap();
        assert_eq!(body["thinking"], expected);
        assert_eq!(body["max_tokens"], max);
        assert!(body.get("temperature").is_none());
        assert!(body.get("top_p").is_none());
    }
}

#[test]
fn anthropic_auto_suffix_respects_reviewed_adaptive_model_identity() {
    for (selector, expected) in [
        ("exact(auto)", "enabled"),
        ("claude-opus-4-6(auto)", "adaptive"),
    ] {
        let mut body =
            json!({"model":selector,"output_config":{"effort":"high","format":{"type":"json"}}});
        let source = body.clone();
        thinking::apply_thinking(
            &mut body,
            &source,
            selector,
            P::OpenAIChat,
            P::Anthropic,
            None,
        )
        .unwrap();
        assert_eq!(body["thinking"], json!({"type":expected}));
        assert_eq!(body["output_config"], json!({"format":{"type":"json"}}));
    }
}
