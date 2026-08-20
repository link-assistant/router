//! Last rung of the recovery ladder: let the vendor's own CLI rotate the chain.
//!
//! When every direct exchange has been rejected, one possibility remains before
//! asking an operator to re-authenticate: the vendor's own client may still be
//! able to redeem the credential — it holds attestation details the router can
//! only imitate, and on macOS it may hold a copy of the credential the router
//! cannot see at all. Running it and re-reading the store costs one cheap
//! request and recovers the whole subscription (issue #239).
//!
//! Running a vendor binary is a side effect an operator must ask for, so this
//! rung is inert unless a CLI binary is configured (`--claude-cli-bin` /
//! `CLAUDE_CLI_BIN`).
//!
//! ## What is recorded
//!
//! These OAuth endpoints are undocumented and change; the fallback is only
//! worth having if it also *teaches* us the current protocol. So a run records
//! the invocation, the vendor client's own debug log (which redacts its
//! secrets before we ever see them), every `/v1/oauth/token` line that log
//! contains, and which chain link was in the store before and after.
//!
//! Secrets are never written: chain links appear as short digests, and the
//! router's own exchange is journalled by field and header *name* elsewhere in
//! [`crate::refresh`]. What the vendor client sends inside TLS is not visible
//! without an intercepting proxy, which this rung deliberately does not set up
//! — it records what the client itself reports.

use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::credential_store::CredentialStore;
use crate::subscription::{SubscriptionProvider, SubscriptionToken};

/// How long the vendor client may run before it is given up on.
const DEFAULT_TIMEOUT: Duration = Duration::from_secs(90);

/// Probe that makes the Claude CLI exercise its credential.
///
/// The cheapest thing that still forces a refresh: one word to the smallest
/// model. Overridable because the vendor's command surface changes between
/// releases and an operator should not need a router release to follow it.
const CLAUDE_PROBE: &[&str] = &["-p", "ok", "--model", "claude-haiku-4-5"];

/// Environment variable overriding the probe arguments, whitespace separated.
pub const PROBE_ARGS_ENV: &str = "ROUTER_VENDOR_REFRESH_ARGS";

/// A configured vendor client that can rotate a credential the router cannot.
#[derive(Debug, Clone)]
pub struct VendorCli {
    provider: SubscriptionProvider,
    binary: PathBuf,
    /// Credential home the client is pointed at, so it rotates the same
    /// credential the router reads rather than the invoking user's own.
    home: PathBuf,
    /// What to run so the client exercises — and thereby refreshes — its
    /// credential. Per client, because no two vendors spell it the same way.
    probe: &'static [&'static str],
    timeout: Duration,
}

impl VendorCli {
    /// A Claude client rooted at `home`.
    #[must_use]
    pub fn claude(binary: impl Into<PathBuf>, home: impl Into<PathBuf>) -> Self {
        Self {
            provider: SubscriptionProvider::Claude,
            binary: binary.into(),
            home: home.into(),
            probe: CLAUDE_PROBE,
            timeout: DEFAULT_TIMEOUT,
        }
    }

    /// Which subscription this client serves.
    #[must_use]
    pub const fn provider(&self) -> SubscriptionProvider {
        self.provider
    }

    /// Wait at most `timeout` for the client.
    #[must_use]
    pub const fn with_timeout(mut self, timeout: Duration) -> Self {
        self.timeout = timeout;
        self
    }

    fn probe_args(&self) -> Vec<String> {
        std::env::var(PROBE_ARGS_ENV)
            .ok()
            .filter(|value| !value.trim().is_empty())
            .map_or_else(
                || self.probe.iter().map(|arg| (*arg).to_string()).collect(),
                |value| value.split_whitespace().map(str::to_string).collect(),
            )
    }

    /// Run the vendor client and return the credential it left behind, when it
    /// is a newer chain link than `spent`.
    ///
    /// Returns `None` whenever the client cannot be run, times out, or leaves
    /// the store unchanged — the caller then reports the original rejection,
    /// which stays the honest answer.
    pub async fn rotate(
        &self,
        store: &dyn CredentialStore,
        spent: &SubscriptionToken,
    ) -> Option<SubscriptionToken> {
        let debug_log = self
            .home
            .join(format!("router-refresh-{}.debug.log", std::process::id()));
        let args = self.probe_args();
        let provider = self.provider;
        tracing::info!(
            "{provider} credential recovery: asking the vendor client to rotate the chain — {} \
             --debug-file {} {}",
            self.binary.display(),
            debug_log.display(),
            args.join(" ")
        );

        let mut command = tokio::process::Command::new(&self.binary);
        command
            .arg("--debug-file")
            .arg(&debug_log)
            .args(&args)
            .env(provider.home_env(), &self.home)
            .env("CLAUDE_CONFIG_DIR", &self.home)
            .stdin(std::process::Stdio::null())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped());

        let started = std::time::Instant::now();
        let outcome = match tokio::time::timeout(self.timeout, command.output()).await {
            Ok(Ok(output)) => output,
            Ok(Err(error)) => {
                tracing::warn!(
                    "the {provider} vendor client at {} could not be run: {error}",
                    self.binary.display()
                );
                return None;
            }
            Err(_) => {
                tracing::warn!(
                    "the {provider} vendor client did not finish within {:?}; the credential was \
                     left as it was",
                    self.timeout
                );
                return None;
            }
        };
        let elapsed = started.elapsed();
        journal_debug_log(provider, &debug_log);
        if !outcome.status.success() {
            tracing::warn!(
                "the {provider} vendor client exited with {} after {elapsed:?}",
                outcome.status
            );
        }

        let rotated = store.reload()?;
        let before = link_digest(spent);
        let after = link_digest(&rotated);
        if before == after {
            tracing::warn!(
                "the {provider} vendor client left chain link {before} in {} unchanged after \
                 {elapsed:?}; nothing was recovered",
                store.describe()
            );
            return None;
        }
        tracing::info!(
            "the {provider} vendor client rotated {} from chain link {before} to {after} in \
             {elapsed:?}",
            store.describe()
        );
        Some(rotated)
    }
}

/// Copy what the vendor client reported about its own token exchange.
///
/// The client redacts its secrets before writing this file, so the lines can be
/// kept and attached to a report as they are. Only lines that mention the token
/// endpoint are copied: the rest of the log is about the client's session, not
/// the protocol we are trying to learn.
fn journal_debug_log(provider: SubscriptionProvider, path: &Path) {
    let Ok(contents) = std::fs::read_to_string(path) else {
        tracing::debug!(
            "the {provider} vendor client wrote no debug log at {}",
            path.display()
        );
        return;
    };
    let lines: Vec<&str> = contents
        .lines()
        .filter(|line| line.contains("oauth/token") || line.contains("refresh_token"))
        .collect();
    if lines.is_empty() {
        tracing::debug!(
            "the {provider} vendor client's debug log at {} says nothing about its token \
             exchange ({} lines); capturing it needs an intercepting proxy",
            path.display(),
            contents.lines().count()
        );
        return;
    }
    tracing::info!(
        "the {provider} vendor client's token exchange, as its own debug log reports it:\n{}",
        lines.join("\n")
    );
}

/// A short, non-reversible name for a chain link.
///
/// Enough to say "the link changed" and to correlate two log lines; not enough
/// to reconstruct the token. A refresh token is high-entropy, so a truncated
/// SHA-256 cannot be walked back to it.
#[must_use]
pub fn link_digest(token: &SubscriptionToken) -> String {
    use sha2::Digest as _;
    let Some(refresh) = token.refresh_token.as_deref() else {
        return String::from("none");
    };
    let digest = sha2::Sha256::digest(refresh.as_bytes());
    hex::encode(&digest[..4])
}

#[cfg(test)]
#[path = "vendor_cli_refresh_tests.rs"]
mod tests;
