//! Process-local Codex catalog projection for `router with`.

use std::path::{Path, PathBuf};

use serde_json::{Value, json};

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
    let mut listed = Vec::with_capacity(models.len());
    let mut omitted = Vec::new();
    for model in models {
        match validate_codex_reasoning_metadata(model) {
            Ok(()) => listed.push(model),
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
            "warning: omitted Codex model(s) with inconsistent reasoning metadata: {ids}; \
             the other models remain available"
        );
    }
    if listed.is_empty() {
        let ids = omitted
            .iter()
            .map(|(id, _)| *id)
            .collect::<Vec<_>>()
            .join(", ");
        return Err(format!(
            "the live Codex catalog has no model with consistent reasoning metadata; \
             omitted: {ids}"
        )
        .into());
    }
    if let (Some(effort), Some(selected)) = (configured_effort, selected_model) {
        let model = listed
            .iter()
            .copied()
            .find(|model| model.id == selected)
            .ok_or_else(|| format!("the Router advertised no Codex model named `{selected}`"))?;
        if !model_may_keep_reasoning_effort(model, effort) {
            return Err(format!(
                "Codex model `{selected}` does not support configured reasoning effort \
                 `{effort}`; choose a supported model or change `model_reasoning_effort`"
            )
            .into());
        }
    }
    let compatible = listed
        .into_iter()
        .filter(|model| {
            configured_effort.is_none_or(|effort| model_may_keep_reasoning_effort(model, effort))
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
        .map(|(index, model)| codex_entry(model, configured_effort, index))
        .collect::<Vec<_>>();
    let path = root.join("router-codex-models.json");
    let rendered = format!(
        "{}\n",
        serde_json::to_string_pretty(&json!({"models": entries}))?
    );
    crate::durable_file::atomic_write_owner_only(&path, rendered.as_bytes())?;
    Ok(path)
}

/// One Codex catalog entry for `model`.
///
/// A row whose provider publishes no reasoning metadata (every z.ai row today)
/// is listed rather than refused (issue #628): unknown is not unsupported. It
/// claims no levels, and its default is the user's configured effort, or none.
/// Codex 0.158 keeps an effort across `/model` only when the chosen row lists
/// it and otherwise falls back to that row's default, so this keeps the user's
/// setting on startup and on every switch without inventing a capability.
fn codex_entry(model: &RouterModel, configured_effort: Option<&str>, index: usize) -> Value {
    let Some(supported) = model.supported_reasoning_levels.as_ref() else {
        let mut entry = crate::codex_catalog::model_info(
            &crate::codex_catalog::ModelDescription {
                id: &model.id,
                display_name: &model.id,
                owner: &model.owned_by,
                default_reasoning_level: configured_effort.map(|effort| json!(effort)),
                supported_reasoning_levels: json!([]),
            },
            index,
        );
        entry["description"] = json!(format!(
            "{} via Link.Assistant.Router; reasoning metadata unavailable, so Codex keeps \
             your configured reasoning effort",
            model.owned_by
        ));
        return entry;
    };
    crate::codex_catalog::model_info(
        &crate::codex_catalog::ModelDescription {
            id: &model.id,
            display_name: &model.id,
            owner: &model.owned_by,
            default_reasoning_level: model.default_reasoning_level.clone().map(Value::String),
            supported_reasoning_levels: serde_json::to_value(supported)
                .expect("reasoning metadata serializes"),
        },
        index,
    )
}

/// Refuse metadata that contradicts itself. Absent metadata is not refused.
fn validate_codex_reasoning_metadata(model: &RouterModel) -> Result<(), AnyError> {
    let Some(supported) = model.supported_reasoning_levels.as_ref() else {
        return Ok(());
    };
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

/// Whether choosing `model` keeps `effort`: a listed level does, and so does a
/// row with unknown levels, which carries the effort as its default.
fn model_may_keep_reasoning_effort(model: &RouterModel, effort: &str) -> bool {
    model
        .supported_reasoning_levels
        .as_ref()
        .is_none_or(|levels| levels.iter().any(|level| level.effort == effort))
}
