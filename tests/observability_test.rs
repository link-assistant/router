//! Management observability works without real credentials or upstream accounts.
include!("support/management_state.rs");
use link_assistant_router::error_log::ErrorLog;
use serde_json::{Value, json};

async fn document(response: axum::response::Response) -> Value {
    serde_json::from_slice(&response.into_body().collect().await.unwrap().to_bytes()).unwrap()
}

#[tokio::test]
async fn every_observability_endpoint_rejects_client_tokens_and_missing_admin() {
    let dir = tempfile::tempdir().unwrap();
    let state = setup(dir.path());
    let token = state.token_manager.issue_token(1, "client").unwrap();
    let app = link_assistant_router::admin_api::router(state);
    for (index, (method, path)) in [
        ("GET", "/api/management/logs/requests/id"),
        ("GET", "/api/management/logs/errors"),
        ("GET", "/api/management/logs/errors/name"),
        ("DELETE", "/api/management/logs"),
        ("PATCH", "/api/management/logging"),
        ("GET", "/api/management/usage/queue"),
        ("GET", "/api/management/server/latest-version"),
    ]
    .into_iter()
    .enumerate()
    {
        for auth in [None, Some(token.as_str())] {
            let mut req = request("127.0.0.1", path, false);
            *req.method_mut() = method.parse().unwrap();
            req.headers_mut().remove("authorization");
            if let Some(token) = auth {
                req.headers_mut()
                    .insert("authorization", format!("Bearer {token}").parse().unwrap());
            }
            // Use a distinct IP so the lockout baseline does not mask authorization.
            req.extensions_mut().insert(ConnectInfo(SocketAddr::new(
                format!("127.0.0.{}", index + 1).parse().unwrap(),
                12345,
            )));
            let response = app.clone().oneshot(req).await.unwrap();
            assert_eq!(
                response.status(),
                StatusCode::UNAUTHORIZED,
                "{method} {path}"
            );
        }
    }
}

#[tokio::test]
async fn missing_request_and_capture_disabled_have_explicit_answers() {
    let dir = tempfile::tempdir().unwrap();
    let app = link_assistant_router::admin_api::router(setup(dir.path()));
    let response = app
        .clone()
        .oneshot(request(
            "127.0.0.1",
            "/api/management/logs/requests/missing",
            true,
        ))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::NOT_FOUND);
    let response = app
        .clone()
        .oneshot(request("127.0.0.1", "/api/management/logs/errors", true))
        .await
        .unwrap();
    assert_eq!(
        document(response).await,
        json!({"enabled": false, "files": []})
    );
    let response = app
        .oneshot(request("127.0.0.1", "/api/management/usage/queue", true))
        .await
        .unwrap();
    assert_eq!(
        document(response).await,
        json!({"accounts": [{"name": "primary", "in_flight": 0, "queued": 0}], "in_flight": 0, "queued": 0, "unassigned": 0})
    );
    assert!(!dir.path().join("errors").exists());
}

#[tokio::test]
async fn queue_keeps_streaming_requests_in_flight_until_consumed_or_dropped() {
    let dir = tempfile::tempdir().unwrap();
    let state = setup(dir.path());
    let handler = axum::routing::get(
        |axum::extract::State(state): axum::extract::State<AppState>| async move {
            let id = link_assistant_router::request_log::correlation_id(&http::HeaderMap::new());
            let response =
                upstream(&state.request_log, &id, StatusCode::OK, "synthetic reply").await;
            Body::from_stream(response.bytes_stream())
        },
    );
    let native = "/api/services/codex/v1/realtime";
    let app = axum::Router::new()
        .route("/probe", handler.clone())
        .route(native, handler)
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            link_assistant_router::request_log::log_http_exchange,
        ))
        .with_state(state.clone());
    for (path, consume) in [
        ("/probe", true),
        ("/probe", false),
        (native, true),
        (native, false),
    ] {
        let response = app
            .clone()
            .oneshot(Request::builder().uri(path).body(Body::empty()).unwrap())
            .await
            .unwrap();
        let snapshot = state.request_log.queue_snapshot(["primary".into()]);
        assert_eq!(snapshot["in_flight"], 1);
        assert_eq!(snapshot["accounts"][0]["in_flight"], 1);
        assert_eq!(snapshot["queued"], 0);
        if consume {
            response.into_body().collect().await.unwrap();
        } else {
            drop(response);
        }
        assert_eq!(
            state.request_log.queue_snapshot(["primary".into()])["in_flight"],
            0
        );
    }
}

async fn upstream(
    log: &link_assistant_router::request_log::RequestLog,
    id: &str,
    status: StatusCode,
    body: &'static str,
) -> reqwest::Response {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let origin = format!("http://{}", listener.local_addr().unwrap());
    let app = axum::Router::new().route(
        "/",
        axum::routing::get(move || async move { (status, body) }),
    );
    let (shutdown, finished) = tokio::sync::oneshot::channel::<()>();
    let server = tokio::spawn(async move {
        axum::serve(listener, app)
            .with_graceful_shutdown(async {
                let _ = finished.await;
            })
            .await
            .unwrap();
    });
    let client = reqwest::Client::new();
    let response = log
        .send_upstream(id, &client, client.get(origin))
        .await
        .unwrap();
    // Headers have arrived; the tiny synthetic body is already in the socket.
    shutdown.send(()).unwrap();
    server.await.unwrap();
    response
}

#[tokio::test]
async fn capture_is_opt_in_redacted_bounded_and_downloadable() {
    let dir = tempfile::tempdir().unwrap();
    let errors = Arc::new(ErrorLog::new(dir.path().join("errors"), 250));
    let mut state = setup(dir.path());
    let audit = dir.path().join("audit.jsonl");
    state.audit = Arc::new(link_assistant_router::audit::AuditLog::to_path(
        audit.to_str(),
    ));
    let raw =
        r#"{"error":"synthetic rejection","access_token":"secret","prompt":"synthetic prompt"}"#;
    let response = upstream(&state.request_log, "disabled", StatusCode::BAD_GATEWAY, raw).await;
    assert_eq!(response.text().await.unwrap(), raw);
    assert!(errors.list().unwrap().is_empty());
    state.request_log = Arc::new(
        link_assistant_router::request_log::RequestLog::new(
            dir.path().join("requests"),
            1024 * 1024,
        )
        .with_error_log(Arc::clone(&errors)),
    );
    for id in ["oldest", "newest"] {
        let response = upstream(&state.request_log, id, StatusCode::BAD_GATEWAY, raw).await;
        assert_eq!(response.status(), StatusCode::BAD_GATEWAY);
        assert_eq!(response.text().await.unwrap(), raw);
    }
    let response = upstream(&state.request_log, "success", StatusCode::OK, raw).await;
    response.bytes().await.unwrap();
    let files = errors.list().unwrap();
    assert_eq!(files.len(), 1, "oldest error must be evicted: {files:?}");
    assert!(
        files
            .iter()
            .map(|file| file["bytes"].as_u64().unwrap())
            .sum::<u64>()
            <= 250
    );
    let name = files[0]["name"].as_str().unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        assert_eq!(
            std::fs::metadata(dir.path().join("errors").join(name))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o600
        );
    }
    let app = link_assistant_router::admin_api::router(state.clone());
    let response = app
        .clone()
        .oneshot(request(
            "127.0.0.1",
            &format!("/api/management/logs/errors/{name}"),
            true,
        ))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()["content-disposition"], "attachment");
    let capture = document(response).await;
    assert_eq!(capture["id"], "newest");
    assert_eq!(capture["body"]["access_token"], "[REDACTED]");
    assert_eq!(capture["body"]["prompt"], "synthetic prompt");
    assert_eq!(capture["complete"], true);
    assert_eq!(capture["truncated"], false);
    let response = app
        .clone()
        .oneshot(request("127.0.0.1", "/api/management/logs/errors", true))
        .await
        .unwrap();
    assert_eq!(
        document(response).await["files"].as_array().unwrap().len(),
        1
    );
    state
        .request_log
        .record("lookup", "client_response", json!({"status": 502}));
    std::fs::write(dir.path().join("keep"), "unrelated state").unwrap();
    let mut req = request("127.0.0.1", "/api/management/logs", true);
    *req.method_mut() = http::Method::DELETE;
    let response = app.oneshot(req).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert!(state.request_log.lookup("lookup").unwrap().is_empty());
    assert!(errors.list().unwrap().is_empty());
    assert!(dir.path().join("keep").exists());
    assert!(
        std::fs::read_to_string(audit)
            .unwrap()
            .contains("logs_cleared")
    );
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt as _;
        assert_eq!(
            std::fs::metadata(dir.path().join("errors"))
                .unwrap()
                .permissions()
                .mode()
                & 0o777,
            0o700
        );
    }
}

#[tokio::test]
async fn oversized_capture_omits_incomplete_json_and_clear_invalidates_in_flight_capture() {
    let dir = tempfile::tempdir().unwrap();
    let errors = Arc::new(ErrorLog::new(dir.path().join("errors"), 400));
    let log =
        link_assistant_router::request_log::RequestLog::new(dir.path().join("requests"), 4096)
            .with_error_log(Arc::clone(&errors));
    let oversized = r#"{"secret":"should never survive an incomplete JSON prefix","content":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"}"#;
    upstream(&log, "large", StatusCode::BAD_GATEWAY, oversized)
        .await
        .bytes()
        .await
        .unwrap();
    let files = errors.list().unwrap();
    let capture: Value =
        serde_json::from_slice(&errors.read(files[0]["name"].as_str().unwrap()).unwrap()).unwrap();
    assert_eq!(capture["truncated"], true);
    assert!(capture["body"].as_str().unwrap().starts_with("[OMITTED:"));
    let pending = upstream(&log, "pending", StatusCode::BAD_GATEWAY, "error").await;
    errors.clear().unwrap();
    pending.bytes().await.unwrap();
    assert!(errors.list().unwrap().is_empty());
    assert!(errors.read("../secret").is_err());
}

#[tokio::test]
async fn abandoned_error_is_marked_incomplete_and_zero_budget_writes_nothing() {
    let dir = tempfile::tempdir().unwrap();
    for budget in [0, 400] {
        let errors = Arc::new(ErrorLog::new(
            dir.path().join(format!("errors-{budget}")),
            budget,
        ));
        let log =
            link_assistant_router::request_log::RequestLog::new(dir.path().join("requests"), 4096)
                .with_error_log(Arc::clone(&errors));
        let response = upstream(
            &log,
            "abandoned",
            StatusCode::UNPROCESSABLE_ENTITY,
            "private error",
        )
        .await;
        assert_eq!(response.status(), StatusCode::UNPROCESSABLE_ENTITY);
        assert!(response.headers().contains_key("content-type"));
        assert_eq!(response.url().path(), "/");
        drop(response);
        let files = errors.list().unwrap();
        if budget == 0 {
            assert!(files.is_empty());
            assert!(!dir.path().join("errors-0").exists());
        } else {
            let name = files[0]["name"].as_str().unwrap();
            let capture: Value = serde_json::from_slice(&errors.read(name).unwrap()).unwrap();
            assert_eq!(capture["complete"], false);
            assert!(capture["body"].as_str().unwrap().starts_with("[OMITTED:"));
            std::fs::write(dir.path().join("errors-400").join(name), vec![b'x'; 401]).unwrap();
            assert!(errors.read(name).is_err());
        }
    }
}

#[tokio::test]
async fn real_server_debug_patch_expires_and_audits_with_a_quiet_startup_filter() {
    struct Server(std::process::Child);
    impl Drop for Server {
        fn drop(&mut self) {
            let _ = self.0.kill();
            let _ = self.0.wait();
        }
    }
    let dir = tempfile::tempdir().unwrap();
    let socket = std::net::TcpListener::bind("127.0.0.1:0").unwrap();
    let address = socket.local_addr().unwrap();
    drop(socket);
    let audit = dir.path().join("audit.jsonl");
    let mut command = std::process::Command::new(env!("CARGO_BIN_EXE_router"));
    command
        .args([
            "serve",
            "--listener",
            &format!("{address}=combined,http"),
            "--token-secret",
            "observability-runtime-test-secret",
            "--admin-key",
            "management-test-admin",
            "--upstream-provider",
            "anthropic",
        ])
        .env_clear()
        .env("HOME", dir.path())
        .env("DATA_DIR", dir.path())
        .env("RUST_LOG", "warn")
        .env("LOG_DEBUG_TTL_SECS", "1")
        .env("AUDIT_LOG", &audit)
        .env("ERROR_LOG_DIR", dir.path().join("errors"))
        .stdout(std::process::Stdio::null())
        .stderr(std::process::Stdio::null());
    // Keep the child visible to the workspace coverage run after env_clear.
    if let Some(profile) = std::env::var_os("LLVM_PROFILE_FILE") {
        command.env("LLVM_PROFILE_FILE", profile);
    }
    let _server = Server(command.spawn().unwrap());
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(3))
        .build()
        .unwrap();
    let endpoint = format!("http://{address}/api/management");
    let deadline = tokio::time::Instant::now() + Duration::from_secs(10);
    loop {
        if client
            .get(format!("{endpoint}/health"))
            .send()
            .await
            .is_ok()
        {
            break;
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "server did not start"
        );
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    let response = client
        .get(format!("{endpoint}/logs/errors"))
        .bearer_auth("management-test-admin")
        .send()
        .await
        .unwrap();
    assert_eq!(
        response.json::<Value>().await.unwrap(),
        json!({"enabled": true, "files": []})
    );
    let patch = |debug| {
        client
            .patch(format!("{endpoint}/logging"))
            .bearer_auth("management-test-admin")
            .json(&json!({"debug": debug}))
            .send()
    };
    let response = patch(true).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(
        response.json::<Value>().await.unwrap(),
        json!({"debug": true, "ttl_secs": 1})
    );
    let deadline = tokio::time::Instant::now() + Duration::from_secs(5);
    loop {
        let records = std::fs::read_to_string(&audit).unwrap();
        if records.contains("ttl_expired") {
            break;
        }
        assert!(
            tokio::time::Instant::now() < deadline,
            "debug lease did not expire: {records}"
        );
        tokio::time::sleep(Duration::from_millis(50)).await;
    }
    let response = patch(false).await.unwrap();
    assert_eq!(
        response.json::<Value>().await.unwrap(),
        json!({"debug": false, "ttl_secs": 0})
    );
    let records = std::fs::read_to_string(audit).unwrap();
    assert_eq!(
        records
            .lines()
            .filter(|line| line.contains("logging_changed"))
            .count(),
        3
    );
    let operational = std::fs::read_to_string(dir.path().join("logs/operational.log")).unwrap();
    assert!(operational.contains("runtime_logging_changed debug=true"));
    assert!(operational.contains("runtime_debug_reverted reason=ttl_expired"));
    assert!(operational.contains("runtime_logging_changed debug=false"));
    assert!(!dir.path().join("errors").exists());
}

#[cfg(unix)]
#[test]
fn log_lookup_download_and_clear_ignore_symlinks_and_unrelated_files() {
    use std::os::unix::fs::symlink;
    let dir = tempfile::tempdir().unwrap();
    let outside = dir.path().join("outside");
    std::fs::write(&outside, r#"{"correlation_id":"private"}"#).unwrap();
    let requests = dir.path().join("requests");
    std::fs::create_dir_all(requests.join("token")).unwrap();
    symlink(&outside, requests.join("token/requests.lino")).unwrap();
    symlink(dir.path(), requests.join("external")).unwrap();
    let log = link_assistant_router::request_log::RequestLog::new(requests, 4096);
    assert!(log.lookup("private").unwrap().is_empty());
    log.clear().unwrap();
    assert!(outside.exists());
    let errors = dir.path().join("errors");
    std::fs::create_dir(&errors).unwrap();
    let name = format!("error-00000000000000000001-{}.json", uuid::Uuid::new_v4());
    symlink(&outside, errors.join(&name)).unwrap();
    std::fs::write(errors.join("unrelated.txt"), "keep").unwrap();
    let log = ErrorLog::new(errors.clone(), 400);
    assert!(log.list().unwrap().is_empty());
    assert!(log.read(&name).is_err());
    log.clear().unwrap();
    assert!(outside.exists());
    assert!(errors.join("unrelated.txt").exists());
}
