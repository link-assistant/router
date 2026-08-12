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
}

struct TestRouter {
    client: reqwest::Client,
    url: String,
    token: String,
    requests: Arc<Mutex<Vec<Value>>>,
    log_path: std::path::PathBuf,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl TestRouter {
    async fn start(provider: UpstreamProvider) -> Self {
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

        let log_path = data.path().join("requests.jsonl");
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager,
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
                log_path.clone(),
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
            requests,
            log_path,
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
    assert_eq!(response.headers()["x-codex-active-limit"], "primary");
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
    let responses: Value = response.json().await.expect("Responses JSON");
    assert_eq!(responses["object"], "response");
    assert!(responses["output"].is_array());

    let requests = router.requests.lock().expect("stub requests");
    let translated_tools = requests[0]["tools"].as_array().expect("translated tools");
    assert_eq!(translated_tools[0]["name"], "lookup");
    assert_eq!(translated_tools[0]["type"], "function");
    assert!(translated_tools[0].get("function").is_none());
    drop(requests);

    let records = std::fs::read_to_string(&router.log_path).expect("request exchange log");
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
