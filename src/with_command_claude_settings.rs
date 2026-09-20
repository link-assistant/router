//! Process-local Claude settings for `router with`.
//!
//! Split from `with_command.rs` to stay inside the repository's per-file line
//! limit.

use std::fs;
use std::path::Path;
use std::process::Command;

use serde_json::{Value, json};

use super::AnyError;
use crate::clients::{ClientKind, ClientManager, RouterModel};

pub(super) struct ClaudeModelSelection {
    pub model: String,
    pub reason: String,
}

/// A built-in Claude family is unavailable when this token has no Anthropic
/// model in its live catalog. Concrete IDs are never classified by spelling;
/// their exact authenticated catalog row decides ownership.
pub(super) fn unavailable_native_claude_model<'a>(
    model: &'a str,
    models: &[RouterModel],
) -> Option<&'a str> {
    let family = model
        .trim()
        .split_once('[')
        .map_or_else(|| model.trim(), |(family, _)| family)
        .to_ascii_lowercase();
    let native = matches!(family.as_str(), "opus" | "sonnet" | "haiku");
    let has_anthropic = crate::clients::usable_models(ClientKind::ClaudeCode, models)
        .iter()
        .any(|candidate| candidate.owned_by == crate::clients::ANTHROPIC_MODEL_OWNER);
    (native && !has_anthropic).then_some(model)
}

pub(super) fn validate_claude_model_selection(
    selection: ClaudeModelSelection,
    models: &[RouterModel],
) -> Result<Option<String>, AnyError> {
    let model = selection.model.trim();
    let catalog_model = model
        .split_once('[')
        .map_or(model, |(model, _)| model)
        .trim();
    let has_anthropic = crate::clients::usable_models(ClientKind::ClaudeCode, models)
        .iter()
        .any(|candidate| candidate.owned_by == crate::clients::ANTHROPIC_MODEL_OWNER);
    // Claude's saved `default` is semantic rather than an upstream ID. On a
    // z.ai-only catalog, Router's main/subagent fallback is how that semantic
    // choice remains usable.
    if model.eq_ignore_ascii_case("default") && !has_anthropic {
        return Ok(None);
    }
    if let Some(unavailable) = unavailable_native_claude_model(model, models) {
        return Err(format!(
            "Claude model `{unavailable}` requires an Anthropic provider, but this client's \
             authorized live catalog contains none; choose one of the visible exact models with \
             /model, configure Anthropic, or clear the stale model selection"
        )
        .into());
    }
    let native_family = ["default", "opus", "sonnet", "haiku"]
        .iter()
        .any(|family| catalog_model.eq_ignore_ascii_case(family));
    let exact = crate::clients::usable_models(ClientKind::ClaudeCode, models)
        .iter()
        .any(|candidate| candidate.id == catalog_model)
        && !model.ends_with("[1m]");
    let context_variant = crate::clients::claude_context_variant_is_authorized(models, model);
    if (native_family && has_anthropic) || exact || context_variant {
        return Ok(Some(selection.reason));
    }
    Err(format!(
        "Claude model `{model}` is not in this client's authorized live catalog; choose one of \
         the visible exact models with /model or clear the stale model selection"
    )
    .into())
}

/// Build the process-local Claude settings a Router-directed launch needs.
///
/// Two things live here: the presentation default that keeps a completed
/// thinking trace visible (issue #560), and the exact compatible model IDs that
/// Claude's gateway discovery filter removes from its native picker.
///
/// This is a command-line setting for this process only: neither the
/// Router-owned profile nor the user's profile is rewritten.
pub(super) fn append_claude_model_picker(
    command: &mut Command,
    models: &[RouterModel],
) -> Result<(), AnyError> {
    const BUILT_INS: [&str; 4] = ["default", "opus", "sonnet", "haiku"];

    let usable = crate::clients::usable_models(ClientKind::ClaudeCode, models);
    let has_anthropic = usable
        .iter()
        .any(|model| model.owned_by == crate::clients::ANTHROPIC_MODEL_OWNER);
    let mut candidates = usable
        .into_iter()
        .filter(|model| {
            let folded = model.id.to_ascii_lowercase();
            model.owned_by == crate::clients::ZAI_MODEL_OWNER
                && !BUILT_INS.contains(&folded.as_str())
        })
        .collect::<Vec<_>>();
    candidates.sort_by(|left, right| left.id.cmp(&right.id));
    let mut options = Vec::with_capacity(candidates.len());
    let mut previous: Option<(String, String, String)> = None;
    for model in candidates {
        let Some(capability) = model.client_capabilities.claude else {
            return Err(format!(
                "Claude model `{}` has no verified capability metadata; update Router or the provider adapter before selecting it",
                model.id
            )
            .into());
        };
        if capability.behaves_as.trim().is_empty() || capability.source.trim().is_empty() {
            return Err(format!(
                "Claude model `{}` has incomplete capability metadata; update Router or the provider adapter before selecting it",
                model.id
            )
            .into());
        }
        if let Some((id, behaves_as, source)) = &previous
            && id == &model.id
        {
            if behaves_as != &capability.behaves_as || source != &capability.source {
                return Err(format!(
                    "Claude model `{}` has ambiguous capability metadata; update the provider adapter before selecting it",
                    model.id
                )
                .into());
            }
            continue;
        }
        options.push(json!({
            "label": model.id,
            "model": model.id,
            "behavesAs": capability.behaves_as,
        }));
        previous = Some((model.id, capability.behaves_as, capability.source));
    }
    // Keeping a completed thinking trace on screen is a presentation default,
    // and the Router-owned profile starts empty by design (issue #536) — so it
    // carries none of the preferences the user's normal Claude profile has.
    // Genuine thinking was therefore visible while a response streamed and
    // collapsed to `Thought for Ns` the moment it finished, only under a bare
    // `router with claude` (issue #560). This restores the presentation the
    // same user gets from their own profile; it changes nothing about the
    // protocol, so a response that carries no thinking still shows none.
    //
    // Written unconditionally, not only when the picker has rows: a deployment
    // whose catalog needs no extra picker options is exactly as affected.
    let mut settings = serde_json::Map::new();
    settings.insert("verbose".into(), json!(true));
    if !options.is_empty() {
        settings.insert(
            "modelPicker".into(),
            json!({
                "options": options,
                // Native family rows are usable only when this exact client's
                // authorized live catalog contains Anthropic. In a z.ai-only
                // catalog, retaining them sends the next prompt to a provider
                // the token cannot reach (issue #577).
                "replaceBuiltInOptions": !has_anthropic,
            }),
        );
    }
    // Router's own `--settings` goes on before the user's forwarded arguments,
    // so an explicit `--settings` or `--verbose` of their own still wins: the
    // last occurrence is the one Claude applies.
    command
        .arg("--settings")
        .arg(serde_json::to_string(&Value::Object(settings))?);
    Ok(())
}

/// The Claude model the client itself has saved as its default, if any.
///
/// The returned exact model is validated against the authorized live catalog
/// before its human-readable reason is used in Router's note. A wrapper-set
/// `ANTHROPIC_MODEL` outranks the client's own selection for every new session,
/// so pinning over a valid saved `/model` choice silently overrode the
/// documented way to pick a model (issue #563). The environment half of that
/// rule is resolved by the caller.
///
/// The profile consulted is the one this launch actually hands the client — the
/// Router-owned one by default, the user's own under `--extend-global-config`.
pub(super) fn claude_saved_model_selection(
    manager: &ClientManager,
    root: &Path,
    extends_user_configuration: bool,
) -> Option<ClaudeModelSelection> {
    // Under `--extend-global-config` the client reads the user's real profile,
    // which this manager is not rooted at; ask the environment's own manager so
    // the saved default is read from the file Claude will actually open.
    let settings = if extends_user_configuration {
        ClientManager::from_env()
            .ok()
            .map(|manager| manager.config_path(ClientKind::ClaudeCode))
    } else {
        debug_assert!(
            manager
                .config_path(ClientKind::ClaudeCode)
                .starts_with(root),
            "the isolated manager must be rooted at this run's profile"
        );
        Some(manager.config_path(ClientKind::ClaudeCode))
    }?;
    let saved = fs::read_to_string(settings).ok()?;
    // A profile Claude has not written yet, or one hand-edited into invalid
    // JSON, is not a selection. Failing open here would pin over a choice; the
    // safe reading of "cannot tell" is to leave the pin to the catalog.
    let document: serde_json::Value = serde_json::from_str(&saved).ok()?;
    let model = document.get("model")?.as_str()?.trim();
    (!model.is_empty()).then(|| ClaudeModelSelection {
        model: model.to_string(),
        reason: format!("the model saved in your Claude profile ({model})"),
    })
}
