//! Process-local Codex catalog projection for `router with`.

use std::path::{Path, PathBuf};

use serde_json::json;

use super::AnyError;
use crate::clients::RouterModel;

/// Write the live Router catalog as a complete process-local Codex catalog,
/// preventing foreign model ids without changing the user's configuration.
pub(super) fn write_codex_model_catalog(
    root: &Path,
    models: &[RouterModel],
    configured_effort: Option<&str>,
    selected_model: Option<&str>,
) -> Result<PathBuf, AnyError> {
    if models.is_empty() {
        return Err("the Router advertised no models for Codex".into());
    }
    let mut described = Vec::with_capacity(models.len());
    let mut omitted = Vec::new();
    for model in models {
        match validate_codex_reasoning_metadata(model) {
            Ok(()) => described.push(model),
            Err(error) if selected_model == Some(model.id.as_str()) => return Err(error),
            Err(error) => omitted.push((model.id.as_str(), error.to_string())),
        }
    }
    if !omitted.is_empty() {
        let ids = omitted
            .iter()
            .map(|(id, _)| *id)
            .collect::<Vec<_>>()
            .join(", ");
        eprintln!(
            "warning: omitted Codex model(s) with unavailable reasoning metadata: {ids}; \
             fully described models remain available"
        );
    }
    if described.is_empty() {
        let ids = omitted
            .iter()
            .map(|(id, _)| *id)
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!(
            "the live Codex catalog has no model with usable reasoning metadata; omitted: {ids}"
        )
        .into());
    }
    if let (Some(effort), Some(selected)) = (configured_effort, selected_model) {
        let model = described
            .iter()
            .copied()
            .find(|model| model.id == selected)
            .ok_or_else(|| format!("the Router advertised no Codex model named `{selected}`"))?;
        if !model_supports_reasoning_effort(model, effort) {
            return Err(format!(
                "Codex model `{selected}` does not support configured reasoning effort \
                 `{effort}`; choose a supported model or change `model_reasoning_effort`"
            )
            .into());
        }
    }
    let compatible = described
        .into_iter()
        .filter(|model| {
            configured_effort.is_none_or(|effort| model_supports_reasoning_effort(model, effort))
        })
        .collect::<Vec<_>>();
    if compatible.is_empty() {
        let effort = configured_effort.expect("an unfiltered non-empty catalog stays non-empty");
        return Err(format!(
            "the live Codex catalog has no model supporting configured reasoning effort \
             `{effort}`; change `model_reasoning_effort` and retry"
        )
        .into());
    }
    let entries = compatible
        .iter()
        .enumerate()
        .map(|(index, model)| -> Result<serde_json::Value, AnyError> {
            let supported = model
                .supported_reasoning_levels
                .as_ref()
                .expect("metadata was validated before projection");
            Ok(json!({
                "slug": model.id,
                "display_name": model.id,
                "description": format!("{} via Link.Assistant.Router", model.owned_by),
                "default_reasoning_level": model.default_reasoning_level,
                "supported_reasoning_levels": supported,
                "shell_type": "unified_exec",
                "visibility": "list",
                "supported_in_api": true,
                "priority": i32::try_from(index).unwrap_or(i32::MAX),
                "availability_nux": null,
                "upgrade": null,
                "support_verbosity": false,
                "default_verbosity": null,
                "apply_patch_tool_type": "freeform",
                "truncation_policy": {"mode": "tokens", "limit": 10_000},
                "experimental_supported_tools": [],
                "base_instructions": ""
            }))
        })
        .collect::<Result<Vec<_>, _>>()?;
    let path = root.join("router-codex-models.json");
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({"models": entries}))?
    );
    crate::durable_file::atomic_write_owner_only(&path, rendered.as_bytes())?;
    Ok(path)
}

fn validate_codex_reasoning_metadata(model: &RouterModel) -> Result<(), AnyError> {
    let supported = model.supported_reasoning_levels.as_ref().ok_or_else(|| {
        format!(
            "the live Codex catalog omitted reasoning metadata for model `{}`; refusing to \
             launch because model selection could silently replace the user's configured \
             reasoning effort",
            model.id
        )
    })?;
    if let Some(default) = model.default_reasoning_level.as_deref()
        && !supported.iter().any(|level| level.effort == default)
    {
        return Err(format!(
            "the live Codex catalog reports unsupported default reasoning level `{default}` \
             for model `{}`",
            model.id
        )
        .into());
    }
    Ok(())
}

fn model_supports_reasoning_effort(model: &RouterModel, effort: &str) -> bool {
    model
        .supported_reasoning_levels
        .as_ref()
        .is_some_and(|levels| levels.iter().any(|level| level.effort == effort))
}
