//! Recovery of administrative access from a locally-owned token store.
//!
//! An operator who loses the admin token cannot administer their own
//! deployment, even holding the store, the volume and the machine. Every verb
//! in the `tokens` family authenticates with the admin credential, so the
//! recovery path for the admin credential required the admin credential, and
//! the standing advice was to destroy the deployment and start over —
//! discarding every issued client token and the whole request log to recover
//! from having misplaced one string (issue #573).
//!
//! ## Why a replacement rather than the lost value
//!
//! The token is a JWT signed with `TOKEN_SECRET`; the store keeps only its
//! metadata — id, label, scope, expiry, revocation. The secret value is
//! therefore genuinely unrecoverable, and no amount of local access changes
//! that. What local access *does* allow is signing a new one: the same
//! operation the server performs at first boot, against the same store and the
//! same secret. The running deployment accepts the result immediately, because
//! validation is a signature check against that secret rather than a lookup of
//! a remembered string — so recovery needs no restart.
//!
//! ## Why local ownership is sufficient authority
//!
//! Reading the token store already means full control of the deployment: the
//! signing secret is reachable from the same place, and with it any token at
//! all can be minted. Gating recovery on that access therefore grants no
//! authority its caller did not already have — it only makes existing
//! authority usable. The boundary that matters is the one this must never
//! cross: recovery is not available over HTTP, exactly as `auth import` and
//! `auth clear` are not, because "prove you are on the machine" is the whole
//! check. [`crate::admin_recovery::refusal`] states that refusal and names the
//! deployment the caller had selected.
//!
//! ## What is preserved
//!
//! Everything except the lost administrator. Client tokens keep working — they
//! are signed with the same secret and this does not touch their records —
//! provider configuration and the request log are not read, and the store is
//! only appended to. `--revoke-others` additionally retires every other admin
//! token, for a credential believed to be in someone else's hands.

use std::sync::Arc;

use crate::storage::TokenStore;
use crate::token::TokenManager;

/// Label recorded on a token minted by recovery.
///
/// The store's own metadata is the audit trail: `TokenRecord` always persists a
/// label and an issue time, so a recovered administrator is visible in `tokens
/// list` for as long as the token exists, with no separate log to enable and
/// nothing to lose if the optional JSONL audit sink is off. The default is a
/// distinct constant rather than the bootstrap label so a recovery is never
/// mistaken for a first boot.
pub const RECOVERED_ADMIN_LABEL: &str = "recovered-admin";

/// Outcome of a successful recovery.
///
/// `Debug` is implemented by hand: this carries a live admin credential, and a
/// derived one would print it into any log, panic or test failure that formats
/// the struct.
pub struct Recovery {
    /// The freshly signed admin token. Printed once, like the bootstrap one.
    pub token: String,
    /// Subject id of the token that was minted, for correlating with the store.
    pub token_id: String,
    /// Ids of admin tokens retired because `--revoke-others` was given.
    pub revoked: Vec<String>,
    /// Admin tokens that already existed and were left alone.
    ///
    /// Reported so the operator learns whether the lost credential is still
    /// live: recovery on its own *adds* an administrator, and a lost token that
    /// someone else holds keeps working until it is revoked or expires.
    pub retained_admins: usize,
}

impl std::fmt::Debug for Recovery {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("Recovery")
            .field("token", &"<redacted>")
            .field("token_id", &self.token_id)
            .field("revoked", &self.revoked)
            .field("retained_admins", &self.retained_admins)
            .finish()
    }
}

/// Mint a replacement administrative token against a local store.
///
/// `manager` must be built from the deployment's own `TOKEN_SECRET` and data
/// directory — the same pair the server uses — or the token will be signed with
/// the wrong key and rejected by the very deployment it was meant to recover.
pub fn recover(
    manager: &TokenManager,
    store: &Arc<dyn TokenStore>,
    ttl_hours: i64,
    label: &str,
    revoke_others: bool,
) -> Result<Recovery, String> {
    if ttl_hours <= 0 {
        return Err(format!(
            "a recovered admin token needs a positive lifetime; --ttl-hours was {ttl_hours}"
        ));
    }
    // Counted before minting so the new administrator is not counted as one of
    // the ones that already existed.
    let existing_admins = admin_token_ids(store)?;
    let token = manager
        .issue_admin_token(ttl_hours, label)
        .map_err(|error| format!("could not sign a replacement admin token: {error}"))?;
    let token_id = crate::managed_server::token_subject(&token)
        .map_err(|error| format!("could not read the minted token's subject: {error}"))?;

    let mut revoked = Vec::new();
    if revoke_others {
        // Revoke by id rather than with `revoke_other_admin_tokens`, which
        // takes the keeper's id and would also retire anything minted between
        // the two calls. The set to retire is the one observed before minting.
        for id in &existing_admins {
            store
                .revoke(id)
                .map_err(|error| format!("minted {token_id} but could not revoke {id}: {error}"))?;
            revoked.push(id.clone());
        }
    }
    Ok(Recovery {
        token,
        token_id,
        retained_admins: if revoke_others {
            0
        } else {
            existing_admins.len()
        },
        revoked,
    })
}

/// Ids of unexpired, unrevoked admin tokens currently in the store.
fn admin_token_ids(store: &Arc<dyn TokenStore>) -> Result<Vec<String>, String> {
    let now = chrono::Utc::now().timestamp();
    let records = store
        .list()
        .map_err(|error| format!("could not read the token store: {error}"))?;
    Ok(records
        .into_iter()
        .filter(|record| {
            record.scope == crate::token::ADMIN_SCOPE && !record.revoked && record.expires_at > now
        })
        .map(|record| record.id)
        .collect())
}

/// Refusal issued when another router is the selected target.
///
/// Recovery reads this machine's store and signs with this machine's secret.
/// Performing it anyway while a different deployment is selected would answer
/// about the wrong deployment in a shape that looks correct — the failure mode
/// issue #291 was filed for — so it refuses and names the target instead.
#[must_use]
pub fn refusal(server: &crate::managed_server::ResolvedServer) -> String {
    format!(
        "`tokens recover-admin` acts on the token store of the machine it runs on, and {} is \
         selected. Recovery is proof of local ownership, so no router performs it over HTTP: \
         run it on that deployment — `docker exec <container> router tokens recover-admin` for \
         a containerised one — or pass --local to recover this machine's store.",
        server.base_url
    )
}
