//! Deciding whether the host's Claude Code login can be shared (issue #622).
//!
//! Every fixture credential is a stand-in; the assertions also prove that no
//! part of it reaches the operator-facing status line.

use std::path::Path;

use link_assistant_router::cli::ClaudeCredentials;

use super::{Provision, share};

const ACCESS: &str = "sk-ant-oat01-stand-in-access";
const REFRESH: &str = "sk-ant-ort01-stand-in-refresh";

fn login() -> String {
    serde_json::json!({
        "claudeAiOauth": {
            "accessToken": ACCESS,
            "refreshToken": REFRESH,
            "expiresAt": 4_102_444_800_000_u64,
            "scopes": ["user:inference"],
        }
    })
    .to_string()
}

fn home_with(contents: Option<&str>) -> tempfile::TempDir {
    let home = tempfile::tempdir().unwrap();
    if let Some(contents) = contents {
        std::fs::write(home.path().join(".credentials.json"), contents).unwrap();
    }
    home
}

fn refused(provision: &Provision) -> &str {
    match provision {
        Provision::Refused(reason) => reason,
        other => panic!("expected a refusal, got {other:?}"),
    }
}

fn assert_no_secret(line: &str) {
    assert!(!line.contains(ACCESS), "{line}");
    assert!(!line.contains(REFRESH), "{line}");
    assert!(!line.contains("stand-in"), "{line}");
}

#[test]
fn a_file_login_is_shared_in_place_as_its_owner() {
    let home = home_with(Some(&login()));
    let data = tempfile::tempdir().unwrap();

    let provision = share(Some(home.path()), || false, data.path());

    let Provision::Shared {
        home: shared,
        owner,
    } = &provision
    else {
        panic!("expected a share, got {provision:?}");
    };
    assert_eq!(shared, &home.path().canonicalize().unwrap());
    #[cfg(unix)]
    {
        use std::os::unix::fs::MetadataExt as _;
        let metadata = std::fs::metadata(home.path().join(".credentials.json")).unwrap();
        assert_eq!(*owner, Some((metadata.uid(), metadata.gid())));
    }
    // Without numeric owners the backend keeps the image's own user.
    #[cfg(not(unix))]
    assert_eq!(*owner, None);
    let line = provision.status_line(Path::new("/srv/router"));
    assert!(
        line.starts_with("anthropic_credential=imported method=shared-mount"),
        "{line}"
    );
    assert!(line.contains("refresh_tokens_copied=0"), "{line}");
    assert_no_secret(&line);
    // Sharing reads; it never rewrites the vendor's file.
    assert_eq!(
        std::fs::read_to_string(home.path().join(".credentials.json")).unwrap(),
        login()
    );
}

#[test]
fn a_keychain_login_is_refused_with_the_reason_instead_of_a_dying_snapshot() {
    // The file exists and looks valid: on macOS it is the stale snapshot
    // Claude Code leaves beside its Keychain entry (#249).
    let home = home_with(Some(&login()));
    let data = tempfile::tempdir().unwrap();

    let provision = share(Some(home.path()), || true, data.path());

    let reason = refused(&provision);
    assert!(reason.contains("macOS Keychain"), "{reason}");
    assert!(reason.contains("refresh chain"), "{reason}");
    let line = provision.status_line(Path::new("/srv/router"));
    assert!(
        line.starts_with("anthropic_credential=refused reason="),
        "{line}"
    );
    assert_no_secret(&line);
}

#[test]
fn empty_missing_and_unusable_logins_are_refused_with_a_clear_status() {
    let data = tempfile::tempdir().unwrap();
    let missing = tempfile::tempdir().unwrap().path().join("absent");
    assert!(refused(&share(Some(&missing), || false, data.path())).contains("no Claude Code home"));
    assert!(refused(&share(None, || false, data.path())).contains("unset"));

    let empty = home_with(None);
    assert!(
        refused(&share(Some(empty.path()), || false, data.path()))
            .contains("holds no Claude Code login")
    );

    for (contents, expected) in [
        ("not json {", "is not JSON"),
        (r#"{"apiKey":"x"}"#, "no Claude.ai OAuth login"),
        (
            r#"{"claudeAiOauth":{"accessToken":"sk-ant-oat01-stand-in-access"}}"#,
            "no refresh token",
        ),
        (
            r#"{"claudeAiOauth":{"refreshToken":"sk-ant-ort01-stand-in-refresh"}}"#,
            "no access token",
        ),
        (
            r#"{"_link_assistant_router":{"credential_source":"/elsewhere"}}"#,
            "Router pointer",
        ),
    ] {
        let home = home_with(Some(contents));
        let provision = share(Some(home.path()), || false, data.path());
        assert!(refused(&provision).contains(expected), "{provision:?}");
        assert_no_secret(&provision.status_line(Path::new("/srv/router")));
    }
}

#[cfg(unix)]
#[test]
fn an_unreadable_or_read_only_login_is_refused_not_mounted() {
    use std::os::unix::fs::PermissionsExt as _;
    if nix_is_root() {
        // Permission bits do not bind root; the refusal cannot be observed.
        return;
    }
    let data = tempfile::tempdir().unwrap();

    let unreadable = home_with(Some(&login()));
    let file = unreadable.path().join(".credentials.json");
    std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o000)).unwrap();
    let reason = refused(&share(Some(unreadable.path()), || false, data.path())).to_string();
    std::fs::set_permissions(&file, std::fs::Permissions::from_mode(0o600)).unwrap();
    assert!(reason.contains("cannot be read"), "{reason}");

    let read_only = home_with(Some(&login()));
    std::fs::set_permissions(read_only.path(), std::fs::Permissions::from_mode(0o500)).unwrap();
    let reason = refused(&share(Some(read_only.path()), || false, data.path())).to_string();
    std::fs::set_permissions(read_only.path(), std::fs::Permissions::from_mode(0o700)).unwrap();
    assert!(reason.contains("not writable"), "{reason}");
}

#[cfg(unix)]
#[test]
fn data_an_earlier_root_backend_left_is_refused_with_the_repair() {
    if nix_is_root() {
        // Root owns everything it would inspect; nothing is foreign to it.
        return;
    }
    let home = home_with(Some(&login()));

    // `/` stands in for a data directory an earlier backend wrote as root.
    let reason = refused(&share(Some(home.path()), || false, Path::new("/"))).to_string();

    assert!(reason.contains("belongs to another user"), "{reason}");
    assert!(reason.contains("sudo chown -R"), "{reason}");
}

#[cfg(unix)]
fn nix_is_root() -> bool {
    use std::os::unix::fs::MetadataExt as _;
    let probe = tempfile::NamedTempFile::new().unwrap();
    std::fs::metadata(probe.path()).unwrap().uid() == 0
}

#[test]
fn the_default_names_what_was_skipped_and_how_to_opt_in() {
    let root = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(root.path().join("credentials")).unwrap();

    let line = Provision::Isolated.status_line(root.path());

    assert!(line.starts_with("anthropic_credential=skipped"), "{line}");
    assert!(line.contains("the directory is empty"), "{line}");
    assert!(line.contains("--claude-credentials share"), "{line}");
}

#[test]
fn a_deployment_with_its_own_credentials_is_not_called_empty() {
    let root = tempfile::tempdir().unwrap();
    std::fs::create_dir_all(root.path().join("credentials")).unwrap();
    std::fs::write(root.path().join("credentials/.credentials.json"), "{}").unwrap();

    let line = Provision::Isolated.status_line(root.path());

    assert!(line.starts_with("anthropic_credential=skipped"), "{line}");
    assert!(!line.contains("the directory is empty"), "{line}");
}

#[test]
fn isolation_is_decided_without_looking_at_the_host_login() {
    let data = tempfile::tempdir().unwrap();
    assert_eq!(
        Provision::assess(ClaudeCredentials::Isolated, data.path()),
        Provision::Isolated
    );
}

#[test]
fn a_share_without_numeric_owners_keeps_the_image_user() {
    let line = Provision::Shared {
        home: "/home/operator/.claude".into(),
        owner: None,
    }
    .status_line(Path::new("/srv/router"));
    assert!(line.contains("user=container-default"), "{line}");
    assert_eq!(Provision::Refused("x".into()).label(), "refused");
}

#[test]
fn switching_modes_is_a_different_launch_specification() {
    let shared = Provision::Shared {
        home: "/home/operator/.claude".into(),
        owner: Some((1000, 1000)),
    };
    assert_ne!(shared.label(), Provision::Isolated.label());
    assert_eq!(shared.label(), "shared:/home/operator/.claude");
}
