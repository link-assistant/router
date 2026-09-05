use super::*;

fn catalog_model(id: &str, owner: &str) -> Value {
    json!({
        "id": id, "type": "model", "display_name": id,
        "created_at": "2026-09-05T00:00:00Z", "owned_by": owner
    })
}

fn seed_home(home: &Path, working_directory: &Path) {
    let mut projects = serde_json::Map::new();
    projects.insert(
        working_directory.to_string_lossy().into_owned(),
        json!({"hasTrustDialogAccepted": true}),
    );
    std::fs::write(
        home.join(".claude.json"),
        json!({
            "hasCompletedOnboarding": true,
            "lastOnboardingVersion": CLAUDE_VERSION,
            "theme": "dark",
            "projects": projects
        })
        .to_string(),
    )
    .expect("seed isolated Claude TUI settings");
}

fn selector_transcript(home: &Path, router: &MockRouter, visible: &[&str]) -> String {
    let working_directory = Path::new(env!("CARGO_MANIFEST_DIR"));
    seed_home(home, working_directory);
    let mut command = CommandBuilder::new(env!("CARGO_BIN_EXE_with-router"));
    command.args([
        "--server",
        &router.origin,
        "--token",
        "offline-admin",
        "--interactive",
        "claude",
    ]);
    command.cwd(working_directory);
    command.env("HOME", home);
    command.env("XDG_CONFIG_HOME", home.join(".config"));
    command.env("TERM", "xterm-256color");
    command.env("NO_COLOR", "1");
    command.env("NO_PROXY", "127.0.0.1,localhost");
    command.env("no_proxy", "127.0.0.1,localhost");
    command.env("HTTP_PROXY", "http://127.0.0.1:9");
    command.env("HTTPS_PROXY", "http://127.0.0.1:9");
    command.env("ALL_PROXY", "http://127.0.0.1:9");
    let session = PtySession::spawn(command).expect("start Claude TUI through Router");
    session
        .wait_for(
            |text| text.contains('❯'),
            Duration::from_millis(250),
            Duration::from_secs(30),
        )
        .unwrap_or_else(|error| panic!("Claude TUI was not ready: {error}"));
    session.send_text("/model").expect("type /model");
    session
        .wait_idle(Duration::from_millis(200), Duration::from_secs(3))
        .expect("settle /model input");
    session.send_key(Key::Enter).expect("open model selector");
    let transcript = session
        .wait_for(
            |text| {
                let compact = text
                    .chars()
                    .filter(|character| !character.is_whitespace())
                    .collect::<String>();
                compact.contains("Selectmodel") && visible.iter().all(|model| text.contains(model))
            },
            Duration::from_millis(250),
            Duration::from_secs(20),
        )
        .unwrap_or_else(|error| panic!("Claude /model did not settle: {error}"));
    session.kill();
    transcript
}

fn assert_scenario(models: &[(&str, &str)], visible: &[&str], hidden: &[&str]) {
    let router = MockRouter::start_with_models(
        CLAUDE,
        models
            .iter()
            .map(|(id, owner)| catalog_model(id, owner))
            .collect(),
    );
    let home = tempfile::tempdir().expect("temporary Claude home");
    let transcript = selector_transcript(home.path(), &router, visible);
    let compact = transcript
        .chars()
        .filter(|character| !character.is_whitespace())
        .collect::<String>();
    for (model, owner) in models {
        if *owner != "z.ai" {
            continue;
        }
        for (offset, _) in compact.match_indices(model) {
            let before = compact[..offset].chars().rev().take(80).collect::<String>();
            let after = compact[offset + model.len()..]
                .chars()
                .take(80)
                .collect::<String>();
            let nearby = format!("{before}{after}");
            for family in ["CustomOpus", "CustomSonnet", "CustomHaiku"] {
                assert!(
                    !nearby.contains(family),
                    "z.ai model attached to a fake family"
                );
            }
        }
    }
    for model in hidden {
        assert!(
            !transcript.contains(model),
            "hidden model was fabricated into a family row"
        );
    }

    let selected = models[0].0;
    let output = run_wrapper_with_model(
        CLAUDE,
        Path::new(env!("CARGO_MANIFEST_DIR")),
        home.path(),
        &router.origin,
        selected,
    );
    assert!(
        output.status.success(),
        "Claude did not serve the selected exact model"
    );
    let request = router
        .inference_requests(CLAUDE.inference_path)
        .into_iter()
        .last()
        .expect("selected exact model reaches inference");
    let body: Value = serde_json::from_slice(&request.body).expect("Claude inference JSON");
    assert_eq!(body["model"], selected);

    if models.iter().all(|(_, owner)| *owner == "z.ai") {
        let before = router.inference_requests(CLAUDE.inference_path).len();
        let fallback = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            None,
            &[PROMPT],
        );
        assert!(
            fallback.status.success(),
            "Claude default/fallback run failed"
        );

        let session = "11111111-2222-4333-8444-555555555555";
        let initial = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            Some(selected),
            &["--session-id", session, PROMPT],
        );
        assert!(initial.status.success(), "Claude resumable run failed");
        let resumed = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            None,
            &["--resume", session, PROMPT],
        );
        assert!(resumed.status.success(), "Claude resumed run failed");

        let before_subagent = router.inference_requests(CLAUDE.inference_path).len();
        let subagent = run_wrapper_with_options(
            CLAUDE,
            Path::new(env!("CARGO_MANIFEST_DIR")),
            home.path(),
            &router.origin,
            Some(selected),
            &[SUBAGENT_PROMPT],
        );
        assert!(subagent.status.success(), "Claude subagent run failed");

        let requests = router.inference_requests(CLAUDE.inference_path);
        assert!(
            requests.len() >= before_subagent + 2,
            "the Agent tool did not produce a subagent request"
        );
        for request in &requests[before..] {
            let body: Value =
                serde_json::from_slice(&request.body).expect("Claude routed request JSON");
            let model = body["model"].as_str().expect("exact routed model");
            assert!(
                models.iter().any(|(advertised, _)| *advertised == model),
                "main, resumed, fallback, or subagent request used unadvertised model {model}"
            );
        }
    }
}

#[test]
fn current_claude_model_selector_keeps_exact_provider_models_distinct() {
    if !enabled() {
        return;
    }
    assert!(
        command_exists("claude"),
        "the real-client gate requires claude"
    );
    assert_scenario(&[("future-glm-only", "z.ai")], &["future-glm-only"], &[]);
    assert_scenario(
        &[
            ("future-glm-alpha", "z.ai"),
            ("future-glm-beta", "z.ai"),
            ("future-glm-gamma", "z.ai"),
        ],
        &["future-glm-alpha"],
        &["future-glm-beta", "future-glm-gamma"],
    );
    assert_scenario(
        &[
            ("future-claude-native", "anthropic"),
            ("future-glm-mixed", "z.ai"),
        ],
        &[],
        &["future-glm-mixed"],
    );
}
