//! Unit tests for [`crate::providers_cli`].
//!
//! Driven against a real store rather than a mock: these commands are how an
//! operator declares the providers that automatic routing then uses (issue
//! #260), so what matters is that the record they write is the record routing
//! reads back.

use super::*;
use crate::cli::AuthTarget;

fn store(directory: &std::path::Path) -> ProviderStore {
    ProviderStore::open(directory, "providers-cli-test-secret").expect("open a provider store")
}

fn add(name: &str, models: &[&str]) -> ProviderOp {
    ProviderOp::Add {
        api_key_stdin: false,
        name: name.to_string(),
        kind: "openai-compatible".to_string(),
        base_url: "https://provider.example/v1".to_string(),
        model: models.first().map(|model| (*model).to_string()),
        models: models.iter().map(|model| (*model).to_string()).collect(),
        api_key: Some("provider-key".to_string()),
        api_key_env: None,
        enabled: true,
        target: AuthTarget::default(),
    }
}

/// Adding a provider persists exactly what routing later reads: the declared
/// models are what let it win a route at all.
#[test]
fn adding_a_provider_persists_its_declared_models() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());

    assert_eq!(
        run_with(&store, &add("formal-ai", &["formal-ai-mini"])),
        ExitCode::SUCCESS
    );

    let resolved = store
        .resolve("formal-ai")
        .expect("read the store")
        .expect("the provider is present");
    assert!(resolved.declares("formal-ai-mini"));
    assert_eq!(resolved.base_url, "https://provider.example/v1");
}

/// Listing and showing a provider succeed, and never print the API key: the
/// store redacts it, and these commands are the operator-facing view of it.
#[test]
fn listing_and_showing_a_provider_succeed() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());
    assert_eq!(
        run_with(&store, &add("formal-ai", &["formal-ai-mini"])),
        ExitCode::SUCCESS
    );

    assert_eq!(
        run_with(
            &store,
            &ProviderOp::List {
                json: false,
                target: AuthTarget::default()
            }
        ),
        ExitCode::SUCCESS
    );
    assert_eq!(
        run_with(
            &store,
            &ProviderOp::Show {
                name: "formal-ai".to_string(),
                json: false,
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
    let redacted = store.list_redacted().expect("list");
    assert!(
        !format!("{redacted:?}").contains("provider-key"),
        "the API key must not be exposed: {redacted:?}"
    );
}

/// Showing or removing an unknown provider fails rather than reporting success
/// for something that was never there.
#[test]
fn an_unknown_provider_is_not_reported_as_removed() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());

    assert_ne!(
        run_with(
            &store,
            &ProviderOp::Show {
                name: "absent".to_string(),
                json: false,
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
    assert_ne!(
        run_with(
            &store,
            &ProviderOp::Remove {
                name: "absent".to_string(),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
}

/// Removing a provider takes its models out of the store, so a decommissioned
/// endpoint stops being routable.
#[test]
fn removing_a_provider_takes_its_models_with_it() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());
    assert_eq!(
        run_with(&store, &add("formal-ai", &["formal-ai-mini"])),
        ExitCode::SUCCESS
    );

    assert_eq!(
        run_with(
            &store,
            &ProviderOp::Remove {
                name: "formal-ai".to_string(),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );

    assert!(
        store
            .resolve("formal-ai")
            .expect("read the store")
            .is_none()
    );
}

/// Importing a file that is not there fails with a message rather than
/// silently leaving the store unchanged.
#[test]
fn importing_a_missing_file_fails() {
    let directory = tempfile::tempdir().expect("data dir");
    let store = store(directory.path());

    assert_ne!(
        run_with(
            &store,
            &ProviderOp::Import {
                path: directory.path().join("absent.lenv"),
                target: AuthTarget::default(),
            }
        ),
        ExitCode::SUCCESS
    );
}

/// The remote calls hit the routes the deployment actually serves (#294).
///
/// Asserted without a server: a wrong path or a body missing a declared model
/// surfaces to an operator only as a provider that never wins a route.
#[test]
fn each_provider_operation_names_its_own_route() {
    use crate::cli::AuthTarget;

    let call = |op: ProviderOp| call_for(&op).expect("encodable").expect("a call");

    let list = call(ProviderOp::List {
        json: false,
        target: AuthTarget::default(),
    });
    assert_eq!(list.method, "GET");
    assert_eq!(list.path, "/api/providers");
    assert!(list.body.is_none());

    let show = call(ProviderOp::Show {
        name: "demo".into(),
        json: false,
        target: AuthTarget::default(),
    });
    assert_eq!(show.method, "GET");
    assert_eq!(show.path, "/api/providers/demo");

    let remove = call(ProviderOp::Remove {
        name: "demo".into(),
        target: AuthTarget::default(),
    });
    assert_eq!(remove.method, "DELETE");
    assert_eq!(
        remove.path, "/api/providers/demo",
        "removal must name the provider, not the collection"
    );
}

/// `add` sends every field routing later reads back.
///
/// The declared models are what let a provider win a route at all, so a body
/// that dropped them would store a provider that can never be selected.
#[test]
fn adding_a_provider_sends_what_routing_reads() {
    use crate::cli::AuthTarget;

    let call = call_for(&ProviderOp::Add {
        api_key_stdin: false,
        name: "formal-ai".into(),
        kind: "openai-compatible".into(),
        base_url: "https://provider.example/v1".into(),
        model: Some("m1".into()),
        models: vec!["m1".into(), "m2".into()],
        api_key: Some("secret".into()),
        api_key_env: None,
        enabled: true,
        target: AuthTarget::default(),
    })
    .expect("encodable")
    .expect("a call");

    assert_eq!(call.method, "POST");
    assert_eq!(call.path, "/api/providers");
    let body = call.body.expect("a body");
    assert_eq!(body["name"], "formal-ai", "{body}");
    assert_eq!(body["base_url"], "https://provider.example/v1", "{body}");
    assert_eq!(body["default_model"], "m1", "{body}");
    assert_eq!(body["models"][1], "m2", "every declared model: {body}");
    assert_eq!(body["enabled"], true, "{body}");
}

/// `import` has no single call: it declares one provider per manifest entry.
#[test]
fn importing_has_no_call_of_its_own() {
    use crate::cli::AuthTarget;

    let call = call_for(&ProviderOp::Import {
        path: "/tmp/manifest.lenv".into(),
        target: AuthTarget::default(),
    })
    .expect("encodable");

    assert!(
        call.is_none(),
        "a manifest becomes one add per provider, not one request"
    );
}

/// Records live under `data`, and an unfamiliar answer yields none.
#[test]
fn provider_records_are_read_from_the_data_array() {
    let answer = serde_json::json!({"data": [{"name": "a"}, {"name": "b"}]});
    assert_eq!(records_in(&answer).len(), 2);

    assert!(records_in(&serde_json::json!({})).is_empty());
}

/// A loopback router for the remote provider tests.
///
/// A real socket rather than a mock: what issue #294 is about is *which*
/// deployment answers, and a test that never opens one cannot see that.
async fn serve_once(
    status: &'static str,
    body: &'static str,
) -> (String, tokio::task::JoinHandle<String>) {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move {
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
        let (mut socket, _) = listener.accept().await.expect("a request");
        let mut buffer = [0; 4096];
        let read = socket.read(&mut buffer).await.unwrap_or(0);
        let _ = socket
            .write_all(
                format!(
                    "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                    body.len()
                )
                .as_bytes(),
            )
            .await;
        String::from_utf8_lossy(&buffer[..read]).to_string()
    });
    (origin, handle)
}

/// A remote `add` reaches the deployment and reports success.
#[tokio::test]
async fn a_remote_add_declares_the_provider_on_the_deployment() {
    use crate::cli::AuthTarget;

    let (origin, handle) = serve_once("200 OK", r#"{"name":"demo"}"#).await;
    let server = crate::managed_server::ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = run_remote(
        &server,
        &ProviderOp::Add {
            name: "demo".into(),
            kind: "openai-compatible".into(),
            base_url: "https://demo.example/v1".into(),
            model: Some("m1".into()),
            models: vec!["m1".into()],
            api_key: None,
            api_key_stdin: false,
            api_key_env: None,
            enabled: true,
            target: AuthTarget::default(),
        },
    )
    .await;

    assert_eq!(format!("{code:?}"), format!("{:?}", ExitCode::SUCCESS));
    let request = handle.await.expect("the server task");
    assert!(request.starts_with("POST /api/providers"), "{request}");
    assert!(request.contains(r#""name":"demo""#), "{request}");
}

/// An unknown provider exits 2 remotely, as it does locally.
///
/// A script that checks the exit code must mean the same thing against either
/// target.
#[tokio::test]
async fn showing_an_unknown_provider_exits_two_remotely() {
    use crate::cli::AuthTarget;

    let (origin, _handle) = serve_once("404 Not Found", r#"{"error":"nope"}"#).await;
    let server = crate::managed_server::ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = run_remote(
        &server,
        &ProviderOp::Show {
            name: "absent".into(),
            json: false,
            target: AuthTarget::default(),
        },
    )
    .await;

    assert_eq!(format!("{code:?}"), format!("{:?}", ExitCode::from(2)));
}

/// A remote `list` renders the deployment's providers.
#[tokio::test]
async fn a_remote_list_reads_the_providers_route() {
    use crate::cli::AuthTarget;

    let body = r#"{"data":[{"name":"demo","kind":"openai-compatible","base_url":"https://d/v1","enabled":true}]}"#;
    let (origin, handle) = serve_once("200 OK", body).await;
    let server = crate::managed_server::ResolvedServer::at(origin, Some("admin".into()), "test");

    let code = run_remote(
        &server,
        &ProviderOp::List {
            json: false,
            target: AuthTarget::default(),
        },
    )
    .await;

    assert_eq!(format!("{code:?}"), format!("{:?}", ExitCode::SUCCESS));
    let request = handle.await.expect("the server task");
    assert!(request.starts_with("GET /api/providers"), "{request}");
}

/// A remote `import` declares one provider per manifest entry.
///
/// The manifest is this machine's file; the providers it declares are the
/// deployment's. Reading here and declaring there is what "import into that
/// router" means (issue #294).
#[tokio::test]
async fn a_remote_import_declares_each_provider_on_the_deployment() {
    use crate::cli::AuthTarget;
    use std::io::Write as _;

    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let handle = tokio::spawn(async move {
        use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
        let mut seen = Vec::new();
        for _ in 0..2 {
            let Ok((mut socket, _)) = listener.accept().await else {
                break;
            };
            let mut buffer = [0; 4096];
            let read = socket.read(&mut buffer).await.unwrap_or(0);
            seen.push(String::from_utf8_lossy(&buffer[..read]).to_string());
            let body = r#"{"ok":true}"#;
            let _ = socket
                .write_all(
                    format!(
                        "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await;
        }
        seen
    });

    let mut manifest = tempfile::NamedTempFile::new().expect("manifest");
    writeln!(
        manifest,
        "{}",
        serde_json::json!([
            {"name": "one", "base_url": "https://one.example/v1"},
            {"name": "two", "base_url": "https://two.example/v1"},
        ])
    )
    .expect("write the manifest");

    let server = crate::managed_server::ResolvedServer::at(origin, Some("admin".into()), "test");
    let code = run_remote(
        &server,
        &ProviderOp::Import {
            path: manifest.path().to_path_buf(),
            target: AuthTarget::default(),
        },
    )
    .await;

    assert_eq!(format!("{code:?}"), format!("{:?}", ExitCode::SUCCESS));
    let seen = handle.await.expect("the server task");
    assert_eq!(seen.len(), 2, "one declaration per provider: {seen:?}");
    assert!(seen[0].contains(r#""name":"one""#), "{}", seen[0]);
    assert!(seen[1].contains(r#""name":"two""#), "{}", seen[1]);
}

/// A manifest this machine cannot read is an error naming the file.
#[tokio::test]
async fn an_unreadable_manifest_names_the_file() {
    use crate::cli::AuthTarget;

    let server = crate::managed_server::ResolvedServer::at(
        "http://127.0.0.1:1".to_string(),
        Some("admin".to_string()),
        "test",
    );

    let code = run_remote(
        &server,
        &ProviderOp::Import {
            path: "/nonexistent/manifest.lenv".into(),
            target: AuthTarget::default(),
        },
    )
    .await;

    assert_ne!(
        format!("{code:?}"),
        format!("{:?}", ExitCode::SUCCESS),
        "a manifest that could not be read must not report success"
    );
}
