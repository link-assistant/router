//! Heartbeat for a live `router with` process.

use std::time::Duration;

use super::RunCredential;

const HEARTBEAT_INTERVAL: Duration = Duration::from_secs(30);

pub(super) struct Lease {
    url: String,
    client: reqwest::Client,
}

impl Lease {
    pub(super) fn new(base_url: &str, client: reqwest::Client) -> Self {
        Self {
            url: format!(
                "{}{}",
                base_url.trim_end_matches('/'),
                crate::route_contract::route_template(crate::route_contract::RouteId::RunLease)
            ),
            client,
        }
    }
}

pub struct Guard(tokio::task::JoinHandle<()>);

impl Drop for Guard {
    fn drop(&mut self) {
        self.0.abort();
    }
}

/// What one heartbeat answer means for the wrapper (issue #644).
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub(super) enum Beat {
    /// The lease was renewed.
    Renewed,
    /// The server predates the run-lease endpoint (a rollback to an older
    /// release answers 404/405). The run's token is still valid until its
    /// own expiry, so heartbeating stops quietly instead of warning forever.
    Unsupported,
    /// The server no longer accepts this run's token: its record is missing,
    /// revoked or expired, or the issuer secret changed.
    Rejected,
    /// The token is accepted but the lease cannot be renewed.
    Refused,
    /// A transient failure; try again on the next beat.
    Transient,
}

impl Beat {
    pub(super) const fn classify(status: reqwest::StatusCode) -> Self {
        match status.as_u16() {
            200..=299 => Self::Renewed,
            404 | 405 => Self::Unsupported,
            401 | 403 => Self::Rejected,
            409 => Self::Refused,
            _ => Self::Transient,
        }
    }

    const fn reason(self) -> &'static str {
        match self {
            Self::Renewed => "renewed",
            Self::Unsupported => crate::auth_diagnostics::reason::UNSUPPORTED_LEASE_ENDPOINT,
            Self::Rejected => "token_rejected",
            Self::Refused => crate::auth_diagnostics::reason::RUN_LEASE_UNRENEWABLE,
            Self::Transient => "transient",
        }
    }
}

pub fn start(credential: &RunCredential) -> Option<Guard> {
    let lease = credential.run_lease.as_ref()?;
    let url = lease.url.clone();
    let client = lease.client.clone();
    let token = credential.token.clone();
    Some(Guard(tokio::spawn(async move {
        let mut last = Beat::Renewed;
        loop {
            tokio::time::sleep(HEARTBEAT_INTERVAL).await;
            let beat = match client
                .post(&url)
                .bearer_auth(&token)
                .timeout(Duration::from_secs(10))
                .send()
                .await
            {
                Ok(response) => Beat::classify(response.status()),
                Err(error) => {
                    tracing::debug!(error = %error, "wrapper run lease heartbeat could not reach Router");
                    Beat::Transient
                }
            };
            // Warn when the outcome changes, not on every beat.
            if beat != last {
                match beat {
                    Beat::Renewed => tracing::info!("wrapper run lease heartbeat recovered"),
                    Beat::Unsupported => tracing::warn!(
                        reason = beat.reason(),
                        "Router does not serve the run lease endpoint (an older release, e.g. \
                         after a rollback); the run continues on its token's own expiry"
                    ),
                    _ => tracing::warn!(
                        reason = beat.reason(),
                        "wrapper run lease heartbeat was not renewed; see \
                         GET /api/management/auth/diagnostics on the Router"
                    ),
                }
                last = beat;
            }
            if beat == Beat::Unsupported {
                return;
            }
        }
    })))
}

#[cfg(test)]
mod tests {
    use super::Beat;
    use reqwest::StatusCode;

    #[test]
    fn a_legacy_server_without_the_endpoint_is_unsupported_not_an_auth_failure() {
        assert_eq!(Beat::classify(StatusCode::NOT_FOUND), Beat::Unsupported);
        assert_eq!(
            Beat::classify(StatusCode::METHOD_NOT_ALLOWED),
            Beat::Unsupported
        );
        assert_eq!(Beat::classify(StatusCode::OK), Beat::Renewed);
        assert_eq!(Beat::classify(StatusCode::UNAUTHORIZED), Beat::Rejected);
        assert_eq!(Beat::classify(StatusCode::CONFLICT), Beat::Refused);
        assert_eq!(Beat::classify(StatusCode::BAD_GATEWAY), Beat::Transient);
        assert_eq!(
            Beat::Unsupported.reason(),
            crate::auth_diagnostics::reason::UNSUPPORTED_LEASE_ENDPOINT
        );
    }
}
