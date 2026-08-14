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
    for (client, executable) in [
        ("claude-code", "claude"),
        ("codex", "codex"),
        ("qwen-code", "qwen"),
        ("grok-cli", "grok"),
        ("opencode", "opencode"),
        ("agent", "agent"),
    ] {
        if !command_exists(executable) {
            continue;
        }
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
