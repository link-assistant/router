//! Network-facing proxy router construction.
//!
//! Keeping the complete route table in the library makes the exposure policy
//! reviewable and lets integration tests exercise the same router the binary
//! serves.

use axum::extract::{Request, State};
use axum::middleware::{Next, from_fn_with_state};
use axum::response::Response;
use axum::routing::{any, get, post};
use axum::{Router, http::StatusCode};

use crate::activitypub;
use crate::app_state::AppState;
use crate::config::Config;
use crate::{gemini, login_api, provider_proxy, proxy, token_admin};

/// Build the router served on the network-facing proxy listener.
pub fn router(state: AppState, config: &Config) -> Router {
    let mut app = Router::new()
        .route("/health", get(proxy::health))
        // Subscription health is a separate answer from liveness: see
        // `proxy::health` for why they must not be the same endpoint (#318).
        .route(
            "/health/subscriptions",
            get(crate::subscription_health::subscription_health),
        )
        .route("/actor/code", get(activitypub::actor))
        .route("/inbox/code", post(activitypub::inbox))
        .route("/outbox/code", get(activitypub::outbox))
        .route("/actors/code/followers", get(activitypub::followers))
        .route(
            "/activities/follow-problemsets-code-001",
            get(activitypub::follow_problemsets),
        );
    let mut admin_routes = Router::new()
        .route("/api/tokens", post(token_admin::issue_token))
        .route("/api/tokens/list", get(token_admin::list_tokens))
        .route("/api/tokens/revoke", post(token_admin::revoke_token))
        .route("/api/tokens/rotate", post(token_admin::rotate_admin_token))
        .route(
            "/api/tokens/rotate-client",
            post(token_admin::rotate_client_token),
        )
        .route(
            "/api/providers",
            get(provider_proxy::list_providers).post(provider_proxy::upsert_provider),
        )
        .route(
            "/api/providers/{name}",
            get(provider_proxy::show_provider).delete(provider_proxy::delete_provider),
        );

    if config.login.enabled {
        admin_routes = admin_routes
            .route("/api/login", post(login_api::begin_login))
            .route(
                "/api/login/{id}",
                get(login_api::login_status).delete(login_api::cancel_login),
            )
            .route("/api/login/{id}/code", post(login_api::submit_code));
    }

    if config.enable_metrics {
        admin_routes = admin_routes
            .route("/v1/usage", get(proxy::usage_endpoint))
            .route("/v1/accounts", get(proxy::accounts_endpoint));
    }

    let admin_routes =
        admin_routes.route_layer(from_fn_with_state(state.clone(), authenticate_admin_route));
    app = app.merge(admin_routes);

    let mut client_routes = Router::new();

    if config.enable_anthropic_api {
        client_routes = client_routes
            .route("/v1/messages", post(proxy::proxy_handler))
            .route("/v1/messages/count_tokens", post(proxy::proxy_handler))
            .route("/api/anthropic/v1/messages", post(proxy::proxy_handler))
            .route(
                "/api/anthropic/v1/messages/count_tokens",
                post(proxy::proxy_handler),
            )
            .route("/invoke", post(proxy::proxy_handler))
            .route("/invoke-with-response-stream", post(proxy::proxy_handler))
            .route(
                "/api/latest/anthropic/v1/messages",
                post(proxy::proxy_handler),
            )
            .route(
                "/api/latest/anthropic/v1/messages/count_tokens",
                post(proxy::proxy_handler),
            )
            .route(
                "/v1/projects/{project}/locations/{location}/publishers/anthropic/models/{*model_action}",
                post(vertex_proxy_handler),
            );
    }

    if config.enable_openai_api {
        client_routes = client_routes
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

    if state.github.enabled() {
        // GitHub CLI uses `/api/v3` and `/api/graphql` for custom hosts. The
        // bare routes make the same listener useful as a conventional API
        // base URL for SDKs and agents.
        client_routes = client_routes
            .route("/api/v3/{*path}", any(crate::github_proxy::proxy))
            .route("/github/{*path}", any(crate::github_proxy::proxy))
            .route("/api/graphql", post(crate::github_proxy::proxy))
            .route("/graphql", post(crate::github_proxy::proxy))
            .route("/rate_limit", get(crate::github_proxy::proxy))
            .route("/user", any(crate::github_proxy::proxy))
            .route("/user/{*path}", any(crate::github_proxy::proxy))
            .route("/users/{*path}", any(crate::github_proxy::proxy))
            .route("/repos/{*path}", any(crate::github_proxy::proxy))
            .route("/orgs/{*path}", any(crate::github_proxy::proxy))
            .route("/search/{*path}", any(crate::github_proxy::proxy))
            .route("/notifications", any(crate::github_proxy::proxy))
            .route("/notifications/{*path}", any(crate::github_proxy::proxy))
            .route("/gists", any(crate::github_proxy::proxy))
            .route("/gists/{*path}", any(crate::github_proxy::proxy));
        // Git smart-HTTP, so a `git push --force` reaches the same policy
        // engine the REST surface already answers to (issue #261).
        client_routes = client_routes.route("/git/{*path}", any(crate::git_proxy::proxy));
    }

    if config.enable_metrics {
        app = app.route("/metrics", get(proxy::metrics_endpoint));
    }

    let client_routes =
        client_routes.route_layer(from_fn_with_state(state.clone(), authenticate_client_route));

    app.merge(client_routes)
        .fallback(not_found)
        .with_state(state)
}

async fn authenticate_client_route(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path();
    if is_openai_payment_path(path)
        && let Some(response) = proxy::maybe_mpp_challenge(&state, request.headers(), path)
    {
        return response;
    }
    // The refusal is rendered in the dialect of the surface the caller used, so
    // a Gemini client can parse its own error envelope (issue #206).
    if let Err(error) = proxy::authenticate_client_error(&state, request.headers()) {
        return error.render(crate::api_error::dialect_for_path(path));
    }
    next.run(request).await
}

async fn authenticate_admin_route(
    State(state): State<AppState>,
    request: Request,
    next: Next,
) -> Response {
    if !proxy::is_admin_authorised(&state, request.headers()) {
        return proxy::error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin Bearer key required",
        );
    }
    next.run(request).await
}

fn is_openai_payment_path(path: &str) -> bool {
    path == "/v1/chat/completions"
        || path == "/v1/responses"
        || path.ends_with("/v1/chat/completions")
        || path.ends_with("/v1/responses")
}

async fn not_found() -> Response {
    proxy::error_response(StatusCode::NOT_FOUND, "not_found_error", "route not found")
}

async fn vertex_proxy_handler(State(state): State<AppState>, request: Request) -> Response {
    let path = request.uri().path();
    let model_action = path
        .split_once("/publishers/anthropic/models/")
        .map(|(_, action)| action)
        .unwrap_or_default();
    let direct = !model_action.contains('/')
        && (model_action
            .strip_suffix(":rawPredict")
            .is_some_and(|model| !model.is_empty())
            || model_action
                .strip_suffix(":streamRawPredict")
                .is_some_and(|model| !model.is_empty()));
    let count_tokens = model_action
        .strip_suffix("/count-tokens:rawPredict")
        .is_some_and(|model| !model.is_empty() && !model.contains('/'));
    let supported = direct || count_tokens;
    if !supported {
        return not_found().await;
    }
    proxy::proxy_handler(State(state), request).await
}
