use super::*;

pub fn version_output(case: ClientCase, home: &Path) -> Output {
    link_assistant_router::verification_client::safety().expect("safe version boundary");
    let mut command = Command::new(case.executable);
    link_assistant_router::verification_client::environment(&mut command, home);
    command.arg("--version");
    link_assistant_router::bounded_process::output(&mut command, Duration::from_secs(15))
        .unwrap_or_else(|error| panic!("launch {} --version: {error}", case.executable))
}

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
    link_assistant_router::verification_client::safety().expect("safe wrapper boundary");
    let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
    link_assistant_router::verification_client::environment(&mut command, home);
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
    link_assistant_router::bounded_process::output(&mut command, Duration::from_secs(60))
        .expect("bounded real-client capture")
}
