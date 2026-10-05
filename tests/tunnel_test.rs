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
        ("TUNNEL_KNOWN_HOSTS", "/etc/hosts"),
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
        ("TUNNEL_KNOWN_HOSTS", "/etc/hosts"),
        ("AUTOSSH_BIN", "echo"),
    ]);
    assert!(output.status.success());
    let command = String::from_utf8_lossy(&output.stdout);
    assert!(command.contains("ExitOnForwardFailure=yes"));
    assert!(command.contains("StrictHostKeyChecking=yes"));
    assert!(command.contains("UserKnownHostsFile=/etc/hosts"));
    assert!(command.contains("ServerAliveInterval=30"));
    assert!(command.contains("127.0.0.1:18080:link-assistant-router:8080"));
    assert!(command.contains("router@far.example"));
}

/// Issue #682: forward mode reaches a remote Router from this machine on
/// loopback only, with the far side's host key pinned.
#[test]
fn tunnel_forward_mode_binds_loopback_only_and_pins_the_host_key() {
    let output = run(&[
        ("TUNNEL_MODE", "forward"),
        ("TUNNEL_SSH_HOST", "far.example"),
        ("TUNNEL_SSH_USER", "router"),
        ("TUNNEL_LOCAL_PORT", "18080"),
        ("TUNNEL_TARGET_PORT", "8080"),
        ("TUNNEL_SSH_KEY", "/dev/null"),
        ("TUNNEL_KNOWN_HOSTS", "/etc/hosts"),
        ("AUTOSSH_BIN", "echo"),
    ]);
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let command = String::from_utf8_lossy(&output.stdout);
    assert!(
        command.contains("-L 127.0.0.1:18080:127.0.0.1:8080"),
        "{command}"
    );
    assert!(!command.contains("-R "), "{command}");
    assert!(!command.contains("0.0.0.0"), "{command}");
    assert!(!command.contains("GatewayPorts=yes"), "{command}");
    assert!(command.contains("StrictHostKeyChecking=yes"), "{command}");
    assert!(!command.contains("accept-new"), "{command}");
    assert!(
        command.contains("UserKnownHostsFile=/etc/hosts"),
        "{command}"
    );
}

#[test]
fn tunnel_forward_mode_needs_a_local_port_and_refuses_unknown_modes() {
    let base = [
        ("TUNNEL_SSH_HOST", "far.example"),
        ("TUNNEL_SSH_USER", "router"),
        ("TUNNEL_SSH_KEY", "/dev/null"),
        ("TUNNEL_KNOWN_HOSTS", "/etc/hosts"),
        ("AUTOSSH_BIN", "echo"),
    ];
    let mut forward = base.to_vec();
    forward.push(("TUNNEL_MODE", "forward"));
    let output = run(&forward);
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("TUNNEL_LOCAL_PORT"));

    let mut sideways = base.to_vec();
    sideways.push(("TUNNEL_MODE", "sideways"));
    sideways.push(("TUNNEL_REMOTE_PORT", "18080"));
    let output = run(&sideways);
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("TUNNEL_MODE"));
}

/// A bind-mounted key with a loose mode is used through a private copy;
/// a key that is already private is used where it is.
#[cfg(unix)]
#[test]
fn tunnel_copies_a_loosely_permissioned_key_to_a_private_file() {
    use std::os::unix::fs::PermissionsExt as _;
    let directory = tempfile::tempdir().unwrap();
    let key = directory.path().join("key");
    std::fs::write(&key, "not-a-real-key\n").unwrap();
    let key_text = key.display().to_string();
    let tmp = directory.path().join("tmp");
    std::fs::create_dir(&tmp).unwrap();
    let tmp_text = tmp.display().to_string();
    let identity = |mode: u32| {
        std::fs::set_permissions(&key, std::fs::Permissions::from_mode(mode)).unwrap();
        let output = run(&[
            ("TUNNEL_SSH_HOST", "far.example"),
            ("TUNNEL_SSH_USER", "router"),
            ("TUNNEL_REMOTE_PORT", "18080"),
            ("TUNNEL_SSH_KEY", &key_text),
            ("TUNNEL_KNOWN_HOSTS", "/etc/hosts"),
            ("TMPDIR", &tmp_text),
            ("AUTOSSH_BIN", "echo"),
        ]);
        assert!(output.status.success(), "{output:?}");
        let command = String::from_utf8_lossy(&output.stdout).into_owned();
        let mut words = command.split_whitespace();
        words.find(|word| *word == "-i");
        std::path::PathBuf::from(words.next().expect("an identity"))
    };

    let copied = identity(0o644);
    assert_ne!(copied, key);
    assert!(copied.starts_with(&tmp), "{}", copied.display());
    let mode = std::fs::metadata(&copied).unwrap().permissions().mode() & 0o777;
    assert_eq!(mode, 0o600);
    assert_eq!(
        std::fs::read_to_string(&copied).unwrap(),
        "not-a-real-key\n"
    );

    assert_eq!(identity(0o600), key);
}
