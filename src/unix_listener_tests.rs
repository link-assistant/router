//! Unit tests for [`crate::unix_listener`].

use super::*;

/// Unset means TCP only, exactly as the router always listened.
#[test]
fn without_configuration_no_socket_is_served() {
    // `from_env` reads a variable this test does not set; the crate forbids
    // `unsafe`, so the disabled shape is asserted through the type instead.
    assert_eq!(SocketSetup::Disabled.path(), None);
    assert_eq!(
        SocketSetup::Enabled(PathBuf::from("/run/router.sock")).path(),
        Some(Path::new("/run/router.sock"))
    );
}

/// A socket is bound, served, and owner-only.
///
/// The router holds the operator's credentials, so anything that can reach it
/// can act as them: a socket readable by every local account would be a wider
/// door than the loopback port it replaces (issue #265).
#[tokio::test]
async fn a_bound_socket_is_owner_only() {
    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");

    let listener = bind(&path).await.expect("bind the socket");

    assert!(path.exists());
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        let mode = std::fs::metadata(&path)
            .expect("stat the socket")
            .permissions()
            .mode();
        assert_eq!(mode & 0o777, 0o600, "mode was {:o}", mode & 0o777);
    }
    drop(listener);
}

/// A socket file left by a crashed run is replaced rather than refused: the
/// path outlives the process, and a router that cannot restart is worse than
/// one that reclaims its own socket.
#[tokio::test]
async fn a_stale_socket_is_replaced() {
    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");
    let first = bind(&path).await.expect("bind once");
    drop(first);
    assert!(path.exists(), "the file outlives the listener");

    let second = bind(&path).await;

    assert!(second.is_ok(), "a stale socket must not block a restart");
}

/// A socket a live instance is serving is reported rather than unlinked out
/// from under it — replacing it would silently break the running router.
#[tokio::test]
async fn a_live_socket_is_not_stolen() {
    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");
    let holder = bind(&path).await.expect("bind once");

    let error = bind(&path)
        .await
        .expect_err("a live socket must be refused");

    assert!(error.contains("already served"), "{error}");
    drop(holder);
}

/// The parent directory is created, so a configured path under a fresh
/// directory works without a separate mkdir step.
#[tokio::test]
async fn a_missing_parent_directory_is_created() {
    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("nested/deeper/router.sock");

    let listener = bind(&path).await.expect("bind under a fresh directory");

    assert!(path.exists());
    drop(listener);
}

/// The hint names the `gh` setting, which lives in its config file rather than
/// an environment variable — precisely the step the docs used to leave unsaid.
#[test]
fn the_hint_names_the_gh_setting() {
    let hint = gh_configuration_hint(Path::new("/run/router/router.sock"));

    assert!(hint.contains("http_unix_socket"), "{hint}");
    assert!(hint.contains("/run/router/router.sock"), "{hint}");
    assert!(hint.contains("GH_ENTERPRISE_TOKEN"), "{hint}");
}
