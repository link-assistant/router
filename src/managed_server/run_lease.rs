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

pub(crate) struct Guard(tokio::task::JoinHandle<()>);

impl Drop for Guard {
    fn drop(&mut self) {
        self.0.abort();
    }
}

pub(crate) fn start(credential: &RunCredential) -> Option<Guard> {
    let lease = credential.run_lease.as_ref()?;
    let url = lease.url.clone();
    let client = lease.client.clone();
    let token = credential.token.clone();
    Some(Guard(tokio::spawn(async move {
        loop {
            tokio::time::sleep(HEARTBEAT_INTERVAL).await;
            match client
                .post(&url)
                .bearer_auth(&token)
                .timeout(Duration::from_secs(10))
                .send()
                .await
            {
                Ok(response) if response.status().is_success() => {}
                Ok(response) => tracing::warn!(
                    status = %response.status(),
                    "wrapper run lease heartbeat was refused"
                ),
                Err(error) => tracing::warn!(
                    error = %error,
                    "wrapper run lease heartbeat could not reach Router"
                ),
            }
        }
    })))
}
