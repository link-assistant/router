use crate::clients::ClientKind;
use crate::model_contract::ModelAccessPolicy;

use super::{AnyError, CredentialOptions, ResolvedServer, RunCredential};

/// Validate an ordinary token or exchange an admin credential for a run token.
pub async fn prepare_run_credential(
    server: &ResolvedServer,
    client_kind: ClientKind,
    label: &str,
    ttl_hours: i64,
    sliding: bool,
) -> Result<RunCredential, AnyError> {
    super::prepare_credential(
        server,
        client_kind,
        label,
        CredentialOptions {
            ttl_hours,
            sliding,
            allow_supplied: true,
            ephemeral: true,
        },
        None,
    )
    .await
}

/// Mint the client-bound credential used by a permanent repair.
///
/// Repair is a trust takeover, not a one-shot launch. It must never persist a
/// supplied ordinary token merely because the selected listener cannot mint a
/// replacement: only a candidate minted for this exact client is eligible.
pub async fn prepare_repair_credential(
    server: &ResolvedServer,
    client_kind: ClientKind,
    label: &str,
    ttl_hours: i64,
) -> Result<RunCredential, AnyError> {
    super::prepare_credential(
        server,
        client_kind,
        label,
        CredentialOptions {
            ttl_hours,
            sliding: false,
            allow_supplied: false,
            ephemeral: false,
        },
        None,
    )
    .await
}

/// Mint or reuse a credential that remains after this command exits.
pub async fn prepare_persistent_credential(
    server: &ResolvedServer,
    client_kind: ClientKind,
    label: &str,
    ttl_hours: i64,
) -> Result<RunCredential, AnyError> {
    super::prepare_credential(
        server,
        client_kind,
        label,
        CredentialOptions {
            ttl_hours,
            sliding: false,
            allow_supplied: true,
            ephemeral: false,
        },
        None,
    )
    .await
}

/// Mint a per-run credential with exact server-enforced model authority.
pub async fn prepare_run_credential_with_model_policy(
    server: &ResolvedServer,
    client_kind: ClientKind,
    label: &str,
    ttl_hours: i64,
    sliding: bool,
    policy: &ModelAccessPolicy,
) -> Result<RunCredential, AnyError> {
    super::prepare_credential(
        server,
        client_kind,
        label,
        CredentialOptions {
            ttl_hours,
            sliding,
            allow_supplied: true,
            ephemeral: true,
        },
        Some(policy),
    )
    .await
}

pub(super) fn require_minting_authority(
    policy: &ModelAccessPolicy,
    surface: &str,
) -> Result<(), AnyError> {
    if policy.allowed_models.is_empty() {
        return Ok(());
    }
    Err(format!(
        "`--model` requires {surface} so Router can mint a server-enforced exact-model token (requested allow-list: {})",
        policy.allowed_models.join(", ")
    )
    .into())
}
