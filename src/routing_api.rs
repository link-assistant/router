//! Audited administrative control of the live account pool.

use axum::Json;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

use crate::accounts::SelectionStrategy;
use crate::app_state::AppState;
use crate::proxy::{error_response, is_admin_authorised};

/// Requested selection policy for future sessions.
#[derive(Debug, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct RoutingUpdate {
    /// Selection strategy applied to new sessions.
    pub strategy: String,
}

/// Resolved live selection policy.
#[derive(Debug, Serialize, JsonSchema)]
pub struct RoutingSettings {
    /// Canonical selection-strategy name.
    pub strategy: String,
}

/// Scope of an administrative cooldown reset.
#[derive(Debug, Default, Deserialize, JsonSchema)]
#[serde(deny_unknown_fields)]
pub struct CooldownReset {
    /// Omit to clear cooldowns throughout the pool.
    pub account: Option<String>,
    /// With an account, clear only this model's cooldown.
    pub model: Option<String>,
}

/// Summary of a completed administrative cooldown reset.
#[derive(Debug, Serialize, JsonSchema)]
pub struct CooldownResetResult {
    /// Number of cooldown entries removed.
    pub cleared: usize,
}

/// Authenticate, apply and audit a live strategy change.
pub async fn update(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<RoutingUpdate>,
) -> Response {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin credential required",
        );
    }
    let Some(router) = &state.account_router else {
        return no_pool();
    };
    let Some(strategy) = SelectionStrategy::from_str_opt(&request.strategy) else {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "unknown routing strategy",
        );
    };
    let previous = router.set_strategy(strategy);
    audit(
        &state,
        &headers,
        "routing_strategy_changed",
        "/api/management/routing",
        &serde_json::json!({"previous": previous.as_str(), "strategy": strategy.as_str()}),
    );
    Json(RoutingSettings {
        strategy: strategy.as_str().into(),
    })
    .into_response()
}

/// Authenticate, apply and audit a scoped cooldown reset.
pub async fn reset(
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(request): Json<CooldownReset>,
) -> Response {
    if !is_admin_authorised(&state, &headers) {
        return error_response(
            StatusCode::UNAUTHORIZED,
            "authentication_error",
            "admin credential required",
        );
    }
    let Some(router) = &state.account_router else {
        return no_pool();
    };
    if request.model.is_some() && request.account.is_none()
        || request
            .account
            .as_deref()
            .is_some_and(|value| value.trim().is_empty())
        || request
            .model
            .as_deref()
            .is_some_and(|value| value.trim().is_empty())
    {
        return error_response(
            StatusCode::BAD_REQUEST,
            "invalid_request_error",
            "a model reset requires a nonempty account and model",
        );
    }
    let cleared = match router.reset_cooldowns(request.account.as_deref(), request.model.as_deref())
    {
        Ok(count) => count,
        Err(error) => {
            return error_response(
                StatusCode::NOT_FOUND,
                "account_unavailable",
                &error.to_string(),
            );
        }
    };
    audit(
        &state,
        &headers,
        "routing_cooldown_reset",
        "/api/management/routing/cooldown/reset",
        &serde_json::json!({"account": request.account, "model": request.model, "cleared": cleared}),
    );
    Json(CooldownResetResult { cleared }).into_response()
}

fn no_pool() -> Response {
    error_response(
        StatusCode::CONFLICT,
        "no_account_pool",
        "no account pool is configured",
    )
}

fn audit(
    state: &AppState,
    headers: &HeaderMap,
    phase: &str,
    path: &str,
    change: &serde_json::Value,
) {
    let claims = crate::proxy::extract_admin_bearer(headers)
        .and_then(|token| state.token_manager.validate_admin_token(token).ok());
    let actor = claims
        .as_ref()
        .map_or("bootstrap_or_anonymous", |claims| claims.sub.as_str());
    let label = claims
        .as_ref()
        .map_or("admin", |claims| claims.label.as_str());
    state.audit.record_management(&serde_json::json!({
        "phase": phase,
        "time": crate::operation_context::now().to_rfc3339(),
        "token_id": actor,
        "label": label,
        "surface": "control_plane",
        "path": path,
        "change": change,
    }));
}
