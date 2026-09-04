use super::*;
use axum::Router;
use axum::extract::State;
use axum::http::{HeaderMap, Uri};
use axum::routing::get;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tempfile::tempdir;

#[derive(Debug)]
struct ReadOnlyStore(SubscriptionReader);

impl crate::credential_store::CredentialStore for ReadOnlyStore {
    fn reload(&self) -> Option<SubscriptionToken> {
        crate::credential_store::CredentialStore::reload(&self.0)
    }

    fn persist(&self, _token: &SubscriptionToken) -> Result<(), String> {
        Err("primary is read-only".into())
    }

    fn lock_path(&self) -> Option<PathBuf> {
        crate::credential_store::CredentialStore::lock_path(&self.0)
    }

    fn describe(&self) -> String {
        "read-only test store".into()
    }
}

async fn recorded_qwen_catalog() -> (String, Arc<Mutex<Vec<String>>>, tokio::task::JoinHandle<()>) {
    let authorizations = Arc::new(Mutex::new(Vec::new()));
    let captured = Arc::clone(&authorizations);
    let app = Router::new().route(
        "/v1/models",
        get(move |headers: HeaderMap| {
            let captured = Arc::clone(&captured);
            async move {
                captured.lock().unwrap().push(
                    headers
                        .get("authorization")
                        .and_then(|value| value.to_str().ok())
                        .unwrap_or_default()
                        .to_string(),
                );
                axum::Json(serde_json::json!({"data":[{"id":"qwen-live"}]}))
            }
        }),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (address, authorizations, task)
}

fn recovery_token(resource_url: String) -> SubscriptionToken {
    SubscriptionToken {
        access_token: "recovered-access".into(),
        refresh_token: Some("recovered-refresh".into()),
        expires_at_ms: Some(9_999_999_999_999),
        account_id: Some("recovered-account".into()),
        resource_url: Some(resource_url),
    }
}

fn recovery_path(data: &std::path::Path) -> PathBuf {
    crate::credential_recovery_store::credential_lock_path(
        data,
        SubscriptionProvider::Qwen,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
    )
    .with_extension("json")
}

#[test]
fn parses_each_vendor_response_shape() {
    let cases = [
        (
            SubscriptionProvider::Claude,
            serde_json::json!({"data":[{"id":"claude-live"}]}),
            "claude-live",
        ),
        (
            SubscriptionProvider::Codex,
            serde_json::json!({"models":[{"slug":"gpt-live"}]}),
            "gpt-live",
        ),
        (
            SubscriptionProvider::Gemini,
            serde_json::json!({"models":[{"name":"models/gemini-live"}]}),
            "gemini-live",
        ),
        (
            SubscriptionProvider::Qwen,
            serde_json::json!({"data":[{"id":"qwen-live"}]}),
            "qwen-live",
        ),
    ];
    for (provider, body, expected) in cases {
        assert_eq!(parse_catalog(provider, &body).unwrap(), [expected]);
    }
}

#[test]
fn a_valid_empty_catalog_is_an_authoritative_snapshot() {
    for (provider, body) in [
        (
            SubscriptionProvider::Claude,
            serde_json::json!({"data": []}),
        ),
        (
            SubscriptionProvider::Codex,
            serde_json::json!({"models": []}),
        ),
        (
            SubscriptionProvider::Gemini,
            serde_json::json!({"models": []}),
        ),
        (SubscriptionProvider::Qwen, serde_json::json!({"data": []})),
    ] {
        let empty = parse_catalog(provider, &body).expect("valid empty catalog");
        assert!(empty.is_empty());
        let cache = ModelCatalogCache::new();
        cache.record_success(provider, vec!["withdrawn-model".into()]);
        cache.record_success(provider, empty);
        let status = cache.status(provider);
        assert!(status.discovered);
        assert!(status.credential_healthy);
        assert!(status.routable_models().is_empty());
    }
}

#[tokio::test]
async fn codex_fetch_uses_live_response_and_required_auth_metadata() {
    async fn handler(
        State(seen): State<Arc<RwLock<bool>>>,
        headers: HeaderMap,
        uri: Uri,
    ) -> axum::Json<Value> {
        let valid = headers.get("authorization").and_then(|v| v.to_str().ok())
            == Some("Bearer live-token")
            && headers
                .get("chatgpt-account-id")
                .and_then(|v| v.to_str().ok())
                == Some("account-1")
            && uri
                .query()
                .is_some_and(|query| query.contains("client_version="));
        *seen.write().unwrap() = valid;
        axum::Json(serde_json::json!({"models":[{"slug":"gpt-5.6-sol"}]}))
    }

    let seen = Arc::new(RwLock::new(false));
    let app = Router::new()
        .route("/models", get(handler))
        .with_state(Arc::clone(&seen));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let token = SubscriptionToken {
        access_token: "live-token".to_string(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("account-1".to_string()),
        resource_url: None,
    };
    let models = fetch_provider_catalog(
        &reqwest::Client::new(),
        SubscriptionProvider::Codex,
        &token,
        Some(&format!("http://{address}")),
    )
    .await
    .unwrap();
    assert_eq!(models, ["gpt-5.6-sol"]);
    assert!(*seen.read().unwrap());
}

#[tokio::test]
async fn catalog_refresh_uses_an_in_memory_refreshed_token() {
    async fn handler(headers: HeaderMap) -> axum::Json<Value> {
        assert_eq!(
            headers
                .get("authorization")
                .and_then(|value| value.to_str().ok()),
            Some("Bearer fresh-token")
        );
        axum::Json(serde_json::json!({"data":[{"id":"qwen-live"}]}))
    }

    let app = Router::new().route("/v1/models", get(handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let home = tempdir().unwrap();
    fs::write(
        home.path().join("oauth_creds.json"),
        r#"{"access_token":"expired","refresh_token":"refresh","expiry_date":1000}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Qwen,
        home.path(),
    )];
    let token_cache = crate::refresh::TokenCache::new();
    token_cache.store_refreshed(
        SubscriptionProvider::Qwen,
        "primary",
        SubscriptionToken {
            access_token: "fresh-token".into(),
            refresh_token: Some("refresh".into()),
            expires_at_ms: Some(chrono::Utc::now().timestamp_millis() + 60_000),
            account_id: None,
            resource_url: Some(format!("http://{address}")),
        },
    );
    token_cache.record_credential_rejected(SubscriptionProvider::Qwen);
    let catalogs = ModelCatalogCache::new();

    refresh_catalogs(&reqwest::Client::new(), &readers, &token_cache, &catalogs).await;

    assert_eq!(catalogs.models(SubscriptionProvider::Qwen), ["qwen-live"]);
    assert!(catalogs.status(SubscriptionProvider::Qwen).discovered);
    assert_eq!(
        token_cache.evidence(SubscriptionProvider::Qwen),
        Some(crate::refresh::CredentialEvidence::Working)
    );
}

#[tokio::test]
async fn catalog_refresh_prefers_recovery_over_an_unexpired_primary() {
    let (resource_url, authorizations, task) = recorded_qwen_catalog().await;
    let home = tempdir().unwrap();
    let data = tempdir().unwrap();
    fs::write(
        home.path().join("oauth_creds.json"),
        serde_json::json!({
            "access_token": "stale-primary",
            "refresh_token": "stale-refresh",
            "expiry_date": 9_999_999_999_999_i64,
            "account_id": "stale-account",
            "resource_url": resource_url,
        })
        .to_string(),
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, home.path());
    let store = Arc::new(
        crate::credential_recovery_store::RecoverableCredentialStore::new(
            SubscriptionProvider::Qwen,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            Arc::new(ReadOnlyStore(reader.clone())),
            data.path(),
        ),
    );
    crate::credential_store::CredentialStore::persist(
        store.as_ref(),
        &recovery_token(resource_url),
    )
    .expect("seed durable recovery");
    let token_cache = crate::refresh::TokenCache::new();
    token_cache.register_store(
        SubscriptionProvider::Qwen,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        store,
    );
    let catalogs = ModelCatalogCache::new();

    refresh_catalogs(&reqwest::Client::new(), &[reader], &token_cache, &catalogs).await;

    assert_eq!(
        authorizations.lock().unwrap().as_slice(),
        ["Bearer recovered-access"]
    );
    assert_eq!(catalogs.models(SubscriptionProvider::Qwen), ["qwen-live"]);
    task.abort();
}

#[tokio::test]
async fn catalog_refresh_uses_a_recovery_only_credential() {
    let (resource_url, authorizations, task) = recorded_qwen_catalog().await;
    let home = tempdir().unwrap();
    let data = tempdir().unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, home.path());
    let store = Arc::new(
        crate::credential_recovery_store::RecoverableCredentialStore::new(
            SubscriptionProvider::Qwen,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            Arc::new(ReadOnlyStore(reader.clone())),
            data.path(),
        ),
    );
    crate::credential_store::CredentialStore::persist(
        store.as_ref(),
        &recovery_token(resource_url),
    )
    .expect("seed recovery without a primary");
    let token_cache = crate::refresh::TokenCache::new();
    token_cache.register_store(
        SubscriptionProvider::Qwen,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        store,
    );
    let catalogs = ModelCatalogCache::new();

    refresh_catalogs(&reqwest::Client::new(), &[reader], &token_cache, &catalogs).await;

    assert_eq!(
        authorizations.lock().unwrap().as_slice(),
        ["Bearer recovered-access"]
    );
    assert_eq!(catalogs.models(SubscriptionProvider::Qwen), ["qwen-live"]);
    task.abort();
}

#[tokio::test]
async fn malformed_recovery_fails_closed_before_catalog_access() {
    let (resource_url, authorizations, task) = recorded_qwen_catalog().await;
    let home = tempdir().unwrap();
    let data = tempdir().unwrap();
    fs::write(
        home.path().join("oauth_creds.json"),
        serde_json::json!({
            "access_token": "stale-primary",
            "refresh_token": "stale-refresh",
            "expiry_date": 9_999_999_999_999_i64,
            "resource_url": resource_url,
        })
        .to_string(),
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, home.path());
    let store = Arc::new(
        crate::credential_recovery_store::RecoverableCredentialStore::new(
            SubscriptionProvider::Qwen,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            Arc::new(ReadOnlyStore(reader.clone())),
            data.path(),
        ),
    );
    crate::credential_store::CredentialStore::persist(
        store.as_ref(),
        &recovery_token(resource_url),
    )
    .unwrap();
    fs::write(
        recovery_path(data.path()),
        br#"{"account":"sensitive@example.test","path":"/secret/credential""#,
    )
    .unwrap();
    let token_cache = crate::refresh::TokenCache::new();
    token_cache.register_store(
        SubscriptionProvider::Qwen,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        store,
    );
    let catalogs = ModelCatalogCache::new();

    refresh_catalogs(&reqwest::Client::new(), &[reader], &token_cache, &catalogs).await;

    assert!(authorizations.lock().unwrap().is_empty());
    let error = catalogs
        .status(SubscriptionProvider::Qwen)
        .last_error
        .expect("storage uncertainty is recorded");
    assert_eq!(error, "the qwen credential store is unusable");
    assert!(!error.contains("sensitive@example.test"));
    assert!(!error.contains("/secret/credential"));
    assert!(!error.contains(data.path().to_string_lossy().as_ref()));
    task.abort();
}

#[tokio::test]
async fn unreadable_recovery_fails_closed_before_catalog_access() {
    let (resource_url, authorizations, task) = recorded_qwen_catalog().await;
    let home = tempdir().unwrap();
    let data = tempdir().unwrap();
    fs::write(
        home.path().join("oauth_creds.json"),
        serde_json::json!({
            "access_token": "stale-primary",
            "refresh_token": "stale-refresh",
            "expiry_date": 9_999_999_999_999_i64,
            "resource_url": resource_url,
        })
        .to_string(),
    )
    .unwrap();
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, home.path());
    let store = Arc::new(
        crate::credential_recovery_store::RecoverableCredentialStore::new(
            SubscriptionProvider::Qwen,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            Arc::new(ReadOnlyStore(reader.clone())),
            data.path(),
        ),
    );
    crate::credential_store::CredentialStore::persist(
        store.as_ref(),
        &recovery_token(resource_url),
    )
    .unwrap();
    let recovery = recovery_path(data.path());
    fs::remove_file(&recovery).unwrap();
    fs::create_dir(&recovery).unwrap();
    let token_cache = crate::refresh::TokenCache::new();
    token_cache.register_store(
        SubscriptionProvider::Qwen,
        crate::credential_recovery_store::PRIMARY_ACCOUNT,
        store,
    );
    let catalogs = ModelCatalogCache::new();

    refresh_catalogs(&reqwest::Client::new(), &[reader], &token_cache, &catalogs).await;

    assert!(authorizations.lock().unwrap().is_empty());
    assert_eq!(
        catalogs.status(SubscriptionProvider::Qwen).last_error,
        Some("the qwen credential store is unusable".into())
    );
    task.abort();
}

/// A stamped-expired credential is still probed. Its last known catalog is
/// retained for diagnostics, while rejection evidence prevents it from
/// being advertised or routed.
#[tokio::test]
async fn expired_credential_is_still_probed_and_keeps_its_cached_catalog() {
    async fn handler() -> (axum::http::StatusCode, &'static str) {
        (axum::http::StatusCode::UNAUTHORIZED, "expired token")
    }

    let app = Router::new().route("/v1/models", get(handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let home = tempdir().unwrap();
    fs::write(
        home.path().join("oauth_creds.json"),
        format!(
            r#"{{"access_token":"expired","expiry_date":1000,"resource_url":"http://{address}"}}"#
        ),
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Qwen,
        home.path(),
    )];
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(SubscriptionProvider::Qwen, vec!["qwen-known".to_string()]);
    let token_cache = crate::refresh::TokenCache::new();

    refresh_catalogs(&reqwest::Client::new(), &readers, &token_cache, &catalogs).await;

    let status = catalogs.status(SubscriptionProvider::Qwen);
    // The fetch was actually attempted (the 401 proves the request went out)
    // rather than short-circuited on `expiresAt`...
    let error = status.last_error.expect("catalog fetch was attempted");
    assert!(error.starts_with("HTTP 401"), "{error}");
    assert!(error.contains("stamped expired"), "{error}");
    // The last known catalog survives internally, but the shared rejection
    // evidence removes it from routing and public catalog responses.
    assert_eq!(status.models, ["qwen-known"]);
    assert_eq!(
        token_cache.evidence(SubscriptionProvider::Qwen),
        Some(crate::refresh::CredentialEvidence::Rejected)
    );
}

#[tokio::test]
async fn catalog_auth_rejection_is_recorded_as_credential_evidence() {
    async fn handler() -> (axum::http::StatusCode, &'static str) {
        (axum::http::StatusCode::UNAUTHORIZED, "revoked token")
    }

    let app = Router::new().route("/v1/models", get(handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let home = tempdir().unwrap();
    fs::write(
        home.path().join("oauth_creds.json"),
        format!(r#"{{"access_token":"revoked","resource_url":"http://{address}"}}"#),
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Qwen,
        home.path(),
    )];
    let token_cache = crate::refresh::TokenCache::new();

    refresh_catalogs(
        &reqwest::Client::new(),
        &readers,
        &token_cache,
        &ModelCatalogCache::new(),
    )
    .await;

    assert_eq!(
        token_cache.evidence(SubscriptionProvider::Qwen),
        Some(crate::refresh::CredentialEvidence::Rejected)
    );
}

/// A 403 that names a permission failure is not a verdict about the
/// credential: nothing is refreshed, the credential keeps its evidence, and
/// the token on disk is untouched and retried on the next tick (issue #319).
#[tokio::test]
async fn a_permission_refusal_does_not_reject_or_refresh_the_credential() {
    async fn handler() -> (axum::http::StatusCode, &'static str) {
        (
            axum::http::StatusCode::FORBIDDEN,
            r#"{"type":"error","error":{"type":"permission_error","message":"OAuth authentication is currently not allowed for this organization.","details":{"error_code":"oauth_not_allowed_for_organization"}}}"#,
        )
    }

    let app = Router::new().route("/v1/models", get(handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    let home = tempdir().unwrap();
    let credential = home.path().join("oauth_creds.json");
    let original = format!(r#"{{"access_token":"still-good","resource_url":"http://{address}"}}"#);
    fs::write(&credential, &original).unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Qwen,
        home.path(),
    )];
    let token_cache = crate::refresh::TokenCache::new();
    let cache = ModelCatalogCache::new();
    // A subscription that was serving happily until the refusal arrived:
    // this is the state the incident started from (issue #319).
    cache.record_success(SubscriptionProvider::Qwen, vec!["qwen-live".to_string()]);

    refresh_catalogs(&reqwest::Client::new(), &readers, &token_cache, &cache).await;

    assert_eq!(
        token_cache.evidence(SubscriptionProvider::Qwen),
        None,
        "a permission refusal says nothing about the credential"
    );
    assert_eq!(
        fs::read_to_string(&credential).unwrap(),
        original,
        "the stored token must be left for the next tick to retry"
    );
    let status = cache.status(SubscriptionProvider::Qwen);
    assert!(
        status.credential_healthy,
        "a permission refusal must not mark a working credential unhealthy"
    );
    assert_eq!(
        status.routable_models(),
        ["qwen-live"],
        "the subscription keeps serving; the refusal was not about it"
    );
    assert!(status.last_error.is_some(), "the refusal is still reported");
}

/// The same status code with a body that is *not* a permission error stays
/// a credential rejection: the narrowing must not swallow a real 403.
#[test]
fn an_unexplained_403_is_still_a_credential_rejection() {
    assert!(is_credential_rejection("HTTP 403 Forbidden: token revoked"));
    assert!(!is_permission_refusal("HTTP 403 Forbidden: token revoked"));
    assert!(is_credential_rejection("HTTP 401 Unauthorized: revoked"));
    // A 401 is about the credential whatever its body says.
    assert!(!is_permission_refusal(
        r#"HTTP 401 Unauthorized: {"error":{"details":{"error_code":"oauth_not_allowed_for_organization"}}}"#
    ));
    // A different 403 error code is not in the permission set.
    assert!(is_credential_rejection(
        r#"HTTP 403 Forbidden: {"error":{"details":{"error_code":"some_other_code"}}}"#
    ));
}

#[test]
fn the_permission_error_code_is_read_from_where_the_vendor_nests_it() {
    assert_eq!(
        resource_error_code(
            r#"{"error":{"type":"permission_error","details":{"error_code":"oauth_not_allowed_for_organization"}}}"#
        )
        .as_deref(),
        Some("oauth_not_allowed_for_organization"),
        "the code lives under error.details.error_code, not error.type"
    );
    assert_eq!(
        resource_error_code(r#"{"error":{"error_code":"flat"}}"#).as_deref(),
        Some("flat")
    );
    assert_eq!(resource_error_code("not json").as_deref(), None);
    assert_eq!(resource_error_code(r#"{"error":"bare"}"#).as_deref(), None);
}

/// A dead subscription restated its consequence 146 times over twelve
/// hours. The condition stays visible in `last_error`; the log records the
/// change, not the steady state (issue #321).
#[test]
fn an_unchanged_failure_is_not_restated() {
    let cache = ModelCatalogCache::new();
    cache.record_failure(SubscriptionProvider::Claude, "HTTP 401 revoked", true);
    // The state is what a monitor reads, and it does not decay.
    assert_eq!(
        cache
            .status(SubscriptionProvider::Claude)
            .last_error
            .as_deref(),
        Some("HTTP 401 revoked")
    );
    // A repeat is the same string, which is what the emitter tests against.
    assert_eq!(
        cache
            .status(SubscriptionProvider::Claude)
            .last_error
            .as_deref(),
        Some("HTTP 401 revoked"),
        "a repeat is recognisable as one"
    );
    // A genuinely different failure is not suppressed.
    cache.record_failure(SubscriptionProvider::Claude, "HTTP 500 upstream", false);
    assert_eq!(
        cache
            .status(SubscriptionProvider::Claude)
            .last_error
            .as_deref(),
        Some("HTTP 500 upstream"),
        "a new condition replaces the old one and is reported"
    );
}

#[test]
fn failed_refresh_preserves_last_known_models() {
    let cache = ModelCatalogCache::new();
    cache.record_success(SubscriptionProvider::Codex, vec!["gpt-live".to_string()]);
    cache.record_failure(SubscriptionProvider::Codex, "vendor unavailable", false);
    let status = cache.status(SubscriptionProvider::Codex);
    // A transient failure keeps the catalog usable ...
    assert_eq!(status.models, ["gpt-live"]);
    assert_eq!(status.last_error.as_deref(), Some("vendor unavailable"));
    assert!(status.discovered);
    assert_eq!(status.routable_models(), ["gpt-live"]);

    // ... but a credential rejection stops it being routed while keeping it
    // visible to administrators (issue #192).
    cache.record_failure(SubscriptionProvider::Codex, "HTTP 401", true);
    let status = cache.status(SubscriptionProvider::Codex);
    assert_eq!(status.models, ["gpt-live"], "retained for diagnostics");
    assert!(status.routable_models().is_empty(), "not routable");
    assert!(status.is_degraded());
}

#[test]
fn account_catalogs_are_independent_and_provider_listing_is_their_union() {
    let cache = ModelCatalogCache::new();
    cache.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("acct-primary".to_string()),
        vec!["gpt-primary".to_string()],
    );
    cache.record_success_for_account(
        SubscriptionProvider::Codex,
        "account-1",
        Some("acct-secondary".to_string()),
        vec!["gpt-secondary".to_string()],
    );

    assert_eq!(
        cache.models(SubscriptionProvider::Codex),
        ["gpt-primary", "gpt-secondary"]
    );
    assert_eq!(
        cache
            .status_for(SubscriptionProvider::Codex, "primary")
            .account
            .as_deref(),
        Some("acct-primary")
    );
    assert_eq!(
        cache
            .status_for(SubscriptionProvider::Codex, "account-1")
            .account
            .as_deref(),
        Some("acct-secondary")
    );

    cache.record_failure_for_account(
        SubscriptionProvider::Codex,
        "account-1",
        "HTTP 401 secondary rejected",
        true,
    );
    assert_eq!(cache.models(SubscriptionProvider::Codex), ["gpt-primary"]);
    assert!(
        cache
            .status_for(SubscriptionProvider::Codex, "primary")
            .credential_healthy
    );
}

#[tokio::test]
async fn paginated_catalog_preserves_unknown_metadata_and_source_order() {
    use axum::extract::Query;
    use std::collections::HashMap;

    async fn handler(
        State(seen): State<Arc<Mutex<Vec<Option<String>>>>>,
        Query(query): Query<HashMap<String, String>>,
    ) -> axum::Json<Value> {
        let cursor = query.get("after_id").cloned();
        seen.lock().unwrap().push(cursor.clone());
        if cursor.is_none() {
            axum::Json(serde_json::json!({
                "data": [{
                    "id": "future-saffron-91",
                    "display_name": "Saffron 91",
                    "unknown_future_field": {"tier": 7}
                }],
                "has_more": true,
                "last_id": "future-saffron-91"
            }))
        } else {
            axum::Json(serde_json::json!({
                "data": [{
                    "id": "future-cobalt-12",
                    "display_name": "Cobalt 12",
                    "unknown_future_field": ["kept"]
                }],
                "has_more": false
            }))
        }
    }

    let seen = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .route("/v1/models", get(handler))
        .with_state(Arc::clone(&seen));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let token = SubscriptionToken {
        access_token: "live-token".to_string(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("account-future".to_string()),
        resource_url: None,
    };

    let records = fetch_provider_catalog_records(
        &reqwest::Client::new(),
        SubscriptionProvider::Claude,
        &token,
        Some(&format!("http://{address}")),
    )
    .await
    .expect("all catalog pages");

    assert_eq!(
        records
            .iter()
            .map(|record| record.canonical_id.as_str())
            .collect::<Vec<_>>(),
        ["future-saffron-91", "future-cobalt-12"]
    );
    assert_eq!(records[0].source_order, 0);
    assert_eq!(records[1].source_order, 1);
    assert_eq!(
        records[0].raw["unknown_future_field"],
        serde_json::json!({"tier": 7})
    );
    assert_eq!(
        records[1].raw["unknown_future_field"],
        serde_json::json!(["kept"])
    );
    assert_eq!(
        seen.lock().unwrap().as_slice(),
        &[None, Some("future-saffron-91".to_string())]
    );

    let cache = ModelCatalogCache::new();
    cache.record_records_for_account(
        SubscriptionProvider::Claude,
        "primary",
        Some("account-future".into()),
        records,
    );
    let projected = crate::model_routing::model_catalog(&[SubscriptionProvider::Claude], &cache);
    assert_eq!(projected["data"][0]["id"], "future-saffron-91");
    assert_eq!(projected["data"][1]["id"], "future-cobalt-12");
    assert_eq!(
        projected["data"][0]["unknown_future_field"],
        serde_json::json!({"tier": 7})
    );
    assert_eq!(projected["data"][0]["canonical_id"], "future-saffron-91");
    assert_eq!(projected["data"][0]["provider"], "claude");
}

#[tokio::test]
async fn repeated_catalog_cursor_fails_closed() {
    async fn handler() -> axum::Json<Value> {
        axum::Json(serde_json::json!({
            "data": [{"id": "future-loop-1"}],
            "has_more": true,
            "last_id": "future-loop-1"
        }))
    }

    let app = Router::new().route("/v1/models", get(handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let token = SubscriptionToken {
        access_token: "live-token".to_string(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("account-loop".to_string()),
        resource_url: None,
    };

    let error = fetch_provider_catalog_records(
        &reqwest::Client::new(),
        SubscriptionProvider::Claude,
        &token,
        Some(&format!("http://{address}")),
    )
    .await
    .expect_err("a repeated cursor must not spin or publish a partial catalog");
    assert!(error.contains("repeated pagination cursor"), "{error}");
}

#[tokio::test]
async fn gemini_next_page_tokens_are_followed_without_losing_raw_records() {
    use axum::extract::Query;
    use std::collections::HashMap;

    async fn handler(Query(query): Query<HashMap<String, String>>) -> axum::Json<Value> {
        if query.contains_key("pageToken") {
            axum::Json(serde_json::json!({
                "models": [{
                    "name": "models/future-amber-18",
                    "supportedGenerationMethods": ["generateContent"],
                    "newCapability": {"window": 654_321}
                }]
            }))
        } else {
            axum::Json(serde_json::json!({
                "models": [{
                    "name": "models/future-jade-17",
                    "supportedGenerationMethods": ["generateContent"],
                    "newCapability": {"window": 123_456}
                }],
                "nextPageToken": "future-page-2"
            }))
        }
    }

    let app = Router::new().route("/v1beta/models", get(handler));
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    let token = SubscriptionToken {
        access_token: "live-google-token".to_string(),
        refresh_token: None,
        expires_at_ms: None,
        account_id: Some("google-account".to_string()),
        resource_url: None,
    };

    let records = fetch_provider_catalog_records(
        &reqwest::Client::new(),
        SubscriptionProvider::Gemini,
        &token,
        Some(&format!("http://{address}")),
    )
    .await
    .expect("all Google pages");
    assert_eq!(
        records
            .iter()
            .map(|record| record.canonical_id.as_str())
            .collect::<Vec<_>>(),
        ["future-jade-17", "future-amber-18"]
    );
    assert_eq!(records[0].raw["newCapability"]["window"], 123_456);
    assert_eq!(records[1].source_order, 1);
}

#[test]
fn colliding_live_ids_are_rejected_without_qualified_aliases() {
    let cache = ModelCatalogCache::new();
    cache.record_success(
        SubscriptionProvider::Claude,
        vec!["future-shared-77".into()],
    );
    cache.record_success(SubscriptionProvider::Codex, vec!["future-shared-77".into()]);

    let projected = crate::model_routing::model_catalog(
        &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
        &cache,
    );
    let has_id = projected["data"]
        .as_array()
        .unwrap()
        .iter()
        .any(|entry| entry["id"].as_str().is_some());
    assert!(!has_id);
    assert_eq!(
        crate::model_routing::provider_for_model("claude/future-shared-77", &cache),
        None
    );
    assert_eq!(
        crate::model_routing::provider_for_model("codex/future-shared-77", &cache),
        None
    );
    assert_eq!(
        crate::model_routing::provider_for_model("future-shared-77", &cache),
        None
    );
}

#[test]
fn successful_catalogs_persist_losslessly_but_restart_fail_closed() {
    let data = tempdir().expect("catalog data");
    let cache = ModelCatalogCache::persistent(data.path());
    let mut raw = serde_json::Map::new();
    raw.insert("id".into(), Value::String("future-persisted-44".into()));
    raw.insert(
        "unknown_after_restart".into(),
        serde_json::json!({"nested": [1, 2, 3]}),
    );
    cache.record_records_for_account(
        SubscriptionProvider::Claude,
        "primary",
        Some("account-persisted".into()),
        vec![CatalogRecord {
            provider: SubscriptionProvider::Claude,
            account: "account-persisted".into(),
            canonical_id: "future-persisted-44".into(),
            raw,
            source_order: 7,
            fetched_at: 123,
            health_generation: "generation-persisted".into(),
            protocols: provider_protocols(SubscriptionProvider::Claude),
        }],
    );
    drop(cache);

    let reopened = ModelCatalogCache::persistent(data.path());
    let status = reopened.status(SubscriptionProvider::Claude);
    assert!(status.discovered, "the diagnostic catalog survives restart");
    assert_eq!(status.account.as_deref(), Some("account-persisted"));
    assert_eq!(status.records[0].source_order, 7);
    assert_eq!(
        status.records[0].raw["unknown_after_restart"],
        serde_json::json!({"nested": [1, 2, 3]})
    );
    assert!(
        status.routable_records().is_empty(),
        "persisted models remain unavailable until this process authenticates them"
    );
}
