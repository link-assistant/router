//! FEP-0837 model proposals and agreement negotiation.
//!
//! Inference is the economic transaction and happens outside the protocol at
//! the existing authenticated API linked from each finalized agreement.

use serde_json::{Value, json};

const PUBLIC: &str = "https://www.w3.org/ns/activitystreams#Public";

fn one_invocation(quantity: &Value) -> bool {
    let amount = &quantity["hasNumericalValue"];
    let amount = amount
        .as_f64()
        .or_else(|| amount.as_str().and_then(|value| value.parse::<f64>().ok()));
    quantity["hasUnit"] == "one" && amount == Some(1.0)
}

/// JSON-LD terms defined by FEP-0837, with no router-specific vocabulary.
#[must_use]
pub fn context() -> Value {
    json!(["https://www.w3.org/ns/activitystreams", {
        "vf": "https://w3id.org/valueflows/ont/vf#",
        "om2": "http://www.ontology-of-units-of-measure.org/resource/om-2/",
        "Proposal": "vf:Proposal", "Intent": "vf:Intent",
        "Agreement": "vf:Agreement", "Commitment": "vf:Commitment",
        "purpose": "vf:purpose", "publishes": "vf:publishes",
        "unitBased": "vf:unitBased", "action": "vf:action",
        "resourceConformsTo": "vf:resourceConformsTo",
        "resourceQuantity": "vf:resourceQuantity",
        "stipulates": "vf:stipulates", "satisfies": "vf:satisfies",
        "hasUnit": "om2:hasUnit", "hasNumericalValue": "om2:hasNumericalValue"
    }, "https://w3id.org/security/v1"])
}

fn actor(base: &str) -> String {
    format!(
        "{}/api/services/activitypub/actor/code",
        base.trim_end_matches('/')
    )
}

/// Offer one model invocation, using its exact catalog ID as the title.
#[must_use]
pub fn proposal(base: &str, model: &str) -> Value {
    let query = url::form_urlencoded::Serializer::new(String::new())
        .append_pair("model", model)
        .finish();
    let id = format!(
        "{}/api/services/activitypub/outbox/code?{query}",
        base.trim_end_matches('/')
    );
    json!({
        "@context": context(), "id": id, "type": "Proposal", "purpose": "offer",
        "attributedTo": actor(base), "name": model,
        "content": "Model inference via the authenticated OpenAI Chat Completions API. Existing credentials, entitlements and usage limits apply.",
        "publishes": {
            "id": format!("{id}#primary"), "type": "Intent", "action": "deliverService",
            "resourceConformsTo": id,
            "resourceQuantity": {"hasUnit": "one", "hasNumericalValue": "1"}
        },
        "unitBased": false, "to": PUBLIC
    })
}

/// Publish proposals in standard Create activities in the actor's outbox.
#[must_use]
pub fn publication(base: &str, models: &[String]) -> Value {
    let items: Vec<_> = models.iter().map(|model| {
        let object = proposal(base, model);
        json!({"@context": context(), "id": format!("{}#create", object["id"].as_str().unwrap_or_default()),
            "type": "Create", "actor": actor(base), "object": object, "to": PUBLIC})
    }).collect();
    json!({"@context": context(),
        "id": format!("{}/api/services/activitypub/outbox/code", base.trim_end_matches('/')),
        "type": "OrderedCollection", "totalItems": items.len(), "orderedItems": items})
}

/// Negotiate a single invocation against the caller-visible model catalog.
///
/// Unsupported activities are errors; unavailable or changed terms receive
/// Reject(Offer). Accept never bypasses authentication or reserves capacity.
///
/// # Errors
/// Returns an error for malformed activities or unsupported activity types.
pub fn negotiate(base: &str, offer: &Value, models: &[String]) -> Result<Value, &'static str> {
    super::validate_activity(offer)?;
    let remote_actor = offer
        .get("actor")
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or("Offer actor is required")?;
    let offer_id = offer["id"].as_str().ok_or("Offer id is required")?;
    url::Url::parse(remote_actor).map_err(|_| "Offer actor must be an absolute URI")?;
    url::Url::parse(offer_id).map_err(|_| "Offer id must be an absolute URI")?;
    if offer["type"] != "Offer" || offer["object"]["type"] != "Agreement" {
        return Err("only Offer(Agreement) is supported by the marketplace");
    }
    let agreement = &offer["object"];
    let commitment = &agreement["stipulates"];
    let matches = models.iter().any(|model| {
        let proposed = proposal(base, model);
        commitment["type"] == "Commitment"
            && commitment["satisfies"] == proposed["publishes"]["id"]
            && one_invocation(&commitment["resourceQuantity"])
            && agreement.get("stipulatesReciprocal").is_none()
    });
    let id = format!(
        "{}/api/services/activitypub/inbox/code?agreement={}",
        base.trim_end_matches('/'),
        uuid::Uuid::new_v4()
    );
    let mut response = json!({"@context": context(), "id": format!("{id}#response"),
        "type": if matches { "Accept" } else { "Reject" },
        "actor": actor(base), "object": offer_id, "to": remote_actor});
    if matches {
        let finalized = json!({"id": format!("{id}#primary"), "type": "Commitment",
            "satisfies": commitment["satisfies"],
            "resourceQuantity": {"hasUnit":"one", "hasNumericalValue":"1"}});
        response["result"] = json!({"id": id, "type": "Agreement", "attributedTo": actor(base),
            "stipulates": finalized,
            "url": {"type": "Link", "mediaType": "application/json",
                "href": format!("{}/api/services/openai/v1/chat/completions", base.trim_end_matches('/'))}});
    } else {
        response["content"] =
            json!("The model is unavailable or the commitment does not match the proposal.");
    }
    Ok(response)
}
