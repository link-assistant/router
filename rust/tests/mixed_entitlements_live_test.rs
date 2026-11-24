//! Real-client mixed entitlement proof, using an operator's single-owner Router.
//! This never copies a rotating OAuth chain into another test deployment.

mod common;

use link_assistant_router::login_pty::{Key, PtySession};
use portable_pty::CommandBuilder;
use serde_json::{Value, json};
use std::process::Command;
use std::time::Duration;

#[tokio::test]
async fn personal_anthropic_and_zai_union_picker_and_exact_responses_are_live() {
    let tier = common::tiers::Tier::LiveCredentialed;
    let name = common::tiers::current_test();
    // The original live credential remains a required prerequisite; use it on
    // the serving owner, never a synthetic or copied chain in this process.
    if common::tiers::live_credential(&name, "ROUTER_LIVE_CLAUDE_CREDENTIAL_JSON").is_none() {
        return;
    }
    let Some(origin) = common::tiers::protected("ROUTER_LIVE_MIXED_URL") else {
        common::tiers::unavailable(
            tier,
            &name,
            "ROUTER_LIVE_MIXED_URL is not set (single-owner serving Router required)",
        );
        return;
    };
    let Some(token) = common::tiers::live_credential(&name, "ROUTER_LIVE_MIXED_TOKEN") else {
        return;
    };
    if !common::tiers::opt_in(tier, "ROUTER_LIVE_MIXED_INFERENCE") {
        return;
    }
    if let Err(reason) = link_assistant_router::verification_client::safety() {
        common::tiers::unavailable(tier, &name, reason);
        return;
    }
    let http = reqwest::Client::builder()
        .timeout(Duration::from_secs(30))
        .build()
        .unwrap();
    let response = http
        .get(format!("{}/api/models", origin.trim_end_matches('/')))
        .bearer_auth(&token)
        .header("x-link-assistant-client", "claude-code")
        .send()
        .await
        .expect("live mixed catalog reachable");
    assert!(
        response.status().is_success(),
        "live catalog authorization failed"
    );
    let catalog: Value = response.json().await.expect("live mixed catalog JSON");
    let rows = catalog["data"].as_array().expect("live catalog rows");
    let anthropic = rows
        .iter()
        .find(|row| row["owned_by"] == "anthropic")
        .expect("personal Anthropic entitlement absent")["id"]
        .as_str()
        .unwrap();
    let zai = rows
        .iter()
        .find(|row| row["owned_by"] == "z.ai")
        .expect("z.ai entitlement absent")["id"]
        .as_str()
        .unwrap();
    let home = tempfile::tempdir().unwrap();
    let (preparation, _) = link_assistant_router::verification_client::prepare(&["claude"]);
    assert_eq!(
        preparation[0]["status"], "prepared",
        "live client preparation failed"
    );
    let profile = home
        .path()
        .join(".config/link-assistant-router/clients/claude/home");
    std::fs::create_dir_all(&profile).unwrap();
    std::fs::write(profile.join(".claude.json"), json!({"hasCompletedOnboarding":true,"lastOnboardingVersion":preparation[0]["observed"],"theme":"dark"}).to_string()).unwrap();

    // Actual vendor /model picker must contain both live authorized identities.
    let mut tui = CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
    tui.env_clear();
    tui.args(["--server", &origin, "--interactive", "claude"]);
    tui.env("PATH", std::env::var_os("PATH").unwrap_or_default());
    tui.env("HOME", home.path());
    tui.env("XDG_CONFIG_HOME", home.path().join(".config"));
    tui.env("LINK_ASSISTANT_ROUTER_TOKEN", &token);
    tui.env("TERM", "xterm-256color");
    let session = PtySession::spawn(tui).expect("live Claude picker");
    session
        .wait_for(
            |text| text.contains('❯'),
            Duration::from_millis(250),
            Duration::from_secs(30),
        )
        .expect("live Claude ready");
    session.send_text("/model").unwrap();
    session.send_key(Key::Enter).unwrap();
    session
        .wait_for(
            |text| text.contains(anthropic) && text.contains(zai),
            Duration::from_millis(250),
            Duration::from_secs(30),
        )
        .expect("live picker union missing");
    drop(session);

    // Exact outbound identity is evidenced by native Claude stream-json result
    // model metadata plus a successful real provider response. No raw logs or
    // protected values enter assertion messages.
    for model in [anthropic, zai] {
        let mut command = Command::new(env!("CARGO_BIN_EXE_with-router"));
        link_assistant_router::verification_client::environment(&mut command, home.path());
        command
            .env("LINK_ASSISTANT_ROUTER_TOKEN", &token)
            .env("NO_PROXY", "*")
            .env("no_proxy", "*")
            .args([
                "--server",
                &origin,
                "--model",
                model,
                "--non-interactive",
                "claude",
                "--verbose",
                "--output-format",
                "stream-json",
                "--max-turns",
                "1",
                "Reply with exactly ROUTER_LIVE_MIXED_OK",
            ]);
        let output =
            link_assistant_router::bounded_process::output(&mut command, Duration::from_secs(120))
                .expect("bounded live client exchange");
        assert!(
            output.status.success(),
            "live client/provider exchange failed"
        );
        let events: Vec<Value> = String::from_utf8_lossy(&output.stdout)
            .lines()
            .filter_map(|line| serde_json::from_str(line).ok())
            .collect();
        assert!(
            events
                .iter()
                .any(|event| event["message"]["model"] == model),
            "exact selected model was not returned by the provider"
        );
        assert!(
            events.iter().any(|event| event["type"] == "result"
                && event["is_error"] == false
                && event["result"]
                    .as_str()
                    .is_some_and(|text| text.contains("ROUTER_LIVE_MIXED_OK"))),
            "successful live response absent"
        );
    }
}
