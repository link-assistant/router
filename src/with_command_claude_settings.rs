//! Process-local Claude settings for `router with`.
//!
//! Split from `with_command.rs` to stay inside the repository's per-file line
//! limit.

use std::fs;
use std::path::Path;
use std::process::Command;

use serde_json::{Value, json};

use super::AnyError;
use crate::clients::{ClientKind, RouterModel};

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
/// thinking trace visible (issue #560), and the `/model` picker rows for every
/// exact model this client's authorized live catalog can serve (issue #621).
///
/// Claude's own gateway discovery keeps only `claude`/`anthropic`-shaped IDs,
/// so the picker is filled from the Router catalog instead: every usable row,
/// Anthropic's exact IDs included when Anthropic is authorized. A row is
/// `{label, model}`, which Claude Code accepts on its own; `behavesAs` is
/// optional there and is added only when Router holds verified capability
/// metadata for that exact ID. Requiring it made a z.ai-only catalog — whose
/// rows never carry it — refuse to launch at all (issue #620). Nothing is
/// inferred from a model's spelling.
///
/// This is a command-line setting for this process only: neither the
/// Router-owned profile nor the user's profile is rewritten, so the next
/// launch lists whatever the authorized catalog holds then.
pub(super) fn append_claude_model_picker(
    command: &mut Command,
    models: &[RouterModel],
) -> Result<(), AnyError> {
    let (options, has_anthropic) = claude_model_picker_options(models);
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

/// The picker rows for `models`, and whether Anthropic is among them.
///
/// Built-in family names are left to Claude's own rows. Duplicate catalog rows
/// for one exact ID collapse into one picker row; their capability metadata
/// is kept only when every row agrees, since a disagreement is not evidence.
fn claude_model_picker_options(models: &[RouterModel]) -> (Vec<Value>, bool) {
    const BUILT_INS: [&str; 4] = ["default", "opus", "sonnet", "haiku"];

    let usable = crate::clients::usable_models(ClientKind::ClaudeCode, models);
    let has_anthropic = usable
        .iter()
        .any(|model| model.owned_by == crate::clients::ANTHROPIC_MODEL_OWNER);
    let mut candidates = usable
        .into_iter()
        .filter(|model| {
            let folded = model.id.trim().to_ascii_lowercase();
            !folded.is_empty() && !BUILT_INS.contains(&folded.as_str())
        })
        .collect::<Vec<_>>();
    // Anthropic's own models first, then every other provider; each by ID.
    candidates.sort_by(|left, right| {
        let other = |model: &RouterModel| model.owned_by != crate::clients::ANTHROPIC_MODEL_OWNER;
        other(left)
            .cmp(&other(right))
            .then_with(|| left.id.cmp(&right.id))
    });
    let mut rows: Vec<(String, Option<String>)> = Vec::with_capacity(candidates.len());
    let unavailable = candidates
        .iter()
        .filter(|model| !model.is_servable())
        .map(|model| model.id.clone())
        .collect::<Vec<_>>();
    for model in candidates {
        let behaves_as = model
            .client_capabilities
            .claude
            .as_ref()
            .filter(|capability| {
                !capability.behaves_as.trim().is_empty() && !capability.source.trim().is_empty()
            })
            .map(|capability| capability.behaves_as.clone());
        match rows.iter_mut().find(|(id, _)| id == &model.id) {
            Some((_, existing)) if *existing != behaves_as => *existing = None,
            Some(_) => {}
            None => rows.push((model.id.clone(), behaves_as)),
        }
    }
    let options = rows
        .into_iter()
        .map(|(id, behaves_as)| {
            let mut row = serde_json::Map::new();
            // The row stays selectable — z.ai still lists it — but the label
            // says Router cannot serve it right now (issue #657).
            let label = if unavailable.contains(&id) {
                format!("{id} (unavailable)")
            } else {
                id.clone()
            };
            row.insert("label".into(), json!(label));
            row.insert("model".into(), json!(id));
            if let Some(behaves_as) = behaves_as {
                row.insert("behavesAs".into(), json!(behaves_as));
            }
            Value::Object(row)
        })
        .collect();
    (options, has_anthropic)
}

/// A warning for a launch whose model Router cannot serve right now, naming a
/// servable alternative (issue #657).
///
/// The launch is not refused: the request still reaches the provider, which
/// may have been recharged, and is answered with the provider's reason if not.
/// What the user must not get is a silent session on a model that cannot
/// answer.
///
/// The alternative is the user's last working selection when one is recorded
/// and still servable, otherwise the flagship of the servable catalog (issue
/// #684): the alphabetically first row was routinely the smallest model.
pub(super) fn claude_unavailable_model_warning(
    model: Option<&str>,
    models: &[RouterModel],
    last_working: Option<&str>,
) -> Option<String> {
    let model = model?.trim();
    let reason = models
        .iter()
        .filter(|candidate| candidate.id == model)
        .find_map(|candidate| candidate.router_unavailable_reason.as_deref())?;
    let usable = crate::clients::usable_models(ClientKind::ClaudeCode, models);
    let servable: Vec<&RouterModel> = usable
        .iter()
        .filter(|candidate| candidate.is_servable() && candidate.id != model)
        .collect();
    let remembered = last_working
        .map(str::trim)
        .and_then(|last| servable.iter().find(|candidate| candidate.id == last));
    let alternative = remembered
        .copied()
        .or_else(|| {
            servable
                .iter()
                .copied()
                .max_by(|left, right| flagship_order(left, right))
        })
        .map(|candidate| candidate.id.clone());
    let advice = alternative.map_or_else(
        || "no other model in this client's catalog is currently servable".to_string(),
        |alternative| {
            let why = if remembered.is_some() {
                "your last working selection"
            } else {
                "the most capable servable model"
            };
            format!(
                "choose another model with /model or --model, for example `{alternative}` \
                 ({why})"
            )
        },
    );
    Some(format!(
        "warning: Claude model `{model}` cannot be served right now: {reason}; {advice}"
    ))
}

/// Where a Router-owned profile remembers the last model a launch could serve.
const LAST_WORKING_MODEL: &str = "router-last-working-model";

/// The launch warning, reading and maintaining the last working selection in
/// the profile `root` (issue #684). A launch on a servable model records it,
/// so the next exhausted launch suggests what the user last used rather than a
/// model they never chose.
pub(super) fn claude_launch_model_warning(
    root: &Path,
    launched: Option<&str>,
    models: &[RouterModel],
) -> Option<String> {
    let path = root.join(LAST_WORKING_MODEL);
    let last_working = fs::read_to_string(&path).ok();
    let warning = claude_unavailable_model_warning(launched, models, last_working.as_deref());
    if warning.is_none()
        && let Some(launched) = launched.map(str::trim)
        && models
            .iter()
            .any(|candidate| candidate.id == launched && candidate.is_servable())
        && last_working.as_deref().map(str::trim) != Some(launched)
    {
        // Best effort: a profile that cannot be written only loses the hint.
        let _ = fs::write(&path, launched);
    }
    warning
}

/// Claude family rank: the flagship family first.
fn family_rank(id: &str) -> usize {
    let id = id.to_ascii_lowercase();
    ["haiku", "sonnet", "opus"]
        .iter()
        .position(|family| id.contains(family))
        .map_or(0, |position| position + 1)
}

/// The numeric version in a model id, ignoring date stamps such as
/// `20250514`: `claude-opus-4-1-20250805` is version `[4, 1]`.
fn version_of(id: &str) -> Vec<u32> {
    id.split(|character: char| !character.is_ascii_digit())
        .filter(|part| !part.is_empty() && part.len() < 6)
        .filter_map(|part| part.parse().ok())
        .collect()
}

/// Order by family, then version, then the provider's creation time, then id.
pub(super) fn flagship_order(left: &RouterModel, right: &RouterModel) -> std::cmp::Ordering {
    family_rank(&left.id)
        .cmp(&family_rank(&right.id))
        .then_with(|| version_of(&left.id).cmp(&version_of(&right.id)))
        .then_with(|| left.provider_created_at.cmp(&right.provider_created_at))
        .then_with(|| right.id.cmp(&left.id))
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
/// The Router-owned profile is `CLAUDE_CONFIG_DIR` itself, so Claude keeps its
/// user settings, and a `/model` choice, directly in it. Reading the
/// `.claude/settings.json` a `$HOME`-rooted layout would use saw no choice at
/// all: the pin overrode it, and a choice the catalog no longer authorizes was
/// never refused (issue #630).
pub(super) fn claude_saved_model_selection(
    root: &Path,
    extends_user_configuration: bool,
    user_settings: Option<&Path>,
) -> Option<ClaudeModelSelection> {
    // Under `--extend-global-config` the client reads the user's real profile.
    // The caller resolved the file Claude will actually open from its own
    // environment, so nothing here reads the process environment and a test
    // cannot inherit a real profile (#613).
    let settings = if extends_user_configuration {
        user_settings?.to_path_buf()
    } else {
        root.join("settings.json")
    };
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
