//! Multi-account regressions for request-local catalog validation.

use super::tests::auto_state;
use super::*;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use std::collections::BTreeMap;
use std::fs;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;

const MODEL: &str = "claude-pool-model";

struct PoolHarness {
    state: AppState,
    authorizations: Arc<Mutex<Vec<String>>>,
    task: tokio::task::JoinHandle<()>,
    _data: TempDir,
    _primary: TempDir,
    _additional: TempDir,
}

impl PoolHarness {
    async fn start(
        upstream_provider: UpstreamProvider,
        options: crate::accounts::AccountRouterOptions,
    ) -> Self {
        let data = tempfile::tempdir().unwrap();
        let primary = tempfile::tempdir().unwrap();
        let additional = tempfile::tempdir().unwrap();
        write_claude_credential(&primary, "primary-access");
        write_claude_credential(&additional, "account-1-access");

        let authorizations = Arc::new(Mutex::new(Vec::new()));
        let captured = Arc::clone(&authorizations);
        let stub = axum::Router::new().fallback(move |headers: HeaderMap| {
            let captured = Arc::clone(&captured);
            async move {
                captured.lock().unwrap().push(
                    headers
                        .get("authorization")
                        .and_then(|value| value.to_str().ok())
                        .unwrap_or_default()
                        .to_string(),
                );
                axum::Json(json!({
                    "id": "msg_pool",
                    "type": "message",
                    "role": "assistant",
                    "model": MODEL,
                    "content": [{"type": "text", "text": "ok"}],
                    "stop_reason": "end_turn",
                    "usage": {"input_tokens": 1, "output_tokens": 1}
                }))
            }
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base_url = format!("http://{}", listener.local_addr().unwrap());
        let task = tokio::spawn(async move {
            axum::serve(listener, stub).await.unwrap();
        });

        let reader = SubscriptionReader::new(SubscriptionProvider::Claude, primary.path());
        let mut state = auto_state(vec![reader], data.path());
        state.upstream_provider = upstream_provider;
        state.upstream_base_url = base_url;
        state
            .model_catalogs
            .record_success(SubscriptionProvider::Claude, vec![MODEL.to_string()]);
        let router = crate::accounts::AccountRouter::new_for_provider(
            primary.path().to_path_buf(),
            &[additional.path().to_path_buf()],
            SubscriptionProvider::Claude,
            options,
        );
        router.register_credential_stores(&state.subscription_cache, data.path());
        state.account_router = Some(router);

        Self {
            state,
            authorizations,
            task,
            _data: data,
            _primary: primary,
            _additional: additional,
        }
    }

    fn token(&self, account: Option<&str>) -> String {
        self.state
            .token_manager
            .issue_token_for(1, "pool route", account)
            .unwrap()
    }

    fn headers(token: &str, session: Option<&str>) -> HeaderMap {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );
        if let Some(session) = session {
            headers.insert("x-session-id", HeaderValue::from_str(session).unwrap());
        }
        headers
    }

    async fn chat(&self, token: &str, session: Option<&str>) -> axum::response::Response {
        crate::proxy::openai_chat_completions(
            State(self.state.clone()),
            Query(BTreeMap::new()),
            Self::headers(token, session),
            Ok(axum::Json(json!({
                "model": MODEL,
                "messages": [{"role": "user", "content": "hello"}]
            }))),
        )
        .await
    }
}

impl Drop for PoolHarness {
    fn drop(&mut self) {
        self.task.abort();
    }
}

fn write_claude_credential(directory: &TempDir, access_token: &str) {
    fs::write(
        directory.path().join(".credentials.json"),
        json!({
            "claudeAiOauth": {
                "accessToken": access_token,
                "expiresAt": 9_999_999_999_999_i64
            }
        })
        .to_string(),
    )
    .unwrap();
}

#[tokio::test]
async fn automatic_routing_honors_a_strict_pool_pin_and_request_limit() {
    let harness = PoolHarness::start(
        UpstreamProvider::Auto,
        crate::accounts::AccountRouterOptions {
            request_limits: vec![None, Some(1)],
            ..crate::accounts::AccountRouterOptions::default()
        },
    )
    .await;
    let token = harness.token(Some("account-1"));

    let first = harness.chat(&token, None).await;
    assert_eq!(first.status(), StatusCode::OK);
    assert_eq!(
        harness.authorizations.lock().unwrap().as_slice(),
        ["Bearer account-1-access"]
    );

    let exhausted = harness.chat(&token, None).await;
    assert_eq!(
        exhausted.status(),
        StatusCode::BAD_GATEWAY,
        "the Anthropic bridge preserves its credential-resolution error status"
    );
    assert_eq!(
        harness.authorizations.lock().unwrap().len(),
        1,
        "the exhausted pinned account must not fall back to primary"
    );
}

#[tokio::test]
async fn automatic_routing_preserves_pool_session_affinity() {
    let harness = PoolHarness::start(
        UpstreamProvider::Auto,
        crate::accounts::AccountRouterOptions::default(),
    )
    .await;
    let token = harness.token(None);

    assert_eq!(
        harness.chat(&token, Some("same-session")).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        harness.chat(&token, Some("same-session")).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        harness.chat(&token, Some("new-session")).await.status(),
        StatusCode::OK
    );
    assert_eq!(
        harness.authorizations.lock().unwrap().as_slice(),
        [
            "Bearer primary-access",
            "Bearer primary-access",
            "Bearer account-1-access"
        ]
    );
}

#[tokio::test]
async fn pinned_native_routing_honors_a_strict_pool_pin() {
    let harness = PoolHarness::start(
        UpstreamProvider::Anthropic,
        crate::accounts::AccountRouterOptions::default(),
    )
    .await;
    let token = harness.token(Some("account-1"));
    let response = Box::pin(crate::gemini::forward_native_gemini(
        State(harness.state.clone()),
        Path(format!("models/{MODEL}:generateContent")),
        PoolHarness::headers(&token, None),
        Ok(axum::Json(json!({
            "contents": [{"role": "user", "parts": [{"text": "hello"}]}]
        }))),
    ))
    .await;

    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        harness.authorizations.lock().unwrap().as_slice(),
        ["Bearer account-1-access"]
    );
}
