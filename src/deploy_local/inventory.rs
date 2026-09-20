//! Read-only active-run inventory for local rolling updates.

use link_assistant_router::storage::TokenRecord;
use serde::Serialize;

#[derive(Clone, Copy, Debug, Eq, PartialEq, Serialize)]
#[serde(rename_all = "kebab-case")]
pub(super) enum RunState {
    LivePinned,
    StalePinned,
    LegacyUnpinned,
}

impl RunState {
    pub(super) const fn as_str(self) -> &'static str {
        match self {
            Self::LivePinned => "live-pinned",
            Self::StalePinned => "stale-pinned",
            Self::LegacyUnpinned => "legacy-unpinned",
        }
    }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize)]
pub(super) struct Run {
    pub id: String,
    pub label: String,
    pub state: RunState,
    pub lease_expires_at: Option<i64>,
}

#[derive(Clone, Debug, Default, Eq, PartialEq)]
pub(super) struct Inventory {
    pub runs: Vec<Run>,
}

impl Inventory {
    pub(super) fn from_json(rendered: &str, now: i64) -> Result<Self, String> {
        let records: Vec<TokenRecord> = serde_json::from_str(rendered)
            .map_err(|error| format!("token inventory was not valid JSON: {error}"))?;
        let runs = records
            .into_iter()
            .filter(|record| record.ephemeral && !record.revoked && record.expires_at > now)
            .map(|record| {
                let pinned = !record.model_policy.allowed_models.is_empty();
                let live = record
                    .run_lease_expires_at
                    .is_some_and(|expires_at| expires_at >= now);
                let state = if !pinned {
                    RunState::LegacyUnpinned
                } else if live {
                    RunState::LivePinned
                } else {
                    RunState::StalePinned
                };
                Run {
                    id: record.id,
                    label: record.label,
                    state,
                    lease_expires_at: record.run_lease_expires_at,
                }
            })
            .collect();
        Ok(Self { runs })
    }

    pub(super) fn blockers(&self) -> impl Iterator<Item = &Run> {
        self.runs
            .iter()
            .filter(|run| run.state == RunState::LegacyUnpinned)
    }

    pub(super) fn print(&self) {
        let live = self
            .runs
            .iter()
            .filter(|run| run.state == RunState::LivePinned)
            .count();
        let stale = self
            .runs
            .iter()
            .filter(|run| run.state == RunState::StalePinned)
            .count();
        let blockers = self.blockers().count();
        println!("run_inventory live={live} stale={stale} blockers={blockers}");
        for run in &self.runs {
            // JSON escaping keeps arbitrary labels on one machine-readable
            // line. Token values are not stored in TokenRecord and therefore
            // cannot leak through this report.
            println!(
                "run {}",
                serde_json::json!({
                    "id": run.id,
                    "label": run.label,
                    "state": run.state.as_str(),
                    "lease_expires_at": run.lease_expires_at,
                })
            );
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn legacy_records_block_while_stale_pinned_credentials_do_not() {
        let inventory = Inventory::from_json(
            r#"[
              {"id":"legacy","label":"old claude","issued_at":1,"expires_at":200,
               "revoked":false,"ephemeral":true},
              {"id":"live","label":"codex","issued_at":1,"expires_at":200,
               "revoked":false,"ephemeral":true,"run_lease_expires_at":150,
               "model_policy":{"allowed_models":["gpt-current"]}},
              {"id":"stale","label":"scheduled","issued_at":1,"expires_at":200,
               "revoked":false,"ephemeral":true,"run_lease_expires_at":99,
               "model_policy":{"allowed_models":["gpt-current"]}},
              {"id":"expired","label":"gone","issued_at":1,"expires_at":99,
               "revoked":false,"ephemeral":true},
              {"id":"revoked","label":"gone","issued_at":1,"expires_at":200,
               "revoked":true,"ephemeral":true}
            ]"#,
            100,
        )
        .unwrap();

        assert_eq!(inventory.runs.len(), 3);
        assert_eq!(inventory.runs[0].state, RunState::LegacyUnpinned);
        assert_eq!(inventory.runs[1].state, RunState::LivePinned);
        assert_eq!(inventory.runs[2].state, RunState::StalePinned);
        assert_eq!(
            inventory
                .blockers()
                .map(|run| run.id.as_str())
                .collect::<Vec<_>>(),
            ["legacy"]
        );
    }
}
