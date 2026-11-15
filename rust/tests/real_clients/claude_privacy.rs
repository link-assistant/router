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
    link_assistant_router::verification_client::safety().expect("safe doctor boundary");
    let mut command = Command::new(CLAUDE.executable);
    link_assistant_router::verification_client::environment(&mut command, home);
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
    let output =
        link_assistant_router::bounded_process::output(&mut command, Duration::from_secs(30))
            .expect("bounded Claude doctor offline");
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
            "cachedGrowthBookFeaturesAt": 4_102_444_800_000_u64
        })
        .to_string(),
    )
    .expect("seed the synthetic Monitor feature flag");
}

/// The sentence with which Claude Code lists deferred tools in the prompt text.
const DEFERRED_TOOLS_PREAMBLE: &str = "deferred tools are now available via ToolSearch";

/// How a Claude Code release offers the Monitor tool in the prompted inference.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
enum MonitorOffer {
    /// Neither a `tools[]` entry nor a deferred tool.
    Hidden,
    /// A full `tools[]` entry. Up to Claude Code 2.1.291 Monitor needs the
    /// `tengu_amber_sentinel` feature flag, so feature-flag evaluation must be on.
    Direct,
    /// Only named in the deferred-tool list. Claude Code 2.1.325 defers Monitor
    /// behind `ToolSearch` and no longer gates it behind a feature flag.
    Deferred,
}

/// Names that the request lists after [`DEFERRED_TOOLS_PREAMBLE`], one per line
/// until the first blank line, in any system or message text.
fn deferred_tool_names(value: &Value) -> Vec<String> {
    match value {
        Value::String(text) => text
            .find(DEFERRED_TOOLS_PREAMBLE)
            .and_then(|start| text[start..].split_once(":\n"))
            .map_or_else(Vec::new, |(_, list)| {
                list.lines()
                    .map(str::trim)
                    .take_while(|line| !line.is_empty())
                    .map(str::to_owned)
                    .collect()
            }),
        Value::Array(items) => items.iter().flat_map(deferred_tool_names).collect(),
        Value::Object(fields) => fields.values().flat_map(deferred_tool_names).collect(),
        _ => Vec::new(),
    }
}

#[test]
fn deferred_tool_names_read_the_tool_search_list() {
    let announcement = "The following deferred tools are now available via ToolSearch. Use \
                        ToolSearch with query \"select:<name>[,<name>...]\" to load tool \
                        schemas before calling them:\nCronCreate\nMonitor\nWebSearch\n\n\
                        Available agent types";
    let body = json!({
        "messages": [{"role": "user", "content": [{"type": "text", "text": announcement}]}]
    });
    assert_eq!(
        deferred_tool_names(&body),
        ["CronCreate", "Monitor", "WebSearch"]
    );
    assert!(deferred_tool_names(&json!({"tools": [{"name": "Monitor"}]})).is_empty());
}

fn monitor_offer(environment: &[(&str, &str)]) -> (MonitorOffer, String) {
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
        "{}{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr),
        std::fs::read_to_string(
            home.path()
                .join(".link-assistant-router/logs/operational.log")
        )
        .expect("persistent launcher privacy diagnostics")
    );
    assert!(
        output.status.success(),
        "Claude privacy capture failed: {diagnostics}"
    );
    let request = router
        .inference_requests(CLAUDE.inference_path)
        .into_iter()
        .find(|request| {
            let body = request.json_body();
            String::from_utf8_lossy(&request.decoded_body()).contains(PROMPT)
                && body["tools"]
                    .as_array()
                    .is_some_and(|tools| !tools.is_empty())
        })
        .expect("Claude privacy scenario reaches the prompted Messages inference");
    let body = request.json_body();
    let tool_names = body["tools"]
        .as_array()
        .into_iter()
        .flatten()
        .filter_map(|tool| tool["name"].as_str())
        .collect::<Vec<_>>();
    let deferred = deferred_tool_names(&body);
    let offer = if tool_names.contains(&"Monitor") {
        MonitorOffer::Direct
    } else if deferred.iter().any(|name| name == "Monitor") {
        MonitorOffer::Deferred
    } else {
        MonitorOffer::Hidden
    };
    (
        offer,
        format!(
            "{diagnostics}\n{}\nadvertised tools: {tool_names:?}\ndeferred tools: {deferred:?}",
            wrapper::launcher_diagnostics(home.path()),
        ),
    )
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

    // Claude Code up to 2.1.291 offers Monitor directly only while feature-flag
    // evaluation runs, so each privacy variable that disables it must hide Monitor
    // and Router's compatible defaults must keep it. Claude Code 2.1.325 defers
    // Monitor without a feature flag, so every environment offers it deferred.
    let (compatible_monitor, compatible_diagnostics) = monitor_offer(&compatible_three);
    assert_ne!(
        compatible_monitor,
        MonitorOffer::Hidden,
        "compatible defaults hid Monitor: {compatible_diagnostics}"
    );
    let expected_with_blocker = match compatible_monitor {
        MonitorOffer::Direct => MonitorOffer::Hidden,
        MonitorOffer::Hidden | MonitorOffer::Deferred => MonitorOffer::Deferred,
    };
    let umbrella_only = [("CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC", "1")];
    let do_not_track_only = [("DO_NOT_TRACK", "1")];
    for (blocker, environment) in [
        (
            "CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC",
            umbrella_only.as_slice(),
        ),
        ("DISABLE_TELEMETRY", all_four.as_slice()),
        ("DO_NOT_TRACK", do_not_track_only.as_slice()),
    ] {
        let (monitor, diagnostics) = monitor_offer(environment);
        assert_eq!(
            monitor, expected_with_blocker,
            "{blocker} changed how Claude Code offers Monitor (compatible defaults: \
             {compatible_monitor:?}): {diagnostics}"
        );
        assert!(
            diagnostics.contains(blocker),
            "Router did not explain the inherited blocker {blocker}: {diagnostics}"
        );
    }
}
