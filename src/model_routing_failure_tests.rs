//! Hermetic automatic-routing and local-error logging regressions (#719).

use super::*;
use axum::middleware::from_fn_with_state;
use axum::routing::{any, get};
use tower::ServiceExt as _;

const OTHER_MODEL: &str = "another-generation-evidence-model";

#[test]
fn known_catalog_model_without_an_available_provider_is_an_account_error() {
    let catalog = ModelCatalogCache::new();
    catalog.record_success(SubscriptionProvider::Claude, vec![MODEL.into()]);
    assert!(matches!(
        available_provider_for_model(MODEL, &[], &catalog),
        Err(ModelRouteError::AccountUnavailable(_))
    ));
    assert!(matches!(
        available_provider_for_model("unknown", &[], &catalog),
        Err(ModelRouteError::NotFound(_))
    ));
}

struct FailureHarness {
    state: AppState,
    headers: HeaderMap,
    calls: Arc<Mutex<Vec<(String, String)>>>,
    task: tokio::task::JoinHandle<()>,
    data: TempDir,
    home: TempDir,
}

impl FailureHarness {
    async fn start() -> Self {
        let calls = Arc::new(Mutex::new(Vec::new()));
        let seen = Arc::clone(&calls);
        let upstream = axum::Router::new().fallback(
            move |headers: HeaderMap, axum::Json(body): axum::Json<Value>| {
                let seen = Arc::clone(&seen);
                async move {
                    let authorization = headers["authorization"].to_str().unwrap().to_string();
                    seen.lock().unwrap().push((
                        authorization.clone(),
                        body["model"].as_str().unwrap().to_string(),
                    ));
                    if authorization == "Bearer claude-access-a" {
                        (
                            StatusCode::UNAUTHORIZED,
                            axum::Json(json!({"error": {
                                "type": "authentication_error", "message": "synthetic rejection"
                            }})),
                        )
                    } else {
                        (StatusCode::OK, axum::Json(json!({"model": body["model"]})))
                    }
                }
            },
        );
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let task = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });
        let data = tempdir().unwrap();
        let home = tempdir().unwrap();
        let mut state = state_for(SubscriptionProvider::Claude, &data, &home, &base_url);
        state.upstream_provider = UpstreamProvider::Auto;
        state.model_catalogs.record_success(
            SubscriptionProvider::Claude,
            vec![MODEL.into(), OTHER_MODEL.into()],
        );
        let headers = managed_headers(&state, crate::clients::ClientKind::ClaudeCode);
        Self {
            state,
            headers,
            calls,
            task,
            data,
            home,
        }
    }

    fn app(&self) -> axum::Router {
        axum::Router::new()
            .route("/v1/messages", any(crate::proxy::proxy_handler))
            .route("/api/services/anthropic/v1/models", get(models))
            .with_state(self.state.clone())
            .layer(from_fn_with_state(
                self.state.clone(),
                crate::request_log::log_http_exchange,
            ))
    }

    async fn request(&self, model: &str, authorized: bool) -> (StatusCode, Value, Vec<Value>) {
        let marker = uuid::Uuid::new_v4().to_string();
        let mut request = Request::builder()
            .method("POST")
            .uri("/v1/messages")
            .header("content-type", "application/json")
            .body(Body::from(
                json!({
                    "model": model, "max_tokens": 8,
                    "messages": [{"role": "user", "content": "hello"}]
                })
                .to_string(),
            ))
            .unwrap();
        *request.headers_mut() = self.headers.clone();
        request
            .headers_mut()
            .insert("content-type", HeaderValue::from_static("application/json"));
        request
            .headers_mut()
            .insert("x-test-marker", marker.parse().unwrap());
        if !authorized {
            request
                .headers_mut()
                .insert("x-api-key", HeaderValue::from_static("la_sk_invalid"));
        }
        let response = tokio::time::timeout(
            std::time::Duration::from_secs(5),
            self.app().oneshot(request),
        )
        .await
        .expect("loopback request must finish")
        .unwrap();
        let status = response.status();
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        let body = serde_json::from_slice(&bytes).unwrap();
        let records = fs::read_dir(self.state.request_log.path())
            .unwrap()
            .flat_map(|directory| {
                fs::read_to_string(directory.unwrap().path().join("requests.lino"))
                    .unwrap()
                    .lines()
                    .filter_map(crate::lino_json::decode_line)
                    .collect::<Vec<_>>()
            })
            .collect::<Vec<_>>();
        let correlation = records
            .iter()
            .find(|record| {
                record["phase"] == "client_request" && record["headers"]["x-test-marker"] == marker
            })
            .unwrap()["correlation_id"]
            .clone();
        let exchange = records
            .into_iter()
            .filter(|record| record["correlation_id"] == correlation)
            .collect();
        (status, body, exchange)
    }

    async fn catalog(&self) -> Value {
        let mut request = Request::builder()
            .uri("/api/services/anthropic/v1/models")
            .body(Body::empty())
            .unwrap();
        *request.headers_mut() = self.headers.clone();
        let response = self.app().oneshot(request).await.unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = response.into_body().collect().await.unwrap().to_bytes();
        serde_json::from_slice(&bytes).unwrap()
    }

    fn replace_credential(&self, home: &TempDir) {
        fs::write(home.path().join(".credentials.json"), json!({
            "claudeAiOauth": {"accessToken": "claude-access-b", "expiresAt": 9_999_999_999_999_i64}
        }).to_string()).unwrap();
    }
}

impl Drop for FailureHarness {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn assert_local_error(body: &Value, records: &[Value]) {
    assert_eq!(
        records
            .iter()
            .filter(|record| record["phase"] == "client_request")
            .count(),
        1
    );
    assert_eq!(
        records
            .iter()
            .filter(|record| record["phase"] == "client_response")
            .count(),
        1
    );
    assert!(
        records
            .iter()
            .all(|record| !record["phase"].as_str().unwrap().starts_with("upstream"))
    );
    let response = records
        .iter()
        .find(|record| record["phase"] == "client_response_body")
        .expect("consumed local error body is preserved in file logs");
    assert_eq!(response["body"], *body);
    let text = serde_json::to_string(records).unwrap();
    assert!(!text.contains("claude-access-a"));
    assert!(!text.contains("claude-access-b"));
}

#[tokio::test]
async fn unknown_model_and_invalid_client_errors_are_recorded() {
    let fixture = FailureHarness::start().await;
    for (model, authorized, expected) in [
        ("genuinely-unknown-model", true, StatusCode::NOT_FOUND),
        (MODEL, false, StatusCode::UNAUTHORIZED),
    ] {
        let (status, body, records) = fixture.request(model, authorized).await;
        assert_eq!(status, expected, "{body}");
        assert_local_error(&body, &records);
    }
    assert!(fixture.calls.lock().unwrap().is_empty());
}

#[tokio::test]
async fn rejected_account_is_unavailable_for_every_known_model_and_logs_local_errors() {
    let fixture = FailureHarness::start().await;
    let catalog = fixture.catalog().await;
    assert_eq!(catalog["data"].as_array().unwrap().len(), 2, "{catalog}");
    assert_eq!(
        fixture.request(MODEL, true).await.0,
        StatusCode::UNAUTHORIZED
    );
    assert_rejected(&fixture.state, SubscriptionProvider::Claude);
    assert!(
        fixture.catalog().await["data"]
            .as_array()
            .unwrap()
            .is_empty()
    );
    for model in [MODEL, OTHER_MODEL] {
        let (status, body, records) = fixture.request(model, true).await;
        assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
        assert_eq!(body["error"]["type"], "account_unavailable");
        let message = body["error"]["message"].as_str().unwrap();
        assert!(
            message.contains(model) && message.contains("claude"),
            "{message}"
        );
        assert!(
            message.contains("rejected") && message.contains("re-authenticate"),
            "{message}"
        );
        assert!(!message.contains(&*fixture.home.path().to_string_lossy()));
        assert_local_error(&body, &records);
    }
    let (status, body, records) = fixture.request("genuinely-unknown-model", true).await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(body["error"]["type"], "not_found_error");
    assert_local_error(&body, &records);
    let (status, body, records) = fixture.request(MODEL, false).await;
    assert_eq!(status, StatusCode::UNAUTHORIZED);
    assert_eq!(body["error"]["type"], "authentication_error");
    assert_local_error(&body, &records);
    assert_eq!(
        fixture.calls.lock().unwrap().as_slice(),
        [("Bearer claude-access-a".into(), MODEL.into())]
    );
}

#[tokio::test]
async fn changed_credential_clears_rejection_and_preserves_requested_models() {
    let fixture = FailureHarness::start().await;
    assert_eq!(
        fixture.request(MODEL, true).await.0,
        StatusCode::UNAUTHORIZED
    );
    assert_rejected(&fixture.state, SubscriptionProvider::Claude);
    fixture.replace_credential(&fixture.home);
    assert_eq!(fixture.catalog().await["data"].as_array().unwrap().len(), 2);
    assert_ne!(
        fixture
            .state
            .subscription_cache
            .evidence(SubscriptionProvider::Claude),
        Some(crate::refresh::CredentialEvidence::Rejected)
    );
    for model in [MODEL, OTHER_MODEL] {
        let (status, body, _) = fixture.request(model, true).await;
        assert_eq!(status, StatusCode::OK, "{body}");
        assert_eq!(body["model"], model);
    }
    assert_eq!(
        fixture.calls.lock().unwrap().as_slice(),
        [
            ("Bearer claude-access-a".into(), MODEL.into()),
            ("Bearer claude-access-b".into(), MODEL.into()),
            ("Bearer claude-access-b".into(), OTHER_MODEL.into()),
        ]
    );
}

#[tokio::test]
async fn healthy_pool_account_serves_the_same_model_after_primary_rejection() {
    let mut fixture = FailureHarness::start().await;
    assert_eq!(
        fixture.request(MODEL, true).await.0,
        StatusCode::UNAUTHORIZED
    );
    let healthy = tempdir().unwrap();
    fixture.replace_credential(&healthy);
    let router = crate::accounts::AccountRouter::new_for_provider(
        fixture.home.path().to_path_buf(),
        &[healthy.path().to_path_buf()],
        SubscriptionProvider::Claude,
        crate::accounts::AccountRouterOptions::default(),
    );
    router.register_credential_stores_in(&fixture.state.subscription_cache, fixture.data.path());
    fixture.state.account_router = Some(router);
    fixture.state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Claude,
        "account-1",
        None,
        vec![MODEL.into()],
    );
    // A primary pin cannot use the healthy neighbour, even for the same model.
    assert!(
        fixture.catalog().await["data"]
            .as_array()
            .unwrap()
            .is_empty()
    );
    let (status, body, records) = fixture.request(MODEL, true).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
    assert_eq!(body["error"]["type"], "account_unavailable");
    assert_local_error(&body, &records);
    assert_eq!(fixture.calls.lock().unwrap().len(), 1);
    let token = super::super::tests::bound_client_token(
        &fixture.state,
        crate::clients::ClientKind::ClaudeCode,
        Some("account-1"),
    );
    fixture.headers.insert("x-api-key", token.parse().unwrap());
    let catalog = fixture.catalog().await;
    assert_eq!(catalog["data"].as_array().unwrap().len(), 1);
    assert_eq!(catalog["data"][0]["id"], MODEL);
    let (status, body, _) = fixture.request(MODEL, true).await;
    assert_eq!(status, StatusCode::OK, "{body}");
    assert_eq!(body["model"], MODEL);
    let (status, body, records) = fixture.request(OTHER_MODEL, true).await;
    assert_eq!(status, StatusCode::SERVICE_UNAVAILABLE, "{body}");
    assert_eq!(body["error"]["type"], "account_unavailable");
    assert!(
        body["error"]["message"]
            .as_str()
            .unwrap()
            .contains(OTHER_MODEL)
    );
    assert_local_error(&body, &records);
    assert_eq!(
        fixture.calls.lock().unwrap().as_slice(),
        [
            ("Bearer claude-access-a".into(), MODEL.into()),
            ("Bearer claude-access-b".into(), MODEL.into()),
        ]
    );
}
