//! Minimal `ActivityPub` / `ForgeFed` endpoint support.
//!
//! The router exposes a local service actor and accepts inbound activities so
//! a ForgeFed-capable problem source can discover and address it.

use axum::extract::State;
use axum::http::{HeaderMap, HeaderValue, StatusCode, header};
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::proxy::AppState;
use crate::route_contract::{RouteId, route_template};

const ACTIVITY_JSON: &str = "application/activity+json";

/// Build the public actor representation for this router instance.
#[must_use]
pub fn actor_document(actor_base_url: &str, public_key_pem: &str) -> Value {
    let base = actor_base_url.trim_end_matches('/');
    let actor = activitypub_url(base, RouteId::ActivityPubActor);
    json!({
        "@context": activitypub_context(),
        "id": actor,
        "type": "Service",
        "preferredUsername": "code",
        "name": "Link Assistant Code Router",
        "summary": "ActivityPub and ForgeFed service actor for coding problem federation",
        "inbox": activitypub_url(base, RouteId::ActivityPubInbox),
        "outbox": activitypub_url(base, RouteId::ActivityPubOutbox),
        "followers": activitypub_url(base, RouteId::ActivityPubFollowers),
        "aliases": [
            "urn:link-assistant:router:code".to_string(),
            actor
        ],
        "publicKey": {
            "id": format!("{actor}#main-key"),
            "owner": actor,
            "publicKeyPem": public_key_pem
        }
    })
}

/// Build an ordered collection for the local actor outbox.
#[must_use]
pub fn outbox_document(actor_base_url: &str) -> Value {
    let base = actor_base_url.trim_end_matches('/');
    json!({
        "@context": activitypub_context(),
        "id": activitypub_url(base, RouteId::ActivityPubOutbox),
        "type": "OrderedCollection",
        "totalItems": 0,
        "orderedItems": []
    })
}

/// Build an ordered collection for followers.
#[must_use]
pub fn followers_document(actor_base_url: &str) -> Value {
    let base = actor_base_url.trim_end_matches('/');
    json!({
        "@context": activitypub_context(),
        "id": activitypub_url(base, RouteId::ActivityPubFollowers),
        "type": "OrderedCollection",
        "totalItems": 0,
        "orderedItems": []
    })
}

/// Build a Follow activity targeting the public problemsets actor.
#[must_use]
pub fn follow_problemsets_activity(actor_base_url: &str) -> Value {
    let base = actor_base_url.trim_end_matches('/');
    json!({
        "@context": activitypub_context(),
        "id": activitypub_url(base, RouteId::ActivityPubFollowProblemsets),
        "type": "Follow",
        "actor": activitypub_url(base, RouteId::ActivityPubActor),
        "object": "https://problemsets.lefine.pro/actor/code",
        "to": ["https://problemsets.lefine.pro/actor/code"]
    })
}

fn activitypub_url(base: &str, route: RouteId) -> String {
    format!("{base}{}", route_template(route))
}

/// Validate the minimum fields required for an inbound `ActivityStreams` object.
pub fn validate_activity(activity: &Value) -> Result<(), &'static str> {
    require_string(activity, "id")?;
    require_string(activity, "type")?;
    if activity.get("actor").and_then(Value::as_str).is_none()
        && activity
            .get("attributedTo")
            .and_then(Value::as_str)
            .is_none()
    {
        return Err("activity must include actor or attributedTo");
    }
    Ok(())
}

/// `GET /api/services/activitypub/actor/code`.
#[allow(clippy::unused_async)]
pub async fn actor(State(state): State<AppState>) -> impl IntoResponse {
    activity_response(actor_document(
        &state.activitypub_actor_base_url,
        &state.activitypub_public_key_pem,
    ))
}

/// `GET /api/services/activitypub/outbox/code`.
#[allow(clippy::unused_async)]
pub async fn outbox(State(state): State<AppState>) -> impl IntoResponse {
    activity_response(outbox_document(&state.activitypub_actor_base_url))
}

/// `GET /api/services/activitypub/actors/code/followers`.
#[allow(clippy::unused_async)]
pub async fn followers(State(state): State<AppState>) -> impl IntoResponse {
    activity_response(followers_document(&state.activitypub_actor_base_url))
}

/// `GET /api/services/activitypub/activities/follow-problemsets-code-001`.
#[allow(clippy::unused_async)]
pub async fn follow_problemsets(State(state): State<AppState>) -> impl IntoResponse {
    activity_response(follow_problemsets_activity(
        &state.activitypub_actor_base_url,
    ))
}

/// `POST /api/services/activitypub/inbox/code`.
#[allow(clippy::unused_async)]
pub async fn inbox(axum::Json(activity): axum::Json<Value>) -> impl IntoResponse {
    match validate_activity(&activity) {
        Ok(()) => {
            let response = json!({
                "@context": activitypub_context(),
                "type": "Accept",
                "object": activity
            });
            (
                StatusCode::ACCEPTED,
                activity_headers(),
                axum::Json(response),
            )
                .into_response()
        }
        Err(message) => (
            StatusCode::BAD_REQUEST,
            axum::Json(json!({
                "error": "invalid_activity",
                "message": message
            })),
        )
            .into_response(),
    }
}

fn activity_response(value: Value) -> Response {
    (StatusCode::OK, activity_headers(), axum::Json(value)).into_response()
}

fn activity_headers() -> HeaderMap {
    let mut headers = HeaderMap::new();
    headers.insert(
        header::CONTENT_TYPE,
        HeaderValue::from_static(r"application/activity+json"),
    );
    headers.insert(header::ACCEPT, HeaderValue::from_static(ACTIVITY_JSON));
    headers
}

fn activitypub_context() -> Value {
    json!([
        "https://www.w3.org/ns/activitystreams",
        "https://forgefed.org/ns",
        {
            "fep": "https://w3id.org/fep/ef61#",
            "aliases": "fep:aliases"
        }
    ])
}

fn require_string<'a>(activity: &'a Value, field: &'static str) -> Result<&'a str, &'static str> {
    activity
        .get(field)
        .and_then(Value::as_str)
        .filter(|s| !s.is_empty())
        .ok_or(match field {
            "id" => "activity id is required",
            "type" => "activity type is required",
            _ => "required field is missing",
        })
}

#[cfg(test)]
mod tests {
    use super::*;

    const BASE: &str = "https://router.example";
    const KEY: &str = "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----";

    #[test]
    fn actor_contains_required_activitypub_and_forgefed_metadata() {
        let doc = actor_document(BASE, KEY);

        assert_eq!(
            doc["id"],
            "https://router.example/api/services/activitypub/actor/code"
        );
        assert_eq!(doc["type"], "Service");
        assert_eq!(
            doc["inbox"],
            "https://router.example/api/services/activitypub/inbox/code"
        );
        assert_eq!(
            doc["outbox"],
            "https://router.example/api/services/activitypub/outbox/code"
        );
        assert_eq!(
            doc["followers"],
            "https://router.example/api/services/activitypub/actors/code/followers"
        );
        assert_eq!(doc["publicKey"]["owner"], doc["id"]);
        assert_eq!(doc["publicKey"]["publicKeyPem"], KEY);
        assert!(
            doc["@context"]
                .as_array()
                .expect("context array")
                .iter()
                .any(|item| item == "https://forgefed.org/ns")
        );
        assert!(doc["aliases"].as_array().expect("aliases").len() >= 2);
    }

    #[test]
    fn follow_activity_targets_problemsets_actor() {
        let activity = follow_problemsets_activity(BASE);

        assert_eq!(activity["type"], "Follow");
        assert_eq!(
            activity["actor"],
            "https://router.example/api/services/activitypub/actor/code"
        );
        assert_eq!(
            activity["object"],
            "https://problemsets.lefine.pro/actor/code"
        );
        assert_eq!(
            activity["to"][0],
            "https://problemsets.lefine.pro/actor/code"
        );
    }

    #[test]
    fn inbound_activity_requires_core_fields() {
        let valid = json!({
            "id": "https://remote.example/activity/1",
            "type": "Create",
            "actor": "https://remote.example/actor"
        });
        assert!(validate_activity(&valid).is_ok());

        let invalid = json!({
            "id": "https://remote.example/activity/1",
            "type": "Create"
        });
        assert_eq!(
            validate_activity(&invalid),
            Err("activity must include actor or attributedTo")
        );
    }
}
