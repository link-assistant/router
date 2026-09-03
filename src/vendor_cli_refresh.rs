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
/// The cheapest thing that still forces a refresh: one word through the
/// client's own current default. The Router deliberately does not compile a
/// commercial model name into this recovery path; the authenticated live
/// catalog and client decide what remains available (issue #192).
///
/// ## Why not `claude auth status`
///
/// Newer clients expose `claude auth status`, which looks strictly better —
/// it bills no inference and does not depend on a model name staying valid.
/// Testing with an expired credential showed the following behavior (issue #275):
///
/// | probe | result | credential file |
/// | --- | --- | --- |
/// | `claude auth status` | `{"loggedIn": true, …}`, exit 0 | unchanged |
/// | `-p ok` | `OAuth session expired and could not be refreshed` | removed |
///
/// `auth status` reported the expired credential as logged in, and the
/// account-derived fields (`email`, `orgId`, `subscriptionType`) all came back
/// `null` — it answers from local state without reaching the account. It
/// therefore cannot force a refresh, and adopting it would have disabled this
/// rung while appearing to make it cheaper.
///
/// Measured on claude 2.1.239. Re-measure before changing it, the same way:
/// point the client at a *copy* of an expired credential and compare the file
/// before and after.
const CLAUDE_PROBE: &[&str] = &["-p", "ok"];

/// Probe that makes the Codex CLI exercise its credential.
///
/// `codex exec` is the non-interactive form, and one word is the same bargain
/// the Claude probe strikes. `codex login status` was not chosen for the reason
/// recorded above: a status command that answers from local state cannot force
/// the rotation this rung exists to trigger.
///
/// Measured on codex-cli 0.148.0 against a credential with ~92h remaining: the
/// probe reached the account (it came back with a usage-limit answer, which
/// only a server that authenticated the request can give) and left the
/// unexpired credential alone, which is the correct behaviour for a chain that
/// is not due to rotate. `--skip-git-repo-check` matters because the router
/// runs this from wherever it happens to live, which need not be a repository.
const CODEX_PROBE: &[&str] = &["exec", "--skip-git-repo-check", "ok"];

/// Environment variable overriding the probe arguments, whitespace separated.
///
/// Applies to every provider. A deployment running two vendor clients can
/// override them independently with the per-provider form below, which is
/// checked first.
pub const PROBE_ARGS_ENV: &str = "ROUTER_VENDOR_REFRESH_ARGS";

/// The per-provider override, e.g. `ROUTER_VENDOR_REFRESH_ARGS_CODEX`.
///
/// The global form cannot express "one probe for Claude, another for Codex",
/// and a deployment with both would otherwise have to accept one client
/// running the other's command line.
#[must_use]
pub fn probe_args_env_for(provider: SubscriptionProvider) -> String {
    format!("{PROBE_ARGS_ENV}_{}", provider.as_str().to_uppercase())
}

/// The probe that exercises a provider's credential, when one is known.
#[must_use]
pub const fn probe_for(provider: SubscriptionProvider) -> Option<&'static [&'static str]> {
    match provider {
        SubscriptionProvider::Claude => Some(CLAUDE_PROBE),
        SubscriptionProvider::Codex => Some(CODEX_PROBE),
        // Gemini and Qwen have no vendor rung yet; a stored GitHub token does
        // not rotate on a chain at all, so it has nothing to recover here.
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => None,
    }
}

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
        Self::new(SubscriptionProvider::Claude, binary, home)
    }

    /// A Codex client rooted at `home`.
    ///
    /// The recovery argument is the same one that justified the Claude rung: a
    /// Codex credential is an OAuth chain with the same single-use rotation,
    /// held by a vendor client that carries attestation the router can only
    /// imitate (issue #275).
    #[must_use]
    pub fn codex(binary: impl Into<PathBuf>, home: impl Into<PathBuf>) -> Self {
        Self::new(SubscriptionProvider::Codex, binary, home)
    }

    /// A client for `provider`, when one is known for it.
    ///
    /// Returns `None` for a provider with no probe here, rather than guessing
    /// at a command line: running the wrong arguments against a vendor binary
    /// is a side effect, not a failed lookup.
    #[must_use]
    pub fn for_provider(
        provider: SubscriptionProvider,
        binary: impl Into<PathBuf>,
        home: impl Into<PathBuf>,
    ) -> Option<Self> {
        probe_for(provider)?;
        Some(Self::new(provider, binary, home))
    }

    fn new(
        provider: SubscriptionProvider,
        binary: impl Into<PathBuf>,
        home: impl Into<PathBuf>,
    ) -> Self {
        Self {
            provider,
            binary: binary.into(),
            home: home.into(),
            probe: probe_for(provider).unwrap_or(CLAUDE_PROBE),
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
        // Most specific first: a per-provider override beats the global one,
        // which beats the built-in probe.
        std::env::var(probe_args_env_for(self.provider))
            .ok()
            .or_else(|| std::env::var(PROBE_ARGS_ENV).ok())
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
            "{provider} credential recovery: asking the vendor client to rotate the chain — {} {}",
            self.binary.display(),
            args.join(" ")
        );

        let mut command = tokio::process::Command::new(&self.binary);
        if provider == SubscriptionProvider::Claude {
            // Claude Code reads its home from either name depending on version;
            // scoped to Claude so a Codex run is not handed a Claude variable.
            command.env("CLAUDE_CONFIG_DIR", &self.home);
            // `--debug-file` is Claude Code's flag. `codex` rejects it outright
            // with "unexpected argument", which would make the probe fail
            // before it ever reached the credential — so it is passed only to
            // the client that has it.
            command.arg("--debug-file").arg(&debug_log);
        }
        command
            .args(&args)
            .env(provider.home_env(), &self.home)
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

        let rotated = store.try_reload().ok().flatten()?;
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
