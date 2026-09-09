//! Tests for [`crate::managed_server`].

use super::*;

fn model(id: &str, owner: &str) -> RouterModel {
    RouterModel {
        id: id.to_string(),
        owned_by: owner.to_string(),
        ..RouterModel::default()
    }
}

/// Model selection moved to `clients::select_model` so `with`, `clients setup`
/// and `clients doctor` answer "which models suit this client" the same way
/// (issue #301). These cases keep asserting the behaviour they always did,
/// through that one rule.
use crate::clients::{ClientKind, select_model, usable_models};

struct TlsProbe {
    origin: String,
    certificate: PathBuf,
    _directory: tempfile::TempDir,
    task: tokio::task::JoinHandle<()>,
}

impl Drop for TlsProbe {
    fn drop(&mut self) {
        self.task.abort();
    }
}

async fn tls_probe(name: &str, app: axum::Router) -> TlsProbe {
    let directory = tempfile::tempdir().expect("TLS probe directory");
    let (certificate, key) = crate::tls::ensure_generated(directory.path(), &[name.to_string()])
        .expect("generate TLS probe certificate");
    serve_tls_probe(name, app, directory, certificate, key).await
}

async fn expired_tls_probe(name: &str, app: axum::Router) -> TlsProbe {
    let directory = tempfile::tempdir().expect("expired TLS probe directory");
    let certificate = directory.path().join("expired-cert.pem");
    let key = directory.path().join("expired-key.pem");
    let signing_key = rcgen::KeyPair::generate().expect("generate expired TLS key");
    let mut parameters =
        rcgen::CertificateParams::new(vec![name.to_string()]).expect("expired TLS parameters");
    parameters.not_before = rcgen::date_time_ymd(2010, 1, 1);
    parameters.not_after = rcgen::date_time_ymd(2010, 1, 2);
    let expired = parameters
        .self_signed(&signing_key)
        .expect("generate expired TLS certificate");
    std::fs::write(&certificate, expired.pem()).expect("write expired TLS certificate");
    std::fs::write(&key, signing_key.serialize_pem()).expect("write expired TLS key");
    serve_tls_probe(name, app, directory, certificate, key).await
}

async fn serve_tls_probe(
    name: &str,
    app: axum::Router,
    directory: tempfile::TempDir,
    certificate: PathBuf,
    key: PathBuf,
) -> TlsProbe {
    let tls = crate::tls::load_config(&certificate, &key)
        .await
        .expect("load TLS probe certificate");
    let listener = tokio::net::TcpListener::bind(("127.0.0.1", 0))
        .await
        .expect("bind TLS probe");
    let port = listener.local_addr().expect("TLS probe address").port();
    let task = tokio::spawn(async move {
        crate::tls::serve_prebound_https(listener, app, tls, std::future::pending())
            .await
            .expect("serve TLS probe");
    });
    TlsProbe {
        origin: format!("https://{name}:{port}"),
        certificate,
        _directory: directory,
        task,
    }
}

#[test]
fn server_urls_are_canonical_origins_and_rejections_never_echo_secrets() {
    assert_eq!(
        normalize_server(" HTTPS://[2001:DB8::1]:8443/ ").unwrap(),
        "https://[2001:db8::1]:8443"
    );
    for (unsafe_url, secrets) in [
        (
            "https://private-user:private-password@router.example",
            &["private-user", "private-password"][..],
        ),
        (
            "https://router.example/?access_token=private-query",
            &["private-query"][..],
        ),
        (
            "https://router.example/#private-fragment",
            &["private-fragment"][..],
        ),
        ("https://router.example/private/path", &["private/path"][..]),
    ] {
        let error = normalize_server(unsafe_url)
            .expect_err("only a secret-free HTTP(S) origin is accepted")
            .to_string();
        for secret in secrets {
            assert!(!error.contains(secret), "secret leaked in: {error}");
        }
    }
}

/// A catalog whose every model belongs to another vendor cannot serve this
/// client, and the router knows it. Substituting one launched Claude Code
/// against an `OpenAI` model, so the client reported an unrecognised model name
/// and the user was pointed at their own tool rather than at the subscription
/// that had lapsed (issue #225).
#[test]
fn a_foreign_owner_is_not_substituted() {
    let catalog = vec![
        model("codex-auto-review", "openai"),
        model("gpt-5.5", "openai"),
    ];
    assert_eq!(select_model(ClientKind::ClaudeCode, &catalog), None);
    // Nothing is written into a client config either, so the two agree.
    assert!(usable_models(ClientKind::ClaudeCode, &catalog).is_empty());
}

/// The case the original fallback defends: with no owner declared, the router
/// cannot tell whether a model suits this client, and a usable model beats
/// refusing.
#[test]
fn an_undeclared_owner_still_falls_back() {
    let catalog = vec![model("mystery-1", ""), model("mystery-2", "")];
    assert_eq!(
        select_model(ClientKind::ClaudeCode, &catalog),
        Some("mystery-1")
    );
}

/// A mixed catalog gives each client a model of its own owner.
#[test]
fn each_client_gets_a_model_of_its_own_owner() {
    let catalog = vec![
        model("gpt-5.5", "openai"),
        model("claude-haiku-4-5", "anthropic"),
    ];
    assert_eq!(
        select_model(ClientKind::ClaudeCode, &catalog),
        Some("claude-haiku-4-5")
    );
    assert_eq!(select_model(ClientKind::Codex, &catalog), Some("gpt-5.5"));
}

/// A client with no dialect constraint accepts anything advertised.
#[test]
fn an_unconstrained_client_accepts_any_model() {
    let catalog = vec![model("gpt-5.5", "openai")];
    assert_eq!(
        select_model(ClientKind::Opencode, &catalog),
        Some("gpt-5.5")
    );
}

/// An empty catalog yields nothing, whatever the client.
#[test]
fn an_empty_catalog_selects_nothing() {
    assert_eq!(select_model(ClientKind::ClaudeCode, &[]), None);
    assert_eq!(select_model(ClientKind::Opencode, &[]), None);
}

/// A partially-declared catalog is treated as knowing its owners: one entry
/// naming a vendor is enough to conclude the client's own is absent.
#[test]
fn a_partially_declared_catalog_does_not_substitute() {
    let catalog = vec![model("gpt-5.5", "openai"), model("mystery", "")];
    assert_eq!(select_model(ClientKind::ClaudeCode, &catalog), None);
}

fn bound_token(client: Option<&str>) -> String {
    use base64::Engine as _;

    let payload = serde_json::json!({
        "sub": "inference-listener-token",
        "client_kind": client,
        "principal_id": client.map(|_| "primary"),
    });
    format!(
        "la_sk_e30.{}.signature",
        base64::engine::general_purpose::URL_SAFE_NO_PAD.encode(payload.to_string())
    )
}

fn credential_probe_server(
    management_status: &'static str,
    requests: usize,
) -> (String, std::thread::JoinHandle<Vec<String>>) {
    use std::io::{Read as _, Write as _};

    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind probe server");
    let port = listener.local_addr().expect("probe address").port();
    let handle = std::thread::spawn(move || {
        let mut seen = Vec::new();
        for index in 0..requests {
            let (mut stream, _) = listener.accept().expect("accept probe");
            let mut bytes = [0_u8; 4096];
            let count = stream.read(&mut bytes).expect("read probe");
            let request = String::from_utf8_lossy(&bytes[..count]).into_owned();
            seen.push(request.clone());
            let (status, body) = if index == 0 {
                (management_status, r#"{"error":"not exposed"}"#)
            } else {
                (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"claude-live","owned_by":"anthropic"}]}"#,
                )
            };
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write probe response");
        }
        seen
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

fn scripted_probe_server(
    responses: Vec<(&'static str, String)>,
) -> (String, std::thread::JoinHandle<Vec<String>>) {
    use std::io::{Read as _, Write as _};

    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("bind scripted server");
    let port = listener.local_addr().expect("scripted address").port();
    let handle = std::thread::spawn(move || {
        let mut seen = Vec::new();
        for (status, body) in responses {
            let (mut stream, _) = listener.accept().expect("accept scripted request");
            let mut bytes = [0_u8; 4096];
            let count = stream.read(&mut bytes).expect("read scripted request");
            seen.push(String::from_utf8_lossy(&bytes[..count]).into_owned());
            write!(
                stream,
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            )
            .expect("write scripted response");
        }
        seen
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

#[tokio::test]
async fn split_origins_never_cross_management_and_inference_routes() {
    let issued = bound_token(Some("claude"));
    let (management_url, management) = scripted_probe_server(vec![
        ("200 OK", r#"{"data":[]}"#.to_string()),
        ("200 OK", serde_json::json!({"token": issued}).to_string()),
        ("200 OK", r#"{"revoked":true}"#.to_string()),
    ]);
    let (base_url, inference) = scripted_probe_server(vec![(
        "200 OK",
        r#"{"object":"list","data":[{"id":"claude-live","owned_by":"anthropic"}]}"#.to_string(),
    )]);
    let selected = ResolvedServer::at_origins(
        base_url,
        management_url,
        Some("admin-token".to_string()),
        "split test",
    );

    let credential = prepare_repair_credential(&selected, ClientKind::ClaudeCode, "split-test", 1)
        .await
        .expect("mint through management and fetch through inference");
    assert!(credential.was_minted());
    assert_eq!(credential.models()[0].id, "claude-live");
    cleanup_run_credential(credential)
        .await
        .expect("revoke through management");

    let management = management.join().expect("management probe");
    let inference = inference.join().expect("inference probe");
    assert!(management[0].starts_with("GET /api/management/tokens "));
    assert!(management[1].starts_with("POST /api/management/tokens/client "));
    assert!(management[2].starts_with("POST /api/management/tokens/revoke "));
    assert!(
        inference[0].starts_with("GET /api/models "),
        "{}",
        inference[0]
    );
    assert!(
        management
            .iter()
            .all(|request| !request.contains("/api/services/"))
    );
    assert!(
        inference
            .iter()
            .all(|request| !request.contains("/api/management/"))
    );
}

#[tokio::test]
async fn inference_only_listener_accepts_a_verified_matching_client_token() {
    let (base_url, server) = credential_probe_server("404 Not Found", 2);
    let token = bound_token(Some("claude"));
    let selected = ResolvedServer::at(base_url, Some(token.clone()), "test inference listener");
    let credential = prepare_run_credential(
        &selected,
        ClientKind::ClaudeCode,
        "inference-only-test",
        1,
        false,
    )
    .await
    .expect("matching bound token should launch");
    assert_eq!(credential.token, token);
    assert!(!credential.was_minted());
    assert_eq!(credential.models()[0].id, "claude-live");
    let seen = server.join().expect("probe server");
    assert!(seen[0].starts_with("GET /api/management/tokens "));
    assert!(seen[1].starts_with("GET /api/models "));
}

#[tokio::test]
async fn inference_only_listener_rejects_an_unbound_or_foreign_client_token() {
    for bound in [None, Some("codex")] {
        let (base_url, server) = credential_probe_server("404 Not Found", 1);
        let selected = ResolvedServer::at(
            base_url,
            Some(bound_token(bound)),
            "test inference listener",
        );
        let Err(error) = prepare_run_credential(
            &selected,
            ClientKind::ClaudeCode,
            "inference-only-test",
            1,
            false,
        )
        .await
        else {
            panic!("non-matching token must fail closed");
        };
        assert!(error.to_string().contains("exact `claude` client binding"));
        server.join().expect("probe server");
    }
}

#[tokio::test]
async fn permanent_repair_refuses_a_supplied_ordinary_token() {
    let (base_url, server) = credential_probe_server("401 Unauthorized", 1);
    let selected = ResolvedServer::at(
        base_url,
        Some(bound_token(Some("claude"))),
        "test ordinary token",
    );
    let Err(error) =
        prepare_repair_credential(&selected, ClientKind::ClaudeCode, "repair-test", 1).await
    else {
        panic!("repair must mint its own bound credential");
    };
    assert!(
        error
            .to_string()
            .contains("requires an administrator credential")
    );
    server.join().expect("probe server");
}

/// A Router-owned CA is applied before health and remains attached to every
/// inference-side client used for catalog, usage and inference calls. A bound
/// token therefore works against an inference-only listener without reaching
/// a management route (issue #558).
#[tokio::test]
async fn selected_ca_trusts_every_inference_cli_request() {
    let state = tempfile::tempdir().expect("temporary state root");
    let _guard = super::state::claim_state_root(state.path().to_path_buf());
    let app = axum::Router::new()
        .route(
            "/api/health",
            axum::routing::get(|| async { axum::Json(serde_json::json!({"status": "ok"})) }),
        )
        .route(
            "/api/models",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "object": "list",
                    "data": [{"id": "claude-live", "owned_by": "anthropic"}]
                }))
            }),
        )
        .route(
            "/api/usage",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "schema_version": 1,
                    "subscriptions": []
                }))
            }),
        )
        .route(
            "/api/services/anthropic/v1/messages",
            axum::routing::post(|| async {
                axum::Json(serde_json::json!({"id": "message-through-tls"}))
            }),
        );
    let probe = tls_probe("127.0.0.1", app).await;
    let token = bound_token(Some("claude"));
    save_persisted_with_trust(
        &PersistedServer {
            server: probe.origin.clone(),
            token: Some(token.clone()),
            ..PersistedServer::default()
        },
        Some(&probe.certificate),
        None,
    )
    .expect("select TLS inference server");

    let selected = resolve(None, None, None, None, false)
        .await
        .expect("health uses the selected CA");
    let credential = prepare_run_credential(
        &selected,
        ClientKind::ClaudeCode,
        "tls-inference-only",
        1,
        false,
    )
    .await
    .expect("catalog uses the selected CA and the bound token");
    assert_eq!(credential.models()[0].id, "claude-live");
    assert!(!credential.was_minted());
    assert_eq!(credential.token, token);

    assert_eq!(
        crate::subscription_usage_cli::run_selected(&selected, None, true).await,
        std::process::ExitCode::SUCCESS,
        "usage uses the selected CA"
    );
    let response = selected
        .inference_client()
        .expect("trusted inference client")
        .post(format!(
            "{}/api/services/anthropic/v1/messages",
            selected.base_url
        ))
        .send()
        .await
        .expect("inference uses the selected CA");
    assert!(response.status().is_success());
}

/// Inference and management origins retain separate trust roots. Each client
/// accepts its own origin, rejects the other origin's certificate, and the
/// inference listener does not gain a management route (issue #558).
#[tokio::test]
async fn split_https_origins_use_only_their_associated_ca() {
    let state = tempfile::tempdir().expect("temporary state root");
    let _guard = super::state::claim_state_root(state.path().to_path_buf());
    let inference = tls_probe(
        "127.0.0.1",
        axum::Router::new()
            .route(
                "/api/health",
                axum::routing::get(|| async { axum::Json(serde_json::json!({"status": "ok"})) }),
            )
            .route(
                "/api/models",
                axum::routing::get(|| async { axum::Json(serde_json::json!({"data": []})) }),
            ),
    )
    .await;
    let management = tls_probe(
        "127.0.0.1",
        axum::Router::new().route(
            "/api/management/tokens",
            axum::routing::get(|| async { axum::Json(serde_json::json!({"data": []})) }),
        ),
    )
    .await;
    save_persisted_with_trust(
        &PersistedServer {
            server: inference.origin.clone(),
            management_server: Some(management.origin.clone()),
            token: Some("admin-token".into()),
            ..PersistedServer::default()
        },
        Some(&inference.certificate),
        Some(&management.certificate),
    )
    .expect("select split TLS origins");

    let selected = resolve(None, None, None, None, false)
        .await
        .expect("resolve split TLS origins");
    let inference_client = selected.inference_client().expect("inference client");
    let management_client = selected.management_client().expect("management client");
    assert!(
        inference_client
            .get(format!("{}/api/models", inference.origin))
            .send()
            .await
            .expect("trusted inference request")
            .status()
            .is_success()
    );
    assert!(
        management_client
            .get(format!("{}/api/management/tokens", management.origin))
            .send()
            .await
            .expect("trusted management request")
            .status()
            .is_success()
    );
    assert!(
        inference_client
            .get(format!("{}/api/management/tokens", inference.origin))
            .send()
            .await
            .expect("inference listener response")
            .status()
            .is_client_error(),
        "trust must not expose management routes on inference"
    );
    assert!(
        inference_client
            .get(format!("{}/api/management/tokens", management.origin))
            .send()
            .await
            .is_err(),
        "inference trust must not accept the management certificate"
    );
    assert!(
        management_client
            .get(format!("{}/api/models", inference.origin))
            .send()
            .await
            .is_err(),
        "management trust must not accept the inference certificate"
    );
}

/// Missing trust, an unrelated root, a hostname mismatch and an expired
/// certificate all fail closed with a certificate-oriented diagnostic
/// (issue #558).
#[tokio::test]
async fn selected_tls_trust_rejects_invalid_certificates() {
    let state = tempfile::tempdir().expect("temporary state root");
    let _guard = super::state::claim_state_root(state.path().to_path_buf());
    let app = axum::Router::new().route(
        "/api/health",
        axum::routing::get(|| async { axum::Json(serde_json::json!({"status": "ok"})) }),
    );
    let probe = tls_probe("127.0.0.1", app).await;
    let unrelated_directory = tempfile::tempdir().expect("unrelated CA directory");
    let (unrelated, _) =
        crate::tls::ensure_generated(unrelated_directory.path(), &["127.0.0.1".to_string()])
            .expect("generate unrelated CA");
    let expired = expired_tls_probe(
        "127.0.0.1",
        axum::Router::new().route(
            "/api/health",
            axum::routing::get(|| async { axum::Json(serde_json::json!({"status": "ok"})) }),
        ),
    )
    .await;

    for (origin, ca) in [
        (probe.origin.clone(), None),
        (probe.origin.clone(), Some(unrelated.as_path())),
        (
            probe.origin.replace("127.0.0.1", "localhost"),
            Some(probe.certificate.as_path()),
        ),
        (expired.origin.clone(), Some(expired.certificate.as_path())),
    ] {
        save_persisted_with_trust(
            &PersistedServer {
                server: origin,
                token: Some(bound_token(Some("claude"))),
                ..PersistedServer::default()
            },
            ca,
            None,
        )
        .expect("save failing TLS selection");
        let error = resolve(None, None, None, None, false)
            .await
            .err()
            .expect("invalid TLS trust must fail")
            .to_string();
        assert!(
            error.contains("TLS certificate validation failed"),
            "diagnostic must name certificate validation: {error}"
        );
    }
}
