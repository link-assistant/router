//! Tests for the vendor-client rung of the recovery ladder (issue #239).
//!
//! The rung exists because the vendor's own client can sometimes redeem a
//! credential the router cannot, so the tests here drive a *real* child process
//! that rewrites a *real* credential file: the only two things this rung
//! observes are whether the process ran and whether the chain link on disk
//! moved.

use std::path::Path;
#[cfg(unix)]
use std::path::PathBuf;

use super::{PROBE_ARGS_ENV, VendorCli, link_digest, probe_args_env_for, probe_for};
#[cfg(unix)]
use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

const NOW_MS: i64 = 1_700_000_000_000;

fn seed_credential(home: &Path, access: &str, refresh: &str) {
    let document = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": access,
            "refreshToken": refresh,
            "expiresAt": NOW_MS - 1,
            "scopes": ["user:inference"],
        }
    });
    std::fs::write(
        home.join(".credentials.json"),
        serde_json::to_vec_pretty(&document).expect("serialize"),
    )
    .expect("seed credential");
}

fn token(access: &str, refresh: &str) -> SubscriptionToken {
    SubscriptionToken {
        access_token: access.into(),
        refresh_token: Some(refresh.into()),
        expires_at_ms: Some(NOW_MS - 1),
        account_id: None,
        resource_url: None,
    }
}

/// A stand-in for the vendor client: a shell script that does whatever the test
/// needs a client to have done.
#[cfg(unix)]
fn stub_cli(dir: &Path, script: &str) -> PathBuf {
    use std::os::unix::fs::PermissionsExt as _;
    let path = dir.join("stub-vendor-cli");
    std::fs::write(&path, format!("#!/bin/sh\n{script}\n")).expect("write stub");
    std::fs::set_permissions(&path, std::fs::Permissions::from_mode(0o755)).expect("chmod stub");
    path
}

/// The whole point of the rung: the client rotates the chain and the router
/// picks up what it wrote instead of declaring the subscription dead.
#[cfg(unix)]
#[tokio::test]
async fn a_client_that_rotates_the_credential_hands_the_new_link_back() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());

    // Writing through $CLAUDE_CONFIG_DIR rather than a path the test bakes in
    // proves the child is pointed at the router's credential home, not at the
    // invoking user's own.
    // The stub also writes the debug log the rung asks for, with the kind of
    // already-redacted token line the real client emits, so the journalling
    // path is exercised rather than assumed.
    let cli = VendorCli::claude(
        stub_cli(
            home.path(),
            r#"printf 'POST /v1/oauth/token 200\nrefresh_token: [REDACTED]\nsession start\n' > "$2"
cat > "$CLAUDE_CONFIG_DIR/.credentials.json" <<'JSON'
{"claudeAiOauth":{"accessToken":"access-2","refreshToken":"refresh-2","expiresAt":9999999999999,"scopes":["user:inference"]}}
JSON"#,
        ),
        home.path(),
    );

    let rotated = cli
        .rotate(&reader, &token("access-1", "refresh-1"))
        .await
        .expect("the client rotated the chain");
    assert_eq!(rotated.access_token, "access-2");
    assert_eq!(rotated.refresh_token.as_deref(), Some("refresh-2"));
}

/// A client that runs but changes nothing has recovered nothing, and must say
/// so rather than hand back the same spent link as if it were progress.
#[cfg(unix)]
#[tokio::test]
async fn a_client_that_changes_nothing_recovers_nothing() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    // A debug log that says nothing about the token exchange: the rung must
    // report that rather than pretend it learned something.
    let cli = VendorCli::claude(
        stub_cli(
            home.path(),
            r#"printf 'session start
event loop stall
' > "$2"; exit 1"#,
        ),
        home.path(),
    );

    assert!(
        cli.rotate(&reader, &token("access-1", "refresh-1"))
            .await
            .is_none()
    );
    // And the credential it was pointed at is left exactly as it was.
    assert_eq!(
        CredentialStore::reload(&reader)
            .expect("credential")
            .refresh_token
            .as_deref(),
        Some("refresh-1")
    );
}

/// The rung is a best effort on a path that is already failing, so a client
/// that cannot be run at all must not turn a rejection into a crash.
#[tokio::test]
async fn a_client_that_cannot_be_run_is_not_fatal() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let cli = VendorCli::claude(home.path().join("no-such-binary"), home.path());

    assert!(
        cli.rotate(&reader, &token("access-1", "refresh-1"))
            .await
            .is_none()
    );
}

/// A client that hangs must not hold a request path open indefinitely.
#[cfg(unix)]
#[tokio::test]
async fn a_client_that_hangs_is_given_up_on() {
    let home = tempfile::tempdir().expect("temp home");
    seed_credential(home.path(), "access-1", "refresh-1");
    let reader = SubscriptionReader::new(SubscriptionProvider::Claude, home.path());
    let cli = VendorCli::claude(stub_cli(home.path(), "sleep 30"), home.path())
        .with_timeout(std::time::Duration::from_millis(200));

    let started = std::time::Instant::now();
    assert!(
        cli.rotate(&reader, &token("access-1", "refresh-1"))
            .await
            .is_none()
    );
    assert!(
        started.elapsed() < std::time::Duration::from_secs(10),
        "the rung waited for the whole child instead of its own timeout"
    );
}

/// Chain links appear in the journal only as digests: enough to see that a link
/// changed, not enough to reconstruct one.
#[test]
fn a_chain_link_is_named_without_being_disclosed() {
    let secret = "sk-ant-oat01-a-very-secret-refresh-token";
    let digest = link_digest(&token("access-1", secret));
    assert!(!digest.contains(secret));
    assert_eq!(digest.len(), 8, "four bytes of SHA-256, hex encoded");
    assert_eq!(digest, link_digest(&token("access-2", secret)), "stable");
    assert_ne!(digest, link_digest(&token("access-1", "another-link")));
    assert_eq!(
        link_digest(&SubscriptionToken {
            access_token: "access-1".into(),
            refresh_token: None,
            expires_at_ms: None,
            account_id: None,
            resource_url: None,
        }),
        "none"
    );
}

/// When the ladder falls back to the vendor client it also records the exchange
/// the router itself sent, so the two can be compared. That record has to be
/// complete enough to reproduce the request by hand — and must carry no secret.
#[test]
fn the_fallback_record_reproduces_the_request_without_its_secrets() {
    let shape = crate::refresh::direct_exchange_shape(SubscriptionProvider::Claude);

    assert!(
        shape.contains("POST https://platform.claude.com/v1/oauth/token"),
        "{shape}"
    );
    assert!(shape.contains("content-type: application/json"), "{shape}");
    assert!(
        shape.contains("anthropic-beta: oauth-2025-04-20"),
        "{shape}"
    );
    assert!(shape.contains("user-agent: "), "{shape}");
    for field in ["grant_type", "refresh_token", "client_id"] {
        assert!(
            shape.contains(field),
            "body field {field} missing from {shape}"
        );
    }
    assert!(shape.contains("values omitted"), "{shape}");
}

/// The rung knows a probe for each provider that has one, and refuses to guess
/// for those that do not.
///
/// Running the wrong command line against a vendor binary is a side effect, not
/// a failed lookup, so a provider without a probe yields no client at all
/// rather than one carrying another vendor's arguments (issue #275).
#[test]
fn a_client_exists_only_for_a_provider_with_a_known_probe() {
    assert!(probe_for(SubscriptionProvider::Claude).is_some());
    assert!(probe_for(SubscriptionProvider::Codex).is_some());
    assert!(probe_for(SubscriptionProvider::Gemini).is_none());
    assert!(probe_for(SubscriptionProvider::Qwen).is_none());

    assert!(VendorCli::for_provider(SubscriptionProvider::Codex, "/bin/true", "/tmp").is_some());
    assert!(
        VendorCli::for_provider(SubscriptionProvider::Gemini, "/bin/true", "/tmp").is_none(),
        "a provider with no probe must not yield a client"
    );
}

/// Each provider's probe is its own vendor's command line.
///
/// `claude -p ok` against `codex` is not a cheaper probe, it is an error: the
/// two clients share no argument grammar.
#[test]
fn each_provider_gets_its_own_vendors_command_line() {
    let claude = probe_for(SubscriptionProvider::Claude).expect("claude has a probe");
    let codex = probe_for(SubscriptionProvider::Codex).expect("codex has a probe");
    assert_ne!(claude, codex);
    assert!(claude.contains(&"-p"), "{claude:?}");
    assert!(codex.contains(&"exec"), "{codex:?}");
    // `codex exec` refuses to run outside a repository without this.
    assert!(codex.contains(&"--skip-git-repo-check"), "{codex:?}");
}

/// The per-provider override names the provider, so a deployment running two
/// clients can set them independently.
///
/// The global form cannot express "one probe for Claude, another for Codex",
/// and a deployment with both would otherwise have to accept one client
/// running the other's command line.
#[test]
fn the_probe_override_can_name_one_provider() {
    assert_eq!(
        probe_args_env_for(SubscriptionProvider::Claude),
        "ROUTER_VENDOR_REFRESH_ARGS_CLAUDE"
    );
    assert_eq!(
        probe_args_env_for(SubscriptionProvider::Codex),
        "ROUTER_VENDOR_REFRESH_ARGS_CODEX"
    );
    assert!(
        probe_args_env_for(SubscriptionProvider::Claude).starts_with(PROBE_ARGS_ENV),
        "the per-provider form must extend the global one"
    );
}
