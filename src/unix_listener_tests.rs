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

/// An unset or empty setting means TCP only, exactly as the router always
/// listened; a configured path is served alongside it.
#[test]
fn the_setting_decides_whether_a_socket_is_served() {
    assert_eq!(resolve(None), SocketSetup::Disabled);
    assert_eq!(resolve(Some("")), SocketSetup::Disabled);
    assert_eq!(
        resolve(Some("   ")),
        SocketSetup::Disabled,
        "blank is unset"
    );
    assert_eq!(
        resolve(Some("/run/router/router.sock")),
        SocketSetup::Enabled(PathBuf::from("/run/router/router.sock"))
    );
    assert_eq!(
        resolve(Some("  /run/router.sock  ")),
        SocketSetup::Enabled(PathBuf::from("/run/router.sock")),
        "surrounding whitespace is not part of the path"
    );
}

/// A path that cannot be bound is an error naming it, rather than a router
/// that silently never serves the socket it was told to.
#[tokio::test]
async fn an_unbindable_path_names_itself() {
    // A socket path has a hard length limit (~104 bytes) that no platform
    // stretches, so this cannot be bound anywhere.
    let directory = tempfile::tempdir().expect("socket directory");
    let far_too_long = directory.path().join("x".repeat(300));

    let error = bind(&far_too_long)
        .await
        .expect_err("an unbindable path must be an error");

    assert!(error.contains("could not"), "{error}");
}

/// The router really answers over the socket, in plain HTTP.
///
/// That is the property `gh` needs: no TLS, so no certificate it has no way to
/// trust (issue #265).
#[tokio::test]
async fn a_served_socket_answers_plain_http() {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};

    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");
    let app = axum::Router::new().route("/health", axum::routing::get(|| async { "ok" }));

    let serving = serve_on(app, &path).await.expect("serve the socket");

    let mut stream = tokio::net::UnixStream::connect(&path)
        .await
        .expect("connect over the socket");
    stream
        .write_all(b"GET /health HTTP/1.1\r\nHost: router.internal\r\nConnection: close\r\n\r\n")
        .await
        .expect("send a plaintext request");
    let mut response = String::new();
    stream
        .read_to_string(&mut response)
        .await
        .expect("read the reply");
    serving.abort();

    assert!(response.contains(" 200 "), "{response}");
    assert!(response.contains("ok"), "{response}");
}

/// Nothing configured serves no socket, so a deployment that never asked for
/// one is unaffected.
#[tokio::test]
async fn no_configuration_serves_no_socket() {
    // `serve_configured` reads the environment; with the variable unset in this
    // process it must decline rather than invent a path.
    if std::env::var_os("LISTEN_UNIX_SOCKET").is_none() {
        let served = serve_configured(axum::Router::new())
            .await
            .expect("no error");
        assert!(served.is_none());
    }
}
