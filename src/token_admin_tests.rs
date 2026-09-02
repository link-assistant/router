//! In-process coverage for the administrative token handlers.

use axum::Json;
use axum::extract::State;
use axum::http::{HeaderMap, StatusCode};
use axum::response::IntoResponse;
use http_body_util::BodyExt;

use crate::app_state::AppState;
use crate::token::{ADMIN_SCOPE, IssueRequest};
use crate::token_admin::{
    IssueClientTokenRequest, RotateClientTokenRequest, RotateTokenRequest, issue_client_token,
    rotate_admin_token, rotate_client_token,
};

fn state() -> (AppState, tempfile::TempDir) {
    let data = tempfile::tempdir().expect("temporary state directory");
    let mut state = AppState::for_tests(data.path());
    state.allow_anonymous_admin = true;
    (state, data)
}

fn client_request(client_kind: &str) -> IssueClientTokenRequest {
    IssueClientTokenRequest {
        client_kind: client_kind.into(),
        ttl_hours: None,
        sliding_expiry: None,
        label: None,
        max_requests: None,
    }
}

async fn json(response: axum::response::Response) -> serde_json::Value {
    let bytes = response
        .into_body()
        .collect()
        .await
        .expect("read response")
        .to_bytes();
    serde_json::from_slice(&bytes).expect("JSON response")
}

#[tokio::test]
async fn bound_client_issuance_checks_authority_kind_and_constraints() {
    let (mut state, _data) = state();
    state.allow_anonymous_admin = false;
    let response = issue_client_token(
        State(state.clone()),
        HeaderMap::new(),
        Json(client_request("codex")),
    )
    .await
    .into_response();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    state.allow_anonymous_admin = true;
    for client in ["unknown-client", "cursor"] {
        let response = issue_client_token(
            State(state.clone()),
            HeaderMap::new(),
            Json(client_request(client)),
        )
        .await
        .into_response();
        assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    }

    let mut invalid = client_request("claude");
    invalid.ttl_hours = Some(0);
    let response = issue_client_token(State(state.clone()), HeaderMap::new(), Json(invalid))
        .await
        .into_response();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let mut request = client_request("claude");
    request.ttl_hours = Some(2);
    request.sliding_expiry = Some(true);
    request.label = Some("bound claude".into());
    request.max_requests = Some(7);
    let response = issue_client_token(State(state.clone()), HeaderMap::new(), Json(request))
        .await
        .into_response();
    assert_eq!(response.status(), StatusCode::OK);
    let body = json(response).await;
    assert_eq!(body["client_kind"], "claude");
    assert_eq!(body["principal_id"], "primary");
    assert_eq!(body["ttl_hours"], 2);
    assert_eq!(body["label"], "bound claude");

    let claims = state
        .token_manager
        .validate_token(body["token"].as_str().expect("issued token"))
        .expect("valid issued token");
    let record = state
        .token_manager
        .store()
        .get(&claims.sub)
        .expect("read record")
        .expect("persisted record");
    assert_eq!(record.client_kind.as_deref(), Some("claude"));
    assert_eq!(record.principal_id.as_deref(), Some("primary"));
    assert_eq!(record.account.as_deref(), Some("primary"));
    assert_eq!(record.max_requests, Some(7));
    assert_eq!(record.sliding_window_seconds, Some(7_200));
}

fn request<'a>(label: &'a str, scope: &'a str) -> IssueRequest<'a> {
    IssueRequest {
        ttl_hours: 1,
        label,
        account: None,
        max_requests: None,
        max_tokens: None,
        rate_limit_per_minute: None,
        scope,
        github_repos: Vec::new(),
        sliding_window_seconds: None,
        client_kind: None,
        principal_id: None,
    }
}

fn rotate_request(id: String) -> RotateClientTokenRequest {
    RotateClientTokenRequest {
        id,
        label: None,
        ttl_hours: None,
        max_requests: None,
        max_tokens: None,
        rate_limit_per_minute: None,
        account: None,
    }
}

#[tokio::test]
async fn client_rotation_rejects_unknown_admin_and_invalid_tokens_then_rotates() {
    let (state, _data) = state();

    let response = rotate_client_token(
        State(state.clone()),
        HeaderMap::new(),
        Json(rotate_request("missing".into())),
    )
    .await
    .into_response();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);

    let (_, admin_id) = state
        .token_manager
        .issue_with_id(&request("admin", ADMIN_SCOPE))
        .expect("issue admin token");
    let response = rotate_client_token(
        State(state.clone()),
        HeaderMap::new(),
        Json(rotate_request(admin_id)),
    )
    .await
    .into_response();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let (_, invalid_id) = state
        .token_manager
        .issue_with_id(&request("invalid replacement", ""))
        .expect("issue client token");
    let mut invalid = rotate_request(invalid_id);
    invalid.ttl_hours = Some(0);
    let response = rotate_client_token(State(state.clone()), HeaderMap::new(), Json(invalid))
        .await
        .into_response();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);

    let (_, id) = state
        .token_manager
        .issue_with_id(&request("old", ""))
        .expect("issue client token");
    let mut replacement = rotate_request(id.clone());
    replacement.label = Some("new".into());
    replacement.ttl_hours = Some(2);
    replacement.max_requests = Some(3);
    let response = rotate_client_token(State(state.clone()), HeaderMap::new(), Json(replacement))
        .await
        .into_response();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(json(response).await["revoked"], id);
    assert!(
        state
            .token_manager
            .store()
            .get(&id)
            .expect("read old token")
            .expect("old token remains auditable")
            .revoked
    );
}

#[tokio::test]
async fn admin_rotation_requires_proof_of_possession_and_revokes_the_caller() {
    let (state, _data) = state();
    let response = rotate_admin_token(
        State(state.clone()),
        HeaderMap::new(),
        Json(RotateTokenRequest::default()),
    )
    .await
    .into_response();
    assert_eq!(response.status(), StatusCode::UNAUTHORIZED);

    let (token, id) = state
        .token_manager
        .issue_with_id(&request("operator", ADMIN_SCOPE))
        .expect("issue admin token");
    let mut headers = HeaderMap::new();
    headers.insert("authorization", format!("Bearer {token}").parse().unwrap());
    let response = rotate_admin_token(
        State(state.clone()),
        headers,
        Json(RotateTokenRequest {
            ttl_hours: Some(2),
            label: Some("replacement operator".into()),
        }),
    )
    .await
    .into_response();
    assert_eq!(response.status(), StatusCode::OK);
    let body = json(response).await;
    assert_eq!(body["revoked"], id);
    assert_eq!(body["scope"], ADMIN_SCOPE);
    assert_eq!(body["label"], "replacement operator");
    assert!(
        state
            .token_manager
            .store()
            .get(&id)
            .expect("read old admin token")
            .expect("old token remains auditable")
            .revoked
    );
}
