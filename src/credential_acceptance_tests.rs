use super::*;
use axum::extract::{Request, State};
use axum::http::StatusCode;
use axum::response::IntoResponse as _;
use axum::routing::any;
use axum::{Json, Router};
use std::sync::{Arc, Mutex};

#[derive(Clone, Copy, Debug)]
enum CatalogReply {
    Accepted,
    Unauthorized,
    Unavailable,
    Malformed,
    Empty,
    Timeout,
}

#[derive(Clone)]
struct Vendor {
    provider: SubscriptionProvider,
    reply: CatalogReply,
    requests: Arc<Mutex<Vec<(String, String)>>>,
}

async fn vendor(State(state): State<Vendor>, request: Request) -> axum::response::Response {
    let method = request.method().to_string();
    let path = request.uri().path().to_string();
    state.requests.lock().unwrap().push((method, path.clone()));
    if request.method() == axum::http::Method::POST && path == "/token" {
        return Json(serde_json::json!({
            "id_token":"rotated.id.token",
            "access_token":"rotated-secret-access",
            "refresh_token":"rotated-secret-refresh",
            "expires_in":3600
        }))
        .into_response();
    }
    if request.method() != axum::http::Method::GET {
        return StatusCode::NOT_FOUND.into_response();
    }
    match state.reply {
        CatalogReply::Accepted => Json(match state.provider {
            SubscriptionProvider::Claude => {
                serde_json::json!({"data":[{"id":"claude-live"}]})
            }
            SubscriptionProvider::Codex => {
                serde_json::json!({"models":[{"slug":"gpt-live"}]})
            }
            SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => unreachable!(),
        })
        .into_response(),
        CatalogReply::Unauthorized => StatusCode::UNAUTHORIZED.into_response(),
        CatalogReply::Unavailable => StatusCode::SERVICE_UNAVAILABLE.into_response(),
        CatalogReply::Malformed => (StatusCode::OK, "not-json").into_response(),
        CatalogReply::Empty => Json(match state.provider {
            SubscriptionProvider::Claude => serde_json::json!({"data":[]}),
            SubscriptionProvider::Codex => serde_json::json!({"models":[]}),
            SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => unreachable!(),
        })
        .into_response(),
        CatalogReply::Timeout => {
            tokio::time::sleep(Duration::from_millis(100)).await;
            StatusCode::OK.into_response()
        }
    }
}

async fn start_vendor(
    provider: SubscriptionProvider,
    reply: CatalogReply,
) -> (
    String,
    Arc<Mutex<Vec<(String, String)>>>,
    tokio::task::JoinHandle<()>,
) {
    let requests = Arc::new(Mutex::new(Vec::new()));
    let app = Router::new().fallback(any(vendor)).with_state(Vendor {
        provider,
        reply,
        requests: Arc::clone(&requests),
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    (url, requests, server)
}

fn document(provider: SubscriptionProvider) -> String {
    match provider {
        SubscriptionProvider::Claude => serde_json::json!({
            "claudeAiOauth": {
                "accessToken":"native-secret-access",
                "refreshToken":"native-secret-refresh"
            },
            "preserved":"claude"
        }),
        SubscriptionProvider::Codex => serde_json::json!({
            "auth_mode":"chatgpt",
            "tokens": {
                "id_token":"native.id.token",
                "access_token":"native-secret-access",
                "refresh_token":"native-secret-refresh"
            },
            "preserved":"codex"
        }),
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => unreachable!(),
    }
    .to_string()
}

#[tokio::test]
async fn every_uncertain_or_negative_catalog_verdict_retains_only_recovery_evidence() {
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        for reply in [
            CatalogReply::Unauthorized,
            CatalogReply::Unavailable,
            CatalogReply::Malformed,
            CatalogReply::Empty,
            CatalogReply::Timeout,
        ] {
            let (url, requests, server) = start_vendor(provider, reply).await;
            let root = tempfile::tempdir().unwrap();
            let home = root.path().join("primary");
            std::fs::create_dir(&home).unwrap();
            let primary = home.join(provider.canonical_credential_filename());
            let original = b"working-primary-bytes";
            std::fs::write(&primary, original).unwrap();

            let error = accept_candidate_with_timeout(
                root.path(),
                provider,
                &document(provider),
                Some(&format!("{url}/token")),
                Some(&url),
                Duration::from_millis(20),
            )
            .await
            .expect_err("a non-positive catalog verdict must fail closed");

            assert_eq!(error.kind(), AcceptanceFailureKind::SuccessorRetained);
            assert_eq!(error.phase(), AcceptancePhase::Catalog);
            assert!(error.transaction_id().is_some());
            let rendered = error.to_string();
            assert!(
                rendered.contains("transaction"),
                "{provider} {reply:?}: {rendered}"
            );
            for secret in [
                "native-secret-access",
                "native-secret-refresh",
                "native.id.token",
                "rotated-secret-access",
                "rotated-secret-refresh",
                "rotated.id.token",
            ] {
                assert!(!rendered.contains(secret), "leaked {secret}: {rendered}");
            }
            assert_eq!(std::fs::read(&primary).unwrap(), original);
            let retained = std::fs::read_dir(root.path().join(STAGING_DIRECTORY))
                .unwrap()
                .collect::<Result<Vec<_>, _>>()
                .unwrap();
            assert_eq!(retained.len(), 1, "{provider} {reply:?}");
            let retained_document = std::fs::read_to_string(
                retained[0]
                    .path()
                    .join(provider.as_str())
                    .join(provider.canonical_credential_filename()),
            )
            .unwrap();
            assert!(retained_document.contains("rotated-secret-access"));
            assert!(retained_document.contains("rotated-secret-refresh"));
            let requests = requests.lock().unwrap();
            assert_eq!(
                requests.as_slice(),
                &[
                    ("POST".into(), "/token".into()),
                    ("GET".into(), catalog_path(provider).into())
                ]
            );
            assert!(requests.iter().all(|(_, path)| !is_inference_path(path)));
            drop(requests);
            server.abort();
        }
    }
}

#[tokio::test]
async fn accepted_rotated_successor_is_promoted_as_one_atomic_document() {
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        let (url, requests, server) = start_vendor(provider, CatalogReply::Accepted).await;
        let root = tempfile::tempdir().unwrap();
        let home = root.path().join("primary");
        std::fs::create_dir(&home).unwrap();
        let destination = SubscriptionReader::new(provider, &home);
        let primary = home.join(provider.canonical_credential_filename());
        let original = b"working-primary-bytes";
        std::fs::write(&primary, original).unwrap();

        let accepted = accept_candidate(
            root.path(),
            provider,
            &document(provider),
            Some(&format!("{url}/token")),
            Some(&url),
        )
        .await
        .expect("positive catalog acceptance");
        assert_eq!(std::fs::read(&primary).unwrap(), original);
        let accepted_bytes = accepted.document().as_bytes().to_vec();
        assert!(accepted.document().contains("rotated-secret-access"));
        assert!(accepted.document().contains("rotated-secret-refresh"));

        let installed = accepted
            .promote_replacement(&destination, root.path())
            .await
            .expect("atomic promotion");
        assert_eq!(installed, primary);
        assert_eq!(std::fs::read(&primary).unwrap(), accepted_bytes);
        let requests = requests.lock().unwrap();
        assert!(requests.iter().all(|(_, path)| !is_inference_path(path)));
        drop(requests);
        server.abort();
    }
}

#[tokio::test]
async fn process_death_before_promotion_leaves_primary_whole_and_candidate_recoverable() {
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        let (url, _requests, server) = start_vendor(provider, CatalogReply::Accepted).await;
        let root = tempfile::tempdir().unwrap();
        let home = root.path().join("primary");
        std::fs::create_dir(&home).unwrap();
        let primary = home.join(provider.canonical_credential_filename());
        let original = b"working-primary-bytes";
        std::fs::write(&primary, original).unwrap();
        let accepted = accept_candidate(
            root.path(),
            provider,
            &document(provider),
            Some(&format!("{url}/token")),
            Some(&url),
        )
        .await
        .unwrap();
        let transaction_id = accepted.transaction_id().to_string();

        std::mem::forget(accepted);

        assert_eq!(std::fs::read(&primary).unwrap(), original);
        let transaction = std::fs::read_dir(root.path().join(STAGING_DIRECTORY))
            .unwrap()
            .find_map(Result::ok)
            .expect("crash-retained transaction");
        assert!(
            transaction
                .file_name()
                .to_string_lossy()
                .starts_with(&transaction_id)
        );
        assert!(
            transaction
                .path()
                .join(provider.as_str())
                .join(provider.canonical_credential_filename())
                .is_file()
        );
        server.abort();
    }
}

#[tokio::test]
async fn external_credentials_are_catalog_checked_without_spending_their_refresh_link() {
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        let (url, requests, server) = start_vendor(provider, CatalogReply::Accepted).await;
        let root = tempfile::tempdir().unwrap();

        let accepted =
            accept_external_candidate(root.path(), provider, &document(provider), Some(&url))
                .await
                .expect("live external access token is accepted");

        assert_eq!(
            accepted.token().refresh_token.as_deref(),
            Some("native-secret-refresh")
        );
        assert_eq!(
            requests.lock().unwrap().as_slice(),
            &[("GET".into(), catalog_path(provider).into())]
        );
        drop(accepted);
        server.abort();
    }
}

#[tokio::test]
async fn rejected_external_credentials_leave_no_successor_transaction() {
    for provider in [SubscriptionProvider::Claude, SubscriptionProvider::Codex] {
        let (url, requests, server) = start_vendor(provider, CatalogReply::Unauthorized).await;
        let root = tempfile::tempdir().unwrap();

        let error =
            accept_external_candidate(root.path(), provider, &document(provider), Some(&url))
                .await
                .expect_err("rejected external credential");

        assert_eq!(error.kind(), AcceptanceFailureKind::NotAttempted);
        assert_eq!(error.phase(), AcceptancePhase::Catalog);
        assert!(error.transaction_id().is_none());
        assert!(error.to_string().contains("was not spent"));
        assert_eq!(
            requests.lock().unwrap().as_slice(),
            &[("GET".into(), catalog_path(provider).into())]
        );
        assert_eq!(
            std::fs::read_dir(root.path().join(STAGING_DIRECTORY))
                .unwrap()
                .count(),
            0
        );
        server.abort();
    }
}

#[tokio::test]
async fn near_expiry_external_credential_is_refused_without_any_vendor_request() {
    let (url, requests, server) =
        start_vendor(SubscriptionProvider::Claude, CatalogReply::Accepted).await;
    let root = tempfile::tempdir().unwrap();
    let expiring = serde_json::json!({
        "claudeAiOauth": {
            "accessToken":"native-secret-access",
            "refreshToken":"native-secret-refresh",
            "expiresAt": chrono::Utc::now().timestamp_millis()
        }
    })
    .to_string();

    let error = accept_external_candidate(
        root.path(),
        SubscriptionProvider::Claude,
        &expiring,
        Some(&url),
    )
    .await
    .expect_err("the owning vendor client must renew it");

    assert_eq!(error.kind(), AcceptanceFailureKind::NotAttempted);
    assert!(error.to_string().contains("owning vendor client"));
    assert!(requests.lock().unwrap().is_empty());
    server.abort();
}

fn catalog_path(provider: SubscriptionProvider) -> &'static str {
    match provider {
        SubscriptionProvider::Claude => "/v1/models",
        SubscriptionProvider::Codex => "/models",
        SubscriptionProvider::Gemini | SubscriptionProvider::Qwen => unreachable!(),
    }
}

fn is_inference_path(path: &str) -> bool {
    path.contains("messages") || path.contains("responses") || path.contains("chat/completions")
}
