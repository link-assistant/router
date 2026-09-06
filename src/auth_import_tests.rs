//! Unit tests for import reporting ([`crate::auth_import`]).

use super::*;
use axum::Router;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::IntoResponse as _;
use axum::routing::any;
use std::sync::{Arc, Mutex};

#[derive(Clone)]
struct CandidateVendor {
    provider: SubscriptionProvider,
    reject_refresh: bool,
    fail_catalog: bool,
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

    if state.fail_catalog {
        return (
            StatusCode::SERVICE_UNAVAILABLE,
            axum::Json(serde_json::json!({"error":"temporary catalog outage"})),
        )
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
    fail_catalog: bool,
) -> (
    String,
    Arc<Mutex<Vec<(String, String, String)>>>,
    tokio::task::JoinHandle<()>,
) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new()
        .fallback(any(candidate_vendor))
        .with_state(CandidateVendor {
            provider,
            reject_refresh,
            fail_catalog,
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
        SubscriptionProvider::Gemini => serde_json::json!({
            "access_token":"stale-access",
            "refresh_token":"stale-refresh",
            "expiry_date":9_999_999_999_999_i64,
            "vendor_marker":"preserved"
        }),
        SubscriptionProvider::Qwen => serde_json::json!({
            "access_token":"stale-access",
            "refresh_token":"stale-refresh",
            "expiry_date":9_999_999_999_999_i64,
            "resource_url":"portal.qwen.ai",
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
        let (url, requests, server) = start_candidate_vendor(provider, false, false).await;
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
            serde_json::from_str(validated.document()).expect("staged document");
        assert_eq!(staged["vendor_marker"], "preserved", "{provider}");
        assert!(
            validated.document().contains("fresh-access")
                && validated.document().contains("fresh-refresh"),
            "{provider} did not return the durably rotated candidate: {}",
            validated.document()
        );
        assert_eq!(
            std::fs::read_to_string(&destination_path).unwrap(),
            current,
            "{provider} changed destination during validation"
        );

        install_candidate(
            &destination,
            root.path(),
            validated.document(),
            CredentialProbe::Accepted,
            ImportPolicy::default(),
        )
        .await
        .expect("validated candidate promotion");
        assert_eq!(
            std::fs::read_to_string(&destination_path).unwrap(),
            validated.document(),
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

/// A fresh import adopts one writable vendor-owned file. It must validate the
/// current access token without redeeming the refresh token, then install only
/// a reference to that source (issue #439).
#[tokio::test]
async fn fresh_import_keeps_one_authoritative_refresh_chain_for_every_provider() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, false, false).await;
        let root = tempfile::tempdir().expect("import root");
        let source_home = root.path().join("source");
        let destination_home = root.path().join("destination");
        let data_dir = root.path().join("data");
        std::fs::create_dir_all(&source_home).expect("source home");
        std::fs::create_dir_all(&destination_home).expect("destination home");
        let source_path = source_home.join(provider.canonical_credential_filename());
        let source_document = candidate_document(provider);
        std::fs::write(&source_path, &source_document).expect("vendor credential");

        let execution = import_provider_with_paths(
            &data_dir,
            root.path().to_str().expect("UTF-8 test path"),
            &destination_home,
            provider,
            source_home.to_str().expect("UTF-8 source path"),
            ImportPolicy::default(),
            None,
            Some(&url),
        )
        .await
        .expect("fresh external import");

        assert!(execution.is_promoted(), "{provider} was not promoted");
        assert_eq!(
            std::fs::read_to_string(&source_path).unwrap(),
            source_document,
            "{provider} source changed during import"
        );
        let destination_path = destination_home.join(provider.canonical_credential_filename());
        let pointer = std::fs::read_to_string(&destination_path).expect("Router reference");
        assert!(
            pointer.contains("credential_source"),
            "{provider}: {pointer}"
        );
        assert!(!pointer.contains("stale-access"), "{provider}: {pointer}");
        assert!(!pointer.contains("stale-refresh"), "{provider}: {pointer}");
        let reader = SubscriptionReader::new(provider, &destination_home);
        let (token, origin) = reader.read_token_from().expect("read adopted source");
        assert_eq!(
            origin,
            link_assistant_router::platform_keychain::Origin::AdoptedFile
        );
        assert_eq!(token.access_token, "stale-access");
        assert_eq!(
            requests.lock().expect("candidate requests").as_slice(),
            &[(
                "GET".to_string(),
                match provider {
                    SubscriptionProvider::Claude => "/v1/models".to_string(),
                    SubscriptionProvider::Codex | SubscriptionProvider::Qwen => {
                        "/models".to_string()
                    }
                    SubscriptionProvider::Gemini => "/v1beta/models".to_string(),
                },
                "Bearer stale-access".to_string(),
            )],
            "{provider} made an OAuth exchange"
        );
        server.abort();
    }
}

#[tokio::test]
async fn fresh_import_refuses_near_expiry_before_any_vendor_request() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, false, false).await;
        let root = tempfile::tempdir().expect("import root");
        let source_home = root.path().join("source");
        let destination_home = root.path().join("destination");
        std::fs::create_dir_all(&source_home).expect("source home");
        std::fs::create_dir_all(&destination_home).expect("destination home");
        let mut document: serde_json::Value =
            serde_json::from_str(&candidate_document(provider)).expect("candidate JSON");
        let expired = chrono::Utc::now().timestamp_millis();
        if provider == SubscriptionProvider::Claude {
            document["claudeAiOauth"]["expiresAt"] = expired.into();
        } else {
            document["expiry_date"] = expired.into();
        }
        let source_document = document.to_string();
        let source_path = source_home.join(provider.canonical_credential_filename());
        std::fs::write(&source_path, &source_document).expect("vendor credential");

        let Err(error) = import_provider_with_paths(
            &root.path().join("data"),
            root.path().to_str().expect("UTF-8 test path"),
            &destination_home,
            provider,
            source_home.to_str().expect("UTF-8 source path"),
            ImportPolicy::default(),
            None,
            Some(&url),
        )
        .await
        else {
            panic!("{provider} near-expiry external credential was imported");
        };

        assert!(
            error.contains("expired or near expiry"),
            "{provider}: {error}"
        );
        assert!(requests.lock().expect("candidate requests").is_empty());
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            source_document
        );
        assert!(
            !destination_home
                .join(provider.canonical_credential_filename())
                .exists()
        );
        server.abort();
    }
}

#[tokio::test]
async fn fresh_import_catalog_failure_spends_no_refresh_token_or_transaction() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, false, true).await;
        let root = tempfile::tempdir().expect("import root");
        let source_home = root.path().join("source");
        let destination_home = root.path().join("destination");
        std::fs::create_dir_all(&source_home).expect("source home");
        std::fs::create_dir_all(&destination_home).expect("destination home");
        let source_path = source_home.join(provider.canonical_credential_filename());
        let source_document = candidate_document(provider);
        std::fs::write(&source_path, &source_document).expect("vendor credential");

        let Err(error) = import_provider_with_paths(
            &root.path().join("data"),
            root.path().to_str().expect("UTF-8 test path"),
            &destination_home,
            provider,
            source_home.to_str().expect("UTF-8 source path"),
            ImportPolicy::default(),
            None,
            Some(&url),
        )
        .await
        else {
            panic!("{provider} catalog failure was imported");
        };

        assert!(error.previous_credential_safe, "{provider}: {error}");
        assert!(error.transaction_id.is_none(), "{provider}: {error}");
        let seen = requests.lock().expect("candidate requests");
        assert_eq!(seen.len(), 1, "{provider}: {seen:?}");
        assert_eq!(seen[0].0, "GET", "{provider}: {seen:?}");
        drop(seen);
        assert_eq!(
            std::fs::read_to_string(source_path).unwrap(),
            source_document
        );
        assert!(
            !destination_home
                .join(provider.canonical_credential_filename())
                .exists()
        );
        assert_eq!(
            std::fs::read_dir(root.path().join("data/auth-import-candidates"))
                .expect("staging root")
                .count(),
            0,
            "{provider} retained an externally owned copy"
        );
        server.abort();
    }
}

#[test]
fn keychain_only_source_is_refused_before_validation() {
    let root = tempfile::tempdir().expect("root");
    let destination = SubscriptionReader::new(SubscriptionProvider::Claude, root.path());
    let error = prepare_external_source(
        SubscriptionProvider::Claude,
        link_assistant_router::platform_keychain::Origin::Keychain,
        None,
        &destination,
    )
    .expect_err("Keychain-only import");
    assert!(error.contains("platform keychain"), "{error}");
    assert!(error.contains("writable credential file"), "{error}");
}

#[cfg(unix)]
#[test]
fn aliased_source_and_destination_file_is_refused() {
    let root = tempfile::tempdir().expect("root");
    let source_home = root.path().join("source");
    let destination_home = root.path().join("destination");
    std::fs::create_dir_all(&source_home).expect("source home");
    std::fs::create_dir_all(&destination_home).expect("destination home");
    let source = source_home.join("auth.json");
    std::fs::write(&source, candidate_document(SubscriptionProvider::Codex))
        .expect("source credential");
    std::os::unix::fs::symlink(&source, destination_home.join("auth.json"))
        .expect("destination alias");
    let destination = SubscriptionReader::new(SubscriptionProvider::Codex, destination_home);

    let error = prepare_external_source(
        SubscriptionProvider::Codex,
        link_assistant_router::platform_keychain::Origin::File,
        Some(&source),
        &destination,
    )
    .expect_err("source/destination alias");
    assert!(error.contains("also a Router destination"), "{error}");
}

#[cfg(unix)]
#[test]
fn source_in_a_nonwritable_directory_is_refused_before_validation() {
    use std::os::unix::fs::PermissionsExt as _;

    let root = tempfile::tempdir().expect("root");
    let source_home = root.path().join("source");
    let destination_home = root.path().join("destination");
    std::fs::create_dir_all(&source_home).expect("source home");
    std::fs::create_dir_all(&destination_home).expect("destination home");
    let source = source_home.join("auth.json");
    std::fs::write(&source, candidate_document(SubscriptionProvider::Codex))
        .expect("source credential");
    std::fs::set_permissions(&source_home, std::fs::Permissions::from_mode(0o500))
        .expect("make source directory nonwritable");
    let destination = SubscriptionReader::new(SubscriptionProvider::Codex, destination_home);

    let result = prepare_external_source(
        SubscriptionProvider::Codex,
        link_assistant_router::platform_keychain::Origin::File,
        Some(&source),
        &destination,
    );
    std::fs::set_permissions(&source_home, std::fs::Permissions::from_mode(0o700))
        .expect("restore source permissions");
    let error = result.expect_err("nonwritable external source");
    assert!(error.contains("cannot be replaced atomically"), "{error}");
}

/// A live access token paired with an already-spent refresh link is unsafe:
/// catalog acceptance of that access token cannot authorize replacement.
#[tokio::test]
async fn a_rejected_refresh_chain_never_reaches_catalog_or_destination() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, true, false).await;
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

        assert!(error.contains("invalid_grant"), "{provider}: {error}");
        assert_eq!(error.outcome, ImportOutcome::ExchangeRejected);
        assert_eq!(error.phase, ImportPhase::Exchange);
        assert!(error.previous_credential_safe);
        assert_eq!(error.transaction_id, None);
        assert!(!error.contains("retained as transaction"), "{error}");
        let transactions = std::fs::read_dir(root.path().join("auth-import-candidates"))
            .expect("retained staging root")
            .collect::<Result<Vec<_>, _>>()
            .expect("retained transactions");
        assert!(transactions.is_empty(), "{provider}: {error}");
        assert_eq!(
            std::fs::read_to_string(destination_path).unwrap(),
            current,
            "{provider} destination changed"
        );
        let seen = requests.lock().expect("candidate requests");
        assert_eq!(
            seen.len(),
            1,
            "{provider} catalog was reached after refresh failure: {seen:?}"
        );
        assert_eq!(seen[0].1, "/token");
        drop(seen);
        server.abort();
    }
}

/// A transport failure cannot prove whether the provider advanced a rotating
/// chain before the connection disappeared. No staged bytes are a proven
/// successor, so automation receives no resumable transaction ID.
#[tokio::test]
async fn an_inconclusive_exchange_reports_uncertain_retained_state() {
    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("reserve dead endpoint");
    let token_url = format!("http://{}/token", listener.local_addr().unwrap());
    drop(listener);
    let root = tempfile::tempdir().expect("import root");

    let error = validate_candidate_with(
        root.path(),
        SubscriptionProvider::Claude,
        &candidate_document(SubscriptionProvider::Claude),
        Some(&token_url),
        Some("http://127.0.0.1:1"),
    )
    .await
    .expect_err("connection loss must remain uncertain");

    assert_eq!(error.outcome, ImportOutcome::ExchangeUncertain);
    assert_eq!(error.phase, ImportPhase::Exchange);
    assert!(!error.previous_credential_safe);
    assert!(error.transaction_id.is_none());
    assert!(!error.contains("retained as transaction"), "{error}");
    assert_eq!(
        std::fs::read_dir(root.path().join("auth-import-candidates"))
            .expect("staging root")
            .count(),
        0
    );
}

/// Qwen Code issues a per-credential service origin. Safe import must use that
/// official origin rather than silently probing a different `DashScope` service.
#[test]
fn qwen_import_uses_the_vendor_issued_catalog_origin() {
    let token = link_assistant_router::subscription::SubscriptionToken {
        access_token: "redacted".into(),
        refresh_token: Some("redacted".into()),
        expires_at_ms: None,
        account_id: None,
        resource_url: Some("portal.qwen.ai".into()),
    };

    assert_eq!(
        catalog_base_for_candidate(SubscriptionProvider::Qwen, &token).unwrap(),
        "https://portal.qwen.ai/v1"
    );
}

/// A credential document is untrusted input. Its Qwen `resource_url` must not
/// turn catalog validation into a bearer-token SSRF.
#[test]
fn qwen_import_rejects_non_vendor_catalog_origins() {
    for resource_url in [
        "http://portal.qwen.ai",
        "https://127.0.0.1",
        "https://portal.qwen.ai.attacker.example",
        "https://user@portal.qwen.ai",
        "https://portal.qwen.ai:8443",
        "https://portal.qwen.ai?redirect=https://attacker.example",
    ] {
        let token = link_assistant_router::subscription::SubscriptionToken {
            access_token: "redacted".into(),
            refresh_token: Some("redacted".into()),
            expires_at_ms: None,
            account_id: None,
            resource_url: Some(resource_url.into()),
        };

        assert!(
            catalog_base_for_candidate(SubscriptionProvider::Qwen, &token).is_err(),
            "untrusted Qwen origin was accepted: {resource_url}"
        );
    }
}

/// Every non-Qwen provider uses the catalog origin owned by that provider,
/// while a Qwen credential without an issued resource URL uses its documented
/// `DashScope` default.
#[test]
fn catalog_validation_uses_only_provider_owned_defaults() {
    let token = link_assistant_router::subscription::SubscriptionToken {
        access_token: "redacted".into(),
        refresh_token: Some("redacted".into()),
        expires_at_ms: None,
        account_id: None,
        resource_url: None,
    };

    assert_eq!(
        catalog_base_for_candidate(SubscriptionProvider::Gemini, &token).unwrap(),
        "https://generativelanguage.googleapis.com"
    );
    assert_eq!(
        catalog_base_for_candidate(SubscriptionProvider::Claude, &token).unwrap(),
        SubscriptionProvider::Claude.default_base_url()
    );
    assert_eq!(
        catalog_base_for_candidate(SubscriptionProvider::Qwen, &token).unwrap(),
        SubscriptionProvider::Qwen.default_base_url()
    );
}

/// Diagnostics for an advanced refresh chain must identify the transaction
/// without retaining credential material in formatted output. Explicit
/// retention must leave that transaction available for operator recovery.
#[tokio::test]
async fn validated_candidate_diagnostics_are_redacted_and_retention_is_durable() {
    let provider = SubscriptionProvider::Claude;
    let (url, _requests, server) = start_candidate_vendor(provider, false, false).await;
    let root = tempfile::tempdir().expect("staging root");
    let candidate = validate_candidate_with(
        root.path(),
        provider,
        &candidate_document(provider),
        Some(&format!("{url}/token")),
        Some(&url),
    )
    .await
    .expect("candidate acceptance");
    let transaction_id = candidate.transaction_id().to_string();

    let diagnostic = format!("{candidate:?}");
    assert!(diagnostic.contains(&transaction_id), "{diagnostic}");
    assert!(!diagnostic.contains("secret"), "{diagnostic}");

    assert_eq!(candidate.retain(), transaction_id);
    let retained = std::fs::read_dir(root.path().join("auth-import-candidates"))
        .expect("retained root")
        .next()
        .expect("retained transaction")
        .expect("retained entry")
        .path();
    assert!(
        retained
            .join(provider.as_str())
            .join(provider.canonical_credential_filename())
            .is_file()
    );
    server.abort();
}

/// Machine output contains only the stable contract fields. Human diagnostics
/// can carry arbitrary failure context without ever entering serialized JSON.
#[test]
fn machine_results_are_stable_and_credential_free() {
    let retained = ImportExecution::failed(
        Some("codex"),
        ImportFailure::retained(
            ImportPhase::Catalog,
            "opaque-transaction".to_string(),
            "must-not-leak access-token refresh-token credential document",
        ),
    );
    let promoted = ImportExecution::promoted(
        "qwen",
        vec!["human output may name must-not-leak".to_string()],
    );
    let rejected = ImportExecution::failed(
        Some("claude"),
        ImportFailure::from_refresh_kind_for_test(
            link_assistant_router::refresh::ImportRefreshFailureKind::ExchangeRejected,
            "unused-transaction",
        ),
    );
    let exchange_uncertain = ImportExecution::failed(
        Some("claude"),
        ImportFailure::from_refresh_kind_for_test(
            link_assistant_router::refresh::ImportRefreshFailureKind::ExchangeUncertain,
            "exchange-transaction",
        ),
    );
    let persistence_uncertain = ImportExecution::failed(
        Some("codex"),
        ImportFailure::from_refresh_kind_for_test(
            link_assistant_router::refresh::ImportRefreshFailureKind::PersistenceUncertain,
            "persistence-transaction",
        ),
    );
    let already_present = ImportExecution::already_present("gemini", Vec::new());
    let value = import_result::json_value(&[
        retained,
        promoted,
        rejected,
        exchange_uncertain,
        persistence_uncertain,
        already_present,
    ]);
    let serialized = value.to_string();

    assert_eq!(value["schema_version"], 1);
    assert_eq!(value["results"][0]["provider"], "codex");
    assert_eq!(value["results"][0]["outcome"], "successor_retained");
    assert_eq!(value["results"][0]["phase"], "catalog");
    assert_eq!(value["results"][0]["previous_credential_safe"], false);
    assert_eq!(value["results"][0]["transaction_id"], "opaque-transaction");
    assert_eq!(value["results"][1]["outcome"], "promoted");
    assert_eq!(value["results"][2]["outcome"], "exchange_rejected");
    assert_eq!(value["results"][2]["previous_credential_safe"], true);
    assert!(value["results"][2]["transaction_id"].is_null());
    assert_eq!(value["results"][3]["outcome"], "exchange_uncertain");
    assert_eq!(value["results"][3]["phase"], "exchange");
    assert!(value["results"][3]["transaction_id"].is_null());
    assert_eq!(value["results"][4]["outcome"], "persistence_uncertain");
    assert_eq!(value["results"][4]["phase"], "persistence");
    assert!(value["results"][4]["transaction_id"].is_null());
    assert_eq!(value["results"][5]["outcome"], "already_present");
    assert!(!serialized.contains("must-not-leak"), "{serialized}");
    assert!(!serialized.contains("access-token"), "{serialized}");
    assert!(!serialized.contains("refresh-token"), "{serialized}");
}

/// Persistence and authoritative reread failures happen after a provider may
/// have rotated the chain, and therefore always require retained recovery.
#[test]
fn persistence_uncertainty_does_not_claim_an_unproven_successor() {
    let failure = ImportFailure::from_refresh_kind_for_test(
        link_assistant_router::refresh::ImportRefreshFailureKind::PersistenceUncertain,
        "persistence-transaction",
    );
    assert_eq!(failure.outcome, ImportOutcome::PersistenceUncertain);
    assert_eq!(failure.phase, ImportPhase::Persistence);
    assert!(!failure.previous_credential_safe);
    assert!(failure.transaction_id.is_none());
}

/// Resume resolves an opaque identifier to one owner-only provider directory,
/// while traversal-like identifiers never become filesystem paths.
#[test]
fn retained_transactions_resolve_by_opaque_id_only() {
    let root = tempfile::tempdir().expect("router data");
    let transaction_id = "opaque-transaction";
    let transaction = root
        .path()
        .join("auth-import-candidates")
        .join(format!("{transaction_id}-random"));
    let provider = transaction.join("qwen");
    std::fs::create_dir_all(&provider).expect("retained provider");

    let resolved = import_resume::resolve(root.path(), transaction_id).expect("resume candidate");
    assert_eq!(resolved.provider, ImportProvider::Qwen);
    assert_eq!(resolved.source, provider.to_string_lossy());
    assert_eq!(resolved.transaction_id, transaction_id);

    let error = import_resume::resolve(root.path(), "../opaque-transaction")
        .expect_err("path syntax must not be accepted as an opaque ID");
    assert_eq!(error.outcome, ImportOutcome::NotAttempted);
}

#[tokio::test]
async fn retained_transaction_has_one_exclusive_resume_claim() {
    let root = tempfile::tempdir().expect("router data");
    let transaction_id = "exclusive-transaction";
    let provider = root
        .path()
        .join("auth-import-candidates")
        .join(format!("{transaction_id}-random"))
        .join("qwen");
    std::fs::create_dir_all(&provider).expect("retained provider");

    let first = import_resume::resolve_claimed(root.path(), transaction_id)
        .await
        .expect("first resume claim");
    let second = import_resume::resolve_claimed(root.path(), transaction_id)
        .await
        .expect_err("a transaction must have only one active resume");
    assert_eq!(second.outcome, ImportOutcome::NotAttempted);
    assert!(second.contains("already being resumed"), "{second}");

    drop(first);
    assert!(
        import_resume::resolve_claimed(root.path(), transaction_id)
            .await
            .is_ok(),
        "a failed attempt must release the durable claim for recovery"
    );
}

#[tokio::test]
async fn invalid_resume_id_is_rejected_before_any_lock_path_is_created() {
    let root = tempfile::tempdir().expect("router data");

    let error = import_resume::resolve_claimed(root.path(), "x/../../../outside")
        .await
        .expect_err("path syntax must be rejected before lock creation");

    assert_eq!(error.outcome, ImportOutcome::NotAttempted);
    assert!(!root.path().join("auth-import-candidates").exists());
    assert!(!root.path().parent().unwrap().join("outside.lock").exists());
}

#[tokio::test]
async fn candidate_install_does_not_invent_external_ownership() {
    let router_home = tempfile::tempdir().expect("Router destination");
    let data = tempfile::tempdir().expect("router data");
    let document = r#"{"access_token":"accepted","refresh_token":"rotating"}"#;
    let reader = SubscriptionReader::new(SubscriptionProvider::Qwen, router_home.path());
    install_candidate(
        &reader,
        data.path(),
        document,
        CredentialProbe::Accepted,
        ImportPolicy::default(),
    )
    .await
    .expect("accepted candidate install");
    assert_eq!(
        reader
            .read_document_for_import()
            .expect("installed document")
            .origin,
        link_assistant_router::platform_keychain::Origin::File
    );
}

#[test]
fn cleanup_failure_is_machine_readable_and_keeps_the_transaction_id() {
    let mut execution = ImportExecution::promoted("qwen", Vec::new());
    execution.mark_cleanup_pending(
        "cleanup-transaction".into(),
        "redacted cleanup failure".into(),
    );
    let value = import_result::json_value(&[execution]);
    assert_eq!(value["results"][0]["outcome"], "promotion_cleanup_pending");
    assert_eq!(value["results"][0]["phase"], "promotion");
    assert_eq!(value["results"][0]["transaction_id"], "cleanup-transaction");
}

/// The CLI spelling, report label, and subscription implementation must remain
/// a total, explicit mapping. GitHub is intentionally the one non-subscription
/// import target.
#[test]
fn every_import_target_has_the_expected_label_and_subscription() {
    let cases = [
        (
            ImportProvider::Claude,
            "claude",
            Some(SubscriptionProvider::Claude),
        ),
        (
            ImportProvider::Codex,
            "codex",
            Some(SubscriptionProvider::Codex),
        ),
        (
            ImportProvider::Gemini,
            "gemini",
            Some(SubscriptionProvider::Gemini),
        ),
        (
            ImportProvider::Qwen,
            "qwen",
            Some(SubscriptionProvider::Qwen),
        ),
        (ImportProvider::Gh, "github", None),
    ];

    for (target, label, subscription) in cases {
        assert_eq!(provider_label(target), label);
        assert_eq!(subscription_of(target), subscription);
    }
}

/// GitHub import copies the exact credential from the explicitly named `gh`
/// home into Router's durable credential store.
#[test]
fn github_import_adopts_the_named_login() {
    let source = tempfile::tempdir().expect("gh config");
    let data = tempfile::tempdir().expect("router data");
    std::fs::write(
        source.path().join("hosts.yml"),
        "github.com:\n    oauth_token: gho_imported\n",
    )
    .expect("gh credential");

    import_github(data.path(), source.path().to_str().unwrap()).expect("GitHub import");

    assert_eq!(
        link_assistant_router::github_proxy::stored_credential(data.path()).as_deref(),
        Some("gho_imported")
    );
}

/// A named `gh` home without a token fails closed and names the source rather
/// than silently falling back to another machine credential.
#[test]
fn github_import_refuses_a_named_home_without_a_login() {
    let source = tempfile::tempdir().expect("empty gh config");
    let data = tempfile::tempdir().expect("router data");

    let error = import_github(data.path(), source.path().to_str().unwrap())
        .expect_err("an absent GitHub login must not import");

    assert!(error.contains("no GitHub credential"), "{error}");
    assert!(
        error.contains(&source.path().display().to_string()),
        "{error}"
    );
    assert!(link_assistant_router::github_proxy::stored_credential(data.path()).is_none());
}

/// Lexically different paths can still name the same credential home. That
/// must be detected before a rotating refresh link is spent.
#[cfg(unix)]
#[test]
fn a_symlink_alias_is_the_same_credential_home() {
    let root = tempfile::tempdir().expect("root");
    let destination = root.path().join("destination");
    let alias = root.path().join("alias");
    std::fs::create_dir(&destination).expect("destination");
    std::os::unix::fs::symlink(&destination, &alias).expect("source alias");

    assert!(same_credential_home(&alias, &destination));
}

/// Once refresh succeeds, failure to obtain a positive catalog verdict keeps
/// the fresh candidate durable without changing the serving destination.
#[tokio::test]
async fn an_unverified_catalog_retains_the_fresh_chain_for_every_provider() {
    for provider in SubscriptionProvider::ALL {
        let (url, requests, server) = start_candidate_vendor(provider, false, true).await;
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
        .expect_err("unverified catalog must fail closed");

        assert_eq!(error.outcome, ImportOutcome::SuccessorRetained);
        assert_eq!(error.phase, ImportPhase::Catalog);
        assert!(!error.previous_credential_safe);
        assert!(error.transaction_id.is_some());
        assert!(
            error.contains("retained as transaction"),
            "{provider}: {error}"
        );
        assert_eq!(
            std::fs::read_to_string(&destination_path).unwrap(),
            current,
            "{provider} destination changed"
        );
        let transactions = std::fs::read_dir(root.path().join("auth-import-candidates"))
            .expect("retained staging root")
            .collect::<Result<Vec<_>, _>>()
            .expect("retained transactions");
        assert_eq!(transactions.len(), 1, "{provider}: {error}");
        let retained = transactions[0]
            .path()
            .join(provider.as_str())
            .join(provider.canonical_credential_filename());
        let retained = std::fs::read_to_string(retained).expect("retained candidate document");
        assert!(
            retained.contains("fresh-access") && retained.contains("fresh-refresh"),
            "{provider} retained stale candidate: {retained}"
        );
        let seen = requests.lock().expect("candidate requests");
        assert_eq!(seen.len(), 2, "{provider}: {seen:?}");
        assert_eq!(seen[0].0, "POST");
        assert_eq!(seen[1].0, "GET");
        drop(seen);
        server.abort();
    }
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
            capability_asserted: false,
            router_owned_candidate: false,
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
            capability_asserted: false,
            router_owned_candidate: false,
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

#[path = "auth_import_rejection_tests.rs"]
mod rejection_tests;
