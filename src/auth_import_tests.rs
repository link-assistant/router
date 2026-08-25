//! Unit tests for import reporting ([`crate::auth_import`]).

use super::*;

/// A credential's report says when it dies and whether it can be renewed.
///
/// Without a refresh token the credential stops at expiry and no recovery rung
/// can save it, which is what an operator needs to know before relying on it.
#[test]
fn a_credential_reports_its_expiry_and_whether_it_can_renew() {
    let now = chrono::Utc::now().timestamp_millis();
    let live = link_assistant_router::subscription::SubscriptionToken {
        access_token: "a".into(),
        refresh_token: Some("r".into()),
        expires_at_ms: Some(now + 3 * 3_600_000),
        account_id: None,
        resource_url: None,
    };

    let report = describe_credential(&live);

    assert!(report.contains("expires in"), "{report}");
    assert!(report.contains("refresh token present"), "{report}");
}

/// An expired credential says so plainly rather than reporting a negative wait.
#[test]
fn an_expired_credential_is_named_as_expired() {
    let now = chrono::Utc::now().timestamp_millis();
    let dead = link_assistant_router::subscription::SubscriptionToken {
        access_token: "a".into(),
        refresh_token: None,
        expires_at_ms: Some(now - 3 * 3_600_000),
        account_id: None,
        resource_url: None,
    };

    let report = describe_credential(&dead);

    assert!(report.contains("EXPIRED"), "{report}");
    assert!(
        report.contains("NO refresh token"),
        "a credential that cannot be renewed must say so: {report}"
    );
}

/// A credential with no recorded expiry is not reported as already dead.
#[test]
fn an_unrecorded_expiry_is_not_reported_as_expired() {
    let unknown = link_assistant_router::subscription::SubscriptionToken {
        access_token: "a".into(),
        refresh_token: Some("r".into()),
        expires_at_ms: None,
        account_id: None,
        resource_url: None,
    };

    let report = describe_credential(&unknown);

    assert!(report.contains("no recorded expiry"), "{report}");
    assert!(!report.contains("EXPIRED"), "{report}");
}

/// Durations read at a glance, at each threshold.
///
/// Pins the boundaries rather than the middles: minutes below 90, hours below
/// 48, days above.
///
/// Note the doc comment on `humanize_minutes` names 119 minutes as the case
/// the minute window fixes, but 119 is above the 90-minute threshold and still
/// truncates to "1 hours". Asserted here as it behaves, because changing how a
/// duration displays is not this change's business — flagged rather than
/// silently altered.
#[test]
fn durations_read_at_a_glance_at_each_threshold() {
    assert_eq!(humanize_minutes(45), "45 minutes");
    assert_eq!(
        humanize_minutes(89),
        "89 minutes",
        "the last minute reading"
    );
    assert_eq!(humanize_minutes(90), "1 hours", "the first hour reading");
    assert_eq!(
        humanize_minutes(119),
        "1 hours",
        "truncation the doc comment claims to have removed still applies here"
    );
    assert_eq!(humanize_minutes(120), "2 hours");
    assert_eq!(
        humanize_minutes(60 * 47),
        "47 hours",
        "the last hour reading"
    );
    assert_eq!(humanize_minutes(60 * 48), "2 days", "the first day reading");
}
