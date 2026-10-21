//! Ported `CLIProxyAPI` v8.0.20 thinking matrices (MIT, Copyright (c) 2025
//! router-for-me), revision 0f96f568e4dbf6f84ad7399a74b78344c5eac7e6.
//! Original vectors and license are retained in fixtures/thinking/.
use link_assistant_router::model_contract::{ModelRouteScope, ModelTruthDescriptor};
use link_assistant_router::thinking::{
    self, ThinkingLevel as L, ThinkingProtocol as P, ThinkingSupport,
};
use serde_json::{Value, json};

fn synthetic_truth(model: &str, target: &str) -> Option<ModelTruthDescriptor> {
    let mut support = ThinkingSupport {
        supported: Some(true),
        ..ThinkingSupport::default()
    };
    let (min, max, zero, dynamic, levels) = match model {
        "level-model" => (
            0,
            0,
            false,
            false,
            vec![L::Minimal, L::Low, L::Medium, L::High],
        ),
        "level-subset-model" => (0, 0, false, false, vec![L::Low, L::High]),
        "gemini-budget-model" => (128, 20000, false, true, vec![]),
        "gemini-mixed-model" => (128, 32768, false, true, vec![L::Low, L::High]),
        "gemini-toggle-mixed-model" => (128, 32768, true, true, vec![L::Low, L::High]),
        "claude-budget-model" => (1024, 128_000, true, false, vec![]),
        "claude-opus-4-6-model" => (
            1024,
            128_000,
            true,
            false,
            vec![L::Low, L::Medium, L::High, L::Max],
        ),
        "claude-sonnet-4-6-model" => (1024, 128_000, true, false, vec![L::Low, L::Medium, L::High]),
        "antigravity-budget-model" => (128, 20000, true, true, vec![]),
        "kimi-toggle-thinking-model" | "xai-level-model" => {
            (0, 0, true, false, vec![L::Low, L::Medium, L::High])
        }
        "kimi-tiered-thinking-model" => (0, 0, false, false, vec![L::Low, L::Medium, L::High]),
        "no-thinking-model" => {
            support.supported = Some(false);
            (0, 0, false, false, vec![])
        }
        "user-defined-model" => return None,
        _ => panic!("unregistered synthetic model {model}"),
    };
    support.min_budget_tokens = (min != 0).then_some(min);
    support.max_budget_tokens = (max != 0).then_some(max);
    support.zero_allowed = Some(zero);
    support.dynamic_allowed = Some(dynamic);
    support.levels = levels;
    let route = ModelRouteScope {
        provider: Some(target.into()),
        account: Some("fixture-account".into()),
        endpoint: Some("https://fixture.invalid".into()),
        protocols: vec![target.into()],
    };
    let scope = json!({"provider":route.provider,"account":route.account,"endpoint":route.endpoint,
        "protocols":route.protocols,"model":model});
    Some(ModelTruthDescriptor {
        route,
        upstream_request_model: Some(model.into()),
        capabilities: json!({"thinking":support}),
        capability_provenance: json!({"fields":{"thinking":{
            "source_kind":"authenticated_live_model_catalog","scope":scope,"conflict":false,"unknown":false
        }}}),
        ..ModelTruthDescriptor::default()
    })
}

fn at<'a>(value: &'a Value, field: &str) -> Option<&'a Value> {
    value.pointer(&format!("/{}", field.replace('.', "/")))
}

fn run_matrix(fixture: &str) {
    let cases: Vec<Value> = serde_json::from_str(fixture).unwrap();
    let mut errors = Vec::new();
    for case in &cases {
        let from = case["from"].as_str().unwrap();
        let to = case["to"].as_str().unwrap();
        let model = case["model"].as_str().unwrap();
        let source = &case["input"];
        let truth = synthetic_truth(thinking::base_model(model), to);
        // Content translators are covered end-to-end separately. This harness
        // supplies a target envelope and the untouched original source controls.
        let mut body = if from == to {
            source.clone()
        } else {
            json!({"model":model})
        };
        if to == "claude" {
            body["max_tokens"] = json!(200_000);
        }
        if to == "kimi"
            && from == "openai"
            && let Some(thinking) = source.get("thinking")
        {
            body["thinking"] = thinking.clone();
        }
        let result = thinking::apply_thinking(
            &mut body,
            source,
            model,
            P::from_name(from).unwrap(),
            P::from_name(to).unwrap(),
            truth.as_ref(),
        );
        let label = format!("{} {from}->{to} {model}", case["name"]);
        if case["expectErr"].as_bool() == Some(true) {
            if result.is_ok() {
                errors.push(format!("{label}: expected an error; {body}"));
            }
            continue;
        }
        if let Err(error) = result {
            errors.push(format!("{label}: {error}"));
            continue;
        }
        // Upstream injects medium in Codex translations without controls;
        // Router's additive contract preserves the absence of a control.
        let no_control_default = result.as_ref().is_ok_and(Option::is_none)
            && to == "codex"
            && case["expectValue"] == "medium";
        for (field, expected) in [
            ("expectField", "expectValue"),
            ("expectField2", "expectValue2"),
            ("expectField3", "expectValue3"),
        ] {
            let Some(field) = case[field].as_str().filter(|field| !field.is_empty()) else {
                continue;
            };
            if no_control_default && field == "reasoning.effort" {
                if at(&body, field).is_some() {
                    errors.push(format!("{label}: absent control gained a default"));
                }
                continue;
            }
            let expected = case[expected].as_str().unwrap();
            let actual = at(&body, field).map(|value| {
                value
                    .as_str()
                    .map_or_else(|| value.to_string(), str::to_string)
            });
            if actual.as_deref() != Some(expected) {
                errors.push(format!(
                    "{label}: {field} expected {expected}, got {actual:?}; {body}"
                ));
            }
        }
        if let Some(absent) = case["expectAbsent"].as_array() {
            for field in absent {
                if at(&body, field.as_str().unwrap()).is_some() {
                    errors.push(format!("{label}: {field} must be absent; {body}"));
                }
            }
        }
        if case.get("expectField").is_none_or(|field| field == "") {
            let field = match to {
                "gemini" => "generationConfig.thinkingConfig",
                "antigravity" => "request.generationConfig.thinkingConfig",
                "claude" | "kimi" => "thinking",
                "openai" => "reasoning_effort",
                "codex" => "reasoning.effort",
                _ => "generation_config.thinking_level",
            };
            if at(&body, field).is_some() {
                errors.push(format!("{label}: {field} must be absent; {body}"));
            }
        }
        if matches!(to, "gemini" | "antigravity") {
            let field = if to == "gemini" {
                "generationConfig.thinkingConfig.includeThoughts"
            } else {
                "request.generationConfig.thinkingConfig.includeThoughts"
            };
            let expected = case
                .get("includeThoughts")
                .and_then(Value::as_str)
                .filter(|value| !value.is_empty());
            let actual = at(&body, field).map(Value::to_string);
            if actual.as_deref() != expected {
                errors.push(format!(
                    "{label}: visibility expected {expected:?}, got {actual:?}"
                ));
            }
        }
        if to == "claude"
            && at(&body, "output_config.effort").is_some()
            && at(&body, "thinking.type") != Some(&json!("adaptive"))
        {
            errors.push(format!("{label}: effort requires adaptive thinking"));
        }
    }
    assert!(
        errors.is_empty(),
        "{} discrepancies:\n{}",
        errors.len(),
        errors.join("\n")
    );
}

#[test]
fn suffix_matrix() {
    run_matrix(include_str!("fixtures/thinking/suffix.json"));
}
#[test]
fn body_matrix() {
    run_matrix(include_str!("fixtures/thinking/body.json"));
}
#[test]
fn provider_targets_matrix() {
    run_matrix(include_str!("fixtures/thinking/provider_targets.json"));
}
#[test]
fn interactions_matrix() {
    run_matrix(include_str!("fixtures/thinking/interactions.json"));
}
#[test]
fn claude_adaptive_body_matrix() {
    run_matrix(include_str!("fixtures/thinking/claude_adaptive.json"));
}
