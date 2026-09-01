//! Inference-surface coverage for credential-generation-aware evidence.

use super::tests::auto_state;
use super::*;
use axum::body::Body;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, HeaderValue, Request, StatusCode};
use http_body_util::BodyExt as _;
use std::collections::BTreeMap;
use std::fs;
use std::sync::{Arc, Mutex};
use tempfile::{TempDir, tempdir};
use tokio::sync::Barrier;

const MODEL: &str = "generation-evidence-model";

async fn rejecting_upstream() -> (String, tokio::task::JoinHandle<()>) {
    let app = axum::Router::new().fallback(|| async {
        (
            StatusCode::UNAUTHORIZED,
            axum::Json(json!({"error": {"message": "credential rejected"}})),
        )
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });
    (base_url, task)
}

fn write_credential(provider: SubscriptionProvider, home: &TempDir, base_url: &str) {
    let (name, document) = match provider {
        SubscriptionProvider::Claude => (
            ".credentials.json",
            json!({
                "claudeAiOauth": {
                    "accessToken": "claude-access-a",
                    "expiresAt": 9_999_999_999_999_i64
                }
            }),
        ),
        SubscriptionProvider::Codex => (
            "auth.json",
            json!({
                "tokens": {
                    "access_token": "codex-access-a",
                    "account_id": "account-a"
                },
                "expiry_date": 9_999_999_999_999_i64
            }),
        ),
        SubscriptionProvider::Gemini => (
            "oauth_creds.json",
            json!({
                "access_token": "gemini-access-a",
                "expiry_date": 9_999_999_999_999_i64,
                "account_id": "account-a",
                "resource_url": base_url
            }),
        ),
        SubscriptionProvider::Qwen => (
            "oauth_creds.json",
            json!({
                "access_token": "qwen-access-a",
                "expiry_date": 9_999_999_999_999_i64,
                "account_id": "account-a",
                "resource_url": base_url
            }),
        ),
    };
    fs::write(home.path().join(name), document.to_string()).unwrap();
}

fn state_for(
    provider: SubscriptionProvider,
    data: &TempDir,
    home: &TempDir,
    base_url: &str,
) -> AppState {
    write_credential(provider, home, base_url);
    let reader = SubscriptionReader::new(provider, home.path());
    let mut state = auto_state(vec![reader.clone()], data.path());
    state.subscription_reader = Some(reader);
    state.upstream_provider = match provider {
        SubscriptionProvider::Claude => UpstreamProvider::Anthropic,
        SubscriptionProvider::Codex => UpstreamProvider::Codex,
        SubscriptionProvider::Gemini => UpstreamProvider::Gemini,
        SubscriptionProvider::Qwen => UpstreamProvider::Qwen,
    };
    state.upstream_base_url = base_url.to_string();
    state.subscription_base_url = Some(base_url.to_string());
    state.register_credential_recovery_in(data.path(), &crate::app_state::VendorClis::default());
    state.model_catalogs.record_success_for(
        provider,
        (provider != SubscriptionProvider::Claude).then(|| "account-a".to_string()),
        vec![MODEL.to_string()],
    );
    state
}

fn client_headers(state: &AppState) -> HeaderMap {
    let token = state
        .token_manager
        .issue_token(8, "inference evidence")
        .unwrap();
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
    );
    headers
}

fn assert_rejected(state: &AppState, provider: SubscriptionProvider) {
    assert_eq!(
        state.subscription_cache.evidence_for(provider, "primary"),
        Some(crate::refresh::CredentialEvidence::Rejected),
        "the final upstream credential on {provider} must own its rejection evidence"
    );
}

/// A validated request owns one credential decision for its entire lifetime.
/// If account A reaches the upstream and is rejected, a later file rotation to
/// account B must neither retry with B nor let A's delayed response poison B.
#[tokio::test]
async fn validated_401_never_retries_or_poisons_a_post_dispatch_replacement() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let credential_path = codex.path().join("auth.json");
    fs::write(
        &credential_path,
        r#"{"tokens":{"access_token":"codex-a","refresh_token":"refresh-a","account_id":"account-a"}}"#,
    )
    .unwrap();

    let reached_upstream = Arc::new(Barrier::new(2));
    let may_answer = Arc::new(Barrier::new(2));
    let authorizations = Arc::new(Mutex::new(Vec::<String>::new()));
    let reached_for_stub = Arc::clone(&reached_upstream);
    let answer_for_stub = Arc::clone(&may_answer);
    let authorizations_for_stub = Arc::clone(&authorizations);
    let stub = axum::Router::new().fallback(move |headers: HeaderMap| {
        let reached = Arc::clone(&reached_for_stub);
        let may_answer = Arc::clone(&answer_for_stub);
        let authorizations = Arc::clone(&authorizations_for_stub);
        async move {
            let authorization = headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .unwrap_or_default()
                .to_string();
            authorizations.lock().unwrap().push(authorization.clone());
            if authorization == "Bearer codex-a" {
                reached.wait().await;
                may_answer.wait().await;
                (StatusCode::UNAUTHORIZED, "rejected account A")
            } else {
                (StatusCode::OK, "{}")
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let stub_url = format!("http://{}", listener.local_addr().unwrap());
    let stub_task = tokio::spawn(async move {
        axum::serve(listener, stub).await.unwrap();
    });

    let mut state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    state.subscription_base_url = Some(stub_url);
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );
    let client_token = state.token_manager.issue_token(1, "401 race").unwrap();
    let body = json!({"model": "account-a-model", "input": "hello"});
    let routed = route_state_with_subscription(&state, &body)
        .await
        .expect("account A owns the selected catalog");
    let post_race_state = routed.state.clone();
    let request_body = body.clone();
    let request_client_token = client_token.clone();
    let request = tokio::spawn(async move {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {request_client_token}")).unwrap(),
        );
        crate::subscription_proxy::forward_subscription_openai_routed(
            &routed.state,
            &headers,
            request_body.clone(),
            &request_body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
            routed.subscription.as_ref(),
        )
        .await
    });

    reached_upstream.wait().await;
    fs::write(
        &credential_path,
        r#"{"tokens":{"access_token":"codex-b","refresh_token":"refresh-b","account_id":"account-b"}}"#,
    )
    .unwrap();
    let credential_b = post_race_state
        .subscription_cache
        .load_authoritative(SubscriptionProvider::Codex, "primary")
        .await
        .unwrap()
        .expect("account B is the new authority");
    post_race_state
        .subscription_cache
        .record_status_for_credential(SubscriptionProvider::Codex, "primary", &credential_b, 200)
        .await;
    may_answer.wait().await;

    let response = request.await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        post_race_state
            .subscription_cache
            .evidence_for(SubscriptionProvider::Codex, "primary"),
        Some(crate::refresh::CredentialEvidence::Working),
        "account A's delayed rejection must not poison reconciled account B"
    );

    post_race_state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-b".into()),
        vec!["account-b-model".into()],
    );
    let second_body = json!({"model": "account-b-model", "input": "hello again"});
    let second_routed = route_state_with_subscription(&post_race_state, &second_body)
        .await
        .expect("account B remains eligible after A's delayed rejection");
    let mut second_headers = HeaderMap::new();
    second_headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {client_token}")).unwrap(),
    );
    let second_response = crate::subscription_proxy::forward_subscription_openai_routed(
        &second_routed.state,
        &second_headers,
        second_body.clone(),
        &second_body,
        "/v1/responses",
        crate::metrics::Surface::OpenAIResponses,
        second_routed.subscription.as_ref(),
    )
    .await;
    assert_eq!(second_response.status(), StatusCode::OK);
    assert_eq!(
        authorizations.lock().unwrap().as_slice(),
        ["Bearer codex-a", "Bearer codex-b"],
        "the validated request returns A's rejection without sending B"
    );
    stub_task.abort();
}

#[tokio::test]
async fn raw_anthropic_records_the_current_claude_credential_rejection() {
    let (base_url, task) = rejecting_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = state_for(SubscriptionProvider::Claude, &data, &home, &base_url);
    let body = json!({
        "model": MODEL,
        "max_tokens": 8,
        "messages": [{"role": "user", "content": "hello"}]
    });
    let request = Request::builder()
        .method("POST")
        .uri("/v1/messages")
        .header(
            "authorization",
            client_headers(&state).get("authorization").unwrap(),
        )
        .header("content-type", "application/json")
        .body(Body::from(body.to_string()))
        .unwrap();

    let response = crate::proxy::proxy_handler(State(state.clone()), request).await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_rejected(&state, SubscriptionProvider::Claude);
    task.abort();
}

#[tokio::test]
async fn openai_anthropic_bridge_records_the_current_claude_credential_rejection() {
    let (base_url, task) = rejecting_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = state_for(SubscriptionProvider::Claude, &data, &home, &base_url);
    let response = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(BTreeMap::new()),
        client_headers(&state),
        Ok(axum::Json(json!({
            "model": MODEL,
            "messages": [{"role": "user", "content": "hello"}]
        }))),
    )
    .await;

    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_rejected(&state, SubscriptionProvider::Claude);
    task.abort();
}

#[tokio::test]
async fn subscription_openai_records_codex_and_qwen_credential_rejections() {
    let (base_url, task) = rejecting_upstream().await;
    for provider in [SubscriptionProvider::Codex, SubscriptionProvider::Qwen] {
        let data = tempfile::tempdir().unwrap();
        let home = tempfile::tempdir().unwrap();
        let state = state_for(provider, &data, &home, &base_url);
        let body = if provider == SubscriptionProvider::Codex {
            json!({"model": MODEL, "input": "hello"})
        } else {
            json!({
                "model": MODEL,
                "messages": [{"role": "user", "content": "hello"}]
            })
        };
        let path = if provider == SubscriptionProvider::Codex {
            "/v1/responses"
        } else {
            "/v1/chat/completions"
        };
        let response = crate::subscription_proxy::forward_subscription_openai(
            &state,
            &client_headers(&state),
            body.clone(),
            &body,
            path,
            crate::metrics::Surface::OpenAIChat,
        )
        .await;

        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        assert_rejected(&state, provider);
    }
    task.abort();
}

#[tokio::test]
async fn gemini_openai_and_native_surfaces_record_the_current_credential_rejection() {
    let (base_url, task) = rejecting_upstream().await;
    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = state_for(SubscriptionProvider::Gemini, &data, &home, &base_url);
    let response = crate::gemini::forward_chat_completions_as(
        &state,
        &client_headers(&state),
        json!({
            "model": MODEL,
            "messages": [{"role": "user", "content": "hello"}]
        }),
        crate::metrics::Surface::OpenAIChat,
    )
    .await;
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_rejected(&state, SubscriptionProvider::Gemini);

    let native_data = tempfile::tempdir().unwrap();
    let native_home = tempfile::tempdir().unwrap();
    let native_state = state_for(
        SubscriptionProvider::Gemini,
        &native_data,
        &native_home,
        &base_url,
    );
    let native = Box::pin(crate::gemini::forward_native_gemini(
        State(native_state.clone()),
        Path(format!("models/{MODEL}:generateContent")),
        client_headers(&native_state),
        Ok(axum::Json(json!({
            "contents": [{"role": "user", "parts": [{"text": "hello"}]}]
        }))),
    ))
    .await;
    assert_eq!(native.status(), StatusCode::UNAUTHORIZED);
    assert_rejected(&native_state, SubscriptionProvider::Gemini);
    task.abort();
}

/// A retry-capable surface must attribute the final response to the token that
/// produced it. Recording the initial rejected token would be ignored after B
/// reconciliation and leave B's prior rejection evidence in place.
#[tokio::test]
async fn subscription_retry_records_the_final_actual_credential_without_leaking_it() {
    let reached_a = Arc::new(Barrier::new(2));
    let release_a = Arc::new(Barrier::new(2));
    let authorizations = Arc::new(Mutex::new(Vec::<String>::new()));
    let reached_for_stub = Arc::clone(&reached_a);
    let release_for_stub = Arc::clone(&release_a);
    let authorizations_for_stub = Arc::clone(&authorizations);
    let app = axum::Router::new().fallback(move |headers: HeaderMap| {
        let reached = Arc::clone(&reached_for_stub);
        let release = Arc::clone(&release_for_stub);
        let authorizations = Arc::clone(&authorizations_for_stub);
        async move {
            let authorization = headers
                .get("authorization")
                .and_then(|value| value.to_str().ok())
                .unwrap_or_default()
                .to_string();
            authorizations.lock().unwrap().push(authorization.clone());
            if authorization == "Bearer qwen-access-a" {
                reached.wait().await;
                release.wait().await;
                (StatusCode::UNAUTHORIZED, "{}")
            } else {
                (StatusCode::OK, "{}")
            }
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.unwrap();
    });

    let data = tempfile::tempdir().unwrap();
    let home = tempfile::tempdir().unwrap();
    let state = state_for(SubscriptionProvider::Qwen, &data, &home, &base_url);
    let body = json!({
        "model": MODEL,
        "messages": [{"role": "user", "content": "hello"}]
    });
    let request_state = state.clone();
    let request_body = body.clone();
    let request_headers = client_headers(&state);
    let request = tokio::spawn(async move {
        crate::subscription_proxy::forward_subscription_openai(
            &request_state,
            &request_headers,
            request_body.clone(),
            &request_body,
            "/v1/chat/completions",
            crate::metrics::Surface::OpenAIChat,
        )
        .await
    });

    reached_a.wait().await;
    fs::write(
        home.path().join("oauth_creds.json"),
        json!({
            "access_token": "qwen-access-b",
            "expiry_date": 9_999_999_999_999_i64,
            "account_id": "account-a",
            "resource_url": base_url
        })
        .to_string(),
    )
    .unwrap();
    let credential_b = state
        .subscription_cache
        .load_authoritative(SubscriptionProvider::Qwen, "primary")
        .await
        .unwrap()
        .expect("replacement B is authoritative");
    crate::refresh::test_support::seed_cached_token(
        &state.subscription_cache,
        SubscriptionProvider::Qwen,
        "primary",
        credential_b.clone(),
    );
    state
        .subscription_cache
        .record_status_for_credential(SubscriptionProvider::Qwen, "primary", &credential_b, 403)
        .await;
    release_a.wait().await;

    let response = request.await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        state
            .subscription_cache
            .evidence_for(SubscriptionProvider::Qwen, "primary"),
        Some(crate::refresh::CredentialEvidence::Working),
        "the successful retry with B must replace B's earlier rejection"
    );
    assert_eq!(
        authorizations.lock().unwrap().as_slice(),
        ["Bearer qwen-access-a", "Bearer qwen-access-b"]
    );
    let response_body = response.into_body().collect().await.unwrap().to_bytes();
    let public_body = String::from_utf8_lossy(&response_body);
    assert!(!public_body.contains("qwen-access"), "{public_body}");
    assert!(!public_body.contains("account-a"), "{public_body}");
    task.abort();
}
