//! Issue #659: status without `TOKEN_SECRET` reports what it can prove.

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
