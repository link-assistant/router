//! HTTP enforcement of management listener policy and failed-auth lockout.
use crate::app_state::AppState;
use crate::management_access::normalize_ip;
use crate::proxy::error_response;
use axum::extract::{ConnectInfo, Request, State};
use axum::http::{HeaderValue, StatusCode};
use axum::middleware::Next;
use axum::response::Response;
use std::net::{IpAddr, SocketAddr};

#[derive(Clone, Copy)]
struct ManagementPeer(IpAddr);

/// Gate every management path, including unauthenticated bootstrap routes.
pub async fn gate(
    State((state, admin_listener)): State<(AppState, bool)>,
    mut request: Request,
    next: Next,
) -> Response {
    let path = request.uri().path();
    if path != "/api/management" && !path.starts_with("/api/management/") {
        return next.run(request).await;
    }
    let Some(ConnectInfo(peer)) = request.extensions().get::<ConnectInfo<SocketAddr>>() else {
        return error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            "management requires socket peer metadata",
        );
    };
    let ip = normalize_ip(peer.ip());
    let access = state.admin.management_access();
    if !admin_listener && !access.config().allow_remote && !ip.is_loopback() {
        return error_response(
            StatusCode::FORBIDDEN,
            "permission_error",
            "remote management requires MANAGEMENT_ALLOW_REMOTE / --management-allow-remote or the admin listener",
        );
    }
    if let Some(retry_after) = access.check(ip) {
        return banned(retry_after);
    }
    let confirm = path == "/api/management/admin/bootstrap/confirm";
    request.extensions_mut().insert(ManagementPeer(ip));
    let response = next.run(request).await;
    if confirm {
        if response.status() == StatusCode::UNAUTHORIZED {
            return failed(&state, ip, "/api/management/admin/bootstrap/confirm");
        }
        if response.status().is_success() {
            access.success(ip);
        }
    }
    response
}

/// Authenticate protected management routes and update the shared counter.
pub async fn authenticate(State(state): State<AppState>, request: Request, next: Next) -> Response {
    let ip = request
        .extensions()
        .get::<ManagementPeer>()
        .map(|peer| peer.0);
    if !crate::proxy::is_admin_authorised(&state, request.headers()) {
        return ip.map_or_else(
            || {
                error_response(
                    StatusCode::UNAUTHORIZED,
                    "authentication_error",
                    "admin Bearer key required",
                )
            },
            |ip| failed(&state, ip, request.uri().path()),
        );
    }
    if let Some(ip) = ip {
        state.admin.management_access().success(ip);
    }
    next.run(request).await
}

fn failed(state: &AppState, ip: IpAddr, path: &str) -> Response {
    let access = state.admin.management_access();
    if let Some(ban) = access.failure(ip) {
        tracing::warn!(client_ip = %ban.client_ip, expires_at = ban.expires_at, "management authentication IP banned");
        state.audit.record_management_ban(&ban, path);
    }
    if let Some(retry_after) = access.check(ip) {
        return banned(retry_after);
    }
    error_response(
        StatusCode::UNAUTHORIZED,
        "authentication_error",
        "admin Bearer key required",
    )
}

fn banned(retry_after: u64) -> Response {
    let mut response = error_response(
        StatusCode::TOO_MANY_REQUESTS,
        "rate_limit_error",
        "management authentication temporarily locked for this client IP",
    );
    response.headers_mut().insert(
        "retry-after",
        HeaderValue::from_str(&retry_after.to_string()).expect("integer is a valid header"),
    );
    response
}
