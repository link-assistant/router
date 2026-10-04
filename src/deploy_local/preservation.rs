//! Issued-token catalog and credential-source continuity before local cutover.

use std::path::Path;

use link_assistant_router::deployment_preservation::{Catalog, compare, probe_token, usable};
use link_assistant_router::storage::TokenRecord;
use serde_json::json;

use super::claude_share::Provision;
use super::{Coordinator, Existing, LEGACY};

const CATALOG_ENV: &str = "ROUTER_PRESERVATION_TOKEN";
const CATALOG_SCRIPT: &str = "const r=await fetch('http://127.0.0.1:8080/api/models',{signal:AbortSignal.timeout(5000),headers:{authorization:'Bearer '+process.env.ROUTER_PRESERVATION_TOKEN}});if(r.status!==200)process.exit(2);const b=await r.json();if(!Array.isArray(b.data))process.exit(3);console.log(JSON.stringify(b.data.map(m=>String(m.owned_by||'')+'/'+m.id).sort()))";

pub(super) struct Baseline {
    pub records: Vec<TokenRecord>,
    pub catalogs: Vec<Catalog>,
}

fn same_directory(actual: &str, expected: &Path) -> bool {
    let actual = Path::new(actual);
    match (actual.canonicalize(), expected.canonicalize()) {
        (Ok(actual), Ok(expected)) => actual == expected,
        _ => actual == expected,
    }
}

impl Coordinator<'_> {
    fn preservation_failure(&self, reason: &str) -> Result<(), String> {
        println!(
            "{}",
            json!({"schema":"link-assistant-router/preservation/v1","status":if self.accept_access_loss {"loss-accepted"} else {"refused"},"reason":reason,"access_loss_explicitly_accepted":self.accept_access_loss,"credentials_copied":false,"data_restore_proven":false})
        );
        if self.accept_access_loss {
            Ok(())
        } else {
            Err(format!(
                "{reason}; use --accept-access-loss only to authorize this reported loss"
            ))
        }
    }

    pub(super) fn preservation_baseline(&self, existing: &Existing) -> Result<Baseline, String> {
        let backend = match existing {
            Existing::Absent => {
                let data = self.root.join("data");
                if std::fs::read_dir(&data).is_ok_and(|mut entries| entries.next().is_some()) {
                    let store = link_assistant_router::storage::build_token_store_read_only(
                        link_assistant_router::config::StoragePolicy::Both,
                        &data,
                    )
                    .map_err(|_| "preexisting token store cannot be read")?;
                    let records = store
                        .list()
                        .map_err(|_| "preexisting token inventory unavailable")?;
                    self.preservation_checkpoint(&records)?;
                }
                return Ok(Baseline {
                    records: Vec::new(),
                    catalogs: Vec::new(),
                });
            }
            Existing::Legacy => LEGACY,
            Existing::Managed(active) => &active.backend,
        };
        // These source paths select the live refresh owner, not credential bytes.
        let expected = match &self.claude {
            Provision::Shared { home, .. } => home.clone(),
            Provision::Isolated => self.root.join("credentials"),
            Provision::Refused(reason) => return Err(reason.clone()),
        };
        for (destination, expected) in [
            ("/data/router", self.root.join("data")),
            ("/data/claude", expected),
        ] {
            let actual = self.docker.mount_source(backend, destination);
            // An empty isolated credential directory has no connection to
            // lose; selecting a live source is an additive change.
            let adding_source = destination == "/data/claude"
                && actual.as_deref().is_some_and(|source| {
                    std::fs::read_dir(source).is_ok_and(|mut entries| entries.next().is_none())
                });
            if !adding_source && !actual.is_some_and(|actual| same_directory(&actual, &expected)) {
                self.preservation_failure(&format!("credential/data source differs or is unavailable at {destination}; preserving bytes elsewhere does not preserve the source connection"))?;
            }
        }
        let all_records: Vec<TokenRecord> =
            serde_json::from_str(&self.docker.token_inventory(backend)?)
                .map_err(|_| "previous issued-token inventory is invalid")?;
        let records: Vec<_> = all_records
            .iter()
            .filter(|record| usable(record, chrono::Utc::now().timestamp()))
            .cloned()
            .collect();
        if records.len() > 512 {
            return Err(
                "issued-token catalog inventory exceeds the bounded 512-token verification budget"
                    .into(),
            );
        }
        let catalogs = match self.preservation_catalogs(backend, &records) {
            Ok(catalogs) => catalogs,
            Err(reason) => {
                self.preservation_failure(&reason)?;
                Vec::new()
            }
        };
        let source_secret = self.docker.env_value(backend, "TOKEN_SECRET")
            .ok_or("previous signing-secret identity unavailable for data checkpoint; no candidate started")?;
        let checkpoint = self.preservation_checkpoint_using(&all_records, &source_secret)?;
        println!(
            "{}",
            json!({"schema":"link-assistant-router/preservation/v1","status":"baseline","catalogs":catalogs,"checkpoint":checkpoint,"checkpoint_scope":"logical token state, encrypted static provider configuration and registered project/session files (request logs stay in place); individual-file/export boundaries","credential_source":"shared-original-directory","credentials_copied":false,"profiles_projects_sessions":"external client homes remain outside deployment mutation scope","rollback_scope":"previous backend and relay; offline additive/replacement checkpoint restore; OAuth is never replayed"})
        );
        Ok(Baseline { records, catalogs })
    }

    pub(super) fn preservation_checkpoint(
        &self,
        records: &[TokenRecord],
    ) -> Result<Option<std::path::PathBuf>, String> {
        self.preservation_checkpoint_using(records, self.token_secret)
    }

    pub(super) fn preservation_checkpoint_using(
        &self,
        records: &[TokenRecord],
        source_secret: &str,
    ) -> Result<Option<std::path::PathBuf>, String> {
        match super::data_backup::capture(self.root, records, source_secret) {
            Ok(path) => {
                println!(
                    "{}",
                    json!({"schema":"link-assistant-router/preservation/v1","status":"data-checkpoint","checkpoint":path,"oauth_copied":false,"global_atomic_snapshot":false})
                );
                Ok(Some(path))
            }
            Err(error) => {
                // Keep the cause: an operator cannot act on "failed" (issue #658).
                let reason = super::data_backup::checkpoint_remedy(&error);
                println!(
                    "{}",
                    json!({"schema":"link-assistant-router/preservation/v1","status":"refused","blocker":"data-checkpoint","reason":format!("{reason}; no candidate started"),"oauth_copied":false})
                );
                Err(format!(
                    "{reason}; provider access-loss permission does not authorize losing state"
                ))
            }
        }
    }

    pub(super) fn preservation_catalogs(
        &self,
        backend: &str,
        records: &[TokenRecord],
    ) -> Result<Vec<Catalog>, String> {
        records
            .iter()
            .map(|record| {
                let token = probe_token(record, self.token_secret)?;
                let rendered = self
                    .docker
                    .exec_with_env(
                        backend,
                        &[(CATALOG_ENV, &token)],
                        &["bun", "-e", CATALOG_SCRIPT],
                    )
                    .map_err(|_| {
                        format!("token-authorized catalog unavailable for {}", record.id)
                    })?;
                let models = serde_json::from_str(&rendered)
                    .map_err(|_| "token-authorized catalog response is invalid")?;
                Ok(Catalog {
                    token_id: record.id.clone(),
                    client_kind: record.client_kind.clone().expect("usable binding"),
                    models,
                })
            })
            .collect()
    }

    pub(super) fn preservation_candidate(
        &self,
        candidate: &str,
        baseline: &Baseline,
    ) -> Result<(), String> {
        let result = self
            .preservation_catalogs(candidate, &baseline.records)
            .and_then(|catalogs| compare(&baseline.catalogs, &catalogs));
        let preserved = result.is_ok();
        if let Err(reason) = result {
            self.preservation_failure(&reason)?;
        }
        println!(
            "{}",
            json!({"schema":"link-assistant-router/preservation/v1","status":if preserved {"candidate-checked"} else {"loss-accepted"},"issued_bound_tokens":baseline.records.len(),"credentials_copied":false,"catalog_comparison":if preserved {"per-token subset"} else {"failed"},"data_restore_proven":false})
        );
        Ok(())
    }
}
