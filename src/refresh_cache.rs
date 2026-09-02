use super::{
    CredentialEvidence, Exchange, REFRESH_SKEW_MS, ROTATION_ATTRIBUTION_MS, RecoveryMode, Rejected,
    SubscriptionKey, SubscriptionProvider, SubscriptionToken, TokenCache, exchange_with_recovery,
    refresh_config, refresh_recovery, refresh_state,
};

/// Import errors must classify the failure without echoing token-endpoint
/// bodies, which can contain credential or account material.
fn safe_import_refresh_error(
    provider: SubscriptionProvider,
    error: &super::RefreshError,
) -> String {
    match error {
        super::RefreshError::NoRefreshToken => {
            format!("the {provider} candidate is not refreshable and was not accepted")
        }
        error if error.is_invalid_grant() => {
            format!("the {provider} candidate refresh chain was rejected (invalid_grant)")
        }
        super::RefreshError::Status(code, _, _) => format!(
            "the {provider} candidate refresh chain was not verified (token endpoint HTTP {code})"
        ),
        super::RefreshError::Request(_) => format!(
            "the {provider} candidate refresh chain was not verified (token endpoint unavailable)"
        ),
        super::RefreshError::Parse(_) => format!(
            "the {provider} candidate refresh chain was not verified (invalid token response)"
        ),
        super::RefreshError::Storage(_) => {
            format!("the {provider} candidate refresh result could not be durably persisted")
        }
        super::RefreshError::Unsupported => {
            format!("the {provider} candidate refresh chain cannot be validated")
        }
    }
}

impl TokenCache {
    /// Create an empty cache.
    #[must_use]
    pub fn new() -> Self {
        Self::default()
    }

    /// Return a non-expired token for `provider`, refreshing if needed.
    ///
    /// Resolution order:
    /// 1. If the on-disk token is still valid, use it (the vendor CLI may have
    ///    refreshed it more recently than our cache).
    /// 2. Otherwise reuse a cached refreshed token while it remains valid.
    /// 3. Otherwise exchange the refresh token and cache the result.
    ///
    /// On refresh failure the (expired) disk token is returned unchanged so the
    /// caller can still attempt the upstream call and surface its error.
    pub async fn get_fresh(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> SubscriptionToken {
        self.get_fresh_for(
            client,
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
            disk_token,
            now_ms,
        )
        .await
    }

    /// Account-scoped variant of [`Self::get_fresh`].
    pub async fn get_fresh_for(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> SubscriptionToken {
        self.get_fresh_for_at(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            disk_token,
            now_ms,
        )
        .await
    }

    /// Load one registered credential authoritatively, then refresh it if
    /// necessary after releasing the durable load lock.
    ///
    /// Unlike [`Self::get_fresh_for`], storage uncertainty is returned to the
    /// caller instead of being collapsed into a caller-provided fallback.
    pub async fn get_fresh_registered(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        now_ms: i64,
    ) -> Result<SubscriptionToken, String> {
        self.get_fresh_registered_at(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            now_ms,
        )
        .await
    }

    /// Prove that a registered credential's refresh chain can advance.
    ///
    /// Unlike ordinary pre-flight refresh, this always exchanges the refresh
    /// token even when the current access token is still live. It uses only the
    /// direct OAuth recovery rungs, persists the complete result through the
    /// registered durable store, and returns no token until that persistence
    /// succeeds. Credential import uses this against an isolated candidate
    /// store so a stale refresh link can never replace a working destination
    /// merely because its access token still passes a catalog probe (#385).
    pub async fn validate_refresh_chain_registered(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        now_ms: i64,
    ) -> Result<SubscriptionToken, String> {
        self.validate_refresh_chain_registered_at(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            now_ms,
        )
        .await
    }

    /// Endpoint-overridable variant used by end-to-end import tests.
    #[doc(hidden)]
    pub async fn validate_refresh_chain_registered_at(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        now_ms: i64,
    ) -> Result<SubscriptionToken, String> {
        let baseline = self
            .load_authoritative(provider, account)
            .await?
            .ok_or_else(|| format!("the {provider} candidate credential is absent"))?;
        if baseline.refresh_token.as_deref().is_none_or(str::is_empty) {
            return Err(format!(
                "the {provider} candidate is not refreshable and was not accepted"
            ));
        }
        let attempt = self.attempts.for_subscription(provider, account, &baseline);
        let mut attempt = attempt.lock().await;
        if attempt.reset_if_changed(provider, &baseline) {
            self.forget(&(provider, account.to_string()), provider);
        }
        let store = self
            .store_for_subscription(provider, account)
            .ok_or_else(|| format!("no durable {provider} candidate store is registered"))?;
        let exchange = Exchange {
            client,
            token_url,
            provider,
            now_ms,
            mode: RecoveryMode::ImportValidation,
        };
        let fresh = exchange_with_recovery(&exchange, Some(&store), None, &baseline)
            .await
            .map_err(|rejection| safe_import_refresh_error(provider, &rejection.error))?
            .token;
        self.accept(&mut attempt, provider, account, &fresh, Some(now_ms));
        drop(attempt);

        // Reread what was durably committed rather than trusting the exchange's
        // in-memory return value. This is the credential later catalog-tested
        // and promoted.
        let durable = self
            .load_authoritative(provider, account)
            .await?
            .ok_or_else(|| format!("the durable {provider} candidate disappeared after refresh"))?;
        if fresh.access_token != durable.access_token
            || fresh.refresh_token != durable.refresh_token
        {
            return Err(format!(
                "the durable {provider} candidate did not retain the validated refresh result"
            ));
        }
        Ok(durable)
    }

    /// Testable token-endpoint variant of [`Self::get_fresh_registered`].
    ///
    /// The registered durable store remains authoritative; only the remote
    /// endpoint is replaceable so diagnostics can exercise real transaction
    /// failures without contacting a vendor.
    pub(crate) async fn get_fresh_registered_at(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        now_ms: i64,
    ) -> Result<SubscriptionToken, String> {
        let disk_token = self
            .load_authoritative(provider, account)
            .await?
            .ok_or_else(|| {
                format!("failed to load {provider} credentials from the registered store")
            })?;
        self.get_fresh_for_at_checked(client, token_url, provider, account, disk_token, now_ms)
            .await
    }

    /// Refresh a baseline that was just returned by [`Self::load_authoritative`].
    ///
    /// This avoids a redundant second locked reload while preserving the rule
    /// that no caller-provided raw credential can bypass the registered store.
    pub(crate) async fn get_fresh_loaded(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> Result<SubscriptionToken, String> {
        self.get_fresh_for_at_checked(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            disk_token,
            now_ms,
        )
        .await
    }

    /// Refresh regardless of what the token's own `exp` claim says.
    ///
    /// A vendor may invalidate an access token *before* its stated expiry —
    /// a plan change, a session reset — and answers `401` to a token whose
    /// `exp` is still days away (issue #205). `exp` is therefore only ever an
    /// optimisation for refreshing early; a `401` from the resource endpoint
    /// is the authority on whether a token is actually accepted.
    ///
    /// Returns `None` when no fresher token could be obtained, so a caller can
    /// tell "retry with this" from "there is nothing new to retry with" and
    /// avoid replaying a request with the credential that just failed.
    pub async fn refresh_rejected(
        &self,
        client: &reqwest::Client,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        self.refresh_rejected_at(
            client,
            refresh_config(provider).token_url,
            provider,
            account,
            disk_token,
            now_ms,
        )
        .await
    }

    pub(super) async fn refresh_rejected_at(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        rejected: SubscriptionToken,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        let attempt = self.attempts.for_subscription(provider, account, &rejected);
        // The same lock the pre-flight path uses, so concurrent 401s share one
        // exchange instead of each spending the refresh token.
        let mut attempt = attempt.lock().await;

        // A concurrent caller may have refreshed while we waited for the lock.
        // Anything that differs from the token just rejected is worth retrying.
        if let Some(cached) = self.cached_valid_for(provider, account, now_ms)
            && cached.access_token != rejected.access_token
        {
            return Some(cached);
        }
        // A credential this process rotated into moments ago is not evidence
        // of anything yet. Refreshing it spends the only good link of a
        // single-use chain against a verdict that was never about the token
        // (issue #319).
        if let Some(age_ms) = attempt.rotated_within(now_ms, refresh_state::ROTATION_GRACE_MS) {
            tracing::warn!(
                "not refreshing the {provider} credential: this process rotated into it \
                 {}s ago and a refresh chain is single-use, so spending it again would \
                 destroy a token that was known good; retrying the existing one",
                age_ms / 1_000
            );
            return None;
        }
        let base = match self
            .unsuppressed_base(&mut attempt, provider, account, rejected.clone(), now_ms)
            .await
        {
            Ok(Some(base)) => base,
            Ok(None) => return None,
            Err(error) => {
                self.record_refresh_error_for(provider, account, &error);
                return None;
            }
        };
        let exchange = Exchange {
            client,
            token_url,
            provider,
            now_ms,
            mode: RecoveryMode::AfterRejection,
        };
        let result = match self.climb(&exchange, account, &base).await {
            Ok(fresh) => {
                self.accept(&mut attempt, provider, account, &fresh, Some(now_ms));
                // A refresh that returned the same access token has not
                // recovered anything; replaying would just repeat the 401.
                (fresh.access_token != rejected.access_token).then_some(fresh)
            }
            Err(rejection) => {
                // When this process performed the previous rotation, say so.
                // "revoked or already spent elsewhere" sends the operator
                // looking for an external holder that may not exist, while the
                // fatal spend is recorded right here (issue #319).
                let message = attempt
                    .rotated_within(now_ms, ROTATION_ATTRIBUTION_MS)
                    .map_or_else(
                        || rejection.message.clone(),
                        |age_ms| {
                            format!(
                                "{} — note: this process rotated into that refresh token {}s ago, \
                             so it was spent here rather than by another holder",
                                rejection.message,
                                age_ms / 1_000
                            )
                        },
                    );
                let rejection = Rejected {
                    message,
                    ..rejection
                };
                self.record_refresh_error_for(provider, account, &rejection.message);
                if rejection.error.is_invalid_grant() {
                    // healthy -> permanently unauthenticated is a state
                    // transition that needs a human in a browser and will not
                    // self-heal. Logged at WARN it sat below every sane
                    // `level>=ERROR` pipeline, so a twelve-hour outage produced
                    // a clean log (issue #321).
                    self.log_terminal_once_for(provider, account, &rejection.message);
                    attempt.record_terminal_failure();
                    self.record_credential_rejected_for(provider, account);
                    // Per account as well as per provider: the provider-wide
                    // verdict cannot say *which* account of a pool is dead,
                    // and `accounts list` reports one row each (issue #245).
                    self.record_refresh_refused(provider, account, &base);
                } else {
                    tracing::warn!(
                        "refresh after a rejected {provider} token failed: {}",
                        rejection.message
                    );
                    attempt
                        .record_transient_failure_after(now_ms, rejection.error.retry_after_ms());
                }
                None
            }
        };
        drop(attempt);
        result
    }

    pub(super) async fn get_fresh_for_at(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> SubscriptionToken {
        let fallback = disk_token.clone();
        match self
            .get_fresh_for_at_checked(client, token_url, provider, account, disk_token, now_ms)
            .await
        {
            Ok(token) => token,
            Err(error) => {
                self.record_refresh_error_for(provider, account, &error);
                fallback
            }
        }
    }

    async fn get_fresh_for_at_checked(
        &self,
        client: &reqwest::Client,
        token_url: &str,
        provider: SubscriptionProvider,
        account: &str,
        disk_token: SubscriptionToken,
        now_ms: i64,
    ) -> Result<SubscriptionToken, String> {
        let key = (provider, account.to_string());
        let attempt = self
            .attempts
            .for_subscription(provider, account, &disk_token);
        let mut attempt = attempt.lock().await;

        // Re-authentication replaces at least one credential field. Forget
        // both negative and positive state derived from the previous file.
        if attempt.reset_if_changed(provider, &disk_token) {
            self.forget(&key, provider);
        }
        // Refresh slightly *before* expiry rather than after a request has
        // already failed: a token that expires mid-flight surfaces to the
        // caller as an upstream error, and a credential only ever refreshed
        // reactively can sit unused past its refresh window (issue #203).
        if !disk_token.is_expired(now_ms.saturating_add(REFRESH_SKEW_MS)) {
            return Ok(disk_token);
        }
        if let Some(cached) = self.cached_valid_for(provider, account, now_ms) {
            return Ok(cached);
        }
        let Some(base) = self
            .unsuppressed_base(&mut attempt, provider, account, disk_token.clone(), now_ms)
            .await?
        else {
            return Ok(disk_token);
        };
        if !base.is_expired(now_ms.saturating_add(REFRESH_SKEW_MS)) {
            // The store was already ahead of the token we were handed; there is
            // nothing to exchange.
            self.accept(&mut attempt, provider, account, &base, None);
            return Ok(base);
        }
        let exchange = Exchange {
            client,
            token_url,
            provider,
            now_ms,
            mode: RecoveryMode::Proactive,
        };
        match self.climb(&exchange, account, &base).await {
            Ok(fresh) => {
                self.accept(&mut attempt, provider, account, &fresh, Some(now_ms));
                drop(attempt);
                Ok(fresh)
            }
            Err(rejection) => {
                self.record_refresh_error_for(provider, account, &rejection.message);
                if rejection.error.is_invalid_grant() {
                    self.log_terminal_once_for(provider, account, &rejection.message);
                    attempt.record_terminal_failure();
                    self.record_credential_rejected_for(provider, account);
                    self.record_refresh_refused(provider, account, &base);
                } else {
                    tracing::warn!(
                        "{}",
                        refresh_recovery::refresh_failure_diagnostic(provider, &rejection.message)
                    );
                    // Everything else is retryable. In particular a 429 must
                    // not record rejection evidence: the credential is fine,
                    // and marking it rejected would drop the provider out of
                    // routing until restart (issue #203).
                    attempt
                        .record_transient_failure_after(now_ms, rejection.error.retry_after_ms());
                }
                drop(attempt);
                // The stamped-expired token is returned unchanged on purpose:
                // it may still be honoured by the inference endpoint.
                Ok(disk_token)
            }
        }
    }

    /// Run the recovery ladder for one subscription.
    async fn climb(
        &self,
        exchange: &Exchange<'_>,
        account: &str,
        base: &SubscriptionToken,
    ) -> Result<SubscriptionToken, refresh_recovery::Rejected> {
        let provider = exchange.provider;
        let store = self.store_for_subscription(provider, account);
        let vendor_cli = self.vendor_cli_for(provider, account);
        exchange_with_recovery(exchange, store.as_ref(), vendor_cli.as_ref(), base)
            .await
            .map(|recovered| {
                if let Ok(mut guard) = self.recoveries.lock() {
                    guard.insert(provider, recovered.rung.describe());
                }
                recovered.token
            })
    }

    /// How `provider`'s credential was last resolved, in the operator's terms.
    #[must_use]
    pub fn last_recovery(&self, provider: SubscriptionProvider) -> Option<&'static str> {
        self.recoveries
            .lock()
            .ok()
            .and_then(|guard| guard.get(&provider).copied())
    }

    /// The credential to exchange, or `None` when a cached failure still
    /// suppresses this subscription.
    ///
    /// A suppressed subscription is not simply skipped: the terminal verdict was
    /// reached about *one* chain link, and another holder may have rotated the
    /// chain forward since. Re-reading the store before honouring the
    /// suppression is what stops a single `invalid_grant` from disabling the
    /// subscription until someone re-authenticates by hand (issue #239).
    async fn unsuppressed_base(
        &self,
        attempt: &mut refresh_state::RefreshAttempt,
        provider: SubscriptionProvider,
        account: &str,
        held: SubscriptionToken,
        now_ms: i64,
    ) -> Result<Option<SubscriptionToken>, String> {
        if !attempt.suppresses_attempt(now_ms) {
            return Ok(Some(held));
        }
        let stored = self
            .reload_registered_store_locked(provider, account)
            .await?
            .ok_or_else(|| {
                format!("failed to load {provider} credentials from the registered store")
            })?;
        if !attempt.reset_if_changed(provider, &stored) {
            return Ok(None);
        }
        tracing::info!(
            "the {provider} credential on disk changed since it was last rejected; retrying with \
             it instead of waiting for a manual re-authentication"
        );
        self.forget(&(provider, account.to_string()), provider);
        Ok(Some(stored))
    }

    /// Record a successful resolution: cache the token and clear failure state.
    fn accept(
        &self,
        attempt: &mut refresh_state::RefreshAttempt,
        provider: SubscriptionProvider,
        account: &str,
        token: &SubscriptionToken,
        rotated_at_ms: Option<i64>,
    ) {
        // Remember that *this* process minted the credential, and when. A
        // single-use chain must not be spent again moments later on evidence
        // that is not about the credential, and a chain that does die deserves
        // to be reported as spent here rather than blamed on another holder
        // (issue #319). `None` means the credential was adopted rather than
        // exchanged, so no link was spent and no grace period is owed.
        if let Some(now_ms) = rotated_at_ms {
            // The fingerprint moves to the token we just minted, because the
            // ladder has already written it to the file the next caller reads.
            // Leaving it behind is what let a rotation this process performed
            // look like a re-authentication (issue #319).
            attempt.record_rotation(provider, now_ms, token);
        }
        self.store_for(provider, account, token.clone());
        attempt.record_success();
        self.record_credential_working_for(provider, account);
        if let Ok(mut guard) = self.refresh_errors.lock() {
            guard.remove(&(provider, account.to_string()));
        }
        // A refresh that succeeded settles the question for this account: any
        // earlier refusal was about a link the chain has since moved past.
        self.rejections.clear(provider, account);
    }

    /// Drop cached state derived from a credential that has been replaced.
    pub(super) fn forget(&self, key: &SubscriptionKey, provider: SubscriptionProvider) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.remove(key);
        }
        if let Ok(mut guard) = self.evidence.lock() {
            guard.remove(key);
        }
        if let Ok(mut guard) = self.refresh_errors.lock() {
            guard.remove(key);
        }
        self.rejections.clear(provider, &key.1);
        self.clear_terminal_announcement_for(provider, &key.1);
    }

    /// Clear verdicts derived from a credential that an authoritative reload
    /// proves has been replaced.
    pub(super) async fn reconcile_authoritative_credential(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        credential: &SubscriptionToken,
    ) {
        let key = (provider, account.to_string());
        let attempt = self
            .attempts
            .for_subscription(provider, account, credential);
        if attempt.lock().await.reset_if_changed(provider, credential) {
            self.forget(&key, provider);
        }
    }

    /// Record that an upstream call succeeded with `provider`'s credential.
    pub fn record_credential_working(&self, provider: SubscriptionProvider) {
        self.record_credential_working_for(
            provider,
            crate::credential_recovery_store::PRIMARY_ACCOUNT,
        );
    }

    /// Record that one stable router account served successfully.
    pub fn record_credential_working_for(&self, provider: SubscriptionProvider, account: &str) {
        self.record_evidence_for(provider, account, CredentialEvidence::Working);
        // A provider that is serving again may die again, and that death is a
        // new event that must be announced (issue #321).
        self.clear_terminal_announcement_for(provider, account);
    }
    pub(super) fn cached_valid_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        now_ms: i64,
    ) -> Option<SubscriptionToken> {
        let guard = self.inner.lock().ok()?;
        guard
            .get(&(provider, account.to_string()))
            .filter(|token| !token.is_expired(now_ms))
            .cloned()
    }

    pub(super) fn store_for(
        &self,
        provider: SubscriptionProvider,
        account: &str,
        token: SubscriptionToken,
    ) {
        if let Ok(mut guard) = self.inner.lock() {
            guard.insert((provider, account.to_string()), token);
        }
    }
}
