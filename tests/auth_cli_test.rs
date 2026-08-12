//! Black-box coverage for provider-specific authorization flow validation.

use std::process::{Command, Output};

fn router(args: &[&str]) -> Output {
    Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(args)
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run")
}

#[test]
fn unsupported_provider_flows_exit_with_authorization_error() {
    for (provider, flow) in [
        ("claude", "device"),
        ("claude", "loopback"),
        ("codex", "code"),
        ("codex", "cli"),
    ] {
        let output = router(&["auth", provider, "--flow", flow]);
        assert_eq!(
            output.status.code(),
            Some(1),
            "auth {provider} --flow {flow} returned the wrong status"
        );
        assert!(
            String::from_utf8_lossy(&output.stderr).contains("does not support"),
            "auth {provider} --flow {flow} did not explain the failure: {}",
            String::from_utf8_lossy(&output.stderr)
        );
    }
}

#[test]
fn provider_help_lists_supported_flows() {
    for (provider, supported_flows) in [
        ("claude", "Supported flows: auto, code, cli."),
        ("codex", "Supported flows: auto, device, loopback."),
    ] {
        let output = router(&["auth", provider, "--help"]);
        assert!(output.status.success());
        let stdout = String::from_utf8_lossy(&output.stdout);
        assert!(
            stdout.contains(supported_flows),
            "auth {provider} help did not contain {supported_flows:?}:\n{stdout}"
        );
    }
}
