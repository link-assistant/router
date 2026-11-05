//! Independent actual-policy collection oracle SOURCE; entirely UNRUN.
//! CI runs native tests only after all eight same-SHA JavaScript stages pass.
use link_assistant_router::client_policy::{
    ClientProtocol, EntitlementDecision, SubscriptionEntitlementPolicy, SubscriptionOverride,
};
use link_assistant_router::clients::ClientKind;
use link_assistant_router::subscription::SubscriptionProvider;
use serde_json::Value;

fn vectors() -> Value {
    serde_json::from_str(include_str!("fixtures/policy-collection-edges-20261101.json"))
        .expect("independently authored policy edge cases")
}
fn strings<'a>(value: &'a Value, name: &str) -> Vec<&'a str> {
    value[name]
        .as_array()
        .expect("case array")
        .iter()
        .map(|entry| entry.as_str().expect("case string"))
        .collect()
}
fn expected_records() -> Vec<SubscriptionOverride> {
    vec![
        SubscriptionOverride {
            client: ClientKind::ClaudeCode,
            provider: SubscriptionProvider::Codex,
        },
        SubscriptionOverride {
            client: ClientKind::Codex,
            provider: SubscriptionProvider::Claude,
        },
    ]
}

#[test]
fn aliases_deduplicate_to_nominal_records_and_sort_independently_of_insertion_order() {
    let cases = vectors();
    let aliases = strings(&cases, "overrideAliases");
    for offset in 0..aliases.len() {
        for reverse in [false, true] {
            let mut order = aliases.clone();
            order.rotate_left(offset);
            if reverse {
                order.reverse();
            }
            let policy = SubscriptionEntitlementPolicy::parse(order).expect("accepted aliases");
            assert_eq!(policy.overrides(), expected_records());
            let displayed: Vec<_> = policy
                .overrides()
                .iter()
                .map(ToString::to_string)
                .collect();
            assert_eq!(displayed, strings(&cases, "sortedOverrides"));
            // Returned Vec/Copy records belong to the caller, not to the policy set.
            let mut detached = policy.overrides();
            detached[0].provider = SubscriptionProvider::Claude;
            detached.reverse();
            detached.clear();
            assert_eq!(policy.overrides(), expected_records());
            assert!(policy.proxied_clients().is_empty());
        }
    }
}

#[test]
fn proxy_identity_deduplication_retains_native_unicode_whitespace_and_detached_results() {
    let cases = vectors();
    let policy = SubscriptionEntitlementPolicy::parse(strings(&cases, "overrideAliases"))
        .expect("accepted bridges")
        .with_proxied_clients(strings(&cases, "proxyAccepted"))
        .expect("reviewed proxy aliases");
    assert_eq!(policy.proxied_clients(), vec![ClientKind::Codex]);
    let names: Vec<_> = policy
        .proxied_clients()
        .into_iter()
        .map(|client| client.canonical_name())
        .collect();
    assert_eq!(names, strings(&cases, "sortedProxies"));
    let mut detached = policy.proxied_clients();
    detached.push(ClientKind::ClaudeCode);
    detached.clear();
    assert_eq!(policy.proxied_clients(), vec![ClientKind::Codex]);
    assert_eq!(policy.overrides(), expected_records());
    // Rust White_Space includes NEL, unlike ECMAScript String.trim. BOM is not
    // Rust whitespace. These expectations intentionally catch a naive JS port.
    for bad in strings(&cases, "invalidProxies") {
        assert!(
            policy.clone().with_proxied_clients(["codex", bad]).is_err(),
            "accepted {bad:?}"
        );
        assert_eq!(policy.proxied_clients(), vec![ClientKind::Codex]);
    }
}

#[test]
fn an_invalid_later_override_never_returns_a_partially_accepted_policy() {
    let cases = vectors();
    let original = SubscriptionEntitlementPolicy::parse(strings(&cases, "overrideAliases"))
        .expect("accepted original policy");
    for bad in strings(&cases, "invalidOverrides") {
        assert!(
            SubscriptionEntitlementPolicy::parse(["codex:claude", bad]).is_err(),
            "accepted {bad:?}"
        );
        assert_eq!(original.overrides(), expected_records());
    }
}

#[test]
fn explicit_bridges_do_not_override_protocol_identity_or_an_absent_signed_client() {
    use ClientKind::{ClaudeCode, Codex, GeminiCli, QwenCode};
    use ClientProtocol::{AnthropicMessages, Catalog, GeminiNative, OpenAIChat, OpenAIResponses};
    use EntitlementDecision::{Denied, Native, Override};
    let cases = vectors();
    let policy = SubscriptionEntitlementPolicy::parse(strings(&cases, "overrideAliases"))
        .expect("accepted bridges")
        .with_proxied_clients(["codex"])
        .expect("reviewed proxy");
    // Independent complete cell expectations, not generated from the matcher.
    for (client, provider, protocol, expected) in [
        (Codex, SubscriptionProvider::Claude, OpenAIResponses, Override),
        (ClaudeCode, SubscriptionProvider::Codex, AnthropicMessages, Override),
        (Codex, SubscriptionProvider::Claude, OpenAIChat, Denied),
        (ClaudeCode, SubscriptionProvider::Codex, OpenAIResponses, Denied),
        (Codex, SubscriptionProvider::Codex, OpenAIResponses, Native),
        (ClaudeCode, SubscriptionProvider::Claude, AnthropicMessages, Native),
        (GeminiCli, SubscriptionProvider::Gemini, Catalog, Native),
        (QwenCode, SubscriptionProvider::Qwen, OpenAIChat, Denied),
    ] {
        assert_eq!(policy.decide(Some(client), provider, protocol), expected);
    }
    for provider in SubscriptionProvider::ALL {
        for protocol in [
            Catalog,
            AnthropicMessages,
            OpenAIChat,
            OpenAIResponses,
            GeminiNative,
        ] {
            assert_eq!(policy.decide(None, provider, protocol), Denied);
        }
    }
}

#[test]
fn actual_duration_formatter_retains_i64_extrema_and_integer_day_boundaries() {
    // Same integration binary as the policy oracles: no extra Cargo target.
    // Inputs are decimal strings so the receiving JS cases must not round them
    // through Number. The two large adjacent values straddle a day boundary
    // above 2^53, where a float-based translation can give the wrong day.
    let cases: Value = serde_json::from_str(include_str!(
        "fixtures/scalar-format-edges-20261101.json"
    ))
    .expect("independent signed formatting vectors");
    assert_eq!(cases["integerEncoding"], "signed-decimal-string");
    for row in cases["cases"].as_array().expect("format case array") {
        let minutes = row["minutes"]
            .as_str()
            .expect("exact decimal input")
            .parse::<i64>()
            .expect("native i64 input");
        let expected = row["expected"].as_str().expect("independent expected text");
        assert_eq!(link_assistant_router::auth_import::humanize_minutes(minutes), expected);
    }
}

// Reuse this existing integration target rather than linking another binary.
#[path = "oracles/credential_expiry_edges_20261101.rs"]
mod credential_expiry_edges_20261101;

#[path = "oracles/owned-peer-reconcile-20261101.rs"]
mod owned_peer_reconcile_20261101;

#[path = "oracles/policy_decision_matrix_20261101.rs"]
mod policy_decision_matrix_20261101;

#[path = "oracles/url_host_edges_20261101.rs"]
mod url_host_edges_20261101;

#[path = "oracles/policy_nominal_producer_20261101.rs"]
mod policy_nominal_producer_20261101;

#[path = "oracles/client_static_producer_20261101.rs"]
mod client_static_producer_20261101;

// Exact independent constant-index baseline; reuse this existing integration target.
#[path = "oracles/constant_index_format_20261101.rs"]
mod constant_index_format_20261101;
