use super::tests::{auto_state, bound_client_token};
use super::*;
use axum::extract::{OriginalUri, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use http_body_util::BodyExt as _;
use serde_json::{Value, json};
use std::fs;

async fn response_json(state: AppState, uri: &str, headers: HeaderMap) -> (StatusCode, Value) {
    let response = models(State(state), OriginalUri(uri.parse().unwrap()), headers).await;
    let status = response.status();
    let body = response.into_body().collect().await.unwrap().to_bytes();
    (status, serde_json::from_slice(&body).unwrap())
}

fn bearer_headers(state: &AppState, client: crate::clients::ClientKind) -> HeaderMap {
    let token = bound_client_token(state, client, None);
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers
}

fn assert_native_only(body: &Value) {
    let rendered = body.to_string();
    for forbidden in [
        "canonical_id",
        "native_id",
        "provider",
        "router_fetched_at",
        "using_fallback",
        "healthy_providers",
        "degraded_providers",
        "degraded_reasons",
        "catalog_conflicts",
        "owned_by",
    ] {
        assert!(!rendered.contains(forbidden), "leaked {forbidden}: {body}");
    }
}

#[tokio::test]
async fn anthropic_handler_paginates_the_final_visible_catalog() {
    let data = tempfile::tempdir().unwrap();
    let claude = tempfile::tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Claude,
            claude.path(),
        )],
        data.path(),
    );
    state.model_catalogs.record_success(
        SubscriptionProvider::Claude,
        ["a", "b", "c", "d"].map(str::to_string).to_vec(),
    );
    let token = bound_client_token(&state, crate::clients::ClientKind::ClaudeCode, None);
    let mut headers = HeaderMap::new();
    headers.insert("x-api-key", HeaderValue::from_str(&token).unwrap());

    let (status, page) = response_json(
        state.clone(),
        "/api/services/anthropic/v1/models?after_id=a&limit=2",
        headers.clone(),
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(page["data"][0]["id"], "b");
    assert_eq!(page["data"][1]["id"], "c");
    assert_eq!(page["first_id"], "b");
    assert_eq!(page["last_id"], "c");
    assert_eq!(page["has_more"], true);
    assert_native_only(&page);

    let (status, error) = response_json(
        state,
        "/api/services/anthropic/v1/models?limit=1001",
        headers,
    )
    .await;
    assert_eq!(status, StatusCode::BAD_REQUEST);
    assert_eq!(error["type"], "error");
    assert_eq!(error["error"]["type"], "invalid_request_error");
}

#[tokio::test]
async fn pinned_and_automatic_codex_catalogs_use_the_same_openai_dialect() {
    let data = tempfile::tempdir().unwrap();
    let codex = tempfile::tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["synthetic-live".into()]);
    let headers = bearer_headers(&state, crate::clients::ClientKind::Codex);
    let path = "/api/services/codex/v1/models";

    let (auto_status, automatic) = response_json(state.clone(), path, headers.clone()).await;
    assert_eq!(auto_status, StatusCode::OK);
    let mut pinned_state = state;
    pinned_state.upstream_provider = UpstreamProvider::Codex;
    let (pinned_status, pinned) = response_json(pinned_state, path, headers).await;
    assert_eq!(pinned_status, StatusCode::OK);
    assert_eq!(automatic, pinned);
    assert_eq!(
        automatic,
        json!({
            "object": "list",
            "data": [{"id": "synthetic-live", "object": "model"}]
        })
    );
    assert_native_only(&automatic);
}

#[tokio::test]
async fn neutral_catalog_retains_router_service_metadata() {
    let data = tempfile::tempdir().unwrap();
    let codex = tempfile::tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["synthetic-live".into()]);
    let headers = bearer_headers(&state, crate::clients::ClientKind::Codex);
    let response = aggregate_models(
        State(state),
        OriginalUri("/api/models".parse().unwrap()),
        headers,
    )
    .await;
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let catalog: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(catalog["data"][0]["id"], "synthetic-live");
    assert_eq!(catalog["data"][0]["service"], "codex");
    assert_eq!(catalog["data"][0]["owned_by"], "openai");
}
