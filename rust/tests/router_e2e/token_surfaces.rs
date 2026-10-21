//! Cross-surface token control tests (issue #194).
//!
//! A token's constraints must mean the same thing no matter which admin
//! surface minted it, and must survive a restart. These tests issue the same
//! credential through the HTTP API and through the chat commands, then enforce
//! it over the proxy the same way.

use super::*;

use link_assistant_router::admin::AdminClaim;
use link_assistant_router::chat_admin::{ChatAdmin, ChatAdminConfig, ChatChannel};
use link_assistant_router::storage::{TextTokenStore, TokenStore};

/// The flat admin key `TestRouter` is built with.
const ADMIN_KEY: &str = "admin-only";

/// A chat surface sharing the router's token store, signed in and unthrottled.
fn signed_in_chat(tokens: TokenManager) -> ChatAdmin {
    let chat = ChatAdmin::new(
        Arc::new(AdminClaim::in_memory(
            Some(ADMIN_KEY.into()),
            Duration::from_secs(60),
        )),
        tokens,
        Some(ADMIN_KEY.into()),
        ChatAdminConfig {
            rate_limit_per_minute: 0,
            ..ChatAdminConfig::default()
        },
    );
    chat.handle(ChatChannel::Telegram, "1", &format!("/auth {ADMIN_KEY}"));
    chat
}

/// Issue a token over the admin HTTP API exactly as the web UI does.
async fn issue_over_http(router: &TestRouter, body: Value) -> Value {
    let response = router
        .client
        .post(format!("{}/api/management/tokens", router.url))
        .bearer_auth(ADMIN_KEY)
        .json(&body)
        .send()
        .await
        .expect("issue over http");
    assert_eq!(response.status(), StatusCode::OK, "issue must succeed");
    response.json().await.expect("issue response json")
}

/// The web form's full field set round-trips and is echoed back intact.
#[tokio::test]
async fn the_http_surface_accepts_every_constraint() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let issued = issue_over_http(
        &router,
        json!({
            "label": "web-issued",
            "ttl_hours": 12,
            "max_requests": 5,
            "max_tokens": 90_000,
            "rate_limit_per_minute": 3,
        }),
    )
    .await;

    assert_eq!(issued["max_requests"], 5);
    assert_eq!(issued["max_tokens"], 90_000);
    assert_eq!(issued["rate_limit_per_minute"], 3);

    let record = router
        .token_manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .find(|record| record.label == "web-issued")
        .expect("stored record");
    assert_eq!(record.max_requests, Some(5));
    assert_eq!(record.max_tokens, Some(90_000));
    assert_eq!(record.rate_limit_per_minute, Some(3));
}

/// Bounds are shared, not reimplemented per surface: the same bad input is
/// refused over HTTP and in chat, rather than accepted by one of them.
#[tokio::test]
async fn every_surface_rejects_the_same_invalid_constraints() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for body in [
        json!({"label": "bad", "ttl_hours": 0}),
        json!({"label": "bad", "max_tokens": 0}),
        json!({"label": "bad", "max_requests": 0}),
        json!({"label": "bad", "rate_limit_per_minute": 0}),
    ] {
        let response = router
            .client
            .post(format!("{}/api/management/tokens", router.url))
            .bearer_auth(ADMIN_KEY)
            .json(&body)
            .send()
            .await
            .expect("issue attempt");
        assert_eq!(
            response.status(),
            StatusCode::BAD_REQUEST,
            "HTTP must reject {body}"
        );
    }

    let chat = signed_in_chat(router.token_manager.clone());
    for command in [
        "/issue bad ttl_hours=0",
        "/issue bad max_tokens=0",
        "/issue bad max_requests=0",
        "/issue bad rpm=0",
    ] {
        let reply = chat.handle(ChatChannel::Telegram, "1", command);
        assert!(
            !reply.secret,
            "chat must reject `{command}`, got: {}",
            reply.text
        );
    }
}

/// Generic tokens from both manual administration surfaces have identical
/// constraints and neither is silently promoted into a managed client token.
#[tokio::test]
async fn generic_tokens_from_chat_and_http_cannot_spend_a_consumer_subscription() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let chat = signed_in_chat(router.token_manager.clone());

    let reply = chat.handle(
        ChatChannel::Telegram,
        "1",
        "/issue chat-issued ttl_hours=1 max_requests=1",
    );
    let chat_token = reply
        .text
        .split_whitespace()
        .find(|word| word.starts_with(link_assistant_router::token::TOKEN_PREFIX))
        .expect("chat issued a token value")
        .to_string();

    let http_token = issue_over_http(
        &router,
        json!({"label": "http-issued", "ttl_hours": 1, "max_requests": 1}),
    )
    .await["token"]
        .as_str()
        .expect("http issued a token value")
        .to_string();

    let body = json!({
        "model": "claude-sonnet-4-5",
        "max_tokens": 16,
        "messages": [{"role": "user", "content": "hi"}]
    });

    // Both carry the same requested constraint, but neither has the signed
    // client/principal binding required to spend the Claude subscription.
    for token in [&chat_token, &http_token] {
        let response = router
            .client
            .post(format!("{}/api/services/anthropic/v1/messages", router.url))
            .bearer_auth(token)
            .header("anthropic-version", "2023-06-01")
            .json(&body)
            .send()
            .await
            .expect("consumer subscription denial");
        assert_eq!(response.status(), StatusCode::FORBIDDEN);
        assert!(
            response
                .text()
                .await
                .expect("denial body")
                .contains("managed-client binding")
        );
    }
    assert!(router.requests.lock().expect("stub requests").is_empty());

    let records = router.token_manager.list_tokens().expect("list tokens");
    for label in ["chat-issued", "http-issued"] {
        let record = records
            .iter()
            .find(|record| record.label == label)
            .expect("issued token record");
        assert_eq!(record.max_requests, Some(1), "{label}");
        assert_eq!(record.client_kind, None, "{label}");
        assert_eq!(record.principal_id, None, "{label}");
    }
}

/// Rotation preserves constraints and revokes the previous value, whichever
/// surface performs it.
#[tokio::test]
async fn rotation_preserves_constraints_and_revokes_the_old_value() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    let issued = issue_over_http(
        &router,
        json!({
            "label": "rotating",
            "ttl_hours": 6,
            "max_requests": 9,
            "max_tokens": 4_000,
            "rate_limit_per_minute": 2,
        }),
    )
    .await;
    let original_id = router
        .token_manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .find(|record| record.label == "rotating")
        .expect("stored record")
        .id;

    let response = router
        .client
        .post(format!(
            "{}/api/management/tokens/rotate-client",
            router.url
        ))
        .bearer_auth(ADMIN_KEY)
        .json(&json!({"id": original_id}))
        .send()
        .await
        .expect("rotate");
    assert_eq!(response.status(), StatusCode::OK);
    let rotated: Value = response.json().await.expect("rotate json");
    let replacement_value = rotated["token"].as_str().expect("replacement token");
    assert_ne!(
        replacement_value,
        issued["token"].as_str().expect("original token"),
        "rotation must mint a new value"
    );

    let records = router.token_manager.list_tokens().expect("list");
    let old = records
        .iter()
        .find(|record| record.id == original_id)
        .expect("old record");
    assert!(old.revoked, "the previous value must be revoked");

    let replacement = records
        .iter()
        .find(|record| record.label == "rotating" && !record.revoked)
        .expect("replacement record");
    assert_eq!(replacement.max_requests, Some(9));
    assert_eq!(replacement.max_tokens, Some(4_000));
    assert_eq!(replacement.rate_limit_per_minute, Some(2));

    // The revoked value stops working immediately.
    let refused = router
        .client
        .post(format!("{}/api/services/anthropic/v1/messages", router.url))
        .bearer_auth(issued["token"].as_str().expect("original token"))
        .json(&json!({
            "model": "claude-sonnet-4-5",
            "max_tokens": 16,
            "messages": [{"role": "user", "content": "hi"}]
        }))
        .send()
        .await
        .expect("request with revoked token");
    assert_eq!(
        refused.status(),
        StatusCode::FORBIDDEN,
        "the rotated-away value must stop authorising requests"
    );
}

/// Rotation refuses ids it cannot safely act on, rather than failing later or
/// minting a credential for the wrong record.
#[tokio::test]
async fn rotation_rejects_unknown_ids_and_admin_credentials() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;

    let unknown = router
        .client
        .post(format!(
            "{}/api/management/tokens/rotate-client",
            router.url
        ))
        .bearer_auth(ADMIN_KEY)
        .json(&json!({"id": "no-such-token-id"}))
        .send()
        .await
        .expect("rotate unknown");
    assert_eq!(unknown.status(), StatusCode::NOT_FOUND);

    // An admin credential must go through the proof-of-possession rotate.
    let (_admin_token, admin_id) = router
        .token_manager
        .issue_with_id(&IssueRequest {
            ttl_hours: 1,
            label: "ops",
            scope: link_assistant_router::token::ADMIN_SCOPE,
            ..IssueRequest::default()
        })
        .expect("issue admin token");
    let refused = router
        .client
        .post(format!(
            "{}/api/management/tokens/rotate-client",
            router.url
        ))
        .bearer_auth(ADMIN_KEY)
        .json(&json!({"id": admin_id}))
        .send()
        .await
        .expect("rotate admin");
    assert_eq!(refused.status(), StatusCode::BAD_REQUEST);
    assert!(
        refused
            .text()
            .await
            .expect("body")
            .contains("/api/management/tokens/rotate")
    );
}

/// The token endpoints refuse unauthenticated callers.
#[tokio::test]
async fn the_token_endpoints_require_an_admin_credential() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    for (path, body) in [
        ("/api/management/tokens", json!({"label": "x"})),
        ("/api/management/tokens/rotate-client", json!({"id": "x"})),
    ] {
        let response = router
            .client
            .post(format!("{}{path}", router.url))
            .json(&body)
            .send()
            .await
            .expect("unauthenticated request");
        assert_eq!(
            response.status(),
            StatusCode::UNAUTHORIZED,
            "{path} must require an admin credential"
        );
    }
}

/// Rotation applies explicit overrides on top of the preserved constraints.
#[tokio::test]
async fn rotation_applies_explicit_overrides() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    issue_over_http(
        &router,
        json!({"label": "override", "ttl_hours": 6, "max_requests": 9, "max_tokens": 4_000}),
    )
    .await;
    let id = router
        .token_manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .find(|record| record.label == "override")
        .expect("stored record")
        .id;

    let response = router
        .client
        .post(format!(
            "{}/api/management/tokens/rotate-client",
            router.url
        ))
        .bearer_auth(ADMIN_KEY)
        .json(&json!({"id": id, "max_tokens": 9_000, "label": "renamed"}))
        .send()
        .await
        .expect("rotate");
    assert_eq!(response.status(), StatusCode::OK);

    let replacement = router
        .token_manager
        .list_tokens()
        .expect("list")
        .into_iter()
        .find(|record| record.label == "renamed" && !record.revoked)
        .expect("replacement record");
    assert_eq!(replacement.max_tokens, Some(9_000), "override applies");
    assert_eq!(
        replacement.max_requests,
        Some(9),
        "unspecified constraints are preserved"
    );
}

/// Constraints and counters survive a restart, so a cap cannot be reset by
/// bouncing the process.
#[test]
fn constraints_and_usage_survive_a_restart() {
    let directory = tempfile::tempdir().expect("temp dir");
    let path = directory.path().join("tokens.lino");

    let id = {
        let store: Arc<dyn TokenStore> = Arc::new(TextTokenStore::open(&path).expect("open store"));
        let manager = TokenManager::with_store("restart-secret", store);
        let (_token, id) = manager
            .issue_with_id(&IssueRequest {
                ttl_hours: 24,
                label: "durable",
                max_requests: Some(4),
                max_tokens: Some(1_000),
                rate_limit_per_minute: Some(6),
                ..IssueRequest::default()
            })
            .expect("issue");
        manager
            .enforce_request_budget_reserving(&id, 100)
            .expect("admit");
        manager.settle_token_usage(&id, 100, 250).expect("settle");
        id
    };

    // A fresh manager over the same file is what a restart looks like.
    let store: Arc<dyn TokenStore> = Arc::new(TextTokenStore::open(&path).expect("reopen store"));
    let manager = TokenManager::with_store("restart-secret", store);
    let record = manager
        .store()
        .get(&id)
        .expect("read")
        .expect("record survives restart");

    assert_eq!(record.max_requests, Some(4));
    assert_eq!(record.max_tokens, Some(1_000));
    assert_eq!(record.rate_limit_per_minute, Some(6));
    assert_eq!(record.used_requests, 1, "usage must survive the restart");
    assert_eq!(record.used_tokens, 250, "spend must survive the restart");
    assert_eq!(record.reserved_tokens, 0, "settled reservation persists");
}

/// The list surface reports every constraint, so an administrator can audit a
/// token without reading the store directly.
#[tokio::test]
async fn listing_reports_every_constraint_and_counter() {
    let router = TestRouter::start(UpstreamProvider::Anthropic).await;
    issue_over_http(
        &router,
        json!({
            "label": "listed",
            "ttl_hours": 3,
            "max_requests": 8,
            "max_tokens": 2_500,
            "rate_limit_per_minute": 4,
            "account": "primary",
        }),
    )
    .await;

    let response = router
        .client
        .get(format!("{}/api/management/tokens", router.url))
        .bearer_auth(ADMIN_KEY)
        .send()
        .await
        .expect("list");
    assert_eq!(response.status(), StatusCode::OK);
    let listed: Value = response.json().await.expect("list json");
    let record = listed["data"]
        .as_array()
        .expect("data array")
        .iter()
        .find(|record| record["label"] == "listed")
        .expect("listed record");

    for field in [
        "max_requests",
        "used_requests",
        "max_tokens",
        "used_tokens",
        "reserved_tokens",
        "rate_limit_per_minute",
        "account",
        "expires_at",
        "revoked",
        "scope",
    ] {
        assert!(
            record.get(field).is_some(),
            "list output must expose {field}: {record}"
        );
    }
    assert_eq!(record["account"], "primary");
}
