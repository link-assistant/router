//! An in-process Router in front of a vendor stub that replays cassettes.
//!
//! Shared by the vendor-fixture replay tests (issue #671), the Claude Code
//! feature matrix (issue #675) and the soak test (issue #672). By default the
//! stub records every upstream request, so a test can assert both the exact
//! bytes Router sent and what the client received. The soak disables recording
//! so its fixture does not retain payloads for the entire run (#705).
//!
//! Cassettes live under `tests/fixtures/vendor/` in the format written by
//! `scripts/record-vendor-fixtures.rs`; see `tests/fixtures/vendor/README.md`.

#![allow(dead_code)]

use std::collections::VecDeque;
use std::path::{Path, PathBuf};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::{Request, State};
use axum::http::{HeaderMap, HeaderName, HeaderValue, StatusCode};
use axum::response::Response;
use axum::routing::{get, post};
use link_assistant_router::app_state::AppState;
use link_assistant_router::client_policy::ClientProtocol;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::model_catalog::{CatalogRecord, ModelCatalogCache};
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::proxy;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::token::{IssueRequest, TokenManager};
use serde_json::{Value, json};
use tempfile::TempDir;

/// The model every bridged catalog advertises — the id the recorded Codex
/// cassettes were served by, so the substitution guard stays satisfied.
pub const BRIDGE_MODEL: &str = "gpt-5-2025-08-07";

/// One recorded vendor exchange.
#[derive(Clone, Debug)]
pub struct Cassette {
    pub name: String,
    pub document: Value,
    pub status: u16,
    pub headers: Vec<(String, String)>,
    pub body: Vec<u8>,
}

impl Cassette {
    /// Load `tests/fixtures/vendor/<relative>`.
    pub fn load(relative: &str) -> Self {
        let path = vendor_fixture_root().join(relative);
        let text = std::fs::read_to_string(&path)
            .unwrap_or_else(|error| panic!("read cassette {}: {error}", path.display()));
        let document: Value = serde_json::from_str(&text)
            .unwrap_or_else(|error| panic!("parse cassette {}: {error}", path.display()));
        Self::from_document(relative, document)
    }

    pub fn from_document(name: &str, document: Value) -> Self {
        let response = &document["response"];
        let status = u16::try_from(response["status"].as_u64().expect("cassette status"))
            .expect("HTTP status");
        let headers = response["headers"]
            .as_object()
            .into_iter()
            .flatten()
            .map(|(name, value)| (name.clone(), value.as_str().unwrap_or_default().to_string()))
            .collect();
        let body = cassette_body(response);
        Self {
            name: name.to_string(),
            document,
            status,
            headers,
            body,
        }
    }

    /// An SSE cassette built from raw text, for synthetic streams.
    pub fn sse(name: &str, body: impl Into<String>) -> Self {
        Self {
            name: name.to_string(),
            document: Value::Null,
            status: 200,
            headers: vec![("content-type".into(), "text/event-stream".into())],
            body: body.into().into_bytes(),
        }
    }

    /// A JSON cassette, for synthetic responses.
    pub fn json(name: &str, status: u16, body: &Value) -> Self {
        Self {
            name: name.to_string(),
            document: Value::Null,
            status,
            headers: vec![("content-type".into(), "application/json".into())],
            body: serde_json::to_vec(body).expect("serialize JSON cassette"),
        }
    }

    /// The `expect` section the test asserts against.
    pub fn expect(&self) -> &Value {
        &self.document["expect"]
    }
}

/// The body a cassette replays: `sse` lines joined by `\n`, or `json`.
pub fn cassette_body(response: &Value) -> Vec<u8> {
    response["sse"].as_array().map_or_else(
        || serde_json::to_vec(&response["json"]).expect("serialize cassette JSON"),
        |lines| {
            let mut body = lines
                .iter()
                .map(|line| line.as_str().expect("SSE cassette line"))
                .collect::<Vec<_>>()
                .join("\n");
            body.push('\n');
            body.into_bytes()
        },
    )
}

pub fn vendor_fixture_root() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/vendor")
}

/// One request the stub upstream received.
#[derive(Clone, Debug)]
pub struct Recorded {
    pub path: String,
    pub headers: HeaderMap,
    pub raw: Vec<u8>,
    pub body: Value,
}

#[derive(Clone, Default)]
struct StubState {
    queue: Arc<Mutex<VecDeque<Cassette>>>,
    last: Arc<Mutex<Option<Cassette>>>,
    requests: Option<Arc<Mutex<Vec<Recorded>>>>,
    /// Delay between body chunks, so a client can disconnect mid-stream.
    chunk_delay: Arc<Mutex<Option<Duration>>>,
}

pub struct ReplayRouter {
    pub client: reqwest::Client,
    pub url: String,
    pub provider: UpstreamProvider,
    pub token_manager: TokenManager,
    stub: StubState,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    pub data: TempDir,
}

/// An HTTP client whose idle keep-alive connections close after two seconds
/// (`reqwest` keeps them for 90 by default), so once traffic stops the
/// connection pools drain and the soak test can tell an idle pool from a leak.
fn http_client() -> reqwest::Client {
    reqwest::Client::builder()
        .pool_idle_timeout(Duration::from_secs(2))
        .build()
        .expect("HTTP client")
}

impl ReplayRouter {
    pub async fn start(provider: UpstreamProvider) -> Self {
        Self::start_with_recording(provider, true).await
    }

    /// Replay upstream replies without retaining any request payloads.
    pub async fn start_without_recording(provider: UpstreamProvider) -> Self {
        Self::start_with_recording(provider, false).await
    }

    async fn start_with_recording(provider: UpstreamProvider, recording: bool) -> Self {
        link_assistant_router::upstream_guard::install_process_policy(
            link_assistant_router::upstream_guard::NetworkPolicy::parse(Some("loopback")),
        );
        let data = tempfile::tempdir().expect("temporary router data");
        let stub = StubState {
            requests: recording.then(|| Arc::new(Mutex::new(Vec::new()))),
            ..StubState::default()
        };
        let stub_app = Router::new().fallback(stub_vendor).with_state(stub.clone());
        let (stub_url, stub_task) = spawn(stub_app).await;

        let token_manager = TokenManager::new("replay-router-secret");
        let oauth_provider = OAuthProvider::new(data.path().to_str().expect("UTF-8 path"));
        oauth_provider.set_token("stub-anthropic-oauth-token");

        let home = data.path().join("home");
        std::fs::create_dir_all(&home).expect("create credential home");
        let model_catalogs = Arc::new(ModelCatalogCache::new());
        let subscription_reader = match provider {
            UpstreamProvider::Codex => {
                std::fs::write(
                    home.join("auth.json"),
                    r#"{"tokens":{"access_token":"stub-codex-oauth-token","account_id":"acct_stub"}}"#,
                )
                .expect("write Codex credentials");
                record_catalog(&model_catalogs, SubscriptionProvider::Codex, "acct_stub");
                Some(SubscriptionReader::new(SubscriptionProvider::Codex, &home))
            }
            _ => None,
        };

        let provider_store =
            link_assistant_router::providers::ProviderStore::open(data.path(), "replay-secret")
                .expect("provider store");
        provider_store
            .set_subscription_entitlement_policy(
                link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                    "claude:codex",
                    "codex:claude",
                    "opencode:claude",
                    "opencode:codex",
                ])
                .expect("replay bridge policy"),
            )
            .expect("install replay bridge policy");
        let log_root = data.path().join("requests");
        let mut state = AppState {
            client: http_client(),
            token_manager: token_manager.clone(),
            oauth_provider,
            account_router: None,
            subscription_reader,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers: Vec::new(),
            model_catalogs,
            subscription_cache: Arc::new(TokenCache::new()),
            upstream_base_url: stub_url,
            upstream_provider: provider,
            gonka: None,
            bridge_model: Some(BRIDGE_MODEL.to_string()),
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
                log_root,
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
        if provider == UpstreamProvider::OpenAICompatible {
            state.openai_compatible.base_url = state.upstream_base_url.clone();
            state.openai_compatible.api_key = Some("stub-openai-compatible-key".into());
            state.openai_compatible.default_model = Some(BRIDGE_MODEL.into());
            state.openai_compatible.models = vec![BRIDGE_MODEL.into()];
            state.openai_compatible.supported_clients =
                vec!["opencode".into(), "codex".into(), "claude".into()];
        }
        let (url, router_task) = spawn(app(state)).await;
        Self {
            client: http_client(),
            url,
            provider,
            token_manager,
            stub,
            tasks: vec![stub_task, router_task],
            data,
        }
    }

    /// Queue cassettes for the next upstream requests; the last one repeats.
    pub fn replay(&self, cassettes: impl IntoIterator<Item = Cassette>) {
        let mut queue = self.stub.queue.lock().expect("stub queue");
        queue.clear();
        queue.extend(cassettes);
    }

    /// Slow the stub's body down so a client can disconnect mid-stream.
    pub fn set_chunk_delay(&self, delay: Option<Duration>) {
        *self.stub.chunk_delay.lock().expect("stub delay") = delay;
    }

    /// Every retained upstream request; empty when recording is disabled.
    pub fn requests(&self) -> Vec<Recorded> {
        self.stub
            .requests
            .as_ref()
            .map_or_else(Vec::new, |requests| {
                requests.lock().expect("stub requests").clone()
            })
    }

    pub fn clear_requests(&self) {
        if let Some(requests) = &self.stub.requests {
            requests.lock().expect("stub requests").clear();
        }
    }

    /// Issue a token bound to `client`, optionally with a spend cap.
    pub fn issue(&self, client: ClientKind, max_tokens: Option<u64>) -> (String, String) {
        self.token_manager
            .issue_with_id(&IssueRequest {
                ttl_hours: 1,
                label: "replay client",
                account: Some("primary"),
                max_tokens,
                client_kind: Some(client.canonical_name()),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            })
            .expect("issue replay token")
    }

    /// Tokens persisted against a token's budget.
    pub fn used_tokens(&self, id: &str) -> (u64, u64) {
        let record = self
            .token_manager
            .store()
            .get(id)
            .expect("read token record")
            .expect("token record exists");
        (record.used_tokens, record.reserved_tokens)
    }

    /// POST `body` to a client surface as the client that surface belongs to.
    pub fn post(&self, surface: Surface, token: &str, body: &Value) -> reqwest::RequestBuilder {
        let request = self
            .client
            .post(format!("{}{}", self.url, surface.path()))
            .json(body);
        match surface {
            Surface::AnthropicMessages | Surface::AnthropicCountTokens => request
                .header("x-api-key", token)
                .header("anthropic-version", "2023-06-01")
                .header("user-agent", "claude-cli/2.1.259 (external, cli)")
                .header("x-claude-code-session-id", "replay-session"),
            Surface::OpenAIResponses | Surface::CodexResponses => request
                .bearer_auth(token)
                .header("x-openai-internal-codex-responses-lite", "true")
                .header("user-agent", "codex_exec/0.153.0")
                .header("x-codex-turn-metadata", "replay-codex")
                .header("originator", "codex_cli_rs")
                .header("version", "0.153.0"),
            Surface::OpenAIChat => request
                .bearer_auth(token)
                .header("user-agent", "opencode/replay")
                .header("x-session-id", "replay-session"),
        }
    }
}

impl Drop for ReplayRouter {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
}

/// A client-facing surface of the router under test.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Surface {
    AnthropicMessages,
    AnthropicCountTokens,
    OpenAIChat,
    OpenAIResponses,
    CodexResponses,
}

impl Surface {
    pub const fn path(self) -> &'static str {
        match self {
            Self::AnthropicMessages => "/api/services/anthropic/v1/messages",
            Self::AnthropicCountTokens => "/api/services/anthropic/v1/messages/count_tokens",
            Self::OpenAIChat => "/api/services/openai/v1/chat/completions",
            Self::OpenAIResponses => "/api/services/openai/v1/responses",
            Self::CodexResponses => "/api/services/codex/v1/responses",
        }
    }

    /// The client a token for this surface is bound to.
    pub const fn client(self) -> ClientKind {
        match self {
            Self::AnthropicMessages | Self::AnthropicCountTokens => ClientKind::ClaudeCode,
            Self::OpenAIResponses | Self::CodexResponses => ClientKind::Codex,
            Self::OpenAIChat => ClientKind::Opencode,
        }
    }
}

fn record_catalog(catalogs: &ModelCatalogCache, provider: SubscriptionProvider, account: &str) {
    let fetched_at = chrono::Utc::now().timestamp();
    let record = CatalogRecord {
        provider,
        account: account.into(),
        canonical_id: BRIDGE_MODEL.into(),
        raw: json!({"slug": BRIDGE_MODEL})
            .as_object()
            .expect("catalog object")
            .clone(),
        source_order: 0,
        fetched_at,
        health_generation: "replay-generation".into(),
        protocols: [ClientProtocol::Catalog, ClientProtocol::OpenAIResponses]
            .into_iter()
            .collect(),
    };
    catalogs.record_records_for_account(
        provider,
        link_assistant_router::credential_recovery_store::PRIMARY_ACCOUNT,
        Some(account.to_string()),
        vec![record],
    );
}

fn app(state: AppState) -> Router {
    let logging_state = state.clone();
    Router::new()
        .route(
            "/api/services/anthropic/v1/messages",
            post(proxy::proxy_handler),
        )
        .route(
            "/api/services/anthropic/v1/messages/count_tokens",
            post(proxy::proxy_handler),
        )
        .route(
            "/api/services/openai/v1/chat/completions",
            post(proxy::openai_chat_completions),
        )
        .route(
            "/api/services/openai/v1/responses",
            post(proxy::openai_responses),
        )
        .route(
            "/api/services/codex/v1/responses",
            post(proxy::openai_responses_native),
        )
        .route("/api/services/openai/v1/models", get(proxy::openai_models))
        .with_state(state)
        .layer(axum::middleware::from_fn(
            link_assistant_router::contracts::validation::response_contract,
        ))
        .layer(axum::middleware::from_fn_with_state(
            logging_state,
            link_assistant_router::request_log::log_http_exchange,
        ))
}

pub async fn spawn(app: Router) -> (String, tokio::task::JoinHandle<()>) {
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
    if request.method() == axum::http::Method::GET && request.uri().path().ends_with("/models") {
        return json_response(
            StatusCode::OK,
            &json!({"object": "list", "data": [{"id": BRIDGE_MODEL}]}),
        );
    }
    let (parts, body) = request.into_parts();
    let raw = to_bytes(body, 16 * 1024 * 1024)
        .await
        .expect("read stub request");
    if let Some(requests) = &state.requests {
        let body = serde_json::from_slice::<Value>(&raw).unwrap_or(Value::Null);
        requests.lock().expect("stub requests").push(Recorded {
            path: parts.uri.to_string(),
            headers: parts.headers,
            raw: raw.to_vec(),
            body,
        });
    }
    // Even in non-recording mode the body must be consumed, but its bytes and
    // headers can be released before streaming the reply.
    drop(raw);
    let cassette = {
        let next = state.queue.lock().expect("stub queue").pop_front();
        let mut last = state.last.lock().expect("stub last");
        if let Some(next) = next {
            *last = Some(next);
        }
        last.clone()
    };
    let Some(cassette) = cassette else {
        return json_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            &json!({"error": "no cassette queued"}),
        );
    };
    let delay = *state.chunk_delay.lock().expect("stub delay");
    let body = match delay {
        None => Body::from(cassette.body.clone()),
        Some(delay) => {
            // One SSE event per chunk, each after `delay`.
            let text = String::from_utf8_lossy(&cassette.body).into_owned();
            let events = text
                .split_inclusive("\n\n")
                .map(|event| bytes::Bytes::from(event.to_string()))
                .collect::<Vec<_>>();
            let stream = futures_util::stream::iter(events).then(move |event| async move {
                tokio::time::sleep(delay).await;
                Ok::<_, std::io::Error>(event)
            });
            Body::from_stream(stream)
        }
    };
    let mut response = Response::new(body);
    *response.status_mut() = StatusCode::from_u16(cassette.status).expect("cassette status");
    for (name, value) in &cassette.headers {
        response.headers_mut().insert(
            HeaderName::from_bytes(name.as_bytes()).expect("cassette header name"),
            HeaderValue::from_str(value).expect("cassette header value"),
        );
    }
    response
}

fn json_response(status: StatusCode, body: &Value) -> Response {
    let mut response = Response::new(Body::from(body.to_string()));
    *response.status_mut() = status;
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_static("application/json"));
    response
}

use futures_util::StreamExt as _;

/// Every `data:` JSON payload of an SSE body, in order.
pub fn sse_events(body: &str) -> Vec<Value> {
    body.lines()
        .filter_map(|line| line.strip_prefix("data:"))
        .map(str::trim_start)
        .filter(|data| *data != "[DONE]")
        .filter_map(|data| serde_json::from_str(data).ok())
        .collect()
}

/// Concatenated text deltas of a translated stream, in any client dialect.
pub fn streamed_text(events: &[Value]) -> String {
    let mut text = String::new();
    for event in events {
        match event["type"].as_str() {
            Some("content_block_delta") => {
                if let Some(delta) = event["delta"]["text"].as_str() {
                    text.push_str(delta);
                }
            }
            Some("response.output_text.delta") => {
                text.push_str(event["delta"].as_str().unwrap_or_default());
            }
            Some(_) => {}
            None => {
                for choice in event["choices"].as_array().into_iter().flatten() {
                    if let Some(delta) = choice["delta"]["content"].as_str() {
                        text.push_str(delta);
                    }
                }
            }
        }
    }
    text
}
