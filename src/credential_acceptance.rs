//! Staged, non-inference acceptance for credentials that may replace a primary.
//!
//! OAuth refresh tokens can rotate on use. A candidate therefore lives in an
//! isolated durable store while its chain is advanced and its resulting access
//! token is checked against the vendor catalog. Only that fully persisted,
//! positively accepted document may cross the primary credential lock.

use std::path::{Path, PathBuf};
use std::time::Duration;

use crate::refresh::{ImportRefreshFailure, ImportRefreshFailureKind};
use crate::subscription::{
    InstallDocumentResult, InstallMode, SubscriptionProvider, SubscriptionReader, SubscriptionToken,
};

const ACCEPTANCE_TIMEOUT: Duration = Duration::from_secs(20);
const STAGING_DIRECTORY: &str = "auth-import-candidates";

/// Last boundary reached by a failed candidate acceptance transaction.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AcceptancePhase {
    Preflight,
    Exchange,
    Persistence,
    Catalog,
    Promotion,
}

/// Machine-relevant disposition of a candidate failure.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum AcceptanceFailureKind {
    NotAttempted,
    ExchangeRejected,
    ExchangeUncertain,
    PersistenceUncertain,
    SuccessorRetained,
}

/// Secret-free candidate failure with an optional opaque recovery identifier.
#[derive(Debug)]
pub struct AcceptanceFailure {
    kind: AcceptanceFailureKind,
    phase: AcceptancePhase,
    transaction_id: Option<String>,
    message: String,
}

impl AcceptanceFailure {
    fn not_attempted(message: impl Into<String>) -> Self {
        Self::not_attempted_at(AcceptancePhase::Preflight, message)
    }

    fn not_attempted_at(phase: AcceptancePhase, message: impl Into<String>) -> Self {
        Self {
            kind: AcceptanceFailureKind::NotAttempted,
            phase,
            transaction_id: None,
            message: message.into(),
        }
    }

    fn retained(
        phase: AcceptancePhase,
        transaction_id: String,
        message: impl Into<String>,
    ) -> Self {
        Self {
            kind: AcceptanceFailureKind::SuccessorRetained,
            phase,
            transaction_id: Some(transaction_id),
            message: message.into(),
        }
    }

    fn from_refresh(failure: &ImportRefreshFailure, _transaction_id: &str) -> Self {
        match failure.kind() {
            ImportRefreshFailureKind::NotAttempted => Self::not_attempted(failure.to_string()),
            ImportRefreshFailureKind::ExchangeRejected => Self {
                kind: AcceptanceFailureKind::ExchangeRejected,
                phase: AcceptancePhase::Exchange,
                transaction_id: None,
                message: failure.to_string(),
            },
            ImportRefreshFailureKind::ExchangeUncertain => Self {
                kind: AcceptanceFailureKind::ExchangeUncertain,
                phase: AcceptancePhase::Exchange,
                transaction_id: None,
                message: failure.to_string(),
            },
            ImportRefreshFailureKind::PersistenceUncertain => Self {
                kind: AcceptanceFailureKind::PersistenceUncertain,
                phase: AcceptancePhase::Persistence,
                transaction_id: None,
                message: failure.to_string(),
            },
        }
    }

    #[must_use]
    pub const fn kind(&self) -> AcceptanceFailureKind {
        self.kind
    }

    #[must_use]
    pub const fn phase(&self) -> AcceptancePhase {
        self.phase
    }

    #[must_use]
    pub fn transaction_id(&self) -> Option<&str> {
        self.transaction_id.as_deref()
    }
}

impl std::fmt::Display for AcceptanceFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.message)
    }
}

impl std::error::Error for AcceptanceFailure {}

/// A refresh-proven, catalog-accepted document in an isolated durable store.
pub struct AcceptedCredential {
    document: String,
    token: SubscriptionToken,
    stage: tempfile::TempDir,
    transaction_id: String,
}

impl std::fmt::Debug for AcceptedCredential {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter
            .debug_struct("AcceptedCredential")
            .field("credential", &"redacted")
            .field("transaction_id", &self.transaction_id)
            .finish_non_exhaustive()
    }
}

impl AcceptedCredential {
    #[must_use]
    pub fn document(&self) -> &str {
        &self.document
    }

    #[must_use]
    pub const fn token(&self) -> &SubscriptionToken {
        &self.token
    }

    #[must_use]
    pub fn transaction_id(&self) -> &str {
        &self.transaction_id
    }

    /// Keep the only durable successor and return its non-secret identifier.
    #[must_use]
    pub fn retain(self) -> String {
        let Self {
            stage,
            transaction_id,
            ..
        } = self;
        let _retained_path = stage.keep();
        transaction_id
    }

    /// Promote an accepted replacement through the primary writer lock.
    pub async fn promote_replacement(
        self,
        destination: &SubscriptionReader,
        data_dir: &Path,
    ) -> Result<PathBuf, AcceptanceFailure> {
        let document =
            crate::subscription::mark_promotion_receipt(&self.document, &self.transaction_id)
                .map_err(AcceptanceFailure::not_attempted)?;
        let promotion = destination
            .install_document_locked(
                data_dir,
                crate::credential_recovery_store::PRIMARY_ACCOUNT,
                &document,
                InstallMode::Replace,
            )
            .await;
        match promotion {
            Ok(InstallDocumentResult::Installed(path)) => {
                drop(self);
                Ok(path)
            }
            Ok(InstallDocumentResult::AlreadyPresent(_)) => {
                let transaction_id = self.retain();
                Err(AcceptanceFailure::retained(
                    AcceptancePhase::Promotion,
                    transaction_id.clone(),
                    format!(
                        "accepted candidate could not replace the primary; candidate retained as transaction {transaction_id}"
                    ),
                ))
            }
            Err(error) => {
                if destination
                    .discover_credential_path()
                    .and_then(|path| {
                        std::fs::read_to_string(&path)
                            .ok()
                            .map(|document| (path, document))
                    })
                    .is_some_and(|(_, document)| {
                        crate::subscription::has_promotion_receipt(&document, &self.transaction_id)
                    })
                {
                    let path = destination
                        .discover_credential_path()
                        .expect("the matching receipt was read from this destination");
                    drop(self);
                    return Ok(path);
                }
                let transaction_id = self.retain();
                Err(AcceptanceFailure::retained(
                    AcceptancePhase::Promotion,
                    transaction_id.clone(),
                    format!("{error}; accepted candidate retained as transaction {transaction_id}"),
                ))
            }
        }
    }
}

/// Stage, rotate, persist, and non-inference probe one candidate.
pub async fn accept_candidate(
    data_dir: &Path,
    provider: SubscriptionProvider,
    document: &str,
    token_url_override: Option<&str>,
    catalog_base_url_override: Option<&str>,
) -> Result<AcceptedCredential, AcceptanceFailure> {
    accept_candidate_with_timeout(
        data_dir,
        provider,
        document,
        token_url_override,
        catalog_base_url_override,
        ACCEPTANCE_TIMEOUT,
    )
    .await
}

/// Stage and positively validate a credential copied from an external owner.
///
/// Unlike a fresh native-login response, an imported refresh link is still
/// authoritative for the vendor client that owns the source store. This path
/// therefore validates only a currently live access token and never spends
/// that external rotating link. An expired/near-expiry source must first be
/// advanced by its owning client (issue #424).
pub async fn accept_external_candidate(
    data_dir: &Path,
    provider: SubscriptionProvider,
    document: &str,
    catalog_base_url_override: Option<&str>,
) -> Result<AcceptedCredential, AcceptanceFailure> {
    accept_candidate_with_timeout_mode(
        data_dir,
        provider,
        document,
        None,
        catalog_base_url_override,
        ACCEPTANCE_TIMEOUT,
        false,
    )
    .await
}

/// Timeout-overridable form for deterministic transaction contract tests.
#[doc(hidden)]
pub async fn accept_candidate_with_timeout(
    data_dir: &Path,
    provider: SubscriptionProvider,
    document: &str,
    token_url_override: Option<&str>,
    catalog_base_url_override: Option<&str>,
    timeout: Duration,
) -> Result<AcceptedCredential, AcceptanceFailure> {
    accept_candidate_with_timeout_mode(
        data_dir,
        provider,
        document,
        token_url_override,
        catalog_base_url_override,
        timeout,
        true,
    )
    .await
}

async fn accept_candidate_with_timeout_mode(
    data_dir: &Path,
    provider: SubscriptionProvider,
    document: &str,
    token_url_override: Option<&str>,
    catalog_base_url_override: Option<&str>,
    timeout: Duration,
    rotate_candidate: bool,
) -> Result<AcceptedCredential, AcceptanceFailure> {
    let staging_root = data_dir.join(STAGING_DIRECTORY);
    std::fs::create_dir_all(&staging_root).map_err(|_| {
        AcceptanceFailure::not_attempted("could not create the private credential staging area")
    })?;
    protect_directory(&staging_root)?;
    let transaction_id = uuid::Uuid::new_v4().simple().to_string();
    let stage = tempfile::Builder::new()
        .prefix(&format!("{transaction_id}-"))
        .tempdir_in(&staging_root)
        .map_err(|_| {
            AcceptanceFailure::not_attempted(
                "could not create a private credential acceptance transaction",
            )
        })?;
    let candidate_home = stage.path().join(provider.as_str());
    std::fs::create_dir(&candidate_home).map_err(|_| {
        AcceptanceFailure::not_attempted("could not create the isolated candidate store")
    })?;
    protect_directory(&candidate_home)?;
    let reader = SubscriptionReader::new(provider, &candidate_home);
    reader.install_document(document).map_err(|_| {
        AcceptanceFailure::not_attempted(format!(
            "the {provider} candidate could not be staged durably"
        ))
    })?;
    let catalog_base = if let Some(base) = catalog_base_url_override {
        base.trim_end_matches('/').to_string()
    } else {
        let staged = reader.read_document_for_import().map_err(|_| {
            AcceptanceFailure::not_attempted(format!(
                "the staged {provider} candidate could not be read for validation"
            ))
        })?;
        catalog_base_for_candidate(provider, &staged.token)
            .map_err(AcceptanceFailure::not_attempted)?
    };

    let candidate_data = stage.path().join("router-state");
    let cache =
        crate::refresh::TokenCache::registered_for(std::slice::from_ref(&reader), &candidate_data);
    let client = reqwest::Client::builder()
        .timeout(timeout)
        .redirect(reqwest::redirect::Policy::none())
        .build()
        .map_err(|_| {
            AcceptanceFailure::not_attempted("could not initialize candidate validation")
        })?;
    let now_ms = chrono::Utc::now().timestamp_millis();
    let refreshed = if rotate_candidate {
        let refresh_result = match token_url_override {
            Some(token_url) => {
                cache
                    .validate_refresh_chain_registered_at_classified(
                        &client,
                        token_url,
                        provider,
                        crate::credential_recovery_store::PRIMARY_ACCOUNT,
                        now_ms,
                    )
                    .await
            }
            None => {
                cache
                    .validate_refresh_chain_registered_classified(
                        &client,
                        provider,
                        crate::credential_recovery_store::PRIMARY_ACCOUNT,
                        now_ms,
                    )
                    .await
            }
        };
        match refresh_result {
            Ok(refreshed) => refreshed,
            Err(error) => {
                let mut failure = AcceptanceFailure::from_refresh(&error, &transaction_id);
                if failure.kind == AcceptanceFailureKind::SuccessorRetained {
                    let _retained_path = stage.keep();
                    failure.message = format!(
                        "{}; isolated candidate state retained as transaction {transaction_id}",
                        failure.message
                    );
                }
                return Err(failure);
            }
        }
    } else {
        let staged = reader.read_document_for_import().map_err(|_| {
            AcceptanceFailure::not_attempted(format!(
                "the staged {provider} external candidate could not be read"
            ))
        })?;
        if staged.token.is_expired(now_ms.saturating_add(5 * 60_000)) {
            return Err(AcceptanceFailure::not_attempted(format!(
                "the external {provider} credential is expired or near expiry; let its owning vendor client renew it before import"
            )));
        }
        staged.token
    };

    let catalog = crate::model_catalog::fetch_provider_catalog(
        &client,
        provider,
        &refreshed,
        Some(&catalog_base),
    )
    .await;
    let catalog_failure = match crate::model_catalog::classify_catalog_acceptance(&catalog) {
        crate::model_catalog::CatalogAcceptance::Accepted => None,
        crate::model_catalog::CatalogAcceptance::MissingSubscription => {
            Some("did not prove an active vendor subscription")
        }
        crate::model_catalog::CatalogAcceptance::CredentialRejected => {
            Some("was rejected by the vendor catalog")
        }
        crate::model_catalog::CatalogAcceptance::Unverified => {
            Some("was not positively accepted by the vendor catalog")
        }
    };
    if let Some(reason) = catalog_failure {
        if !rotate_candidate {
            return Err(AcceptanceFailure::not_attempted_at(
                AcceptancePhase::Catalog,
                format!(
                    "the external {provider} candidate {reason}; its refresh token was not spent"
                ),
            ));
        }
        let _retained_path = stage.keep();
        return Err(AcceptanceFailure::retained(
            AcceptancePhase::Catalog,
            transaction_id.clone(),
            format!(
                "the {provider} candidate {reason}; refreshed candidate retained as transaction {transaction_id}"
            ),
        ));
    }

    let Ok(durable) = reader.read_document_for_import() else {
        let _retained_path = stage.keep();
        return Err(AcceptanceFailure::retained(
            AcceptancePhase::Persistence,
            transaction_id.clone(),
            format!(
                "the durable {provider} candidate could not be reread; refreshed candidate retained as transaction {transaction_id}"
            ),
        ));
    };
    if durable.token.access_token != refreshed.access_token
        || durable.token.refresh_token != refreshed.refresh_token
    {
        let _retained_path = stage.keep();
        return Err(AcceptanceFailure::retained(
            AcceptancePhase::Persistence,
            transaction_id.clone(),
            format!(
                "the durable {provider} candidate changed after validation; refreshed candidate retained as transaction {transaction_id}"
            ),
        ));
    }
    Ok(AcceptedCredential {
        document: durable.document,
        token: durable.token,
        stage,
        transaction_id,
    })
}

/// Return a loopback origin for native-login tests without widening production
/// catalog trust to candidate-controlled URLs.
#[must_use]
pub fn loopback_origin(endpoint: &str) -> Option<String> {
    let url = reqwest::Url::parse(endpoint).ok()?;
    if !url.username().is_empty() || url.password().is_some() {
        return None;
    }
    let host = url.host_str()?;
    let loopback = host.eq_ignore_ascii_case("localhost")
        || host
            .parse::<std::net::IpAddr>()
            .is_ok_and(|address| address.is_loopback());
    loopback.then(|| url.origin().ascii_serialization())
}

#[doc(hidden)]
pub fn catalog_base_for_candidate(
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
) -> Result<String, String> {
    if provider == SubscriptionProvider::Gemini {
        return Ok("https://generativelanguage.googleapis.com".to_string());
    }
    if provider != SubscriptionProvider::Qwen {
        return Ok(provider.default_base_url().to_string());
    }

    let base = token.base_url(provider);
    let parsed = reqwest::Url::parse(&base)
        .map_err(|_| "the Qwen candidate names an invalid catalog origin".to_string())?;
    let trusted_host = matches!(
        parsed.host_str(),
        Some("portal.qwen.ai" | "dashscope.aliyuncs.com")
    );
    let safe_authority = parsed.scheme() == "https"
        && parsed.username().is_empty()
        && parsed.password().is_none()
        && parsed.port_or_known_default() == Some(443)
        && parsed.query().is_none()
        && parsed.fragment().is_none();
    if !trusted_host || !safe_authority {
        return Err("the Qwen candidate catalog origin is not trusted".to_string());
    }
    Ok(base.trim_end_matches('/').to_string())
}

#[cfg(unix)]
fn protect_directory(path: &Path) -> Result<(), AcceptanceFailure> {
    use std::os::unix::fs::PermissionsExt as _;
    std::fs::set_permissions(path, std::fs::Permissions::from_mode(0o700)).map_err(|_| {
        AcceptanceFailure::not_attempted("could not protect the private credential staging area")
    })
}

#[cfg(not(unix))]
fn protect_directory(_path: &Path) -> Result<(), AcceptanceFailure> {
    Ok(())
}

#[cfg(test)]
#[path = "credential_acceptance_tests.rs"]
mod tests;
