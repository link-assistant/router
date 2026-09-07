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
    assert!(
        page["data"]
            .as_array()
            .unwrap()
            .iter()
            .all(|model| model.get("owned_by").is_none())
    );

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
            "data": [{"id": "synthetic-live", "object": "model", "owned_by": "openai"}]
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

#[test]
fn anthropic_message_resources_resolve_to_one_principal_owned_destination() {
    let data = tempfile::tempdir().unwrap();
    let state = AppState::for_tests(data.path());
    let owner = crate::response_affinity::ResponseOwner::new("claude", "principal-a");
    let destination = crate::response_affinity::AffinityDestination::Subscription {
        provider: SubscriptionProvider::Claude,
        account: "account-a".to_string(),
        upstream_account_id: Some("workspace-a".to_string()),
        base_url: "https://api.anthropic.test".to_string(),
    };
    let store = state.provider_store.response_affinities();
    store
        .record(
            crate::response_affinity::ResponseNamespace::AnthropicFiles,
            "file_owned",
            owner.clone(),
            destination.clone(),
        )
        .unwrap();
    store
        .record(
            crate::response_affinity::ResponseNamespace::AnthropicSkills,
            "skill_owned",
            owner.clone(),
            destination.clone(),
        )
        .unwrap();
    store
        .record_child(
            crate::response_affinity::ResponseNamespace::AnthropicSkillVersions,
            "7",
            "skill_owned",
            owner.clone(),
            destination.clone(),
        )
        .unwrap();
    let body = json!({
        "model": "claude-live",
        "container": {
            "skills": [{"type": "custom", "skill_id": "skill_owned", "version": "7"}]
        },
        "messages": [{
            "role": "user",
            "content": [
                {"type": "document", "source": {"type": "file", "file_id": "file_owned"}},
                {"type": "container_upload", "file_id": "file_owned"}
            ]
        }]
    });

    assert_eq!(
        anthropic_message_resource_destination(&state, &owner, &body).unwrap(),
        Some(destination)
    );

    let foreign = crate::response_affinity::ResponseOwner::new("claude", "principal-b");
    let response = anthropic_message_resource_destination(&state, &foreign, &body).unwrap_err();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
}

#[tokio::test]
async fn anthropic_message_file_reference_binds_the_creator_account_before_dispatch() {
    let data = tempfile::tempdir().unwrap();
    let primary = tempfile::tempdir().unwrap();
    let additional = tempfile::tempdir().unwrap();
    for (home, token) in [
        (&primary, "primary-token"),
        (&additional, "account-one-token"),
    ] {
        fs::write(
            home.path().join(".credentials.json"),
            json!({
                "claudeAiOauth": {
                    "accessToken": token,
                    "expiresAt": 9_999_999_999_999_i64
                }
            })
            .to_string(),
        )
        .unwrap();
    }
    let primary_reader = SubscriptionReader::new(SubscriptionProvider::Claude, primary.path());
    let mut state = auto_state(vec![primary_reader], data.path());
    let account_router = crate::accounts::AccountRouter::new_for_provider(
        primary.path().to_path_buf(),
        &[additional.path().to_path_buf()],
        SubscriptionProvider::Claude,
        crate::accounts::AccountRouterOptions::default(),
    );
    account_router.register_credential_stores_in(&state.subscription_cache, data.path());
    state.account_router = Some(account_router);
    for account in ["primary", "account-1"] {
        state.model_catalogs.record_success_for_account(
            SubscriptionProvider::Claude,
            account,
            None,
            vec!["claude-resource-model".to_string()],
        );
    }
    let token = bound_client_token(&state, crate::clients::ClientKind::ClaudeCode, None);
    let claims = state.token_manager.validate_token(&token).unwrap();
    let owner = crate::response_affinity::ResponseOwner::from_claims(&claims).unwrap();
    state
        .provider_store
        .response_affinities()
        .record(
            crate::response_affinity::ResponseNamespace::AnthropicFiles,
            "file_account_one",
            owner,
            crate::response_affinity::AffinityDestination::Subscription {
                provider: SubscriptionProvider::Claude,
                account: "account-1".to_string(),
                upstream_account_id: None,
                base_url: SubscriptionProvider::Claude.default_base_url().to_string(),
            },
        )
        .unwrap();
    let request = axum::http::Request::builder()
        .method("POST")
        .uri("/api/services/anthropic/v1/messages")
        .header("x-api-key", token)
        .header("user-agent", "claude-code/exact-fixture")
        .body(axum::body::Body::from(
            json!({
                "model": "claude-resource-model",
                "max_tokens": 32,
                "messages": [{
                    "role": "user",
                    "content": [{
                        "type": "document",
                        "source": {"type": "file", "file_id": "file_account_one"}
                    }]
                }]
            })
            .to_string(),
        ))
        .unwrap();

    let (routed, _) = route_anthropic_request_with_subscription(&state, request)
        .await
        .unwrap();

    assert_eq!(routed.state.upstream_provider, UpstreamProvider::Anthropic);
    assert_eq!(
        routed.subscription.unwrap().account_name(),
        Some("account-1")
    );
}
