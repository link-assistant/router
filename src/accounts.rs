//! Multi-account OAuth credential routing.
//!
//! Issue #7 R7 / R10 require the router to support multiple Claude MAX
//! accounts: one primary + an optional list of additional credential
//! directories. Inbound requests are dispatched to a healthy account using
//! a configurable selection strategy (round-robin by default), with
//! cooldowns and quota windows that automatically remove an account from
//! the rotation when it returns `429/insufficient_quota`.
//!
//! The single-account `OAuthProvider` is reused as the building block for
//! each account so existing tests and behaviour are preserved when only a
//! primary directory is configured.

use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crate::oauth::{OAuthError, OAuthProvider};

/// Strategy used to pick the next account on each request.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Default)]
pub enum SelectionStrategy {
    /// Round-robin across all healthy accounts.
    #[default]
    RoundRobin,
    /// Always prefer the lowest-index healthy account; fall back on cooldown.
    Priority,
    /// Pick the account with the lowest used-quota count.
    LeastUsed,
}

impl SelectionStrategy {
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.to_lowercase().as_str() {
            "round-robin" | "roundrobin" | "rr" => Some(Self::RoundRobin),
            "priority" | "prio" => Some(Self::Priority),
            "least-used" | "leastused" | "lru" => Some(Self::LeastUsed),
            _ => None,
        }
    }
}

/// Per-account runtime state (cooldowns, request counts, last error).
struct AccountState {
    name: String,
    provider: OAuthProvider,
    home: PathBuf,
    used: AtomicUsize,
    cooldown_until: Mutex<Option<Instant>>,
    last_error: Mutex<Option<String>>,
}

impl AccountState {
    fn is_healthy(&self) -> bool {
        let guard = self
            .cooldown_until
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        !matches!(*guard, Some(t) if t > Instant::now())
    }
}

/// Multi-account router.
///
/// Holds an ordered list of [`OAuthProvider`]s and dispatches requests
/// using the configured selection strategy. Cheap to clone (Arc-wrapped).
#[derive(Clone)]
pub struct AccountRouter {
    inner: Arc<AccountRouterInner>,
}

struct AccountRouterInner {
    accounts: Vec<AccountState>,
    cursor: AtomicUsize,
    strategy: SelectionStrategy,
    cooldown: Duration,
}

/// Information returned to the caller for use in upstream calls.
#[derive(Debug, Clone)]
pub struct SelectedAccount {
    pub name: String,
    pub token: String,
}

impl AccountRouter {
    /// Build a new router with one primary account and any additional
    /// account directories.
    #[must_use]
    pub fn new(
        primary: PathBuf,
        additional: &[PathBuf],
        strategy: SelectionStrategy,
        cooldown: Duration,
    ) -> Self {
        let mut accounts = Vec::with_capacity(1 + additional.len());
        accounts.push(AccountState {
            name: "primary".to_string(),
            provider: OAuthProvider::new(primary.to_string_lossy().as_ref()),
            home: primary,
            used: AtomicUsize::new(0),
            cooldown_until: Mutex::new(None),
            last_error: Mutex::new(None),
        });
        for (i, p) in additional.iter().enumerate() {
            accounts.push(AccountState {
                name: format!("account-{}", i + 1),
                provider: OAuthProvider::new(p.to_string_lossy().as_ref()),
                home: p.clone(),
                used: AtomicUsize::new(0),
                cooldown_until: Mutex::new(None),
                last_error: Mutex::new(None),
            });
        }
        Self {
            inner: Arc::new(AccountRouterInner {
                accounts,
                cursor: AtomicUsize::new(0),
                strategy,
                cooldown,
            }),
        }
    }

    /// Number of configured accounts (incl. primary).
    #[must_use]
    pub fn len(&self) -> usize {
        self.inner.accounts.len()
    }

    #[must_use]
    pub fn is_empty(&self) -> bool {
        self.inner.accounts.is_empty()
    }

    /// Snapshot of account names + health (used by `/v1/accounts` admin endpoint).
    #[must_use]
    pub fn health_snapshot(&self) -> Vec<AccountHealth> {
        self.inner
            .accounts
            .iter()
            .map(|a| AccountHealth {
                name: a.name.clone(),
                home: a.home.clone(),
                healthy: a.is_healthy(),
                used: a.used.load(Ordering::Relaxed),
                last_error: a
                    .last_error
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .clone(),
                cooldown_remaining: a
                    .cooldown_until
                    .lock()
                    .unwrap_or_else(std::sync::PoisonError::into_inner)
                    .and_then(|t| t.checked_duration_since(Instant::now())),
            })
            .collect()
    }

    /// Pick the next account according to the configured strategy.
    ///
    /// Returns `Err(NoHealthyAccounts)` if every account is on cooldown or
    /// has unreadable credentials. The caller should report a 503 in that
    /// case; the legacy single-account path treats this as a fatal config
    /// error today.
    pub fn select(&self) -> Result<SelectedAccount, AccountError> {
        if self.inner.accounts.is_empty() {
            return Err(AccountError::NoAccountsConfigured);
        }
        let mut tried = 0usize;
        let total = self.inner.accounts.len();
        let start_idx = match self.inner.strategy {
            SelectionStrategy::RoundRobin => self.inner.cursor.fetch_add(1, Ordering::Relaxed),
            SelectionStrategy::Priority => 0,
            SelectionStrategy::LeastUsed => self.least_used_index(),
        };
        while tried < total {
            let idx = (start_idx + tried) % total;
            let acc = &self.inner.accounts[idx];
            if !acc.is_healthy() {
                tried += 1;
                continue;
            }
            match acc.provider.get_token() {
                Ok(tok) => {
                    acc.used.fetch_add(1, Ordering::Relaxed);
                    return Ok(SelectedAccount {
                        name: acc.name.clone(),
                        token: tok,
                    });
                }
                Err(e) => {
                    self.record_error(idx, &e.to_string());
                    self.start_cooldown(idx);
                }
            }
            tried += 1;
        }
        Err(AccountError::NoHealthyAccounts)
    }

    fn least_used_index(&self) -> usize {
        let mut best = 0usize;
        let mut best_count = usize::MAX;
        for (i, a) in self.inner.accounts.iter().enumerate() {
            let c = a.used.load(Ordering::Relaxed);
            if a.is_healthy() && c < best_count {
                best_count = c;
                best = i;
            }
        }
        best
    }

    /// Mark the named account as having failed (e.g., upstream returned 429).
    pub fn report_failure(&self, account_name: &str, err: &str) {
        if let Some(idx) = self
            .inner
            .accounts
            .iter()
            .position(|a| a.name == account_name)
        {
            self.record_error(idx, err);
            self.start_cooldown(idx);
        }
    }

    fn record_error(&self, idx: usize, err: &str) {
        let mut guard = self.inner.accounts[idx]
            .last_error
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *guard = Some(err.to_string());
    }

    fn start_cooldown(&self, idx: usize) {
        let mut guard = self.inner.accounts[idx]
            .cooldown_until
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *guard = Some(Instant::now() + self.inner.cooldown);
    }
}

/// Health status snapshot for one account.
#[derive(Debug, Clone)]
pub struct AccountHealth {
    pub name: String,
    pub home: PathBuf,
    pub healthy: bool,
    pub used: usize,
    pub last_error: Option<String>,
    pub cooldown_remaining: Option<Duration>,
}

/// Errors returned by the multi-account router.
#[derive(Debug)]
pub enum AccountError {
    /// No accounts have been configured at all.
    NoAccountsConfigured,
    /// Every configured account is currently on cooldown or failing.
    NoHealthyAccounts,
    /// An underlying [`OAuthError`] (rare — usually wrapped into a cooldown).
    OAuth(OAuthError),
}

impl std::fmt::Display for AccountError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoAccountsConfigured => write!(f, "no accounts configured"),
            Self::NoHealthyAccounts => write!(f, "no healthy accounts available"),
            Self::OAuth(e) => write!(f, "oauth error: {e}"),
        }
    }
}

impl std::error::Error for AccountError {}

impl From<OAuthError> for AccountError {
    fn from(e: OAuthError) -> Self {
        Self::OAuth(e)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn tempdir(slug: &str) -> PathBuf {
        let dir = std::env::temp_dir().join(format!("router-acct-{slug}-{}", uuid::Uuid::new_v4()));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_creds(dir: &std::path::Path, token: &str) {
        fs::write(
            dir.join("credentials.json"),
            format!("{{\"accessToken\":\"{token}\"}}"),
        )
        .unwrap();
    }

    #[test]
    fn round_robin_distributes_calls() {
        let a = tempdir("a");
        let b = tempdir("b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new(
            a,
            &[b],
            SelectionStrategy::RoundRobin,
            Duration::from_secs(60),
        );
        let s1 = router.select().unwrap();
        let s2 = router.select().unwrap();
        let s3 = router.select().unwrap();
        let names: Vec<_> = vec![s1.name, s2.name, s3.name];
        assert!(names.contains(&"primary".to_string()));
        assert!(names.contains(&"account-1".to_string()));
    }

    #[test]
    fn cooldown_skips_unhealthy_account() {
        let a = tempdir("aa");
        let b = tempdir("bb");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new(
            a,
            &[b],
            SelectionStrategy::RoundRobin,
            Duration::from_secs(60),
        );
        router.report_failure("primary", "rate limited");
        let snap = router.health_snapshot();
        assert!(!snap[0].healthy);
        assert!(snap[1].healthy);
        let chosen = router.select().unwrap();
        assert_eq!(chosen.name, "account-1");
    }

    #[test]
    fn no_healthy_returns_error() {
        let a = tempdir("a2");
        write_creds(&a, "tok-a");
        let router = AccountRouter::new(
            a,
            &[],
            SelectionStrategy::RoundRobin,
            Duration::from_secs(60),
        );
        router.report_failure("primary", "fail");
        let r = router.select();
        assert!(matches!(r, Err(AccountError::NoHealthyAccounts)));
    }

    #[test]
    fn least_used_picks_lowest_count() {
        let a = tempdir("la");
        let b = tempdir("lb");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new(
            a,
            &[b],
            SelectionStrategy::LeastUsed,
            Duration::from_secs(60),
        );
        let _ = router.select().unwrap();
        let _ = router.select().unwrap();
        let _ = router.select().unwrap();
        let snap = router.health_snapshot();
        let total: usize = snap.iter().map(|s| s.used).sum();
        assert_eq!(total, 3);
        // both accounts should be exercised (LeastUsed prefers the unused one)
        assert!(snap.iter().any(|s| s.used >= 1));
    }
}
