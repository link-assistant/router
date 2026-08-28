//! Unit tests for [`crate::git_proxy`].
//!
//! The pkt-line parsing is where a mistake would be dangerous in both
//! directions: missing an update lets a destructive push through, and
//! inventing one refuses an ordinary push. Both directions are pinned here.

use super::*;

/// Build a pkt-line command as a client sends it.
fn pkt(line: &str) -> Vec<u8> {
    let payload = format!("{line}\n");
    let mut framed = format!("{:04x}", payload.len() + 4).into_bytes();
    framed.extend_from_slice(payload.as_bytes());
    framed
}

const OLD: &str = "1111111111111111111111111111111111111111";
const NEW: &str = "2222222222222222222222222222222222222222";

/// A push that deletes a branch must be refused: this is the operation the
/// API proxy already denies, arriving over the transport that used to bypass
/// it entirely (issue #261).
#[test]
fn a_branch_deletion_is_refused() {
    let body = [
        pkt(&format!("{OLD} {ZERO_OID} refs/heads/main")),
        b"0000".to_vec(),
    ]
    .concat();

    let updates = parse_ref_updates(&body);
    assert_eq!(updates.len(), 1, "{updates:?}");
    assert!(updates[0].is_delete());

    let refusal = refuse_destructive_updates(
        &updates,
        false,
        &crate::github_proxy::GitHubPolicy::default(),
        "acme/demo",
    )
    .expect("a deletion must be refused");
    assert_eq!(refusal, RefRefusal::Delete("refs/heads/main".to_string()));
    assert!(refusal.message().contains("refs/heads/main"));
}

/// The destructive sequence the issue is actually defending against:
/// `git reset --hard` then `git push --force-with-lease`.
#[test]
fn a_forced_update_to_an_existing_branch_is_refused() {
    let mut body = pkt(&format!(
        "{OLD} {NEW} refs/heads/my-branch\0report-status force-ref-updates"
    ));
    body.extend_from_slice(b"0000");

    let updates = parse_ref_updates(&body);
    assert_eq!(updates.len(), 1, "{updates:?}");
    assert!(
        body_requests_force(&body),
        "the force capability is announced"
    );

    let refusal = refuse_destructive_updates(
        &updates,
        true,
        &crate::github_proxy::GitHubPolicy::default(),
        "acme/demo",
    )
    .expect("a force-push must be refused");
    assert_eq!(
        refusal,
        RefRefusal::NonFastForward("refs/heads/my-branch".to_string())
    );
}

/// An ordinary push must go through: a policy that refuses everything would
/// be no more usable than no proxy at all.
#[test]
fn an_ordinary_push_is_allowed() {
    let mut body = pkt(&format!("{OLD} {NEW} refs/heads/feature\0report-status"));
    body.extend_from_slice(b"0000");

    let updates = parse_ref_updates(&body);
    assert!(!body_requests_force(&body));
    assert!(
        refuse_destructive_updates(
            &updates,
            false,
            &crate::github_proxy::GitHubPolicy::default(),
            "acme/demo"
        )
        .is_none(),
        "a fast-forward must be allowed"
    );
}

/// Creating a branch is allowed even under `--force`, since there is no
/// history to destroy.
#[test]
fn creating_a_branch_is_allowed_even_when_forced() {
    let mut body = pkt(&format!(
        "{ZERO_OID} {NEW} refs/heads/new\0report-status force-ref-updates"
    ));
    body.extend_from_slice(b"0000");

    let updates = parse_ref_updates(&body);
    assert!(updates[0].is_create());
    assert!(
        refuse_destructive_updates(
            &updates,
            true,
            &crate::github_proxy::GitHubPolicy::default(),
            "acme/demo"
        )
        .is_none()
    );
}

/// Several commands travel in one push, and one destructive update among
/// ordinary ones must still refuse the push.
#[test]
fn one_destructive_update_refuses_the_whole_push() {
    let body = [
        pkt(&format!("{OLD} {NEW} refs/heads/ok\0report-status")),
        pkt(&format!("{OLD} {ZERO_OID} refs/heads/gone")),
        b"0000".to_vec(),
    ]
    .concat();

    let updates = parse_ref_updates(&body);
    assert_eq!(updates.len(), 2, "{updates:?}");
    assert!(
        refuse_destructive_updates(
            &updates,
            false,
            &crate::github_proxy::GitHubPolicy::default(),
            "acme/demo"
        )
        .is_some()
    );
}

/// An operator may permit one ref deliberately — the "reconfigure the router"
/// escape hatch, which a caller cannot assert for itself.
#[test]
fn an_operator_can_permit_one_ref() {
    let policy: crate::github_proxy::GitHubPolicy = serde_json::from_str(
        r#"{"rules":[{"effect":"allow","path":"/git/acme/demo/refs/heads/scratch"}]}"#,
    )
    .expect("parse the policy");
    let body = [
        pkt(&format!("{OLD} {ZERO_OID} refs/heads/scratch")),
        b"0000".to_vec(),
    ]
    .concat();

    let updates = parse_ref_updates(&body);
    assert!(
        refuse_destructive_updates(&updates, false, &policy, "acme/demo").is_none(),
        "the permitted ref may be deleted"
    );

    // The permission is exactly that ref, in that repository.
    let elsewhere = [
        pkt(&format!("{OLD} {ZERO_OID} refs/heads/main")),
        b"0000".to_vec(),
    ]
    .concat();
    assert!(
        refuse_destructive_updates(&parse_ref_updates(&elsewhere), false, &policy, "acme/demo")
            .is_some(),
        "another ref stays protected"
    );
    assert!(
        refuse_destructive_updates(&updates, false, &policy, "other/repo").is_some(),
        "another repository stays protected"
    );
}

/// The packfile follows the flush packet and carries no ref decisions, so it
/// must not be parsed as commands.
#[test]
fn the_packfile_is_not_read_as_commands() {
    let mut body = pkt(&format!("{OLD} {NEW} refs/heads/main\0report-status"));
    body.extend_from_slice(b"0000");
    body.extend_from_slice(b"PACK\x00\x00\x00\x02 arbitrary binary payload");

    assert_eq!(parse_ref_updates(&body).len(), 1);
}

/// A malformed body yields no updates rather than panicking — a client can
/// send anything, and this parser runs before authentication of intent.
#[test]
fn a_malformed_body_is_not_a_panic() {
    for body in [
        &b""[..],
        b"zzzz",
        b"0004",
        b"00ff too short for its header",
        b"0032 not-an-oid also-not refs/heads/x\n",
    ] {
        let _ = parse_ref_updates(body);
        let _ = body_requests_force(body);
    }
}

/// The repository is taken from the path, so the scope and the policy agree
/// about which repository a push targets.
#[test]
fn the_repository_comes_from_the_path() {
    assert_eq!(
        repository_in_git_path("/git/acme/demo.git/git-receive-pack"),
        Some("acme/demo".to_string())
    );
    assert_eq!(
        repository_in_git_path("/git/acme/demo/info/refs"),
        Some("acme/demo".to_string())
    );
    assert_eq!(repository_in_git_path("/git/acme"), None);
    assert_eq!(repository_in_git_path("/repos/acme/demo"), None);
}

/// The upstream URL keeps the git path and its query, so a smart-HTTP
/// handshake reaches the right service.
#[test]
fn the_upstream_url_preserves_the_service_query() {
    assert_eq!(
        upstream_git_url(
            "https://github.com",
            "/git/acme/demo.git/info/refs",
            Some("service=git-upload-pack")
        ),
        Some("https://github.com/acme/demo.git/info/refs?service=git-upload-pack".to_string())
    );
    assert_eq!(
        upstream_git_url("https://github.com", "/elsewhere", None),
        None
    );
}

/// Only a push is subject to ref policy; a fetch is read-only and must not be
/// refused, or the proxy would break cloning.
#[test]
fn a_fetch_earns_no_refusal() {
    let body = [
        pkt(&format!("{OLD} {ZERO_OID} refs/heads/main")),
        b"0000".to_vec(),
    ]
    .concat();
    let policy = crate::github_proxy::GitHubPolicy::default();

    // The same body on a read-only endpoint decides nothing.
    assert!(
        refusal_for_request("/git/acme/demo.git/info/refs", &body, &policy, "acme/demo").is_none()
    );
    assert!(
        refusal_for_request(
            "/git/acme/demo.git/git-upload-pack",
            &body,
            &policy,
            "acme/demo"
        )
        .is_none()
    );
    // On a push it is refused.
    assert!(
        refusal_for_request(
            "/git/acme/demo.git/git-receive-pack",
            &body,
            &policy,
            "acme/demo"
        )
        .is_some()
    );
}

/// The scope rule matches the REST surface, so a token means the same thing on
/// both (issue #262).
#[test]
fn the_scope_rule_matches_the_rest_surface() {
    assert!(
        scope_admits(&[], "anyone/anything"),
        "empty is unrestricted"
    );

    let scope = vec!["acme/demo".to_string()];
    assert!(scope_admits(&scope, "acme/demo"));
    assert!(scope_admits(&scope, "ACME/Demo"), "case-insensitive");
    assert!(!scope_admits(&scope, "someone-else/private"));
}

/// Drive the real `forward` against a live upstream, so the whole mediated
/// path is exercised: scope, policy, credential swap and relay.
mod forwarding {
    use super::*;
    use axum::http::Request as HttpRequest;

    /// An upstream that echoes the credential it was presented.
    ///
    /// A `/compare/` request is answered as a fast-forward instead, because
    /// every push to an existing ref now asks the upstream whether it is one
    /// (issue #272). Tests that want the refusal drive it with
    /// [`diverged_upstream`].
    async fn echo_upstream() -> u16 {
        upstream_reporting("ahead").await
    }

    /// An upstream that reports every comparison as a rewrite.
    async fn diverged_upstream() -> u16 {
        upstream_reporting("diverged").await
    }

    /// An upstream that echoes credentials but answers `/compare/` with a
    /// fixed comparison verdict.
    async fn upstream_reporting(status: &'static str) -> u16 {
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let port = listener.local_addr().unwrap().port();
        tokio::spawn(async move {
            while let Ok((mut socket, _)) = listener.accept().await {
                use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
                let mut scratch = [0; 8192];
                let read = socket.read(&mut scratch).await.unwrap_or(0);
                let request = String::from_utf8_lossy(&scratch[..read]).to_string();
                let body = if request.contains("/compare/") {
                    format!("{{\"status\":\"{status}\"}}")
                } else {
                    request
                        .lines()
                        .find(|line| line.to_ascii_lowercase().starts_with("authorization:"))
                        .unwrap_or("authorization: (none)")
                        .to_string()
                };
                let _ = socket
                    .write_all(
                        format!(
                            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                            body.len()
                        )
                        .as_bytes(),
                    )
                    .await;
            }
        });
        tokio::task::yield_now().await;
        port
    }

    fn state_for(upstream: u16, data_dir: &std::path::Path) -> crate::app_state::AppState {
        let mut state = crate::app_state::AppState::for_tests(data_dir);
        state.github = crate::github_proxy::GitHubProxyConfig::with_credential(
            "operator-secret",
            &format!("http://127.0.0.1:{upstream}"),
        );
        state
    }

    fn push_request(repository: &str, command: &str) -> HttpRequest<axum::body::Body> {
        let line = format!("{command}\n");
        let body = format!("{:04x}{line}0000PACK", line.len() + 4);
        HttpRequest::builder()
            .method("POST")
            .uri(format!("/git/{repository}.git/git-receive-pack"))
            .body(axum::body::Body::from(body))
            .unwrap()
    }

    /// A refused push never reaches the upstream, so the agent cannot destroy
    /// history even though the router could (issue #261).
    #[tokio::test]
    async fn a_refused_push_never_reaches_the_upstream() {
        let data_dir = tempfile::tempdir().unwrap();
        let state = state_for(echo_upstream().await, data_dir.path());

        let response = forward(
            &state,
            &[],
            push_request("acme/demo", &format!("{OLD} {ZERO_OID} refs/heads/main")),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::FORBIDDEN);
        assert_eq!(
            response.headers()[crate::github_proxy::POLICY_HEADER],
            "blocked"
        );
    }

    /// An allowed push is relayed with the router's own credential, so the
    /// caller never holds one.
    #[tokio::test]
    async fn an_allowed_push_is_relayed_with_the_routers_credential() {
        let data_dir = tempfile::tempdir().unwrap();
        let state = state_for(echo_upstream().await, data_dir.path());

        let response = forward(
            &state,
            &[],
            push_request(
                "acme/demo",
                &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
            ),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::OK);
        let body = axum::body::to_bytes(response.into_body(), 65536)
            .await
            .unwrap();
        let seen = String::from_utf8_lossy(&body);
        // Basic auth of `x-access-token:operator-secret`.
        assert!(seen.to_ascii_lowercase().contains("basic "), "{seen}");
        assert!(
            !seen.contains("la_sk_"),
            "the caller token must not travel: {seen}"
        );
    }

    /// A path that names no repository is not proxied at all.
    #[tokio::test]
    async fn a_path_without_a_repository_is_not_proxied() {
        let data_dir = tempfile::tempdir().unwrap();
        let state = state_for(echo_upstream().await, data_dir.path());

        let response = forward(
            &state,
            &[],
            HttpRequest::builder()
                .uri("/git/incomplete")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::NOT_FOUND);
    }

    /// A scoped token is refused before the upstream is contacted.
    #[tokio::test]
    async fn a_scoped_token_is_refused_before_the_upstream() {
        let data_dir = tempfile::tempdir().unwrap();
        let state = state_for(echo_upstream().await, data_dir.path());

        let response = forward(
            &state,
            &["acme/demo".to_string()],
            push_request(
                "someone-else/private",
                &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
            ),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::FORBIDDEN);
    }

    /// Without a configured credential the proxy says so rather than
    /// forwarding an unauthenticated request.
    #[tokio::test]
    async fn an_unconfigured_proxy_refuses_to_forward() {
        let data_dir = tempfile::tempdir().unwrap();
        let state = crate::app_state::AppState::for_tests(data_dir.path());

        let response = forward(&state, &[], push_request("acme/demo", "")).await;

        assert_eq!(
            response.status(),
            axum::http::StatusCode::SERVICE_UNAVAILABLE
        );
    }

    /// An unreachable upstream is a gateway failure naming the cause, not a
    /// silent success that would look like an accepted push.
    ///
    /// Driven with a branch *creation*, which needs no ancestry check, so this
    /// still pins the forwarding path rather than the check added for #272.
    #[tokio::test]
    async fn an_unreachable_upstream_is_a_gateway_failure() {
        let data_dir = tempfile::tempdir().unwrap();
        let mut state = crate::app_state::AppState::for_tests(data_dir.path());
        state.github = crate::github_proxy::GitHubProxyConfig::with_credential(
            "operator-secret",
            "http://127.0.0.1:1",
        );

        let response = forward(
            &state,
            &[],
            push_request(
                "acme/demo",
                &format!("{ZERO_OID} {NEW} refs/heads/feature\0report-status"),
            ),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::BAD_GATEWAY);
    }

    /// A rewrite the upstream confirms is refused before the packfile moves.
    ///
    /// This is issue #272 end to end: the body carries no force capability, so
    /// the local rule sees nothing, and only the upstream comparison stops it.
    #[tokio::test]
    async fn a_rewrite_the_upstream_reports_is_refused() {
        let data_dir = tempfile::tempdir().unwrap();
        let state = state_for(diverged_upstream().await, data_dir.path());

        let response = forward(
            &state,
            &[],
            push_request(
                "acme/demo",
                &format!(
                    "{OLD} {NEW} refs/heads/main\0report-status-v2 side-band-64k quiet \
                     object-format=sha1 agent=git/2.43.0"
                ),
            ),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::FORBIDDEN);
        assert_eq!(
            response.headers()[crate::github_proxy::POLICY_HEADER],
            "blocked"
        );
    }

    /// An upstream that cannot answer must not resolve in the pusher's favour.
    ///
    /// The credential could be revoked, the API rate-limited, or the network
    /// down. Each leaves the router unable to prove the push is safe, and a
    /// control an agent is not supposed to talk past has to fail closed.
    #[tokio::test]
    async fn an_unanswerable_comparison_refuses_the_push() {
        let data_dir = tempfile::tempdir().unwrap();
        let mut state = crate::app_state::AppState::for_tests(data_dir.path());
        state.github = crate::github_proxy::GitHubProxyConfig::with_credential(
            "operator-secret",
            "http://127.0.0.1:1",
        );

        let response = forward(
            &state,
            &[],
            push_request(
                "acme/demo",
                &format!("{OLD} {NEW} refs/heads/main\0report-status"),
            ),
        )
        .await;

        assert_eq!(
            response.status(),
            axum::http::StatusCode::FORBIDDEN,
            "an unreachable upstream must not let a possible rewrite through"
        );
    }

    /// The handler reads the caller's scope from its own credential, so the
    /// restriction cannot be bypassed by reaching the route directly.
    #[tokio::test]
    async fn the_handler_applies_the_callers_scope() {
        let data_dir = tempfile::tempdir().unwrap();
        let mut state = crate::app_state::AppState::for_tests(data_dir.path());
        state.github = crate::github_proxy::GitHubProxyConfig::with_credential(
            "operator-secret",
            "http://127.0.0.1:1",
        );
        let token = state
            .token_manager
            .issue(&crate::token::IssueRequest {
                ttl_hours: 1,
                label: "agent",
                github_repos: vec!["acme/demo".to_string()],
                sliding_window_seconds: None,
                ..crate::token::IssueRequest::default()
            })
            .expect("issue a scoped token");

        let mut request = push_request(
            "someone-else/private",
            &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
        );
        request.headers_mut().insert(
            axum::http::header::AUTHORIZATION,
            axum::http::HeaderValue::from_str(&format!("Bearer {token}")).unwrap(),
        );

        let response = proxy(axum::extract::State(state), request).await;

        assert_eq!(response.status(), axum::http::StatusCode::FORBIDDEN);
    }

    /// A push larger than the proxy limit is refused rather than buffered
    /// without bound — the body is read into memory to inspect its refs.
    #[tokio::test]
    async fn an_oversized_push_is_refused() {
        let data_dir = tempfile::tempdir().unwrap();
        let mut state = crate::app_state::AppState::for_tests(data_dir.path());
        state.github = crate::github_proxy::GitHubProxyConfig::with_credential(
            "operator-secret",
            "http://127.0.0.1:1",
        );
        state.max_proxy_request_bytes = 16;

        let response = forward(
            &state,
            &[],
            push_request(
                "acme/demo",
                &format!("{OLD} {NEW} refs/heads/feature\0report-status"),
            ),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::PAYLOAD_TOO_LARGE);
    }

    /// A fetch is relayed rather than refused, so cloning through the router
    /// keeps working: only pushes carry ref decisions.
    #[tokio::test]
    async fn a_fetch_is_relayed() {
        let data_dir = tempfile::tempdir().unwrap();
        let mut state = crate::app_state::AppState::for_tests(data_dir.path());
        state.github = crate::github_proxy::GitHubProxyConfig::with_credential(
            "operator-secret",
            &format!("http://127.0.0.1:{}", echo_upstream().await),
        );

        let response = forward(
            &state,
            &[],
            HttpRequest::builder()
                .uri("/git/acme/demo.git/info/refs?service=git-upload-pack")
                .body(axum::body::Body::empty())
                .unwrap(),
        )
        .await;

        assert_eq!(response.status(), axum::http::StatusCode::OK);
    }
}

/// A real `git push --force` announces no force capability, so the capability
/// scan cannot be what decides a rewrite.
///
/// This is the defect behind issue #272 stated as a test: the exact capability
/// list `git send-pack` 2.43 sends on a forced push, asserted to contain none
/// of the strings the old detector looked for. While `refuse_destructive_
/// updates` was the only gate, this body was forwarded to GitHub and the
/// rewrite applied.
#[test]
fn a_forced_push_announces_no_force_capability() {
    let body = [
        pkt(&format!(
            "{OLD} {NEW} refs/heads/main\0report-status-v2 side-band-64k quiet \
             object-format=sha1 agent=git/2.43.0"
        )),
        b"0000".to_vec(),
    ]
    .concat();

    assert!(
        !body_requests_force(&body),
        "git announces no force capability, so this must not be the force signal"
    );
    // The local rule alone therefore sees nothing wrong, which is why the
    // upstream check has to exist.
    assert!(
        refuse_destructive_updates(
            &parse_ref_updates(&body),
            body_requests_force(&body),
            &crate::github_proxy::GitHubPolicy::default(),
            "acme/demo",
        )
        .is_none(),
        "the local rule cannot see a rewrite; only the object graph can"
    );
}

/// An update to an existing ref is exactly what needs settling upstream.
#[test]
fn an_update_to_an_existing_ref_needs_an_ancestry_check() {
    let body = [
        pkt(&format!("{OLD} {NEW} refs/heads/main")),
        b"0000".to_vec(),
    ]
    .concat();

    let queries = updates_needing_ancestry(
        &parse_ref_updates(&body),
        &crate::github_proxy::GitHubPolicy::default(),
        "acme/demo",
    );
    assert_eq!(queries.len(), 1, "{queries:?}");
    assert_eq!(queries[0].old, OLD);
    assert_eq!(queries[0].new, NEW);
    assert_eq!(queries[0].name, "refs/heads/main");
}

/// Creating a branch loses no history, so it must not cost an API call.
#[test]
fn creating_a_branch_needs_no_ancestry_check() {
    let body = [
        pkt(&format!("{ZERO_OID} {NEW} refs/heads/feature")),
        b"0000".to_vec(),
    ]
    .concat();

    assert!(
        updates_needing_ancestry(
            &parse_ref_updates(&body),
            &crate::github_proxy::GitHubPolicy::default(),
            "acme/demo",
        )
        .is_empty()
    );
}

/// A ref the operator allowed is the deliberate escape hatch, and must not be
/// gated on an API call that could fail closed against them.
#[test]
fn an_allowed_ref_skips_the_ancestry_check() {
    let policy: crate::github_proxy::GitHubPolicy = serde_json::from_str(
        r#"{"rules":[{"effect":"allow","path":"/git/acme/demo/refs/heads/scratch"}]}"#,
    )
    .expect("parse the policy");
    let body = [
        pkt(&format!("{OLD} {NEW} refs/heads/scratch")),
        b"0000".to_vec(),
    ]
    .concat();

    assert!(
        updates_needing_ancestry(&parse_ref_updates(&body), &policy, "acme/demo").is_empty(),
        "an explicitly allowed ref is the operator's escape hatch"
    );
}

/// GitHub's comparison vocabulary, mapped to the only question that matters.
#[test]
fn compare_status_decides_fast_forwardness() {
    let ahead = serde_json::json!({"status": "ahead"});
    let identical = serde_json::json!({"status": "identical"});
    let diverged = serde_json::json!({"status": "diverged"});
    let behind = serde_json::json!({"status": "behind"});
    let unknown = serde_json::json!({"total_commits": 3});

    assert_eq!(ancestry_from_compare(&ahead), Ancestry::FastForward);
    assert_eq!(ancestry_from_compare(&identical), Ancestry::FastForward);
    assert_eq!(ancestry_from_compare(&diverged), Ancestry::Diverged);
    assert_eq!(ancestry_from_compare(&behind), Ancestry::Diverged);
    // An answer we cannot read must never be optimistic.
    assert_eq!(ancestry_from_compare(&unknown), Ancestry::Unknown);
}

/// The refusal names the ref and the reason, so an operator can act on it.
#[test]
fn an_unverifiable_update_explains_itself() {
    let message = RefRefusal::Unverifiable(
        "refs/heads/main".into(),
        "upstream answered 403 Forbidden".into(),
    )
    .message();
    assert!(message.contains("refs/heads/main"), "{message}");
    assert!(message.contains("403 Forbidden"), "{message}");
    assert!(message.contains("GITHUB_PROXY_POLICY"), "{message}");
}
