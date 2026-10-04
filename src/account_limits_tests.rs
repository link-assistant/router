use super::*;
use axum::http::{HeaderName, HeaderValue};

fn headers(pairs: &[(&str, &str)]) -> HeaderMap {
    let mut map = HeaderMap::new();
    for (name, value) in pairs {
        map.insert(
            HeaderName::from_bytes(name.as_bytes()).expect("header name"),
            HeaderValue::from_str(value).expect("header value"),
        );
    }
    map
}

fn window(name: &str, utilization: Option<f64>, reset: Option<u64>) -> WindowLimit {
    WindowLimit {
        name: name.to_string(),
        status: None,
        reset_unix: reset,
        utilization,
    }
}

#[test]
fn parses_overall_and_named_windows_case_insensitively() {
    let limits = parse_unified(&headers(&[
        ("Anthropic-Ratelimit-Unified-Status", "REJECTED"),
        ("anthropic-ratelimit-unified-reset", "2000"),
        ("ANTHROPIC-RATELIMIT-UNIFIED-5H-STATUS", "allowed"),
        ("anthropic-ratelimit-unified-5h-utilization", "0.42"),
        ("anthropic-ratelimit-unified-7d-status", "rejected"),
        ("anthropic-ratelimit-unified-7d-reset", "5000"),
        (
            "anthropic-ratelimit-unified-representative-claim",
            "Seven_Day",
        ),
        ("anthropic-ratelimit-unified-7d-unknown", "x"),
    ]));
    let names: Vec<&str> = limits.windows.iter().map(|w| w.name.as_str()).collect();
    assert_eq!(names, ["5h", "7d", "overall"]);
    let overall = &limits.windows[2];
    assert_eq!(overall.status, Some(LimitStatus::Rejected));
    assert_eq!(overall.reset_unix, Some(2000));
    assert_eq!(limits.windows[0].utilization, Some(0.42));
    assert_eq!(limits.representative_claim.as_deref(), Some("seven_day"));
}

#[test]
fn unparseable_values_are_dropped() {
    let limits = parse_unified(&headers(&[
        ("anthropic-ratelimit-unified-5h-status", "maybe"),
        ("anthropic-ratelimit-unified-5h-reset", "soon"),
        ("anthropic-ratelimit-unified-5h-utilization", "NaN"),
    ]));
    assert!(limits.is_empty());
}

#[test]
fn the_longest_rejected_window_wins() {
    let limits = parse_unified(&headers(&[
        ("anthropic-ratelimit-unified-5h-status", "rejected"),
        ("anthropic-ratelimit-unified-5h-reset", "1500"),
        ("anthropic-ratelimit-unified-7d-status", "rejected"),
        ("anthropic-ratelimit-unified-7d-reset", "9000"),
        ("anthropic-ratelimit-unified-status", "rejected"),
        ("anthropic-ratelimit-unified-reset", "1500"),
    ]));
    assert_eq!(rejected_until(&limits, 1000), Some(9000));
}

#[test]
fn rejected_until_is_bounded_and_ignores_past_resets() {
    let far = parse_unified(&headers(&[
        ("anthropic-ratelimit-unified-7d-status", "rejected"),
        ("anthropic-ratelimit-unified-7d-reset", "99999999999"),
    ]));
    assert_eq!(
        rejected_until(&far, 1000),
        Some(1000 + MAX_VENDOR_COOLDOWN.as_secs())
    );
    let past = parse_unified(&headers(&[
        ("anthropic-ratelimit-unified-status", "rejected"),
        ("anthropic-ratelimit-unified-reset", "10"),
    ]));
    assert_eq!(rejected_until(&past, 1000), None);
}

#[test]
fn scope_credential_window_beats_model_window() {
    let limits = parse_unified(&headers(&[
        ("anthropic-ratelimit-unified-7d_opus-status", "rejected"),
        ("anthropic-ratelimit-unified-5h-status", "rejected"),
    ]));
    assert_eq!(
        classify_scope(&limits, b"", Some("claude-opus-4")),
        LimitScope::Credential
    );
}

#[test]
fn scope_model_family_window() {
    let limits = parse_unified(&headers(&[
        ("anthropic-ratelimit-unified-status", "rejected"),
        ("anthropic-ratelimit-unified-7d_opus-status", "rejected"),
    ]));
    assert_eq!(
        classify_scope(&limits, b"", Some("claude-sonnet-4")),
        LimitScope::Model("opus".to_string())
    );
}

#[test]
fn scope_representative_claim_for_requested_family() {
    let limits = parse_unified(&headers(&[(
        "anthropic-ratelimit-unified-representative-claim",
        "seven_day_opus",
    )]));
    assert_eq!(
        classify_scope(&limits, b"", Some("claude-opus-4-1")),
        LimitScope::Model("opus".to_string())
    );
    // The claim names another family: that says nothing about this model.
    assert_eq!(
        classify_scope(&limits, b"", Some("claude-sonnet-4")),
        LimitScope::Credential
    );
}

#[test]
fn scope_from_error_message() {
    let empty = UnifiedLimits::default();
    let body = br#"{"type":"error","error":{"type":"rate_limit_error","message":"Rate limit for claude-opus-4-1 exceeded"}}"#;
    assert_eq!(
        classify_scope(&empty, body, Some("Claude-Opus-4-1")),
        LimitScope::Model("claude-opus-4-1".to_string())
    );
    let family = br#"{"error":{"message":"Opus weekly limit reached"}}"#;
    assert_eq!(
        classify_scope(&empty, family, Some("claude-opus-4-1")),
        LimitScope::Model("opus".to_string())
    );
    assert_eq!(
        classify_scope(&empty, b"plain text limit", Some("claude-opus-4-1")),
        LimitScope::Credential
    );
    assert_eq!(classify_scope(&empty, b"", None), LimitScope::Credential);
}

#[test]
fn threshold_pauses_until_the_latest_reset() {
    let windows = [
        window("5h", Some(0.95), Some(2000)),
        window("7d", Some(0.91), Some(8000)),
        window("7d_opus", Some(0.10), Some(9000)),
    ];
    assert_eq!(
        threshold_decision(&windows, 90, 1000),
        ThresholdDecision::Pause {
            until_unix: 8000,
            window: "7d".to_string()
        }
    );
}

#[test]
fn threshold_zero_reading_clears_and_unreadable_is_ignored() {
    assert_eq!(
        threshold_decision(&[window("5h", Some(0.0), Some(2000))], 80, 1000),
        ThresholdDecision::Clear
    );
    assert_eq!(
        threshold_decision(&[window("5h", None, Some(2000))], 80, 1000),
        ThresholdDecision::Ignore
    );
    assert_eq!(threshold_decision(&[], 80, 1000), ThresholdDecision::Ignore);
    // Over the threshold with no reset: nothing to resume at.
    assert_eq!(
        threshold_decision(&[window("5h", Some(0.99), None)], 80, 1000),
        ThresholdDecision::Ignore
    );
    // Exactly at the threshold pauses.
    assert!(matches!(
        threshold_decision(&[window("5h", Some(0.8), Some(2000))], 80, 1000),
        ThresholdDecision::Pause { .. }
    ));
}

#[test]
fn state_expires_and_blocks_models() {
    let mut state = AccountLimitState::default();
    state.cool_model("Opus", 2000);
    state.cool_model("opus", 1500);
    assert_eq!(state.model_cooldowns["opus"], 2000);
    assert!(state.blocks_model("claude-OPUS-4", 1000));
    assert!(!state.blocks_model("claude-sonnet-4", 1000));
    state.cool_credential(3000, "weekly");
    state.cool_credential(2500, "shorter");
    assert_eq!(state.cooldown_reason.as_deref(), Some("weekly"));
    state.pause = Some(Pause {
        kind: PauseKind::Threshold,
        until_unix: Some(2500),
        reason: "5h".to_string(),
    });
    assert!(state.paused_at(1000));
    state.expire(2600);
    assert!(state.model_cooldowns.is_empty());
    assert!(state.pause.is_none());
    assert_eq!(state.cooldown_until_unix, Some(3000));
    state.expire(3000);
    assert!(state.is_empty());
}

#[test]
fn manual_pause_without_end_lasts() {
    let state = AccountLimitState {
        pause: Some(Pause {
            kind: PauseKind::Manual,
            until_unix: None,
            reason: "operator".to_string(),
        }),
        ..AccountLimitState::default()
    };
    assert!(state.paused_at(u64::MAX - 1));
}

#[test]
fn persistence_round_trips_and_reports() {
    let dir = tempfile::tempdir().expect("tempdir");
    let far = now_unix() + 3600;
    let mut accounts = BTreeMap::new();
    let mut state = AccountLimitState::default();
    state.cool_credential(far, "vendor rejected");
    state.cool_model("opus", far);
    state.pause = Some(Pause {
        kind: PauseKind::Manual,
        until_unix: None,
        reason: "maintenance".to_string(),
    });
    accounts.insert("alice".to_string(), state.clone());
    accounts.insert("idle".to_string(), AccountLimitState::default());
    save(dir.path(), "claude", &accounts);

    let loaded = load(dir.path(), "claude");
    assert_eq!(loaded.len(), 1);
    assert_eq!(loaded["alice"], state);
    assert!(load(dir.path(), "codex").is_empty());

    let report = status_report(dir.path());
    assert!(report.contains("account_cooldown provider=claude account=alice"));
    assert!(report.contains("account_model_cooldown provider=claude account=alice model=opus"));
    assert!(report.contains("kind=manual until_unix=manual-resume"));
    let (doctor, found) = doctor_report(&[dir.path().to_path_buf(), dir.path().to_path_buf()]);
    assert!(found);
    assert_eq!(doctor.matches("account limits").count(), 1);

    save(dir.path(), "claude", &BTreeMap::new());
    assert!(!dir.path().join(STATE_FILE).exists());
    let (doctor, found) = doctor_report(&[dir.path().to_path_buf()]);
    assert!(!found);
    assert!(doctor.contains("none recorded"));
}
