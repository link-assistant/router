use super::*;

fn fake_claude(bin_dir: &std::path::Path) {
    fs::create_dir_all(bin_dir).expect("create fake bin directory");
    let path = bin_dir.join("claude");
    fs::write(
        &path,
        r#"#!/bin/sh
if [ "$1" = "--version" ]; then
  printf '2.1.255\n'
  exit 0
fi
printf '%s\n' "$@" > "$CAPTURE_ARGS"
printf 'MAX_THINKING_TOKENS=%s\n' "$MAX_THINKING_TOKENS" > "$CAPTURE_ENV"
exit 0
"#,
    )
    .expect("write fake Claude");
    fs::set_permissions(&path, fs::Permissions::from_mode(0o755))
        .expect("make fake Claude executable");
}

/// End to end, through a terminal, for the exact command issue #297 reported.
/// `router with claude --resume <id>` used to add `--model` and `--print`,
/// making a resumable session answer once and exit on a model nobody chose.
/// A pty preserves the interactive mode that exposed the regression.
#[test]
fn a_client_flag_starts_a_session_rather_than_a_one_shot_run() {
    use portable_pty::{CommandBuilder, PtySize, native_pty_system};
    let directory = tempfile::tempdir().expect("temporary test directory");
    let home = directory.path().join("home");
    let bin = directory.path().join("bin");
    let capture = directory.path().join("capture");
    fs::create_dir_all(&home).expect("create home");
    fs::create_dir_all(&capture).expect("create capture directory");
    fake_claude(&bin);
    let (server, requests) = mock_router();
    let token = bound_client_token("claude");
    let inherited_path = std::env::var_os("PATH").unwrap_or_default();
    let path =
        std::env::join_paths(std::iter::once(bin).chain(std::env::split_paths(&inherited_path)))
            .expect("compose PATH");
    let pty = native_pty_system()
        .openpty(PtySize::default())
        .expect("allocate a pty");
    let mut command = CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
    command.args([
        "--server",
        &server,
        "--token",
        &token,
        "claude",
        "--resume",
        "2a42a73e-19de-459a-8c24-c5e75abf9a65",
    ]);
    command.env("HOME", &home);
    command.env("XDG_CONFIG_HOME", home.join(".config"));
    command.env("PATH", path);
    command.env("CAPTURE_ARGS", capture.join("args"));
    command.env("CAPTURE_ENV", capture.join("env"));
    command.env_remove("MAX_THINKING_TOKENS");
    let mut child = pty.slave.spawn_command(command).expect("spawn launcher");
    drop(pty.slave);
    // The wrapper's own output would otherwise fill the pty buffer and block it.
    let mut reader = pty.master.try_clone_reader().expect("clone pty reader");
    let drain = thread::spawn(move || {
        let mut sink = Vec::new();
        let _ = reader.read_to_end(&mut sink);
        String::from_utf8_lossy(&sink).into_owned()
    });
    let status = child.wait().expect("await launcher");
    drop(pty.master);
    let transcript = drain.join().expect("pty reader thread");
    assert!(
        status.success(),
        "launcher failed; transcript: {transcript}"
    );
    let args = fs::read_to_string(capture.join("args")).expect("captured argv");
    let args: Vec<&str> = args.lines().collect();
    assert!(
        !args.contains(&"--print"),
        "a session was turned into a one-shot run: {args:?}"
    );
    assert!(
        !args.contains(&"--model"),
        "a model nobody asked for was forced: {args:?}"
    );
    assert_eq!(
        args,
        ["--resume", "2a42a73e-19de-459a-8c24-c5e75abf9a65"],
        "the client's own arguments must reach it unchanged"
    );
    assert_eq!(
        fs::read_to_string(capture.join("env")).expect("captured env"),
        "MAX_THINKING_TOKENS=\n",
        "the thinking budget is the user's setting, not the router's"
    );
    assert_eq!(
        requests.join().expect("mock router thread").join(","),
        "/api/health,/api/management/tokens,/api/models"
    );
}
