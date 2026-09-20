use std::ffi::OsString;

use clap::Parser as _;
use serde_json::{Value, json};

use super::*;
use crate::cli::{Cli, Command};
use crate::clients::{ANTHROPIC_MODEL_OWNER, OPENAI_MODEL_OWNER, RouterModel};

fn args(values: &[&str]) -> WithArgs {
    let invocation = std::iter::once(OsString::from("router"))
        .chain(std::iter::once(OsString::from("with")))
        .chain(values.iter().map(OsString::from))
        .collect();
    let protected = crate::cli::protect_client_arguments(invocation, true);
    let cli = Cli::try_parse_from(protected).expect("parse with arguments");
    let Some(Command::With(args)) = cli.command else {
        panic!("with command expected");
    };
    args
}

fn model(id: &str, owner: &str) -> RouterModel {
    RouterModel {
        id: id.to_string(),
        owned_by: owner.to_string(),
        ..RouterModel::default()
    }
}

#[test]
fn request_rejects_conflicts_widening_without_a_selector_and_empty_ids() {
    let conflict = args(&["--model", "wrapper", "codex", "--model", "client"]);
    let error = request(&conflict)
        .err()
        .expect("conflict must fail")
        .to_string();
    assert!(error.contains("conflicting model selectors"), "{error}");
    assert!(error.contains("no token was minted"), "{error}");

    for values in [
        &["--allow-model", "extra", "codex"][..],
        &["--allow-model-substitution", "codex"][..],
    ] {
        let error = request(&args(values))
            .err()
            .expect("unanchored widening must fail")
            .to_string();
        assert!(error.contains("widen an explicit model grant"), "{error}");
    }

    let empty = args(&["--model", "", "codex"]);
    let error = request(&empty)
        .err()
        .expect("empty selector must fail")
        .to_string();
    assert!(
        error.contains("invalid exact-model token policy"),
        "{error}"
    );
}

#[test]
fn request_builds_a_sorted_deduplicated_exact_grant() {
    let parsed = args(&[
        "--model",
        "model-b",
        "--allow-model",
        "model-a",
        "--allow-model",
        "model-b",
        "--allow-model-substitution",
        "codex",
        "--model=model-b",
    ]);
    let parsed_request = request(&parsed).expect("valid exact grant");
    assert_eq!(parsed_request.forwarded.as_deref(), Some("model-b"));
    assert_eq!(
        parsed_request.requested_policy.allowed_models,
        vec!["model-a".to_string(), "model-b".to_string()]
    );
    assert!(parsed_request.requested_policy.allow_substitution);
    assert_eq!(
        parsed_request
            .requested_policy
            .substitution_source
            .as_deref(),
        Some("router with --allow-model-substitution")
    );

    let forwarded = args(&["codex", "-m", "forwarded-model"]);
    let parsed_request = request(&forwarded).expect("forwarded selector grant");
    assert_eq!(parsed_request.forwarded.as_deref(), Some("forwarded-model"));
    assert_eq!(
        parsed_request.requested_policy.allowed_models,
        vec!["forwarded-model".to_string()]
    );

    let unpinned = request(&args(&["codex"])).expect("legacy unpinned launch");
    assert!(unpinned.forwarded.is_none());
    assert!(unpinned.requested_policy.allowed_models.is_empty());
}

#[test]
fn resolution_requires_explicit_authority_for_configured_clients() {
    let credential =
        RunCredential::for_model_policy_test(vec![model("gpt-current", OPENAI_MODEL_OWNER)]);
    let explicit = args(&["--model", "gpt-current", "codex"]);
    assert_eq!(
        resolve(&explicit, None, &credential).unwrap().as_deref(),
        Some("gpt-current")
    );

    let forwarded = args(&["codex", "--model", "gpt-current"]);
    assert_eq!(
        resolve(&forwarded, Some("gpt-current"), &credential)
            .unwrap()
            .as_deref(),
        Some("gpt-current")
    );

    let agent = args(&["agent"]);
    let error = resolve(&agent, None, &credential).unwrap_err().to_string();
    assert!(error.contains("requires an explicit model"), "{error}");

    let codex = args(&["codex"]);
    assert!(resolve(&codex, None, &credential).unwrap().is_none());
}

#[test]
fn picker_selects_only_a_client_compatible_live_model() {
    let credential = RunCredential::for_model_policy_test(vec![
        model("other", ANTHROPIC_MODEL_OWNER),
        model("gpt-current", OPENAI_MODEL_OWNER),
    ]);
    let codex = args(&["--pick-model", "codex"]);
    assert_eq!(
        resolve(&codex, None, &credential).unwrap().as_deref(),
        Some("gpt-current")
    );

    let incompatible =
        RunCredential::for_model_policy_test(vec![model("other", "unrelated-provider")]);
    let error = resolve(&codex, None, &incompatible)
        .unwrap_err()
        .to_string();
    assert!(
        error.contains("advertises no model for Codex CLI"),
        "{error}"
    );

    let generic = args(&["--pick-model", "agent"]);
    assert_eq!(
        resolve(&generic, None, &incompatible).unwrap().as_deref(),
        Some("other")
    );
}

#[test]
fn validation_checks_native_claude_families_and_every_exact_grant() {
    let credential =
        RunCredential::for_model_policy_test(vec![model("claude-current", ANTHROPIC_MODEL_OWNER)]);
    let claude = args(&["--model", "claude-current", "claude"]);
    let valid = ModelAccessPolicy {
        allowed_models: vec!["claude-current".to_string()],
        ..ModelAccessPolicy::default()
    };
    validate_selection(&claude, Some("claude-current"), &credential, &valid)
        .expect("available exact selection");

    let missing = ModelAccessPolicy {
        allowed_models: vec!["missing".to_string()],
        ..ModelAccessPolicy::default()
    };
    let error = validate_selection(&claude, None, &credential, &missing)
        .unwrap_err()
        .to_string();
    assert!(
        error.contains("model `missing` is not available"),
        "{error}"
    );

    let no_anthropic =
        RunCredential::for_model_policy_test(vec![model("gpt-current", OPENAI_MODEL_OWNER)]);
    let error = validate_selection(&claude, Some("opus"), &no_anthropic, &valid)
        .unwrap_err()
        .to_string();
    assert!(error.contains("requires an Anthropic provider"), "{error}");

    let error = validate_selection(
        &claude,
        Some("another-missing-model"),
        &credential,
        &ModelAccessPolicy::default(),
    )
    .unwrap_err()
    .to_string();
    assert!(error.contains("another-missing-model"), "{error}");

    let codex = args(&["--model", "gpt-current", "codex"]);
    let empty_catalog = RunCredential::for_model_policy_test(Vec::new());
    let error = validate_selection(
        &codex,
        Some("gpt-current"),
        &empty_catalog,
        &ModelAccessPolicy::default(),
    )
    .unwrap_err()
    .to_string();
    assert!(error.contains("router has no available models"), "{error}");
}

#[test]
fn launch_diagnostic_preserves_scope_capabilities_and_policy_source() {
    let mut advertised = model("claude-current", ANTHROPIC_MODEL_OWNER);
    advertised.selector_kind = ModelSelectorKind::ProviderDynamicAlias;
    advertised.capability_provenance = json!({
        "scope": {
            "provider": "anthropic",
            "account": "account-1",
            "endpoint": "https://api.anthropic.example",
            "protocols": ["anthropic-messages"]
        },
        "fields": {
            "context_window": {"value": 200_000},
            "max_output_tokens": {"value": 32_000}
        }
    });
    let credential = RunCredential::for_model_policy_test(vec![advertised]);
    let server = ResolvedServer::at(
        "https://router.example",
        Some("ordinary-token".to_string()),
        "test",
    );
    let parsed = args(&[
        "--model",
        "claude-current[1m]",
        "--allow-model",
        "claude-backup",
        "--allow-model-substitution",
        "claude",
    ]);
    let policy = ModelAccessPolicy {
        allowed_models: vec![
            "claude-backup".to_string(),
            "claude-current[1m]".to_string(),
        ],
        allow_substitution: true,
        substitution_source: Some("router with --allow-model-substitution".to_string()),
    };
    let value = launch_diagnostic(
        &parsed,
        &server,
        &credential,
        Some("claude-current[1m]"),
        None,
        &policy,
    );
    let launch = &value["router_model_launch"];
    assert_eq!(launch["request_source"], "with --model");
    assert_eq!(launch["token_constraint"]["state"], "exact");
    assert_eq!(launch["provider"], "anthropic");
    assert_eq!(launch["account"], "account-1");
    assert_eq!(launch["protocols"][0], "anthropic-messages");
    assert_eq!(
        launch["model_descriptor"]["capabilities"]["context_window"],
        200_000
    );
    assert_eq!(launch["switching_setting"], "with --allow-model");
    assert_eq!(
        launch["substitution_setting"],
        "router with --allow-model-substitution"
    );
    print_diagnostic(
        &parsed,
        &server,
        &credential,
        Some("claude-current[1m]"),
        None,
        &policy,
    );
}

#[test]
fn launch_diagnostic_names_every_request_source_and_uses_safe_fallbacks() {
    let credential =
        RunCredential::for_model_policy_test(vec![model("gpt-current", OPENAI_MODEL_OWNER)]);
    let server = ResolvedServer::at("http://router.test", None, "test");
    let policy = ModelAccessPolicy::default();

    let forwarded = args(&["codex", "--model", "gpt-current"]);
    let value = launch_diagnostic(
        &forwarded,
        &server,
        &credential,
        Some("gpt-current"),
        Some("gpt-current"),
        &policy,
    );
    let launch = &value["router_model_launch"];
    assert_eq!(launch["request_source"], "forwarded client model argument");
    assert_eq!(launch["provider"], OPENAI_MODEL_OWNER);
    assert_eq!(launch["account"], "test-principal");
    assert_eq!(launch["protocols"], Value::Null);
    assert_eq!(launch["token_constraint"]["state"], "unpinned");

    let picked = args(&["--pick-model", "codex"]);
    assert_eq!(
        launch_diagnostic(&picked, &server, &credential, None, None, &policy)["router_model_launch"]
            ["request_source"],
        "with --pick-model"
    );

    let configured = args(&["codex"]);
    assert_eq!(
        launch_diagnostic(&configured, &server, &credential, None, None, &policy)["router_model_launch"]
            ["request_source"],
        "client configuration"
    );
}

#[tokio::test]
async fn cleanup_is_a_noop_for_an_explicit_test_credential() {
    cleanup_after_setup_failure(RunCredential::for_model_policy_test(Vec::new())).await;
}
