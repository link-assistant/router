//! Reusable onboarding checks against real subscription adapters and a mock upstream.

use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::extract::Request;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse as _;
use axum::routing::any;
use base64::Engine as _;
use link_assistant_router::account_http::EgressProxy;
use link_assistant_router::accounts::{AccountRouter, AccountRouterOptions, UpstreamObservation};
use link_assistant_router::provider_connector::{
    ConnectorEndpoints, ConnectorTransport, LoginFlow, ProviderConnector, SubscriptionConnector,
};
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::upstream_guard::NetworkPolicy;
use reqwest::dns::Resolve as _;
use serde_json::{Value, json};

type Calls = Arc<Mutex<Vec<(String, Value)>>>;

struct MockUpstream {
    base: String,
    calls: Calls,
    reject_catalog: Arc<AtomicBool>,
    server: tokio::task::JoinHandle<()>,
}

impl Drop for MockUpstream {
    fn drop(&mut self) {
        self.server.abort();
    }
}

impl MockUpstream {
    async fn start(provider: SubscriptionProvider) -> Self {
        let calls: Calls = Arc::default();
        let reject_catalog = Arc::new(AtomicBool::new(false));
        let reject = Arc::clone(&reject_catalog);
        let recorded = Arc::clone(&calls);
        let app = axum::Router::new().fallback(any(move |request: Request| {
            let calls = Arc::clone(&recorded);
            let reject = Arc::clone(&reject);
            async move {
                let path = request.uri().path().to_string();
                let headers = request.headers().clone();
                let bytes = axum::body::to_bytes(request.into_body(), 16_384)
                    .await
                    .unwrap();
                let body = serde_json::from_slice(&bytes).unwrap_or(Value::Null);
                calls.lock().unwrap().push((path.clone(), body.clone()));
                match path.as_str() {
                    "/oauth/token" => {
                        assert_eq!(body["grant_type"], "refresh_token");
                        assert!(body["refresh_token"].as_str().unwrap().starts_with("fixture-"));
                        axum::Json(json!({
                            "access_token": access_token(chrono::Utc::now().timestamp_millis() + 3_600_000),
                            "refresh_token": "fixture-successor-refresh",
                            "expires_in": 3600
                        }))
                        .into_response()
                    }
                    "/v1/models" | "/models" => {
                        if reject.load(Ordering::Relaxed) {
                            return StatusCode::UNAUTHORIZED.into_response();
                        }
                        assert!(headers["authorization"].to_str().unwrap().starts_with("Bearer fixture."));
                        let body = if provider == SubscriptionProvider::Claude {
                            assert_eq!(headers["anthropic-version"], "2023-06-01");
                            json!({"data": [{"id": "fixture-model", "display_name": "Fixture"}]})
                        } else {
                            assert!(headers.contains_key("originator"));
                            json!({"models": [{"slug": "fixture-model", "display_name": "Fixture"}]})
                        };
                        axum::Json(body).into_response()
                    }
                    "/limited" => (StatusCode::TOO_MANY_REQUESTS, [("retry-after", "120")])
                        .into_response(),
                    "/redirect" => (StatusCode::FOUND, [("location", "http://169.254.169.254/metadata")])
                        .into_response(),
                    _ => StatusCode::NOT_FOUND.into_response(),
                }
            }
        }));
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        Self {
            base,
            calls,
            reject_catalog,
            server,
        }
    }
}

fn access_token(expiry: i64) -> String {
    let claims = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .encode(json!({"exp": expiry / 1000}).to_string());
    format!("fixture.{claims}.signature")
}

fn document(provider: SubscriptionProvider, expiry: i64) -> String {
    match provider {
        SubscriptionProvider::Claude => json!({"claudeAiOauth": {
            "accessToken": access_token(expiry),
            "refreshToken": "fixture-login-refresh",
            "expiresAt": expiry,
            "scopes": ["user:inference"],
            "subscriptionType": "max"
        }}),
        SubscriptionProvider::Codex => json!({
            "auth_mode": "chatgpt",
            "tokens": {
                "access_token": access_token(expiry),
                "refresh_token": "fixture-login-refresh"
            },
            "last_refresh": "2026-10-09T00:00:00Z"
        }),
        _ => unreachable!("this fixture covers Claude and Codex"),
    }
    .to_string()
}

/// Every subscription connector uses this same test body, without vendor credentials.
async fn subscription_conformance(provider: SubscriptionProvider, proxied: bool) {
    let upstream = MockUpstream::start(provider).await;
    let root = tempfile::tempdir().unwrap();
    let home = root.path().join("home");
    let data = root.path().join("data");
    let proxy = proxied.then(|| EgressProxy::parse(&upstream.base).unwrap());
    let base = if proxied {
        "http://connector.invalid"
    } else {
        &upstream.base
    };
    let policy = if proxied {
        NetworkPolicy::default()
    } else {
        NetworkPolicy::parse(Some("loopback"))
    };
    let transport = ConnectorTransport::new(policy, proxy.as_ref()).unwrap();
    let connector = SubscriptionConnector::new(
        provider,
        &home,
        &data,
        transport,
        ConnectorEndpoints {
            token_url: format!("{base}/oauth/token"),
            catalog_base: base.to_string(),
        },
    )
    .unwrap();
    let contract: &dyn ProviderConnector<
        Provider = SubscriptionProvider,
        Credential = link_assistant_router::subscription::SubscriptionToken,
        CatalogEntry = link_assistant_router::model_catalog::CatalogRecord,
        QuotaState = AccountRouter,
    > = &connector;
    assert_eq!(contract.provider(), provider);
    assert_eq!(
        contract.login_flows(),
        if provider == SubscriptionProvider::Claude {
            &[LoginFlow::AuthorizationCode][..]
        } else {
            &[LoginFlow::DeviceCode, LoginFlow::Loopback][..]
        }
    );

    let now = chrono::Utc::now().timestamp_millis();
    let path = contract
        .complete_login(&document(provider, now + 3_600_000))
        .await
        .unwrap();
    assert_eq!(path, home.join(provider.canonical_credential_filename()));
    let reader = SubscriptionReader::new(provider, &home);
    let logged_in = reader.read_token().unwrap();
    assert!(logged_in.access_token.starts_with("fixture."));
    assert_eq!(
        logged_in.refresh_token.as_deref(),
        Some("fixture-successor-refresh")
    );

    // Seed a genuine near-expiry vendor document, then prove its successor can
    // be reread from disk instead of surviving only in the adapter's cache.
    reader
        .install_document(&document(provider, now + 240_000))
        .unwrap();
    let before = upstream.calls.lock().unwrap().len();
    let fresh = contract.fresh_token(now).await.unwrap();
    assert!(fresh.expires_at_ms.unwrap() > now + 240_000);
    let durable = reader.read_token().unwrap();
    assert_eq!(durable.access_token, fresh.access_token);
    assert_eq!(durable.refresh_token, fresh.refresh_token);
    assert!(durable.expires_at_ms.unwrap() > now + 240_000);
    assert_eq!(upstream.calls.lock().unwrap().len(), before + 1);
    let reopened = SubscriptionConnector::new(
        provider,
        &home,
        &data,
        connector.transport().clone(),
        ConnectorEndpoints {
            token_url: format!("{base}/oauth/token"),
            catalog_base: base.to_string(),
        },
    )
    .unwrap();
    assert_eq!(
        reopened.fresh_token(now).await.unwrap().access_token,
        fresh.access_token
    );
    assert_eq!(upstream.calls.lock().unwrap().len(), before + 1);
    assert_eq!(
        contract.fresh_token(now).await.unwrap().access_token,
        fresh.access_token
    );
    assert_eq!(upstream.calls.lock().unwrap().len(), before + 1);

    let catalog = contract.catalog(&fresh).await.unwrap();
    assert_eq!(catalog.len(), 1);
    assert_eq!(catalog[0].canonical_id, "fixture-model");
    assert_eq!(catalog[0].raw["display_name"], "Fixture");
    assert_eq!(catalog[0].provider, provider);

    let response = connector
        .transport()
        .request(reqwest::Method::GET, &format!("{base}/limited"))
        .unwrap()
        .send()
        .await
        .unwrap();
    let router =
        AccountRouter::new_for_provider(home, &[], provider, AccountRouterOptions::default());
    let outcome = contract
        .observe_upstream(
            &router,
            &UpstreamObservation {
                account: "primary",
                model: Some("fixture-model"),
                status: response.status().as_u16(),
                headers: response.headers(),
                body: b"",
                retry_after: None,
            },
        )
        .unwrap();
    assert!(outcome.credential_cooldown);
    assert_eq!(router.limit_counts().cooling_down, 1);
    assert!(router.health_snapshot()[0].cooldown_remaining.unwrap() > Duration::from_secs(60));
    assert!(contract.classify_error(429).is_some());
    assert!(contract.classify_error(400).is_none());

    // Failed acceptance must preserve the working primary byte for byte.
    let original = std::fs::read(&path).unwrap();
    upstream.reject_catalog.store(true, Ordering::Relaxed);
    let error = contract
        .complete_login(&document(provider, now + 3_600_000))
        .await
        .unwrap_err();
    assert!(error.contains("rejected"), "{error}");
    assert!(!error.contains("fixture-login-refresh"));
    assert_eq!(std::fs::read(&path).unwrap(), original);

    // Ownership markers survive staging and block spending external chains.
    let before = upstream.calls.lock().unwrap().len();
    let external = link_assistant_router::subscription::mark_external_refresh_owner(&document(
        provider,
        now + 3_600_000,
    ))
    .unwrap();
    assert!(contract.complete_login(&external).await.is_err());
    assert_eq!(upstream.calls.lock().unwrap().len(), before);
    assert_eq!(std::fs::read(path).unwrap(), original);
}

#[tokio::test]
async fn claude_connector_conforms() {
    tokio::time::timeout(
        Duration::from_secs(30),
        subscription_conformance(SubscriptionProvider::Claude, false),
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn codex_connector_conforms() {
    tokio::time::timeout(
        Duration::from_secs(30),
        subscription_conformance(SubscriptionProvider::Codex, false),
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn claude_connector_honors_proxy_for_login_refresh_and_catalog() {
    tokio::time::timeout(
        Duration::from_secs(30),
        subscription_conformance(SubscriptionProvider::Claude, true),
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn codex_connector_honors_proxy_for_login_refresh_and_catalog() {
    tokio::time::timeout(
        Duration::from_secs(30),
        subscription_conformance(SubscriptionProvider::Codex, true),
    )
    .await
    .unwrap();
}

#[tokio::test]
async fn credential_bearing_redirects_are_never_followed() {
    let upstream = MockUpstream::start(SubscriptionProvider::Claude).await;
    let transport = ConnectorTransport::new(NetworkPolicy::parse(Some("loopback")), None).unwrap();
    let response = transport
        .request(reqwest::Method::GET, &format!("{}/redirect", upstream.base))
        .unwrap()
        .bearer_auth("fixture-secret")
        .send()
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::FOUND);
    assert_eq!(upstream.calls.lock().unwrap().len(), 1);
}

#[test]
fn an_unreadable_proxy_never_falls_back_to_direct_egress() {
    let root = tempfile::tempdir().unwrap();
    let proxy =
        EgressProxy::parse(&format!("file:{}", root.path().join("absent").display())).unwrap();
    assert!(ConnectorTransport::new(NetworkPolicy::default(), Some(&proxy)).is_err());
}

#[tokio::test]
async fn guarded_dns_refuses_private_answers_at_dial_time() {
    use link_assistant_router::upstream_guard::GuardedResolver;
    let resolver = GuardedResolver::new(NetworkPolicy::default());
    let result = tokio::time::timeout(
        Duration::from_secs(10),
        resolver.resolve("localhost".parse().unwrap()),
    )
    .await
    .unwrap();
    assert!(result.is_err());
    let resolver = GuardedResolver::new(NetworkPolicy::parse(Some("loopback")));
    let addresses = tokio::time::timeout(
        Duration::from_secs(10),
        resolver.resolve("localhost".parse().unwrap()),
    )
    .await
    .unwrap()
    .unwrap();
    assert!(
        addresses
            .into_iter()
            .all(|address| address.ip().is_loopback())
    );
}

#[test]
fn configurable_endpoints_refuse_private_networks_before_sending_credentials() {
    for endpoint in [
        "http://127.0.0.1",
        "http://10.0.0.1",
        "http://169.254.169.254",
        "http://[::1]",
        "http://localhost",
        "http://[::ffff:10.0.0.1]",
        "ftp://example.com",
        "https://user:fixture-secret@example.com",
        "not a URL",
    ] {
        for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
            for token_endpoint in [false, true] {
                let transport = ConnectorTransport::new(NetworkPolicy::default(), None).unwrap();
                let root = tempfile::tempdir().unwrap();
                let mut endpoints = ConnectorEndpoints::for_provider(provider);
                if token_endpoint {
                    endpoints.token_url = endpoint.into();
                } else {
                    endpoints.catalog_base = endpoint.into();
                }
                assert!(
                    SubscriptionConnector::new(
                        provider,
                        root.path(),
                        root.path(),
                        transport,
                        endpoints
                    )
                    .is_err()
                );
            }
        }
    }
}

#[test]
fn observations_cannot_mutate_another_provider_pool() {
    let root = tempfile::tempdir().unwrap();
    let transport = ConnectorTransport::new(NetworkPolicy::default(), None).unwrap();
    let connector = SubscriptionConnector::new(
        SubscriptionProvider::Claude,
        root.path(),
        root.path(),
        transport,
        ConnectorEndpoints::for_provider(SubscriptionProvider::Claude),
    )
    .unwrap();
    let router = AccountRouter::new_for_provider(
        root.path().to_path_buf(),
        &[],
        SubscriptionProvider::Codex,
        AccountRouterOptions::default(),
    );
    assert!(
        connector
            .observe_upstream(
                &router,
                &UpstreamObservation {
                    account: "primary",
                    model: None,
                    status: 429,
                    headers: &HeaderMap::new(),
                    body: b"",
                    retry_after: None,
                }
            )
            .is_err()
    );
    assert_eq!(router.limit_counts().cooling_down, 0);
}
