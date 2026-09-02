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
use axum::http::{HeaderMap, HeaderValue, StatusCode};
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
use link_assistant_router::token::{IssueRequest, TokenManager};
use serde_json::{Value, json};
use sha2::{Digest as _, Sha256};
use tempfile::TempDir;

#[path = "router_e2e/token_budget.rs"]
mod token_budget;
#[path = "router_e2e/token_surfaces.rs"]
mod token_surfaces;

#[derive(Clone, Copy)]
enum StubDialect {
    Anthropic,
    Codex,
}

#[derive(Clone)]
struct StubState {
    dialect: StubDialect,
    requests: Arc<Mutex<Vec<Value>>>,
    headers: Arc<Mutex<Vec<HeaderMap>>>,
    invalid_body: bool,
}

struct TestRouter {
    client: reqwest::Client,
    model_catalogs: Arc<ModelCatalogCache>,
    url: String,
    token: String,
    token_manager: TokenManager,
    requests: Arc<Mutex<Vec<Value>>>,
    upstream_headers: Arc<Mutex<Vec<HeaderMap>>>,
    log_root: std::path::PathBuf,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl TestRouter {
    async fn start(provider: UpstreamProvider) -> Self {
        Self::start_with_options(
            provider,
            false,
            link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        )
        .await
    }

    async fn start_with_invalid_body(provider: UpstreamProvider, invalid_body: bool) -> Self {
        Self::start_with_options(
            provider,
            invalid_body,
            link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        )
        .await
    }

    async fn start_with_max_request_bytes(provider: UpstreamProvider, limit: usize) -> Self {
        Self::start_with_options(provider, false, limit).await
    }

    async fn start_with_options(
        provider: UpstreamProvider,
        invalid_body: bool,
        max_proxy_request_bytes: usize,
    ) -> Self {
        let data = tempfile::tempdir().expect("temporary test data");
        let dialect = if provider == UpstreamProvider::Codex {
            StubDialect::Codex
        } else {
            StubDialect::Anthropic
        };
        let requests = Arc::new(Mutex::new(Vec::new()));
        let upstream_headers = Arc::new(Mutex::new(Vec::new()));
        let stub_state = StubState {
            dialect,
            requests: Arc::clone(&requests),
            headers: Arc::clone(&upstream_headers),
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
        let model_catalogs = Arc::new(ModelCatalogCache::new());
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager: token_manager.clone(),
            oauth_provider,
            account_router: None,
            subscription_reader,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers: Vec::new(),
            model_catalogs: Arc::clone(&model_catalogs),
            subscription_cache: Arc::new(TokenCache::new()),
            upstream_base_url: stub_url,
            upstream_provider: provider,
            gonka: None,
            bridge_model: Some("gpt-5".to_string()),
            bridge_model_policy:
                link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
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
            github: link_assistant_router::github_proxy::GitHubProxyConfig::default(),
            max_proxy_request_bytes,
        };
        let app = test_app(state);
        let (url, router_task) = spawn(app).await;

        Self {
            client: reqwest::Client::new(),
            model_catalogs,
            url,
            token,
            token_manager,
            requests,
            upstream_headers,
            log_root,
            tasks: vec![stub_task, router_task],
            _data: data,
        }
    }

    /// The live catalog cache backing this router, for seeding discoveries.
    fn state_catalogs(&self) -> &ModelCatalogCache {
        &self.model_catalogs
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

    /// A GET carrying a credential other than the default client token.
    fn get_as(&self, path: &str, credential: &str) -> reqwest::RequestBuilder {
        self.client
            .get(format!("{}{path}", self.url))
            .bearer_auth(credential)
    }

    fn log_path_for(&self, token: &str) -> std::path::PathBuf {
        let digest = hex::encode(Sha256::digest(token.as_bytes()));
        self.log_root.join(&digest[..32]).join("requests.lino")
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
        .route(
            "/api/tokens",
            post(link_assistant_router::token_admin::issue_token),
        )
        .route(
            "/api/tokens/rotate-client",
            post(link_assistant_router::token_admin::rotate_client_token),
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
    state
        .headers
        .lock()
        .expect("stub header lock")
        .push(request.headers().clone());
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
            serde_json::to_vec(&anthropic_message_with_server_tools(&body))
                .expect("serialize Anthropic response"),
        )),
        StubDialect::Codex => Response::new(Body::from(codex_stream_for_request(&body))),
    };
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static(match (state.dialect, stream) {
            (StubDialect::Anthropic, true) | (StubDialect::Codex, _) => "text/event-stream",
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

fn anthropic_message_with_server_tools(request: &Value) -> Value {
    let tool_types = request["tools"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|tool| tool["type"].as_str())
        .collect::<Vec<_>>();
    let has_web_search = tool_types
        .iter()
        .any(|kind| kind.starts_with("web_search_"));
    let has_web_fetch = tool_types.iter().any(|kind| kind.starts_with("web_fetch_"));
    if has_web_search || has_web_fetch {
        let mut content = Vec::new();
        if has_web_search {
            content.extend([
                json!({"type":"server_tool_use","id":"srvtoolu_search","name":"web_search","input":{"query":"rust"}}),
                json!({"type":"web_search_tool_result","tool_use_id":"srvtoolu_search","content":[{"type":"web_search_result","url":"https://www.rust-lang.org","title":"Rust","encrypted_content":"opaque"}]}),
            ]);
        }
        if has_web_fetch {
            content.extend([
                json!({"type":"server_tool_use","id":"srvtoolu_fetch","name":"web_fetch","input":{"url":"https://www.rust-lang.org"}}),
                json!({"type":"web_fetch_tool_result","tool_use_id":"srvtoolu_fetch","content":{"type":"web_fetch_result","url":"https://www.rust-lang.org","content":{"type":"document","source":{"type":"text","media_type":"text/plain","data":"Rust"}}}}),
            ]);
        }
        return json!({
            "id": "msg_server_tools",
            "type": "message",
            "role": "assistant",
            "model": "claude-sonnet-4-5",
            "content": content,
            "stop_reason": "end_turn",
            "stop_sequence": null,
            "usage": {
                "input_tokens": 3,
                "output_tokens": 2,
                "server_tool_use": {
                    "web_search_requests": u8::from(has_web_search),
                    "web_fetch_requests": u8::from(has_web_fetch)
                }
            }
        });
    }
    let has_client_function = request["tools"]
        .as_array()
        .is_some_and(|tools| tools.iter().any(|tool| tool.get("name").is_some()));
    let has_tool_result = request["messages"].as_array().is_some_and(|messages| {
        messages.iter().any(|message| {
            message["content"]
                .as_array()
                .is_some_and(|blocks| blocks.iter().any(|block| block["type"] == "tool_result"))
        })
    });
    if has_client_function && !has_tool_result {
        return json!({
            "id":"msg_tool_call",
            "type":"message",
            "role":"assistant",
            "model":"claude-sonnet-4-5",
            "content":[{"type":"tool_use","id":"call_router_e2e","name":"lookup","input":{"key":"value"}}],
            "stop_reason":"tool_use",
            "stop_sequence":null,
            "usage":{"input_tokens":3,"output_tokens":2}
        });
    }
    anthropic_message()
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

fn codex_stream_for_request(request: &Value) -> String {
    let has_server_search = request["tools"]
        .as_array()
        .is_some_and(|tools| tools.iter().any(|tool| tool["type"] == "web_search"));
    let has_client_function = request["tools"].as_array().is_some_and(|tools| {
        tools
            .iter()
            .any(|tool| tool["type"] == "function" && tool.get("name").is_some())
    });
    let has_tool_result = request["input"].as_array().is_some_and(|items| {
        items
            .iter()
            .any(|item| item["type"] == "function_call_output")
    });
    let output = if has_server_search {
        json!([{
            "id":"ws_stub",
            "type":"web_search_call",
            "status":"completed",
            "action":{"type":"search","query":"rust"}
        }])
    } else if has_client_function && !has_tool_result {
        json!([{
            "id":"fc_stub",
            "type":"function_call",
            "status":"completed",
            "call_id":"call_router_e2e",
            "name":"lookup",
            "arguments":"{\"key\":\"value\"}"
        }])
    } else {
        json!([{
            "id": "msg_stub",
            "type": "message",
            "status": "completed",
            "role": "assistant",
            "content": [{"type": "output_text", "text": "stub answer", "annotations": []}]
        }])
    };
    let response = json!({
        "id": "resp_stub",
        "object": "response",
        "status": "completed",
        "model": "gpt-5",
        "output": output,
        "usage": {"input_tokens": 3, "output_tokens": 2, "total_tokens": 5}
    });
    let mut events = vec![
        json!({"type":"response.created","response":{"id":"resp_stub","status":"in_progress","model":"gpt-5","output":[]}}),
        json!({"type":"response.in_progress","response":{"id":"resp_stub","status":"in_progress"}}),
    ];
    if has_server_search {
        events.extend([
            json!({"type":"response.output_item.added","output_index":0,"item":{"id":"ws_stub","type":"web_search_call","status":"in_progress","action":{"type":"search","query":"rust"}}}),
            json!({"type":"response.output_item.done","output_index":0,"item":output[0].clone()}),
        ]);
    } else if has_client_function && !has_tool_result {
        events.extend([
            json!({"type":"response.output_item.added","output_index":0,"item":{"id":"fc_stub","type":"function_call","status":"in_progress","call_id":"call_router_e2e","name":"lookup","arguments":""}}),
            json!({"type":"response.function_call_arguments.delta","item_id":"fc_stub","output_index":0,"delta":"{\"key\":\"value\"}"}),
            json!({"type":"response.function_call_arguments.done","item_id":"fc_stub","output_index":0,"arguments":"{\"key\":\"value\"}"}),
            json!({"type":"response.output_item.done","output_index":0,"item":output[0].clone()}),
        ]);
    } else {
        events.extend([
            json!({"type":"response.output_item.added","output_index":0,"item":{"id":"msg_stub","type":"message","status":"in_progress","role":"assistant","content":[]}}),
            json!({"type":"response.content_part.added","item_id":"msg_stub","output_index":0,"content_index":0,"part":{"type":"output_text","text":"","annotations":[]}}),
            json!({"type":"response.output_text.delta","item_id":"msg_stub","output_index":0,"content_index":0,"delta":"stub answer"}),
            json!({"type":"response.output_text.done","item_id":"msg_stub","output_index":0,"content_index":0,"text":"stub answer"}),
            json!({"type":"response.content_part.done","item_id":"msg_stub","output_index":0,"content_index":0,"part":{"type":"output_text","text":"stub answer","annotations":[]}}),
            json!({"type":"response.output_item.done","output_index":0,"item":output[0].clone()}),
        ]);
    }
    events.push(json!({"type":"response.completed","response":response}));
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

#[path = "router_e2e/cases_core.rs"]
mod cases_core;

#[path = "router_e2e/cases_regressions.rs"]
mod cases_regressions;

#[path = "router_e2e/chat_validation.rs"]
mod chat_validation;
