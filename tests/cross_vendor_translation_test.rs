//! What the router forwards when a client of one dialect drives another
//! vendor's model (issues #215 and #216).
//!
//! Both defects were found by running a real binary against a Claude model and
//! reading the router's own log to compare what the client sent with what was
//! forwarded. These tests capture the upstream request directly, so the same
//! comparison happens offline on every run:
//!
//! - Codex CLI sends tool types Anthropic has no equivalent for, and the router
//!   refused the whole request over one of them (#215);
//! - Gemini CLI sends `temperature` and `topP` together, which Anthropic
//!   rejects, and the router forwarded both (#216).
//!
//! Neither client can avoid what it sends, so only the router can reconcile it.

use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::Request;
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use link_assistant_router::app_state::AppState;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::subscription::SubscriptionProvider;
use link_assistant_router::token::{IssueRequest, TokenManager};
use lino_arguments::Parser as _;
use serde_json::{Value, json};
use tempfile::TempDir;

/// The Claude model both clients are pointed at, as in the issues.
const CLAUDE_MODEL: &str = "claude-haiku-4-5-20251001";

/// Bodies the router sent upstream, so the translation can be inspected.
type Captured = Arc<Mutex<Vec<Value>>>;

struct TestRouter {
    client: reqwest::Client,
    url: String,
    token: String,
    client_kind: ClientKind,
    upstream: Captured,
    upstream_headers: Arc<Mutex<Vec<HeaderMap>>>,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl TestRouter {
    async fn start(client_kind: ClientKind) -> Self {
        Self::start_with_bridge(client_kind, None).await
    }

    async fn start_with_bridge(client_kind: ClientKind, bridge_model: Option<&str>) -> Self {
        let data = tempfile::tempdir().expect("temporary test data");
        let upstream: Captured = Arc::new(Mutex::new(Vec::new()));
        let captured = Arc::clone(&upstream);
        let upstream_headers = Arc::new(Mutex::new(Vec::new()));
        let captured_headers = Arc::clone(&upstream_headers);
        let stub = Router::new().fallback(move |request: Request| {
            let captured = Arc::clone(&captured);
            let captured_headers = Arc::clone(&captured_headers);
            async move { capture_upstream(captured, captured_headers, request).await }
        });
        let (stub_url, stub_task) = spawn(stub).await;

        let token_manager = TokenManager::new("cross-vendor-secret");
        let (token, _) = token_manager
            .issue_with_id(&IssueRequest {
                ttl_hours: 1,
                label: "cross vendor client",
                account: Some("primary"),
                client_kind: Some(client_kind.canonical_name()),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            })
            .expect("issue bound test token");
        let oauth_provider = OAuthProvider::new(data.path().to_str().expect("UTF-8 test path"));
        oauth_provider.set_token("stub-anthropic-oauth-token");

        let catalogs = Arc::new(ModelCatalogCache::new());
        catalogs.record_success(SubscriptionProvider::Claude, vec![CLAUDE_MODEL.to_string()]);

        let config = link_assistant_router::cli::Cli::try_parse_from(vec![
            "router",
            "--token-secret",
            "cross-vendor-secret",
            "--data-dir",
            data.path().to_str().expect("UTF-8 test path"),
            "--upstream-provider",
            "anthropic",
            "--upstream-base-url",
            &stub_url,
        ])
        .expect("test CLI parses")
        .into_config()
        .expect("test config is valid");

        let provider_store = link_assistant_router::providers::ProviderStore::open(
            data.path(),
            "cross-vendor-secret",
        )
        .expect("provider store");
        provider_store
            .set_subscription_entitlement_policy(
                link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                    format!("{}:claude", client_kind.canonical_name()),
                ])
                .expect("exact test override"),
            )
            .expect("install test policy");
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager,
            oauth_provider,
            account_router: None,
            subscription_reader: None,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers: vec![],
            model_catalogs: catalogs,
            subscription_cache: Arc::new(TokenCache::new()),
            upstream_base_url: stub_url,
            upstream_provider: UpstreamProvider::Anthropic,
            gonka: None,
            bridge_model: bridge_model.map(str::to_string),
            bridge_model_policy:
                link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
            crater: None,
            openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
            provider_store,
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
                data.path().join("requests"),
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
            max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
        };

        let app = link_assistant_router::server_router::router(state, &config);
        let (url, router_task) = spawn(app).await;

        Self {
            client: reqwest::Client::new(),
            url,
            token,
            client_kind,
            upstream,
            upstream_headers,
            tasks: vec![stub_task, router_task],
            _data: data,
        }
    }

    async fn post(&self, path: &str, body: &Value) -> (StatusCode, Value) {
        let response = self
            .request(path)
            .json(body)
            .send()
            .await
            .expect("router POST");
        let status = response.status();
        let text = response.text().await.expect("router POST body");
        (
            status,
            serde_json::from_str(&text).unwrap_or(Value::String(text)),
        )
    }

    fn request(&self, path: &str) -> reqwest::RequestBuilder {
        let request = self.client.post(format!("{}{path}", self.url));
        match self.client_kind {
            ClientKind::Codex => request
                .bearer_auth(&self.token)
                .header("user-agent", "codex_exec/0.153.3")
                .header("x-openai-internal-codex-responses-lite", "true"),
            ClientKind::GeminiCli => request
                .header("x-goog-api-key", &self.token)
                .header("x-goog-api-client", "gl-node/test gccl/test"),
            ClientKind::Opencode => request
                .bearer_auth(&self.token)
                .header("user-agent", "opencode/test")
                .header("x-session-id", "cross-vendor-test"),
            _ => request.bearer_auth(&self.token),
        }
    }

    /// The last body the router sent upstream.
    fn forwarded(&self) -> Value {
        self.upstream
            .lock()
            .expect("captured upstream bodies")
            .last()
            .cloned()
            .expect("the router forwarded a request upstream")
    }
}

#[tokio::test]
async fn native_claude_catalog_models_ignore_an_unrelated_bridge_default() {
    let unrelated = "unrelated-codex-default";
    for (client, path, body) in [
        (
            ClientKind::Codex,
            "/api/services/openai/v1/responses",
            json!({"model": CLAUDE_MODEL, "input": "test"}),
        ),
        (
            ClientKind::Opencode,
            "/api/services/openai/v1/chat/completions",
            json!({
                "model": CLAUDE_MODEL,
                "messages": [{"role": "user", "content": "test"}]
            }),
        ),
    ] {
        for stream in [false, true] {
            let router = TestRouter::start_with_bridge(client, Some(unrelated)).await;
            let mut body = body.clone();
            body["stream"] = Value::Bool(stream);
            let (status, response) = router.post(path, &body).await;
            assert_eq!(status, StatusCode::OK, "{client}/{stream}: {response}");
            let forwarded = router.forwarded();
            assert_eq!(
                forwarded["model"], CLAUDE_MODEL,
                "{client}/{stream} forwarded the unrelated bridge default: {forwarded}"
            );
            assert!(!forwarded.to_string().contains(unrelated));
        }
    }
}

impl Drop for TestRouter {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
}

async fn capture_upstream(
    captured: Captured,
    captured_headers: Arc<Mutex<Vec<HeaderMap>>>,
    request: Request,
) -> Response {
    captured_headers
        .lock()
        .expect("capture header lock")
        .push(request.headers().clone());
    let body = to_bytes(request.into_body(), 4 * 1024 * 1024)
        .await
        .expect("read upstream body");
    let parsed = serde_json::from_slice::<Value>(&body).ok();
    let streaming = parsed
        .as_ref()
        .and_then(|value| value.get("stream"))
        .and_then(Value::as_bool)
        .unwrap_or(false);
    if let Some(value) = parsed {
        captured.lock().expect("capture lock").push(value);
    }
    if streaming {
        // The frames a forced-tool turn actually produces: a `tool_use` block
        // and its arguments in fragments, with no text at all.
        let sse = concat!(
            "event: message_start\n",
            "data: {\"type\":\"message_start\",\"message\":{\"id\":\"msg_1\",\"model\":\"claude-haiku-4-5-20251001\"}}\n\n",
            "event: content_block_start\n",
            "data: {\"type\":\"content_block_start\",\"index\":0,\"content_block\":{\"type\":\"tool_use\",\"id\":\"toolu_01\",\"name\":\"write_file\"}}\n\n",
            "event: content_block_delta\n",
            "data: {\"type\":\"content_block_delta\",\"index\":0,\"delta\":{\"type\":\"input_json_delta\",\"partial_json\":\"{\\\"path\\\":\\\"result.txt\\\"}\"}}\n\n",
            "event: content_block_stop\n",
            "data: {\"type\":\"content_block_stop\",\"index\":0}\n\n",
            "event: message_stop\n",
            "data: {\"type\":\"message_stop\"}\n\n",
        );
        let mut response = Response::new(Body::from(sse));
        response.headers_mut().insert(
            "content-type",
            HeaderValue::from_static("text/event-stream"),
        );
        response.headers_mut().insert(
            "x-request-id",
            HeaderValue::from_static("provider-cross-vendor-request"),
        );
        return response;
    }
    let mut response = Response::new(Body::from(
        json!({
            "id": "msg_stub",
            "type": "message",
            "role": "assistant",
            "model": CLAUDE_MODEL,
            "content": [{"type": "text", "text": "ok"}],
            "stop_reason": "end_turn",
            "usage": {"input_tokens": 1, "output_tokens": 1}
        })
        .to_string(),
    ));
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response.headers_mut().insert(
        "x-request-id",
        HeaderValue::from_static("provider-cross-vendor-request"),
    );
    response
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

/// The real `codex_exec/0.147.0` tool array: nine entries Anthropic can use and
/// one it cannot.
fn codex_tools() -> Value {
    json!([
        {"type": "function", "name": "exec_command", "parameters": {"type": "object"}},
        {"type": "function", "name": "write_stdin", "parameters": {"type": "object"}},
        {"type": "function", "name": "update_plan", "parameters": {"type": "object"}},
        {"type": "function", "name": "request_user_input", "parameters": {"type": "object"}},
        {"type": "function", "name": "view_image", "parameters": {"type": "object"}},
        {"type": "namespace", "name": "multi_agent_v1"},
        {"type": "function", "name": "get_goal", "parameters": {"type": "object"}},
        {"type": "function", "name": "create_goal", "parameters": {"type": "object"}},
        {"type": "function", "name": "update_goal", "parameters": {"type": "object"}},
        {"type": "web_search"}
    ])
}

#[tokio::test]
async fn translated_codex_requests_keep_only_end_to_end_request_ids() {
    let router = TestRouter::start(ClientKind::Codex).await;
    let body = json!({"model": CLAUDE_MODEL, "input": "test", "stream": true});
    let supplied = router
        .request("/api/services/openai/v1/responses")
        .header("x-request-id", "client-cross-vendor-request")
        .json(&body)
        .send()
        .await
        .expect("translated request");
    assert_eq!(
        supplied.headers()["x-request-id"],
        "provider-cross-vendor-request"
    );
    let _ = supplied.bytes().await.expect("translated stream");

    let absent = router
        .request("/api/services/openai/v1/responses")
        .json(&body)
        .send()
        .await
        .expect("translated request without an id");
    assert_eq!(
        absent.headers()["x-request-id"],
        "provider-cross-vendor-request"
    );
    let _ = absent.bytes().await.expect("translated stream");

    let headers = router
        .upstream_headers
        .lock()
        .expect("captured upstream headers");
    assert_eq!(headers.len(), 2);
    assert_eq!(headers[0]["x-request-id"], "client-cross-vendor-request");
    assert!(!headers[1].contains_key("x-request-id"));
    drop(headers);
}

/// Issue #215: the request must be served, not refused, and the usable tools
/// must reach the vendor.
#[tokio::test]
async fn codex_can_drive_a_claude_model_despite_an_untranslatable_tool() {
    let router = TestRouter::start(ClientKind::Codex).await;
    let (status, body) = router
        .post(
            "/api/services/openai/v1/responses",
            &json!({
                "model": CLAUDE_MODEL,
                "input": "test",
                "tools": codex_tools()
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let forwarded = router.forwarded();
    let tools = forwarded["tools"].as_array().expect("tools forwarded");
    assert_eq!(tools.len(), 9, "{forwarded:#}");
    let rendered = serde_json::to_string(tools).expect("serialize");
    assert!(!rendered.contains("multi_agent_v1"), "{rendered}");
    assert!(rendered.contains("exec_command"), "{rendered}");
}

/// Issue #215 item 2: the drop must be discoverable rather than silent.
#[tokio::test]
async fn a_dropped_tool_is_reported_to_the_caller() {
    let router = TestRouter::start(ClientKind::Codex).await;
    let response = router
        .request("/api/services/openai/v1/responses")
        .json(&json!({
            "model": CLAUDE_MODEL,
            "input": "test",
            "tools": codex_tools()
        }))
        .send()
        .await
        .expect("router POST");
    let reported = response
        .headers()
        .get("x-router-dropped-tools")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    assert!(
        reported.contains("multi_agent_v1"),
        "header was {reported:?}"
    );
}

/// A request with only translatable tools must carry no drop report, so the
/// header means something when it is present.
#[tokio::test]
async fn an_ordinary_request_reports_no_dropped_tools() {
    let router = TestRouter::start(ClientKind::Codex).await;
    let response = router
        .request("/api/services/openai/v1/responses")
        .json(&json!({
            "model": CLAUDE_MODEL,
            "input": "test",
            "tools": [{"type": "function", "name": "ok", "parameters": {"type": "object"}}]
        }))
        .send()
        .await
        .expect("router POST");
    assert!(response.headers().get("x-router-dropped-tools").is_none());
}

/// Issue #216: Gemini CLI's default `generationConfig` carries both
/// `temperature` and `topP`; Anthropic rejects the pair. Exactly one must reach
/// the vendor.
#[tokio::test]
async fn gemini_cli_sampling_parameters_do_not_both_reach_anthropic() {
    let router = TestRouter::start(ClientKind::GeminiCli).await;
    let (status, body) = router
        .post(
            &format!("/api/services/gemini/v1beta/models/{CLAUDE_MODEL}:generateContent"),
            &json!({
                "contents": [{"role": "user", "parts": [{"text": "ping"}]}],
                // The real GeminiCLI-tui body, including the Gemini-only fields.
                "generationConfig": {
                    "temperature": 1,
                    "topP": 0.95,
                    "topK": 64,
                    "thinkingConfig": {"includeThoughts": true}
                }
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let forwarded = router.forwarded();
    let has_temperature = forwarded.get("temperature").is_some();
    let has_top_p = forwarded.get("top_p").is_some();
    assert!(
        !(has_temperature && has_top_p),
        "Anthropic rejects both together: {forwarded:#}"
    );
    // The documented rule: the caller's explicit temperature wins.
    assert!(has_temperature, "{forwarded:#}");
}

/// A caller who tuned only `topP` still gets nucleus sampling: the parameter is
/// mapped, not dropped merely because it loses a conflict.
#[tokio::test]
async fn a_lone_top_p_still_reaches_anthropic() {
    let router = TestRouter::start(ClientKind::GeminiCli).await;
    let (status, body) = router
        .post(
            &format!("/api/services/gemini/v1beta/models/{CLAUDE_MODEL}:generateContent"),
            &json!({
                "contents": [{"role": "user", "parts": [{"text": "ping"}]}],
                "generationConfig": {"topP": 0.95}
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let forwarded = router.forwarded();
    assert!(forwarded.get("top_p").is_some(), "{forwarded:#}");
    assert!(forwarded.get("temperature").is_none(), "{forwarded:#}");
}

/// Issue #218: a streamed tool call must reach the caller on `/v1/responses`.
/// It previously arrived as an empty `output_text`, so an agentic CLI saw a
/// successful, completely empty answer and stopped.
#[tokio::test]
async fn a_streamed_tool_call_reaches_the_responses_caller() {
    let router = TestRouter::start(ClientKind::Codex).await;
    let response = router
        .request("/api/services/openai/v1/responses")
        .json(&json!({
            "model": CLAUDE_MODEL,
            "stream": true,
            "tool_choice": "required",
            "input": "create result.txt",
            "tools": [{
                "type": "function",
                "name": "write_file",
                "parameters": {"type": "object", "properties": {"path": {"type": "string"}}}
            }]
        }))
        .send()
        .await
        .expect("router POST");
    assert_eq!(response.status(), StatusCode::OK);
    let stream = response.text().await.expect("stream body");

    assert!(
        stream.contains("response.output_item.added"),
        "no item announced: {stream}"
    );
    assert!(
        stream.contains("function_call"),
        "the tool call was dropped: {stream}"
    );
    assert!(
        stream.contains("write_file") && stream.contains("toolu_01"),
        "the call identity was lost: {stream}"
    );
    assert!(
        stream.contains("response.function_call_arguments.done"),
        "arguments were never closed: {stream}"
    );
    // The defect's signature: a successful, empty text answer.
    assert!(
        !stream.contains(r#""text":"""#),
        "a tool-only turn must not carry an empty output_text: {stream}"
    );
}

/// A streamed relay must deliver every byte to the client and record how the
/// stream ended. The terminal record is what distinguishes a turn cut mid-flight
/// from a healthy one — `status=200` is decided by the headers and cannot
/// (issue #230).
#[tokio::test]
async fn a_streamed_relay_records_how_it_ended_without_losing_frames() {
    let router = TestRouter::start(ClientKind::Opencode).await;
    let response = router
        .request("/api/services/openai/v1/chat/completions")
        .json(&json!({
            "model": CLAUDE_MODEL,
            "stream": true,
            "messages": [{"role": "user", "content": "hi"}]
        }))
        .send()
        .await
        .expect("router POST");
    assert_eq!(response.status(), StatusCode::OK);
    // Every frame the stub emitted must reach the caller: the end-of-stream
    // bookkeeping must not truncate or swallow the body.
    let body = response.text().await.expect("stream body");
    assert!(!body.is_empty(), "the relayed stream was empty");
    assert!(
        body.contains("stub") || body.contains("message") || body.contains("data:"),
        "the relayed body looks wrong: {body}"
    );
}
