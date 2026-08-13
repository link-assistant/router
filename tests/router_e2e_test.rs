//! Client-boundary tests that run the real router against a stubbed vendor.
//!
//! Unlike the translation unit tests, these assertions cross both HTTP
//! boundaries: client -> router -> upstream and back again.

use std::fmt::Write as _;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::middleware::from_fn_with_state;
use axum::response::Response;
use axum::routing::{get, post};
use link_assistant_router::app_state::AppState;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::proxy;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::token::TokenManager;
use serde_json::{Value, json};
use sha2::{Digest as _, Sha256};
use tempfile::TempDir;

#[derive(Clone, Copy)]
enum StubDialect {
    Anthropic,
    Codex,
}

#[derive(Clone)]
struct StubState {
    dialect: StubDialect,
    requests: Arc<Mutex<Vec<Value>>>,
    invalid_body: bool,
}

struct TestRouter {
    client: reqwest::Client,
    url: String,
    token: String,
    token_manager: TokenManager,
    requests: Arc<Mutex<Vec<Value>>>,
    log_root: std::path::PathBuf,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl TestRouter {
    async fn start(provider: UpstreamProvider) -> Self {
        Self::start_with_invalid_body(provider, false).await
    }

    async fn start_with_invalid_body(provider: UpstreamProvider, invalid_body: bool) -> Self {
        let data = tempfile::tempdir().expect("temporary test data");
        let dialect = if provider == UpstreamProvider::Codex {
            StubDialect::Codex
        } else {
            StubDialect::Anthropic
        };
        let requests = Arc::new(Mutex::new(Vec::new()));
        let stub_state = StubState {
            dialect,
            requests: Arc::clone(&requests),
            invalid_body,
        };
        let stub = Router::new().fallback(stub_vendor).with_state(stub_state);
        let (stub_url, stub_task) = spawn(stub).await;

        let token_manager = TokenManager::new("router-e2e-secret");
        let token = token_manager
            .issue_token(1, "router e2e client")
            .expect("issue test token");
        let oauth_provider = OAuthProvider::new(data.path().to_str().expect("UTF-8 test path"));
        oauth_provider.set_token("stub-anthropic-oauth-token");

        let codex_home = data.path().join("codex");
        std::fs::create_dir_all(&codex_home).expect("create Codex home");
        std::fs::write(
            codex_home.join("auth.json"),
            r#"{"tokens":{"access_token":"stub-codex-oauth-token","account_id":"acct_stub"}}"#,
        )
        .expect("write Codex credentials");
        let subscription_reader = (provider == UpstreamProvider::Codex)
            .then(|| SubscriptionReader::new(SubscriptionProvider::Codex, &codex_home));

        let log_root = data.path().join("requests");
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager: token_manager.clone(),
            oauth_provider,
            account_router: None,
            subscription_reader,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers: Vec::new(),
            model_catalogs: Arc::new(ModelCatalogCache::new()),
            subscription_cache: Arc::new(TokenCache::new()),
            upstream_base_url: stub_url,
            upstream_provider: provider,
            gonka: None,
            bridge_model: Some("gpt-5".to_string()),
            crater: None,
            openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
            provider_store: link_assistant_router::providers::ProviderStore::open(
                data.path(),
                "router-e2e-secret",
            )
            .expect("provider store"),
            logger: log_lazy::LogLazy::new(),
            admin: Arc::new(link_assistant_router::admin::AdminClaim::load(
                Some("admin-only".to_string()),
                data.path(),
                Duration::from_secs(60),
            )),
            admin_key: Some("admin-only".to_string()),
            allow_anonymous_admin: false,
            metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
            audit: Arc::new(link_assistant_router::audit::AuditLog::to_path(None)),
            request_log: Arc::new(link_assistant_router::request_log::RequestLog::new(
                log_root.clone(),
                1024 * 1024,
            )),
            activitypub_actor_base_url: "https://router.test".to_string(),
            activitypub_public_key_pem:
                link_assistant_router::config::default_activitypub_public_key_pem(),
            mpp: link_assistant_router::config::default_mpp_config(),
            login_manager: link_assistant_router::login::LoginManager::new(
                link_assistant_router::login::LoginConfig::default(),
            ),
        };
        let app = test_app(state);
        let (url, router_task) = spawn(app).await;

        Self {
            client: reqwest::Client::new(),
            url,
            token,
            token_manager,
            requests,
            log_root,
            tasks: vec![stub_task, router_task],
            _data: data,
        }
    }

    fn post(&self, path: &str, body: &Value) -> reqwest::RequestBuilder {
        self.client
            .post(format!("{}{path}", self.url))
            .bearer_auth(&self.token)
            .json(&body)
    }

    fn get(&self, path: &str) -> reqwest::RequestBuilder {
        self.client
            .get(format!("{}{path}", self.url))
            .bearer_auth(&self.token)
    }

    fn log_path_for(&self, token: &str) -> std::path::PathBuf {
        let digest = hex::encode(Sha256::digest(token.as_bytes()));
        self.log_root.join(&digest[..32]).join("requests.jsonl")
    }
}

impl Drop for TestRouter {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
}

fn test_app(state: AppState) -> Router {
    let logging_state = state.clone();
    Router::new()
        .route("/v1/messages", post(proxy::proxy_handler))
        .route("/api/anthropic/v1/messages", post(proxy::proxy_handler))
        .route("/v1/chat/completions", post(proxy::openai_chat_completions))
        .route(
            "/api/openai/v1/chat/completions",
            post(proxy::openai_chat_completions),
        )
        .route(
            "/api/codex/v1/chat/completions",
            post(proxy::openai_chat_completions),
        )
        .route(
            "/api/qwen/v1/chat/completions",
            post(proxy::openai_chat_completions),
        )
        .route("/v1/responses", post(proxy::openai_responses))
        .route("/api/openai/v1/responses", post(proxy::openai_responses))
        .route("/api/codex/v1/responses", post(proxy::openai_responses))
        .route("/api/qwen/v1/responses", post(proxy::openai_responses))
        .route("/v1/models", get(proxy::openai_models))
        .route("/api/anthropic/v1/models", get(proxy::openai_models))
        .route("/api/openai/v1/models", get(proxy::openai_models))
        .route("/api/codex/v1/models", get(proxy::openai_models))
        .route("/api/qwen/v1/models", get(proxy::openai_models))
        .route("/test/large-request", post(accept_large_request))
        .route(
            "/api/tokens/list",
            get(link_assistant_router::token_admin::list_tokens),
        )
        .with_state(state)
        .layer(from_fn_with_state(
            logging_state,
            link_assistant_router::request_log::log_http_exchange,
        ))
}

async fn accept_large_request(request: Request) -> Response {
    let body = to_bytes(request.into_body(), 12 * 1024 * 1024)
        .await
        .expect("read large request");
    Response::new(Body::from(body.len().to_string()))
}

async fn spawn(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind test server");
    let address = listener.local_addr().expect("test server address");
    let task = tokio::spawn(async move {
        axum::serve(listener, app).await.expect("serve test app");
    });
    (format!("http://{address}"), task)
}

async fn stub_vendor(State(state): State<StubState>, request: Request) -> Response {
    let body = to_bytes(request.into_body(), 1024 * 1024)
        .await
        .expect("read stub request");
    let body = serde_json::from_slice::<Value>(&body).unwrap_or(Value::Null);
    state
        .requests
        .lock()
        .expect("stub request lock")
        .push(body.clone());

    if state.invalid_body {
        return Response::new(Body::from(
            "internal safety_identifier and prompt_cache_key must stay private",
        ));
    }

    let stream = body.get("stream").and_then(Value::as_bool) == Some(true);
    let mut response = match state.dialect {
        StubDialect::Anthropic if stream => Response::new(Body::from(anthropic_stream())),
        StubDialect::Anthropic => Response::new(Body::from(
            serde_json::to_vec(&anthropic_message()).expect("serialize Anthropic response"),
        )),
        StubDialect::Codex => Response::new(Body::from(codex_stream())),
    };
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static(match (state.dialect, stream) {
            (StubDialect::Anthropic, true) => "text/event-stream",
            _ => "application/json",
        }),
    );
    response.headers_mut().insert(
        "x-ratelimit-remaining-requests",
        HeaderValue::from_static("41"),
    );
    response.headers_mut().insert(
        "anthropic-ratelimit-unified-reset",
        HeaderValue::from_static("1786546200"),
    );
    response.headers_mut().insert(
        "request-id",
        HeaderValue::from_static("req_anthropic_stub_123"),
    );
    response
        .headers_mut()
        .insert("x-codex-active-limit", HeaderValue::from_static("primary"));
    response
        .headers_mut()
        .insert("x-oai-request-id", HeaderValue::from_static("req_stub_123"));
    response
}

fn anthropic_message() -> Value {
    json!({
        "id": "msg_stub",
        "type": "message",
        "role": "assistant",
        "model": "claude-sonnet-4-5",
        "content": [{"type": "text", "text": "stub answer"}],
        "stop_reason": "end_turn",
        "stop_sequence": null,
        "usage": {"input_tokens": 3, "output_tokens": 2}
    })
}

fn anthropic_stream() -> String {
    let message = anthropic_message();
    [
        format!("event: message_start\ndata: {}\n\n", json!({"type":"message_start","message":message})),
        format!("event: content_block_start\ndata: {}\n\n", json!({"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}})),
        format!("event: content_block_delta\ndata: {}\n\n", json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"stub answer"}})),
        format!("event: content_block_stop\ndata: {}\n\n", json!({"type":"content_block_stop","index":0})),
        format!("event: message_delta\ndata: {}\n\n", json!({"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":2}})),
        format!("event: message_stop\ndata: {}\n\n", json!({"type":"message_stop"})),
    ]
    .concat()
}

fn codex_stream() -> String {
    let response = json!({
        "id": "resp_stub",
        "object": "response",
        "status": "completed",
        "model": "gpt-5",
        "output": [{
            "id": "msg_stub",
            "type": "message",
            "status": "completed",
            "role": "assistant",
            "content": [{"type": "output_text", "text": "stub answer", "annotations": []}]
        }],
        "usage": {"input_tokens": 3, "output_tokens": 2, "total_tokens": 5}
    });
    let events = [
        json!({"type":"response.created","response":{"id":"resp_stub","status":"in_progress","model":"gpt-5","output":[]}}),
        json!({"type":"response.in_progress","response":{"id":"resp_stub","status":"in_progress"}}),
        json!({"type":"response.output_item.added","output_index":0,"item":{"id":"msg_stub","type":"message","status":"in_progress","role":"assistant","content":[]}}),
        json!({"type":"response.content_part.added","item_id":"msg_stub","output_index":0,"content_index":0,"part":{"type":"output_text","text":"","annotations":[]}}),
        json!({"type":"response.output_text.delta","item_id":"msg_stub","output_index":0,"content_index":0,"delta":"stub answer"}),
        json!({"type":"response.output_text.done","item_id":"msg_stub","output_index":0,"content_index":0,"text":"stub answer"}),
        json!({"type":"response.content_part.done","item_id":"msg_stub","output_index":0,"content_index":0,"part":{"type":"output_text","text":"stub answer","annotations":[]}}),
        json!({"type":"response.output_item.done","output_index":0,"item":{"id":"msg_stub","type":"message","status":"completed","role":"assistant","content":[{"type":"output_text","text":"stub answer","annotations":[]}]}}),
        json!({"type":"response.completed","response":response}),
    ];
    let mut stream = String::new();
    for event in events {
        write!(
            stream,
            "event: {}\ndata: {event}\n\n",
            event["type"].as_str().expect("event type")
        )
        .expect("write SSE frame");
    }
    stream.push_str("data: [DONE]\n\n");
    stream
}

#[tokio::test]
async fn request_larger_than_logging_buffer_reaches_handler() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let body = vec![b'x'; 10 * 1024 * 1024 + 1];

    let response = router
        .client
        .post(format!("{}/test/large-request", router.url))
        .body(body)
        .send()
        .await
        .expect("large request response");

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.text().await.expect("large response body"),
        (10 * 1024 * 1024 + 1).to_string()
    );
    let log = std::fs::read_to_string(router.log_root.join("unauthenticated/requests.jsonl"))
        .expect("request log");
    assert!(log.contains("client_request"));
    assert!(log.contains("[OMITTED:"));
    assert!(!log.contains("client_request_error"));
}

#[tokio::test]
async fn anthropic_upstream_returns_each_client_dialect_and_pinned_alias() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let cases = [
        (
            "/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
            "content",
        ),
        (
            "/api/anthropic/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
            "content",
        ),
        (
            "/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
            "choices",
        ),
        (
            "/api/codex/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
            "choices",
        ),
        (
            "/api/qwen/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
            "choices",
        ),
        (
            "/api/openai/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
            "output",
        ),
        (
            "/api/qwen/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
            "output",
        ),
    ];

    for (path, body, envelope) in cases {
        let response = router
            .post(path, &body)
            .send()
            .await
            .expect("router response");
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        let payload: Value = response.json().await.expect("JSON client response");
        assert!(
            payload[envelope].is_array(),
            "{path} must return {envelope}[]"
        );
    }
}

#[tokio::test]
async fn anthropic_upstream_relays_vendor_headers_across_client_dialects() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let cases = [
        (
            "/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":64,"messages":[{"role":"user","content":"hi"}]}),
        ),
        (
            "/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
        ),
        (
            "/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
        ),
    ];

    for (path, body) in cases {
        let response = router
            .post(path, &body)
            .send()
            .await
            .expect("router response");
        assert_eq!(response.status(), StatusCode::OK, "{path}");
        assert_eq!(
            response
                .headers()
                .get("anthropic-ratelimit-unified-reset")
                .and_then(|value| value.to_str().ok()),
            Some("1786546200"),
            "{path} must relay Anthropic quota headers"
        );
        assert_eq!(
            response
                .headers()
                .get("request-id")
                .and_then(|value| value.to_str().ok()),
            Some("req_anthropic_stub_123"),
            "{path} must relay the vendor request ID"
        );
    }
}

#[tokio::test]
async fn responses_stream_has_complete_named_lifecycle() {
    for (provider, model) in [
        (UpstreamProvider::Anthropic, "claude-sonnet-4-5"),
        (UpstreamProvider::Codex, "gpt-5"),
    ] {
        let router = TestRouter::start(provider).await;
        let response = router
            .post(
                "/v1/responses",
                &json!({"model":model,"input":"hi","stream":true}),
            )
            .send()
            .await
            .expect("streaming response");
        assert_eq!(response.status(), StatusCode::OK);
        let stream = response.text().await.expect("SSE body");
        let names = stream
            .lines()
            .filter_map(|line| line.strip_prefix("event: "))
            .collect::<Vec<_>>();
        assert_eq!(
            names,
            [
                "response.created",
                "response.in_progress",
                "response.output_item.added",
                "response.content_part.added",
                "response.output_text.delta",
                "response.output_text.done",
                "response.content_part.done",
                "response.output_item.done",
                "response.completed",
            ],
            "wrong lifecycle for {model}"
        );
        assert!(stream.trim_end().ends_with("data: [DONE]"));
    }
}

#[tokio::test]
async fn codex_upstream_is_translated_and_relays_vendor_headers() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    let response = router
        .post(
            "/v1/chat/completions",
            &json!({
                "model":"gpt-5",
                "messages":[{"role":"user","content":"hi"}],
                "tools":[{"type":"function","function":{"name":"lookup","description":"look up a value","parameters":{"type":"object"}}}]
            }),
        )
        .header("x-test-marker", "client-boundary-marker")
        .send()
        .await
        .expect("chat completion response");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-codex-active-limit").is_none());
    assert_eq!(response.headers()["x-ratelimit-remaining-requests"], "41");
    assert_eq!(response.headers()["x-oai-request-id"], "req_stub_123");
    let chat: Value = response.json().await.expect("chat completion JSON");
    assert_eq!(chat["object"], "chat.completion");
    assert_eq!(chat["choices"][0]["message"]["content"], "stub answer");

    let response = router
        .post(
            "/api/codex/v1/responses",
            &json!({"model":"gpt-5","input":"hi"}),
        )
        .send()
        .await
        .expect("Responses response");
    assert_eq!(response.status(), StatusCode::OK);
    assert!(response.headers().get("x-codex-active-limit").is_none());
    assert_eq!(response.headers()["x-ratelimit-remaining-requests"], "41");
    let responses: Value = response.json().await.expect("Responses JSON");
    assert_eq!(responses["object"], "response");
    assert!(responses["output"].is_array());

    let requests = router.requests.lock().expect("stub requests");
    let translated_tools = requests[0]["tools"].as_array().expect("translated tools");
    assert_eq!(translated_tools[0]["name"], "lookup");
    assert_eq!(translated_tools[0]["type"], "function");
    assert!(translated_tools[0].get("function").is_none());
    drop(requests);

    let records =
        std::fs::read_to_string(router.log_path_for(&router.token)).expect("request exchange log");
    let records = records
        .lines()
        .map(|line| serde_json::from_str::<Value>(line).expect("valid JSONL record"))
        .collect::<Vec<_>>();
    let correlation_id = records
        .iter()
        .find(|record| {
            record["phase"] == "client_request"
                && record.to_string().contains("client-boundary-marker")
        })
        .and_then(|record| record["correlation_id"].as_str())
        .expect("marked client request")
        .to_string();
    let exchange = records
        .iter()
        .filter(|record| record["correlation_id"] == correlation_id)
        .collect::<Vec<_>>();
    for phase in [
        "client_request",
        "upstream_request",
        "upstream_response",
        "upstream_response_body",
        "client_response",
        "client_response_body",
    ] {
        assert!(
            exchange.iter().any(|record| record["phase"] == phase),
            "missing {phase} for one correlation id"
        );
    }
    let rendered = exchange
        .iter()
        .map(std::string::ToString::to_string)
        .collect::<String>();
    assert!(rendered.contains("client-boundary-marker"));
    assert!(rendered.contains("[REDACTED]"));
    assert!(!rendered.contains(&router.token));
}

#[tokio::test]
async fn request_logs_are_isolated_and_attributed_by_valid_token() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let second_token = router
        .token_manager
        .issue_token(1, "second e2e client")
        .expect("issue second token");

    for (token, marker) in [
        (&router.token, "first-token-marker"),
        (&second_token, "second-token-marker"),
    ] {
        let response = router
            .client
            .post(format!("{}/v1/messages", router.url))
            .bearer_auth(token)
            .header("x-test-marker", marker)
            .json(&json!({
                "model":"claude-sonnet-4-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }))
            .send()
            .await
            .expect("router response");
        assert_eq!(response.status(), StatusCode::OK);
        let _ = response.bytes().await.expect("response body");
    }

    let first =
        std::fs::read_to_string(router.log_path_for(&router.token)).expect("first token log");
    let second =
        std::fs::read_to_string(router.log_path_for(&second_token)).expect("second token log");
    assert!(first.contains("first-token-marker"));
    assert!(!first.contains("second-token-marker"));
    assert!(second.contains("second-token-marker"));
    assert!(!second.contains("first-token-marker"));

    for (log, token, label) in [
        (&first, &router.token, "router e2e client"),
        (&second, &second_token, "second e2e client"),
    ] {
        let claims = router
            .token_manager
            .validate_token(token)
            .expect("valid token");
        let records = log
            .lines()
            .map(|line| serde_json::from_str::<Value>(line).expect("valid JSONL"))
            .collect::<Vec<_>>();
        for phase in [
            "client_request",
            "upstream_request",
            "upstream_response",
            "upstream_response_body",
            "client_response",
            "client_response_body",
        ] {
            let record = records
                .iter()
                .find(|record| record["phase"] == phase)
                .unwrap_or_else(|| panic!("missing {phase}"));
            assert_eq!(record["token_id"], claims.sub);
            assert_eq!(record["token_label"], label);
            assert_eq!(
                record["token_hash"],
                router
                    .log_path_for(token)
                    .parent()
                    .and_then(std::path::Path::file_name)
                    .and_then(std::ffi::OsStr::to_str)
                    .expect("token hash")
            );
        }
    }
}

#[tokio::test]
async fn auth_unknown_models_and_admin_isolation() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for path in [
        "/v1/models",
        "/api/anthropic/v1/models",
        "/api/openai/v1/models",
        "/api/codex/v1/models",
        "/api/qwen/v1/models",
    ] {
        let missing = router
            .client
            .get(format!("{}{path}", router.url))
            .send()
            .await
            .expect("missing-token response");
        assert_eq!(missing.status(), StatusCode::UNAUTHORIZED, "{path}");
        let malformed = router
            .client
            .get(format!("{}{path}", router.url))
            .bearer_auth("not-a-router-token")
            .send()
            .await
            .expect("malformed-token response");
        assert_eq!(malformed.status(), StatusCode::UNAUTHORIZED, "{path}");
    }

    for (path, body) in [
        (
            "/v1/messages",
            json!({"model":"claude-sonnet-4-5","max_tokens":16,"messages":[{"role":"user","content":"hi"}]}),
        ),
        (
            "/v1/chat/completions",
            json!({"model":"claude-sonnet-4-5","messages":[{"role":"user","content":"hi"}]}),
        ),
        (
            "/v1/responses",
            json!({"model":"claude-sonnet-4-5","input":"hi"}),
        ),
    ] {
        let missing = router
            .client
            .post(format!("{}{path}", router.url))
            .json(&body)
            .send()
            .await
            .expect("missing-token inference response");
        assert_eq!(missing.status(), StatusCode::UNAUTHORIZED, "{path}");
        let malformed = router
            .client
            .post(format!("{}{path}", router.url))
            .bearer_auth("not-a-router-token")
            .json(&body)
            .send()
            .await
            .expect("malformed-token inference response");
        assert_eq!(malformed.status(), StatusCode::UNAUTHORIZED, "{path}");
    }

    let unknown = router
        .post(
            "/v1/responses",
            &json!({"model":"definitely-not-a-model","input":"hi"}),
        )
        .send()
        .await
        .expect("unknown-model response");
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);
    assert!(
        unknown
            .text()
            .await
            .expect("error body")
            .contains("not available")
    );

    let admin = router
        .get("/api/tokens/list")
        .send()
        .await
        .expect("admin response");
    assert_eq!(admin.status(), StatusCode::UNAUTHORIZED);
}

#[tokio::test]
async fn codex_output_limit_policy_distinguishes_client_surfaces() {
    let codex = TestRouter::start(UpstreamProvider::Codex).await;

    // Messages requires max_tokens, so its required protocol field must not
    // make the entire Anthropic surface unusable with a Codex subscription.
    let messages = codex
        .post(
            "/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }),
        )
        .send()
        .await
        .expect("capped Codex Messages response");
    assert_eq!(messages.status(), StatusCode::OK);
    assert!(messages.headers().get("x-codex-active-limit").is_none());
    assert_eq!(messages.headers()["x-ratelimit-remaining-requests"], "41");
    assert!(
        messages
            .headers()
            .get("warning")
            .and_then(|value| value.to_str().ok())
            .is_some_and(|value| value.contains("max_tokens"))
    );
    assert_eq!(
        messages
            .headers()
            .get("x-link-assistant-output-limit")
            .and_then(|value| value.to_str().ok()),
        Some("unsupported")
    );
    let payload: Value = messages.json().await.expect("Messages JSON response");
    assert!(payload["content"].is_array());

    {
        let requests = codex.requests.lock().expect("stub requests");
        assert_eq!(requests.len(), 1);
        assert!(
            requests[0].get("max_output_tokens").is_none(),
            "the unsupported field must still be omitted from the Codex request"
        );
        drop(requests);
    }

    // A Messages request without its required field is a protocol error, not
    // an unsupported-Codex-cap error, and must not reach the subscription.
    let missing = codex
        .post(
            "/v1/messages",
            &json!({"model":"gpt-5","messages":[{"role":"user","content":"hi"}]}),
        )
        .send()
        .await
        .expect("missing max_tokens response");
    assert_eq!(missing.status(), StatusCode::BAD_REQUEST);
    let missing_payload: Value = missing.json().await.expect("Messages error response");
    assert_eq!(missing_payload["error"]["type"], "invalid_request_error");
    assert!(
        missing_payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.contains("max_tokens is required"))
    );

    // The optional caps on both OpenAI surfaces retain PR #103's explicit
    // rejection, including both Chat Completions spellings.
    for (path, body) in [
        (
            "/v1/responses",
            json!({"model":"gpt-5","input":"hi","max_output_tokens":16}),
        ),
        (
            "/v1/chat/completions",
            json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }),
        ),
        (
            "/v1/chat/completions",
            json!({
                "model":"gpt-5",
                "max_completion_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }),
        ),
    ] {
        let capped = codex
            .post(path, &body)
            .send()
            .await
            .expect("capped Codex OpenAI response");
        assert_eq!(capped.status(), StatusCode::BAD_REQUEST, "{path}");
        let message = capped.text().await.expect("limit error body");
        assert!(
            message.contains("cannot honor output-token limits"),
            "{path}"
        );
    }

    assert_eq!(
        codex.requests.lock().expect("stub requests").len(),
        1,
        "rejected requests must not reach the Codex subscription"
    );
}

#[tokio::test]
async fn malformed_json_uses_each_http_surfaces_json_error_envelope() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    for path in ["/v1/messages", "/v1/chat/completions", "/v1/responses"] {
        let response = router
            .client
            .post(format!("{}{path}", router.url))
            .bearer_auth(&router.token)
            .header("content-type", "application/json")
            .body(r#"{"model":"gpt-5",broken"#)
            .send()
            .await
            .expect("malformed JSON response");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{path}");
        assert_eq!(
            response
                .headers()
                .get("content-type")
                .and_then(|value| value.to_str().ok()),
            Some("application/json"),
            "{path}"
        );
        let payload: Value = response.json().await.expect("JSON error envelope");
        assert_eq!(payload["error"]["type"], "invalid_request_error", "{path}");
        assert!(
            payload["error"]["message"]
                .as_str()
                .is_some_and(|message| message.to_ascii_lowercase().contains("json")),
            "{path}: {payload}"
        );
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());

    let auto = TestRouter::start(UpstreamProvider::Auto).await;
    let response = auto
        .client
        .post(format!("{}/v1/messages", auto.url))
        .bearer_auth(&auto.token)
        .header("content-type", "application/json")
        .body(r#"{"model":"gpt-5",broken"#)
        .send()
        .await
        .expect("automatic-routing malformed JSON response");
    let payload: Value = response.json().await.expect("JSON error envelope");
    assert_eq!(payload["error"]["type"], "invalid_request_error");
    assert!(
        payload["error"]["message"]
            .as_str()
            .is_some_and(|message| message.to_ascii_lowercase().contains("json"))
    );
}

#[tokio::test]
async fn empty_messages_is_reported_in_the_anthropic_dialect() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    for body in [
        json!({"model":"gpt-5","max_tokens":16,"messages":[]}),
        json!({"model":"gpt-5","max_tokens":16}),
    ] {
        let response = router
            .post("/v1/messages", &body)
            .send()
            .await
            .expect("invalid Messages response");
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
        let payload: Value = response.json().await.expect("Anthropic error envelope");
        assert_eq!(payload["error"]["type"], "invalid_request_error");
        let message = payload["error"]["message"].as_str().expect("error message");
        assert!(message.contains("messages"), "{message}");
        for leaked in ["input", "previous_response_id", "prompt", "conversation"] {
            assert!(!message.contains(leaked), "leaked {leaked}: {message}");
        }
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());
}

#[tokio::test]
async fn translated_streams_preserve_usage_in_the_client_dialect() {
    let router = TestRouter::start(UpstreamProvider::Codex).await;

    let anthropic = router
        .post(
            "/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}],
                "stream":true
            }),
        )
        .send()
        .await
        .expect("Anthropic stream")
        .text()
        .await
        .expect("Anthropic SSE body");
    let message_delta = anthropic
        .split("\n\n")
        .filter_map(|block| block.lines().find_map(|line| line.strip_prefix("data: ")))
        .filter_map(|data| serde_json::from_str::<Value>(data).ok())
        .find(|event| event["type"] == "message_delta")
        .expect("message_delta event");
    assert_eq!(message_delta["usage"]["input_tokens"], 3);
    assert_eq!(message_delta["usage"]["output_tokens"], 2);

    let chat = router
        .post(
            "/v1/chat/completions",
            &json!({
                "model":"gpt-5",
                "messages":[{"role":"user","content":"hi"}],
                "stream":true,
                "stream_options":{"include_usage":true}
            }),
        )
        .send()
        .await
        .expect("Chat Completions stream")
        .text()
        .await
        .expect("Chat SSE body");
    let usage = chat
        .split("\n\n")
        .filter_map(|block| block.lines().find_map(|line| line.strip_prefix("data: ")))
        .filter(|data| *data != "[DONE]")
        .filter_map(|data| serde_json::from_str::<Value>(data).ok())
        .find(|chunk| chunk["choices"].as_array().is_some_and(Vec::is_empty))
        .expect("final usage chunk");
    assert_eq!(usage["usage"]["prompt_tokens"], 3);
    assert_eq!(usage["usage"]["completion_tokens"], 2);
    assert_eq!(usage["usage"]["total_tokens"], 5);
}

#[tokio::test]
async fn invalid_upstream_body_is_not_disclosed_to_anthropic_clients() {
    let router = TestRouter::start_with_invalid_body(UpstreamProvider::Codex, true).await;
    let response = router
        .post(
            "/v1/messages",
            &json!({
                "model":"gpt-5",
                "max_tokens":16,
                "messages":[{"role":"user","content":"hi"}]
            }),
        )
        .send()
        .await
        .expect("invalid upstream response");
    assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
    let payload: Value = response.json().await.expect("Anthropic error envelope");
    assert_eq!(
        payload["error"]["message"],
        "Upstream returned a malformed response"
    );
    let rendered = payload.to_string();
    assert!(!rendered.contains("safety_identifier"));
    assert!(!rendered.contains("prompt_cache_key"));
}
