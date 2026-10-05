//! Issue #659: status without `TOKEN_SECRET` reports what it can prove.
//! Issue #663: only a live lease is reported as a run that would be
//! interrupted.

use super::*;

const EXECUTABLE: &str = "/opt/router/bin/router";

fn serving(secret: SecretMatch, converged: bool, secret_unknown: bool) -> Plan {
    Plan {
        executable: PathBuf::from(EXECUTABLE),
        login: ClaudeLogin::Absent,
        from: None,
        record: Some(Host {
            version: 1,
            pid: 7,
            port: 18_080,
            executable: EXECUTABLE.into(),
            router_version: link_assistant_router::VERSION.into(),
            token_secret: "fingerprint".into(),
            runtime_env: None,
            previous_backend: None,
            started_at: 1,
        }),
        record_serving: true,
        secret,
        inventory: None,
        converged,
        secret_unknown,
        checkpoint: None,
        blockers: Vec::new(),
    }
}

#[test]
fn an_unsupplied_secret_leaves_a_serving_host_unknown_without_a_plan() {
    let plan = serving(SecretMatch::NotSupplied, false, true);
    assert!(plan.steps(18_080).is_empty());
    let line = plan.convergence();
    assert!(line.starts_with("converged=unknown reason="), "{line}");
    assert!(line.contains("TOKEN_SECRET was not supplied"), "{line}");
}

#[test]
fn a_known_state_keeps_its_boolean_and_plan() {
    let converged = serving(SecretMatch::Matches, true, false);
    assert!(converged.steps(18_080).is_empty());
    assert_eq!(converged.convergence(), "converged=true");
    let mut stopped = serving(SecretMatch::NotSupplied, false, false);
    stopped.record_serving = false;
    assert_eq!(
        stopped.steps(18_080),
        ["action=start-host listener=127.0.0.1:18080 validate=health,token_probe"]
    );
    assert_eq!(stopped.convergence(), "converged=false");
}

/// A wrapper started without `--model` that exited ten hours ago, one that is
/// still renewing its lease, and a record from before leases existed.
const RUNS: &str = r#"[
  {"id":"exited","label":"with-claude-0911","issued_at":1,"expires_at":4102444800,
   "revoked":false,"ephemeral":true,"run_lease_expires_at":1000},
  {"id":"running","label":"with-claude-1776","issued_at":1,"expires_at":4102444800,
   "revoked":false,"ephemeral":true,"run_lease_expires_at":4102444000},
  {"id":"pre-lease","label":"scheduled","issued_at":1,"expires_at":4102444800,
   "revoked":false,"ephemeral":true}
]"#;

#[test]
fn an_expired_unpinned_lease_does_not_block_and_only_live_runs_would_be_interrupted() {
    let mut plan = serving(SecretMatch::Matches, false, false);
    Coordinator::assess_runs(&mut plan, Ok(RUNS.to_string()));

    let states = plan
        .inventory
        .as_ref()
        .unwrap()
        .runs
        .iter()
        .map(|run| run.state.as_str())
        .collect::<Vec<_>>();
    assert_eq!(
        states,
        ["stale-unpinned", "live-unpinned", "legacy-unpinned"]
    );
    let blockers = plan
        .blockers
        .iter()
        .map(|blocker| (blocker.name, blocker.reason.as_str()))
        .collect::<Vec<_>>();
    assert_eq!(blockers.len(), 2, "{blockers:?}");
    assert_eq!(blockers[0].0, "live-run");
    assert!(blockers[0].1.contains("run running"), "{blockers:?}");
    assert!(blockers[0].1.ends_with("would be interrupted"));
    assert_eq!(blockers[1].0, "unleased-run");
    assert!(blockers[1].1.contains("run pre-lease"), "{blockers:?}");
    assert!(!blockers[1].1.contains("would be interrupted"));
    assert!(!blockers.iter().any(|(_, reason)| reason.contains("exited")));
}

#[test]
fn an_idle_deployment_whose_runs_all_expired_has_no_blocker() {
    let mut plan = serving(SecretMatch::Matches, false, false);
    let exited = r#"[{"id":"exited","label":"with-claude-0911","issued_at":1,
        "expires_at":4102444800,"revoked":false,"ephemeral":true,
        "run_lease_expires_at":1000}]"#;
    Coordinator::assess_runs(&mut plan, Ok(exited.to_string()));
    assert!(plan.blockers.is_empty());
}
