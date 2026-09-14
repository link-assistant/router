//! `tokens recover-admin`: mint a replacement administrator locally.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit. The rule and its reasoning live in
//! [`link_assistant_router::admin_recovery`]; this file prints the result and
//! maps it onto an exit code.

use std::process::ExitCode;

use link_assistant_router::admin_recovery::Recovery;
use link_assistant_router::token::TokenManager;

/// The JSON envelope a successful recovery prints.
///
/// A contract callers parse, so its shape is asserted rather than assumed. The
/// token is present deliberately — `--json` exists so deployment tooling can
/// capture the credential without scraping a banner — and that is the only place
/// it appears.
fn success_envelope(recovery: &Recovery) -> serde_json::Value {
    serde_json::json!({
        "recovered": true,
        "token": recovery.token,
        "token_id": recovery.token_id,
        "revoked": recovery.revoked,
        "retained_admins": recovery.retained_admins,
    })
}

/// The JSON envelope a refused recovery prints.
///
/// Same envelope with `recovered: false`, so a caller reads one shape and never
/// has to distinguish "failed" from "printed something else entirely".
fn failure_envelope(error: &str) -> serde_json::Value {
    serde_json::json!({ "recovered": false, "error": error })
}

/// Mint a replacement administrator for a store this machine owns (issue #573).
pub fn run(
    manager: &TokenManager,
    revoke_others: bool,
    ttl_hours: i64,
    label: &str,
    json: bool,
) -> ExitCode {
    let store = manager.store();
    let recovery = match link_assistant_router::admin_recovery::recover(
        manager,
        &store,
        ttl_hours,
        label,
        revoke_others,
    ) {
        Ok(recovery) => recovery,
        Err(error) => {
            if json {
                println!("{}", failure_envelope(&error));
            } else {
                eprintln!("error: {error}");
            }
            return ExitCode::from(1);
        }
    };
    if json {
        println!("{}", success_envelope(&recovery));
        return ExitCode::SUCCESS;
    }
    // Shown once, exactly like the bootstrap administrator: the store keeps
    // metadata, so this value is not printable a second time either.
    println!("─────────────────────────────────────────────────────────────");
    println!("Admin token (shown once, store it now): {}", recovery.token);
    println!("Use it as: Authorization: Bearer <token>");
    println!("Recorded in the token store as id {}", recovery.token_id);
    println!("─────────────────────────────────────────────────────────────");
    for id in &recovery.revoked {
        println!("revoked previous admin token {id}");
    }
    if recovery.retained_admins > 0 {
        // The lost credential is still live. Said plainly, because recovery on
        // its own only *adds* an administrator.
        println!(
            "note: {} other admin token(s) remain valid, including the one you lost; \
             rerun with --revoke-others to retire them",
            recovery.retained_admins
        );
    }
    ExitCode::SUCCESS
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn a_refusal_reports_itself_in_the_same_envelope_shape() {
        let envelope = failure_envelope("a zero lifetime is refused");

        // One shape for both outcomes: a caller checks `recovered` rather than
        // guessing whether it got JSON at all.
        assert_eq!(envelope["recovered"], serde_json::Value::Bool(false));
        assert_eq!(envelope["error"], "a zero lifetime is refused");
        assert!(
            envelope.get("token").is_none(),
            "a refusal carries no credential: {envelope}"
        );
    }

    #[test]
    fn a_successful_envelope_carries_the_fields_tooling_reads() {
        let recovery = Recovery {
            token: "la_sk_example".to_string(),
            token_id: "an-id".to_string(),
            revoked: vec!["old-admin".to_string()],
            retained_admins: 2,
        };

        let envelope = success_envelope(&recovery);

        assert_eq!(envelope["recovered"], serde_json::Value::Bool(true));
        assert_eq!(envelope["token"], "la_sk_example");
        assert_eq!(envelope["token_id"], "an-id");
        assert_eq!(envelope["revoked"][0], "old-admin");
        // Reported so tooling can warn that the lost administrator is still live.
        assert_eq!(envelope["retained_admins"], 2);
    }
}
