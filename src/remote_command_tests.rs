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
                "{args:?} {flag} must not contact a server"
            );
        }
    }
}

/// `--managed` says it starts a disposable container. On every family but
/// `with` and `configure` it started nothing and quietly meant `--local`,
/// which is a second, undocumented synonym whose own description promised
/// something else (issue #315). It is refused there, naming what was wanted.
#[test]
fn managed_is_refused_where_no_container_can_be_started() {
    for args in [
        &["router", "tokens", "list"][..],
        &["router", "accounts", "list"],
        &["router", "providers", "list"],
        &["router", "logs", "anomalies"],
        &["router", "doctor"],
        &["router", "tls", "ca"],
    ] {
        let managed = [args, &["--managed"]].concat();
        assert!(
            refuse_managed(&command_of(&managed)).is_some(),
            "{args:?} --managed must be refused rather than silently meaning --local"
        );
        assert!(
            refuse_managed(&command_of(args)).is_none(),
            "{args:?} without the flag is unaffected"
        );
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
/// A command that signs nothing starts without the deployment's signing
/// secret. Requiring it per family refused to *start* for read-only work, and
/// the check was satisfied by any value, so it only taught operators to keep a
/// signing secret exported in their shell (issue #308).
#[test]
fn a_command_that_signs_nothing_does_not_need_the_signing_secret() {
    for argv in [
        &["router", "tokens", "list"][..],
        // The flag that states "this machine" out loud used to be the one that
        // broke the command, because the relaxation hung off "might be remote".
        &["router", "doctor", "--local"],
        &["router", "logs", "summary", "--local"],
        &["router", "tls", "ca"],
        &["router", "clients", "list"],
    ] {
        let cli = Cli::try_parse_from(argv).expect("parses");
        assert!(
            cli.token_secret.as_deref().is_none_or(str::is_empty),
            "the fixture must start without a secret"
        );
        let relaxed = relax_token_secret_for_cli(cli);
        assert!(
            relaxed
                .token_secret
                .as_deref()
                .is_some_and(|secret| !secret.is_empty()),
            "{argv:?} must be able to start without a signing secret"
        );
    }
}

/// A secret the operator supplied is never replaced.
#[test]
fn a_supplied_secret_survives_the_relaxation() {
    let cli = Cli::try_parse_from(["router", "tokens", "list", "--token-secret", "real-secret"])
        .expect("parses");

    let relaxed = relax_token_secret_for_cli(cli);

    assert_eq!(relaxed.token_secret.as_deref(), Some("real-secret"));
}

/// The stand-in is inert. It used to be an ordinary string, so a command that
/// resolved to local execution signed real tokens and encrypted real vendor
/// API keys with a value published in the source (issue #300).
#[test]
fn the_stand_in_secret_cannot_sign_or_encrypt() {
    let cli = Cli::try_parse_from(["router", "tokens", "issue"]).expect("parses");
    let secret = relax_token_secret_for_cli(cli)
        .token_secret
        .expect("a stand-in is installed");

    assert!(crate::token_secret::is_placeholder(&secret));
    assert!(
        crate::token::TokenManager::new(&secret)
            .issue_token(1, "")
            .is_err(),
        "a stand-in must not be able to sign a token"
    );
}

/// The server still refuses to start without a real one.
#[test]
fn serving_still_demands_a_real_secret() {
    let cli = Cli::try_parse_from(["router", "serve"]).expect("parses");
    let relaxed = relax_token_secret_for_cli(cli);
    assert!(
        relaxed.token_secret.as_deref().is_none_or(str::is_empty),
        "the router signs every token it issues"
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

/// `--local` resolves to the local path without contacting anything.
#[tokio::test]
async fn an_explicit_local_target_resolves_without_a_server() {
    let target = AuthTarget {
        local: true,
        server: None,
        managed: false,
    };

    // `Target` holds the admin credential and is deliberately not `Debug`, so
    // this matches rather than unwrapping.
    match resolve(&target).await {
        Ok(Target::Local) => {}
        Ok(Target::Remote(_)) => panic!("--local must not contact a server"),
        Err(code) => panic!("--local must always resolve, got {code:?}"),
    }
}

/// An unreachable named target is an error, not a quiet fall back to local.
///
/// Falling back is the surprise the whole targeting rule exists to remove: a
/// command that cannot reach the router it was told to use must say so.
#[tokio::test]
async fn an_unreachable_named_target_is_an_error() {
    let target = AuthTarget {
        local: false,
        server: Some("http://127.0.0.1:1".to_string()),
        managed: false,
    };

    // Matched rather than unwrapped: `Target` holds the admin credential and
    // is deliberately not `Debug`.
    match resolve(&target).await {
        Ok(_) => panic!("an unreachable target must not resolve to the local path"),
        Err(code) => assert_eq!(format!("{code:?}"), format!("{:?}", ExitCode::from(1))),
    }
}

/// A refusal exits non-zero after printing its reason.
#[test]
fn a_refusal_exits_non_zero() {
    let code = refuse(vec!["error: nope".to_string()]);

    assert_eq!(format!("{code:?}"), format!("{:?}", ExitCode::from(1)));
}

/// Every subcommand in a family answers the target question (issue #294).
///
/// The accessors are what make one rule possible: a variant that forgot to
/// report its target would silently fall back to the local path, which is the
/// failure the rule exists to remove.
#[test]
fn every_subcommand_in_every_family_reports_its_target() {
    for args in [
        // tokens: all six verbs
        &["router", "tokens", "issue"][..],
        &["router", "tokens", "rotate", "tok-1"][..],
        &["router", "tokens", "list"][..],
        &["router", "tokens", "revoke", "tok-1"][..],
        &["router", "tokens", "expire", "tok-1"][..],
        &["router", "tokens", "show", "tok-1"][..],
        // accounts
        &["router", "accounts", "list"][..],
        // providers: all five
        &["router", "providers", "list"][..],
        &[
            "router",
            "providers",
            "add",
            "--name",
            "d",
            "--base-url",
            "https://d/v1",
        ][..],
        &["router", "providers", "show", "d"][..],
        &["router", "providers", "remove", "d"][..],
        &["router", "providers", "import", "/tmp/m.lenv"][..],
        // logs: all three
        &["router", "logs", "summary"][..],
        &["router", "logs", "anomalies"][..],
        &["router", "logs", "show", "cid-1"][..],
    ] {
        let command = command_of(args);
        assert!(
            target_of(&command).is_some(),
            "{args:?} must report a target, or it silently stays local"
        );
        // And each honours `--local`, which is how the local path is asked for.
        let local = [args, &["--local"]].concat();
        assert!(
            !may_be_remote(&command_of(&local)),
            "{args:?} must honour --local"
        );
    }
}
