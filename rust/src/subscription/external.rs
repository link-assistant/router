//! Router metadata for imported and promotion-recovery credentials.

use std::path::{Path, PathBuf};

use super::{SubscriptionError, SubscriptionProvider, SubscriptionToken};

const ROUTER_METADATA_KEY: &str = "_link_assistant_router";
const REFRESH_OWNER_KEY: &str = "refresh_owner";
const EXTERNAL_REFRESH_OWNER: &str = "external";
const CREDENTIAL_SOURCE_KEY: &str = "credential_source";
const PROMOTION_RECEIPT_KEY: &str = "promotion_receipt";

pub(super) struct StoredDocument {
    pub(super) raw: String,
    pub(super) value: serde_json::Value,
    pub(super) origin: crate::platform_keychain::Origin,
    pub(super) path: PathBuf,
}

fn metadata_mut(
    value: &mut serde_json::Value,
) -> Result<&mut serde_json::Map<String, serde_json::Value>, String> {
    let object = value
        .as_object_mut()
        .ok_or_else(|| "credential document must be a JSON object".to_string())?;
    object
        .entry(ROUTER_METADATA_KEY)
        .or_insert_with(|| serde_json::json!({}))
        .as_object_mut()
        .ok_or_else(|| "Router credential metadata must be a JSON object".to_string())
}

pub fn mark_external_refresh_owner(document: &str) -> Result<String, String> {
    let mut value: serde_json::Value = serde_json::from_str(document)
        .map_err(|_| "external credential document is not valid JSON".to_string())?;
    metadata_mut(&mut value)?.insert(REFRESH_OWNER_KEY.into(), EXTERNAL_REFRESH_OWNER.into());
    serde_json::to_string_pretty(&value)
        .map_err(|_| "external credential ownership could not be encoded".to_string())
}

pub fn mark_promotion_receipt(document: &str, transaction_id: &str) -> Result<String, String> {
    let mut value: serde_json::Value = serde_json::from_str(document)
        .map_err(|_| "credential document is not valid JSON".to_string())?;
    metadata_mut(&mut value)?.insert(PROMOTION_RECEIPT_KEY.into(), transaction_id.into());
    serde_json::to_string_pretty(&value)
        .map_err(|_| "credential promotion receipt could not be encoded".to_string())
}

pub fn reference_external_credential(
    source: &Path,
    transaction_id: &str,
) -> Result<String, String> {
    let source = std::fs::canonicalize(source)
        .map_err(|_| "the external credential source is not a readable file".to_string())?;
    if !source.is_file() {
        return Err("the external credential source is not a readable file".to_string());
    }
    serde_json::to_string_pretty(&serde_json::json!({
        ROUTER_METADATA_KEY: {
            CREDENTIAL_SOURCE_KEY: source,
            PROMOTION_RECEIPT_KEY: transaction_id,
        }
    }))
    .map_err(|_| "external credential reference could not be encoded".to_string())
}

#[must_use]
pub fn has_promotion_receipt(document: &str, transaction_id: &str) -> bool {
    serde_json::from_str::<serde_json::Value>(document)
        .ok()
        .and_then(|value| {
            value
                .pointer(&format!("/{ROUTER_METADATA_KEY}/{PROMOTION_RECEIPT_KEY}"))
                .and_then(serde_json::Value::as_str)
                .map(str::to_string)
        })
        .as_deref()
        == Some(transaction_id)
}

fn external_source(value: &serde_json::Value) -> Option<PathBuf> {
    value
        .pointer(&format!("/{ROUTER_METADATA_KEY}/{CREDENTIAL_SOURCE_KEY}"))
        .and_then(serde_json::Value::as_str)
        .filter(|path| !path.is_empty())
        .map(PathBuf::from)
}

fn has_external_owner(value: &serde_json::Value) -> bool {
    value
        .pointer(&format!("/{ROUTER_METADATA_KEY}/{REFRESH_OWNER_KEY}"))
        .and_then(serde_json::Value::as_str)
        == Some(EXTERNAL_REFRESH_OWNER)
}

fn parse_document(path: &Path) -> Result<(String, serde_json::Value), SubscriptionError> {
    crate::durable_file::recover_transactional_write(path).map_err(|error| {
        SubscriptionError::ReadError(format!("Failed to recover {}: {error}", path.display()))
    })?;
    let raw = std::fs::read_to_string(path).map_err(|error| {
        SubscriptionError::ReadError(format!("Failed to read {}: {error}", path.display()))
    })?;
    let value = serde_json::from_str(&raw).map_err(|error| {
        SubscriptionError::ParseError(format!("Failed to parse {}: {error}", path.display()))
    })?;
    Ok((raw, value))
}

pub(super) fn read_document(path: &Path) -> Result<StoredDocument, SubscriptionError> {
    let (raw, value) = parse_document(path)?;
    let Some(source) = external_source(&value) else {
        let origin = if has_external_owner(&value) {
            crate::platform_keychain::Origin::ExternalFile
        } else {
            crate::platform_keychain::Origin::File
        };
        return Ok(StoredDocument {
            raw,
            value,
            origin,
            path: path.to_path_buf(),
        });
    };
    if !source.is_absolute() || source == path {
        return Err(SubscriptionError::ReadError(
            "adopted credential source is invalid".to_string(),
        ));
    }
    let lock_path = super::credential_file_lock_path(&source);
    crate::durable_file::with_exclusive_lock(&lock_path, || {
        let (raw, value) = parse_document(&source)?;
        if external_source(&value).is_some() {
            return Err(SubscriptionError::ReadError(
                "nested adopted credential sources are not supported".to_string(),
            ));
        }
        Ok(StoredDocument {
            raw,
            value,
            origin: crate::platform_keychain::Origin::AdoptedFile,
            path: source,
        })
    })
}

pub(super) fn write_refreshed_token(
    path: &Path,
    provider: SubscriptionProvider,
    token: &SubscriptionToken,
) -> Result<(), SubscriptionError> {
    let pointer_lock = super::credential_file_lock_path(path);
    crate::durable_file::with_exclusive_lock(&pointer_lock, || {
        let (_, pointer) = parse_document(path)?;
        if has_external_owner(&pointer) {
            return Err(SubscriptionError::ReadError(format!(
                "refusing to rotate the externally owned {provider} credential"
            )));
        }
        let target = external_source(&pointer).unwrap_or_else(|| path.to_path_buf());
        if target != path && !target.is_absolute() {
            return Err(SubscriptionError::ReadError(
                "adopted credential source is invalid".to_string(),
            ));
        }
        let update = || {
            let (_, mut document) = parse_document(&target)?;
            if has_external_owner(&document) || external_source(&document).is_some() {
                return Err(SubscriptionError::ReadError(format!(
                    "refusing to rotate the externally owned {provider} credential"
                )));
            }
            super::merge_refreshed_token(&mut document, provider, token);
            let serialized = serde_json::to_vec_pretty(&document).map_err(|error| {
                SubscriptionError::ParseError(format!(
                    "Failed to serialize {}: {error}",
                    target.display()
                ))
            })?;
            crate::durable_file::transactional_write_owner_only(&target, &serialized).map_err(
                |error| {
                    SubscriptionError::ReadError(crate::durable_file::describe_write_failure(
                        &target, &error,
                    ))
                },
            )
        };
        if target == path {
            update()
        } else {
            let target_lock = super::credential_file_lock_path(&target);
            crate::durable_file::with_exclusive_lock(&target_lock, update)
        }
    })
}
