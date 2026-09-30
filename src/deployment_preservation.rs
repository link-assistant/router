//! Read-only authorization comparisons for candidate deployment validation.

use std::collections::{BTreeMap, BTreeSet};

use jsonwebtoken::{EncodingKey, Header};
use serde::{Deserialize, Serialize};

use crate::storage::TokenRecord;
use crate::token::{TOKEN_PREFIX, TokenClaims};

/// One usable token's advertised model authority; never includes token bytes.
#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
pub struct Catalog {
    pub token_id: String,
    pub client_kind: String,
    pub models: BTreeSet<String>,
}

/// Check every previous token separately. Extra candidate authority is allowed.
pub fn compare(previous: &[Catalog], candidate: &[Catalog]) -> Result<(), String> {
    let candidate: BTreeMap<_, _> = candidate
        .iter()
        .map(|row| ((&row.token_id, &row.client_kind), &row.models))
        .collect();
    for row in previous {
        let Some(models) = candidate.get(&(&row.token_id, &row.client_kind)) else {
            return Err(format!(
                "issued-token catalog unavailable for {} ({})",
                row.token_id, row.client_kind
            ));
        };
        let missing: Vec<_> = row.models.difference(models).collect();
        if !missing.is_empty() {
            return Err(format!(
                "authorized models disappeared for {} ({}): {}",
                row.token_id,
                row.client_kind,
                serde_json::to_string(&missing).expect("model IDs")
            ));
        }
    }
    Ok(())
}

/// Reconstruct an already issued bound token for a read-only catalog probe.
///
/// The original binding, expiry, privileges and id remain unchanged; its
/// durable record still supplies revocation, budgets and model restrictions.
pub fn probe_token(record: &TokenRecord, secret: &str) -> Result<String, String> {
    let claims = TokenClaims {
        sub: record.id.clone(),
        iat: record.issued_at,
        exp: record.expires_at,
        label: record.label.clone(),
        scope: record.scope.clone(),
        github_repos: record.github_repos.clone(),
        client_kind: record.client_kind.clone(),
        principal_id: record.principal_id.clone(),
    };
    jsonwebtoken::encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )
    .map(|jwt| format!("{TOKEN_PREFIX}{jwt}"))
    .map_err(|_| "could not sign issued-token continuity probe".into())
}

/// Expired/revoked and unbound legacy tokens make no usable catalog claim.
#[must_use]
pub const fn usable(record: &TokenRecord, now: i64) -> bool {
    !record.revoked
        && record.expires_at > now
        && record.client_kind.is_some()
        && record.principal_id.is_some()
}

#[cfg(test)]
mod tests {
    use super::*;
    fn row(token: &str, models: &[&str]) -> Catalog {
        Catalog {
            token_id: token.into(),
            client_kind: "claude".into(),
            models: models.iter().map(|id| (*id).into()).collect(),
        }
    }
    #[test]
    fn another_provider_answering_does_not_hide_a_missing_provider() {
        let old = [row("one", &["anthropic/claude", "z.ai/glm-5.3"])];
        assert!(compare(&old, &[row("one", &["z.ai/glm-5.3"])]).is_err());
        assert!(
            compare(
                &old,
                &[row(
                    "one",
                    &["anthropic/claude", "z.ai/glm-5.3", "new/model"]
                )]
            )
            .is_ok()
        );
    }
    #[test]
    fn another_tokens_union_cannot_hide_a_lost_binding() {
        assert!(
            compare(
                &[row("one", &["anthropic/claude"])],
                &[row("two", &["anthropic/claude"])]
            )
            .is_err()
        );
    }
}
