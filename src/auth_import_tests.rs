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

/// Conditional import refuses a vendor-rejected candidate before taking the
/// writer lock or changing an empty destination.
#[tokio::test]
async fn rejected_conditional_candidate_requires_explicit_force() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, home.path());
    let document = r#"{"access_token":"rejected","refresh_token":"r","scope":"openid"}"#;

    let error = install_candidate(
        &reader,
        data.path(),
        document,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            force: false,
        },
    )
    .await
    .expect_err("rejected candidate must be refused");

    assert!(error.contains("--force"), "{error}");
    assert!(!home.path().join("oauth_creds.json").exists());
}

/// Candidate rejection is relevant only when installation would occur. A
/// destination discovered under the lock remains a distinct successful
/// `AlreadyPresent` result even without force.
#[tokio::test]
async fn rejected_candidate_without_force_reports_existing_destination_as_present() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    let existing = home.path().join("auth.json");
    let current =
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"current","refresh_token":"rotated"}}"#;
    std::fs::write(&existing, current).expect("current credential");

    let outcome = install_candidate(
        &reader,
        data.path(),
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"rejected","refresh_token":"stale"}}"#,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            force: false,
        },
    )
    .await
    .expect("existing destination wins before rejection policy");

    assert_eq!(
        outcome,
        InstallDocumentResult::AlreadyPresent(existing.clone())
    );
    assert_eq!(std::fs::read_to_string(existing).unwrap(), current);
}

/// Force adopts a rejected candidate only into an empty destination; it never
/// turns conditional mode into overwrite.
#[tokio::test]
async fn force_allows_rejected_candidate_only_when_destination_is_empty() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    let existing = home.path().join("auth.json");
    let current =
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"current","refresh_token":"rotated"}}"#;
    std::fs::write(&existing, current).expect("current credential");

    let outcome = install_candidate(
        &reader,
        data.path(),
        r#"{"auth_mode":"chatgpt","tokens":{"access_token":"rejected","refresh_token":"stale"}}"#,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            force: true,
        },
    )
    .await
    .expect("force permits consideration of rejected candidate");

    assert_eq!(
        outcome,
        InstallDocumentResult::AlreadyPresent(existing.clone())
    );
    assert_eq!(std::fs::read_to_string(existing).unwrap(), current);
}

/// Ordinary import retains its compatibility contract: an explicit
/// replacement installs even when the probe rejected the staged credential.
#[tokio::test]
async fn ordinary_import_still_replaces_a_rejected_candidate() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, home.path());
    std::fs::write(
        home.path().join("oauth_creds.json"),
        r#"{"access_token":"current"}"#,
    )
    .expect("current credential");
    let candidate = r#"{"access_token":"rejected","scope":"preserved"}"#;

    let outcome = install_candidate(
        &reader,
        data.path(),
        candidate,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: false,
            force: false,
        },
    )
    .await
    .expect("ordinary replacement compatibility");

    assert!(matches!(outcome, InstallDocumentResult::Installed(_)));
    assert_eq!(
        std::fs::read_to_string(home.path().join("oauth_creds.json")).unwrap(),
        candidate
    );
}
