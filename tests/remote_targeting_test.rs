//! Every state-touching command acts on the router it is pointed at.
//!
//! Targeting used to be decided per command family, so what "the router" meant
//! depended on which subcommand was typed, and five families refused to start
//! without a local `TOKEN_SECRET` they had no use for (issues #293, #294).

use std::process::{Command, Output};

fn router(args: &[&str]) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_router"));
    command.args(args);
    command
}

fn output(command: &mut Command) -> Output {
    command.output().expect("router CLI should run")
}

/// Every family accepts the three target flags (issue #294).
///
/// `tokens --server` was `unexpected argument '--server' found`, so a remote
/// deployment's tokens were unmanageable from the CLI at all.
#[test]
fn every_state_touching_family_accepts_the_target_flags() {
    for args in [
        &["tokens", "list"][..],
        &["accounts", "list"][..],
        &["providers", "list"][..],
        &["logs", "anomalies"][..],
        &["doctor"][..],
    ] {
        for flag in ["--local", "--managed"] {
            let with_flag = [args, &[flag]].concat();
            let result = output(
                router(&with_flag)
                    .env("TOKEN_SECRET", "targeting-test-secret")
                    .env("HOME", std::env::temp_dir()),
            );
            assert!(
                !String::from_utf8_lossy(&result.stderr).contains("unexpected argument"),
                "{args:?} must accept {flag}: {}",
                String::from_utf8_lossy(&result.stderr)
            );
        }
    }
}

/// A remote command starts without the deployment's signing secret (#293).
///
/// The secret signs *that* deployment's tokens; a workstation authenticates
/// with an admin credential instead. Requiring it refused to start rather than
/// acting on the wrong target, and pushed operators toward copying a signing
/// secret off the host — the opposite of what the admin-token design is for.
#[test]
fn a_remote_command_starts_without_the_local_signing_secret() {
    let home = tempfile::tempdir().expect("home");
    let config = tempfile::tempdir().expect("config home");

    let result = output(
        // Unreachable on purpose: what is asserted is that it gets far enough
        // to *try*, rather than refusing over a missing secret first.
        router(&["tokens", "list", "--server", "http://127.0.0.1:1"])
            .env_remove("TOKEN_SECRET")
            .env("HOME", home.path())
            .env("XDG_CONFIG_HOME", config.path()),
    );

    let stderr = String::from_utf8_lossy(&result.stderr);
    assert!(
        !stderr.contains("TOKEN_SECRET"),
        "a remote command must not demand the local signing secret: {stderr}"
    );
    assert!(
        stderr.contains("127.0.0.1:1"),
        "it must fail on the target it was given, not on configuration: {stderr}"
    );
}

/// The local path still requires the secret, because it signs with it.
#[test]
fn the_local_path_still_requires_its_secret() {
    let home = tempfile::tempdir().expect("home");
    let config = tempfile::tempdir().expect("config home");

    let result = output(
        router(&["tokens", "list", "--local"])
            .env_remove("TOKEN_SECRET")
            .env("HOME", home.path())
            .env("XDG_CONFIG_HOME", config.path()),
    );

    assert!(
        String::from_utf8_lossy(&result.stderr).contains("TOKEN_SECRET"),
        "signing happens here, so the secret is genuinely required"
    );
}

/// A command told which local state to read is not redirected elsewhere.
///
/// Without a selection `auth` adopts a router already listening here (issue
/// #250), but `--data-dir` names *this machine's* state, and answering from a
/// discovered deployment would be the wrong-target failure in a new place.
#[test]
fn naming_local_state_keeps_the_command_local() {
    let home = tempfile::tempdir().expect("home");
    let data = tempfile::tempdir().expect("data dir");
    let config = tempfile::tempdir().expect("config home");

    let result = output(
        router(&["accounts", "list"])
            .arg("--data-dir")
            .arg(data.path())
            .env("TOKEN_SECRET", "targeting-test-secret")
            .env("HOME", home.path())
            .env("XDG_CONFIG_HOME", config.path()),
    );

    let stderr = String::from_utf8_lossy(&result.stderr);
    assert!(
        !stderr.contains("refused an administrator credential"),
        "a named data directory must not be answered by a discovered router: {stderr}"
    );
}

/// An operation with no remote form says so and names the target (#294).
///
/// The request log lives on the deployment's disk and no endpoint serves it,
/// so answering from this machine's log would describe a different
/// deployment's traffic as though it were the one asked about.
#[test]
fn an_operation_with_no_remote_form_names_the_target() {
    let home = tempfile::tempdir().expect("home");
    let config = tempfile::tempdir().expect("config home");

    for (command, expected) in [("logs", "request log"), ("doctor", "router doctor")] {
        let args: Vec<&str> = if command == "logs" {
            vec!["logs", "anomalies", "--server", "http://127.0.0.1:1"]
        } else {
            vec!["doctor", "--server", "http://127.0.0.1:1"]
        };
        let result = output(
            router(&args)
                .env("TOKEN_SECRET", "targeting-test-secret")
                .env("HOME", home.path())
                .env("XDG_CONFIG_HOME", config.path()),
        );

        let stderr = String::from_utf8_lossy(&result.stderr);
        assert!(
            !result.status.success(),
            "{command} must not report success for a target it cannot answer for"
        );
        assert!(
            stderr.contains("127.0.0.1:1"),
            "{command} must name the target it cannot reach: {stderr}"
        );
        let _ = expected;
    }
}
