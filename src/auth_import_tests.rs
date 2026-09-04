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
/// chain before the connection disappeared, so the candidate stays recoverable.
#[tokio::test]
async fn an_inconclusive_exchange_reports_a_retained_successor() {
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

    assert_eq!(error.outcome, ImportOutcome::SuccessorRetained);
    assert_eq!(error.phase, ImportPhase::Exchange);
    assert!(!error.previous_credential_safe);
    assert!(error.transaction_id.is_some());
    assert!(error.contains("retained as transaction"), "{error}");
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
#[test]
fn validated_candidate_diagnostics_are_redacted_and_retention_is_durable() {
    let root = tempfile::tempdir().expect("staging root");
    let stage = tempfile::Builder::new()
        .prefix("transaction-")
        .tempdir_in(root.path())
        .expect("candidate transaction");
    let retained_path = stage.path().to_path_buf();
    std::fs::write(stage.path().join("credential"), "secret-document").expect("candidate bytes");
    let candidate = ValidatedCandidate {
        document: "secret-document".into(),
        token: link_assistant_router::subscription::SubscriptionToken {
            access_token: "secret-access".into(),
            refresh_token: Some("secret-refresh".into()),
            expires_at_ms: None,
            account_id: None,
            resource_url: None,
        },
        stage,
        transaction_id: "visible-transaction-id".into(),
    };

    let diagnostic = format!("{candidate:?}");
    assert!(
        diagnostic.contains("visible-transaction-id"),
        "{diagnostic}"
    );
    assert!(!diagnostic.contains("secret"), "{diagnostic}");

    assert_eq!(candidate.retain(), "visible-transaction-id");
    assert!(retained_path.join("credential").is_file());
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
    let already_present = ImportExecution::already_present("gemini", Vec::new());
    let value = import_result::json_value(&[retained, promoted, rejected, already_present]);
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
    assert_eq!(value["results"][3]["outcome"], "already_present");
    assert!(!serialized.contains("must-not-leak"), "{serialized}");
    assert!(!serialized.contains("access-token"), "{serialized}");
    assert!(!serialized.contains("refresh-token"), "{serialized}");
}

/// Persistence and authoritative reread failures happen after a provider may
/// have rotated the chain, and therefore always require retained recovery.
#[test]
fn persistence_uncertainty_maps_to_a_retained_successor() {
    let failure = ImportFailure::from_refresh_kind_for_test(
        link_assistant_router::refresh::ImportRefreshFailureKind::PersistenceUncertain,
        "persistence-transaction",
    );
    assert_eq!(failure.outcome, ImportOutcome::SuccessorRetained);
    assert_eq!(failure.phase, ImportPhase::Persistence);
    assert!(!failure.previous_credential_safe);
    assert_eq!(
        failure.transaction_id.as_deref(),
        Some("persistence-transaction")
    );
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

/// Gemini's installed-app refresh grant requires the client secret shipped by
/// Gemini CLI. Import must name that prerequisite before staging or contacting
/// an OAuth endpoint.
#[test]
fn gemini_import_refresh_prerequisite_is_explicit() {
    let absent = import_refresh_prerequisite(SubscriptionProvider::Gemini, |_| None)
        .expect_err("missing Gemini secret must fail closed");
    assert!(
        absent.contains(link_assistant_router::refresh::GEMINI_CLIENT_SECRET_ENV),
        "{absent}"
    );
    assert!(
        import_refresh_prerequisite(SubscriptionProvider::Gemini, |_| {
            Some("configured".to_string())
        })
        .is_ok()
    );
    for provider in [
        SubscriptionProvider::Claude,
        SubscriptionProvider::Codex,
        SubscriptionProvider::Qwen,
    ] {
        assert!(import_refresh_prerequisite(provider, |_| None).is_ok());
    }
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
            capability_asserted: false,
        },
    )
    .await
    .expect_err("unverified candidate must be refused");

    assert!(error.contains("not accepted"), "{error}");
    assert!(!home.path().join("oauth_creds.json").exists());
}

/// The positive capability assertion is not a bypass: rejection still wins.
#[tokio::test]
async fn capability_assertion_cannot_install_a_rejected_candidate() {
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
            capability_asserted: true,
        },
    )
    .await
    .expect_err("capability assertion must not bypass positive vendor acceptance");

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
    std::fs::write(home.path().join("oauth_creds.json"), current).expect("current credential");
    let error = install_candidate(
        &reader,
        data.path(),
        candidate,
        CredentialProbe::Rejected,
        ImportPolicy {
            if_absent: false,
            capability_asserted: false,
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
                        capability_asserted: false,
                    },
                )
                .await;

                assert!(
                    result.is_err(),
                    "{provider} if_absent={if_absent} {probe:?}"
                );
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
