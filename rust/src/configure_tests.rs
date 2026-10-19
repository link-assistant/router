//! Tests for the decisions `router configure` makes before it touches the
//! network (issue #296).

use super::*;
use crate::cli::AuthTarget;

fn args(client: Option<ClientKind>) -> ConfigureArgs {
    ConfigureArgs {
        client,
        all: client.is_none(),
        undo: false,
        target: AuthTarget::default(),
        token: None,
        token_stdin: false,
        ttl_hours: 8760,
    }
}

/// A client the router can never point at by writing a file is named and
/// skipped, not attempted. Reversal makes the same check, because `--undo`
/// used to report success for a configuration that could not exist (#303).
#[test]
fn clients_that_cannot_be_configured_by_file_are_named() {
    for client in [ClientKind::Cursor, ClientKind::GeminiCli] {
        let reason = unconfigurable(client).expect("must be reported as unconfigurable");
        assert!(!reason.is_empty(), "{client} must say why, not just refuse");
    }
    // Everything else is configurable, so a skip list cannot silently grow.
    for client in ClientKind::ALL {
        if matches!(client, ClientKind::Cursor | ClientKind::GeminiCli) {
            continue;
        }
        assert!(
            unconfigurable(client).is_none(),
            "{client} must be configurable"
        );
    }
}

/// Grok CLI has no persistent base-URL setting, so the credential file is the
/// whole configuration. `with --global` refused it outright and withheld the
/// half that does work (issue #296).
#[test]
fn only_the_environment_only_client_skips_the_config_file() {
    assert!(environment_only(ClientKind::GrokCli));
    for client in ClientKind::ALL {
        if client == ClientKind::GrokCli {
            continue;
        }
        assert!(
            !environment_only(client),
            "{client} is configured by a file, not only by the environment"
        );
    }
}

/// A bare name acts on that client; `--all` acts on every one.
#[test]
fn a_named_client_is_the_only_one_acted_on() {
    assert_eq!(
        args(Some(ClientKind::ClaudeCode)).clients(),
        [ClientKind::ClaudeCode]
    );
    assert_eq!(args(None).clients(), ClientKind::ALL.to_vec());
}

/// Undo removes local files and has to keep working offline, so it never
/// resolves a target — it asks only what is already to hand, and an explicit
/// `--token` wins over anything persisted.
#[test]
fn an_explicit_token_is_the_admin_credential_for_undo() {
    let mut with_token = args(Some(ClientKind::ClaudeCode));
    with_token.token = Some("la_sk_explicit".into());
    assert_eq!(
        admin_token_for(&with_token, "https://router.example"),
        Some("la_sk_explicit".to_string())
    );
}

/// The default TTL is a year: this is the permanent path, and a credential
/// that lapses next week makes "configured" mean "configured until Tuesday".
#[test]
fn the_default_credential_outlives_the_week() {
    assert_eq!(args(Some(ClientKind::ClaudeCode)).ttl_hours, 8760);
}
