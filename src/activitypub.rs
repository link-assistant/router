//! `ActivityPub` marketplace discovery and FEP-0837 agreement negotiation.

pub mod marketplace;

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
        "summary": "FEP-0837 model inference marketplace",
        "inbox": activitypub_url(base, RouteId::ActivityPubInbox),
        "outbox": activitypub_url(base, RouteId::ActivityPubOutbox),
        "followers": activitypub_url(base, RouteId::ActivityPubFollowers),
        "publicKey": {
            "id": format!("{actor}#main-key"),
            "owner": actor,
            "publicKeyPem": public_key_pem
        }
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
pub async fn outbox(
    State(state): State<AppState>,
    axum::extract::Query(query): axum::extract::Query<std::collections::BTreeMap<String, String>>,
    headers: HeaderMap,
) -> Response {
    let models = match visible_models(&state, headers).await {
        Ok(models) => models,
        Err(response) => return response,
    };
    if let Some(model) = query.get("model") {
        return if models.contains(model) {
            activity_response(marketplace::proposal(
                &state.activitypub_actor_base_url,
                model,
            ))
        } else {
            crate::proxy::error_response(
                StatusCode::NOT_FOUND,
                "not_found_error",
                "Model is not available in the caller's catalog",
            )
        };
    }
    activity_response(marketplace::publication(
        &state.activitypub_actor_base_url,
        &models,
    ))
}

async fn visible_models(state: &AppState, headers: HeaderMap) -> Result<Vec<String>, Response> {
    let response = crate::proxy::openai_models(
        State(state.clone()),
        axum::extract::OriginalUri(axum::http::Uri::from_static(
            "/api/services/openai/v1/models",
        )),
        headers,
    )
    .await;
    if !response.status().is_success() {
        return Err(response);
    }
    let body = axum::body::to_bytes(response.into_body(), state.max_proxy_request_bytes)
        .await
        .map_err(|_| StatusCode::BAD_GATEWAY.into_response())?;
    let catalog: Value =
        serde_json::from_slice(&body).map_err(|_| StatusCode::BAD_GATEWAY.into_response())?;
    Ok(catalog["data"]
        .as_array()
        .into_iter()
        .flatten()
        .filter(|model| model["router_available"] != false)
        .filter_map(|model| {
            model["id"]
                .as_str()
                .filter(|id| !id.is_empty())
                .map(str::to_owned)
        })
        .collect())
}

/// `GET /api/services/activitypub/actors/code/followers`.
#[allow(clippy::unused_async)]
pub async fn followers(State(state): State<AppState>) -> impl IntoResponse {
    activity_response(followers_document(&state.activitypub_actor_base_url))
}

/// `POST /api/services/activitypub/inbox/code`.
#[allow(clippy::unused_async)]
pub async fn inbox(
    State(state): State<AppState>,
    headers: HeaderMap,
    axum::Json(activity): axum::Json<Value>,
) -> Response {
    let models = match visible_models(&state, headers).await {
        Ok(models) => models,
        Err(response) => return response,
    };
    match marketplace::negotiate(&state.activitypub_actor_base_url, &activity, &models) {
        Ok(response) => (
            StatusCode::ACCEPTED,
            activity_headers(),
            axum::Json(response),
        )
            .into_response(),
        Err(message) => {
            crate::proxy::error_response(StatusCode::BAD_REQUEST, "invalid_request_error", message)
        }
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
    marketplace::context()
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
    fn actor_contains_required_activitypub_metadata() {
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
        assert!(doc.get("aliases").is_none());
        assert_eq!(doc["@context"][1]["Proposal"], "vf:Proposal");
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
