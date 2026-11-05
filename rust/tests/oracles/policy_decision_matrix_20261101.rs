//! Independent actual whole-policy oracle source, UNRUN locally.
//! Its table is reusable by real translated methods once their whole owners admit.
use link_assistant_router::client_policy::{
    ClientProtocol, EntitlementDecision, SubscriptionEntitlementPolicy,
};
use link_assistant_router::clients::ClientKind;
use link_assistant_router::subscription::SubscriptionProvider;
use serde_json::Value;
use std::collections::BTreeSet;

fn fixture() -> Value {
    serde_json::from_str(include_str!("../fixtures/policy-decision-matrix-20261101.json"))
        .expect("independently authored complete policy table")
}
fn list<'a>(data: &'a Value, key: &str) -> Vec<&'a str> {
    data[key].as_array().expect("oracle string array").iter()
        .map(|item| item.as_str().expect("oracle string")).collect()
}
fn protocol(value: &str) -> ClientProtocol {
    match value {
        "catalog" => ClientProtocol::Catalog,
        "anthropic_messages" => ClientProtocol::AnthropicMessages,
        "openai_chat" => ClientProtocol::OpenAIChat,
        "openai_responses" => ClientProtocol::OpenAIResponses,
        "gemini_native" => ClientProtocol::GeminiNative,
        _ => panic!("unknown independent protocol {value}"),
    }
}
fn decision(value: u8) -> EntitlementDecision {
    match value {
        b'D' => EntitlementDecision::Denied,
        b'N' => EntitlementDecision::Native,
        b'O' => EntitlementDecision::Override,
        _ => panic!("unknown independent expected decision"),
    }
}

#[test]
fn actual_complete_policy_cells_match_independent_empty_and_full_tables() {
    let data = fixture();
    let clients = list(&data, "clients");
    let providers = list(&data, "providers");
    let protocols = list(&data, "protocols");
    assert_eq!(clients, ClientKind::ALL.iter().map(|client| client.canonical_name()).collect::<Vec<_>>());
    assert_eq!(providers, SubscriptionProvider::ALL.iter().map(|provider| provider.as_str()).collect::<Vec<_>>());
    assert_eq!(clients.len(), 8);
    assert_eq!(providers.len(), 4);
    assert_eq!(protocols.len(), 5);
    let defaults = SubscriptionEntitlementPolicy::default();
    let empty = SubscriptionEntitlementPolicy::parse(Vec::<&str>::new()).expect("empty policy");
    let full = SubscriptionEntitlementPolicy::parse(list(&data, "fullOverrides")).expect("all reviewed exact cells");
    let rows = data["rows"].as_array().expect("complete independent cells");
    let mut seen = BTreeSet::new();
    let mut cell_count = 0;
    for row in rows {
        let client_text = row["client"].as_str().expect("client name");
        let protocol_text = row["protocol"].as_str().expect("protocol name");
        assert!(clients.contains(&client_text));
        assert!(protocols.contains(&protocol_text));
        assert!(seen.insert((client_text, protocol_text)), "duplicate table row");
        let client = ClientKind::from_str_opt(client_text).expect("actual client owner");
        let surface = protocol(protocol_text);
        for (policy, expected_key) in [(&defaults, "empty"), (&empty, "empty"), (&full, "full")] {
            let expected = row[expected_key].as_str().expect("four independent cells").as_bytes();
            assert_eq!(expected.len(), providers.len());
            for (index, provider_text) in providers.iter().enumerate() {
                let provider = SubscriptionProvider::from_str_opt(provider_text).expect("actual provider owner");
                assert_eq!(policy.decide(Some(client), provider, surface), decision(expected[index]),
                    "{expected_key}: {client_text}/{provider_text}/{protocol_text}");
                assert_eq!(policy.decide(None, provider, surface), EntitlementDecision::Denied);
                cell_count += 1;
            }
        }
    }
    assert_eq!(seen.len(), clients.len() * protocols.len());
    assert_eq!(cell_count, 480);
    assert!(defaults.overrides().is_empty());
    assert!(empty.overrides().is_empty());
    assert!(full.proxied_clients().is_empty());
}

#[test]
fn actual_all_parse_pairs_keep_the_review_boundary_and_full_set_sort_order() {
    let data = fixture();
    let clients = list(&data, "clients");
    let providers = list(&data, "providers");
    let accepted = list(&data, "parseAcceptanceByClient");
    assert_eq!(accepted.len(), clients.len());
    for (client, mask) in clients.iter().zip(accepted) {
        assert_eq!(mask.len(), providers.len());
        for (index, provider) in providers.iter().enumerate() {
            let spelling = format!("{client}:{provider}");
            let result = SubscriptionEntitlementPolicy::parse([spelling.as_str()]);
            assert_eq!(result.is_ok(), mask.as_bytes()[index] == b'Y', "{spelling}");
            if let Ok(policy) = result {
                assert_eq!(policy.overrides().len(), 1);
                assert_eq!(policy.overrides()[0].to_string(), spelling);
            }
        }
    }
    let values = list(&data, "fullOverrides");
    assert_eq!(values.len(), 12);
    let expected = list(&data, "sortedOverrides");
    for offset in 0..values.len() {
        for reverse in [false, true] {
            let mut order = values.clone();
            order.rotate_left(offset);
            if reverse { order.reverse(); }
            // Duplicate every pair, interleaved rather than only adjacent.
            let mut repeated = order.clone();
            repeated.extend(order);
            let policy = SubscriptionEntitlementPolicy::parse(repeated).expect("all reviewed pairs");
            let actual: Vec<_> = policy.overrides().iter().map(ToString::to_string).collect();
            assert_eq!(actual, expected);
            let mut detached = policy.overrides();
            detached.reverse();
            detached[0].client = ClientKind::Agent;
            detached.clear();
            let after: Vec<_> = policy.overrides().iter().map(ToString::to_string).collect();
            assert_eq!(after, expected);
            assert!(policy.proxied_clients().is_empty());
        }
    }
}
