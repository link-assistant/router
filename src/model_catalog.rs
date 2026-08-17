//! Live subscription model discovery with stale-on-error caching.

use std::collections::HashMap;
use std::sync::RwLock;
use std::time::Duration;

use serde_json::Value;

use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

/// How often live provider catalogs are refreshed.
pub const CATALOG_TTL: Duration = Duration::from_secs(5 * 60);
const FETCH_TIMEOUT: Duration = Duration::from_secs(15);

/// Last known catalog state for one provider account.
///
/// Nothing here is ever seeded from source-code model names: a catalog exists
/// only once a live, authenticated discovery has succeeded for that exact
/// account (issue #192). Until then `models` is empty and `discovered` is
/// false, so the router advertises and routes nothing it has not actually seen.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct CatalogStatus {
    /// Models observed in a successful live discovery.
    pub models: Vec<String>,
    /// Account identity the catalog was discovered for.
    pub account: Option<String>,
    /// Unix timestamp of the last successful live refresh.
    pub refreshed_at: Option<i64>,
    /// Most recent refresh failure, cleared by a successful refresh.
    pub last_error: Option<String>,
    /// Whether a live discovery has ever succeeded for this account.
    pub discovered: bool,
    /// Whether the credential is currently usable. A persisted catalog is
    /// retained across a credential failure for diagnostics, but is not
    /// exposed for routing while this is false.
    pub credential_healthy: bool,
}

impl CatalogStatus {
    /// Models that may be advertised and routed right now.
    ///
    /// Empty unless a live discovery has succeeded *and* the credential still
    /// works, so a revoked credential stops exposing models immediately while
    /// administrators can still see what was last discovered.
    #[must_use]
    pub fn routable_models(&self) -> &[String] {
        if self.discovered && self.credential_healthy {
            &self.models
        } else {
            &[]
        }
    }

    /// Whether this account is degraded: it has a catalog that cannot be used,
    /// or has never discovered one.
    #[must_use]
    pub const fn is_degraded(&self) -> bool {
        !self.discovered || !self.credential_healthy
    }
}

/// Thread-safe, immediately readable model catalogs shared by all handlers.
pub struct ModelCatalogCache {
    entries: RwLock<HashMap<SubscriptionProvider, CatalogStatus>>,
}

impl Default for ModelCatalogCache {
    fn default() -> Self {
        Self::new()
    }
}

impl ModelCatalogCache {
    /// An empty cache.
    ///
    /// Every provider starts with no catalog at all. Models appear only after
    /// a successful authenticated discovery, so the router can never advertise
    /// a model name that came from its own source code (issue #192).
    #[must_use]
    pub fn new() -> Self {
        Self {
            entries: RwLock::new(HashMap::new()),
        }
    }

    /// Models that may be advertised and routed for `provider` right now.
    #[must_use]
    pub fn models(&self, provider: SubscriptionProvider) -> Vec<String> {
        self.status(provider).routable_models().to_vec()
    }

    /// Return diagnostic state for a provider.
    #[must_use]
    pub fn status(&self, provider: SubscriptionProvider) -> CatalogStatus {
        self.entries
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .get(&provider)
            .cloned()
            .unwrap_or_default()
    }

    /// Diagnostic state for every provider the cache knows about.
    #[must_use]
    pub fn statuses(&self) -> Vec<(SubscriptionProvider, CatalogStatus)> {
        let mut entries: Vec<_> = self
            .entries
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
            .iter()
            .map(|(provider, status)| (*provider, status.clone()))
            .collect();
        entries.sort_by_key(|(provider, _)| provider.to_string());
        entries
    }

    /// Replace a provider's catalog with a freshly observed listing.
    ///
    /// Public so integration tests can seed deterministic live catalogs.
    pub fn record_success(&self, provider: SubscriptionProvider, models: Vec<String>) {
        self.record_success_for(provider, None, models);
    }

    /// Record a successful discovery against the account it was made for.
    pub fn record_success_for(
        &self,
        provider: SubscriptionProvider,
        account: Option<String>,
        mut models: Vec<String>,
    ) {
        models.sort();
        models.dedup();
        let mut entries = self
            .entries
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        entries.insert(
            provider,
            CatalogStatus {
                models,
                account,
                refreshed_at: Some(chrono::Utc::now().timestamp()),
                last_error: None,
                discovered: true,
                credential_healthy: true,
            },
        );
    }

    /// Record a refresh failure, keeping any previously discovered catalog for
    /// diagnostics but marking the credential unhealthy so it stops being used.
    fn record_failure(
        &self,
        provider: SubscriptionProvider,
        error: &str,
        credential_rejected: bool,
    ) {
        let mut entries = self
            .entries
            .write()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let entry = entries.entry(provider).or_default();
        entry.last_error = Some(error.to_string());
        if credential_rejected {
            entry.credential_healthy = false;
        }
        drop(entries);
    }
}

/// Fetch every currently healthy credential and update the cache independently.
pub async fn refresh_catalogs(
    client: &reqwest::Client,
    readers: &[SubscriptionReader],
    token_cache: &crate::refresh::TokenCache,
    cache: &ModelCatalogCache,
) {
    let now_ms = chrono::Utc::now().timestamp_millis();
    let refreshes = readers
        .iter()
        .filter_map(|reader| {
            reader
                .read_token()
                .ok()
                .map(|token| (reader.provider(), token))
        })
        .map(|(provider, disk_token)| async move {
            let token = token_cache
                .get_fresh(client, provider, disk_token, now_ms)
                .await;
            // A stamped-expired credential is still tried: `expiresAt` is a
            // hint, and the catalog endpoint is the authority on whether this
            // token works for *it*.
            let stamped_expired = token.is_expired(now_ms);
            // Bind the discovery to the account it was made for, so a catalog
            // is never reused across accounts (issue #192).
            let account = token.account_id.clone();
            let result = fetch_provider_catalog(client, provider, &token, None)
                .await
                .map(|models| (account, models));
            (provider, stamped_expired, result)
        });
    for (provider, stamped_expired, result) in futures_util::future::join_all(refreshes).await {
        match result {
            Ok((account, models)) => {
                tracing::info!(
                    "refreshed {provider} model catalog with {} model(s)",
                    models.len()
                );
                token_cache.record_credential_working(provider);
                cache.record_success_for(provider, account, models);
            }
            Err(error) => {
                // Keep the last known models in the cache for transient
                // failures, but an authentication rejection makes them unsafe
                // to advertise or route until a later probe succeeds.
                let rejected = is_credential_rejection(&error);
                if rejected {
                    token_cache.record_credential_rejected(provider);
                }
                let error = if stamped_expired {
                    format!("{error} (credential is stamped expired; last known catalog retained)")
                } else {
                    error
                };
                tracing::warn!("failed to refresh {provider} model catalog: {error}");
                cache.record_failure(provider, &error, rejected);
            }
        }
    }
}

/// Whether a catalog response proves that the supplied credential is unusable.
#[must_use]
pub(crate) fn is_credential_rejection(error: &str) -> bool {
    error.starts_with("HTTP 401") || error.starts_with("HTTP 403")
}

/// Continuously refresh live catalogs, beginning immediately at startup.
pub async fn refresh_catalogs_forever(
    client: reqwest::Client,
    readers: Vec<SubscriptionReader>,
    token_cache: std::sync::Arc<crate::refresh::TokenCache>,
    cache: std::sync::Arc<ModelCatalogCache>,
) {
    loop {
        refresh_catalogs(&client, &readers, &token_cache, &cache).await;
        tokio::time::sleep(CATALOG_TTL).await;
    }
}

/// Fetch and parse a single provider catalog.
///
/// `base_url_override` exists for deterministic diagnostics and tests. Runtime
/// calls use each vendor's official endpoint.
pub async fn fetch_provider_catalog(
    client: &reqwest::Client,
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
    base_url_override: Option<&str>,
) -> Result<Vec<String>, String> {
    let base = base_url_override.map_or_else(
        || catalog_base_url(provider, token),
        |value| value.trim_end_matches('/').to_string(),
    );
    let client_version =
        std::env::var("CODEX_CLIENT_VERSION").unwrap_or_else(|_| "0.144.1".to_string());
    let url = match provider {
        SubscriptionProvider::Claude => format!("{base}/v1/models"),
        SubscriptionProvider::Codex | SubscriptionProvider::Qwen => format!("{base}/models"),
        SubscriptionProvider::Gemini => format!("{base}/v1beta/models"),
    };
    let mut request = client
        .get(url)
        .bearer_auth(&token.access_token)
        .timeout(FETCH_TIMEOUT);
    match provider {
        SubscriptionProvider::Claude => {
            request = request
                .header("anthropic-version", "2023-06-01")
                .header("anthropic-beta", "oauth-2025-04-20");
        }
        SubscriptionProvider::Codex => {
            request = request.query(&[("client_version", client_version)]);
            if let Some(account_id) = token.account_id.as_deref() {
                request = request.header("chatgpt-account-id", account_id);
            }
        }
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => {}
    }
    let response = request
        .send()
        .await
        .map_err(|error| format!("request failed: {error}"))?;
    let status = response.status();
    if !status.is_success() {
        let body = response.text().await.unwrap_or_default();
        let detail = body.chars().take(240).collect::<String>();
        return Err(format!("HTTP {status}: {detail}"));
    }
    let body: Value = response
        .json()
        .await
        .map_err(|error| format!("invalid JSON response: {error}"))?;
    parse_catalog(provider, &body)
}

fn catalog_base_url(provider: SubscriptionProvider, token: &SubscriptionToken) -> String {
    match provider {
        // Gemini CLI's cloud-platform OAuth token is accepted by the public
        // model registry even though inference uses the Code Assist endpoint.
        SubscriptionProvider::Gemini => "https://generativelanguage.googleapis.com".to_string(),
        _ => token.base_url(provider).trim_end_matches('/').to_string(),
    }
}

fn parse_catalog(provider: SubscriptionProvider, body: &Value) -> Result<Vec<String>, String> {
    let (array_key, id_key) = match provider {
        SubscriptionProvider::Claude | SubscriptionProvider::Qwen => ("data", "id"),
        SubscriptionProvider::Codex => ("models", "slug"),
        SubscriptionProvider::Gemini => ("models", "name"),
    };
    let models = body
        .get(array_key)
        .and_then(Value::as_array)
        .ok_or_else(|| format!("response has no {array_key} array"))?
        .iter()
        .filter(|entry| {
            provider != SubscriptionProvider::Gemini
                || entry
                    .get("supportedGenerationMethods")
                    .and_then(Value::as_array)
                    .is_none_or(|methods| methods.iter().any(|method| method == "generateContent"))
        })
        .filter_map(|entry| entry.get(id_key).and_then(Value::as_str))
        .map(|id| id.strip_prefix("models/").unwrap_or(id).to_string())
        .filter(|id| !id.is_empty())
        .collect::<Vec<_>>();
    if models.is_empty() {
        Err("response contained no model identifiers".to_string())
    } else {
        Ok(models)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::Router;
    use axum::extract::State;
    use axum::http::{HeaderMap, Uri};
    use axum::routing::get;
    use std::fs;
    use std::sync::Arc;
    use tempfile::tempdir;

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

        let app = Router::new().route("/compatible-mode/v1/models", get(handler));
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

    /// A stamped-expired credential is still probed. Its last known catalog is
    /// retained for diagnostics, while rejection evidence prevents it from
    /// being advertised or routed.
    #[tokio::test]
    async fn expired_credential_is_still_probed_and_keeps_its_cached_catalog() {
        async fn handler() -> (axum::http::StatusCode, &'static str) {
            (axum::http::StatusCode::UNAUTHORIZED, "expired token")
        }

        let app = Router::new().route("/compatible-mode/v1/models", get(handler));
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

        let app = Router::new().route("/compatible-mode/v1/models", get(handler));
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
}
