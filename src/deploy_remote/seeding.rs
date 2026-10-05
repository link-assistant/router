//! The coordinator half of `--seed-credential` (issue #681).
//!
//! Reads each login, marks its source `pending` before the document leaves
//! this machine, and settles the mark from the target's answer. The target
//! half is `seed_credentials_step` in the remote agent.

use link_assistant_router::deploy_config::Merged;
use link_assistant_router::deploy_seed::{self, Seed};
use serde_json::{Value, json};

/// This user's home: the vendor clients' conventional homes live under it.
fn user_home() -> Result<std::path::PathBuf, String> {
    std::env::var_os("HOME")
        .or_else(|| std::env::var_os("USERPROFILE"))
        .filter(|home| !home.is_empty())
        .map(std::path::PathBuf::from)
        .ok_or_else(|| "--seed-credential: HOME is not set".to_string())
}

/// Read every requested login. Nothing is marked or sent on error.
pub fn prepare(merged: &Merged, server: &str, token_secret: &str) -> Result<Vec<Seed>, String> {
    if merged.seed_credentials.is_empty() {
        return Ok(Vec::new());
    }
    let home = user_home()?;
    merged
        .seed_credentials
        .iter()
        .map(|provider| deploy_seed::prepare(*provider, &home, server, token_secret))
        .collect()
}

/// Mark every source `pending`: from here on this machine does not refresh
/// the chain, so a lost response can never leave two refreshers.
pub fn mark_pending(seeds: &[Seed], server: &str) -> Result<(), String> {
    seeds.iter().try_for_each(|seed| {
        seed.mark_pending(server).map_err(|error| {
            format!(
                "--seed-credential {}: could not mark the source handed over: {error}",
                seed.provider.as_str()
            )
        })
    })
}

/// Settle every mark from the target's `seed_credential` events, report
/// each on stderr, and return the `--json` entries.
pub fn settle(seeds: &[Seed], server: &str, events: &[Value]) -> Vec<Value> {
    seeds
        .iter()
        .map(|seed| {
            let action = events
                .iter()
                .filter(|event| {
                    event.get("event").and_then(Value::as_str) == Some("seed_credential")
                        && event.get("provider").and_then(Value::as_str)
                            == Some(seed.provider.as_str())
                        && event.get("fingerprint").and_then(Value::as_str)
                            == Some(seed.fingerprint.as_str())
                })
                .filter_map(|event| event.get("action").and_then(Value::as_str))
                .next_back();
            let local = seed.settle(server, action).unwrap_or_else(|error| {
                eprintln!(
                    "warning: --seed-credential {}: {error}; the source stays marked pending",
                    seed.provider.as_str()
                );
                "pending"
            });
            let action = action.unwrap_or("not-reached");
            eprintln!(
                "seed credential {}: target {action}; local source {local} ({})",
                seed.provider.as_str(),
                seed.path.display()
            );
            if local == "pending" {
                eprintln!(
                    "note: no answer for {} arrived; this machine will not refresh that login. \
                     Re-run the same deploy: the target's receipt settles it without a second copy",
                    seed.provider.as_str()
                );
            }
            json!({
                "provider": seed.provider.as_str(),
                "fingerprint": seed.fingerprint,
                "action": action,
                "local_source": local,
            })
        })
        .collect()
}
