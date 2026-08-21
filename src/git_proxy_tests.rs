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
