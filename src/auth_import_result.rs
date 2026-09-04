//! Stable machine-readable results for `router auth import`.

use std::process::ExitCode;

use link_assistant_router::refresh::{ImportRefreshFailure, ImportRefreshFailureKind};
use serde::Serialize;

/// Public import outcomes. These serialized spellings are a compatibility
/// contract for automation and must not be inferred from diagnostic prose.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum ImportOutcome {
    NotAttempted,
    ExchangeRejected,
    SuccessorRetained,
    Promoted,
    AlreadyPresent,
}

/// The last import phase reached before the reported outcome.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "snake_case")]
pub(super) enum ImportPhase {
    Preflight,
    Exchange,
    Persistence,
    Catalog,
    Promotion,
}

/// The only fields emitted as JSON. Deliberately excludes diagnostic strings,
/// paths, source documents, and tokens.
#[derive(Debug, PartialEq, Eq, Serialize)]
pub(super) struct ImportReport {
    pub(super) provider: Option<String>,
    pub(super) outcome: ImportOutcome,
    pub(super) phase: ImportPhase,
    pub(super) previous_credential_safe: bool,
    pub(super) transaction_id: Option<String>,
}

#[derive(Serialize)]
struct ImportEnvelope<'a> {
    schema_version: u8,
    results: Vec<&'a ImportReport>,
}

/// Internal failure with human diagnostic text kept outside the JSON report.
#[derive(Debug)]
pub(super) struct ImportFailure {
    pub(super) outcome: ImportOutcome,
    pub(super) phase: ImportPhase,
    pub(super) previous_credential_safe: bool,
    pub(super) transaction_id: Option<String>,
    pub(super) error: String,
}

impl ImportFailure {
    pub(super) fn not_attempted(error: impl Into<String>) -> Self {
        Self {
            outcome: ImportOutcome::NotAttempted,
            phase: ImportPhase::Preflight,
            previous_credential_safe: true,
            transaction_id: None,
            error: error.into(),
        }
    }

    pub(super) fn retained(
        phase: ImportPhase,
        transaction_id: String,
        error: impl Into<String>,
    ) -> Self {
        Self {
            outcome: ImportOutcome::SuccessorRetained,
            phase,
            previous_credential_safe: false,
            transaction_id: Some(transaction_id),
            error: error.into(),
        }
    }

    /// Convert the refresh layer's typed classification without parsing its
    /// redacted human diagnostic. Only uncertain failures retain a transaction.
    pub(super) fn from_refresh(failure: &ImportRefreshFailure, transaction_id: &str) -> Self {
        Self::from_refresh_kind(failure.kind(), failure.to_string(), transaction_id)
    }

    fn from_refresh_kind(
        kind: ImportRefreshFailureKind,
        error: String,
        transaction_id: &str,
    ) -> Self {
        match kind {
            ImportRefreshFailureKind::NotAttempted => Self::not_attempted(error),
            ImportRefreshFailureKind::ExchangeRejected => Self {
                outcome: ImportOutcome::ExchangeRejected,
                phase: ImportPhase::Exchange,
                previous_credential_safe: true,
                transaction_id: None,
                error,
            },
            ImportRefreshFailureKind::ExchangeUncertain => {
                Self::retained(ImportPhase::Exchange, transaction_id.to_string(), error)
            }
            ImportRefreshFailureKind::PersistenceUncertain => {
                Self::retained(ImportPhase::Persistence, transaction_id.to_string(), error)
            }
        }
    }

    #[cfg(test)]
    pub(super) fn from_refresh_kind_for_test(
        kind: ImportRefreshFailureKind,
        transaction_id: &str,
    ) -> Self {
        Self::from_refresh_kind(kind, "redacted failure".to_string(), transaction_id)
    }

    #[cfg(test)]
    pub(super) fn contains(&self, pattern: &str) -> bool {
        self.error.contains(pattern)
    }
}

impl std::fmt::Display for ImportFailure {
    fn fmt(&self, formatter: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        formatter.write_str(&self.error)
    }
}

/// One provider's structured result plus human-only presentation details.
pub(super) struct ImportExecution {
    report: ImportReport,
    messages: Vec<String>,
    error: Option<String>,
    failed: bool,
}

impl ImportExecution {
    pub(super) fn promoted(provider: impl Into<String>, messages: Vec<String>) -> Self {
        Self::success(
            provider,
            ImportOutcome::Promoted,
            ImportPhase::Promotion,
            false,
            messages,
        )
    }

    pub(super) fn already_present(provider: impl Into<String>, messages: Vec<String>) -> Self {
        Self::success(
            provider,
            ImportOutcome::AlreadyPresent,
            ImportPhase::Preflight,
            true,
            messages,
        )
    }

    fn success(
        provider: impl Into<String>,
        outcome: ImportOutcome,
        phase: ImportPhase,
        previous_credential_safe: bool,
        messages: Vec<String>,
    ) -> Self {
        Self {
            report: ImportReport {
                provider: Some(provider.into()),
                outcome,
                phase,
                previous_credential_safe,
                transaction_id: None,
            },
            messages,
            error: None,
            failed: false,
        }
    }

    pub(super) fn failed(provider: Option<&str>, failure: ImportFailure) -> Self {
        Self {
            report: ImportReport {
                provider: provider.map(str::to_string),
                outcome: failure.outcome,
                phase: failure.phase,
                previous_credential_safe: failure.previous_credential_safe,
                transaction_id: failure.transaction_id,
            },
            messages: Vec::new(),
            error: Some(failure.error),
            failed: true,
        }
    }

    pub(super) fn ignore_failure(mut self, message: String) -> Self {
        self.messages.push(message);
        self.error = None;
        self.failed = false;
        self
    }

    pub(super) const fn is_promoted(&self) -> bool {
        matches!(self.report.outcome, ImportOutcome::Promoted)
    }

    pub(super) fn add_message(&mut self, message: String) {
        self.messages.push(message);
    }
}

/// Render all providers exactly once and return the aggregate process status.
pub(super) fn finish(executions: &[ImportExecution], json: bool) -> ExitCode {
    if json {
        let reports = executions
            .iter()
            .map(|execution| &execution.report)
            .collect::<Vec<_>>();
        let envelope = ImportEnvelope {
            schema_version: 1,
            results: reports,
        };
        println!(
            "{}",
            serde_json::to_string(&envelope).expect("fixed import result schema must serialize")
        );
    } else {
        for execution in executions {
            for message in &execution.messages {
                println!("{message}");
            }
            if let Some(error) = &execution.error {
                eprintln!("error: {error}");
            }
        }
    }
    if executions.iter().any(|execution| execution.failed) {
        ExitCode::from(1)
    } else {
        ExitCode::SUCCESS
    }
}

#[cfg(test)]
pub(super) fn json_value(executions: &[ImportExecution]) -> serde_json::Value {
    let reports = executions
        .iter()
        .map(|execution| &execution.report)
        .collect::<Vec<_>>();
    serde_json::to_value(ImportEnvelope {
        schema_version: 1,
        results: reports,
    })
    .expect("fixed import result schema must serialize")
}
