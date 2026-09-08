use super::*;

const PRIVACY_ENVIRONMENT: [&str; 6] = [
    "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
    "DISABLE_TELEMETRY",
    "DO_NOT_TRACK",
    "DISABLE_ERROR_REPORTING",
    "DISABLE_AUTOUPDATER",
    "DISABLE_FEEDBACK_COMMAND",
];

fn doctor_output(home: &Path, environment: &[(&str, &str)]) -> String {
    let mut command = Command::new(CLAUDE.executable);
    command
        .arg("doctor")
        .env("HOME", home)
        .env("CLAUDE_CONFIG_DIR", home.join(".claude"))
        .env("NO_COLOR", "1")
        .env("NO_PROXY", "127.0.0.1,localhost")
        .env("no_proxy", "127.0.0.1,localhost")
        .env("HTTP_PROXY", "http://127.0.0.1:9")
        .env("HTTPS_PROXY", "http://127.0.0.1:9")
        .env("ALL_PROXY", "http://127.0.0.1:9")
        .stdin(Stdio::null());
    for key in PRIVACY_ENVIRONMENT {
        command.env_remove(key);
    }
    for (key, value) in environment {
        command.env(key, value);
    }
    let output = command.output().expect("run Claude doctor offline");
    assert!(
        output.status.success(),
        "Claude doctor failed; stdout: {}; stderr: {}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    )
}

fn seed_monitor_feature(home: &Path) {
    let working_directory = Path::new(env!("CARGO_MANIFEST_DIR"));
    let profile = home.join(".config/link-assistant-router/clients/claude/home");
    std::fs::create_dir_all(&profile).expect("create Router-owned Claude profile");
    let mut projects = serde_json::Map::new();
    projects.insert(
        working_directory.to_string_lossy().into_owned(),
        json!({"hasTrustDialogAccepted": true}),
    );
    std::fs::write(
        profile.join(".claude.json"),
        json!({
            "hasCompletedOnboarding": true,
            "lastOnboardingVersion": CLAUDE_VERSION,
            "theme": "dark",
            "projects": projects,
            "cachedGrowthBookFeatures": {
                "tengu_amber_sentinel": true
            },
            "cachedGrowthBookFeaturesAt": 4102444800000_u64
        })
        .to_string(),
    )
    .expect("seed the synthetic Monitor feature flag");
}

fn monitor_is_advertised(environment: &[(&str, &str)]) -> (bool, String) {
    let home = tempfile::tempdir().expect("temporary Claude privacy home");
    seed_monitor_feature(home.path());
    let router = MockRouter::start(CLAUDE);
    let output = run_wrapper_with_options_and_env(
        CLAUDE,
        Path::new(env!("CARGO_MANIFEST_DIR")),
        home.path(),
        &router.origin,
        Some(CLAUDE.model),
        &[PROMPT],
        environment,
    );
    let diagnostics = format!(
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(
        output.status.success(),
        "Claude privacy capture failed: {diagnostics}"
    );
    let request = router
        .inference_request(CLAUDE.inference_path)
        .expect("Claude privacy scenario reaches Messages inference");
    let body = request.json_body();
    let advertised = body["tools"].as_array().is_some_and(|tools| {
        tools
            .iter()
            .any(|tool| tool["name"].as_str().is_some_and(|name| name == "Monitor"))
    });
    (advertised, diagnostics)
}

#[test]
fn claude_2_1_265_privacy_matrix_keeps_monitor_when_feature_evaluation_is_enabled() {
    if !enabled() {
        return;
    }
    assert!(command_exists(CLAUDE.executable), "Claude Code is required");

    let umbrella = tempfile::tempdir().expect("umbrella doctor home");
    let umbrella_doctor = doctor_output(
        umbrella.path(),
        &[("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1")],
    );
    assert!(
        umbrella_doctor.contains(
            "Feature-flag evaluation disabled (disabled by CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC)"
        ),
        "unexpected umbrella doctor output: {umbrella_doctor}"
    );

    let granular = tempfile::tempdir().expect("granular doctor home");
    let all_four = [
        ("DISABLE_TELEMETRY", "1"),
        ("DISABLE_ERROR_REPORTING", "1"),
        ("DISABLE_AUTOUPDATER", "1"),
        ("DISABLE_FEEDBACK_COMMAND", "1"),
    ];
    let granular_doctor = doctor_output(granular.path(), &all_four);
    assert!(
        granular_doctor
            .contains("Feature-flag evaluation disabled (disabled by DISABLE_TELEMETRY)"),
        "unexpected four-variable doctor output: {granular_doctor}"
    );

    let do_not_track = tempfile::tempdir().expect("DO_NOT_TRACK doctor home");
    let do_not_track_doctor = doctor_output(do_not_track.path(), &[("DO_NOT_TRACK", "1")]);
    assert!(
        do_not_track_doctor.contains("Feature-flag evaluation disabled (disabled by DO_NOT_TRACK)"),
        "unexpected DO_NOT_TRACK doctor output: {do_not_track_doctor}"
    );

    let compatible = tempfile::tempdir().expect("compatible doctor home");
    let compatible_three = [
        ("DISABLE_ERROR_REPORTING", "1"),
        ("DISABLE_AUTOUPDATER", "1"),
        ("DISABLE_FEEDBACK_COMMAND", "1"),
    ];
    let compatible_doctor = doctor_output(compatible.path(), &compatible_three);
    assert!(
        !compatible_doctor.contains("Feature-flag evaluation disabled"),
        "compatible privacy defaults disabled feature evaluation: {compatible_doctor}"
    );

    let (umbrella_monitor, umbrella_diagnostics) =
        monitor_is_advertised(&[("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1")]);
    assert!(!umbrella_monitor, "umbrella unexpectedly exposed Monitor");
    assert!(
        umbrella_diagnostics.contains("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"),
        "Router did not explain the inherited blocker: {umbrella_diagnostics}"
    );

    let (granular_monitor, granular_diagnostics) = monitor_is_advertised(&all_four);
    assert!(
        !granular_monitor,
        "DISABLE_TELEMETRY unexpectedly exposed Monitor"
    );
    assert!(
        granular_diagnostics.contains("DISABLE_TELEMETRY"),
        "Router did not explain the inherited blocker: {granular_diagnostics}"
    );

    let (do_not_track_monitor, do_not_track_diagnostics) =
        monitor_is_advertised(&[("DO_NOT_TRACK", "1")]);
    assert!(!do_not_track_monitor, "DO_NOT_TRACK unexpectedly exposed Monitor");
    assert!(
        do_not_track_diagnostics.contains("DO_NOT_TRACK"),
        "Router did not explain the inherited blocker: {do_not_track_diagnostics}"
    );

    let (compatible_monitor, compatible_diagnostics) = monitor_is_advertised(&compatible_three);
    assert!(
        compatible_monitor,
        "compatible defaults hid Monitor: {compatible_diagnostics}"
    );
}
