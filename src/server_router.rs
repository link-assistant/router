//! Network-facing proxy router construction.
//!
//! Keeping the complete route table in the library makes the exposure policy
//! reviewable and lets integration tests exercise the same router the binary
//! serves.

use axum::Router;
use axum::routing::{get, post};

use crate::activitypub;
use crate::app_state::AppState;
use crate::config::Config;
use crate::{gemini, login_api, provider_proxy, proxy, token_admin};

/// Build the router served on the network-facing proxy listener.
#[must_use]
pub fn router(state: AppState, config: &Config) -> Router {
    let mut app = Router::new()
        .route("/health", get(proxy::health))
        .route("/actor/code", get(activitypub::actor))
        .route("/inbox/code", post(activitypub::inbox))
        .route("/outbox/code", get(activitypub::outbox))
        .route("/actors/code/followers", get(activitypub::followers))
        .route(
            "/activities/follow-problemsets-code-001",
            get(activitypub::follow_problemsets),
        )
        .route("/api/tokens", post(token_admin::issue_token))
        .route("/api/tokens/list", get(token_admin::list_tokens))
        .route("/api/tokens/revoke", post(token_admin::revoke_token))
        .route("/api/tokens/rotate", post(token_admin::rotate_admin_token))
        .route(
            "/api/providers",
            get(provider_proxy::list_providers).post(provider_proxy::upsert_provider),
        )
        .route(
            "/api/providers/{name}",
            get(provider_proxy::show_provider).delete(provider_proxy::delete_provider),
        );

    if config.login.enabled {
        app = app
            .route("/api/login", post(login_api::begin_login))
            .route(
                "/api/login/{id}",
                get(login_api::login_status).delete(login_api::cancel_login),
            )
            .route("/api/login/{id}/code", post(login_api::submit_code));
    }

    if config.enable_anthropic_api {
        app = app
            .route("/v1/messages", post(proxy::proxy_handler))
            .route("/v1/messages/count_tokens", post(proxy::proxy_handler))
            .route("/api/anthropic/v1/messages", post(proxy::proxy_handler))
            .route(
                "/api/anthropic/v1/messages/count_tokens",
                post(proxy::proxy_handler),
            )
            .route("/invoke", post(proxy::proxy_handler))
            .route("/invoke-with-response-stream", post(proxy::proxy_handler));
    }

    if config.enable_openai_api {
        app = app
            .route("/v1/chat/completions", post(proxy::openai_chat_completions))
            .route("/v1/responses", post(proxy::openai_responses))
            .route("/v1/models", get(proxy::openai_models))
            .route(
                "/api/openai/v1/chat/completions",
                post(proxy::openai_chat_completions),
            )
            .route("/api/openai/v1/responses", post(proxy::openai_responses))
            .route("/api/openai/v1/models", get(proxy::openai_models))
            .route("/api/anthropic/v1/models", get(proxy::openai_models))
            .route(
                "/api/codex/v1/chat/completions",
                post(proxy::openai_chat_completions),
            )
            .route("/api/codex/v1/responses", post(proxy::openai_responses))
            .route("/api/codex/v1/models", get(proxy::openai_models))
            .route(
                "/api/qwen/v1/chat/completions",
                post(proxy::openai_chat_completions),
            )
            .route("/api/qwen/v1/responses", post(proxy::openai_responses))
            .route("/api/qwen/v1/models", get(proxy::openai_models))
            .route("/api/gemini/v1beta/models", get(gemini::native_models))
            .route(
                "/api/gemini/v1beta/models/{model}",
                get(gemini::native_model).post(gemini::forward_native_gemini),
            )
            .route(
                "/api/vertex/v1/{*path}",
                post(gemini::forward_native_vertex),
            );
    }

    if config.enable_metrics {
        app = app
            .route("/metrics", get(proxy::metrics_endpoint))
            .route("/v1/usage", get(proxy::usage_endpoint))
            .route("/v1/accounts", get(proxy::accounts_endpoint));
    }

    app.fallback(proxy::proxy_handler).with_state(state)
}
