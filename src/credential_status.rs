//! Shared local/remote subscription credential acceptance checks.

use serde::Serialize;

use crate::credential_recovery_store::PRIMARY_ACCOUNT;
use crate::model_catalog::{CatalogAcceptance, classify_catalog_acceptance};
use crate::refresh::TokenCache;
use crate::subscription::{SubscriptionProvider, SubscriptionReader};

/// Stable provider-verified credential state used by CLI and management APIs.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub enum CredentialAcceptanceState {
    Usable,
    Rejected,
    Unverified,
    RefreshFailed,
    Absent,
}

impl CredentialAcceptanceState {
    /// Stable human/JSON spelling.
    #[must_use]
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::Usable => "usable",
            Self::Rejected => "rejected",
            Self::Unverified => "unverified",
            Self::RefreshFailed => "refresh-failed",
            Self::Absent => "absent",
        }
    }
}

/// One provider's accepted state and exact local credential root.
#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
pub struct CredentialAcceptanceReport {
    pub provider: SubscriptionProvider,
    pub home: String,
    pub state: CredentialAcceptanceState,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Refresh when required, then make one non-inference catalog acceptance probe.
pub async fn evaluate(
    client: &reqwest::Client,
    token_cache: &TokenCache,
    readers: &[SubscriptionReader],
    catalog_base_override: Option<(SubscriptionProvider, &str)>,
) -> Vec<CredentialAcceptanceReport> {
    let now = chrono::Utc::now().timestamp_millis();
    let mut reports = Vec::with_capacity(readers.len());
    for reader in readers {
        let provider = reader.provider();
        let (state, detail) = match token_cache
            .load_authoritative(provider, PRIMARY_ACCOUNT)
            .await
        {
            Ok(None) => (CredentialAcceptanceState::Absent, None),
            Err(_) => (
                CredentialAcceptanceState::RefreshFailed,
                Some("credential recovery state could not be loaded".to_string()),
            ),
            Ok(Some(_)) => {
                match token_cache
                    .get_fresh_registered(client, provider, PRIMARY_ACCOUNT, now)
                    .await
                {
                    Ok(token) if token_cache.last_refresh_error(provider).is_none() => {
                        let base = catalog_base_override
                            .and_then(|(selected, base)| (selected == provider).then_some(base));
                        let catalog = crate::model_catalog::fetch_provider_catalog(
                            client, provider, &token, base,
                        )
                        .await;
                        let state = match classify_catalog_acceptance(&catalog) {
                            CatalogAcceptance::Accepted => CredentialAcceptanceState::Usable,
                            CatalogAcceptance::MissingSubscription
                            | CatalogAcceptance::CredentialRejected => {
                                CredentialAcceptanceState::Rejected
                            }
                            CatalogAcceptance::Unverified => CredentialAcceptanceState::Unverified,
                        };
                        (state, None)
                    }
                    _ => (
                        CredentialAcceptanceState::RefreshFailed,
                        Some(token_cache.last_refresh_error(provider).unwrap_or_else(|| {
                            "refresh failed before the credential could be checked".to_string()
                        })),
                    ),
                }
            }
        };
        reports.push(CredentialAcceptanceReport {
            provider,
            home: reader.home().display().to_string(),
            state,
            detail,
        });
    }
    reports
}

#[cfg(test)]
mod tests {
    use super::*;
    use axum::http::StatusCode;

    async fn qwen_status(status: StatusCode, body: &'static str) -> CredentialAcceptanceState {
        let app = axum::Router::new().fallback(move || async move { (status, body) });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let base = format!("http://{}", listener.local_addr().unwrap());
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
        let data = tempfile::tempdir().unwrap();
        let home = tempfile::tempdir().unwrap();
        std::fs::write(
            home.path().join("oauth_creds.json"),
            r#"{"access_token":"candidate","refresh_token":"refresh","expiry_date":9999999999999}"#,
        )
        .unwrap();
        let readers = vec![SubscriptionReader::new(
            SubscriptionProvider::Qwen,
            home.path(),
        )];
        let cache = TokenCache::registered_for(&readers, data.path());
        let reports = evaluate(
            &reqwest::Client::new(),
            &cache,
            &readers,
            Some((SubscriptionProvider::Qwen, &base)),
        )
        .await;
        server.abort();
        reports[0].state
    }

    #[tokio::test]
    async fn provider_acceptance_distinguishes_usable_rejected_and_unverified() {
        assert_eq!(
            qwen_status(StatusCode::OK, r#"{"data":[{"id":"qwen-live"}]}"#).await,
            CredentialAcceptanceState::Usable
        );
        assert_eq!(
            qwen_status(StatusCode::UNAUTHORIZED, r#"{"error":"revoked"}"#).await,
            CredentialAcceptanceState::Rejected
        );
        assert_eq!(
            qwen_status(
                StatusCode::INTERNAL_SERVER_ERROR,
                r#"{"error":"temporary"}"#
            )
            .await,
            CredentialAcceptanceState::Unverified
        );
    }
}
