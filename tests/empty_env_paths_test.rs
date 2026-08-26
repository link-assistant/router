//! An empty environment variable must not redirect state into `$PWD`.
//!
//! Reproduced on v0.119.0: with `XDG_CONFIG_HOME=''`, `router server use`
//! reported `saved server selection in link-assistant-router/server.json` —
//! a *relative* path — and wrote a file holding a live `la_sk_` token into
//! whatever directory the command ran from. `var_os` returns `Some("")` for a
//! set-but-empty variable, so the fallback chain never ran and the "…are
//! unset" error could not fire (issue #340).
//!
//! `env: { XDG_CONFIG_HOME: '' }` is the natural way to say "do not inherit
//! the user's config" in a CI runner, which is how this was found.

use std::process::Command;

/// Whether the command reported a path that is not absolute.
///
/// The symptom that identified this defect: `saved server selection in
/// link-assistant-router/server.json` reads as success while naming a
/// location nobody chose.
fn working_relative(rendered: &str) -> bool {
    rendered
        .lines()
        .filter_map(|line| line.split_once(" in "))
        .any(|(_, tail)| {
            let path = tail.split_whitespace().next().unwrap_or_default();
            !path.is_empty() && !std::path::Path::new(path).is_absolute()
        })
}

/// Run `router` in `working_directory` with the given environment overrides.
fn router(working_directory: &std::path::Path, overrides: &[(&str, &str)]) -> std::process::Output {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    // Every home-like variable is pointed at a directory this test owns
    // before the overrides are applied. Without this, a case that empties
    // only `XDG_CONFIG_HOME` inherits the real `HOME` and writes the
    // developer's own `server.json` -- which is the neighbouring defect this
    // suite exists to prevent (issues #340, #343).
    command
        .args(["server", "use", "http://127.0.0.1:1"])
        .current_dir(working_directory)
        .env("TOKEN_SECRET", "empty-env-paths-test")
        .env("HOME", working_directory)
        .env("XDG_CONFIG_HOME", working_directory.join("xdg"))
        .env("APPDATA", working_directory.join("appdata"))
        .env_remove("LINK_ASSISTANT_ROUTER_URL")
        .env_remove("ROUTER_URL");
    for (name, value) in overrides {
        command.env(name, value);
    }
    command.output().expect("run router")
}

/// Nothing is written under the working directory, whatever is empty.
///
/// The credential is the reason this matters: `server.json` holds a live
/// token, and writing it into `$PWD` can put it inside a git checkout, a
/// shared folder, or a temp directory that outlives the run.
#[test]
fn an_empty_variable_never_writes_state_into_the_working_directory() {
    for overrides in [
        &[("XDG_CONFIG_HOME", "")][..],
        &[("HOME", "")],
        &[("XDG_CONFIG_HOME", ""), ("HOME", "")],
        &[("XDG_CONFIG_HOME", ""), ("HOME", ""), ("APPDATA", "")],
    ] {
        let directory = tempfile::tempdir().expect("temporary working directory");
        let output = router(directory.path(), overrides);
        let rendered = format!(
            "{}{}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );

        // The defect was a *relative* path: state landing under `$PWD`
        // because the root resolved to the empty string. `HOME` is the temp
        // directory here, so `$HOME/.config/...` is the correct destination —
        // what must never appear is `link-assistant-router/` directly in the
        // working directory, which is what a relative root produces.
        assert!(
            !directory.path().join("link-assistant-router").exists(),
            "{overrides:?} wrote state into the working directory: {rendered}"
        );
        assert!(
            !working_relative(&rendered),
            "{overrides:?} reported a relative path, so the root was empty: {rendered}"
        );
        // Nothing anywhere under it, whatever the name.
        let strays = std::fs::read_dir(directory.path())
            .expect("read the working directory")
            .flatten()
            .map(|entry| entry.file_name().to_string_lossy().into_owned())
            // `xdg` and `appdata` are the roots this test handed the command;
            // anything else is state it placed where nobody asked.
            .filter(|name| name != "xdg" && name != "appdata" && name != ".config")
            .collect::<Vec<_>>();
        assert!(
            strays.is_empty(),
            "{overrides:?} left {strays:?} in the working directory: {rendered}"
        );
    }
}

/// With every candidate empty, the command fails and says so.
///
/// The error at the end of the fallback chain — `HOME`, `XDG_CONFIG_HOME` and
/// `APPDATA` "are unset" — was exactly the case that could not be reached
/// when one of them was empty.
#[test]
fn an_entirely_empty_environment_is_refused_rather_than_guessed() {
    let directory = tempfile::tempdir().expect("temporary working directory");
    let output = router(
        directory.path(),
        &[("XDG_CONFIG_HOME", ""), ("HOME", ""), ("APPDATA", "")],
    );

    assert!(
        !output.status.success(),
        "a broken environment must fail rather than write somewhere"
    );
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(
        stderr.contains("XDG_CONFIG_HOME") || stderr.contains("HOME"),
        "the refusal must name what to fix: {stderr}"
    );
}
