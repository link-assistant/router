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

pub(super) fn auto_state(readers: Vec<SubscriptionReader>, data_dir: &std::path::Path) -> AppState {
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
    let client_token = state.token_manager.issue_token(1, "catalog test").unwrap();
    let app = axum::Router::new()
        .route("/v1/models", get(models))
        .with_state(state.clone());

    let response = app
        .oneshot(
            Request::builder()
                .uri("/v1/models")
                .header("authorization", format!("Bearer {client_token}"))
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let catalog: Value = serde_json::from_slice(&body).unwrap();

    assert_eq!(catalog["healthy_providers"], json!(["codex"]));
    // Codex has discovered nothing in this test, so it is reported as
    // degraded and contributes no models -- there is no fallback to show.
    //
    // Claude is degraded too, and that is the point of issue #318: a revoked
    // subscription used to vanish from `data` with `degraded_providers` left
    // empty, so a monitor could not tell it from a provider that was never
    // configured on this deployment. It is now named, with a reason.
    assert_eq!(catalog["degraded_providers"], json!(["codex", "claude"]));
    assert!(
        catalog["degraded_reasons"]["claude"]
            .as_str()
            .unwrap_or_default()
            .contains("claude"),
        "a degraded provider must say why: {}",
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
        .route("/v1/models", get(models))
        .route("/api/codex/v1/models", get(models))
        .with_state(state);

    for path in ["/v1/models", "/api/codex/v1/models"] {
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
        .route("/v1/models", get(models))
        .with_state(state);
    let malformed = ["wrong-prefix", "la_sk_zzzzQQQrandom.stuff.here"];
    let mut responses = Vec::new();

    for token in malformed {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .uri("/v1/models")
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
        let client_token = state
            .token_manager
            .issue_token(1, "catalog client")
            .expect("issue client token");
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            format!("Bearer {client_token}").parse().unwrap(),
        );

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
    let routed = route_state(&state, &json!({"model": "gpt-5"}))
        .await
        .expect("an OpenAI-shaped collision must route to Codex");
    assert_eq!(routed.upstream_provider, UpstreamProvider::Codex);
    assert_eq!(routed.bridge_model.as_deref(), Some("gpt-5"));
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

    assert_eq!(
        available_provider_for_model(
            "gpt-5",
            &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
            &catalogs,
        ),
        Ok(SubscriptionProvider::Codex)
    );
    let error = available_provider_for_model(
        "shared-model",
        &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
        &catalogs,
    )
    .expect_err("an unqualified collision must require disambiguation");
    assert!(error.to_string().contains("multiple subscriptions"));
    assert_eq!(
        available_provider_for_model("shared-model", &[SubscriptionProvider::Codex], &catalogs,),
        Ok(SubscriptionProvider::Codex)
    );
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
    assert!(message.contains("invalid_grant"), "{message}");
}

#[test]
fn a_never_discovered_subscription_says_so_rather_than_blaming_the_model_id() {
    let catalogs = ModelCatalogCache::new();
    let error = available_provider_for_model("gemini-3-pro", &[], &catalogs)
        .expect_err("nothing has been discovered yet");
    let message = error.to_string();
    assert!(
        message.contains("no gemini credential has been read yet"),
        "{message}"
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

/// Add a stored OpenAI-compatible provider declaring `models`.
fn store_provider(state: &AppState, name: &str, models: &[&str]) {
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: name.to_string(),
            kind: None,
            base_url: "https://provider.example/v1".to_string(),
            default_model: models.first().map(|model| (*model).to_string()),
            models: Some(models.iter().map(|model| (*model).to_string()).collect()),
            api_key: Some("provider-key".to_string()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
        })
        .expect("store the provider");
}

/// The bug in issue #260: a stored provider was reachable only by pinning
/// `UPSTREAM_PROVIDER`, which pins the whole deployment — so one router could
/// serve vendor subscriptions or a local endpoint, never both.
#[tokio::test]
async fn a_stored_providers_declared_model_routes_in_automatic_mode() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);

    let routed =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "formal-ai-mini"}))
            .await
            .expect("a declared model must route");

    assert_eq!(routed.upstream_provider, UpstreamProvider::OpenAICompatible);
    assert_eq!(routed.openai_compatible.provider_name, "formal-ai");
    assert_eq!(routed.bridge_model.as_deref(), Some("formal-ai-mini"));
    // The deployment itself is untouched: this routed one request.
    assert_eq!(state.upstream_provider, UpstreamProvider::Auto);
}

/// A declared model appears in `/v1/models`, so one token reaches every model
/// the router can serve rather than only the discovered subscriptions.
#[tokio::test]
async fn declared_models_are_listed_alongside_subscription_catalogs() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini", "formal-ai-large"]);

    let mut catalog = crate::model_routing::model_catalog(&[], &state.model_catalogs);
    crate::model_routing::append_stored_provider_models(&state, &mut catalog);

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("a data array")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(ids.contains(&"formal-ai-mini"), "{ids:?}");
    assert!(ids.contains(&"formal-ai-large"), "{ids:?}");
}

/// A model declared by two stored providers is refused rather than resolved by
/// declaration order — the rule subscriptions already follow.
#[tokio::test]
async fn a_model_declared_twice_is_ambiguous_until_qualified() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "alpha", &["shared-model"]);
    store_provider(&state, "beta", &["shared-model"]);

    // Matched rather than `expect_err`: `AppState` holds credentials and so
    // deliberately does not implement `Debug`.
    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "shared-model"}))
            .await
    else {
        panic!("an ambiguous name must be refused");
    };
    assert!(
        matches!(error, crate::model_routing::ModelRouteError::Ambiguous(_)),
        "{error:?}"
    );

    // Naming the provider resolves it.
    let routed = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "beta/shared-model"}),
    )
    .await
    .expect("a qualified name is unambiguous");
    assert_eq!(routed.openai_compatible.provider_name, "beta");
    assert_eq!(routed.bridge_model.as_deref(), Some("shared-model"));
}

/// A disabled provider advertises nothing, so disabling one takes its models
/// out of both the catalog and the routing table.
#[tokio::test]
async fn a_disabled_provider_advertises_nothing() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);
    state
        .provider_store
        .upsert(crate::providers::ProviderUpsert {
            name: "formal-ai".to_string(),
            kind: None,
            base_url: "https://provider.example/v1".to_string(),
            default_model: None,
            models: Some(vec!["formal-ai-mini".to_string()]),
            api_key: None,
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(false),
        })
        .expect("disable the provider");

    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "formal-ai-mini"}))
            .await
    else {
        panic!("a disabled provider must not route");
    };
    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
}

/// A qualified name that the provider does not advertise is an error naming
/// the provider, rather than a silent fall through to a subscription.
#[tokio::test]
async fn a_qualified_name_the_provider_lacks_is_reported() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["formal-ai-mini"]);

    let Err(error) = crate::model_routing::route_state(
        &state,
        &serde_json::json!({"model": "formal-ai/not-declared"}),
    )
    .await
    else {
        panic!("an undeclared qualified model must be refused");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
    assert!(format!("{error:?}").contains("formal-ai"), "{error:?}");
}

/// A qualified name for a provider that does not exist falls through to
/// ordinary routing rather than being treated as a provider reference.
#[tokio::test]
async fn an_unknown_provider_prefix_is_not_a_provider_reference() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());

    let Err(error) =
        crate::model_routing::route_state(&state, &serde_json::json!({"model": "nobody/model"}))
            .await
    else {
        panic!("nothing advertises this model");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::NotFound(_)),
        "{error:?}"
    );
}

/// A stored model whose id collides with a subscription's is listed in its
/// qualified form, so both stay reachable and the bare id stays ambiguous.
#[tokio::test]
async fn a_colliding_declared_model_is_listed_qualified() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());
    store_provider(&state, "formal-ai", &["shared-id"]);

    let mut catalog = serde_json::json!({
        "object": "list",
        "data": [{"id": "shared-id", "object": "model", "owned_by": "anthropic"}]
    });
    crate::model_routing::append_stored_provider_models(&state, &mut catalog);

    let ids: Vec<&str> = catalog["data"]
        .as_array()
        .expect("data")
        .iter()
        .filter_map(|entry| entry["id"].as_str())
        .collect();
    assert!(
        ids.contains(&"shared-id"),
        "the subscription keeps its id: {ids:?}"
    );
    assert!(
        ids.contains(&"formal-ai/shared-id"),
        "the stored provider is reachable by its qualified name: {ids:?}"
    );
}

/// A request with no model is refused before any provider is consulted.
#[tokio::test]
async fn a_request_without_a_model_is_refused() {
    let data_dir = tempfile::tempdir().expect("data dir");
    let state = auto_state(Vec::new(), data_dir.path());

    let Err(error) = crate::model_routing::route_state(&state, &serde_json::json!({})).await else {
        panic!("a model is required in automatic mode");
    };

    assert!(
        matches!(error, crate::model_routing::ModelRouteError::ModelRequired),
        "{error:?}"
    );
}

/// A deployment with no subscription configured has nothing to be unhealthy
/// about, so the liveness answer stays exactly what every existing probe
/// expects (issue #318).
#[tokio::test]
async fn health_stays_a_bare_ok_when_no_subscription_is_configured() {
    let data = tempdir().unwrap();
    let state = auto_state(Vec::new(), data.path());
    let app = axum::Router::new()
        .route("/health", get(crate::proxy::health))
        .with_state(state);

    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&body[..], b"ok");
}

/// The core of issue #318: a revoked subscription must be visible to a stock
/// uptime check. `/health` answered `ok` for twelve hours while the router
/// could not serve half of what it advertised.
#[tokio::test]
async fn subscription_health_reports_a_revoked_subscription_a_monitor_can_see() {
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
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Codex, vec!["gpt-live".into()]);
    // Everything is serving: the probe must not cry wolf.
    let app = axum::Router::new()
        .route(
            "/health/subscriptions",
            get(crate::proxy::subscription_health),
        )
        .with_state(state.clone());
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health/subscriptions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);

    // 17:44:49 — the refresh chain dies.
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);

    // Liveness is unchanged: the process is up, and restarting it cannot mint
    // a new OAuth token. `/health` drives both Kubernetes probes, so failing it
    // here would crash-loop a deployment that still serves codex.
    let app = axum::Router::new()
        .route("/health", get(crate::proxy::health))
        .with_state(state.clone());
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(
        response.status(),
        StatusCode::OK,
        "liveness must not fail for a credential a restart cannot fix"
    );

    let app = axum::Router::new()
        .route(
            "/health/subscriptions",
            get(crate::proxy::subscription_health),
        )
        .with_state(state);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health/subscriptions")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(
        response.status(),
        StatusCode::SERVICE_UNAVAILABLE,
        "a router that cannot serve a configured subscription must say so"
    );
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let report: Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(report["status"], "degraded");
    assert_eq!(report["healthy_providers"], json!(["codex"]));
    assert_eq!(report["degraded_providers"][0]["provider"], "claude");
    assert!(
        report["degraded_providers"][0]["reason"].is_string(),
        "the degraded provider must say why: {report}"
    );
}

/// `/metrics` is what a monitor already polls, and it carried no signal at all
/// for a dead subscription (issue #318).
#[tokio::test]
async fn metrics_exposes_a_gauge_per_configured_subscription() {
    let data = tempdir().unwrap();
    let claude = tempdir().unwrap();
    fs::write(
        claude.path().join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"revoked"}}"#,
    )
    .unwrap();
    let state = auto_state(
        vec![SubscriptionReader::new(
            SubscriptionProvider::Claude,
            claude.path(),
        )],
        data.path(),
    );
    state
        .model_catalogs
        .record_success(SubscriptionProvider::Claude, vec!["aurora-2-base".into()]);
    state
        .subscription_cache
        .record_credential_rejected(SubscriptionProvider::Claude);

    let app = axum::Router::new()
        .route("/metrics", get(crate::monitoring_api::metrics_endpoint))
        .with_state(state);
    let response = app
        .oneshot(
            Request::builder()
                .uri("/metrics")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let body = String::from_utf8_lossy(&body);
    assert!(
        body.contains("link_assistant_subscription_healthy{provider=\"claude\"} 0"),
        "a revoked subscription must be scrapeable as 0: {body}"
    );
    assert!(
        body.contains("# TYPE link_assistant_subscription_healthy gauge"),
        "the series must be typed as a gauge, not a counter: {body}"
    );
    // The existing counters are untouched.
    assert!(body.contains("link_assistant_requests_total"));
}
