//! Multi-account regressions for request-local catalog validation.

use super::tests::auto_state;
use super::*;
use axum::extract::{Path, Query, State};
use axum::http::{HeaderMap, HeaderValue, StatusCode};
use axum::response::Response;
use http_body_util::BodyExt as _;
use std::collections::BTreeMap;
use std::fs;
use std::sync::{Arc, Mutex};
use tempfile::TempDir;

const MODEL: &str = "claude-pool-model";
const CODEX_MODEL: &str = "gpt-pool-model";

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
        router.register_credential_stores_in(&state.subscription_cache, data.path());
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

fn write_codex_credential(directory: &TempDir, access_token: &str, account_id: &str) {
    fs::write(
        directory.path().join("auth.json"),
        json!({
            "tokens": {
                "access_token": access_token,
                "account_id": account_id
            }
        })
        .to_string(),
    )
    .unwrap();
}

fn codex_pool_state(
    options: crate::accounts::AccountRouterOptions,
) -> (AppState, TempDir, TempDir, TempDir) {
    let data = tempfile::tempdir().unwrap();
    let primary = tempfile::tempdir().unwrap();
    let additional = tempfile::tempdir().unwrap();
    write_codex_credential(&primary, "primary-access", "acct-primary");
    write_codex_credential(&additional, "account-1-access", "acct-secondary");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, primary.path());
    let mut state = auto_state(vec![reader], data.path());
    let router = crate::accounts::AccountRouter::new_for_provider(
        primary.path().to_path_buf(),
        &[additional.path().to_path_buf()],
        SubscriptionProvider::Codex,
        options,
    );
    router.register_credential_stores_in(&state.subscription_cache, data.path());
    state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("acct-primary".to_string()),
        vec![CODEX_MODEL.to_string()],
    );
    state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "account-1",
        Some("acct-secondary".to_string()),
        vec![CODEX_MODEL.to_string()],
    );
    state.account_router = Some(router);
    (state, data, primary, additional)
}

async fn selected_codex_account(
    state: &AppState,
    context: &crate::accounts::RoutingContext,
) -> Result<String, String> {
    let routed = route_subscription_model(state, CODEX_MODEL)
        .await
        .map_err(|error| error.to_string())?;
    routed
        .subscription
        .expect("Codex pool carries a deferred snapshot")
        .for_dispatch_with_context(&routed.state, context)
        .await
        .map(|selected| selected.name)
}

#[tokio::test]
async fn known_codex_accounts_preserve_strict_pins_and_limits() {
    let (state, _data, _primary, _additional) =
        codex_pool_state(crate::accounts::AccountRouterOptions {
            request_limits: vec![None, Some(1)],
            ..crate::accounts::AccountRouterOptions::default()
        });
    let pin = crate::accounts::RoutingContext::pinned("account-1");

    assert_eq!(
        selected_codex_account(&state, &pin).await.unwrap(),
        "account-1"
    );
    assert!(selected_codex_account(&state, &pin).await.is_err());
}

#[tokio::test]
async fn known_codex_accounts_preserve_round_robin_and_session_affinity() {
    let (state, _data, _primary, _additional) =
        codex_pool_state(crate::accounts::AccountRouterOptions::default());

    assert_eq!(
        selected_codex_account(&state, &crate::accounts::RoutingContext::default())
            .await
            .unwrap(),
        "primary"
    );
    assert_eq!(
        selected_codex_account(&state, &crate::accounts::RoutingContext::default())
            .await
            .unwrap(),
        "account-1"
    );
    let session = crate::accounts::RoutingContext::for_session("stable-session");
    let first = selected_codex_account(&state, &session).await.unwrap();
    let second = selected_codex_account(&state, &session).await.unwrap();
    assert_eq!(first, second);
}

#[tokio::test]
async fn one_rejected_codex_account_fails_over_without_poisoning_provider_health() {
    let (state, _data, _primary, _additional) =
        codex_pool_state(crate::accounts::AccountRouterOptions::default());
    state
        .subscription_cache
        .record_credential_rejected_for(SubscriptionProvider::Codex, "primary");
    state.model_catalogs.record_failure_for_account(
        SubscriptionProvider::Codex,
        "primary",
        "HTTP 401 primary rejected",
        true,
    );

    assert_eq!(
        selected_codex_account(&state, &crate::accounts::RoutingContext::default())
            .await
            .unwrap(),
        "account-1"
    );
    let health = configured_provider_health_report(&state).await;
    assert_eq!(health.len(), 1);
    assert_eq!(health[0].state, ProviderHealthState::Healthy);
}

async fn json_body(response: Response) -> serde_json::Value {
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    serde_json::from_slice(&bytes).unwrap()
}

#[tokio::test]
async fn inference_rejection_removes_only_that_accounts_models_from_both_listings() {
    let (state, _data, _primary, _additional) =
        codex_pool_state(crate::accounts::AccountRouterOptions::default());
    state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "primary",
        Some("acct-primary".into()),
        vec!["gpt-primary-only".into()],
    );
    state.model_catalogs.record_success_for_account(
        SubscriptionProvider::Codex,
        "account-1",
        Some("acct-secondary".into()),
        vec!["gpt-secondary-only".into()],
    );
    state
        .subscription_cache
        .record_status_for(SubscriptionProvider::Codex, "primary", 401);

    let client_token = state.token_manager.issue_token(1, "pool listing").unwrap();
    let openai = json_body(
        models(
            State(state.clone()),
            PoolHarness::headers(&client_token, None),
        )
        .await,
    )
    .await;
    let openai_ids = openai["data"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|model| model["id"].as_str())
        .collect::<Vec<_>>();
    assert_eq!(openai_ids, ["gpt-secondary-only"]);

    let gemini = json_body(
        crate::gemini::native_models(State(state.clone()))
            .await
            .into_response(),
    )
    .await;
    let gemini_ids = gemini["models"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|model| model["name"].as_str())
        .collect::<Vec<_>>();
    assert_eq!(gemini_ids, ["models/gpt-secondary-only"]);

    let routed = route_subscription_model(&state, "gpt-primary-only")
        .await
        .expect("provider catalog still identifies the owning pool");
    assert!(
        routed
            .subscription
            .unwrap()
            .for_dispatch_with_context(&routed.state, &crate::accounts::RoutingContext::default())
            .await
            .is_err(),
        "the healthy neighbour must not serve an account-A-only model"
    );
}

#[tokio::test]
async fn replacing_a_rejected_pool_credential_makes_it_immediately_eligible() {
    let (state, _data, primary, _additional) =
        codex_pool_state(crate::accounts::AccountRouterOptions::default());
    let original = state
        .subscription_cache
        .load_authoritative(SubscriptionProvider::Codex, "primary")
        .await
        .unwrap()
        .unwrap();
    state
        .subscription_cache
        .get_fresh_loaded(
            &state.client,
            SubscriptionProvider::Codex,
            "primary",
            original,
            chrono::Utc::now().timestamp_millis(),
        )
        .await
        .unwrap();
    state
        .subscription_cache
        .record_status_for(SubscriptionProvider::Codex, "primary", 401);
    write_codex_credential(&primary, "reauthenticated-access", "acct-primary");

    assert_eq!(
        selected_codex_account(&state, &crate::accounts::RoutingContext::pinned("primary"))
            .await
            .unwrap(),
        "primary"
    );
    assert_ne!(
        state
            .subscription_cache
            .evidence_for(SubscriptionProvider::Codex, "primary"),
        Some(crate::refresh::CredentialEvidence::Rejected)
    );
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
