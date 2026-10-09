use link_assistant_router::thinking::{self, ThinkingMode, ThinkingProtocol as P};
use proptest::prelude::*;
use serde_json::json;

#[test]
fn parser_matches_upstream_grammar_and_bounds_budgets() {
    for (model, base, suffix) in [
        ("model(high)", "model", Some("high")),
        ("model(a)(low)", "model(a)", Some("low")),
        ("模型(LOW)", "模型", Some("LOW")),
        ("model()", "model", Some("")),
        ("model(high)x", "model(high)x", None),
    ] {
        let parsed = thinking::parse_suffix(model);
        assert_eq!(parsed.model_name, base);
        assert_eq!(parsed.raw_suffix, suffix);
    }
    assert_eq!(thinking::parse_numeric_suffix("08192"), Some(8192));
    assert_eq!(thinking::parse_numeric_suffix("+8192"), Some(8192));
    for raw in ["", "-1", "-2", " 1", "4294967296", "9999999999999999999999"] {
        assert_eq!(thinking::parse_numeric_suffix(raw), None);
    }
    for model in ["model(unknown)", "model(4294967296)", "model()", "(high)"] {
        assert_eq!(thinking::base_model(model), model);
    }
}

#[test]
fn body_controls_keep_precedence_and_no_controls_add_no_defaults() {
    let mut body = json!({"model":"model(high)","reasoning_effort":"low"});
    thinking::normalize_request(&mut body, P::OpenAIChat).unwrap();
    assert_eq!(body, json!({"model":"model","reasoning_effort":"low"}));
    let mut body = json!({"model":"model","reasoning":{"effort":"low"},"reasoning_effort":"high"});
    let source = body.clone();
    thinking::apply_thinking(
        &mut body,
        &source,
        "model",
        P::OpenAIChat,
        P::OpenAIResponses,
        None,
    )
    .unwrap();
    assert_eq!(body["reasoning"]["effort"], "low");
    let mut body = json!({"model":"exact","temperature":0.5});
    let source = body.clone();
    thinking::apply_thinking(&mut body, &source, "exact", P::OpenAIChat, P::Codex, None).unwrap();
    assert_eq!(body, source);
    let mut body = json!({"model":"exact(high)","enable_thinking":false});
    thinking::normalize_request(&mut body, P::OpenAIChat).unwrap();
    assert_eq!(body, json!({"model":"exact","enable_thinking":false}));
}

proptest! {
    #![proptest_config(ProptestConfig::with_cases(128))]
    #[test]
    fn numeric_suffix_round_trip(model in "[a-zA-Z0-9/_-]{1,80}", budget in 1u32..=u32::MAX) {
        let selector = format!("{model}({budget})");
        let parsed = thinking::parse_suffix(&selector);
        prop_assert_eq!(parsed.model_name, model.as_str());
        prop_assert_eq!(parsed.config().unwrap().mode, ThinkingMode::Budget(budget));
        prop_assert_eq!(thinking::base_model(&selector), model.as_str());
    }
    #[test]
    fn parser_handles_bounded_unicode_without_panicking(model in ".{0,160}") {
        let parsed = thinking::parse_suffix(&model);
        if let Some(raw) = parsed.raw_suffix { prop_assert_eq!(format!("{}({raw})",parsed.model_name), model); }
        else { prop_assert_eq!(parsed.model_name, model.as_str()); }
    }
    #[test]
    fn effort_suffix_round_trip_and_body_precedence(index in 0usize..6, uppercase in any::<bool>()) {
        let level = ["minimal","low","medium","high","xhigh","max"][index];
        let raw = if uppercase { level.to_uppercase() } else { level.to_string() };
        let mut body = json!({"model":format!("exact({raw})")});
        thinking::normalize_request(&mut body, P::OpenAIResponses).unwrap();
        prop_assert_eq!(&body["model"], "exact");
        prop_assert_eq!(&body["reasoning"]["effort"], level);
        let mut explicit = json!({"model":format!("exact({raw})"),"reasoning":{"effort":"none","summary":"detailed"}});
        thinking::normalize_request(&mut explicit, P::OpenAIResponses).unwrap();
        prop_assert_eq!(&explicit["reasoning"]["effort"], "none");
        prop_assert_eq!(&explicit["reasoning"]["summary"], "detailed");
    }
}
