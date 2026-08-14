use std::process::Command;

const ENTRYPOINT: &str = "docker/tunnel/entrypoint.sh";

fn run(environment: &[(&str, &str)]) -> std::process::Output {
    let mut command = Command::new("sh");
    command
        .arg(ENTRYPOINT)
        .env_clear()
        .env("PATH", "/usr/bin:/bin");
    for (name, value) in environment {
        command.env(name, value);
    }
    command.output().expect("run tunnel entrypoint")
}

#[test]
fn tunnel_entrypoint_names_each_missing_required_variable() {
    let complete = [
        ("TUNNEL_SSH_HOST", "far.example"),
        ("TUNNEL_SSH_USER", "router"),
        ("TUNNEL_REMOTE_PORT", "18080"),
        ("TUNNEL_SSH_KEY", "/dev/null"),
    ];
    for missing in complete.map(|(name, _)| name) {
        let environment = complete
            .iter()
            .copied()
            .filter(|(name, _)| *name != missing)
            .collect::<Vec<_>>();
        let output = run(&environment);
        assert!(!output.status.success(), "missing {missing} must fail");
        assert!(
            String::from_utf8_lossy(&output.stderr).contains(missing),
            "diagnostic must name {missing}: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

#[test]
fn tunnel_entrypoint_builds_a_restart_safe_reverse_forward() {
    let output = run(&[
        ("TUNNEL_SSH_HOST", "far.example"),
        ("TUNNEL_SSH_USER", "router"),
        ("TUNNEL_REMOTE_PORT", "18080"),
        ("TUNNEL_SSH_KEY", "/dev/null"),
        ("AUTOSSH_BIN", "echo"),
    ]);
    assert!(output.status.success());
    let command = String::from_utf8_lossy(&output.stdout);
    assert!(command.contains("ExitOnForwardFailure=yes"));
    assert!(command.contains("StrictHostKeyChecking=accept-new"));
    assert!(command.contains("UserKnownHostsFile=/home/tunnel/.ssh/known_hosts"));
    assert!(command.contains("ServerAliveInterval=30"));
    assert!(command.contains("127.0.0.1:18080:link-assistant-router:8080"));
    assert!(command.contains("router@far.example"));
}
