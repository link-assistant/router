use super::*;
use serde_json::json;

fn token() -> SubscriptionToken {
    SubscriptionToken {
        access_token: "not-a-jwt".into(),
        refresh_token: Some("private-refresh-token".into()),
        expires_at_ms: None,
        account_id: Some("private-account-id".into()),
        resource_url: None,
    }
}

#[test]
fn current_anthropic_windows_extra_usage_and_dynamic_limits_are_normalized() {
    let value = json!({
        "seven_day_opus": {
            "utilization": 62,
            "resets_at": "2030-01-08T00:00:00Z"
        },
        "cinder_cove": {"utilization": 10},
        "extra_usage": {
            "is_enabled": true,
            "monthly_limit": 100,
            "used_credits": 75,
            "utilization": 75,
            "currency": "USD",
            "resets_at": "2030-02-01T00:00:00Z",
            "account_id": "must-not-survive"
        },
        "limits": [{
            "kind": "weekly_scoped",
            "group": "model",
            "percent": 40,
            "resets_at": "2030-01-08T00:00:00Z",
            "scope": {"model": {"display_name": "Future Model"}},
            "workspace_id": "private-workspace"
        }],
        "unknown_additive_field": {"email": "private@example.test"}
    });

    assert!(recognizable_anthropic_usage(&value));
    let usage = normalize_anthropic(&value);
    assert_eq!(usage.windows.len(), 2);
    assert_eq!(usage.windows[0].name, "seven_day_opus");
    assert_eq!(usage.windows[1].name, "cinder_cove");
    let extra = usage.extra_usage.as_ref().unwrap();
    assert_eq!(extra.is_enabled, Some(true));
    assert_eq!(extra.monthly_limit, Some(100.0));
    assert_eq!(extra.used_credits, Some(75.0));
    assert_eq!(extra.remaining_credits, Some(25.0));
    assert_eq!(extra.utilization, Some(75.0));
    assert_eq!(extra.currency.as_deref(), Some("USD"));
    let dynamic = &usage.additional_limits[0];
    assert_eq!(dynamic.kind.as_deref(), Some("weekly_scoped"));
    assert_eq!(dynamic.group.as_deref(), Some("model"));
    assert_eq!(dynamic.model_display_name.as_deref(), Some("Future Model"));
    assert_eq!(dynamic.windows[0].used_percentage, Some(40.0));
    assert_eq!(usage.status, "available");

    let rendered = serde_json::to_string(&usage).unwrap();
    for forbidden in [
        "must-not-survive",
        "private-workspace",
        "private@example.test",
        "account_id",
        "workspace_id",
        "unknown_additive_field",
    ] {
        assert!(
            !rendered.contains(forbidden),
            "leaked {forbidden}: {rendered}"
        );
    }
}

#[test]
fn anthropic_dynamic_limits_deduplicate_legacy_semantics_not_display_labels() {
    let usage = normalize_anthropic(&json!({
        "seven_day_opus": {"utilization": 20},
        "limits": [
            {
                "kind": "weekly_scoped",
                "group": "model",
                "percent": 20,
                "scope": {"model": {"display_name": "Claude Opus Future"}}
            },
            {
                "kind": "weekly_scoped",
                "group": "model",
                "percent": 30,
                "scope": {"model": {"display_name": "Same Label"}}
            },
            {
                "kind": "daily_scoped",
                "group": "model",
                "percent": 40,
                "scope": {"model": {"display_name": "Same Label"}}
            }
        ]
    }));

    assert_eq!(usage.windows.len(), 1);
    assert_eq!(usage.additional_limits.len(), 2);
    assert_eq!(usage.additional_limits[0].name, "Same Label");
    assert_eq!(usage.additional_limits[1].name, "Same Label");
    assert_ne!(
        usage.additional_limits[0].kind,
        usage.additional_limits[1].kind
    );
}

#[test]
fn null_and_unknown_anthropic_fields_do_not_break_recognized_payloads() {
    let usage = normalize_anthropic(&json!({
        "five_hour": {"utilization": 1, "resets_at": null},
        "seven_day": {"utilization": null},
        "extra_usage": null,
        "limits": [null, {}, {"kind": "future", "percent": null}],
        "future": true
    }));
    assert_eq!(usage.windows.len(), 2);
    assert_eq!(usage.windows[0].used_percentage, Some(1.0));
    assert_eq!(usage.windows[1].used_percentage, None);
    assert!(usage.extra_usage.is_none());
    assert!(usage.additional_limits.is_empty());
}

#[test]
fn current_openai_limit_state_survives_without_private_or_opaque_fields() {
    let usage = normalize_openai(
        &json!({
            "plan_type": "pro",
            "account_id": "private-account-id",
            "user_id": "private-user-id",
            "email": "private@example.test",
            "rate_limit": {
                "allowed": false,
                "limit_reached": false,
                "primary_window": {
                    "used_percent": 50,
                    "limit_window_seconds": 18000,
                    "reset_after_seconds": 20,
                    "reset_at": 1_893_456_000
                }
            },
            "additional_rate_limits": [{
                "limit_name": "Code review",
                "metered_feature": "code_review",
                "rate_limit": {"allowed": false, "limit_reached": true}
            }],
            "credits": {
                "has_credits": false,
                "unlimited": false,
                "approx_local_messages": [{"count": 2, "email": "opaque@example.test"}],
                "approx_cloud_messages": [{"count": 3}, {"count": 4}],
                "opaque": [{"secret": "opaque-secret"}]
            },
            "spend_control": {
                "reached": true,
                "individual_limit": {
                    "source": "workspace",
                    "limit": "25000",
                    "used": "25000",
                    "remaining": "0",
                    "used_percent": 100,
                    "remaining_percent": 0,
                    "reset_after_seconds": 3600,
                    "reset_at": 1_893_456_000,
                    "workspace_id": "private-workspace-id"
                }
            },
            "rate_limit_reached_type": {
                "type": "workspace_member_credits_depleted"
            },
            "rate_limit_reset_credits": {"available_count": 2},
            "rate_limit_upsell": {"private": "upsell-private"}
        }),
        &token(),
    );

    assert_eq!(usage.status, "limit_reached");
    assert_eq!(usage.allowed, Some(false));
    assert_eq!(usage.limit_reached, Some(false));
    assert_eq!(usage.windows[0].window_seconds, Some(18_000));
    let additional = &usage.additional_limits[0];
    assert_eq!(additional.limit_name.as_deref(), Some("Code review"));
    assert_eq!(additional.metered_feature.as_deref(), Some("code_review"));
    assert_eq!(additional.allowed, Some(false));
    assert_eq!(additional.limit_reached, Some(true));
    let credits = usage.credits.as_ref().unwrap();
    assert_eq!(credits.has_credits, Some(false));
    assert_eq!(credits.approximate_local_messages, Some(2));
    assert_eq!(credits.approximate_cloud_messages, Some(7));
    let spend = usage
        .spend_control
        .as_ref()
        .and_then(|control| control.individual_limit.as_ref())
        .unwrap();
    assert_eq!(spend.source.as_deref(), Some("workspace"));
    assert_eq!(spend.limit.as_deref(), Some("25000"));
    assert_eq!(spend.remaining.as_deref(), Some("0"));
    assert_eq!(spend.used_percentage, Some(100.0));
    assert_eq!(spend.remaining_percentage, Some(0.0));
    assert_eq!(spend.reset_after_seconds, Some(3600));
    assert_eq!(
        usage.rate_limit_reached_type.as_deref(),
        Some("workspace_member_credits_depleted")
    );
    assert_eq!(usage.rate_limit_reset_credits_available, Some(2));

    let rendered = serde_json::to_string(&usage).unwrap();
    for forbidden in [
        "private-account-id",
        "private-user-id",
        "private@example.test",
        "opaque@example.test",
        "opaque-secret",
        "private-workspace-id",
        "upsell-private",
        "rate_limit_upsell",
        "private-refresh-token",
    ] {
        assert!(
            !rendered.contains(forbidden),
            "leaked {forbidden}: {rendered}"
        );
    }
}

#[test]
fn every_authoritative_openai_denial_produces_an_unhealthy_status() {
    let cases = [
        json!({"rate_limit": {"allowed": false, "limit_reached": false}}),
        json!({"rate_limit": {"allowed": true, "limit_reached": true}}),
        json!({"additional_rate_limits": [{
            "limit_name": "one", "metered_feature": "one",
            "rate_limit": {"allowed": false, "limit_reached": false}
        }]}),
        json!({"additional_rate_limits": [{
            "limit_name": "one", "metered_feature": "one",
            "rate_limit": {"allowed": true, "limit_reached": true}
        }]}),
        json!({"credits": {"has_credits": false, "unlimited": false}}),
        json!({"spend_control": {"reached": true}}),
    ];
    for value in cases {
        assert_ne!(normalize_openai(&value, &token()).status, "available");
    }

    for kind in [
        "rate_limit_reached",
        "workspace_owner_credits_depleted",
        "workspace_member_credits_depleted",
        "workspace_owner_usage_limit_reached",
        "workspace_member_usage_limit_reached",
    ] {
        let value = json!({"rate_limit_reached_type": {"type": kind}});
        let usage = normalize_openai(&value, &token());
        assert_ne!(usage.status, "available", "{kind}");
        assert_eq!(usage.rate_limit_reached_type.as_deref(), Some(kind));
    }
}

#[test]
fn old_openai_fixture_remains_compatible_and_nulls_stay_absent() {
    let usage = normalize_openai(
        &json!({
            "rate_limit": {"primary_window": {"used_percent": 10}},
            "credits": {"balance": "5", "unlimited": null},
            "spend_control": null,
            "future": {"private": "ignored"}
        }),
        &token(),
    );
    assert_eq!(usage.status, "available");
    assert_eq!(usage.windows[0].used_percentage, Some(10.0));
    assert_eq!(usage.credits.unwrap().balance.as_deref(), Some("5"));
    assert!(usage.spend_control.is_none());
}
