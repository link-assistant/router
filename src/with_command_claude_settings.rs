//! Process-local Claude settings for `router with`.
//!
//! Split from `with_command.rs` to stay inside the repository's per-file line
//! limit.

use std::process::Command;

use serde_json::{Value, json};

use super::AnyError;
use crate::clients::{ClientKind, RouterModel};

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

    let mut candidates = crate::clients::usable_models(ClientKind::ClaudeCode, models)
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
                "replaceBuiltInOptions": false,
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
