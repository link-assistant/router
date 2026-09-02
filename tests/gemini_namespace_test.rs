//! Cross-provider coverage for the native Gemini namespace.
//!
//! Gemini CLI only speaks `ListModels` and `generateContent`. These tests drive
//! the real router over HTTP against a stubbed vendor to prove that one router
//! JWT exposes every connected subscription through that namespace — the gap
//! reported in issue #187, where `/api/services/gemini/v1beta/models` returned an empty
//! list while `/api/services/openai/v1/models` listed eight live Codex models.

use std::fmt::Write as _;
use std::sync::{Arc, Mutex};
use std::time::Duration;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::{Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::response::Response;
use axum::routing::get;
use link_assistant_router::app_state::AppState;
use link_assistant_router::clients::ClientKind;
use link_assistant_router::config::UpstreamProvider;
use link_assistant_router::gemini;
use link_assistant_router::model_catalog::ModelCatalogCache;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::refresh::TokenCache;
use link_assistant_router::subscription::{SubscriptionProvider, SubscriptionReader};
use link_assistant_router::token::{IssueRequest, TokenManager};
use serde_json::{Value, json};
use tempfile::TempDir;

/// Live catalogs seeded for the test, mirroring the reporter's setup: a Codex
/// subscription and a Claude subscription, and no Gemini credential at all.
const CODEX_MODELS: [&str; 2] = ["gpt-5.4-mini", "gpt-5"];
const CLAUDE_MODELS: [&str; 1] = ["claude-opus-4-7"];

enum CodexCatalog {
    Undiscovered,
    Discovered(Option<&'static str>),
}

struct TestRouter {
    client: reqwest::Client,
    url: String,
    token: String,
    catalogs: Arc<ModelCatalogCache>,
    forwarded: Arc<Mutex<Vec<Value>>>,
    tasks: Vec<tokio::task::JoinHandle<()>>,
    _data: TempDir,
}

impl TestRouter {
    /// Start a router whose only connected subscriptions are Codex and Claude.
    async fn start() -> Self {
        Self::start_with(true).await
    }

    async fn start_with(claude_connected: bool) -> Self {
        Self::start_configured(
            claude_connected,
            UpstreamProvider::Auto,
            CodexCatalog::Discovered(Some("acct_stub")),
        )
        .await
    }

    async fn start_configured(
        claude_connected: bool,
        upstream_provider: UpstreamProvider,
        codex_catalog: CodexCatalog,
    ) -> Self {
        let data = tempfile::tempdir().expect("temporary test data");
        let forwarded = Arc::new(Mutex::new(Vec::new()));
        let stub = Router::new()
            .fallback(stub_vendor)
            .with_state(Arc::clone(&forwarded));
        let (stub_url, stub_task) = spawn(stub).await;

        let token_manager = TokenManager::new("gemini-namespace-secret");
        let (token, _) = token_manager
            .issue_with_id(&IssueRequest {
                ttl_hours: 1,
                label: "gemini namespace client",
                account: Some("primary"),
                client_kind: Some(ClientKind::GeminiCli.canonical_name()),
                principal_id: Some("primary"),
                ..IssueRequest::default()
            })
            .expect("issue bound Gemini test token");
        let oauth_provider = OAuthProvider::new(data.path().to_str().expect("UTF-8 test path"));
        oauth_provider.set_token("stub-anthropic-oauth-token");

        let codex_home = data.path().join("codex");
        std::fs::create_dir_all(&codex_home).expect("create Codex home");
        std::fs::write(
            codex_home.join("auth.json"),
            r#"{"tokens":{"access_token":"stub-codex-oauth-token","account_id":"acct_stub"}}"#,
        )
        .expect("write Codex credentials");
        let claude_home = data.path().join("claude");
        std::fs::create_dir_all(&claude_home).expect("create Claude home");
        if claude_connected {
            std::fs::write(
                claude_home.join(".credentials.json"),
                r#"{"claudeAiOauth":{"accessToken":"stub-claude-oauth-token"}}"#,
            )
            .expect("write Claude credentials");
        }

        let catalogs = Arc::new(ModelCatalogCache::new());
        if let CodexCatalog::Discovered(account) = codex_catalog {
            catalogs.record_success_for(
                SubscriptionProvider::Codex,
                account.map(ToString::to_string),
                CODEX_MODELS.iter().map(ToString::to_string).collect(),
            );
        }
        catalogs.record_success(
            SubscriptionProvider::Claude,
            CLAUDE_MODELS.iter().map(ToString::to_string).collect(),
        );
        catalogs.record_success(SubscriptionProvider::Gemini, Vec::new());
        catalogs.record_success(SubscriptionProvider::Qwen, Vec::new());

        let subscription_readers = vec![
            SubscriptionReader::new(SubscriptionProvider::Codex, &codex_home),
            SubscriptionReader::new(SubscriptionProvider::Claude, &claude_home),
        ];
        let subscription_reader = link_assistant_router::subscription::active_subscription_reader(
            upstream_provider,
            &subscription_readers,
        );
        let provider_store = link_assistant_router::providers::ProviderStore::open(
            data.path(),
            "gemini-namespace-secret",
        )
        .expect("provider store");
        provider_store
            .set_subscription_entitlement_policy(
                link_assistant_router::client_policy::SubscriptionEntitlementPolicy::parse([
                    "gemini:claude",
                    "gemini:codex",
                ])
                .expect("exact Gemini compatibility overrides"),
            )
            .expect("install test policy");
        let state = AppState {
            client: reqwest::Client::new(),
            token_manager,
            oauth_provider,
            account_router: None,
            subscription_reader,
            subscription_base_url: Some(stub_url.clone()),
            subscription_readers,
            model_catalogs: Arc::clone(&catalogs),
            subscription_cache: Arc::new(TokenCache::new()),
            upstream_base_url: stub_url,
            upstream_provider,
            gonka: None,
            bridge_model: None,
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

        let app = Router::new()
            .route(
                "/api/services/openai/v1/models",
                get(link_assistant_router::proxy::openai_models),
            )
            .route(
                "/api/services/gemini/v1beta/models",
                get(gemini::native_models),
            )
            .route(
                "/api/services/gemini/v1beta/models/{model}",
                get(gemini::native_model).post(gemini::forward_native_gemini),
            )
            .route(
                "/api/services/vertex/v1/{*path}",
                axum::routing::post(gemini::forward_native_vertex),
            )
            .with_state(state);
        let (url, router_task) = spawn(app).await;

        Self {
            client: reqwest::Client::new(),
            url,
            token,
            catalogs,
            forwarded,
            tasks: vec![stub_task, router_task],
            _data: data,
        }
    }

    async fn get_json(&self, path: &str) -> (StatusCode, Value) {
        let response = self
            .client
            .get(format!("{}{path}", self.url))
            .header("x-goog-api-key", &self.token)
            .header("x-link-assistant-client", "gemini")
            .send()
            .await
            .expect("router GET");
        let status = response.status();
        let body = response.text().await.expect("router GET body");
        (
            status,
            serde_json::from_str(&body).unwrap_or(Value::String(body)),
        )
    }

    async fn post_native(&self, path: &str, body: &Value) -> (StatusCode, String) {
        let response = self
            .client
            .post(format!("{}{path}", self.url))
            .header("x-goog-api-key", &self.token)
            .header("x-goog-api-client", "gl-node/test gccl/test")
            .json(body)
            .send()
            .await
            .expect("router POST");
        let status = response.status();
        (status, response.text().await.expect("router POST body"))
    }
}

impl Drop for TestRouter {
    fn drop(&mut self) {
        for task in &self.tasks {
            task.abort();
        }
    }
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

/// Vendor stub that answers in the dialect implied by the upstream path.
async fn stub_vendor(
    State(forwarded): State<Arc<Mutex<Vec<Value>>>>,
    request: Request,
) -> Response {
    let path = request.uri().path().to_string();
    let body = to_bytes(request.into_body(), 1024 * 1024)
        .await
        .expect("read stub request");
    let body = serde_json::from_slice::<Value>(&body).unwrap_or(Value::Null);
    forwarded
        .lock()
        .expect("capture vendor request")
        .push(body.clone());

    let anthropic = path.contains("/v1/messages");
    let (payload, content_type) = if anthropic {
        (
            serde_json::to_string(&anthropic_message(&body)).expect("serialize Anthropic response"),
            "application/json",
        )
    } else {
        (codex_stream_for_request(&body), "text/event-stream")
    };
    let mut response = Response::new(Body::from(payload));
    response
        .headers_mut()
        .insert("content-type", HeaderValue::from_str(content_type).unwrap());
    response
}

fn anthropic_message(request: &Value) -> Value {
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
            "id": "msg_stub",
            "type": "message",
            "role": "assistant",
            "model": "claude-opus-4-7",
            "content": [{"type":"tool_use","id":"toolu_stub","name":"lookup","input":{"key":"value"}}],
            "stop_reason": "tool_use",
            "stop_sequence": null,
            "usage": {"input_tokens": 3, "output_tokens": 2}
        });
    }
    // Anthropic accepts `max_tokens` and honours it upstream, unlike the
    // ChatGPT backend the router has to emulate the cap for. The stub counts
    // one token per whitespace-separated word, matching the `output_tokens` it
    // reports for the untruncated answer.
    let answer = "stub answer";
    let words = answer.split_whitespace().collect::<Vec<_>>();
    let budget = request["max_tokens"].as_u64().map_or(words.len(), |cap| {
        usize::try_from(cap).unwrap_or(usize::MAX)
    });
    let capped = budget < words.len();
    let text = words[..budget.min(words.len())].join(" ");
    json!({
        "id": "msg_stub",
        "type": "message",
        "role": "assistant",
        "model": "claude-opus-4-7",
        "content": [{"type": "text", "text": text}],
        "stop_reason": if capped { "max_tokens" } else { "end_turn" },
        "stop_sequence": null,
        "usage": {"input_tokens": 3, "output_tokens": budget.min(words.len())}
    })
}

fn codex_stream_for_request(request: &Value) -> String {
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
    let output = if has_client_function && !has_tool_result {
        json!([{
            "id":"fc_stub",
            "type":"function_call",
            "status":"completed",
            "call_id":"call_gemini_e2e",
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
        "model": "gpt-5.4-mini",
        "output": output,
        "usage": {"input_tokens": 3, "output_tokens": 2, "total_tokens": 5}
    });
    let mut stream = String::new();
    for event in [
        json!({"type":"response.created","response":{"id":"resp_stub","status":"in_progress","model":"gpt-5.4-mini","output":[]}}),
        json!({"type":"response.completed","response":response}),
    ] {
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

fn model_names(catalog: &Value) -> Vec<String> {
    catalog["models"]
        .as_array()
        .expect("models array")
        .iter()
        .map(|model| model["name"].as_str().expect("model name").to_string())
        .collect()
}

/// Issue #187: the Gemini namespace listed nothing while the `OpenAI` catalog listed
/// every connected subscription's live catalog.
#[tokio::test]
async fn gemini_list_models_matches_the_union_of_connected_subscriptions() {
    let router = TestRouter::start().await;

    let (status, gemini_catalog) = router.get_json("/api/services/gemini/v1beta/models").await;
    assert_eq!(status, StatusCode::OK);
    let names = model_names(&gemini_catalog);
    for model in CODEX_MODELS.iter().chain(CLAUDE_MODELS.iter()) {
        assert!(
            names.contains(&format!("models/{model}")),
            "{model} missing from the Gemini namespace: {names:?}"
        );
    }

    let mut sorted_gemini = names;
    let mut expected = CODEX_MODELS
        .iter()
        .chain(CLAUDE_MODELS.iter())
        .map(|model| format!("models/{model}"))
        .collect::<Vec<_>>();
    sorted_gemini.sort();
    expected.sort();
    assert_eq!(
        sorted_gemini, expected,
        "the signed Gemini catalog must advertise exactly its permitted providers"
    );
}

/// A catalog discovered for an old account must disappear from every model
/// namespace until discovery completes for the credential that is installed
/// now.
#[tokio::test]
async fn gemini_omits_a_catalog_owned_by_another_account() {
    let router = TestRouter::start().await;
    router.catalogs.record_success_for(
        SubscriptionProvider::Codex,
        Some("acct_previous".to_string()),
        CODEX_MODELS.iter().map(ToString::to_string).collect(),
    );

    let (status, gemini_catalog) = router.get_json("/api/services/gemini/v1beta/models").await;
    assert_eq!(status, StatusCode::OK);
    let gemini_names = model_names(&gemini_catalog);

    assert!(
        !gemini_names.iter().any(|model| CODEX_MODELS
            .iter()
            .any(|codex| model == &format!("models/{codex}"))),
        "a prior account's Codex catalog must not be advertised: {gemini_names:?}"
    );

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
            &json!({"contents": [{"role": "user", "parts": [{"text": "hi"}]}]}),
        )
        .await;
    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "a prior account's model must not route through the current credential: {body}"
    );
    assert!(
        router
            .forwarded
            .lock()
            .expect("forwarded requests")
            .is_empty(),
        "an account-mismatched catalog must be rejected before any upstream request"
    );
}

#[tokio::test]
async fn pinned_native_inference_rejects_a_catalog_owned_by_another_account() {
    let router = TestRouter::start_configured(
        true,
        UpstreamProvider::Codex,
        CodexCatalog::Discovered(Some("acct_previous")),
    )
    .await;

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
            &json!({"contents": [{"role": "user", "parts": [{"text": "hi"}]}]}),
        )
        .await;

    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "a pinned provider cannot bypass catalog ownership: {body}"
    );
    assert!(
        router
            .forwarded
            .lock()
            .expect("forwarded requests")
            .is_empty(),
        "a pinned account mismatch must be refused before any upstream request"
    );
}

#[tokio::test]
async fn pinned_native_inference_keeps_cold_start_passthrough_without_an_owner_conflict() {
    let router =
        TestRouter::start_configured(true, UpstreamProvider::Codex, CodexCatalog::Undiscovered)
            .await;

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-cold-start:generateContent",
            &json!({"contents": [{"role": "user", "parts": [{"text": "hi"}]}]}),
        )
        .await;

    assert_eq!(
        status,
        StatusCode::OK,
        "a pinned cold start has no conflicting owner evidence: {body}"
    );
    assert_eq!(
        router.forwarded.lock().expect("forwarded requests").len(),
        1,
        "pinned cold-start inference must retain its established passthrough"
    );
}

#[tokio::test]
async fn pinned_native_inference_rejects_an_anonymous_discovered_catalog_for_a_known_account() {
    let router = TestRouter::start_configured(
        true,
        UpstreamProvider::Codex,
        CodexCatalog::Discovered(None),
    )
    .await;

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
            &json!({"contents": [{"role": "user", "parts": [{"text": "hi"}]}]}),
        )
        .await;

    assert_eq!(
        status,
        StatusCode::NOT_FOUND,
        "a completed anonymous discovery cannot own a known account: {body}"
    );
    assert!(
        router
            .forwarded
            .lock()
            .expect("forwarded requests")
            .is_empty(),
        "one-sided catalog identity must be refused before upstream"
    );
}

/// A disconnected subscription must not contribute a synthesized model.
#[tokio::test]
async fn gemini_list_models_omits_disconnected_subscriptions() {
    let router = TestRouter::start_with(false).await;

    let (status, catalog) = router.get_json("/api/services/gemini/v1beta/models").await;
    assert_eq!(status, StatusCode::OK);
    let names = model_names(&catalog);
    assert!(names.contains(&"models/gpt-5.4-mini".to_string()));
    assert!(
        !names.contains(&"models/claude-opus-4-7".to_string()),
        "a disconnected Claude subscription must not be advertised: {names:?}"
    );
}

#[tokio::test]
async fn gemini_get_model_resolves_a_codex_model_and_rejects_unknown_ones() {
    let router = TestRouter::start().await;

    let (status, model) = router
        .get_json("/api/services/gemini/v1beta/models/gpt-5.4-mini")
        .await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(model["name"], "models/gpt-5.4-mini");
    assert!(
        model["supportedGenerationMethods"]
            .as_array()
            .expect("generation methods")
            .contains(&json!("generateContent"))
    );

    let (status, error) = router
        .get_json("/api/services/gemini/v1beta/models/totally-made-up-xyz")
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    assert_eq!(error["error"]["status"], "NOT_FOUND");
}

/// Issue #187: `:generateContent` for a Codex model answered
/// `no healthy gemini credential is available`.
#[tokio::test]
async fn generate_content_serves_codex_and_claude_models_natively() {
    let router = TestRouter::start().await;

    for model in ["gpt-5.4-mini", "claude-opus-4-7"] {
        let (status, body) = router
            .post_native(
                &format!("/api/services/gemini/v1beta/models/{model}:generateContent"),
                &json!({
                    "systemInstruction": {"parts": [{"text": "be terse"}]},
                    "contents": [{"role": "user", "parts": [{"text": "hi"}]}],
                    "generationConfig": {"temperature": 0.2}
                }),
            )
            .await;
        assert_eq!(status, StatusCode::OK, "{model} failed: {body}");
        let native: Value = serde_json::from_str(&body).expect("Gemini response JSON");
        assert_eq!(
            native["candidates"][0]["content"]["parts"][0]["text"], "stub answer",
            "{model} returned {native}"
        );
        assert_eq!(native["candidates"][0]["content"]["role"], "model");
        assert_eq!(native["candidates"][0]["finishReason"], "STOP");
        assert_eq!(native["usageMetadata"]["totalTokenCount"], 5);
        assert_eq!(native["modelVersion"], model);
    }
}

/// Issue #378: Gemini CLI supplies `topP`, which is translated to `top_p`.
/// The `ChatGPT` subscription backend rejects that field, so capability
/// reconciliation must remove it only when the selected owner is Codex.
#[tokio::test]
async fn gemini_top_p_is_not_forwarded_to_codex() {
    let router = TestRouter::start().await;

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
            &json!({
                "contents": [{"role": "user", "parts": [{"text": "hi"}]}],
                "generationConfig": {"topP": 0.9}
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");

    let request = router
        .forwarded
        .lock()
        .expect("captured vendor requests")
        .last()
        .cloned()
        .expect("Codex request reached the stub");
    assert!(
        request.get("top_p").is_none(),
        "Codex received unsupported top_p: {request:#}"
    );
}

/// `maxOutputTokens` is optional in Gemini's protocol, and the `ChatGPT`
/// backend rejects the field outright, so the router enforces the cap itself
/// (see [`link_assistant_router::output_limit`]) instead of refusing an
/// ordinary client request. The native namespace must inherit that emulation
/// on every cross-provider model and report it in Gemini's own vocabulary:
/// truncated text with `finishReason: MAX_TOKENS`.
#[tokio::test]
async fn generate_content_emulates_the_output_cap_natively() {
    let router = TestRouter::start().await;

    for model in ["gpt-5.4-mini", "claude-opus-4-7"] {
        // A cap the answer fits into must not disturb an ordinary exchange.
        let (status, body) = router
            .post_native(
                &format!("/api/services/gemini/v1beta/models/{model}:generateContent"),
                &json!({
                    "contents": [{"role": "user", "parts": [{"text": "hi"}]}],
                    "generationConfig": {"maxOutputTokens": 32}
                }),
            )
            .await;
        assert_eq!(status, StatusCode::OK, "{model}: {body}");
        let native: Value = serde_json::from_str(&body).expect("Gemini response JSON");
        assert_eq!(
            native["candidates"][0]["content"]["parts"][0]["text"], "stub answer",
            "{model} returned {native}"
        );
        assert_eq!(native["candidates"][0]["finishReason"], "STOP", "{model}");

        // A cap below the answer truncates it and says so natively.
        let (status, body) = router
            .post_native(
                &format!("/api/services/gemini/v1beta/models/{model}:generateContent"),
                &json!({
                    "contents": [{"role": "user", "parts": [{"text": "hi"}]}],
                    "generationConfig": {"maxOutputTokens": 1}
                }),
            )
            .await;
        assert_eq!(status, StatusCode::OK, "{model}: {body}");
        let native: Value = serde_json::from_str(&body).expect("Gemini response JSON");
        let text = native["candidates"][0]["content"]["parts"][0]["text"]
            .as_str()
            .expect("candidate text");
        assert!(
            !text.is_empty() && "stub answer".starts_with(text) && text != "stub answer",
            "{model} returned {native}"
        );
        assert_eq!(
            native["candidates"][0]["finishReason"], "MAX_TOKENS",
            "{model} returned {native}"
        );
    }
}

#[tokio::test]
async fn stream_generate_content_emits_gemini_sse_for_a_cross_provider_model() {
    let router = TestRouter::start().await;

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:streamGenerateContent",
            &json!({"contents": [{"role": "user", "parts": [{"text": "hi"}]}]}),
        )
        .await;
    assert_eq!(status, StatusCode::OK);
    let payload = body
        .strip_prefix("data: ")
        .and_then(|rest| rest.strip_suffix("\n\n"))
        .expect("a Gemini SSE data frame");
    let native: Value = serde_json::from_str(payload).expect("SSE payload JSON");
    assert_eq!(
        native["candidates"][0]["content"]["parts"][0]["text"],
        "stub answer"
    );
}

/// Gemini CLI drives every edit through client tools, so the function-call
/// round trip must survive both translation hops.
#[tokio::test]
async fn generate_content_completes_a_client_tool_loop_over_codex() {
    let router = TestRouter::start().await;
    let tools = json!([{"functionDeclarations": [{
        "name": "lookup",
        "description": "look a key up",
        "parameters": {"type": "object", "properties": {"key": {"type": "string"}}}
    }]}]);

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
            &json!({
                "contents": [{"role": "user", "parts": [{"text": "look up value"}]}],
                "tools": tools,
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let native: Value = serde_json::from_str(&body).expect("Gemini response JSON");
    let call = &native["candidates"][0]["content"]["parts"][0]["functionCall"];
    assert_eq!(call["name"], "lookup");
    assert_eq!(call["args"]["key"], "value");

    // Second turn: the client returns the tool result in Gemini's shape.
    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
            &json!({
                "contents": [
                    {"role": "user", "parts": [{"text": "look up value"}]},
                    {"role": "model", "parts": [{"functionCall": call}]},
                    {"role": "user", "parts": [{"functionResponse": {
                        "name": "lookup", "response": {"result": "42"}
                    }}]}
                ],
                "tools": tools,
            }),
        )
        .await;
    assert_eq!(status, StatusCode::OK, "{body}");
    let native: Value = serde_json::from_str(&body).expect("Gemini response JSON");
    assert_eq!(
        native["candidates"][0]["content"]["parts"][0]["text"],
        "stub answer"
    );
}

#[tokio::test]
async fn generate_content_reports_an_unavailable_model_in_the_gemini_error_shape() {
    let router = TestRouter::start().await;

    let (status, body) = router
        .post_native(
            "/api/services/gemini/v1beta/models/totally-made-up-xyz:generateContent",
            &json!({"contents": [{"role": "user", "parts": [{"text": "hi"}]}]}),
        )
        .await;
    assert_eq!(status, StatusCode::NOT_FOUND);
    let error: Value = serde_json::from_str(&body).expect("Gemini error JSON");
    assert_eq!(error["error"]["code"], 404);
    assert_eq!(error["error"]["status"], "NOT_FOUND");
    assert!(
        error["error"]["message"]
            .as_str()
            .expect("error message")
            .contains("totally-made-up-xyz")
    );
}

/// Issue #377: JSON extraction failures must be rendered by the native API
/// boundary, otherwise Axum's generic rejection bypasses Gemini's documented
/// error envelope before either handler gets control.
#[tokio::test]
async fn malformed_json_uses_the_gemini_error_envelope_on_every_native_route() {
    let router = TestRouter::start().await;

    for path in [
        "/api/services/gemini/v1beta/models/gpt-5.4-mini:generateContent",
        "/api/services/gemini/v1beta/models/gpt-5.4-mini:streamGenerateContent",
        "/api/services/vertex/v1/projects/p/locations/us/publishers/google/models/gpt-5.4-mini:generateContent",
    ] {
        let response = router
            .client
            .post(format!("{}{path}", router.url))
            .bearer_auth(&router.token)
            .header("content-type", "application/json")
            .body(r#"{"contents":["#)
            .send()
            .await
            .expect("router malformed JSON POST");

        assert_eq!(response.status(), StatusCode::BAD_REQUEST, "{path}");
        assert_eq!(
            response
                .headers()
                .get("content-type")
                .and_then(|value| value.to_str().ok()),
            Some("application/json"),
            "{path}"
        );
        let body: Value = response.json().await.expect("Gemini error JSON");
        assert_eq!(body["error"]["code"], 400, "{path}: {body}");
        assert_eq!(
            body["error"]["status"], "INVALID_ARGUMENT",
            "{path}: {body}"
        );
        assert!(
            body["error"]["message"]
                .as_str()
                .is_some_and(|message| message
                    .starts_with("Failed to parse request body as JSON:")),
            "{path}: {body}"
        );
    }
}
