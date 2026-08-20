//! Multi-account OAuth credential routing.
//!
//! A pool contains one primary subscription plus optional additional
//! credential directories for Claude, Codex, Gemini, or Qwen. New sessions
//! use a configurable selection strategy; existing sessions stay on their
//! selected account. Typed quota failures and configured request caps remove
//! accounts from automatic selection without silently moving pinned work.

use std::cmp::Ordering as CmpOrdering;
use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

use crate::subscription::{SubscriptionProvider, SubscriptionReader, SubscriptionToken};

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
        match s.trim().to_lowercase().as_str() {
            "round-robin" | "roundrobin" | "rr" => Some(Self::RoundRobin),
            "priority" | "prio" | "fill-first" | "fillfirst" => Some(Self::Priority),
            "least-used" | "leastused" | "least-utilized" | "quota-first" | "lru" => {
                Some(Self::LeastUsed)
            }
            _ => None,
        }
    }
}

/// Tunable multi-account behavior.
#[derive(Debug, Clone)]
pub struct AccountRouterOptions {
    /// Account selection policy for new sessions.
    pub strategy: SelectionStrategy,
    /// Default cooldown after an upstream quota failure.
    pub cooldown: Duration,
    /// How long an inactive session remains bound to its account. Zero disables
    /// session affinity.
    pub session_affinity_ttl: Duration,
    /// Optional request cap for each account, ordered primary then additional.
    pub request_limits: Vec<Option<usize>>,
}

impl Default for AccountRouterOptions {
    fn default() -> Self {
        Self {
            strategy: SelectionStrategy::default(),
            cooldown: Duration::from_secs(60),
            session_affinity_ttl: Duration::from_secs(60 * 60),
            request_limits: Vec::new(),
        }
    }
}

/// Stable routing signals copied from an inbound request.
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct RoutingContext {
    /// Conversation/session identifier detected from headers or JSON metadata.
    pub session_key: Option<String>,
    /// Explicit account selected by the router-issued caller token.
    pub pinned_account: Option<String>,
}

impl RoutingContext {
    /// Build a context containing only a session binding.
    #[must_use]
    pub fn for_session(session: impl Into<String>) -> Self {
        Self {
            session_key: Some(session.into()),
            pinned_account: None,
        }
    }

    /// Build a context containing an explicit, strict account pin.
    #[must_use]
    pub fn pinned(account: impl Into<String>) -> Self {
        Self {
            session_key: None,
            pinned_account: Some(account.into()),
        }
    }
}

/// Per-account runtime state (cooldowns, request counts, last error).
struct AccountState {
    name: String,
    reader: SubscriptionReader,
    home: PathBuf,
    used: AtomicUsize,
    request_limit: Option<usize>,
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

    fn is_available(&self) -> bool {
        self.is_healthy()
            && self
                .request_limit
                .is_none_or(|limit| self.used.load(Ordering::Relaxed) < limit)
    }

    fn try_record_use(&self) -> bool {
        let mut used = self.used.load(Ordering::Relaxed);
        loop {
            if self.request_limit.is_some_and(|limit| used >= limit) {
                return false;
            }
            match self.used.compare_exchange_weak(
                used,
                used.saturating_add(1),
                Ordering::Relaxed,
                Ordering::Relaxed,
            ) {
                Ok(_) => return true,
                Err(actual) => used = actual,
            }
        }
    }
}

#[derive(Debug, Clone)]
struct AffinityBinding {
    account_index: usize,
    expires_at: Instant,
}

/// Multi-account router.
///
/// Holds an ordered list of vendor subscription readers and dispatches
/// requests using the configured selection strategy. Cheap to clone.
#[derive(Clone)]
pub struct AccountRouter {
    inner: Arc<AccountRouterInner>,
}

struct AccountRouterInner {
    accounts: Vec<AccountState>,
    cursor: AtomicUsize,
    provider: SubscriptionProvider,
    strategy: SelectionStrategy,
    cooldown: Duration,
    session_affinity_ttl: Duration,
    affinities: Mutex<HashMap<String, AffinityBinding>>,
}

/// Information returned to the caller for use in upstream calls.
#[derive(Debug, Clone)]
pub struct SelectedAccount {
    pub name: String,
    pub token: String,
}

/// A normalized vendor subscription token and its selected account.
#[derive(Debug, Clone)]
pub struct SelectedSubscriptionAccount {
    pub name: String,
    pub token: SubscriptionToken,
}

#[derive(Debug, Clone, Copy)]
enum SelectionMode {
    Automatic,
    Pinned,
    Session,
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
        Self::new_for_provider(
            primary,
            additional,
            SubscriptionProvider::Claude,
            AccountRouterOptions {
                strategy,
                cooldown,
                ..AccountRouterOptions::default()
            },
        )
    }

    /// Build a router for any supported vendor subscription.
    #[must_use]
    pub fn new_for_provider(
        primary: PathBuf,
        additional: &[PathBuf],
        provider: SubscriptionProvider,
        options: AccountRouterOptions,
    ) -> Self {
        let AccountRouterOptions {
            strategy,
            cooldown,
            session_affinity_ttl,
            request_limits,
        } = options;
        let mut accounts = Vec::with_capacity(1 + additional.len());
        let request_limit = |index: usize| request_limits.get(index).copied().flatten();
        accounts.push(AccountState {
            name: "primary".to_string(),
            reader: SubscriptionReader::new(provider, &primary),
            home: primary,
            used: AtomicUsize::new(0),
            request_limit: request_limit(0),
            cooldown_until: Mutex::new(None),
            last_error: Mutex::new(None),
        });
        for (i, p) in additional.iter().enumerate() {
            accounts.push(AccountState {
                name: format!("account-{}", i + 1),
                reader: SubscriptionReader::new(provider, p),
                home: p.clone(),
                used: AtomicUsize::new(0),
                request_limit: request_limit(i + 1),
                cooldown_until: Mutex::new(None),
                last_error: Mutex::new(None),
            });
        }
        Self {
            inner: Arc::new(AccountRouterInner {
                accounts,
                cursor: AtomicUsize::new(0),
                provider,
                strategy,
                cooldown,
                session_affinity_ttl,
                affinities: Mutex::new(HashMap::new()),
            }),
        }
    }

    /// Provider whose credential layout is used by every account in the pool.
    #[must_use]
    pub fn provider(&self) -> SubscriptionProvider {
        self.inner.provider
    }

    /// Tell the shared token cache where each account's credential lives.
    ///
    /// A pooled account refreshes on the serving path, so without this its
    /// rotated refresh token would stay in memory and be lost at restart, and a
    /// rejection could not be checked against the newest credential on disk
    /// (issue #239).
    pub fn register_credential_stores(&self, cache: &crate::refresh::TokenCache) {
        for account in &self.inner.accounts {
            cache.register_reader(&account.name, &account.reader);
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
                healthy: a.is_available(),
                used: a.used.load(Ordering::Relaxed),
                request_limit: a.request_limit,
                remaining_requests: a
                    .request_limit
                    .map(|limit| limit.saturating_sub(a.used.load(Ordering::Relaxed))),
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
        self.select_with_context(&RoutingContext::default())
    }

    /// Select a Claude-compatible access token using explicit/session routing.
    pub fn select_with_context(
        &self,
        context: &RoutingContext,
    ) -> Result<SelectedAccount, AccountError> {
        let selected = self.select_subscription(context)?;
        Ok(SelectedAccount {
            name: selected.name,
            token: selected.token.access_token,
        })
    }

    /// Select and normalize a credential for the pool's vendor provider.
    pub fn select_subscription(
        &self,
        context: &RoutingContext,
    ) -> Result<SelectedSubscriptionAccount, AccountError> {
        let (indices, mode) = self.selection_plan(context)?;
        for idx in indices {
            let account = &self.inner.accounts[idx];
            if !account.is_available() {
                if !matches!(mode, SelectionMode::Automatic) {
                    return Err(Self::unavailable_error(mode, &account.name));
                }
                continue;
            }
            match account.reader.read_token() {
                Ok(token) if account.try_record_use() => {
                    self.bind_session(context, idx);
                    return Ok(SelectedSubscriptionAccount {
                        name: account.name.clone(),
                        token,
                    });
                }
                Ok(_) => {
                    if !matches!(mode, SelectionMode::Automatic) {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
                Err(error) => {
                    self.record_error(idx, &error.to_string());
                    self.start_cooldown(idx, self.inner.cooldown);
                    if !matches!(mode, SelectionMode::Automatic) {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
            }
        }
        Err(AccountError::NoHealthyAccounts)
    }

    fn selection_plan(
        &self,
        context: &RoutingContext,
    ) -> Result<(Vec<usize>, SelectionMode), AccountError> {
        if self.inner.accounts.is_empty() {
            return Err(AccountError::NoAccountsConfigured);
        }
        if let Some(pin) = context.pinned_account.as_deref() {
            let Some(index) = self.inner.accounts.iter().position(|a| a.name == pin) else {
                return Err(AccountError::UnknownPinnedAccount(pin.to_string()));
            };
            return Ok((vec![index], SelectionMode::Pinned));
        }
        if let Some(session) = context.session_key.as_deref()
            && let Some(index) = self.bound_account(session)
        {
            return Ok((vec![index], SelectionMode::Session));
        }
        let mut indices: Vec<usize> = (0..self.inner.accounts.len()).collect();
        match self.inner.strategy {
            SelectionStrategy::RoundRobin => {
                let start = self.inner.cursor.fetch_add(1, Ordering::Relaxed) % indices.len();
                indices.rotate_left(start);
            }
            SelectionStrategy::Priority => {}
            SelectionStrategy::LeastUsed => indices.sort_by(|left, right| {
                Self::compare_usage(&self.inner.accounts[*left], &self.inner.accounts[*right])
            }),
        }
        Ok((indices, SelectionMode::Automatic))
    }

    fn compare_usage(left: &AccountState, right: &AccountState) -> CmpOrdering {
        let left_used = left.used.load(Ordering::Relaxed);
        let right_used = right.used.load(Ordering::Relaxed);
        match (left.request_limit, right.request_limit) {
            (Some(left_limit), Some(right_limit)) => left_used
                .saturating_mul(right_limit)
                .cmp(&right_used.saturating_mul(left_limit))
                .then_with(|| left_used.cmp(&right_used)),
            // Prefer measurable quota headroom; unknown quotas remain eligible
            // as a fallback instead of being treated as unlimited.
            (Some(_), None) => CmpOrdering::Less,
            (None, Some(_)) => CmpOrdering::Greater,
            (None, None) => left_used.cmp(&right_used),
        }
    }

    fn bound_account(&self, session: &str) -> Option<usize> {
        if self.inner.session_affinity_ttl.is_zero() {
            return None;
        }
        let now = Instant::now();
        let mut affinities = self
            .inner
            .affinities
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        affinities.retain(|_, binding| binding.expires_at > now);
        affinities.get(session).map(|binding| binding.account_index)
    }

    fn bind_session(&self, context: &RoutingContext, account_index: usize) {
        let Some(session) = context.session_key.as_ref() else {
            return;
        };
        if self.inner.session_affinity_ttl.is_zero() {
            return;
        }
        let mut affinities = self
            .inner
            .affinities
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        affinities.insert(
            session.clone(),
            AffinityBinding {
                account_index,
                expires_at: Instant::now() + self.inner.session_affinity_ttl,
            },
        );
    }

    fn unavailable_error(mode: SelectionMode, account: &str) -> AccountError {
        match mode {
            SelectionMode::Pinned => AccountError::PinnedAccountUnavailable(account.to_string()),
            SelectionMode::Session => AccountError::SessionAccountUnavailable(account.to_string()),
            SelectionMode::Automatic => AccountError::NoHealthyAccounts,
        }
    }

    /// Mark the named account as having failed (e.g., upstream returned 429).
    pub fn report_failure(&self, account_name: &str, err: &str) {
        self.report_failure_with_retry_after(account_name, err, None);
    }

    /// Cool an account after a typed quota failure. A vendor `Retry-After`
    /// duration overrides a shorter configured default; concurrent failures
    /// never shorten an existing cooldown.
    pub fn report_failure_with_retry_after(
        &self,
        account_name: &str,
        err: &str,
        retry_after: Option<Duration>,
    ) {
        if let Some(idx) = self
            .inner
            .accounts
            .iter()
            .position(|a| a.name == account_name)
        {
            self.record_error(idx, err);
            self.start_cooldown(
                idx,
                retry_after.map_or(self.inner.cooldown, |retry| retry.max(self.inner.cooldown)),
            );
        }
    }

    fn record_error(&self, idx: usize, err: &str) {
        let mut guard = self.inner.accounts[idx]
            .last_error
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        *guard = Some(err.to_string());
    }

    fn start_cooldown(&self, idx: usize, duration: Duration) {
        let mut guard = self.inner.accounts[idx]
            .cooldown_until
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let proposed = Instant::now() + duration;
        if guard.is_none_or(|current| current < proposed) {
            *guard = Some(proposed);
        }
    }
}

/// Health status snapshot for one account.
#[derive(Debug, Clone)]
pub struct AccountHealth {
    pub name: String,
    pub home: PathBuf,
    pub healthy: bool,
    pub used: usize,
    pub request_limit: Option<usize>,
    pub remaining_requests: Option<usize>,
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
    /// An explicit token pin named no configured account.
    UnknownPinnedAccount(String),
    /// A strict token-pinned account is cooling down or spent.
    PinnedAccountUnavailable(String),
    /// A session's bound account is cooling down or spent.
    SessionAccountUnavailable(String),
}

impl std::fmt::Display for AccountError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NoAccountsConfigured => write!(f, "no accounts configured"),
            Self::NoHealthyAccounts => write!(f, "no healthy accounts available"),
            Self::UnknownPinnedAccount(account) => {
                write!(f, "token is pinned to unknown account {account}")
            }
            Self::PinnedAccountUnavailable(account) => {
                write!(f, "pinned account {account} is unavailable")
            }
            Self::SessionAccountUnavailable(account) => {
                write!(f, "session account {account} is unavailable")
            }
        }
    }
}

impl std::error::Error for AccountError {}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::subscription::SubscriptionProvider;
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

    #[test]
    fn strategy_aliases_ignore_surrounding_whitespace() {
        assert_eq!(
            SelectionStrategy::from_str_opt("  quota-first  "),
            Some(SelectionStrategy::LeastUsed)
        );
    }

    #[test]
    fn least_used_compares_normalized_spend_for_uneven_limits() {
        let a = tempdir("normalized-a");
        let b = tempdir("normalized-b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new_for_provider(
            a,
            &[b],
            SubscriptionProvider::Claude,
            AccountRouterOptions {
                strategy: SelectionStrategy::LeastUsed,
                request_limits: vec![Some(2), Some(100)],
                ..AccountRouterOptions::default()
            },
        );

        assert_eq!(router.select().unwrap().name, "primary");
        assert_eq!(router.select().unwrap().name, "account-1");
        assert_eq!(router.select().unwrap().name, "account-1");
    }

    #[test]
    fn session_affinity_keeps_a_conversation_on_one_account() {
        let a = tempdir("session-a");
        let b = tempdir("session-b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new_for_provider(
            a,
            &[b],
            SubscriptionProvider::Claude,
            AccountRouterOptions::default(),
        );

        let first = router
            .select_with_context(&RoutingContext::for_session("conversation-1"))
            .unwrap();
        let again = router
            .select_with_context(&RoutingContext::for_session("conversation-1"))
            .unwrap();
        let other = router
            .select_with_context(&RoutingContext::for_session("conversation-2"))
            .unwrap();

        assert_eq!(first.name, again.name);
        assert_ne!(first.name, other.name);
    }

    #[test]
    fn session_activity_renews_the_affinity_timeout() {
        let a = tempdir("session-renew-a");
        let b = tempdir("session-renew-b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new_for_provider(
            a,
            &[b],
            SubscriptionProvider::Claude,
            AccountRouterOptions::default(),
        );
        let context = RoutingContext::for_session("active-conversation");
        router.select_with_context(&context).unwrap();

        let shortened_expiry = Instant::now() + Duration::from_secs(1);
        router
            .inner
            .affinities
            .lock()
            .unwrap()
            .get_mut("active-conversation")
            .unwrap()
            .expires_at = shortened_expiry;

        router.select_with_context(&context).unwrap();
        let renewed_expiry = router
            .inner
            .affinities
            .lock()
            .unwrap()
            .get("active-conversation")
            .unwrap()
            .expires_at;
        assert!(renewed_expiry > shortened_expiry);
    }

    #[test]
    fn an_unavailable_session_account_is_not_silently_changed() {
        let a = tempdir("strict-session-a");
        let b = tempdir("strict-session-b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new_for_provider(
            a,
            &[b],
            SubscriptionProvider::Claude,
            AccountRouterOptions::default(),
        );
        let context = RoutingContext::for_session("strict-conversation");
        let selected = router.select_with_context(&context).unwrap();
        router.report_failure(&selected.name, "quota exhausted");

        assert!(matches!(
            router.select_with_context(&context),
            Err(AccountError::SessionAccountUnavailable(_))
        ));
    }

    #[test]
    fn explicit_account_pins_are_strict() {
        let a = tempdir("pin-a");
        let b = tempdir("pin-b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let router = AccountRouter::new_for_provider(
            a,
            &[b],
            SubscriptionProvider::Claude,
            AccountRouterOptions::default(),
        );

        let selected = router
            .select_with_context(&RoutingContext::pinned("account-1"))
            .unwrap();
        assert_eq!(selected.name, "account-1");
        router.report_failure("account-1", "quota exhausted");
        assert!(matches!(
            router.select_with_context(&RoutingContext::pinned("account-1")),
            Err(AccountError::PinnedAccountUnavailable(_))
        ));
        assert!(matches!(
            router.select_with_context(&RoutingContext::pinned("missing")),
            Err(AccountError::UnknownPinnedAccount(_))
        ));
    }

    #[test]
    fn configured_request_limits_remove_spent_accounts() {
        let a = tempdir("limits-a");
        let b = tempdir("limits-b");
        write_creds(&a, "tok-a");
        write_creds(&b, "tok-b");
        let options = AccountRouterOptions {
            request_limits: vec![Some(1), Some(2)],
            ..AccountRouterOptions::default()
        };
        let router =
            AccountRouter::new_for_provider(a, &[b], SubscriptionProvider::Claude, options);

        assert_eq!(router.select().unwrap().name, "primary");
        assert_eq!(router.select().unwrap().name, "account-1");
        assert_eq!(router.select().unwrap().name, "account-1");
        assert!(matches!(
            router.select(),
            Err(AccountError::NoHealthyAccounts)
        ));
        let health = router.health_snapshot();
        assert_eq!(health[0].remaining_requests, Some(0));
        assert_eq!(health[1].remaining_requests, Some(0));
    }

    #[test]
    fn concurrent_selection_cannot_oversubscribe_an_account_cap() {
        let a = tempdir("atomic-limit");
        write_creds(&a, "tok-a");
        let router = AccountRouter::new_for_provider(
            a,
            &[],
            SubscriptionProvider::Claude,
            AccountRouterOptions {
                request_limits: vec![Some(1)],
                ..AccountRouterOptions::default()
            },
        );
        let successful = (0..16)
            .map(|_| {
                let router = router.clone();
                std::thread::spawn(move || router.select().is_ok())
            })
            .map(|worker| worker.join().unwrap())
            .filter(|successful| *successful)
            .count();

        assert_eq!(successful, 1);
        assert_eq!(router.health_snapshot()[0].used, 1);
    }

    #[test]
    fn vendor_subscription_accounts_use_the_same_pool() {
        let a = tempdir("codex-a");
        let b = tempdir("codex-b");
        fs::write(
            a.join("auth.json"),
            r#"{"tokens":{"access_token":"codex-a","account_id":"acct-a"}}"#,
        )
        .unwrap();
        fs::write(
            b.join("auth.json"),
            r#"{"tokens":{"access_token":"codex-b","account_id":"acct-b"}}"#,
        )
        .unwrap();
        let router = AccountRouter::new_for_provider(
            a,
            &[b],
            SubscriptionProvider::Codex,
            AccountRouterOptions::default(),
        );

        let selected = router
            .select_subscription(&RoutingContext::pinned("account-1"))
            .unwrap();
        assert_eq!(selected.name, "account-1");
        assert_eq!(selected.token.access_token, "codex-b");
        assert_eq!(selected.token.account_id.as_deref(), Some("acct-b"));
    }
}
