//! Network-facing route construction from the canonical route contract.

use axum::extract::{Request, State};
use axum::middleware::{Next, from_fn_with_state};
use axum::response::Response;
use axum::routing::{any, get, post};
use axum::{Router, http::StatusCode};

use crate::activitypub;
use crate::app_state::AppState;
use crate::config::Config;
use crate::route_contract::{ListenerKind, RouteId, route_for_path, route_template};
use crate::{gemini, login_api, provider_proxy, proxy, token_admin};

/// Build the configured router served on the network-facing proxy listener.
pub fn router(state: AppState, config: &Config) -> Router {
    let listener = if config.inference_only {
        ListenerKind::InferenceOnly
    } else {
        ListenerKind::Combined
    };
    router_for_listener(state, config, listener)
}

/// Build exactly one listener shape from the canonical route contract.
pub fn router_for_listener(state: AppState, config: &Config, listener: ListenerKind) -> Router {
    let mut app = Router::new();
    if matches!(
        listener,
        ListenerKind::Combined | ListenerKind::InferenceOnly
    ) {
        app = app.merge(neutral_routes());
    }
    if matches!(listener, ListenerKind::Combined | ListenerKind::Admin) {
        app = app.merge(management_routes(
            state.clone(),
            config.login.enabled,
            config.enable_metrics,
        ));
    }
    if matches!(
        listener,
        ListenerKind::Combined | ListenerKind::InferenceOnly
    ) {
        app = app.merge(inference_routes(state.clone(), config));
    }
    if listener == ListenerKind::Combined {
        app = app.merge(private_service_routes(state.clone()));
    }
    if listener == ListenerKind::GitHubAdapter {
        app = app.merge(github_adapter_routes(state.clone()));
    }
    app.fallback(not_found).with_state(state)
}

fn neutral_routes() -> Router<AppState> {
    Router::new().route(route_template(RouteId::Health), get(proxy::health))
}

pub(crate) fn management_routes(
    state: AppState,
    login_enabled: bool,
    metrics_enabled: bool,
) -> Router<AppState> {
    let open_routes = Router::new()
        .route(
            route_template(RouteId::AdminStatus),
            get(crate::admin_api::admin_status),
        )
        .route(
            route_template(RouteId::AdminBootstrap),
            post(crate::admin_api::bootstrap),
        )
        .route(
            route_template(RouteId::AdminBootstrapConfirm),
            post(crate::admin_api::bootstrap_confirm),
        );
    let mut routes = Router::new()
        .route(
            route_template(RouteId::Tokens),
            get(token_admin::list_tokens).post(token_admin::issue_token),
        )
        .route(
            route_template(RouteId::ClientTokens),
            post(token_admin::issue_client_token),
        )
        .route(
            route_template(RouteId::RevokeToken),
            post(token_admin::revoke_token),
        )
        .route(
            route_template(RouteId::RotateToken),
            post(token_admin::rotate_admin_token),
        )
        .route(
            route_template(RouteId::RotateClientToken),
            post(token_admin::rotate_client_token),
        )
        .route(
            route_template(RouteId::Providers),
            get(provider_proxy::list_providers).post(provider_proxy::upsert_provider),
        )
        .route(
            route_template(RouteId::Provider),
            get(provider_proxy::show_provider).delete(provider_proxy::delete_provider),
        )
        .route(
            route_template(RouteId::SubscriptionHealth),
            get(crate::subscription_health::subscription_health),
        )
        .route(
            route_template(RouteId::AdminRotate),
            post(crate::admin_api::rotate_credential),
        )
        .route(
            route_template(RouteId::AdminSummary),
            get(crate::admin_api::admin_summary),
        );

    if login_enabled {
        routes = routes
            .route(route_template(RouteId::Login), post(login_api::begin_login))
            .route(
                route_template(RouteId::LoginSession),
                get(login_api::login_status).delete(login_api::cancel_login),
            )
            .route(
                route_template(RouteId::LoginCode),
                post(login_api::submit_code),
            );
    }
    if metrics_enabled {
        routes = routes
            .route(route_template(RouteId::Usage), get(proxy::usage_endpoint))
            .route(
                route_template(RouteId::Accounts),
                get(proxy::accounts_endpoint),
            )
            .route(
                route_template(RouteId::Metrics),
                get(proxy::metrics_endpoint),
            );
    }
    open_routes.merge(routes.route_layer(from_fn_with_state(state, authenticate_admin_route)))
}

fn inference_routes(state: AppState, config: &Config) -> Router<AppState> {
    let mut routes = Router::new();
    if config.enable_anthropic_api {
        routes = routes
            .route(
                route_template(RouteId::AnthropicMessages),
                post(proxy::proxy_handler),
            )
            .route(
                route_template(RouteId::AnthropicCountTokens),
                post(proxy::proxy_handler),
            )
            .route(
                route_template(RouteId::BedrockInvoke),
                post(proxy::proxy_handler),
            )
            .route(
                route_template(RouteId::BedrockInvokeStream),
                post(proxy::proxy_handler),
            )
            .route(
                route_template(RouteId::AnthropicVertex),
                post(vertex_proxy_handler),
            );
    }
    if config.enable_openai_api {
        routes = routes
            .route(
                route_template(RouteId::AnthropicModels),
                get(proxy::openai_models),
            )
            .route(
                route_template(RouteId::OpenAiChatCompletions),
                post(proxy::openai_chat_completions),
            )
            .route(
                route_template(RouteId::OpenAiResponses),
                post(proxy::openai_responses),
            )
            .route(
                route_template(RouteId::OpenAiModels),
                get(proxy::openai_models),
            )
            .route(
                route_template(RouteId::CodexChatCompletions),
                post(proxy::openai_chat_completions),
            )
            .route(
                route_template(RouteId::CodexResponses),
                post(proxy::openai_responses),
            )
            .route(
                route_template(RouteId::CodexModels),
                get(proxy::openai_models),
            )
            .route(
                route_template(RouteId::QwenChatCompletions),
                post(proxy::openai_chat_completions),
            )
            .route(
                route_template(RouteId::QwenResponses),
                post(proxy::openai_responses),
            )
            .route(
                route_template(RouteId::QwenModels),
                get(proxy::openai_models),
            )
            .route(
                route_template(RouteId::GeminiModels),
                get(gemini::native_models),
            )
            .route(
                route_template(RouteId::GeminiModel),
                get(gemini::native_model).post(gemini::forward_native_gemini),
            )
            .route(
                route_template(RouteId::Vertex),
                post(gemini::forward_native_vertex),
            );
    }
    routes.route_layer(from_fn_with_state(state, authenticate_client_route))
}

fn private_service_routes(state: AppState) -> Router<AppState> {
    let activitypub = Router::new()
        .route(
            route_template(RouteId::ActivityPubActor),
            get(activitypub::actor),
        )
        .route(
            route_template(RouteId::ActivityPubInbox),
            post(activitypub::inbox),
        )
        .route(
            route_template(RouteId::ActivityPubOutbox),
            get(activitypub::outbox),
        )
        .route(
            route_template(RouteId::ActivityPubFollowers),
            get(activitypub::followers),
        )
        .route(
            route_template(RouteId::ActivityPubFollowProblemsets),
            get(activitypub::follow_problemsets),
        );
    activitypub.merge(canonical_github_routes(state))
}

fn canonical_github_routes(state: AppState) -> Router<AppState> {
    if !state.github.enabled() {
        return Router::new();
    }
    Router::new()
        .route(
            route_template(RouteId::GitHubRest),
            any(crate::github_proxy::proxy),
        )
        .route(
            route_template(RouteId::GitHubGraphql),
            post(crate::github_proxy::proxy),
        )
        .route(route_template(RouteId::Git), any(crate::git_proxy::proxy))
        .route_layer(from_fn_with_state(state, authenticate_client_route))
}

fn github_adapter_routes(state: AppState) -> Router<AppState> {
    if !state.github.enabled() {
        return Router::new();
    }
    Router::new()
        .route("/api/v3/{*path}", any(crate::github_proxy::proxy))
        .route("/api/graphql", post(crate::github_proxy::proxy))
        .route_layer(from_fn_with_state(state, authenticate_client_route))
}

/// Build the private, fixed-shape compatibility listener consumed by `gh`.
pub fn github_adapter_router(state: AppState) -> Router {
    github_adapter_routes(state.clone())
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
    route_for_path(&axum::http::Method::POST, path).is_some_and(|spec| {
        matches!(
            spec.id,
            RouteId::OpenAiChatCompletions
                | RouteId::OpenAiResponses
                | RouteId::CodexChatCompletions
                | RouteId::CodexResponses
                | RouteId::QwenChatCompletions
                | RouteId::QwenResponses
        )
    })
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
    if !direct && !count_tokens {
        return not_found().await;
    }
    proxy::proxy_handler(State(state), request).await
}
