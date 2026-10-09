//! Admin-only policy reads and atomic replacements for configured accounts.
use crate::account_routing_policy::AccountRoutingPolicy;
use crate::app_state::AppState;
use axum::extract::{Path, State};
use axum::http::{HeaderMap, StatusCode};
use axum::response::{IntoResponse, Response};

/// Return a configured account's current routing policy.
pub async fn get_policy(
    State(state): State<AppState>,
    Path(name): Path<String>,
    headers: HeaderMap,
) -> Response {
    if !crate::proxy::is_admin_authorised(&state, &headers) {
        return denied();
    }
    let Some(router) = &state.account_router else {
        return missing();
    };
    match router.routing_policy(&name) {
        Ok(policy) => axum::Json(policy).into_response(),
        Err(error) => {
            crate::proxy::error_response(StatusCode::NOT_FOUND, "routing_policy_error", &error)
        }
    }
}

/// Validate, persist and immediately apply a complete replacement policy.
pub async fn set_policy(
    State(state): State<AppState>,
    Path(name): Path<String>,
    headers: HeaderMap,
    axum::Json(policy): axum::Json<AccountRoutingPolicy>,
) -> Response {
    if !crate::proxy::is_admin_authorised(&state, &headers) {
        return denied();
    }
    let Some(router) = &state.account_router else {
        return missing();
    };
    if !router
        .subscription_readers()
        .iter()
        .any(|(account, _)| account == &name)
    {
        return missing();
    }
    if let Err(error) = policy.validate() {
        return crate::proxy::error_response(
            StatusCode::BAD_REQUEST,
            "routing_policy_error",
            &error,
        );
    }
    match router.set_routing_policy(&name, policy.clone()) {
        Ok(()) => axum::Json(policy).into_response(),
        Err(error) => crate::proxy::error_response(
            StatusCode::INTERNAL_SERVER_ERROR,
            "routing_policy_error",
            &error,
        ),
    }
}

fn denied() -> Response {
    crate::proxy::error_response(
        StatusCode::UNAUTHORIZED,
        "authentication_error",
        "admin credential required",
    )
}
fn missing() -> Response {
    crate::proxy::error_response(
        StatusCode::NOT_FOUND,
        "not_found_error",
        "account is not configured",
    )
}

/// The same JSON representation for CLI and management account listings.
pub(crate) fn fields(router: &crate::accounts::AccountRouter, account: &str) -> serde_json::Value {
    match router.routing_policy(account) {
        Ok(policy) => serde_json::json!({"routing_policy": policy}),
        Err(error) => serde_json::json!({"routing_policy_error": error}),
    }
}
