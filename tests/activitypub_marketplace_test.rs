use link_assistant_router::activitypub::marketplace::{negotiate, proposal, publication};
use serde_json::json;

const BASE: &str = "https://router.example";

#[test]
fn publishes_standard_service_intents_without_provider_extensions() {
    let doc = proposal(BASE, "vendor/model name");
    assert_eq!(doc["type"], "Proposal");
    assert_eq!(doc["purpose"], "offer");
    assert_eq!(doc["publishes"]["type"], "Intent");
    assert_eq!(doc["publishes"]["action"], "deliverService");
    assert_eq!(doc["publishes"]["resourceQuantity"]["hasUnit"], "one");
    assert_eq!(
        doc["publishes"]["resourceQuantity"]["hasNumericalValue"],
        "1"
    );
    assert!(
        doc["id"]
            .as_str()
            .unwrap()
            .contains("model=vendor%2Fmodel+name")
    );
    assert!(doc.get("model").is_none());
    assert!(doc.get("aliases").is_none());
    assert!(doc["reciprocal"].is_null());
    let outbox = publication(BASE, &["vendor/model name".to_string()]);
    assert_eq!(outbox["totalItems"], 1);
    assert_eq!(outbox["orderedItems"][0]["type"], "Create");
    assert_eq!(outbox["orderedItems"][0]["object"], doc);
}

fn offer() -> serde_json::Value {
    json!({
        "id":"https://consumer.example/offers/1", "type":"Offer",
        "actor":"https://consumer.example/actor",
        "object": {"type":"Agreement", "stipulates": {
            "type":"Commitment",
            "satisfies": format!("{}#primary", proposal(BASE, "model-a")["id"].as_str().unwrap()),
            "resourceQuantity":{"hasUnit":"one", "hasNumericalValue":"1"}
        }}
    })
}

#[test]
fn accepts_only_available_matching_commitments_and_links_execution() {
    let response = negotiate(BASE, &offer(), &["model-a".to_string()]).unwrap();
    assert_eq!(response["type"], "Accept");
    assert_eq!(response["object"], "https://consumer.example/offers/1");
    assert_eq!(response["to"], "https://consumer.example/actor");
    let agreement = &response["result"];
    assert_eq!(agreement["type"], "Agreement");
    assert!(agreement["id"].is_string());
    assert!(agreement["stipulates"]["id"].is_string());
    assert_eq!(
        agreement["url"]["href"],
        "https://router.example/api/services/openai/v1/chat/completions"
    );
    assert_eq!(negotiate(BASE, &offer(), &[]).unwrap()["type"], "Reject");
}

#[test]
fn accepts_equivalent_numeric_quantities_and_canonicalizes_them() {
    for amount in [json!(1), json!(1.0), json!("1.0")] {
        let mut activity = offer();
        activity["object"]["stipulates"]["resourceQuantity"]["hasNumericalValue"] = amount;
        let response = negotiate(BASE, &activity, &["model-a".to_string()]).unwrap();
        assert_eq!(response["type"], "Accept");
        assert_eq!(
            response["result"]["stipulates"]["resourceQuantity"],
            json!({"hasUnit":"one", "hasNumericalValue":"1"})
        );
    }
}

#[test]
fn rejects_wrong_units_amounts_reciprocals_and_non_agreements() {
    for (field, value) in [
        ("hasUnit", "second"),
        ("hasNumericalValue", "2"),
        ("hasNumericalValue", "NaN"),
    ] {
        let mut activity = offer();
        activity["object"]["stipulates"]["resourceQuantity"][field] = json!(value);
        assert_eq!(
            negotiate(BASE, &activity, &["model-a".to_string()]).unwrap()["type"],
            "Reject"
        );
    }
    let mut activity = offer();
    activity["object"]["stipulatesReciprocal"] = json!({"type":"Commitment"});
    assert_eq!(
        negotiate(BASE, &activity, &["model-a".to_string()]).unwrap()["type"],
        "Reject"
    );
    activity["type"] = json!("Create");
    assert!(negotiate(BASE, &activity, &[]).is_err());
    activity["actor"] = json!("");
    assert!(negotiate(BASE, &activity, &[]).is_err());
    for field in ["actor", "id"] {
        let mut activity = offer();
        activity[field] = json!("relative-reference");
        assert!(negotiate(BASE, &activity, &["model-a".to_string()]).is_err());
    }
}

#[test]
fn legacy_provider_names_are_rejected() {
    for name in ["gonka", "crater", "forgefed"] {
        assert!(link_assistant_router::config::UpstreamProvider::from_str_opt(name).is_none());
    }
}

#[test]
fn legacy_provider_flags_are_no_longer_advertised_or_accepted() {
    use clap::Parser as _;
    for flag in ["--gonka-api-key", "--crater-forgefed-inbox"] {
        assert!(
            link_assistant_router::cli::Cli::try_parse_from(["router", flag, "legacy-value"])
                .is_err()
        );
    }
    let catalog = link_assistant_router::contracts::document();
    for operation in catalog["operations"].as_array().unwrap() {
        for option in operation["options"].as_array().unwrap() {
            let name = option["name"].as_str().unwrap();
            assert!(!name.starts_with("gonka_") && !name.starts_with("crater_"));
        }
    }
}

#[test]
fn proposal_identifiers_round_trip_reserved_characters_and_unicode() {
    for model in ["vendor/model name", "model#one?x=two&y=three", "模型/α"] {
        let doc = proposal(&format!("{BASE}/"), model);
        let id = url::Url::parse(doc["id"].as_str().unwrap()).unwrap();
        assert_eq!(
            id.query_pairs().collect::<Vec<_>>(),
            vec![("model".into(), model.into())]
        );
        assert_eq!(doc, proposal(BASE, model));
    }
}

#[test]
fn finalized_commitments_only_contain_standard_fields() {
    let mut activity = offer();
    activity["object"]["stipulates"]["vendorExtension"] = json!("do not echo");
    activity["object"]["stipulates"]["resourceQuantity"]["vendorExtension"] = json!(true);
    let accepted = negotiate(BASE, &activity, &["model-a".to_string()]).unwrap();
    assert_eq!(accepted["type"], "Accept");
    assert!(
        accepted["result"]["stipulates"]
            .get("vendorExtension")
            .is_none()
    );
    assert_eq!(
        accepted["result"]["stipulates"]["resourceQuantity"],
        json!({"hasUnit":"one", "hasNumericalValue":"1"})
    );
    let agreement = url::Url::parse(accepted["result"]["id"].as_str().unwrap()).unwrap();
    let commitment =
        url::Url::parse(accepted["result"]["stipulates"]["id"].as_str().unwrap()).unwrap();
    assert!(agreement.fragment().is_none());
    assert_eq!(commitment.fragment(), Some("primary"));
}
