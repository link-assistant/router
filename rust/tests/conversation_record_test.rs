//! End-to-end evidence for issue #566: a multi-turn Claude Code conversation
//! with a tool call is recorded through the real router, then replayed with no
//! credential and no upstream reachable at all.
//!
//! Both halves cross the client boundary over HTTP against the router's own
//! Anthropic surface. The replay half is deliberately built with an upstream URL
//! that resolves nowhere and a credential store holding nothing: if any replayed
//! turn reached a provider the test would fail rather than pass quietly.

use std::fmt::Write as _;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::Body;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::Response;
use axum::routing::post;
use link_assistant_router::app_state::AppState;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::conversation_record::{Mode, Session};
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::token::{IssueRequest, TokenManager};
use serde_json::{Value, json};
use tempfile::TempDir;

/// The router's Anthropic client surface, which is what Claude Code talks to.
const MESSAGES: &str = "/api/services/anthropic/v1/messages";

/// A conversation whose second turn carries a tool result, so the recording has
/// to preserve a tool call and its result across turns (issue #566).
fn conversation() -> [Value; 3] {
    [
        json!({
            "model": "behaves-as-a-recorded-model",
            "max_tokens": 1024,
            "stream": true,
            "tools": [{
                "name": "Read",
                "description": "Read a file",
                "input_schema": {
                    "type": "object",
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"],
                },
            }],
            "messages": [{"role": "user", "content": "read Cargo.toml"}],
        }),
        json!({
            "model": "behaves-as-a-recorded-model",
            "max_tokens": 1024,
            "stream": true,
            "tools": [{
                "name": "Read",
                "description": "Read a file",
                "input_schema": {
                    "type": "object",
                    "properties": {"path": {"type": "string"}},
                    "required": ["path"],
                },
            }],
            "messages": [
                {"role": "user", "content": "read Cargo.toml"},
                {"role": "assistant", "content": [
                    {"type": "thinking", "thinking": "the file has to be read first",
                     "signature": "sig_recorded_thinking_block"},
                    {"type": "tool_use", "id": "toolu_01", "name": "Read",
                     "input": {"path": "Cargo.toml"}},
                ]},
                {"role": "user", "content": [
                    {"type": "tool_result", "tool_use_id": "toolu_01",
                     "content": "[package]\nname = \"link-assistant-router\""},
                ]},
            ],
        }),
        json!({
            "model": "behaves-as-a-recorded-model",
            "max_tokens": 1024,
            "stream": true,
            "messages": [
                {"role": "user", "content": "read Cargo.toml"},
                {"role": "assistant", "content": "it is the router crate manifest"},
                {"role": "user", "content": "thanks"},
            ],
        }),
    ]
}

/// The stubbed vendor: one deterministic answer per turn, streamed as SSE.
///
/// The answer varies by turn so a replay that served the wrong turn's response
/// would be visible in the client-side bytes rather than merely in a counter.
async fn stub_upstream(
    State(state): State<StubState>,
    request: Request,
) -> Result<Response, StatusCode> {
    let body = axum::body::to_bytes(request.into_body(), 1 << 20)
        .await
        .map_err(|_| StatusCode::BAD_REQUEST)?;
    let received = serde_json::from_slice::<Value>(&body).unwrap_or(Value::Null);
    let turn = {
        let mut seen = state.seen.lock().expect("stub request list");
        seen.push(received.clone());
        seen.len()
    };
    let wants_a_tool = received
        .get("messages")
        .and_then(Value::as_array)
        .is_some_and(|messages| messages.len() == 1)
        && received.get("tools").is_some();
    let content = if wants_a_tool {
        json!([
            {"type": "thinking", "thinking": "the file has to be read first",
             "signature": "sig_recorded_thinking_block"},
            {"type": "tool_use", "id": "toolu_01", "name": "Read",
             "input": {"path": "Cargo.toml"}},
        ])
    } else {
        json!([{"type": "text", "text": format!("answer for turn {turn}")}])
    };
    let events = [
        json!({"type": "message_start", "message": {
            "id": format!("msg_turn_{turn}"), "type": "message", "role": "assistant",
            "model": "behaves-as-a-recorded-model", "content": [],
            "stop_reason": Value::Null, "stop_sequence": Value::Null,
            "usage": {"input_tokens": 1, "output_tokens": 0},
        }}),
        json!({"type": "content_block_start", "index": 0, "content_block": content[0]}),
        json!({"type": "content_block_stop", "index": 0}),
        json!({"type": "message_delta",
               "delta": {"stop_reason": if wants_a_tool { "tool_use" } else { "end_turn" },
                         "stop_sequence": Value::Null},
               "usage": {"output_tokens": 1}}),
        json!({"type": "message_stop"}),
    ];
    let mut stream = String::new();
    for event in &events {
        let name = event["type"].as_str().unwrap_or("event");
        let _ = write!(stream, "event: {name}\ndata: {event}\n\n");
    }
    Response::builder()
        .status(StatusCode::OK)
        .header("content-type", "text/event-stream")
        .body(Body::from(stream))
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)
}

#[derive(Clone)]
struct StubState {
    seen: Arc<Mutex<Vec<Value>>>,
}

async fn serve(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind a test listener");
    let address = listener.local_addr().expect("listener address");
    let task = tokio::spawn(async move {
        let _ = axum::serve(listener, app).await;
    });
    (format!("http://{address}"), task)
}

/// A router whose Anthropic surface is wrapped in record-or-replay.
struct Harness {
    url: String,
    token: String,
    client: reqwest::Client,
    upstream_requests: Arc<Mutex<Vec<Value>>>,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl Drop for Harness {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
}

impl Harness {
    /// Build a router in `mode`, with a live stubbed vendor unless `credentials`
    /// is false — in which case there is no upstream and no OAuth token at all,
    /// which is the condition a replay has to satisfy.
    async fn start(mode: &Mode, credentials: bool) -> Self {
        let data = tempfile::tempdir().expect("router data directory");
        let seen = Arc::new(Mutex::new(Vec::new()));
        let mut tasks = Vec::new();
        let upstream = if credentials {
            let (url, task) = serve(
                Router::new()
                    .route("/v1/messages", post(stub_upstream))
                    .with_state(StubState {
                        seen: Arc::clone(&seen),
                    }),
            )
            .await;
            tasks.push(task);
            url
        } else {
            // Port 1 on the loopback: a replayed turn that tried to forward
            // upstream fails loudly instead of silently succeeding elsewhere.
            "http://127.0.0.1:1".to_string()
        };

        let token_manager = TokenManager::new("conversation-record-test-secret");
        let token = token_manager
            .issue(&IssueRequest {
                ttl_hours: 1,
                label: "conversation record client",
                account: Some("primary"),
                client_kind: Some(ClientKind::ClaudeCode.canonical_name()),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            })
            .expect("issue a client token");
        let oauth_provider = OAuthProvider::new(data.path().to_str().expect("UTF-8 path"));
        if credentials {
            oauth_provider.set_token("stub-anthropic-oauth-token");
        }
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager,
            oauth_provider,
            account_router: None,
            subscription_reader: None,
            subscription_base_url: Some(upstream.clone()),
            subscription_readers: Vec::new(),
            model_catalogs: Arc::new(
                link_assistant_router::model_catalog::ModelCatalogCache::new(),
            ),
            subscription_cache: Arc::new(link_assistant_router::refresh::TokenCache::new()),
            upstream_base_url: upstream,
            upstream_provider: UpstreamProvider::Anthropic,
            gonka: None,
            bridge_model: None,
            bridge_model_policy:
                link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
            crater: None,
            openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
            provider_store: link_assistant_router::providers::ProviderStore::open(
                data.path(),
                "conversation-record-test-secret",
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
        let session = Session::from_mode(mode, UpstreamProvider::Anthropic.as_str())
            .expect("open the record session")
            .map(Arc::new);
        let app = link_assistant_router::conversation_record::layer(
            Router::new()
                .route(MESSAGES, post(link_assistant_router::proxy::proxy_handler))
                .with_state(state),
            session,
        );
        let (url, task) = serve(app).await;
        tasks.push(task);
        Self {
            url,
            token,
            client: reqwest::Client::new(),
            upstream_requests: seen,
            tasks,
            _data: data,
        }
    }

    /// Send one client turn exactly as Claude Code would.
    async fn turn(&self, body: &Value) -> (StatusCode, String) {
        let response = self
            .client
            .post(format!("{}{MESSAGES}", self.url))
            .header("x-api-key", &self.token)
            .header("anthropic-version", "2023-06-01")
            .header("content-type", "application/json")
            .header("user-agent", "claude-cli/2.1.259")
            .header("x-claude-code-session-id", "conversation-record")
            .json(body)
            .send()
            .await
            .expect("client turn reaches the router");
        let status = response.status();
        let text = response.text().await.expect("client-visible body");
        (status, text)
    }

    fn upstream_calls(&self) -> usize {
        self.upstream_requests
            .lock()
            .expect("stub request list")
            .len()
    }
}

/// Record the conversation once and return the recording path plus what the
/// client saw for each turn.
async fn record_a_conversation(path: &std::path::Path) -> Vec<String> {
    let router = Harness::start(&Mode::Record(path.to_path_buf()), true).await;
    let mut seen = Vec::new();
    for body in conversation() {
        let (status, text) = router.turn(&body).await;
        assert_eq!(status, StatusCode::OK, "recorded turn failed: {text}");
        seen.push(text);
    }
    assert_eq!(
        router.upstream_calls(),
        3,
        "recording must add no upstream traffic of its own"
    );
    // The recording is written as the response body finishes streaming, which
    // happens on the router's task rather than the client's.
    for _ in 0..200 {
        if std::fs::read_to_string(path).is_ok_and(|text| text.lines().count() >= 4) {
            break;
        }
        tokio::time::sleep(Duration::from_millis(10)).await;
    }
    seen
}

#[tokio::test]
async fn a_recorded_tool_using_conversation_replays_identically_without_credentials() {
    let directory = tempfile::tempdir().expect("recording directory");
    let path = directory.path().join("claude-code.lino");
    let recorded = record_a_conversation(&path).await;

    let text = std::fs::read_to_string(&path).expect("the recording exists");
    assert!(
        text.starts_with("(#o ("),
        "a recording is links notation: {}",
        text.lines().next().unwrap_or_default()
    );
    assert!(
        text.contains(link_assistant_router::VERSION),
        "the recording must state the Router version that made it"
    );
    assert!(
        text.contains("anthropic"),
        "the recording must state the provider that made it"
    );
    for intact in [
        "tool_use",
        "toolu_01",
        "sig_recorded_thinking_block",
        "tool_result",
    ] {
        assert!(
            text.contains(intact),
            "the recording lost {intact}, so it cannot prove the tool loop"
        );
    }

    // Twice over, from two independent replay routers reading the same file:
    // a replay that were order- or state-dependent would differ on the second
    // pass (issue #566).
    for pass in 1..=2 {
        let replay = Harness::start(&Mode::Replay(path.clone()), false).await;
        for (index, body) in conversation().into_iter().enumerate() {
            let (status, text) = replay.turn(&body).await;
            assert_eq!(
                status,
                StatusCode::OK,
                "pass {pass} turn {} did not replay: {text}",
                index + 1
            );
            assert_eq!(
                text,
                recorded[index],
                "pass {pass} turn {} did not reproduce the client-visible exchange",
                index + 1
            );
        }
        assert_eq!(
            replay.upstream_calls(),
            0,
            "a replay must make no upstream call"
        );
    }
}

#[tokio::test]
async fn a_different_second_message_fails_the_replay_naming_the_turn_and_the_difference() {
    let directory = tempfile::tempdir().expect("recording directory");
    let path = directory.path().join("claude-code.lino");
    record_a_conversation(&path).await;

    let replay = Harness::start(&Mode::Replay(path), false).await;
    let turns = conversation();
    let (status, _) = replay.turn(&turns[0]).await;
    assert_eq!(status, StatusCode::OK, "the first turn still matches");

    let mut diverged = turns[1].clone();
    diverged["messages"][2]["content"][0]["content"] =
        json!("[package]\nname = \"something-else-entirely\"");
    let (status, text) = replay.turn(&diverged).await;

    assert_eq!(status, StatusCode::BAD_GATEWAY, "{text}");
    assert!(text.contains("turn 2"), "the turn must be named: {text}");
    assert!(
        text.contains("body.messages[2].content[0].content"),
        "the difference must be named, not merely reported: {text}"
    );
    assert!(
        text.contains("something-else-entirely"),
        "the report must show what was received: {text}"
    );
    assert_eq!(replay.upstream_calls(), 0);
}

#[tokio::test]
async fn a_dropped_field_fails_at_the_turn_where_the_divergence_appears() {
    let directory = tempfile::tempdir().expect("recording directory");
    let path = directory.path().join("claude-code.lino");
    record_a_conversation(&path).await;

    let replay = Harness::start(&Mode::Replay(path), false).await;
    let turns = conversation();
    assert_eq!(replay.turn(&turns[0]).await.0, StatusCode::OK);
    assert_eq!(replay.turn(&turns[1]).await.0, StatusCode::OK);

    // The third turn drops a field the recording holds — the shape of the
    // regression the issue names, seen from the client side.
    let mut dropped = turns[2].clone();
    dropped
        .as_object_mut()
        .expect("a request object")
        .remove("max_tokens");
    let (status, text) = replay.turn(&dropped).await;

    assert_eq!(status, StatusCode::BAD_GATEWAY, "{text}");
    assert!(text.contains("turn 3"), "{text}");
    assert!(text.contains("body.max_tokens"), "{text}");
    assert!(text.contains("missing"), "{text}");
}

#[tokio::test]
async fn a_recording_holds_no_credential_material() {
    let directory = tempfile::tempdir().expect("recording directory");
    let path = directory.path().join("claude-code.lino");
    record_a_conversation(&path).await;

    let bytes = std::fs::read(&path).expect("the recording exists");
    let text = String::from_utf8_lossy(&bytes);
    for secret in ["la_sk_", "stub-anthropic-oauth-token", "sk-ant-"] {
        assert!(
            !text.contains(secret),
            "the recorded bytes hold credential material: {secret}"
        );
    }
}

#[tokio::test]
async fn the_live_path_is_unchanged_when_no_mode_is_on() {
    let directory = tempfile::tempdir().expect("recording directory");
    let path = directory.path().join("claude-code.lino");
    let recorded = record_a_conversation(&path).await;

    let live = Harness::start(&Mode::Off, true).await;
    for (index, body) in conversation().into_iter().enumerate() {
        let (status, text) = live.turn(&body).await;
        assert_eq!(status, StatusCode::OK, "{text}");
        assert_eq!(
            text,
            recorded[index],
            "turn {} answered differently with recording off",
            index + 1
        );
    }
    assert_eq!(live.upstream_calls(), 3, "the live path still forwards");
    assert!(
        !directory.path().join("unwritten.lino").exists(),
        "nothing is recorded by default"
    );
}
