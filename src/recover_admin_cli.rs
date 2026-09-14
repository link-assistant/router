//! `tokens recover-admin`: mint a replacement administrator locally.
//!
//! Split from `main.rs` to keep that file within the repository's 1000-line
//! limit. The rule and its reasoning live in
//! [`link_assistant_router::admin_recovery`]; this file prints the result and
//! maps it onto an exit code.

use std::process::ExitCode;

use link_assistant_router::token::TokenManager;

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
                println!(
                    "{}",
                    serde_json::json!({ "recovered": false, "error": error })
                );
            } else {
                eprintln!("error: {error}");
            }
            return ExitCode::from(1);
        }
    };
    if json {
        println!(
            "{}",
            serde_json::json!({
                "recovered": true,
                "token": recovery.token,
                "token_id": recovery.token_id,
                "revoked": recovery.revoked,
                "retained_admins": recovery.retained_admins,
            })
        );
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
