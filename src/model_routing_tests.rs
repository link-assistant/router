//! Unit tests for [`crate::model_routing`].

use super::*;
use axum::body::Body;
use axum::extract::Query;
use axum::http::{HeaderMap, Request};
use axum::routing::get;
use http_body_util::BodyExt;
use std::fs;
use std::sync::Arc;
use tempfile::tempdir;
use tower::ServiceExt;

#[allow(clippy::redundant_pub_crate)]
pub(crate) fn auto_state(readers: Vec<SubscriptionReader>, data_dir: &std::path::Path) -> AppState {
    AppState {
        client: reqwest::Client::new(),
        token_manager: crate::token::TokenManager::new("test-secret"),
        oauth_provider: crate::oauth::OAuthProvider::new(&data_dir.to_string_lossy()),
        account_router: None,
        subscription_reader: None,
        subscription_base_url: None,
        subscription_readers: readers,
        model_catalogs: Arc::new(ModelCatalogCache::new()),
        subscription_cache: Arc::new(crate::refresh::TokenCache::new()),
        upstream_base_url: "https://api.anthropic.com".to_string(),
        upstream_provider: UpstreamProvider::Auto,
        gonka: None,
        bridge_model: None,
        bridge_model_policy: crate::bridge_selection::BridgeModelPolicy::default(),
        crater: None,
        openai_compatible: crate::config::default_openai_compatible_config(),
        provider_store: crate::providers::ProviderStore::open(data_dir, "test-secret").unwrap(),
        logger: log_lazy::LogLazy::new(),
        admin: Arc::new(crate::admin::AdminClaim::load(
            None,
            data_dir,
            std::time::Duration::from_secs(60),
        )),
        admin_key: None,
        allow_anonymous_admin: false,
        metrics: Arc::new(crate::metrics::Metrics::default()),
        audit: Arc::new(crate::audit::AuditLog::to_path(None)),
        request_log: Arc::new(crate::request_log::RequestLog::new(
            data_dir.join("requests"),
            1024 * 1024,
        )),
        activitypub_actor_base_url: "https://router.example".to_string(),
        activitypub_public_key_pem: crate::config::default_activitypub_public_key_pem(),
        mpp: crate::config::default_mpp_config(),
        login_manager: crate::login::LoginManager::new(crate::login::LoginConfig::default()),
        github: crate::github_proxy::GitHubProxyConfig::default(),
        max_proxy_request_bytes: crate::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
    }
}

#[allow(clippy::redundant_pub_crate)]
pub(crate) fn bound_client_token(
    state: &AppState,
    client: crate::clients::ClientKind,
    account: Option<&str>,
) -> String {
    let principal = account.unwrap_or(crate::credential_recovery_store::PRIMARY_ACCOUNT);
    state
        .token_manager
        .issue_with_id(&crate::token::IssueRequest {
            ttl_hours: 1,
            label: "fixture client",
            account: Some(principal),
            max_requests: None,
            max_tokens: None,
            rate_limit_per_minute: None,
            scope: "",
            github_repos: Vec::new(),
            sliding_window_seconds: None,
            client_kind: Some(client.canonical_name()),
            principal_id: Some(principal),
        })
        .unwrap()
        .0
}

pub(super) fn opencode_headers(state: &AppState, account: Option<&str>) -> HeaderMap {
    let token = bound_client_token(state, crate::clients::ClientKind::Opencode, account);
    let mut headers = HeaderMap::new();
    headers.insert("authorization", format!("Bearer {token}").parse().unwrap());
    headers.insert("user-agent", "opencode/test-fixture".parse().unwrap());
    headers.insert("x-session-id", "test-session".parse().unwrap());
    headers
}

/// Only live-discovered models are advertised, tagged with their real
/// owner. An undiscovered provider contributes nothing and is reported as
/// degraded rather than filled in from source (issue #192).
#[test]
fn catalog_unions_only_live_discovered_models() {
    let catalogs = ModelCatalogCache::new();

    // Before any discovery the union is empty and both providers degraded.
    let empty = model_catalog(
        &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
        &catalogs,
    );
    assert_eq!(empty["data"], json!([]));
    assert_eq!(empty["using_fallback"], false);
    assert_eq!(empty["degraded_providers"], json!(["claude", "codex"]));
    assert_eq!(empty["healthy_providers"], json!([]));

    // Synthetic ids: no real vendor name appears anywhere in this test.
    catalogs.record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    catalogs.record_success(SubscriptionProvider::Codex, vec!["borealis-9-ultra".into()]);
    let catalog = model_catalog(
        &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
        &catalogs,
    );
    let data = catalog["data"].as_array().unwrap();
    assert!(
        data.iter()
            .any(|m| m["id"] == "aurora-2-base" && m["owned_by"] == "anthropic")
    );
    assert!(
        data.iter()
            .any(|m| m["id"] == "borealis-9-ultra" && m["owned_by"] == "openai")
    );
    assert_eq!(catalog["degraded_providers"], json!([]));
    assert_eq!(catalog["healthy_providers"], json!(["claude", "codex"]));

    let unavailable = model_catalog(&[], &catalogs);
    assert_eq!(unavailable["data"], json!([]));
    assert_eq!(unavailable["healthy_providers"], json!([]));
}

#[test]
fn account_catalog_union_reports_provider_healthy_when_any_account_is_healthy() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_failure_for_account(
        SubscriptionProvider::Codex,
        "primary",
        "primary catalog failed",
        true,
    );
    catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "account-1",
        Some("account-secondary".into()),
        vec!["secondary-model".into()],
    );

    let catalog = model_catalog(&[SubscriptionProvider::Codex], &catalogs);

    assert_eq!(catalog["healthy_providers"], json!(["codex"]));
    assert_eq!(catalog["degraded_providers"], json!([]));
    assert_eq!(catalog["data"][0]["id"], "secondary-model");
}

#[tokio::test]
async fn models_reports_a_rejected_provider_as_degraded_rather_than_omitting_it() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"revoked"}}"#,
    )
    .unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"healthy"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
        ],
        data.path(),
    );
    // Claude has a discovered catalog; the test is about its *credential*
    // being rejected, not about the catalog being absent.
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);
    state
        .provider_store
        .set_subscription_entitlement_policy(
            crate::client_policy::SubscriptionEntitlementPolicy::parse(["claude:codex"]).unwrap(),
        )
        .unwrap();
    let client_token = bound_client_token(&state, crate::clients::ClientKind::ClaudeCode, None);
    let app = axum::Router::new()
        .route("/api/services/anthropic/v1/models", get(models))
        .with_state(state.clone());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/api/services/anthropic/v1/models")
                .header("x-api-key", client_token)
                .header("x-link-assistant-client", "claude")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let catalog: Value = serde_json::from_slice(&body).unwrap();

    // Codex has discovered nothing in this test, so it is starting and appears
    // in neither verdict list. It contributes no models until discovery.
    assert_eq!(catalog["healthy_providers"], json!([]));
    // Claude is degraded, and that is the point of issue #318: a revoked
    // subscription used to vanish from `data` with `degraded_providers` left
    // empty, so a monitor could not tell it from a provider that was never
    // configured on this deployment. It is now named, with a reason.
    assert_eq!(catalog["degraded_providers"], json!(["claude"]));
    assert!(
        catalog["degraded_reasons"]["claude"]
            .as_str()
            .unwrap_or_default()
            .contains("rejected upstream"),
        "a degraded provider must say why: {}",
        catalog["degraded_reasons"]
    );
    // The provider is the key, so the value carries the verdict and nothing
    // that identifies a credential: `/v1/models` answers any client token.
    assert!(
        !catalog["degraded_reasons"]["claude"]
            .as_str()
            .unwrap_or_default()
            .contains('/'),
        "a client must not be told where the credential lives: {}",
        catalog["degraded_reasons"]
    );
    assert!(
        catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .all(|model| model["id"] != "aurora-2-base"),
        "a revoked subscription still contributes no models"
    );
    assert!(
        catalog["data"]
            .as_array()
            .unwrap()
            .iter()
            .all(|model| model["owned_by"] == "openai")
    );

    let error = route_state(&state, &json!({"model": "aurora-2-base"}))
        .await
        .err()
        .expect("rejected Claude credential should not be routable");
    assert!(error.to_string().contains("no healthy claude credential"));
}

#[tokio::test]
async fn model_catalog_routes_require_a_valid_client_token() {
    let data = tempdir().unwrap();
    let state = auto_state(Vec::new(), data.path());
    let valid_token = state.token_manager.issue_token(1, "catalog test").unwrap();
    let app = axum::Router::new()
        .route("/api/services/anthropic/v1/models", get(models))
        .route("/api/services/codex/v1/models", get(models))
        .with_state(state);

    for path in [
        "/api/services/anthropic/v1/models",
        "/api/services/codex/v1/models",
    ] {
        for authorization in [None, Some("Bearer la_sk_garbage")] {
            let mut request = Request::builder().uri(path);
            if let Some(value) = authorization {
                request = request.header("authorization", value);
            }
            let response = app
                .clone()
                .oneshot(request.body(Body::empty()).unwrap())
                .await
                .unwrap();
            assert_eq!(
                response.status(),
                StatusCode::UNAUTHORIZED,
                "{path} accepted {authorization:?}"
            );
        }

        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri(path)
                    .header("authorization", format!("Bearer {valid_token}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(
            response.status(),
            StatusCode::OK,
            "{path} rejected a valid token"
        );
    }
}

#[tokio::test]
async fn automatic_messages_authenticate_before_model_routing() {
    let data = tempdir().unwrap();
    let state = auto_state(Vec::new(), data.path());
    let app = axum::Router::new()
        .route(
            "/v1/messages",
            axum::routing::post(crate::proxy::proxy_handler),
        )
        .with_state(state);
    let bodies = [
        json!({"model": "claude-opus-4-7", "max_tokens": 1, "messages": []}),
        json!({"model": "totally-made-up-xyz", "max_tokens": 1, "messages": []}),
        json!({"max_tokens": 1}),
    ];

    for authorization in [None, Some("Bearer la_sk_invalid-before-routing")] {
        let mut responses = Vec::new();
        for body in &bodies {
            let mut request = Request::builder()
                .method("POST")
                .uri("/v1/messages")
                .header("content-type", "application/json");
            if let Some(value) = authorization {
                request = request.header("authorization", value);
            }
            let response = app
                .clone()
                .oneshot(request.body(Body::from(body.to_string())).unwrap())
                .await
                .unwrap();
            assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
            responses.push(response.into_body().collect().await.unwrap().to_bytes());
        }
        assert!(responses.windows(2).all(|pair| pair[0] == pair[1]));
    }
}

#[tokio::test]
async fn malformed_client_tokens_return_a_fixed_message() {
    let data = tempdir().unwrap();
    let state = auto_state(Vec::new(), data.path());
    let app = axum::Router::new()
        .route("/api/services/anthropic/v1/models", get(models))
        .with_state(state);
    let malformed = ["wrong-prefix", "la_sk_zzzzQQQrandom.stuff.here"];
    let mut responses = Vec::new();

    for token in malformed {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/api/services/anthropic/v1/models")
                    .header("authorization", format!("Bearer {token}"))
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::UNAUTHORIZED);
        responses.push(response.into_body().collect().await.unwrap().to_bytes());
    }
    assert!(responses.windows(2).all(|pair| pair[0] == pair[1]));
    let payload: Value = serde_json::from_slice(&responses[0]).unwrap();
    assert_eq!(payload["error"]["message"], "invalid token");
}

/// Routing follows the live catalog that actually advertises an id, with
/// entirely synthetic names (issue #192).
#[test]
fn model_ids_route_to_the_subscription_that_serves_them() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(SubscriptionProvider::Codex, vec!["borealis-9-ultra".into()]);
    catalogs.record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    catalogs.record_success(SubscriptionProvider::Gemini, vec!["nimbus-3-flash".into()]);

    assert_eq!(
        provider_for_model("borealis-9-ultra", &catalogs),
        Some(SubscriptionProvider::Codex)
    );
    assert_eq!(
        provider_for_model("aurora-2-base", &catalogs),
        Some(SubscriptionProvider::Claude)
    );
    assert_eq!(
        provider_for_model("nimbus-3-flash", &catalogs),
        Some(SubscriptionProvider::Gemini)
    );
    // A name no catalog advertises routes nowhere.
    assert_eq!(provider_for_model("never-advertised", &catalogs), None);

    // A model its catalog advertises routes only while that provider is
    // among the healthy ones.
    assert_eq!(
        available_provider_for_model(
            "borealis-9-ultra",
            &[SubscriptionProvider::Codex],
            &catalogs,
        ),
        Ok(SubscriptionProvider::Codex)
    );
    assert!(
        available_provider_for_model(
            "borealis-9-ultra",
            &[SubscriptionProvider::Claude],
            &catalogs,
        )
        .unwrap_err()
        .to_string()
        .contains("no healthy codex credential")
    );
    let error = available_provider_for_model(
        "never-advertised",
        &[SubscriptionProvider::Claude],
        &catalogs,
    )
    .unwrap_err();
    assert!(error.to_string().contains("not advertised"));
    assert!(!error.to_string().contains("claude credential"));

    // An empty cache advertises nothing at all.
    let empty = ModelCatalogCache::new();
    assert_eq!(provider_for_model("borealis-9-ultra", &empty), None);
    assert!(matches!(
        available_provider_for_model("borealis-9-ultra", &[], &empty),
        Err(ModelRouteError::NotFound(_))
    ));
}

#[test]
fn newly_discovered_model_is_immediately_routable() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(
        SubscriptionProvider::Codex,
        vec!["borealis-9-ultra".to_string()],
    );
    assert_eq!(
        available_provider_for_model(
            "borealis-9-ultra",
            &[SubscriptionProvider::Codex],
            &catalogs,
        ),
        Ok(SubscriptionProvider::Codex)
    );
    assert!(
        available_provider_for_model(
            "never-advertised",
            &[SubscriptionProvider::Codex],
            &catalogs,
        )
        .is_err()
    );
}

#[tokio::test]
async fn openai_request_rejects_unknown_model_in_pinned_and_auto_modes() {
    for provider in [UpstreamProvider::Anthropic, UpstreamProvider::Auto] {
        let data = tempdir().unwrap();
        let mut state = auto_state(Vec::new(), data.path());
        state.upstream_provider = provider;
        // A discovered catalog is what makes an unknown id *knowably*
        // unknown; without one the router cannot judge the name at all.
        state
            .model_catalogs
            .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
        state
            .provider_store
            .set_subscription_entitlement_policy(
                crate::client_policy::SubscriptionEntitlementPolicy::parse(["opencode:claude"])
                    .unwrap(),
            )
            .unwrap();
        let headers = opencode_headers(&state, None);

        let response = crate::proxy::openai_chat_completions(
            State(state),
            Query(std::collections::BTreeMap::default()),
            headers,
            Ok(axum::Json(json!({
                "model": "totally-made-up-model-xyz",
                "messages": [{"role": "user", "content": "hello"}]
            }))),
        )
        .await;

        assert_eq!(response.status(), StatusCode::NOT_FOUND);
        let body = response.into_body().collect().await.unwrap().to_bytes();
        let json: Value = serde_json::from_slice(&body).unwrap();
        assert_eq!(json["error"]["type"], "not_found_error");
        assert!(
            json["error"]["message"]
                .as_str()
                .unwrap()
                .contains("totally-made-up-model-xyz")
        );
    }
}

#[tokio::test]
async fn missing_credentials_are_not_healthy() {
    let live = tempdir().unwrap();
    let absent = tempdir().unwrap();
    fs::write(
        live.path().join("auth.json"),
        r#"{"tokens":{"access_token":"live"}}"#,
    )
    .unwrap();
    let readers = vec![
        SubscriptionReader::new(SubscriptionProvider::Codex, live.path()),
        SubscriptionReader::new(SubscriptionProvider::Gemini, absent.path()),
    ];
    assert_eq!(
        healthy_providers(
            &reqwest::Client::new(),
            &readers,
            &crate::refresh::TokenCache::new(),
            2000,
        )
        .await,
        vec![SubscriptionProvider::Codex]
    );
}

/// A stamped-expired credential that cannot be refreshed may still be
/// honoured by the inference endpoint, so `expiresAt` alone must not drop
/// the provider from routing.
#[tokio::test]
async fn expired_credential_stays_routable_without_an_upstream_rejection() {
    let expired = tempdir().unwrap();
    fs::write(
        expired.path().join("oauth_creds.json"),
        r#"{"access_token":"old","expiry_date":1000}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Gemini,
        expired.path(),
    )];
    let cache = crate::refresh::TokenCache::new();
    assert_eq!(
        healthy_providers(&reqwest::Client::new(), &readers, &cache, 2000).await,
        vec![SubscriptionProvider::Gemini]
    );

    // An observed upstream 401/403 is the evidence that does drop it.
    cache.record_credential_rejected(SubscriptionProvider::Gemini);
    assert!(
        healthy_providers(&reqwest::Client::new(), &readers, &cache, 2000)
            .await
            .is_empty()
    );
}

#[tokio::test]
async fn rejected_credential_is_unhealthy_even_without_an_expiry_timestamp() {
    let credential = tempdir().unwrap();
    fs::write(
        credential.path().join("auth.json"),
        r#"{"tokens":{"access_token":"revoked"}}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Codex,
        credential.path(),
    )];
    let cache = crate::refresh::TokenCache::new();
    cache.record_credential_rejected(SubscriptionProvider::Codex);

    assert!(
        healthy_providers(&reqwest::Client::new(), &readers, &cache, 2000)
            .await
            .is_empty()
    );
}

#[tokio::test]
async fn expired_credentials_with_a_cached_refresh_are_healthy() {
    let claude = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"expired","refreshToken":"refresh","expiresAt":1000}}"#,
    )
    .unwrap();
    let readers = vec![SubscriptionReader::new(
        SubscriptionProvider::Claude,
        claude.path(),
    )];
    let cache = crate::refresh::TokenCache::new();
    cache.store_refreshed(
        SubscriptionProvider::Claude,
        "primary",
        crate::subscription::SubscriptionToken {
            access_token: "fresh".into(),
            refresh_token: Some("refresh".into()),
            expires_at_ms: Some(3000),
            account_id: None,
            resource_url: None,
        },
    );

    assert_eq!(
        healthy_providers(&reqwest::Client::new(), &readers, &cache, 2000).await,
        vec![SubscriptionProvider::Claude]
    );
}

#[tokio::test]
async fn automatic_state_selects_the_models_healthy_reader() {
    let data = tempdir().unwrap();
    let codex = tempdir().unwrap();
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
    // Routing follows a live-discovered catalog, so seed one.
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["borealis-9-ultra".into()]);

    let routed = route_state(&state, &json!({"model": "borealis-9-ultra"}))
        .await
        .unwrap();
    assert_eq!(routed.upstream_provider, UpstreamProvider::Codex);
    assert_eq!(routed.bridge_model.as_deref(), Some("borealis-9-ultra"));
    assert_eq!(
        routed.subscription_reader.unwrap().provider(),
        SubscriptionProvider::Codex
    );
    assert!(
        route_state(&state, &json!({"model": "claude-opus-4-7"}))
            .await
            .is_err()
    );
}

#[tokio::test]
async fn automatic_state_never_uses_a_claude_alias_for_an_unadvertised_openai_model() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live"}}"#,
    )
    .unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
        ],
        data.path(),
    );
    state.model_catalogs.record_success(
        SubscriptionProvider::Claude,
        vec!["claude-opus-4-7".to_string()],
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-5.6-sol".to_string()]);

    let error = route_state(&state, &json!({"model": "gpt-5"}))
        .await
        .err()
        .expect("an unadvertised model must not cross vendors through an alias");

    assert!(error.to_string().contains("not advertised"));
    assert!(!error.to_string().contains("claude credential"));

    state.model_catalogs.record_success(
        SubscriptionProvider::Claude,
        vec!["gpt-5".to_string(), "claude-opus-4-7".to_string()],
    );
    state.model_catalogs.record_success(
        SubscriptionProvider::Codex,
        vec!["gpt-5".to_string(), "gpt-5.6-sol".to_string()],
    );
    let Err(error) = route_state(&state, &json!({"model": "gpt-5"})).await else {
        panic!("a familiar-looking unqualified collision must stay ambiguous");
    };
    assert!(error.to_string().contains("multiple subscriptions"));
    let routed = route_state(&state, &json!({"model": "codex/gpt-5"}))
        .await
        .expect("the explicit provider-qualified identity routes to Codex");
    assert_eq!(routed.upstream_provider, UpstreamProvider::Codex);
    assert_eq!(routed.bridge_model.as_deref(), Some("gpt-5"));
}

#[tokio::test]
async fn client_entitlement_filters_hidden_providers_before_collision_resolution() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    let codex = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"claude-live"}}"#,
    )
    .unwrap();
    fs::write(
        codex.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-live"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![
            SubscriptionReader::new(SubscriptionProvider::Claude, claude.path()),
            SubscriptionReader::new(SubscriptionProvider::Codex, codex.path()),
        ],
        data.path(),
    );
    let model = "future-shared-by-two-providers";
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        state
            .model_catalogs
            .record_success(provider, vec![model.to_string()]);
    }

    let routed =
        route_subscription_model_for_providers(&state, model, &[SubscriptionProvider::Claude])
            .await
            .expect("the hidden Codex catalog must not make Claude's visible id ambiguous");
    assert_eq!(routed.state.upstream_provider, UpstreamProvider::Anthropic);
}

#[test]
fn catalog_collisions_use_vendor_namespaces_and_reject_ambiguous_names() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(
        SubscriptionProvider::Claude,
        vec!["gpt-5".to_string(), "shared-model".to_string()],
    );
    catalogs.record_success(
        SubscriptionProvider::Codex,
        vec!["gpt-5".to_string(), "shared-model".to_string()],
    );

    let familiar = available_provider_for_model(
        "gpt-5",
        &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
        &catalogs,
    )
    .expect_err("spelling never resolves a collision");
    assert!(familiar.to_string().contains("multiple subscriptions"));
    let error = available_provider_for_model(
        "shared-model",
        &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
        &catalogs,
    )
    .expect_err("an unqualified collision must require disambiguation");
    assert!(error.to_string().contains("multiple subscriptions"));
    assert!(matches!(
        available_provider_for_model("shared-model", &[SubscriptionProvider::Codex], &catalogs),
        Err(ModelRouteError::Ambiguous(_))
    ));
}

#[test]
fn an_empty_catalog_names_the_credential_state_behind_it() {
    // A rejected credential empties the catalog. "not advertised by any
    // subscription" alone reads like a typo in the model id, so the message
    // has to name the real cause (issue #239).
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(
        SubscriptionProvider::Claude,
        vec!["claude-sonnet-5".to_string()],
    );
    catalogs.record_failure(
        SubscriptionProvider::Claude,
        "refresh token was rejected: invalid_grant",
        true,
    );

    let error = available_provider_for_model("claude-sonnet-5", &[], &catalogs)
        .expect_err("a rejected credential advertises nothing");
    let message = error.to_string();
    assert!(
        message.contains("not advertised by any subscription"),
        "{message}"
    );
    assert!(message.contains("credential is not usable"), "{message}");
    assert!(
        !message.contains("invalid_grant"),
        "upstream catalog details are private: {message}"
    );
}

#[test]
fn a_never_discovered_subscription_is_not_inferred_from_model_spelling() {
    let catalogs = ModelCatalogCache::new();
    let error = available_provider_for_model("gemini-3-pro", &[], &catalogs)
        .expect_err("nothing has been discovered yet");
    let message = error.to_string();
    assert_eq!(
        message,
        "model 'gemini-3-pro' is not advertised by any subscription"
    );

    // An unqualified id cannot blame one vendor, and stays quiet about
    // providers that were simply never configured.
    let unqualified = available_provider_for_model("mystery-model", &[], &catalogs)
        .expect_err("nothing has been discovered yet");
    assert_eq!(
        unqualified.to_string(),
        "model 'mystery-model' is not advertised by any subscription"
    );
}

#[test]
fn an_unavailable_credential_is_named_in_the_routing_error() {
    let catalogs = ModelCatalogCache::new();
    catalogs.record_success(
        SubscriptionProvider::Codex,
        vec!["borealis-9-ultra".to_string()],
    );
    let error = available_provider_for_model("borealis-9-ultra", &[], &catalogs)
        .expect_err("the catalog is live but no credential is usable");
    let message = error.to_string();
    assert!(message.contains("no healthy codex credential"), "{message}");
    assert!(
        message.contains("missing or rejected upstream"),
        "{message}"
    );
}
