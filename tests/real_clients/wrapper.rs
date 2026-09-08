use super::*;

pub fn run_wrapper_with_options(
    case: ClientCase,
    working_directory: &Path,
    home: &Path,
    server: &str,
    model: Option<&str>,
    forwarded: &[&str],
) -> Output {
    run_wrapper_with_options_and_env(case, working_directory, home, server, model, forwarded, &[])
}

pub fn run_wrapper_with_options_and_env(
    case: ClientCase,
    working_directory: &Path,
    home: &Path,
    server: &str,
    model: Option<&str>,
    forwarded: &[&str],
    environment: &[(&str, &str)],
) -> Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
    command.args(["--server", server, "--token", "offline-admin"]);
    if let Some(model) = model {
        command.args(["--model", model]);
    }
    if forwarded.first() == Some(&"--reset-to-default-configuration") {
        command.arg("--yes");
    }
    command.args(["--non-interactive", case.client]);
    command.args(forwarded);
    command
        .current_dir(working_directory)
        .env("HOME", home)
        .env("XDG_CONFIG_HOME", home.join(".config"))
        .env("CODEX_HOME", home.join(".codex"))
        .env("CI", "1")
        .env("NO_COLOR", "1")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .env("HTTP_PROXY", "http://127.0.0.1:9")
        .env("HTTPS_PROXY", "http://127.0.0.1:9")
        .env("ALL_PROXY", "http://127.0.0.1:9")
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped());
    for key in [
        "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
        "DISABLE_TELEMETRY",
        "DO_NOT_TRACK",
        "DISABLE_ERROR_REPORTING",
        "DISABLE_AUTOUPDATER",
        "DISABLE_FEEDBACK_COMMAND",
    ] {
        command.env_remove(key);
    }
    for (key, value) in environment {
        command.env(key, value);
    }
    let mut child = command
        .spawn()
        .expect("launch with-router real-client capture tier");
    let status = child
        .wait_timeout(Duration::from_secs(60))
        .expect("wait for real client");
    if status.is_none() {
        child.kill().expect("stop timed-out real client");
        let output = child.wait_with_output().expect("collect timed-out output");
        panic!(
            "{} did not finish against the offline mock; stdout: {}; stderr: {}",
            case.client,
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
    }
    child
        .wait_with_output()
        .expect("collect real-client output")
}
