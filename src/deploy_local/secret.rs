//! Keep the signing secret part of the launch specification (issue #625).
//!
//! v1.14.3 compared only the image, port and credential mode, so a deploy
//! with another `TOKEN_SECRET` was "already converged" while the backend
//! kept the old one, and an image update with a mistaken secret replaced a
//! backend whose issued client tokens then all failed with HTTP 401 while
//! `/api/health` stayed green. The secret is now fingerprinted onto every
//! backend, a different secret is refused before any mutation unless
//! `--force-update` names it deliberately, and every candidate must accept a
//! token signed with the running deployment's secret before it receives
//! traffic. Neither the secret nor the probe token reaches argv or output.

use base64::Engine as _;
use jsonwebtoken::{Algorithm, EncodingKey, Header};
use link_assistant_router::storage::TokenRecord;

use super::{Coordinator, LABEL_KEY};

/// The backend label holding [`fingerprint`] of its `TOKEN_SECRET`.
pub(super) const LABEL_SUFFIX: &str = "token-secret";
/// The variable carrying the probe token into `docker exec`, by name only.
pub(super) const PROBE_ENV: &str = "ROUTER_DEPLOY_PROBE_TOKEN";
const FINGERPRINT_CONTEXT: &[u8] = b"link-assistant-router/deploy/token-secret-fingerprint/v1";
const PROBE_SCRIPT: &str = "const r=await fetch('http://127.0.0.1:8080/api/models',{headers:{authorization:'Bearer '+process.env.ROUTER_DEPLOY_PROBE_TOKEN}});console.log(r.status)";

fn hmac_sha256(key: &[u8], message: &[u8]) -> Vec<u8> {
    let signature =
        jsonwebtoken::crypto::sign(message, &EncodingKey::from_secret(key), Algorithm::HS256)
            .expect("HMAC-SHA256 accepts any key");
    base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(signature)
        .expect("jsonwebtoken returns base64url")
}

/// A keyed, truncated digest that identifies a secret without revealing it:
/// HMAC-SHA256 keyed by the secret over a fixed context, first 128 bits.
pub(super) fn fingerprint(secret: &str) -> String {
    let digest = hmac_sha256(secret.as_bytes(), FINGERPRINT_CONTEXT);
    format!("hmac-sha256:{}", hex::encode(&digest[..16]))
}

#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub(super) enum SecretMatch {
    Matches,
    Changed,
    /// Neither a fingerprint label nor a readable environment.
    Unknown,
    /// A read-only command was run without a signing secret.
    NotSupplied,
}

impl SecretMatch {
    pub(super) const fn as_str(self) -> &'static str {
        match self {
            Self::Matches => "matches",
            Self::Changed => "changed",
            Self::Unknown => "unknown",
            Self::NotSupplied => "not-supplied",
        }
    }
}

/// The probe outcome rule: authentication passed unless the candidate said
/// 401 or failed outright. `/api/models` answers 403 for a token without a
/// managed-client binding, which still proves the signature was accepted.
pub(super) const fn probe_accepted(status: u16) -> bool {
    status != 401 && status < 500
}

impl Coordinator<'_> {
    /// Compare the supplied secret with the one `backend` was started with.
    /// Backends from before issue #625 carry no label; their environment is
    /// read into memory only to be fingerprinted.
    pub(super) fn secret_match(&self, backend: &str) -> SecretMatch {
        if link_assistant_router::token_secret::is_placeholder(self.token_secret) {
            return SecretMatch::NotSupplied;
        }
        let running = self
            .docker
            .label(backend, &format!("{LABEL_KEY}.{LABEL_SUFFIX}"))
            .or_else(|| {
                self.docker
                    .env_value(backend, "TOKEN_SECRET")
                    .map(|secret| fingerprint(&secret))
            });
        match running {
            None => SecretMatch::Unknown,
            Some(running) if running == fingerprint(self.token_secret) => SecretMatch::Matches,
            Some(_) => SecretMatch::Changed,
        }
    }

    /// Status lines for the secret; true when an update would need force.
    pub(super) fn print_secret(&self, backend: &str) -> bool {
        let matched = self.secret_match(backend);
        println!("token_secret={}", matched.as_str());
        match matched {
            SecretMatch::Changed => {
                println!(
                    "blocker=token-secret-change reason=\"{backend} verifies tokens with a different TOKEN_SECRET; its issued client tokens would be rejected with HTTP 401\""
                );
                true
            }
            SecretMatch::Unknown => {
                println!(
                    "blocker=token-secret-unknown reason=\"the TOKEN_SECRET {backend} was started with cannot be established\""
                );
                true
            }
            SecretMatch::Matches | SecretMatch::NotSupplied => false,
        }
    }

    fn issued_client_tokens(&self, backend: &str) -> Option<usize> {
        let now = chrono::Utc::now().timestamp();
        let rendered = self.docker.token_inventory(backend).ok()?;
        let records: Vec<TokenRecord> = serde_json::from_str(&rendered).ok()?;
        Some(
            records
                .iter()
                .filter(|record| !record.revoked && record.expires_at > now)
                .count(),
        )
    }

    /// Refuse a secret change before any mutation unless it is forced.
    pub(super) fn secret_preflight(&self, backend: &str) -> Result<(), String> {
        let matched = self.secret_match(backend);
        let reason = match matched {
            SecretMatch::Matches => return Ok(()),
            SecretMatch::NotSupplied => {
                return Err(link_assistant_router::token_secret::refusal());
            }
            SecretMatch::Changed => format!(
                "the supplied TOKEN_SECRET differs from the one {backend} verifies tokens with: every issued client token would be rejected with HTTP 401 and provider keys encrypted at rest could not be read. Rerun with the saved secret; if {backend} itself was started with a wrong secret, rerun with the correct one and --force-update"
            ),
            SecretMatch::Unknown => format!(
                "the TOKEN_SECRET {backend} was started with cannot be established, so token continuity cannot be proven; rerun with --force-update after confirming the secret"
            ),
        };
        if !self.force {
            return Err(reason);
        }
        println!(
            "force_update accepted token_secret_rotation token_secret={} issued_client_tokens={}",
            matched.as_str(),
            self.issued_client_tokens(backend)
                .map_or_else(|| "unknown".to_string(), |count| count.to_string())
        );
        Ok(())
    }

    /// Before cutover, show the candidate a short-lived token signed with the
    /// running deployment's secret. It has no durable record, so no store is
    /// written, and it reaches the candidate only through the environment.
    pub(super) fn probe_candidate(&self, candidate: &str, previous: &str) -> Result<(), String> {
        if self.secret_match(previous) != SecretMatch::Matches {
            println!("token_probe=skipped reason=forced TOKEN_SECRET rotation");
            return Ok(());
        }
        let token = self.probe_token()?;
        let answer = self
            .docker
            .exec_with_env(
                candidate,
                &[(PROBE_ENV, token.as_str())],
                &["bun", "-e", PROBE_SCRIPT],
            )
            .map_err(|error| format!("token probe could not reach {candidate}: {error}"))?;
        let status = answer
            .lines()
            .last()
            .and_then(|line| line.trim().parse::<u16>().ok())
            .ok_or_else(|| format!("token probe returned no HTTP status from {candidate}"))?;
        if !probe_accepted(status) {
            return Err(format!(
                "{candidate} rejected a token signed with the running deployment's secret (HTTP {status}); issued client tokens would stop working"
            ));
        }
        println!("token_probe=accepted status={status}");
        Ok(())
    }

    pub(super) fn probe_token(&self) -> Result<String, String> {
        let now = chrono::Utc::now().timestamp();
        let claims = link_assistant_router::token::TokenClaims {
            sub: format!("deploy-probe-{}", uuid::Uuid::new_v4().simple()),
            iat: now,
            exp: now + 300,
            label: "deploy-probe".to_string(),
            scope: String::new(),
            github_repos: Vec::new(),
            client_kind: None,
            principal_id: None,
        };
        let jwt = jsonwebtoken::encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.token_secret.as_bytes()),
        )
        .map_err(|error| format!("could not sign the token probe: {error}"))?;
        Ok(format!(
            "{}{jwt}",
            link_assistant_router::token::TOKEN_PREFIX
        ))
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    /// RFC 4231, test case 2.
    #[test]
    fn hmac_matches_the_published_vector() {
        assert_eq!(
            hex::encode(hmac_sha256(b"Jefe", b"what do ya want for nothing?")),
            "5bdcc146bf60754e6a042426089575c75a003f089d2739839dec58b964ec3843"
        );
    }

    #[test]
    fn a_fingerprint_distinguishes_secrets_without_containing_them() {
        let first = fingerprint("secret-a");
        assert_eq!(first, fingerprint("secret-a"));
        assert_ne!(first, fingerprint("secret-b"));
        assert!(first.starts_with("hmac-sha256:"));
        assert_eq!(first.len(), "hmac-sha256:".len() + 32);
        assert!(!first.contains("secret-a"));
    }

    #[test]
    fn only_a_rejected_signature_or_a_failure_fails_the_probe() {
        assert!(probe_accepted(200));
        assert!(probe_accepted(403));
        assert!(!probe_accepted(401));
        assert!(!probe_accepted(500));
        assert!(!probe_accepted(503));
    }
}
