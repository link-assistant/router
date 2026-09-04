use super::*;

/// An import aimed at another router refuses and names it (issue #291).
#[test]
fn an_import_aimed_at_a_server_refuses_instead_of_answering_about_the_local_home() {
    let home = tempfile::tempdir().expect("temp home");
    let config = tempfile::tempdir().expect("config home");
    let claude_home = home.path().join(".claude");
    std::fs::create_dir_all(&claude_home).expect("source home");
    std::fs::write(
        claude_home.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"workstation","refreshToken":"r","expiresAt":4102444800000}}"#,
    )
    .expect("plant a login");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "import", "claude", "--server", "http://127.0.0.1:1"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");

    assert!(
        !output.status.success(),
        "an import that could not reach its target must not report success"
    );
    let seen = String::from_utf8_lossy(&output.stderr);
    assert!(
        seen.contains("127.0.0.1:1"),
        "the refusal must name the target that was asked for: {seen}"
    );
    assert!(
        !seen.contains("is already read from"),
        "the local home must not be described as though it were the target: {seen}"
    );
}

/// A persisted remote selection refuses a local import unless `--local` wins.
#[test]
fn a_persisted_selection_also_refuses_a_local_import() {
    let home = tempfile::tempdir().expect("temp home");
    let config = tempfile::tempdir().expect("config home");
    let claude_home = home.path().join(".claude");
    std::fs::create_dir_all(&claude_home).expect("source home");
    std::fs::write(
        claude_home.join(".credentials.json"),
        r#"{"claudeAiOauth":{"accessToken":"workstation","refreshToken":"r","expiresAt":4102444800000}}"#,
    )
    .expect("plant a login");
    let destination = tempfile::tempdir().expect("destination");

    let run = |args: &[&str], select: bool| {
        let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
        command
            .args(args)
            .env("XDG_CONFIG_HOME", config.path())
            .env("HOME", home.path())
            .env("CLAUDE_CODE_HOME", destination.path())
            .env("TOKEN_SECRET", "auth-cli-test-secret");
        if select {
            command.env("ROUTER_URL", "http://127.0.0.1:1");
        }
        command.output().expect("router CLI should run")
    };

    let selected = run(&["auth", "import", "claude"], true);
    assert!(!selected.status.success());
    assert!(!destination.path().join(".credentials.json").exists());

    let local = run(&["auth", "import", "claude", "--local"], true);
    assert!(
        !local.status.success(),
        "an unverified local candidate was imported: {}",
        String::from_utf8_lossy(&local.stderr)
    );
    assert!(!destination.path().join(".credentials.json").exists());
    assert!(
        String::from_utf8_lossy(&local.stderr).contains("candidate refresh chain"),
        "{local:?}"
    );
}
