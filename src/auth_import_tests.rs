//! Unit tests for import reporting ([`crate::auth_import`]).

use super::*;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::IntoResponse as _;
use axum::routing::any;
use axum::Router;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct CandidateVendor {
    provider: SubscriptionProvider,
    reject_refresh: bool,
    requests: Arc<Mutex<Vec<(String, String, String)>>>,
}

async fn candidate_vendor(
    State(state): State<CandidateVendor>,
    request: Request,
) -> axum::response::Response {
    let method = request.method().to_string();
    let path = request.uri().path().to_string();
    let authorization = request
        .headers()
        .get("authorization")
        .and_then(|value| value.to_str().ok())
        .unwrap_or_default()
        .to_string();
    state
        .requests
        .lock()
        .expect("candidate requests")
        .push((method, path.clone(), authorization));

    if path == "/token" {
        if state.reject_refresh {
            return (
                StatusCode::BAD_REQUEST,
                axum::Json(serde_json::json!({"error":"invalid_grant"})),
            )
                .into_response();
        }
        return axum::Json(serde_json::json!({
            "access_token":"fresh-access",
            "refresh_token":"fresh-refresh",
            "expires_in":3600
        }))
        .into_response();
    }

    let catalog = match state.provider {
        SubscriptionProvider::Claude => serde_json::json!({"data":[{"id":"claude-live"}]}),
        SubscriptionProvider::Codex => serde_json::json!({"models":[{"slug":"gpt-live"}]}),
        SubscriptionProvider::Gemini => serde_json::json!({
            "models":[{"name":"models/gemini-live","supportedGenerationMethods":["generateContent"]}]
        }),
        SubscriptionProvider::Qwen => serde_json::json!({"data":[{"id":"qwen-live"}]}),
    };
    axum::Json(catalog).into_response()
}

async fn start_candidate_vendor(
    provider: SubscriptionProvider,
    reject_refresh: bool,
) -> (
    String,
    Arc<Mutex<Vec<(String, String, String)>>>,
    tokio::task::JoinHandle<()>,
) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new().fallback(any(candidate_vendor)).with_state(CandidateVendor {
        provider,
        reject_refresh,
        requests: Arc::clone(&requests),
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("candidate vendor listener");
    let url = format!("http://{}", listener.local_addr().unwrap());
    let task = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (url, requests, task)
}

fn candidate_document(provider: SubscriptionProvider) -> String {
    match provider {
        SubscriptionProvider::Claude => serde_json::json!({
            "claudeAiOauth": {
                "accessToken":"stale-access",
                "refreshToken":"stale-refresh",
                "expiresAt":9_999_999_999_999_i64
            },
            "vendor_marker":"preserved"
        }),
        SubscriptionProvider::Codex => serde_json::json!({
            "auth_mode":"chatgpt",
            "tokens": {
                "access_token":"stale-access",
                "refresh_token":"stale-refresh",
                "account_id":"acct-import"
            },
            "vendor_marker":"preserved"
        }),
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => serde_json::json!({
            "access_token":"stale-access",
            "refresh_token":"stale-refresh",
            "expiry_date":9_999_999_999_999_i64,
            "vendor_marker":"preserved"
        }),
    }
    .to_string()
}

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

/// A safe import proves the rotating chain in an isolated durable store, then
/// probes the vendor's non-inference catalog with the persisted fresh access
/// token. Only that staged document may be promoted (issue #385).
#[tokio::test]
async fn refresh_chain_validation_precedes_promotion_for_every_provider() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, false).await;
        let root = tempfile::tempdir().expect("import root");
        let destination_home = root.path().join("destination");
        std::fs::create_dir_all(&destination_home).expect("destination home");
        let destination = SubscriptionReader::new(provider, &destination_home);
        let destination_path = destination_home.join(provider.canonical_credential_filename());
        let current = candidate_document(provider).replace("stale-", "current-");
        std::fs::write(&destination_path, &current).expect("current destination");

        let validated = validate_candidate_with(
            root.path(),
            provider,
            &candidate_document(provider),
            Some(&format!("{url}/token")),
            Some(&url),
        )
        .await
        .expect("refresh chain and catalog must validate");

        let staged: serde_json::Value =
            serde_json::from_str(&validated.document).expect("staged document");
        assert_eq!(staged["vendor_marker"], "preserved", "{provider}");
        assert!(
            validated.document.contains("fresh-access")
                && validated.document.contains("fresh-refresh"),
            "{provider} did not return the durably rotated candidate: {}",
            validated.document
        );
        assert_eq!(
            std::fs::read_to_string(&destination_path).unwrap(),
            current,
            "{provider} changed destination during validation"
        );

        install_candidate(
            &destination,
            root.path(),
            &validated.document,
            CredentialProbe::Accepted,
            ImportPolicy::default(),
        )
        .await
        .expect("validated candidate promotion");
        assert_eq!(
            std::fs::read_to_string(&destination_path).unwrap(),
            validated.document,
            "{provider} did not promote the staged bytes"
        );

        let seen = requests.lock().expect("candidate requests");
        assert_eq!(seen.len(), 2, "{provider}: {seen:?}");
        assert_eq!(seen[0].0, "POST", "{provider}: {seen:?}");
        assert_eq!(seen[0].1, "/token", "{provider}: {seen:?}");
        assert_eq!(seen[1].0, "GET", "{provider}: {seen:?}");
        assert_eq!(seen[1].2, "Bearer fresh-access", "{provider}: {seen:?}");
        drop(seen);
        server.abort();
    }
}

/// A live access token paired with an already-spent refresh link is unsafe:
/// catalog acceptance of that access token cannot authorize replacement.
#[tokio::test]
async fn a_rejected_refresh_chain_never_reaches_catalog_or_destination() {
    let provider = SubscriptionProvider::Qwen;
    let (url, requests, server) = start_candidate_vendor(provider, true).await;
    let root = tempfile::tempdir().expect("import root");
    let destination_home = root.path().join("destination");
    std::fs::create_dir_all(&destination_home).expect("destination home");
    let destination_path = destination_home.join(provider.canonical_credential_filename());
    let current = candidate_document(provider).replace("stale-", "current-");
    std::fs::write(&destination_path, &current).expect("current destination");

    let error = validate_candidate_with(
        root.path(),
        provider,
        &candidate_document(provider),
        Some(&format!("{url}/token")),
        Some(&url),
    )
    .await
    .expect_err("spent refresh chain must be rejected");

    assert!(error.contains("invalid_grant"), "{error}");
    assert_eq!(
        std::fs::read_to_string(destination_path).unwrap(),
        current
    );
    let seen = requests.lock().expect("candidate requests");
    assert_eq!(seen.len(), 1, "catalog was reached after refresh failure: {seen:?}");
    assert_eq!(seen[0].1, "/token");
    drop(seen);
    server.abort();
}

/// No import mode may install a credential the vendor did not positively
/// accept. In particular, conditional provisioning has no force escape hatch
/// that can turn a rejected candidate into a live deployment credential.
#[tokio::test]
async fn rejected_conditional_candidate_has_no_bypass() {
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

    assert!(error.contains("not accepted"), "{error}");
    assert!(!error.contains("--force"), "{error}");
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

/// An unverified candidate is not a live credential. A timeout, malformed
/// catalog response, or network failure must therefore leave even an empty
/// conditional destination empty.
#[tokio::test]
async fn conditional_import_refuses_an_unverified_candidate() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, home.path());
    let error = install_candidate(
        &reader,
        data.path(),
        r#"{"access_token":"unverified","refresh_token":"unknown"}"#,
        CredentialProbe::Unverified,
        ImportPolicy {
            if_absent: true,
            force: false,
        },
    )
    .await
    .expect_err("unverified candidate must be refused");

    assert!(error.contains("not accepted"), "{error}");
    assert!(!home.path().join("oauth_creds.json").exists());
}

/// The obsolete force spelling is not a bypass: even if an older caller still
/// constructs that internal policy, rejection wins.
#[tokio::test]
async fn force_cannot_install_a_rejected_candidate() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Codex, home.path());
    let candidate = r#"{"auth_mode":"chatgpt","tokens":{"access_token":"rejected","refresh_token":"explicit"}}"#;

    let error = install_candidate(
        &reader,
        data.path(),
        candidate,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: true,
            force: true,
        },
    )
    .await
    .expect_err("force must not bypass positive vendor acceptance");

    let destination = home.path().join("auth.json");
    assert!(error.contains("not accepted"), "{error}");
    assert!(!destination.exists());
}

/// Replacement is allowed only for a positively accepted candidate. A stale
/// or revoked local copy must never replace a working rotating chain.
#[tokio::test]
async fn ordinary_import_preserves_the_destination_when_candidate_is_rejected() {
    let home = tempfile::tempdir().expect("credential home");
    let data = tempfile::tempdir().expect("router data");
    let reader = SubscriptionReader::new(SubscriptionProvider::Gemini, home.path());
    std::fs::write(
        home.path().join("oauth_creds.json"),
        r#"{"access_token":"current"}"#,
    )
    .expect("current credential");
    let candidate = r#"{"access_token":"rejected","scope":"preserved"}"#;

    let current = r#"{"access_token":"current","refresh_token":"rotated"}"#;
    std::fs::write(home.path().join("oauth_creds.json"), current)
        .expect("current credential");
    let error = install_candidate(
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
    .expect_err("replacement must require positive vendor acceptance");

    assert!(error.contains("not accepted"), "{error}");
    assert_eq!(
        std::fs::read_to_string(home.path().join("oauth_creds.json")).unwrap(),
        current
    );
}

/// The same positive-acceptance gate applies to every subscription provider
/// and to both installation modes (issue #385).
#[tokio::test]
async fn rejected_and_unverified_candidates_never_change_any_provider_destination() {
    for provider in SubscriptionProvider::ALL {
        for if_absent in [false, true] {
            for probe in [CredentialProbe::Rejected, CredentialProbe::Unverified] {
                let root = tempfile::tempdir().expect("credential root");
                let home = root.path().join("home");
                let data = root.path().join("data");
                std::fs::create_dir_all(&home).expect("credential home");
                let reader = SubscriptionReader::new(provider, &home);
                let path = home.join(provider.canonical_credential_filename());
                let current = b"existing credential bytes";
                if !if_absent {
                    std::fs::write(&path, current).expect("existing credential");
                }

                let result = install_candidate(
                    &reader,
                    &data,
                    r#"{"access_token":"candidate","refresh_token":"candidate-refresh"}"#,
                    probe,
                    ImportPolicy {
                        if_absent,
                        force: false,
                    },
                )
                .await;

                assert!(result.is_err(), "{provider} if_absent={if_absent} {probe:?}");
                if if_absent {
                    assert!(!path.exists(), "{provider} installed {probe:?}");
                } else {
                    assert_eq!(
                        std::fs::read(&path).unwrap(),
                        current,
                        "{provider} replaced destination after {probe:?}"
                    );
                }
            }
        }
    }
}
