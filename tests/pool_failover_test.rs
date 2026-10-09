//! Pool failover and vendor rate-limit state against a stubbed vendor
//! (issues #676 and #677).
//!
//! Each test runs the real Anthropic pass-through over a three-account Claude
//! pool. The stub vendor tells the accounts apart by the OAuth token the router
//! sent, and answers each from a per-account script.

use std::collections::{HashMap, VecDeque};
use std::net::SocketAddr;
use std::sync::atomic::{AtomicU64, AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::{ConnectInfo, Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use axum::routing::{get, post};
use futures_util::StreamExt as _;
use link_assistant_router::account_http::AccountHttpPolicy;
use link_assistant_router::accounts::{AccountRouter, AccountRouterOptions, SelectionStrategy};
use link_assistant_router::app_state::AppState;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::pool_failover::{FailoverMode, PoolPolicy};
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::subscription::SubscriptionProvider;
use link_assistant_router::token::{IssueRequest, TokenManager};
use serde_json::{Value, json};
use tempfile::TempDir;

const ACCOUNTS: [&str; 3] = ["primary", "account-1", "account-2"];
const MESSAGES: &str = "/api/services/anthropic/v1/messages";
const COUNT_TOKENS: &str = "/api/services/anthropic/v1/messages/count_tokens";
const CODEX_RESPONSES: &str = "/api/services/codex/v1/responses";
const ADMIN_KEY: &str = "pool-admin";

/// One scripted vendor answer.
#[derive(Clone)]
enum Reply {
    /// A normal message: SSE when the request streams, JSON otherwise.
    Ok,
    /// An error status with extra headers, after an optional delay.
    Status {
        status: u16,
        headers: Vec<(&'static str, String)>,
        delay: Duration,
    },
    /// A `200` stream that sends `message_start` and one long text delta,
    /// then resets the connection (`reset`) or goes silent until the router
    /// hangs up (issues #668 and #669).
    Cut { reset: bool },
    /// A redirect to `location` (issue #669).
    Redirect { status: u16, location: String },
    /// A recorded error/event body, including an empty or interrupted stream.
    Recorded {
        status: u16,
        body: String,
        reset: bool,
    },
}

impl Reply {
    const fn status(status: u16) -> Self {
        Self::Status {
            status,
            headers: Vec::new(),
            delay: Duration::ZERO,
        }
    }
}

/// Response headers as `(name, value)` pairs.
type Headers = Vec<(&'static str, String)>;

#[derive(Clone, Default)]
struct Vendor {
    /// Scripted answers per account; an empty script answers [`Reply::Ok`].
    scripts: Arc<Mutex<HashMap<String, VecDeque<Reply>>>>,
    /// Answers given to every request on an account once its script is spent.
    always: Arc<Mutex<HashMap<String, Reply>>>,
    /// `(account, path, body)` per request received.
    seen: Arc<Mutex<Vec<(String, String, Value)>>>,
    /// Successful-answer headers per account.
    ok_headers: Arc<Mutex<HashMap<String, Headers>>>,
    /// `(account, client port)` per request: one port per TCP connection.
    peers: Arc<Mutex<Vec<(String, u16)>>>,
    /// `Cookie` headers received, per account.
    cookies: Arc<Mutex<Vec<(String, String)>>>,
    /// [`Reply::Cut`] streams whose connection the router closed.
    closed: Arc<AtomicUsize>,
}

impl Vendor {
    fn script(&self, account: &str, replies: impl IntoIterator<Item = Reply>) {
        self.scripts
            .lock()
            .unwrap()
            .entry(account.to_string())
            .or_default()
            .extend(replies);
    }

    fn always(&self, account: &str, reply: Reply) {
        self.always
            .lock()
            .unwrap()
            .insert(account.to_string(), reply);
    }

    fn seen(&self) -> Vec<(String, String, Value)> {
        self.seen.lock().unwrap().clone()
    }

    fn accounts_seen(&self) -> Vec<String> {
        self.seen()
            .into_iter()
            .map(|(account, ..)| account)
            .collect()
    }
}

async fn vendor(State(vendor): State<Vendor>, request: Request) -> Response {
    let token = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .and_then(|value| value.strip_prefix("Bearer "))
        .unwrap_or_default()
        .to_string();
    let account = token.strip_prefix("tok-").unwrap_or(&token).to_string();
    let path = request.uri().path().to_string();
    if let Some(ConnectInfo(peer)) = request.extensions().get::<ConnectInfo<SocketAddr>>() {
        vendor
            .peers
            .lock()
            .unwrap()
            .push((account.clone(), peer.port()));
    }
    if let Some(cookie) = request.headers().get("cookie") {
        let cookie = cookie.to_str().unwrap_or_default().to_string();
        vendor
            .cookies
            .lock()
            .unwrap()
            .push((account.clone(), cookie));
    }
    let body = to_bytes(request.into_body(), 1024 * 1024).await.unwrap();
    let body: Value = serde_json::from_slice(&body).unwrap_or(Value::Null);
    vendor
        .seen
        .lock()
        .unwrap()
        .push((account.clone(), path.clone(), body.clone()));
    let scripted = vendor
        .scripts
        .lock()
        .unwrap()
        .get_mut(&account)
        .and_then(VecDeque::pop_front);
    let reply = scripted
        .or_else(|| vendor.always.lock().unwrap().get(&account).cloned())
        .unwrap_or(Reply::Ok);
    match reply {
        Reply::Recorded {
            status,
            body,
            reset,
        } => {
            let chunks =
                futures_util::stream::iter([Ok::<_, std::io::Error>(bytes::Bytes::from(body))]);
            let tail = futures_util::stream::iter(
                reset.then(|| Err(std::io::Error::other("recorded disconnect"))),
            );
            let mut response = Response::new(Body::from_stream(chunks.chain(tail)));
            *response.status_mut() = StatusCode::from_u16(status).unwrap();
            response.headers_mut().insert(
                "content-type",
                HeaderValue::from_static("text/event-stream"),
            );
            response
        }
        Reply::Status {
            status,
            headers,
            delay,
        } => {
            tokio::time::sleep(delay).await;
            let mut response = Response::new(Body::from(
                json!({"type": "error", "error": {"type": "rate_limit_error",
                       "message": format!("scripted {status} from {account}")}})
                .to_string(),
            ));
            *response.status_mut() = StatusCode::from_u16(status).unwrap();
            response
                .headers_mut()
                .insert("content-type", HeaderValue::from_static("application/json"));
            for (name, value) in headers {
                response
                    .headers_mut()
                    .insert(name, HeaderValue::from_str(&value).unwrap());
            }
            response
        }
        Reply::Cut { reset } => cut_stream(&account, reset, vendor.closed.clone()),
        Reply::Redirect { status, location } => {
            let mut response = Response::new(Body::empty());
            *response.status_mut() = StatusCode::from_u16(status).unwrap();
            response
                .headers_mut()
                .insert("location", HeaderValue::from_str(&location).unwrap());
            response
        }
        Reply::Ok => {
            let streamed = body.get("stream").and_then(Value::as_bool) == Some(true);
            let (text, content_type) = if path.ends_with("/responses") {
                (codex_stream_from(&account), "text/event-stream")
            } else if path.ends_with("/count_tokens") {
                (r#"{"input_tokens":37}"#.to_string(), "application/json")
            } else if streamed {
                (stream_from(&account), "text/event-stream")
            } else {
                (message_from(&account).to_string(), "application/json")
            };
            let mut response = Response::new(Body::from(text));
            response
                .headers_mut()
                .insert("content-type", HeaderValue::from_static(content_type));
            // A vendor session cookie, which no other account may ever echo.
            response.headers_mut().insert(
                "set-cookie",
                HeaderValue::from_str(&format!("vendor_session={account}; Path=/")).unwrap(),
            );
            for (name, value) in vendor
                .ok_headers
                .lock()
                .unwrap()
                .get(&account)
                .cloned()
                .unwrap_or_default()
            {
                response
                    .headers_mut()
                    .insert(name, HeaderValue::from_str(&value).unwrap());
            }
            response
        }
    }
}

/// Counts a [`Reply::Cut`] stream the router hung up on.
struct Closed(Arc<AtomicUsize>);

impl Drop for Closed {
    fn drop(&mut self) {
        self.0.fetch_add(1, Ordering::SeqCst);
    }
}

/// Text of the one delta a [`Reply::Cut`] stream sends: 400 characters, an
/// estimated 100 output tokens.
const CUT_TEXT_CHARS: usize = 400;

fn cut_stream(account: &str, reset: bool, closed: Arc<AtomicUsize>) -> Response {
    use futures_util::StreamExt as _;
    let mut message = message_from(account);
    message["content"] = json!([]);
    message["usage"] = json!({"input_tokens": 3, "output_tokens": 1});
    let head = format!(
        "event: message_start\ndata: {}\n\nevent: content_block_delta\ndata: {}\n\n",
        json!({"type": "message_start", "message": message}),
        json!({"type": "content_block_delta", "index": 0,
               "delta": {"type": "text_delta", "text": "x".repeat(CUT_TEXT_CHARS)}}),
    );
    let first = futures_util::stream::once(async move {
        Ok::<_, std::io::Error>(axum::body::Bytes::from(head))
    });
    let tail = futures_util::stream::unfold(Some(Closed(closed)), move |guard| async move {
        let guard = guard?;
        // Let the head reach the router before the cut.
        tokio::time::sleep(Duration::from_millis(200)).await;
        if reset {
            drop(guard);
            Some((Err(std::io::Error::other("scripted reset")), None))
        } else {
            // The guard lives in this future until the router hangs up.
            std::future::pending::<()>().await;
            drop(guard);
            None
        }
    });
    let mut response = Response::new(Body::from_stream(first.chain(tail)));
    response.headers_mut().insert(
        "content-type",
        HeaderValue::from_static("text/event-stream"),
    );
    response
}

fn message_from(account: &str) -> Value {
    json!({
        "id": format!("msg_{}", account.replace('-', "_")),
        "type": "message",
        "role": "assistant",
        "model": "claude-sonnet-4-5",
        "content": [{"type": "text", "text": format!("answered by {account}")}],
        "stop_reason": "end_turn",
        "stop_sequence": null,
        "usage": {"input_tokens": 3, "output_tokens": 2}
    })
}

fn stream_from(account: &str) -> String {
    let message = message_from(account);
    let events = [
        json!({"type":"message_start","message":message}),
        json!({"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}),
        json!({"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":format!("answered by {account}")}}),
        json!({"type":"content_block_stop","index":0}),
        json!({"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null},"usage":{"output_tokens":2}}),
        json!({"type":"message_stop"}),
    ];
    let mut stream = String::new();
    for event in &events {
        let kind = event["type"].as_str().unwrap();
        stream.push_str("event: ");
        stream.push_str(kind);
        stream.push_str("\ndata: ");
        stream.push_str(&event.to_string());
        stream.push_str("\n\n");
    }
    stream
}

/// A native Codex Responses stream naming the account that answered.
fn codex_stream_from(account: &str) -> String {
    let id = format!("resp_{}", account.replace('-', "_"));
    let text = format!("answered by {account}");
    let events = [
        json!({"type":"response.created","response":{"id":id,"model":"gpt-5","status":"in_progress","output":[]}}),
        json!({"type":"response.output_text.delta","item_id":"msg_1","output_index":0,"content_index":0,"delta":text}),
        json!({"type":"response.completed","response":{"id":id,"object":"response","model":"gpt-5","status":"completed",
            "output":[{"id":"msg_1","type":"message","role":"assistant","status":"completed",
                       "content":[{"type":"output_text","text":text,"annotations":[]}]}],
            "usage":{"input_tokens":3,"output_tokens":2,"total_tokens":5}}}),
    ];
    let mut stream = String::new();
    for event in &events {
        stream.push_str("event: ");
        stream.push_str(event["type"].as_str().unwrap());
        stream.push_str("\ndata: ");
        stream.push_str(&event.to_string());
        stream.push_str("\n\n");
    }
    stream.push_str("data: [DONE]\n\n");
    stream
}

struct Pool {
    client: reqwest::Client,
    url: String,
    /// Base URL of the stub vendor.
    stub_url: String,
    token: String,
    token_id: String,
    vendor: Vendor,
    router: AccountRouter,
    state: AppState,
    data: TempDir,
    tasks: Vec<tokio::task::JoinHandle<()>>,
}

impl Drop for Pool {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
}

struct Options {
    failover: bool,
    cooldown: Duration,
    clock: Option<Arc<AtomicU64>>,
    pause_at_percent: Option<u8>,
    /// Pool Codex accounts behind the native Responses route instead of
    /// Claude accounts behind the Anthropic pass-through.
    codex: bool,
    /// Per-account connection and egress settings (issue #678).
    http: AccountHttpPolicy,
    retry: link_assistant_router::pool_retry::RetryPolicy,
    routing_policy: Option<link_assistant_router::account_routing_policy::AccountRoutingPolicy>,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            failover: true,
            cooldown: Duration::from_secs(60),
            clock: None,
            pause_at_percent: None,
            codex: false,
            http: AccountHttpPolicy::default(),
            retry: link_assistant_router::pool_retry::RetryPolicy::default(),
            routing_policy: None,
        }
    }
}

async fn spawn(app: Router) -> (String, tokio::task::JoinHandle<()>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let task = tokio::spawn(async move {
        // Connect info lets the vendor tell TCP connections apart.
        axum::serve(
            listener,
            app.into_make_service_with_connect_info::<SocketAddr>(),
        )
        .await
        .unwrap();
    });
    (format!("http://{address}"), task)
}

impl Pool {
    async fn start(options: Options) -> Self {
        link_assistant_router::upstream_guard::install_process_policy(
            link_assistant_router::upstream_guard::NetworkPolicy::parse(Some("loopback")),
        );
        // Process-wide, so every test in this binary installs the same one.
        link_assistant_router::pool_failover::install(PoolPolicy {
            failover: FailoverMode::PreFirstByte,
            max_attempts: 3,
            budget: Duration::from_secs(30),
            pause_at_percent: None,
            intercept_warmup: true,
            account_http: AccountHttpPolicy::default(),
            ..Default::default()
        });
        let data = tempfile::tempdir().unwrap();
        let homes: Vec<_> = ACCOUNTS
            .iter()
            .map(|account| {
                let home = data.path().join(account);
                std::fs::create_dir_all(&home).unwrap();
                let (file, credentials) = if options.codex {
                    (
                        "auth.json",
                        json!({"tokens": {
                            "access_token": format!("tok-{account}"),
                            "account_id": format!("acct_{account}"),
                        }}),
                    )
                } else {
                    (
                        ".credentials.json",
                        json!({"claudeAiOauth": {
                            "accessToken": format!("tok-{account}"),
                            "refreshToken": format!("refresh-{account}"),
                            "expiresAt": 4_102_444_800_000_i64,
                        }}),
                    )
                };
                std::fs::write(home.join(file), credentials.to_string()).unwrap();
                if let Some(policy) = &options.routing_policy {
                    policy.save(&home).unwrap();
                }
                home
            })
            .collect();
        let router = AccountRouter::new_for_provider(
            homes[0].clone(),
            &homes[1..],
            if options.codex {
                SubscriptionProvider::Codex
            } else {
                SubscriptionProvider::Claude
            },
            AccountRouterOptions {
                strategy: SelectionStrategy::Priority,
                cooldown: options.cooldown,
                session_affinity_ttl: Duration::from_secs(3600),
                request_limits: Vec::new(),
                failover: options.failover,
                pause_at_percent: options.pause_at_percent,
                state_dir: Some(data.path().to_path_buf()),
                http: options.http.clone(),
                retry: options.retry,
                ..Default::default()
            },
        );
        let cache = Arc::new(TokenCache::new());
        router.register_credential_stores(&cache);

        let vendor = Vendor::default();
        let stub = Router::new()
            .route(
                "/responses",
                get(websocket_cooling::vendor_websocket).post(vendor_handler),
            )
            .fallback(vendor_handler)
            .with_state(vendor.clone());
        let (stub_url, stub_task) = spawn(stub).await;

        let token_manager = TokenManager::new("pool-failover-secret");
        let (token, token_id) = token_manager
            .issue_with_id(&IssueRequest {
                ttl_hours: 1,
                label: "pool client",
                max_tokens: Some(100_000),
                client_kind: Some(if options.codex { "codex" } else { "claude" }),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            })
            .unwrap();
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager,
            oauth_provider: OAuthProvider::new(data.path().to_str().unwrap()),
            account_router: Some(router.clone()),
            subscription_reader: None,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers: Vec::new(),
            model_catalogs: Arc::new(ModelCatalogCache::new()),
            subscription_cache: cache,
            upstream_base_url: stub_url.clone(),
            upstream_provider: if options.codex {
                UpstreamProvider::Codex
            } else {
                UpstreamProvider::Anthropic
            },
            gonka: None,
            bridge_model: None,
            bridge_model_policy:
                link_assistant_router::bridge_selection::BridgeModelPolicy::default(),
            crater: None,
            openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
            provider_store: link_assistant_router::providers::ProviderStore::open(
                data.path(),
                "pool-failover-secret",
            )
            .unwrap(),
            logger: log_lazy::LogLazy::new(),
            admin: Arc::new(link_assistant_router::admin::AdminClaim::load(
                Some(ADMIN_KEY.to_string()),
                data.path(),
                Duration::from_secs(60),
            )),
            admin_key: Some(ADMIN_KEY.to_string()),
            allow_anonymous_admin: false,
            metrics: Arc::new(link_assistant_router::metrics::Metrics::default()),
            audit: Arc::new(link_assistant_router::audit::AuditLog::to_path(Some(
                data.path().join("audit.jsonl").to_str().unwrap(),
            ))),
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
            max_proxy_request_bytes: link_assistant_router::proxy::MAX_PROXY_REQUEST_BYTES,
        };
        if options.routing_policy.is_some() {
            for account in ACCOUNTS {
                state.model_catalogs.record_success_for_account(
                    router.provider(),
                    account,
                    options.codex.then(|| format!("acct_{account}")),
                    vec![
                        "gpt-5".into(),
                        "gpt-5-mini".into(),
                        "claude-sonnet-4-5".into(),
                    ],
                );
            }
        }
        let app = Router::new()
            .route(
                "/api/management/routing",
                axum::routing::patch(link_assistant_router::routing_api::update),
            )
            .route(
                "/api/management/routing/cooldown/reset",
                post(link_assistant_router::routing_api::reset),
            )
            .route(MESSAGES, post(link_assistant_router::proxy::proxy_handler))
            .route(
                COUNT_TOKENS,
                post(link_assistant_router::proxy::proxy_handler),
            )
            .route(
                CODEX_RESPONSES,
                post(link_assistant_router::proxy::openai_responses_native)
                    .get(link_assistant_router::responses_websocket::codex),
            )
            .route(
                "/api/management/accounts",
                get(link_assistant_router::monitoring_api::accounts_endpoint),
            )
            .route(
                "/api/management/accounts/{name}/pause",
                post(link_assistant_router::monitoring_api::account_pause_endpoint),
            )
            .route(
                "/api/management/accounts/{name}/resume",
                post(link_assistant_router::monitoring_api::account_resume_endpoint),
            )
            .route(
                "/metrics",
                get(link_assistant_router::monitoring_api::metrics_endpoint),
            )
            .with_state(state.clone());
        let app = if options.routing_policy.is_some() {
            use lino_arguments::Parser as _;
            let config = link_assistant_router::cli::Cli::try_parse_from([
                "router",
                "--token-secret",
                "pool-failover-secret",
                "--data-dir",
                data.path().to_str().unwrap(),
            ])
            .unwrap()
            .into_config()
            .unwrap();
            link_assistant_router::server_router::router(state.clone(), &config)
        } else {
            app
        };
        let app = if let Some(clock) = options.clock {
            app.layer(axum::middleware::from_fn(
                move |request: Request, next: axum::middleware::Next| {
                    let mut context =
                        link_assistant_router::operation_context::OperationContext::default();
                    context.now = chrono::DateTime::from_timestamp(
                        clock.load(Ordering::Relaxed).try_into().unwrap(),
                        0,
                    );
                    async move { context.scope_async(next.run(request)).await }
                },
            ))
        } else {
            app
        };
        let (url, app_task) = spawn(app).await;
        Self {
            // Never follows a relayed redirect, so a test sees what the router sent.
            client: reqwest::Client::builder()
                .redirect(reqwest::redirect::Policy::none())
                .build()
                .unwrap(),
            url,
            stub_url,
            token,
            token_id,
            vendor,
            router,
            state,
            data,
            tasks: vec![stub_task, app_task],
        }
    }

    fn post(&self, path: &str, session: Option<&str>, body: &Value) -> reqwest::RequestBuilder {
        let request = self
            .client
            .post(format!("{}{path}", self.url))
            .header("x-api-key", &self.token)
            .header("anthropic-version", "2023-06-01")
            .header("user-agent", "claude-cli/2.1.259")
            .json(body);
        match session {
            Some(session) => request.header("x-claude-code-session-id", session),
            None => request,
        }
    }

    /// A native Codex Responses request, as the Codex CLI sends it.
    async fn send_codex(&self, body: &Value) -> (StatusCode, String) {
        let response = self
            .client
            .post(format!("{}{CODEX_RESPONSES}", self.url))
            .bearer_auth(&self.token)
            .header("x-openai-internal-codex-responses-lite", "true")
            .header("user-agent", "codex_exec/0.153.0")
            .header("x-codex-turn-metadata", "pool-failover-codex")
            .header("originator", "codex_cli_rs")
            .header("version", "0.153.0")
            .json(body)
            .send()
            .await
            .unwrap();
        let status = response.status();
        (status, response.text().await.unwrap())
    }

    async fn send(&self, session: Option<&str>, body: &Value) -> (StatusCode, String) {
        let response = self.post(MESSAGES, session, body).send().await.unwrap();
        let status = response.status();
        (status, response.text().await.unwrap())
    }

    fn admin(&self, path: &str) -> reqwest::RequestBuilder {
        self.client
            .post(format!("{}{path}", self.url))
            .bearer_auth(ADMIN_KEY)
    }

    fn health(&self, account: &str) -> link_assistant_router::accounts::AccountHealth {
        self.router
            .health_snapshot()
            .into_iter()
            .find(|health| health.name == account)
            .unwrap()
    }
}

async fn vendor_handler(state: State<Vendor>, request: Request) -> Response {
    vendor(state, request).await
}

fn hello(stream: bool) -> Value {
    json!({
        "model": "claude-sonnet-4-5",
        "max_tokens": 64,
        "stream": stream,
        "messages": [{"role": "user", "content": "hello"}]
    })
}

fn rate_limited_for(seconds: u64) -> Reply {
    let reset = link_assistant_router::account_limits::now_unix() + seconds;
    Reply::Status {
        status: 429,
        headers: vec![
            ("Anthropic-Ratelimit-Unified-Status", "rejected".into()),
            ("anthropic-ratelimit-unified-5h-status", "rejected".into()),
            ("anthropic-ratelimit-unified-5h-reset", reset.to_string()),
            ("anthropic-ratelimit-unified-5h-utilization", "1.0".into()),
        ],
        delay: Duration::ZERO,
    }
}

#[path = "pool_failover/cases.rs"]
mod cases;
#[path = "pool_failover/codex.rs"]
mod codex;
#[path = "pool_failover/isolation.rs"]
mod isolation;
#[path = "pool_failover/model_cooling.rs"]
mod model_cooling;
#[path = "pool_failover/streams.rs"]
mod streams;

#[path = "pool_failover/routing_controls.rs"]
mod routing_controls;

#[path = "pool_failover/websocket_cooling.rs"]
mod websocket_cooling;

#[path = "pool_failover/account_policies.rs"]
mod account_policies;
