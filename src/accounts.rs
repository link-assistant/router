//! Multi-account OAuth credential routing.
//!
//! A pool contains one primary subscription plus optional additional
//! credential directories for Claude, Codex, Gemini, or Qwen. New sessions
//! use a configurable selection strategy; existing sessions stay on their
//! selected account. Typed quota failures and configured request caps remove
//! accounts from automatic selection without silently moving pinned work.

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
    /// Smooth weighted round-robin across eligible positive-weight accounts.
    WeightedRoundRobin,
    /// Always prefer the lowest-index healthy account; fall back on cooldown.
    Priority,
    /// Pick the account with the lowest used-quota count.
    LeastUsed,
}

impl SelectionStrategy {
    #[must_use]
    pub fn from_str_opt(s: &str) -> Option<Self> {
        match s.trim().to_lowercase().as_str() {
            "weighted-round-robin" | "weighted_round_robin" => Some(Self::WeightedRoundRobin),
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
    /// Pre-first-byte failover is enabled (issue #676): a session whose bound
    /// account is cooling down is served by another account *without* being
    /// rebound, so it returns once the cooldown ends. Off keeps the strict
    /// session-affinity error.
    pub failover: bool,
    /// Pause an account once a vendor window reaches this utilization percent
    /// (`ACCOUNT_PAUSE_AT_PERCENT`, issue #677). `None` never pauses early.
    pub pause_at_percent: Option<u8>,
    /// Data directory where vendor cooldowns and pauses persist across
    /// restarts. `None` keeps them in memory only.
    pub state_dir: Option<PathBuf>,
    /// Per-account connection isolation and egress proxies (issue #678).
    pub http: crate::account_http::AccountHttpPolicy,
}

impl Default for AccountRouterOptions {
    fn default() -> Self {
        Self {
            strategy: SelectionStrategy::default(),
            cooldown: Duration::from_secs(60),
            session_affinity_ttl: Duration::from_secs(60 * 60),
            request_limits: Vec::new(),
            failover: false,
            pause_at_percent: None,
            state_dir: None,
            http: crate::account_http::AccountHttpPolicy::default(),
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
    /// Requested model id, so a model-scoped vendor cooldown blocks only that
    /// model on its account (issue #677).
    pub model: Option<String>,
    /// Accounts an earlier attempt of this same request already tried; a
    /// pre-first-byte failover never returns to them (issue #676).
    pub exclude: Vec<String>,
}

impl RoutingContext {
    /// Build a context containing only a session binding.
    #[must_use]
    pub fn for_session(session: impl Into<String>) -> Self {
        Self {
            session_key: Some(session.into()),
            ..Self::default()
        }
    }

    /// Build a context containing an explicit, strict account pin.
    #[must_use]
    pub fn pinned(account: impl Into<String>) -> Self {
        Self {
            pinned_account: Some(account.into()),
            ..Self::default()
        }
    }
}

/// Per-account runtime state (cooldowns, request counts, last error).
struct AccountState {
    routing_policy:
        std::sync::RwLock<Result<crate::account_routing_policy::AccountRoutingPolicy, String>>,
    name: String,
    reader: SubscriptionReader,
    home: PathBuf,
    used: AtomicUsize,
    request_limit: Option<usize>,
    cooldown_until: Mutex<Option<Instant>>,
    last_error: Mutex<Option<String>>,
    /// Vendor rate-limit state: model cooldowns, pauses, last windows.
    limits: Mutex<crate::account_limits::AccountLimitState>,
}

impl AccountState {
    fn new(name: String, reader: SubscriptionReader, home: PathBuf, limit: Option<usize>) -> Self {
        Self {
            routing_policy: std::sync::RwLock::new(
                crate::account_routing_policy::AccountRoutingPolicy::load(&home),
            ),
            name,
            reader,
            home,
            used: AtomicUsize::new(0),
            request_limit: limit,
            cooldown_until: Mutex::new(None),
            last_error: Mutex::new(None),
            limits: Mutex::new(crate::account_limits::AccountLimitState::default()),
        }
    }

    fn policy(
        &self,
    ) -> std::sync::RwLockReadGuard<
        '_,
        Result<crate::account_routing_policy::AccountRoutingPolicy, String>,
    > {
        self.routing_policy
            .read()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn is_healthy(&self) -> bool {
        let Ok(policy) = self.policy().clone() else {
            return false;
        };
        let guard = self
            .cooldown_until
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        (policy.disable_cooling || !matches!(*guard, Some(t) if t > Instant::now()))
            && !self.is_paused()
    }

    fn limits(&self) -> std::sync::MutexGuard<'_, crate::account_limits::AccountLimitState> {
        self.limits
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner)
    }

    fn is_paused(&self) -> bool {
        self.limits().paused_at(crate::account_limits::now_unix())
    }

    /// Whether this account may serve `context`: available, not already tried
    /// by this request, and not cooling down for the requested model.
    fn serves(&self, context: &RoutingContext) -> bool {
        self.is_available()
            && !context.exclude.contains(&self.name)
            && context.model.as_deref().is_none_or(|model| {
                self.policy().as_ref().is_ok_and(|p| p.disable_cooling)
                    || !self
                        .limits()
                        .blocks_model(model, crate::account_limits::now_unix())
            })
    }

    /// What the credential on disk says about this account, right now.
    ///
    /// Read on demand rather than cached: the vendor CLI, a login, or a token
    /// refresh can replace the file underneath a long-lived process, and a
    /// stale verdict is the failure this signal exists to prevent. The read is
    /// a small local file, and reaches only the `accounts` surfaces.
    /// As [`Self::credential_state`], but consulting what the refresh ladder
    /// has already learned about this account's current credential.
    ///
    /// Without the ladder's verdict, "expired but a refresh token is present"
    /// is as far as the file on disk can take us — and a *revoked* refresh
    /// token is still a non-empty string, so a dead chain reported itself
    /// `refreshable` and healthy while every request it served returned 401
    /// (issue #245).
    fn credential_state_with(
        &self,
        now_ms: i64,
        refreshes: Option<&crate::refresh::TokenCache>,
    ) -> CredentialState {
        credential_state_of(&self.reader, &self.name, now_ms, refreshes)
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
    weights: Mutex<Vec<i64>>,
    force_model_prefix: bool,
    provider: SubscriptionProvider,
    strategy: SelectionStrategy,
    cooldown: Duration,
    session_affinity_ttl: Duration,
    affinities: Mutex<HashMap<String, AffinityBinding>>,
    /// Rotates failover candidates so concurrent failovers spread out.
    failover_cursor: AtomicUsize,
    failover: bool,
    pause_at_percent: Option<u8>,
    state_dir: Option<PathBuf>,
    /// When the limit state was last written, so window readings alone are
    /// saved at most once a minute rather than on every response.
    limits_saved_unix: std::sync::atomic::AtomicU64,
    /// Each account's own upstream clients (issue #678).
    http: crate::account_http::AccountClients,
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
    /// A bound session served elsewhere while its account cannot serve it;
    /// the binding is kept so the session returns (issue #676).
    Detour,
}

impl SelectionMode {
    /// Whether an unusable candidate moves on to the next one.
    const fn falls_through(self) -> bool {
        matches!(self, Self::Automatic | Self::Detour)
    }
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
            failover,
            pause_at_percent,
            state_dir,
            http,
        } = options;
        let mut accounts = Vec::with_capacity(1 + additional.len());
        let request_limit = |index: usize| request_limits.get(index).copied().flatten();
        accounts.push(AccountState::new(
            "primary".to_string(),
            SubscriptionReader::new(provider, &primary),
            primary,
            request_limit(0),
        ));
        for (i, p) in additional.iter().enumerate() {
            accounts.push(AccountState::new(
                format!("account-{}", i + 1),
                SubscriptionReader::new(provider, p),
                p.clone(),
                request_limit(i + 1),
            ));
        }
        let router = Self {
            inner: Arc::new(AccountRouterInner {
                weights: Mutex::new(vec![0; accounts.len()]),
                force_model_prefix: crate::operation_context::var("ACCOUNT_FORCE_MODEL_PREFIX")
                    .is_ok_and(|v| {
                        matches!(v.to_ascii_lowercase().as_str(), "1" | "true" | "yes" | "on")
                    }),
                accounts,
                cursor: AtomicUsize::new(0),
                provider,
                strategy,
                cooldown,
                session_affinity_ttl,
                affinities: Mutex::new(HashMap::new()),
                failover_cursor: AtomicUsize::new(0),
                failover,
                pause_at_percent,
                state_dir,
                limits_saved_unix: std::sync::atomic::AtomicU64::new(0),
                http: crate::account_http::AccountClients::new(http),
            }),
        };
        for name in router.inner.http.policy().proxies.keys() {
            if !router
                .inner
                .accounts
                .iter()
                .any(|account| &account.name == name)
            {
                tracing::warn!("ACCOUNT_EGRESS_PROXY names {name}, which is not a pool account");
            }
        }
        router.restore_limits();
        router
    }

    /// The upstream client of `account`: its own connection pool, cookie
    /// store and egress proxy (issue #678).
    ///
    /// # Errors
    /// The account's egress proxy cannot be resolved; the request must fail
    /// rather than egress directly.
    pub fn http_client(
        &self,
        account: &str,
        cookies: crate::account_http::CookieMode,
    ) -> Result<reqwest::Client, String> {
        self.inner.http.client(account, cookies)
    }

    /// Provider whose credential layout is used by every account in the pool.
    #[must_use]
    pub fn provider(&self) -> SubscriptionProvider {
        self.inner.provider
    }

    /// Stable router account names paired with their credential readers.
    #[must_use]
    pub fn subscription_readers(&self) -> Vec<(String, SubscriptionReader)> {
        self.inner
            .accounts
            .iter()
            .map(|account| (account.name.clone(), account.reader.clone()))
            .collect()
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

    /// Register data-directory-backed recovery stores for every account.
    pub fn register_credential_stores_in(
        &self,
        cache: &crate::refresh::TokenCache,
        data_dir: &std::path::Path,
    ) {
        for account in &self.inner.accounts {
            cache.register_readers_in(
                &account.name,
                std::slice::from_ref(&account.reader),
                data_dir,
            );
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

    /// Snapshot of account names + health (used by `/api/management/accounts`).
    ///
    /// `healthy` combines cooldown, the configured request cap, and the state
    /// of the credential on disk. Consulting only the cooldown timer meant a
    /// freshly started process reported every account healthy, including one
    /// whose token was revoked, which contradicted `doctor` and turned an
    /// automated health check green on a pool that could not serve a single
    /// request (issue #242).
    #[must_use]
    pub fn health_snapshot(&self) -> Vec<AccountHealth> {
        self.health_snapshot_with(None)
    }

    /// As [`Self::health_snapshot`], but consulting the refresh ladder's
    /// record of which credentials it has already been refused for.
    ///
    /// The file on disk cannot distinguish a live refresh token from a revoked
    /// one — both are non-empty strings — so a running router that had already
    /// been told `invalid_grant` still reported the account `refreshable` and
    /// healthy (issue #245). Callers that hold the cache should pass it; the
    /// short-lived CLI has none, and reports what the file alone can support.
    #[must_use]
    pub fn health_snapshot_with(
        &self,
        refreshes: Option<&crate::refresh::TokenCache>,
    ) -> Vec<AccountHealth> {
        let now_ms = crate::operation_context::now().timestamp_millis();
        self.inner
            .accounts
            .iter()
            .map(|a| {
                let credential = a.credential_state_with(now_ms, refreshes);
                AccountHealth {
                    name: a.name.clone(),
                    home: a.home.clone(),
                    healthy: a.is_available() && credential.can_serve(),
                    credential,
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
                    limits: {
                        let mut limits = a.limits().clone();
                        limits.expire(crate::account_limits::now_unix());
                        limits
                    },
                }
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
        self.select_subscription_where(context, |_| true)
    }

    /// Select an account that also satisfies a request-local routing boundary.
    pub(crate) fn select_subscription_where(
        &self,
        context: &RoutingContext,
        allowed: impl Fn(&str) -> bool,
    ) -> Result<SelectedSubscriptionAccount, AccountError> {
        let (indices, mode) = self.selection_plan(context, &allowed)?;
        for idx in indices {
            let account = &self.inner.accounts[idx];
            if !account.serves(context)
                || !self.policy_serves(idx, context)
                || !allowed(&account.name)
            {
                if !mode.falls_through() {
                    return Err(Self::unavailable_error(mode, &account.name));
                }
                continue;
            }
            match account.reader.read_token() {
                Ok(token)
                    if (crate::account_policy_scope::preselected(context).as_deref()
                        == Some(&account.name)
                        || account.try_record_use()) =>
                {
                    self.bind_selected(context, mode, idx);
                    return Ok(SelectedSubscriptionAccount {
                        name: account.name.clone(),
                        token,
                    });
                }
                Ok(_) => {
                    if !mode.falls_through() {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
                Err(error) => {
                    self.record_error(idx, &error.to_string());
                    self.start_cooldown(idx, self.inner.cooldown);
                    if !mode.falls_through() {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
            }
        }
        Err(AccountError::NoHealthyAccounts)
    }

    /// Select through the registered recovery-aware credential stores.
    pub(crate) async fn select_subscription_where_authoritative(
        &self,
        context: &RoutingContext,
        cache: &crate::refresh::TokenCache,
        allowed: impl Fn(&str) -> bool,
    ) -> Result<SelectedSubscriptionAccount, AccountError> {
        let (indices, mode) = self.selection_plan(context, &allowed)?;
        for idx in indices {
            let account = &self.inner.accounts[idx];
            if !account.serves(context) || !self.policy_serves(idx, context) {
                if !mode.falls_through() {
                    return Err(Self::unavailable_error(mode, &account.name));
                }
                continue;
            }
            match cache
                .load_authoritative(self.provider(), &account.name)
                .await
            {
                Ok(Some(_)) if !allowed(&account.name) => {
                    if !mode.falls_through() {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
                Ok(Some(token))
                    if (crate::account_policy_scope::preselected(context).as_deref()
                        == Some(&account.name)
                        || account.try_record_use()) =>
                {
                    self.bind_selected(context, mode, idx);
                    return Ok(SelectedSubscriptionAccount {
                        name: account.name.clone(),
                        token,
                    });
                }
                Ok(Some(_)) => {
                    if !mode.falls_through() {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
                Ok(None) | Err(_) => {
                    self.record_error(idx, "the registered credential store is unusable");
                    if !mode.falls_through() {
                        return Err(Self::unavailable_error(mode, &account.name));
                    }
                }
            }
        }
        Err(AccountError::NoHealthyAccounts)
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
        if crate::account_policy_scope::current().is_some_and(|s| {
            *s.last_action
                .lock()
                .unwrap_or_else(std::sync::PoisonError::into_inner)
                == Some(crate::account_routing_policy::ErrorAction::Relay)
        }) {
            return;
        }
        if let Some(idx) = self
            .inner
            .accounts
            .iter()
            .position(|a| a.name == account_name)
        {
            self.record_error(idx, err);
            let duration = retry_after
                .map(crate::request_routing::bounded_retry_after)
                .map_or(self.inner.cooldown, |retry| retry.max(self.inner.cooldown));
            self.start_cooldown(idx, duration);
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
        if self.inner.accounts[idx]
            .policy()
            .as_ref()
            .is_ok_and(|p| p.disable_cooling)
        {
            return;
        }
        let mut guard = self.inner.accounts[idx]
            .cooldown_until
            .lock()
            .unwrap_or_else(std::sync::PoisonError::into_inner);
        let now = Instant::now();
        let proposed = now
            .checked_add(duration)
            .or_else(|| now.checked_add(crate::request_routing::MAX_RETRY_AFTER))
            .unwrap_or(now);
        if guard.is_none_or(|current| current < proposed) {
            *guard = Some(proposed);
        }
    }
}

/// What the credential a reader points at says about itself, right now.
///
/// A free function over the reader rather than a method on an account, so a
/// deployment with no account pool can be reported with the same verdict the
/// pooled surfaces use. Reporting single-account mode as simply having nothing
/// configured described a router that was serving traffic as unauthorized
/// (issue #281).
///
/// Read on demand rather than cached: the vendor CLI, a login, or a token
/// refresh can replace the file underneath a long-lived process, and a stale
/// verdict is the failure this signal exists to prevent.
#[must_use]
pub fn credential_state_of(
    reader: &crate::subscription::SubscriptionReader,
    account: &str,
    now_ms: i64,
    refreshes: Option<&crate::refresh::TokenCache>,
) -> CredentialState {
    match reader.read_token() {
        Ok(token) if !token.is_expired(now_ms) => CredentialState::Usable,
        // `expiresAt` is a hint, not a verdict: an expired access token
        // that still holds a refresh token is recovered by the refresh
        // ladder on the next request, exactly as `doctor` reports it. Only
        // an expired token with nothing left to refresh with is terminal.
        Ok(token) => {
            if token.refresh_token.as_deref().is_none_or(str::is_empty) {
                return CredentialState::Expired;
            }
            // The refusal is keyed to this exact credential, so a chain
            // another holder has rotated forward stops matching and the
            // account reports recoverable again (issue #239).
            if refreshes
                .is_some_and(|cache| cache.refresh_was_refused(reader.provider(), account, &token))
            {
                CredentialState::Rejected
            } else {
                CredentialState::Refreshable
            }
        }
        Err(error) => CredentialState::Unusable(error.to_string()),
    }
}

/// What an account's credential file says it can do, before any request.
///
/// Cooldown answers "did a recent request fail?"; this answers "is there a
/// credential here that can serve one at all?" A fresh process has no cooldown
/// to consult, so without this every account — including one whose refresh
/// chain is revoked — reported healthy (issue #242).
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CredentialState {
    /// A credential is present and its access token has not expired.
    Usable,
    /// The access token expired, but a refresh token can renew it.
    Refreshable,
    /// A refresh with this exact credential was refused as terminal — the
    /// chain is revoked, and waiting will not recover it.
    Rejected,
    /// The access token expired and no refresh token remains.
    Expired,
    /// No credential file, or one that cannot be read or parsed.
    Unusable(String),
}

impl CredentialState {
    /// Whether this credential can serve a request, now or after a refresh.
    #[must_use]
    pub const fn can_serve(&self) -> bool {
        matches!(self, Self::Usable | Self::Refreshable)
    }

    /// Short label for the `accounts list` column.
    #[must_use]
    pub const fn label(&self) -> &'static str {
        match self {
            Self::Usable => "ok",
            Self::Refreshable => "refreshable",
            Self::Rejected => "rejected",
            Self::Expired => "expired",
            Self::Unusable(_) => "missing",
        }
    }
}

impl std::fmt::Display for CredentialState {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.pad(self.label())
    }
}

/// Health status snapshot for one account.
#[derive(Debug, Clone)]
pub struct AccountHealth {
    pub name: String,
    pub home: PathBuf,
    /// Whether this account can serve a request: no active cooldown, quota
    /// left, and a credential that is usable or renewable.
    pub healthy: bool,
    /// What the credential on disk says, independent of cooldown.
    pub credential: CredentialState,
    pub used: usize,
    pub request_limit: Option<usize>,
    pub remaining_requests: Option<usize>,
    pub last_error: Option<String>,
    pub cooldown_remaining: Option<Duration>,
    /// Vendor rate-limit state: cooldown reason, model cooldowns, pause and
    /// the windows last reported (issue #677).
    pub limits: crate::account_limits::AccountLimitState,
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
    /// An operator command named no configured account.
    UnknownAccount(String),
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
            Self::UnknownAccount(account) => write!(f, "no configured account named {account}"),
        }
    }
}

impl std::error::Error for AccountError {}

#[path = "accounts_limits.rs"]
mod limits;
pub use limits::{LimitCounts, ObservedLimits, UpstreamObservation};

#[cfg(test)]
#[path = "accounts_tests.rs"]
mod tests;

#[path = "accounts_policy.rs"]
mod policy;
#[path = "accounts_selection.rs"]
mod selection;
