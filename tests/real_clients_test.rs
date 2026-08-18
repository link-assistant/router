//! Opt-in tests of the actual third-party binaries. HTTP fixtures cannot catch
//! vendor client gating or argument/stdio behavior.

use std::path::Path;
use std::process::{Command, Stdio};

fn command_exists(command: &str) -> bool {
    std::env::var_os("PATH").is_some_and(|path| {
        std::env::split_paths(&path).any(|directory| directory.join(command).is_file())
    })
}

fn enabled() -> bool {
    std::env::var("ROUTER_REAL_CLIENT_TESTS").as_deref() == Ok("1")
}

fn run_wrapper(client: &str, prompt: &str, working_directory: &Path) -> std::process::Output {
    let server = std::env::var("ROUTER_REAL_SERVER")
        .expect("ROUTER_REAL_SERVER is required when ROUTER_REAL_CLIENT_TESTS=1");
    let token = std::env::var("ROUTER_REAL_TOKEN")
        .expect("ROUTER_REAL_TOKEN is required when ROUTER_REAL_CLIENT_TESTS=1");
    Command::new(env!("CARGO_BIN_EXE_with-router"))
        .args([
            "--server",
            &server,
            "--token",
            &token,
            "--non-interactive",
            client,
            prompt,
        ])
        .current_dir(working_directory)
        // The wrapper must be the only source of client configuration. Never
        // let an opt-in real-client test discover or mutate the developer's
        // normal home-directory state.
        .env("HOME", working_directory)
        .env("XDG_CONFIG_HOME", working_directory.join(".config"))
        .stdin(Stdio::null())
        .output()
        .expect("launch with-router real-client tier")
}

#[test]
fn installed_supported_clients_complete_a_real_single_turn() {
    if !enabled() {
        return;
    }
    let directory = tempfile::tempdir().unwrap();
    let mut skipped = Vec::new();
    let mut exercised = Vec::new();
    for (client, executable) in [
        ("claude-code", "claude"),
        ("codex", "codex"),
        ("gemini-cli", "gemini"),
        ("qwen-code", "qwen"),
        ("grok-cli", "grok"),
        ("opencode", "opencode"),
        ("agent", "agent"),
    ] {
        if !command_exists(executable) {
            // A silently skipped client is indistinguishable from a passing
            // one, which is how this tier can report success while covering
            // nothing (issue #211). Collect it and say so at the end.
            skipped.push(client);
            continue;
        }
        exercised.push(client);
        let output = run_wrapper(client, "Reply with exactly ROUTER_OK", directory.path());
        assert!(
            output.status.success(),
            "{client} failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(
            String::from_utf8_lossy(&output.stdout).contains("ROUTER_OK"),
            "{client} did not return the expected marker"
        );
    }
    println!("real-client tier: exercised {exercised:?}, skipped (not installed) {skipped:?}");
    assert!(
        !exercised.is_empty(),
        "ROUTER_REAL_CLIENT_TESTS=1 was set but no supported client is installed, so this \
         tier asserted nothing. Install at least one of {skipped:?}, or leave the tier off."
    );
}

#[test]
fn installed_claude_and_codex_complete_a_real_tool_cycle() {
    if !enabled() || std::env::var("ROUTER_REAL_TOOL_TESTS").as_deref() != Ok("1") {
        return;
    }
    for (client, executable) in [("claude-code", "claude"), ("codex", "codex")] {
        if !command_exists(executable) {
            continue;
        }
        let directory = tempfile::tempdir().unwrap();
        let target = directory.path().join("result.txt");
        let prompt = format!(
            "Use your file-writing tool to create {} containing exactly 42 and no newline.",
            target.display()
        );
        let output = run_wrapper(client, &prompt, directory.path());
        assert!(
            output.status.success(),
            "{client} tool cycle failed: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(std::fs::read_to_string(target).unwrap(), "42");
    }
}
