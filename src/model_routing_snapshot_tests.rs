//! Credential-snapshot regressions for model selection and dispatch.

use super::tests::auto_state;
use super::*;
use axum::extract::{Query, State};
use axum::http::{HeaderMap, HeaderValue};
use http_body_util::BodyExt;
use std::collections::BTreeMap;
use std::fs::{self, OpenOptions, TryLockError};
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tempfile::tempdir;
use tokio::sync::Barrier;

#[derive(Debug)]
struct LockCheckingStore {
    token: crate::subscription::SubscriptionToken,
    lock_path: std::path::PathBuf,
    reloads: AtomicUsize,
    unlocked_reloads: AtomicUsize,
}

impl crate::credential_store::CredentialStore for LockCheckingStore {
    fn reload(&self) -> Option<crate::subscription::SubscriptionToken> {
        self.reloads.fetch_add(1, Ordering::SeqCst);
        let probe = OpenOptions::new()
            .read(true)
            .write(true)
            .create(true)
            .truncate(false)
            .open(&self.lock_path)
            .expect("open credential lock probe");
        match probe.try_lock() {
            Err(TryLockError::WouldBlock) => {}
            Ok(()) => {
                self.unlocked_reloads.fetch_add(1, Ordering::SeqCst);
                probe.unlock().expect("unlock credential lock probe");
            }
            Err(_) => {
                self.unlocked_reloads.fetch_add(1, Ordering::SeqCst);
            }
        }
        Some(self.token.clone())
    }

    fn persist(&self, _token: &crate::subscription::SubscriptionToken) -> Result<(), String> {
        Ok(())
    }

    fn lock_path(&self) -> Option<std::path::PathBuf> {
        Some(self.lock_path.clone())
    }

    fn describe(&self) -> String {
        "lock-checking credential store".to_string()
    }
}

/// Selection and dispatch are one credential decision. If another holder
/// rotates the file after the catalog owner was validated, dispatch must not
/// silently substitute the new account's bearer token for the selected one.
#[tokio::test]
async fn rotation_between_catalog_validation_and_dispatch_reaches_no_upstream() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let credential_path = codex.path().join("auth.json");
    fs::write(
        &credential_path,
        r#"{"tokens":{"access_token":"codex-a","account_id":"account-a"}}"#,
    )
    .unwrap();

    let forwarded = Arc::new(AtomicUsize::new(0));
    let forwarded_for_stub = Arc::clone(&forwarded);
    let stub = axum::Router::new().fallback(move || {
        let forwarded = Arc::clone(&forwarded_for_stub);
        async move {
            forwarded.fetch_add(1, Ordering::SeqCst);
            (StatusCode::OK, "{}")
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
    let client_token = state.token_manager.issue_token(1, "rotation race").unwrap();
    let selected = Arc::new(Barrier::new(2));
    let rotated = Arc::new(Barrier::new(2));
    let selected_in_request = Arc::clone(&selected);
    let rotated_in_request = Arc::clone(&rotated);
    let body = json!({"model": "account-a-model", "input": "hello"});
    let routing_body = body.clone();
    let request = tokio::spawn(async move {
        let routed = route_state_with_subscription(&state, &routing_body)
            .await
            .expect("account A owns the selected catalog");
        selected_in_request.wait().await;
        rotated_in_request.wait().await;

        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {client_token}")).unwrap(),
        );
        crate::subscription_proxy::forward_subscription_openai_routed(
            &routed.state,
            &headers,
            body,
            &routing_body,
            "/v1/responses",
            crate::metrics::Surface::OpenAIResponses,
            routed.subscription.as_ref(),
        )
        .await
    });

    selected.wait().await;
    fs::write(
        &credential_path,
        r#"{"tokens":{"access_token":"codex-b","account_id":"account-b"}}"#,
    )
    .unwrap();
    rotated.wait().await;

    let response = request.await.unwrap();
    assert!(
        !response.status().is_success(),
        "a credential changed after catalog validation must fail closed"
    );
    assert_eq!(
        forwarded.load(Ordering::SeqCst),
        0,
        "credential B must never serve account A's selected catalog"
    );
    stub_task.abort();
}

/// Recovery-aware reload may reconcile a sidecar into the primary credential,
/// so both catalog validation and dispatch revalidation are write-capable
/// operations and must hold the store's own transaction lock.
#[tokio::test]
async fn catalog_and_dispatch_reloads_hold_the_registered_store_lock() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-a","account_id":"account-a"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    let store = Arc::new(LockCheckingStore {
        token: crate::subscription::SubscriptionToken {
            access_token: "codex-a".into(),
            refresh_token: None,
            expires_at_ms: None,
            account_id: Some("account-a".into()),
            resource_url: None,
        },
        lock_path: data.path().join("codex-primary.router-refresh.lock"),
        reloads: AtomicUsize::new(0),
        unlocked_reloads: AtomicUsize::new(0),
    });
    state.subscription_cache.register_store(
        SubscriptionProvider::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        Arc::clone(&store) as Arc<dyn crate::credential_store::CredentialStore>,
    );
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );

    let routed = route_state_with_subscription(&state, &json!({"model": "account-a-model"}))
        .await
        .expect("account A owns the selected catalog");
    routed
        .subscription
        .as_ref()
        .expect("automatic subscription snapshot")
        .for_dispatch()
        .await
        .expect("unchanged token remains dispatchable");

    assert_eq!(store.reloads.load(Ordering::SeqCst), 2);
    assert_eq!(
        store.unlocked_reloads.load(Ordering::SeqCst),
        0,
        "every recovery-aware reload must hold the store's exclusive lock"
    );
}

#[tokio::test]
async fn public_lock_failure_omits_credential_paths_and_reaches_no_upstream() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-a","account_id":"account-a"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Codex,
            codex.path(),
        )],
        data.path(),
    );
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );
    let routing_body = json!({"model": "account-a-model", "input": "hello"});
    let routed = route_state_with_subscription(&state, &routing_body)
        .await
        .expect("account A owns the selected catalog");
    let store = state
        .subscription_cache
        .store_for_subscription(
            SubscriptionProvider::Codex,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
        )
        .expect("registered recovery-aware store");
    let lock_path = store.lock_path().expect("durable credential lock");
    let _held = crate::durable_file::lock_exclusive_async(
        &lock_path,
        crate::credential_recovery_store::CREDENTIAL_LOCK_TIMEOUT,
    )
    .await
    .expect("hold credential lock");
    let client_token = state.token_manager.issue_token(1, "lock failure").unwrap();
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {client_token}")).unwrap(),
    );

    let response = crate::subscription_proxy::forward_subscription_openai_routed(
        &routed.state,
        &headers,
        routing_body.clone(),
        &routing_body,
        "/v1/responses",
        crate::metrics::Surface::OpenAIResponses,
        routed.subscription.as_ref(),
    )
    .await;

    assert_eq!(response.status(), StatusCode::SERVICE_UNAVAILABLE);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body = String::from_utf8(body.to_vec()).unwrap();
    assert!(body.contains("codex credential transaction lock"));
    assert!(!body.contains(&data.path().to_string_lossy().to_string()));
    assert!(!body.contains(&codex.path().to_string_lossy().to_string()));
    assert!(!body.contains(&lock_path.to_string_lossy().to_string()));
}

#[tokio::test]
async fn automatic_gemini_snapshot_serves_both_openai_surfaces() {
    let forwarded = Arc::new(AtomicUsize::new(0));
    let forwarded_for_stub = Arc::clone(&forwarded);
    let stub = axum::Router::new().fallback(move |headers: HeaderMap| {
        let forwarded = Arc::clone(&forwarded_for_stub);
        async move {
            assert_eq!(
                headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok()),
                Some("Bearer gemini-a")
            );
            forwarded.fetch_add(1, Ordering::SeqCst);
            axum::Json(json!({
                "response": {
                    "candidates": [{
                        "content": {"parts": [{"text": "gemini answer"}]},
                        "finishReason": "STOP"
                    }],
                    "usageMetadata": {"promptTokenCount": 3, "candidatesTokenCount": 2}
                }
            }))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base_url = format!("http://{}", listener.local_addr().unwrap());
    let stub_task = tokio::spawn(async move {
        axum::serve(listener, stub).await.unwrap();
    });

    let data = tempdir().unwrap();
    let gemini = tempdir().unwrap();
    fs::write(
        gemini.path().join("oauth_creds.json"),
        json!({
            "access_token": "gemini-a",
            "expiry_date": 9_999_999_999_999_i64,
            "account_id": "account-a",
            "resource_url": base_url,
        })
        .to_string(),
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Gemini,
            gemini.path(),
        )],
        data.path(),
    );
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Gemini,
        Some("account-a".into()),
        vec!["gemini-model".into()],
    );
    let client_token = state.token_manager.issue_token(2, "gemini routes").unwrap();
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {client_token}")).unwrap(),
    );

    let chat = crate::proxy::openai_chat_completions(
        State(state.clone()),
        Query(BTreeMap::new()),
        headers.clone(),
        Ok(axum::Json(json!({
            "model": "gemini-model",
            "messages": [{"role": "user", "content": "hello"}]
        }))),
    )
    .await;
    assert_eq!(chat.status(), StatusCode::OK);
    let chat = chat.into_body().collect().await.unwrap().to_bytes();
    let chat: Value = serde_json::from_slice(&chat).unwrap();
    assert_eq!(chat["choices"][0]["message"]["content"], "gemini answer");

    let responses = crate::proxy::openai_responses(
        State(state),
        headers,
        Ok(axum::Json(json!({
            "model": "gemini-model",
            "input": "hello"
        }))),
    )
    .await;
    assert_eq!(responses.status(), StatusCode::OK);
    let responses = responses.into_body().collect().await.unwrap().to_bytes();
    let responses: Value = serde_json::from_slice(&responses).unwrap();
    assert_eq!(
        responses["choices"][0]["message"]["content"],
        "gemini answer"
    );
    assert_eq!(forwarded.load(Ordering::SeqCst), 2);
    stub_task.abort();
}
