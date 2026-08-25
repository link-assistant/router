//! Unit tests for the one targeting rule ([`crate::remote_command`]).

use super::*;
use crate::cli::Cli;
use clap::Parser as _;

fn command_of(args: &[&str]) -> Command {
    Cli::try_parse_from(args)
        .expect("the command line must parse")
        .command
        .expect("a subcommand was given")
}

/// Every state-touching family takes the three target flags (issue #294).
///
/// Targeting was decided per family, so what "the router" meant depended on
/// which subcommand was typed — one predictable behaviour turned into a table
/// an operator had to memorise.
#[test]
fn every_state_touching_family_accepts_a_target() {
    for args in [
        &["router", "tokens", "list"][..],
        &["router", "accounts", "list"][..],
        &["router", "providers", "list"][..],
        &["router", "logs", "anomalies"][..],
        &["router", "doctor"][..],
    ] {
        assert!(
            target_of(&command_of(args)).is_some(),
            "{args:?} must carry a target"
        );
        // And the flags actually parse, which is what `--server` did not do.
        let with_server = [args, &["--server", "http://router.example:8080"]].concat();
        let command = command_of(&with_server);
        let target = target_of(&command).expect("a target");
        assert_eq!(
            target.server.as_deref(),
            Some("http://router.example:8080"),
            "{args:?} must accept --server"
        );
    }
}

/// `--local` and `--managed` short-circuit resolution; a bare command does not.
///
/// A bare invocation may still be remote, because a *persisted* selection also
/// names a target and only resolution can tell.
#[test]
fn only_an_explicit_local_target_skips_resolution() {
    for args in [
        &["router", "tokens", "list"][..],
        &["router", "logs", "anomalies"][..],
    ] {
        assert!(
            may_be_remote(&command_of(args)),
            "{args:?} must resolve: a persisted selection counts"
        );
        for flag in ["--local", "--managed"] {
            let explicit = [args, &[flag]].concat();
            assert!(
                !may_be_remote(&command_of(&explicit)),
                "{args:?} {flag} asks for this machine and must not contact a server"
            );
        }
    }
}

/// A command with no target keeps its own dispatch untouched.
#[test]
fn commands_without_a_target_are_left_alone() {
    for args in [
        &["router", "serve"][..],
        &["router", "auth", "status"][..],
        &["router", "clients", "list"][..],
    ] {
        let command = command_of(args);
        assert!(target_of(&command).is_none(), "{args:?}");
        assert!(!may_be_remote(&command), "{args:?}");
    }
}

/// A remote command runs without `TOKEN_SECRET` (issue #294).
///
/// The secret signs *this* machine's tokens; a command aimed at another
/// deployment neither issues nor validates them here. Requiring it refused to
/// start rather than acting on the wrong target, and pushed operators toward
/// copying the deployment's signing secret onto a workstation.
#[test]
fn a_remote_command_does_not_need_the_local_signing_secret() {
    let cli = Cli::try_parse_from(["router", "tokens", "list"]).expect("parses");
    assert!(
        cli.token_secret.as_deref().is_none_or(str::is_empty),
        "the fixture must start without a secret"
    );

    let relaxed = relax_token_secret_for_remote(cli);

    assert!(
        relaxed
            .token_secret
            .as_deref()
            .is_some_and(|secret| !secret.is_empty()),
        "a remote command must be able to start without one"
    );
}

/// A secret the operator supplied is never replaced.
#[test]
fn a_supplied_secret_survives_the_relaxation() {
    let cli = Cli::try_parse_from(["router", "tokens", "list", "--token-secret", "real-secret"])
        .expect("parses");

    let relaxed = relax_token_secret_for_remote(cli);

    assert_eq!(relaxed.token_secret.as_deref(), Some("real-secret"));
}

/// The local path still demands a real secret, because it signs with it.
#[test]
fn an_explicitly_local_command_still_needs_its_secret() {
    let cli = Cli::try_parse_from(["router", "tokens", "list", "--local"]).expect("parses");

    let relaxed = relax_token_secret_for_remote(cli);

    assert!(
        relaxed.token_secret.as_deref().is_none_or(str::is_empty),
        "signing happens here, so the secret is genuinely required"
    );
}

/// A refusal names the target and says what can be done instead (issue #294).
#[test]
fn a_refusal_names_the_target_and_an_alternative() {
    let server = ResolvedServer::at(
        "http://router.example:8080".to_string(),
        Some("token".to_string()),
        "test",
    );

    let lines = no_remote_form("doctor", &server, "run `router doctor` on that deployment");

    let all = lines.join("\n");
    assert!(
        all.contains("http://router.example:8080"),
        "describing local state as though it were the target is the bug: {all}"
    );
    assert!(
        all.contains("run `router doctor` on that deployment"),
        "{all}"
    );
    assert!(
        all.contains("--local"),
        "the local action stays reachable: {all}"
    );
    assert!(all.starts_with("error:"), "{all}");
}
