//! Unit tests for [`crate::unix_listener`].

use super::*;

/// Unset means TCP only, exactly as the router always listened.
#[test]
fn without_configuration_no_socket_is_served() {
    // `from_env` reads a variable this test does not set; the crate forbids
    // `unsafe`, so the disabled shape is asserted through the type instead.
    assert_eq!(SocketSetup::Disabled.path(), None);
    assert_eq!(
        SocketSetup::Enabled {
            path: PathBuf::from("/run/router.sock"),
            access: SocketAccess::default(),
        }
        .path(),
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

    let listener = bind(&path, &SocketAccess::default())
        .await
        .expect("bind the socket");

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
    let first = bind(&path, &SocketAccess::default())
        .await
        .expect("bind once");
    drop(first);
    assert!(path.exists(), "the file outlives the listener");

    let second = bind(&path, &SocketAccess::default()).await;

    assert!(second.is_ok(), "a stale socket must not block a restart");
}

/// A socket a live instance is serving is reported rather than unlinked out
/// from under it — replacing it would silently break the running router.
#[tokio::test]
async fn a_live_socket_is_not_stolen() {
    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");
    let holder = bind(&path, &SocketAccess::default())
        .await
        .expect("bind once");

    let error = bind(&path, &SocketAccess::default())
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

    let listener = bind(&path, &SocketAccess::default())
        .await
        .expect("bind under a fresh directory");

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
    let plain = |path| resolve(path, None, None).expect("no mode cannot fail");
    assert_eq!(plain(None), SocketSetup::Disabled);
    assert_eq!(plain(Some("")), SocketSetup::Disabled);
    assert_eq!(plain(Some("   ")), SocketSetup::Disabled, "blank is unset");
    assert_eq!(
        plain(Some("/run/router/router.sock")),
        SocketSetup::Enabled {
            path: PathBuf::from("/run/router/router.sock"),
            access: SocketAccess::default(),
        }
    );
    assert_eq!(
        plain(Some("  /run/router.sock  ")),
        SocketSetup::Enabled {
            path: PathBuf::from("/run/router.sock"),
            access: SocketAccess::default(),
        },
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

    let error = bind(&far_too_long, &SocketAccess::default())
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

    let serving = serve_on(app, &path, &SocketAccess::default())
        .await
        .expect("serve the socket");

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

/// The default stays owner-only: widening is something an operator opts into,
/// never something a new setting does on their behalf.
#[test]
fn the_default_access_is_owner_only() {
    let access = SocketAccess::default();
    assert_eq!(access.mode, 0o600);
    assert_eq!(access.group, None);
    assert_eq!(
        SocketAccess::parse(None, None).expect("an unset mode is valid"),
        access
    );
}

/// The forms an operator actually writes all mean the same thing.
#[test]
fn a_mode_is_read_as_octal_in_the_forms_operators_write() {
    for written in ["0660", "660", "0o660"] {
        let access = SocketAccess::parse(Some(written), None)
            .unwrap_or_else(|error| panic!("{written} should parse: {error}"));
        assert_eq!(access.mode, 0o660, "{written}");
    }
    // Decimal would be a silent disaster: 660 decimal is 0o1224, which sets
    // the sticky bit and clears owner write.
    assert_eq!(
        SocketAccess::parse(Some("600"), None)
            .expect("600 is octal")
            .mode,
        0o600
    );
}

/// A mode wider than 0666 is refused rather than quietly narrowed.
///
/// Silently narrowing would present as "the socket does not work", which is
/// the failure this setting exists to end.
#[test]
fn a_mode_wider_than_0666_is_refused() {
    let error = SocketAccess::parse(Some("0777"), None).expect_err("0777 must be refused");
    assert!(error.contains("0666"), "{error}");

    let error = SocketAccess::parse(Some("nonsense"), None).expect_err("must be refused");
    assert!(error.contains("octal"), "{error}");
}

/// A group is carried through, and blank is the same as unset.
#[test]
fn a_group_is_carried_through_and_blank_is_unset() {
    let access = SocketAccess::parse(Some("0660"), Some("1000")).expect("valid");
    assert_eq!(access.group.as_deref(), Some("1000"));
    assert_eq!(
        SocketAccess::parse(None, Some("   "))
            .expect("blank is valid")
            .group,
        None,
        "a blank group is unset, not a group named \"   \""
    );
}

/// The log line says what was granted, so an operator can see it.
#[test]
fn the_applied_access_describes_itself() {
    assert_eq!(SocketAccess::default().describe(), "mode 0600");
    let shared = SocketAccess::parse(Some("0660"), Some("router")).expect("valid");
    assert_eq!(shared.describe(), "mode 0660, group router");
}

/// The environment settings reach the resolved setup.
#[test]
fn the_mode_setting_reaches_the_socket() {
    let setup = resolve(Some("/run/router.sock"), Some("0660"), Some("1000")).expect("valid");
    let access = setup.access().expect("an enabled socket has access");
    assert_eq!(access.mode, 0o660);
    assert_eq!(access.group.as_deref(), Some("1000"));

    // A bad mode fails the resolve rather than being dropped silently.
    assert!(resolve(Some("/run/router.sock"), Some("0777"), None).is_err());
}

/// A socket bound with a widened mode really carries it on disk.
///
/// This is the reproduction from issue #271 inverted: a client of another uid
/// could not connect because the mode was hardcoded, and the only workaround
/// opened the socket to every uid on the host.
#[cfg(unix)]
#[tokio::test]
async fn a_group_readable_socket_is_bound_with_that_mode() {
    use std::os::unix::fs::PermissionsExt as _;

    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");
    let access = SocketAccess::parse(Some("0660"), None).expect("valid");

    let listener = bind(&path, &access).await.expect("bind the socket");

    let mode = std::fs::metadata(&path)
        .expect("the socket exists")
        .permissions()
        .mode()
        & 0o777;
    assert_eq!(mode, 0o660, "the configured mode must reach the socket");
    drop(listener);
}

/// An unknown group name is an error naming it, not a socket left with the
/// router's own group and a mode that implies sharing.
#[cfg(unix)]
#[tokio::test]
async fn an_unknown_group_is_refused() {
    let directory = tempfile::tempdir().expect("socket directory");
    let path = directory.path().join("router.sock");
    let access = SocketAccess::parse(Some("0660"), Some("no-such-group-exists-here"))
        .expect("parsing does not check existence");

    let error = bind(&path, &access)
        .await
        .expect_err("an unknown group must be refused");
    assert!(error.contains("no-such-group-exists-here"), "{error}");
}
