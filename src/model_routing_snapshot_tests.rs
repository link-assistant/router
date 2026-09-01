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
use std::time::Duration;
use tempfile::tempdir;
use tokio::sync::Barrier;

#[derive(Debug)]
struct LockCheckingStore {
    token: crate::subscription::SubscriptionToken,
    lock_path: std::path::PathBuf,
    reloads: AtomicUsize,
    unlocked_reloads: AtomicUsize,
}

#[derive(Debug)]
struct RecoveryOnlyPrimary {
    lock_path: std::path::PathBuf,
}

impl crate::credential_store::CredentialStore for RecoveryOnlyPrimary {
    fn reload(&self) -> Option<crate::subscription::SubscriptionToken> {
        None
    }

    fn persist(&self, _token: &crate::subscription::SubscriptionToken) -> Result<(), String> {
        Err("primary is read-only".into())
    }

    fn lock_path(&self) -> Option<std::path::PathBuf> {
        Some(self.lock_path.clone())
    }

    fn describe(&self) -> String {
        "read-only test primary".into()
    }
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

/// A validated request owns one credential decision for its entire lifetime.
/// If account A reaches the upstream and is rejected, a later file rotation to
/// account B must not turn the generic reactive-refresh retry into a second
/// request for A's already-selected model.
#[tokio::test]
async fn validated_401_never_retries_with_a_post_dispatch_rotation() {
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
    let authorizations = Arc::new(std::sync::Mutex::new(Vec::<String>::new()));
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
    let request_body = body.clone();
    let request = tokio::spawn(async move {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {client_token}")).unwrap(),
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
    may_answer.wait().await;

    let response = request.await.unwrap();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
    assert_eq!(
        authorizations.lock().unwrap().as_slice(),
        ["Bearer codex-a"],
        "a validated request must return A's rejection without sending B"
    );
    stub_task.abort();
}

/// Pinned serving must resolve the same recovery-aware authority as catalog
/// and health. A durable sidecar is a usable credential even when the vendor
/// primary is absent, and the raw reader must not erase that state.
#[tokio::test]
async fn pinned_serving_uses_a_recovery_only_authoritative_token() {
    use crate::credential_store::CredentialStore as _;

    let authorizations = Arc::new(std::sync::Mutex::new(Vec::<String>::new()));
    let authorizations_for_stub = Arc::clone(&authorizations);
    let stub = axum::Router::new().fallback(move |headers: HeaderMap| {
        let authorizations = Arc::clone(&authorizations_for_stub);
        async move {
            authorizations.lock().unwrap().push(
                headers
                    .get("authorization")
                    .and_then(|value| value.to_str().ok())
                    .unwrap_or_default()
                    .to_string(),
            );
            axum::Json(json!({
                "id": "resp_1",
                "object": "response",
                "status": "completed",
                "output": []
            }))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let stub_url = format!("http://{}", listener.local_addr().unwrap());
    let stub_task = tokio::spawn(async move {
        axum::serve(listener, stub).await.unwrap();
    });

    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, codex.path());
    let primary: Arc<dyn crate::credential_store::CredentialStore> =
        Arc::new(RecoveryOnlyPrimary {
            lock_path: data.path().join("primary.lock"),
        });
    let recoverable = Arc::new(
        crate::credential_recovery_store::RecoverableCredentialStore::new(
            SubscriptionProvider::Codex,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            primary,
            data.path(),
        ),
    );
    recoverable
        .persist(&crate::subscription::SubscriptionToken {
            access_token: "recovered-access".into(),
            refresh_token: Some("recovered-refresh".into()),
            expires_at_ms: Some(chrono::Utc::now().timestamp_millis() + 3_600_000),
            account_id: Some("recovered-account".into()),
            resource_url: None,
        })
        .expect("recovery-only credential");

    let mut state = auto_state(vec![reader.clone()], data.path());
    state.upstream_provider = UpstreamProvider::Codex;
    state.subscription_reader = Some(reader);
    state.subscription_base_url = Some(stub_url);
    state.subscription_cache.register_store(
        SubscriptionProvider::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        recoverable,
    );
    let client_token = state
        .token_manager
        .issue_token(1, "recovery serving")
        .unwrap();
    let mut headers = HeaderMap::new();
    headers.insert(
        "authorization",
        HeaderValue::from_str(&format!("Bearer {client_token}")).unwrap(),
    );
    let body = json!({"model": "recovered-model", "input": "hello"});

    let response = crate::subscription_proxy::forward_subscription_openai_routed(
        &state,
        &headers,
        body.clone(),
        &body,
        "/v1/responses",
        crate::metrics::Surface::OpenAIResponses,
        None,
    )
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        authorizations.lock().unwrap().as_slice(),
        ["Bearer recovered-access"]
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

/// A successful refresh is allowed to leave the old access token on disk when
/// the endpoint did not rotate the refresh link. Dispatch must use the fresh
/// in-memory access token while accepting that exact pre-refresh baseline.
#[tokio::test]
async fn refreshed_access_with_an_unchanged_link_remains_dispatchable() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, codex.path());
    fs::write(
        codex.path().join("auth.json"),
        json!({
            "tokens": {
                "access_token": "expired-access",
                "refresh_token": "same-link",
                "account_id": "account-a"
            },
            "expires_at": 1
        })
        .to_string(),
    )
    .unwrap();
    let state = auto_state(vec![reader.clone()], data.path());
    state
        .subscription_cache
        .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, &reader);
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );

    let refresh = axum::Router::new().fallback(|| async {
        axum::Json(json!({"access_token": "fresh-access", "expires_in": 3600}))
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let refresh_url = format!("http://{}", listener.local_addr().unwrap());
    let refresh_task = tokio::spawn(async move {
        axum::serve(listener, refresh).await.unwrap();
    });
    let now_ms = chrono::Utc::now().timestamp_millis();
    let baseline = reader.read_token().unwrap();
    let fresh = crate::refresh::test_support::refresh_against(
        &state.subscription_cache,
        &state.client,
        &refresh_url,
        SubscriptionProvider::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        baseline.clone(),
        now_ms,
    )
    .await;
    assert_eq!(fresh.access_token, "fresh-access");
    assert_eq!(fresh.refresh_token, baseline.refresh_token);
    assert_eq!(reader.read_token().unwrap(), baseline);

    let routed = route_state_with_subscription(&state, &json!({"model": "account-a-model"}))
        .await
        .expect("the refreshed account still owns the catalog");
    let selected = routed
        .subscription
        .as_ref()
        .expect("automatic subscription snapshot")
        .for_dispatch()
        .await
        .expect("an unchanged durable refresh link remains valid");
    assert_eq!(selected.token.access_token, "fresh-access");
    refresh_task.abort();
}

/// Codex intentionally does not persist the response-derived expiry when it
/// writes a rotated refresh link. A durable re-read can therefore differ from
/// the selected token only in expiry representation and must still pass the
/// dispatch barrier.
#[tokio::test]
async fn writable_codex_rotation_with_a_lossy_expiry_remains_dispatchable() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, codex.path());
    fs::write(
        codex.path().join("auth.json"),
        json!({
            "tokens": {
                "access_token": "expired-access",
                "refresh_token": "old-link",
                "account_id": "account-a"
            },
            "expiry_date": 1
        })
        .to_string(),
    )
    .unwrap();
    let state = auto_state(vec![reader.clone()], data.path());
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );
    let baseline = reader.read_token().unwrap();
    let now_ms = chrono::Utc::now().timestamp_millis();
    let selected = crate::subscription::SubscriptionToken {
        access_token: "fresh-access".into(),
        refresh_token: Some("rotated-link".into()),
        expires_at_ms: Some(now_ms + 3_600_000),
        account_id: Some("account-a".into()),
        resource_url: None,
    };
    crate::refresh::test_support::seed_cached_token(
        &state.subscription_cache,
        SubscriptionProvider::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        selected.clone(),
    );

    let routed = route_state_with_subscription(&state, &json!({"model": "account-a-model"}))
        .await
        .expect("the cached account still owns the catalog");

    let refresh = axum::Router::new().fallback(|| async {
        axum::Json(json!({
            "access_token": "fresh-access",
            "refresh_token": "rotated-link",
            "expires_in": 3600
        }))
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let refresh_url = format!("http://{}", listener.local_addr().unwrap());
    let refresh_task = tokio::spawn(async move {
        axum::serve(listener, refresh).await.unwrap();
    });
    let writer_cache = crate::refresh::TokenCache::new();
    let store = state
        .subscription_cache
        .store_for_subscription(
            SubscriptionProvider::Codex,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
        )
        .expect("registered writable Codex store");
    writer_cache.register_store(
        SubscriptionProvider::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        store,
    );
    let refreshed = crate::refresh::test_support::refresh_against(
        &writer_cache,
        &state.client,
        &refresh_url,
        SubscriptionProvider::Codex,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        baseline.clone(),
        now_ms,
    )
    .await;
    assert_eq!(refreshed, selected);
    let durable = reader.read_token().expect("re-read persisted rotation");
    assert_ne!(durable, baseline, "the refresh link must rotate on disk");
    assert_eq!(durable.access_token, selected.access_token);
    assert_eq!(durable.refresh_token, selected.refresh_token);
    assert_ne!(
        durable.expires_at_ms, selected.expires_at_ms,
        "the fixture must reproduce Codex's lossy expiry round trip"
    );

    let dispatched = routed
        .subscription
        .as_ref()
        .expect("automatic subscription snapshot")
        .for_dispatch()
        .await
        .expect("the durably persisted rotation remains dispatchable");
    assert_eq!(dispatched.token, selected);
    refresh_task.abort();
}

/// A valid cached access token is intentionally newer than the unchanged disk
/// baseline. Revalidation must not mistake that normal cache state for an
/// external credential rotation.
#[tokio::test]
async fn cached_access_with_an_unchanged_disk_baseline_remains_dispatchable() {
    let data = tempdir().unwrap();
    let qwen = tempdir().unwrap();
    fs::write(
        qwen.path().join("oauth_creds.json"),
        json!({
            "access_token": "expired-access",
            "refresh_token": "same-link",
            "expiry_date": 1,
            "account_id": "account-a"
        })
        .to_string(),
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, qwen.path());
    let state = auto_state(vec![reader.clone()], data.path());
    state
        .subscription_cache
        .register_reader(crate::credential_recovery_store::PRIMARY_ACCOUNT, &reader);
    crate::refresh::test_support::seed_cached_token(
        &state.subscription_cache,
        SubscriptionProvider::Qwen,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        crate::subscription::SubscriptionToken {
            access_token: "cached-access".into(),
            refresh_token: Some("same-link".into()),
            expires_at_ms: Some(chrono::Utc::now().timestamp_millis() + 3_600_000),
            account_id: Some("account-a".into()),
            resource_url: None,
        },
    );
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Qwen,
        Some("account-a".into()),
        vec!["account-a-model".into()],
    );

    let routed = route_state_with_subscription(&state, &json!({"model": "account-a-model"}))
        .await
        .expect("the cached account still owns the catalog");
    let selected = routed
        .subscription
        .as_ref()
        .expect("automatic subscription snapshot")
        .for_dispatch()
        .await
        .expect("a valid cached access token remains dispatchable");
    assert_eq!(selected.token.access_token, "cached-access");
}

/// Provider discovery happens before credential work. A held Claude lock must
/// not delay a request for a model advertised only by Codex.
#[tokio::test]
async fn unrelated_provider_lock_does_not_delay_automatic_routing() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    let claude_path = claude.path().join(".credentials.json");
    fs::write(
        &claude_path,
        r#"{"claudeAiOauth":{"accessToken":"claude-access"}}"#,
    )
    .unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-access","account_id":"account-a"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
        ],
        data.path(),
    );
    state.model_catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("account-a".into()),
        vec!["codex-only-model".into()],
    );
    let lock_path = crate::credential_store::lock_path_for(&claude_path);
    let _held = crate::durable_file::lock_exclusive_async(&lock_path, Duration::from_secs(1))
        .await
        .unwrap();

    let routed = tokio::time::timeout(
        Duration::from_secs(1),
        route_state_with_subscription(&state, &json!({"model": "codex-only-model"})),
    )
    .await
    .expect("an unrelated provider lock must not be consulted")
    .expect("Codex owns the requested model");
    assert_eq!(routed.state.upstream_provider, UpstreamProvider::Codex);
}

/// Candidate-first routing must retain the useful catalog detail for a wrong
/// model id without locking or refreshing every configured provider.
#[tokio::test]
async fn an_unknown_model_still_names_the_healthy_advertised_models() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-access","account_id":"account-a"}}"#,
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
        vec!["known-codex-model".into()],
    );

    let Err(error) = route_state_with_subscription(&state, &json!({"model": "wrong-model"})).await
    else {
        panic!("a model absent from every live catalog must be rejected");
    };
    let message = error.to_string();
    assert!(
        message.contains("known-codex-model"),
        "the refusal must retain the existing advertised-model guidance: {message}"
    );
}

#[tokio::test]
async fn public_lock_failure_omits_credential_paths_and_reaches_no_upstream() {
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
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-a","account_id":"account-a"}}"#,
    )
    .unwrap();
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
    assert_eq!(forwarded.load(Ordering::SeqCst), 0);
    stub_task.abort();
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
