//! Transactional acceptance for persisted upstream providers.

use serde::Serialize;

use crate::providers::{
    ProviderError, ProviderKind, ProviderRecord, ProviderStore, ProviderUpsert,
    RedactedProviderRecord,
};

/// Atomic installation policy for a staged provider record.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ProviderInstallMode {
    Replace,
    IfAbsent,
}

/// Result of atomically installing a staged provider record.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum ProviderInstallResult {
    Promoted(ProviderRecord),
    AlreadyPresent(ProviderRecord),
}

/// Stable machine-readable provider provisioning outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderProvisionOutcome {
    Promoted,
    AlreadyPresent,
}

/// A completed provider provisioning transaction.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ProviderProvision {
    pub outcome: ProviderProvisionOutcome,
    pub record: ProviderRecord,
}

/// Public response with the existing provider fields kept at the top level.
#[derive(Debug, Serialize)]
pub struct ProviderProvisionResponse {
    pub outcome: ProviderProvisionOutcome,
    #[serde(flatten)]
    pub record: RedactedProviderRecord,
}

impl ProviderProvision {
    #[must_use]
    pub fn response(&self) -> ProviderProvisionResponse {
        ProviderProvisionResponse {
            outcome: self.outcome,
            record: self.record.redacted(),
        }
    }
}

/// Stable machine-readable reason a candidate was not promoted.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub enum ProviderProvisionFailureKind {
    InvalidCandidate,
    CredentialRejected,
    RateLimited,
    Unverified,
    PersistenceUncertain,
}

/// Secret-free provider acceptance failure.
#[derive(Debug)]
pub struct ProviderProvisionFailure {
    kind: ProviderProvisionFailureKind,
    message: &'static str,
}

impl ProviderProvisionFailure {
    const fn new(kind: ProviderProvisionFailureKind, message: &'static str) -> Self {
        Self { kind, message }
    }

    #[must_use]
    pub const fn kind(&self) -> ProviderProvisionFailureKind {
        self.kind
    }
}

impl std::fmt::Display for ProviderProvisionFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(self.message)
    }
}

impl std::error::Error for ProviderProvisionFailure {}

/// Stage, validate without inference, and atomically promote one provider.
pub async fn provision(
    client: &reqwest::Client,
    store: &ProviderStore,
    input: ProviderUpsert,
) -> Result<ProviderProvision, ProviderProvisionFailure> {
    let mode = if input.if_absent {
        ProviderInstallMode::IfAbsent
    } else {
        ProviderInstallMode::Replace
    };
    let candidate = store.stage(input).map_err(stage_failure)?;
    if mode == ProviderInstallMode::IfAbsent
        && let Some(record) = store.get(&candidate.name).map_err(persistence_failure)?
    {
        return Ok(ProviderProvision {
            outcome: ProviderProvisionOutcome::AlreadyPresent,
            record,
        });
    }
    if candidate.enabled && candidate.kind == ProviderKind::ZaiCodingPlan {
        let resolved = store.resolve_record(&candidate).map_err(stage_failure)?;
        crate::zai_coding_plan::fetch_catalog(client, &resolved)
            .await
            .map_err(|error| {
                use crate::zai_coding_plan::ZaiProbeFailureKind as Kind;
                let kind = match error.kind() {
                    Kind::CredentialRejected => ProviderProvisionFailureKind::CredentialRejected,
                    Kind::RateLimited => ProviderProvisionFailureKind::RateLimited,
                    Kind::Unverified => ProviderProvisionFailureKind::Unverified,
                };
                ProviderProvisionFailure::new(kind, "provider candidate was not accepted")
            })?;
    }
    if candidate.enabled && candidate.kind == ProviderKind::Lefine {
        let resolved = store.resolve_record(&candidate).map_err(stage_failure)?;
        crate::lefine::fetch_catalog(client, &resolved)
            .await
            .map_err(|error| {
                use crate::lefine::CatalogFailureKind as Kind;
                let kind = match error.kind() {
                    Kind::CredentialRejected => ProviderProvisionFailureKind::CredentialRejected,
                    Kind::RateLimited => ProviderProvisionFailureKind::RateLimited,
                    Kind::Unavailable => ProviderProvisionFailureKind::Unverified,
                };
                ProviderProvisionFailure::new(kind, "provider candidate was not accepted")
            })?;
    }
    let installed = store.promote(candidate, mode).map_err(promotion_failure)?;
    let (outcome, record) = match installed {
        ProviderInstallResult::Promoted(record) => (ProviderProvisionOutcome::Promoted, record),
        ProviderInstallResult::AlreadyPresent(record) => {
            (ProviderProvisionOutcome::AlreadyPresent, record)
        }
    };
    Ok(ProviderProvision { outcome, record })
}

fn stage_failure(error: ProviderError) -> ProviderProvisionFailure {
    match error {
        ProviderError::Invalid(_) => ProviderProvisionFailure::new(
            ProviderProvisionFailureKind::InvalidCandidate,
            "provider candidate is invalid",
        ),
        _ => persistence_failure(error),
    }
}

fn promotion_failure(error: ProviderError) -> ProviderProvisionFailure {
    match error {
        ProviderError::Invalid(_) => ProviderProvisionFailure::new(
            ProviderProvisionFailureKind::InvalidCandidate,
            "provider candidate conflicts with active policy",
        ),
        _ => persistence_failure(error),
    }
}

fn persistence_failure(_error: ProviderError) -> ProviderProvisionFailure {
    ProviderProvisionFailure::new(
        ProviderProvisionFailureKind::PersistenceUncertain,
        "provider store could not confirm the transaction",
    )
}

#[cfg(test)]
#[path = "provider_acceptance_tests.rs"]
mod tests;
