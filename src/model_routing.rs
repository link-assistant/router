//! Model catalog and automatic subscription-provider routing.

use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::{IntoResponse, Response};
use serde_json::{Value, json};

use crate::app_state::AppState;
use crate::config::UpstreamProvider;
use crate::model_catalog::ModelCatalogCache;
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Failure to resolve a request model in automatic provider mode.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ModelRouteError {
    /// The request did not identify a model to route.
    ModelRequired,
    /// The requested model is unknown or its owning provider is unavailable.
    NotFound(String),
}

impl std::fmt::Display for ModelRouteError {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ModelRequired => {
                formatter.write_str("model is required when UPSTREAM_PROVIDER=auto")
            }
            Self::NotFound(message) => formatter.write_str(message),
        }
    }
}

/// Convert an automatic-routing failure into the public API error shape.
pub(crate) fn model_route_error_response(error: &ModelRouteError) -> Response {
    let (status, error_type) = match error {
        ModelRouteError::ModelRequired => (StatusCode::BAD_REQUEST, "invalid_request_error"),
        ModelRouteError::NotFound(_) => (StatusCode::NOT_FOUND, "not_found_error"),
    };
    crate::proxy::error_response(status, error_type, &error.to_string())
}

pub(crate) fn model_not_found_response(model: &str) -> Response {
    model_route_error_response(&ModelRouteError::NotFound(format!(
        "model '{model}' is not available"
    )))
}

const fn provider_owner(provider: SubscriptionProvider) -> &'static str {
    match provider {
        SubscriptionProvider::Claude => "anthropic",
        SubscriptionProvider::Codex => "openai",
        SubscriptionProvider::Gemini => "google",
        SubscriptionProvider::Qwen => "qwen",
    }
}

/// Return the provider whose last known live catalog owns a model id.
#[must_use]
pub fn provider_for_model(
    model: &str,
    catalogs: &ModelCatalogCache,
) -> Option<SubscriptionProvider> {
    SubscriptionProvider::ALL
        .into_iter()
        .find(|provider| catalogs.models(*provider).iter().any(|id| id == model))
}

/// Resolve a model only when the owning subscription is available.
pub fn available_provider_for_model(
    model: &str,
    available: &[SubscriptionProvider],
    catalogs: &ModelCatalogCache,
) -> Result<SubscriptionProvider, ModelRouteError> {
    let provider = provider_for_model(model, catalogs)
        .or_else(|| crate::openai::resolve_model(model).map(|_| SubscriptionProvider::Claude))
        .ok_or_else(|| {
            ModelRouteError::NotFound(format!(
                "model '{model}' is not advertised by any subscription"
            ))
        })?;
    available
        .contains(&provider)
        .then_some(provider)
        .ok_or_else(|| {
            ModelRouteError::NotFound(format!(
                "model '{model}' has no healthy {provider} credential"
            ))
        })
}

/// Readers whose current on-disk access token exists and has not expired.
#[must_use]
pub fn healthy_providers(readers: &[SubscriptionReader], now_ms: i64) -> Vec<SubscriptionProvider> {
    SubscriptionProvider::ALL
        .into_iter()
        .filter(|provider| {
            readers
                .iter()
                .find(|reader| reader.provider() == *provider)
                .and_then(|reader| reader.read_token().ok())
                .is_some_and(|token| !token.is_expired(now_ms))
        })
        .collect()
}

/// `OpenAI` list-shape union for all supplied subscription providers.
#[must_use]
pub fn model_catalog(providers: &[SubscriptionProvider], catalogs: &ModelCatalogCache) -> Value {
    let now = chrono::Utc::now().timestamp();
    let data = providers
        .iter()
        .flat_map(|provider| {
            let owner = provider_owner(*provider);
            catalogs.models(*provider).into_iter().map(move |id| {
                json!({
                    "id": id,
                    "object": "model",
                    "created": now,
                    "owned_by": owner,
                })
            })
        })
        .collect::<Vec<_>>();
    json!({"object": "list", "data": data})
}

/// Model catalog for one pinned subscription, empty when its credential is not healthy.
#[must_use]
pub fn pinned_model_catalog(state: &AppState, provider: SubscriptionProvider) -> Value {
    let healthy = healthy_providers(
        &state.subscription_readers,
        chrono::Utc::now().timestamp_millis(),
    );
    if healthy.contains(&provider) {
        model_catalog(&[provider], &state.model_catalogs)
    } else {
        model_catalog(&[], &state.model_catalogs)
    }
}

/// `GET /v1/models` across automatic or explicitly pinned providers.
pub async fn models(State(state): State<AppState>) -> impl IntoResponse {
    let models = match state.upstream_provider {
        UpstreamProvider::Auto => model_catalog(
            &healthy_providers(
                &state.subscription_readers,
                chrono::Utc::now().timestamp_millis(),
            ),
            &state.model_catalogs,
        ),
        UpstreamProvider::Anthropic => pinned_model_catalog(&state, SubscriptionProvider::Claude),
        UpstreamProvider::Gonka => state.gonka.as_ref().map_or_else(
            || crate::gonka::list_models(&crate::config::default_gonka_model()),
            |gonka| crate::gonka::list_models(&gonka.model),
        ),
        UpstreamProvider::Crater => crate::crater::list_models(),
        UpstreamProvider::Codex => pinned_model_catalog(&state, SubscriptionProvider::Codex),
        UpstreamProvider::Qwen => pinned_model_catalog(&state, SubscriptionProvider::Qwen),
        UpstreamProvider::Gemini => pinned_model_catalog(&state, SubscriptionProvider::Gemini),
        UpstreamProvider::OpenAICompatible => {
            crate::provider_proxy::openai_compatible_models(&state)
        }
    };
    (StatusCode::OK, axum::Json(models)).into_response()
}

/// Consume an automatic Anthropic-surface request and return its concrete state.
pub async fn route_anthropic_request(
    state: &AppState,
    request: Request,
) -> Result<(AppState, Request), Response> {
    let path = request.uri().path().to_string();
    let (parts, body) = request.into_parts();
    let body_bytes = axum::body::to_bytes(body, 10 * 1024 * 1024)
        .await
        .map_err(|error| {
            crate::proxy::error_response(
                StatusCode::BAD_REQUEST,
                "invalid_request_error",
                &format!("Failed to read request body: {error}"),
            )
        })?;
    let routing_body = serde_json::from_slice(&body_bytes).unwrap_or(Value::Null);
    let routed = if path.ends_with("/messages") || path.ends_with("/messages/count_tokens") {
        route_state(state, &routing_body).map_err(|error| model_route_error_response(&error))?
    } else {
        route_provider(state, SubscriptionProvider::Claude).map_err(|error| {
            crate::proxy::error_response(StatusCode::BAD_REQUEST, "invalid_request_error", &error)
        })?
    };
    Ok((routed, Request::from_parts(parts, Body::from(body_bytes))))
}

/// Resolve one provider only when its credential is currently healthy.
pub fn route_provider(
    state: &AppState,
    provider: SubscriptionProvider,
) -> Result<AppState, String> {
    let reader = state
        .subscription_readers
        .iter()
        .find(|reader| reader.provider() == provider)
        .filter(|reader| {
            reader
                .read_token()
                .is_ok_and(|token| !token.is_expired(chrono::Utc::now().timestamp_millis()))
        })
        .cloned()
        .ok_or_else(|| format!("no healthy {provider} credential is available"))?;

    let mut routed = state.clone();
    routed.upstream_provider = match provider {
        SubscriptionProvider::Claude => UpstreamProvider::Anthropic,
        SubscriptionProvider::Codex => UpstreamProvider::Codex,
        SubscriptionProvider::Gemini => UpstreamProvider::Gemini,
        SubscriptionProvider::Qwen => UpstreamProvider::Qwen,
    };
    if provider != SubscriptionProvider::Claude {
        routed.account_router = None;
        routed.subscription_reader = Some(reader);
    }
    Ok(routed)
}

/// Resolve an automatic state to the healthy subscription serving `model`.
pub fn route_state(state: &AppState, body: &Value) -> Result<AppState, ModelRouteError> {
    if state.upstream_provider != UpstreamProvider::Auto {
        return Ok(state.clone());
    }
    let model = body
        .get("model")
        .and_then(Value::as_str)
        .filter(|model| !model.is_empty())
        .ok_or(ModelRouteError::ModelRequired)?;
    let provider = available_provider_for_model(
        model,
        &healthy_providers(
            &state.subscription_readers,
            chrono::Utc::now().timestamp_millis(),
        ),
        &state.model_catalogs,
    )?;
    let mut routed = route_provider(state, provider).map_err(|_| {
        ModelRouteError::NotFound(format!(
            "model '{model}' has no healthy {provider} credential"
        ))
    })?;
    if provider != SubscriptionProvider::Claude {
        // The Anthropic bridge normally substitutes its provider default
        // because pinned clients name Claude models. Auto mode selected this
        // provider from the requested model itself, so preserve that exact id.
        routed.bridge_model = Some(model.to_string());
    }
    Ok(routed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::extract::Query;
    use axum::http::HeaderMap;
    use http_body_util::BodyExt;
    use std::fs;
    use std::sync::Arc;
    use tempfile::tempdir;

    fn auto_state(readers: Vec<SubscriptionReader>, data_dir: &std::path::Path) -> AppState {
        AppState {
            client: reqwest::Client::new(),
            token_manager: crate::token::TokenManager::new("test-secret"),
            oauth_provider: crate::oauth::OAuthProvider::new(&data_dir.to_string_lossy()),
            account_router: None,
            subscription_reader: None,
            subscription_readers: readers,
            model_catalogs: Arc::new(ModelCatalogCache::new()),
            subscription_cache: Arc::new(crate::refresh::TokenCache::new()),
            upstream_base_url: "https://api.anthropic.com".to_string(),
            upstream_provider: UpstreamProvider::Auto,
            gonka: None,
            bridge_model: None,
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
            activitypub_actor_base_url: "https://router.example".to_string(),
            activitypub_public_key_pem: crate::config::default_activitypub_public_key_pem(),
            mpp: crate::config::default_mpp_config(),
            login_manager: crate::login::LoginManager::new(crate::login::LoginConfig::default()),
        }
    }

    #[test]
    fn catalog_unions_models_with_their_real_owners() {
        let catalogs = ModelCatalogCache::new();
        let catalog = model_catalog(
            &[SubscriptionProvider::Claude, SubscriptionProvider::Codex],
            &catalogs,
        );
        let data = catalog["data"].as_array().unwrap();
        assert!(
            data.iter()
                .any(|m| m["id"] == "claude-opus-4-7" && m["owned_by"] == "anthropic")
        );
        assert!(
            data.iter()
                .any(|m| m["id"] == "gpt-5" && m["owned_by"] == "openai")
        );
    }

    #[test]
    fn model_ids_route_to_the_subscription_that_serves_them() {
        assert_eq!(
            provider_for_model("gpt-5", &ModelCatalogCache::new()),
            Some(SubscriptionProvider::Codex)
        );
        assert_eq!(
            provider_for_model("claude-opus-4-7", &ModelCatalogCache::new()),
            Some(SubscriptionProvider::Claude)
        );
        assert_eq!(
            provider_for_model("gemini-2.5-pro", &ModelCatalogCache::new()),
            Some(SubscriptionProvider::Gemini)
        );
        let catalogs = ModelCatalogCache::new();
        assert_eq!(provider_for_model("made-up-model", &catalogs), None);
        assert_eq!(
            available_provider_for_model("gpt-5", &[SubscriptionProvider::Codex], &catalogs,),
            Ok(SubscriptionProvider::Codex)
        );
        assert!(
            available_provider_for_model("gpt-5", &[SubscriptionProvider::Claude], &catalogs,)
                .unwrap_err()
                .to_string()
                .contains("no healthy codex credential")
        );
        assert_eq!(
            available_provider_for_model("gpt-4o", &[SubscriptionProvider::Claude], &catalogs,),
            Ok(SubscriptionProvider::Claude)
        );
        assert!(matches!(
            available_provider_for_model("made-up-model", &[], &catalogs),
            Err(ModelRouteError::NotFound(_))
        ));
    }

    #[test]
    fn newly_discovered_model_is_immediately_routable() {
        let catalogs = ModelCatalogCache::new();
        catalogs.record_success(SubscriptionProvider::Codex, vec!["gpt-5.6-sol".to_string()]);
        assert_eq!(
            available_provider_for_model("gpt-5.6-sol", &[SubscriptionProvider::Codex], &catalogs,),
            Ok(SubscriptionProvider::Codex)
        );
        assert!(
            available_provider_for_model("gpt-5", &[SubscriptionProvider::Codex], &catalogs,)
                .is_err()
        );
    }

    #[tokio::test]
    async fn openai_request_rejects_unknown_model_in_pinned_and_auto_modes() {
        for provider in [UpstreamProvider::Anthropic, UpstreamProvider::Auto] {
            let data = tempdir().unwrap();
            let mut state = auto_state(Vec::new(), data.path());
            state.upstream_provider = provider;

            let response = crate::proxy::openai_chat_completions(
                State(state),
                Query(std::collections::BTreeMap::default()),
                HeaderMap::new(),
                axum::Json(json!({
                    "model": "totally-made-up-model-xyz",
                    "messages": [{"role": "user", "content": "hello"}]
                })),
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

    #[test]
    fn missing_and_expired_credentials_are_not_healthy() {
        let live = tempdir().unwrap();
        let expired = tempdir().unwrap();
        fs::write(
            live.path().join("auth.json"),
            r#"{"tokens":{"access_token":"live"}}"#,
        )
        .unwrap();
        fs::write(
            expired.path().join("oauth_creds.json"),
            r#"{"access_token":"old","expiry_date":1000}"#,
        )
        .unwrap();
        let readers = vec![
            SubscriptionReader::new(SubscriptionProvider::Codex, live.path()),
            SubscriptionReader::new(SubscriptionProvider::Gemini, expired.path()),
        ];
        assert_eq!(
            healthy_providers(&readers, 2000),
            vec![SubscriptionProvider::Codex]
        );
    }

    #[test]
    fn automatic_state_selects_the_models_healthy_reader() {
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

        let routed = route_state(&state, &json!({"model": "gpt-5"})).unwrap();
        assert_eq!(routed.upstream_provider, UpstreamProvider::Codex);
        assert_eq!(routed.bridge_model.as_deref(), Some("gpt-5"));
        assert_eq!(
            routed.subscription_reader.unwrap().provider(),
            SubscriptionProvider::Codex
        );
        assert!(route_state(&state, &json!({"model": "claude-opus-4-7"})).is_err());
    }
}
