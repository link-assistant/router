//! Management hardening through the production route builders.
use link_assistant_router::cli::Cli;
use lino_arguments::Parser as _;
include!("support/management_state.rs");

#[tokio::test]
async fn request_by_id_round_trip_reads_persisted_links_notation() {
    let dir = tempfile::tempdir().unwrap();
    let mut state = setup(dir.path());
    state.request_log.record(
        "request-728",
        "client_request",
        serde_json::json!({"body": "hello"}),
    );
    state.request_log.record(
        "other",
        "client_request",
        serde_json::json!({"body": "unrelated"}),
    );
    state.request_log.record(
        "request-728",
        "client_response",
        serde_json::json!({"status": 502}),
    );
    state.request_log = Arc::new(link_assistant_router::request_log::RequestLog::new(
        dir.path().join("requests"),
        1024 * 1024,
    ));
    let app = link_assistant_router::admin_api::router(state);
    let response = app
        .oneshot(request(
            "127.0.0.1",
            "/api/management/logs/requests/request-728",
            true,
        ))
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let body = response.into_body().collect().await.unwrap().to_bytes();
    let result: serde_json::Value = serde_json::from_slice(&body).unwrap();
    assert_eq!(result["id"], "request-728");
    assert_eq!(result["records"].as_array().unwrap().len(), 2);
    assert_eq!(result["records"][0]["body"], "hello");
    assert_eq!(result["records"][1]["status"], 502);
}

#[tokio::test]
async fn fifth_failure_bans_only_that_ip_even_with_valid_credentials_and_rotating_headers() {
    let dir = tempfile::tempdir().unwrap();
    let app = link_assistant_router::admin_api::router(setup(dir.path()));
    for attempt in 1..=5 {
        let mut req = request("198.51.100.10", "/api/management/tokens", false);
        req.headers_mut().insert(
            "x-forwarded-for",
            format!("203.0.113.{attempt}").parse().unwrap(),
        );
        let response = app.clone().oneshot(req).await.unwrap();
        assert_eq!(
            response.status(),
            if attempt == 5 {
                StatusCode::TOO_MANY_REQUESTS
            } else {
                StatusCode::UNAUTHORIZED
            }
        );
        if attempt == 5 {
            assert_eq!(response.headers()["retry-after"], "1800");
        }
    }
    assert_eq!(
        app.clone()
            .oneshot(request("198.51.100.10", "/api/management/tokens", true))
            .await
            .unwrap()
            .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(
        app.oneshot(request("198.51.100.11", "/api/management/tokens", true))
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
}

#[tokio::test]
async fn combined_listener_blocks_remote_management_including_bootstrap_by_default() {
    let dir = tempfile::tempdir().unwrap();
    let config = Cli::try_parse_from([
        "router",
        "--token-secret",
        "management-security-test-secret",
    ])
    .unwrap()
    .into_config()
    .unwrap();
    let app = link_assistant_router::server_router::router(setup(dir.path()), &config);
    for path in ["/api/management/tokens", "/api/management/admin/status"] {
        assert_eq!(
            app.clone()
                .oneshot(request("198.51.100.10", path, true))
                .await
                .unwrap()
                .status(),
            StatusCode::FORBIDDEN
        );
        assert_eq!(
            app.clone()
                .oneshot(request("127.0.0.1", path, true))
                .await
                .unwrap()
                .status(),
            StatusCode::OK
        );
    }
    for path in ["/api/management", "/api/management/unknown"] {
        assert_eq!(
            app.clone()
                .oneshot(request("198.51.100.10", path, true))
                .await
                .unwrap()
                .status(),
            StatusCode::FORBIDDEN
        );
        assert_eq!(
            app.clone()
                .oneshot(request("127.0.0.1", path, true))
                .await
                .unwrap()
                .status(),
            StatusCode::NOT_FOUND
        );
    }
}

fn config() -> link_assistant_router::config::Config {
    Cli::try_parse_from([
        "router",
        "--token-secret",
        "management-security-test-secret",
    ])
    .unwrap()
    .into_config()
    .unwrap()
}

#[tokio::test]
async fn remote_opt_in_still_requires_admin_and_missing_peer_fails_closed() {
    let dir = tempfile::tempdir().unwrap();
    let mut config = config();
    config.management.allow_remote = true;
    let app = link_assistant_router::server_router::router(setup(dir.path()), &config);
    assert_eq!(
        app.clone()
            .oneshot(request("198.51.100.10", "/api/management/tokens", true))
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        app.clone()
            .oneshot(request("198.51.100.10", "/api/management/tokens", false))
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    let mut req = request("127.0.0.1", "/api/management/tokens", true);
    req.extensions_mut().remove::<ConnectInfo<SocketAddr>>();
    req.headers_mut()
        .insert("x-forwarded-for", "127.0.0.1".parse().unwrap());
    assert_eq!(
        app.oneshot(req).await.unwrap().status(),
        StatusCode::FORBIDDEN
    );
}

#[tokio::test]
async fn successful_auth_resets_counters_even_when_handler_rejects_operation() {
    let dir = tempfile::tempdir().unwrap();
    let state = setup(dir.path());
    state.admin.management_access().configure(
        link_assistant_router::management_config::ManagementConfig {
            lockout_failures: 2,
            ..Default::default()
        },
    );
    let app = link_assistant_router::admin_api::router(state);
    let call = |path, valid| app.clone().oneshot(request("198.51.100.10", path, valid));
    assert_eq!(
        call("/api/management/tokens", false)
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    // Auth succeeds, but a missing provider returns 404. It must still reset.
    assert_eq!(
        call("/api/management/providers/missing", true)
            .await
            .unwrap()
            .status(),
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        call("/api/management/tokens", false)
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    // Open status must not clear the failed credential counter.
    assert_eq!(
        call("/api/management/admin/status", true)
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    assert_eq!(
        call("/api/management/tokens", false)
            .await
            .unwrap()
            .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(
        call("/api/management/admin/status", true)
            .await
            .unwrap()
            .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
}

#[tokio::test]
async fn combined_and_admin_listeners_share_bans_and_audit_once_without_credentials() {
    let dir = tempfile::tempdir().unwrap();
    let mut state = setup(dir.path());
    let audit_path = dir.path().join("audit.jsonl");
    state.audit = Arc::new(link_assistant_router::audit::AuditLog::to_path(
        audit_path.to_str(),
    ));
    let mut config = config();
    config.management.allow_remote = true;
    config.management.lockout_failures = 2;
    let public = link_assistant_router::server_router::router(state.clone(), &config);
    let admin = link_assistant_router::admin_api::router_with_config(state.clone(), &config);
    assert_eq!(
        public
            .oneshot(request("198.51.100.10", "/api/management/tokens", false))
            .await
            .unwrap()
            .status(),
        StatusCode::UNAUTHORIZED
    );
    assert_eq!(
        admin
            .clone()
            .oneshot(request("198.51.100.10", "/api/management/tokens", false))
            .await
            .unwrap()
            .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    assert_eq!(
        admin
            .clone()
            .oneshot(request(
                "::ffff:198.51.100.10",
                "/api/management/tokens",
                true
            ))
            .await
            .unwrap()
            .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    let log = std::fs::read_to_string(audit_path).unwrap();
    assert_eq!(log.lines().count(), 1);
    let event: serde_json::Value = serde_json::from_str(log.trim()).unwrap();
    assert_eq!(event["phase"], "management_auth_banned");
    assert_eq!(event["client_ip"], "198.51.100.10");
    assert!(!log.contains("rejected-credential"));
    assert!(!log.contains("management-test-admin"));
    let summary = admin
        .oneshot(request(
            "198.51.100.11",
            "/api/management/admin/summary",
            true,
        ))
        .await
        .unwrap();
    let body: serde_json::Value =
        serde_json::from_slice(&summary.into_body().collect().await.unwrap().to_bytes()).unwrap();
    link_assistant_router::contracts::validation::http(
        &axum::http::Method::GET,
        "/api/management/admin/summary",
        200,
        &body,
    )
    .unwrap();
    assert_eq!(body["management_bans"][0]["client_ip"], "198.51.100.10");
    assert!(
        link_assistant_router::management_access::doctor_report(&[dir.path().to_path_buf()])
            .contains("198.51.100.10")
    );
}

#[tokio::test]
async fn loopback_exemption_and_disabled_lockout_preserve_recovery() {
    for ip in ["127.0.0.1", "::1", "::ffff:127.0.0.1"] {
        let dir = tempfile::tempdir().unwrap();
        let app = link_assistant_router::admin_api::router(setup(dir.path()));
        for _ in 0..6 {
            assert_eq!(
                app.clone()
                    .oneshot(request(ip, "/api/management/tokens", false))
                    .await
                    .unwrap()
                    .status(),
                StatusCode::UNAUTHORIZED
            );
        }
        assert_eq!(
            app.oneshot(request(ip, "/api/management/tokens", true))
                .await
                .unwrap()
                .status(),
            StatusCode::OK
        );
    }
    for (failures, secs) in [(0, 1800), (5, 0)] {
        let dir = tempfile::tempdir().unwrap();
        let state = setup(dir.path());
        state.admin.management_access().configure(
            link_assistant_router::management_config::ManagementConfig {
                lockout_failures: failures,
                lockout_secs: secs,
                ..Default::default()
            },
        );
        let app = link_assistant_router::admin_api::router(state);
        for _ in 0..6 {
            assert_eq!(
                app.clone()
                    .oneshot(request("198.51.100.10", "/api/management/tokens", false))
                    .await
                    .unwrap()
                    .status(),
                StatusCode::UNAUTHORIZED
            );
        }
        assert_eq!(
            app.oneshot(request("198.51.100.10", "/api/management/tokens", true))
                .await
                .unwrap()
                .status(),
            StatusCode::OK
        );
    }
}

#[tokio::test]
async fn invalid_bootstrap_confirmation_credentials_count_and_cannot_reset_a_ban() {
    let dir = tempfile::tempdir().unwrap();
    let mut state = setup(dir.path());
    state.admin = Arc::new(AdminClaim::load(None, dir.path(), Duration::from_secs(60)));
    state.admin.management_access().configure(
        link_assistant_router::management_config::ManagementConfig {
            lockout_failures: 2,
            ..Default::default()
        },
    );
    let candidate = state.admin.begin().unwrap();
    let app = link_assistant_router::admin_api::router(state);
    for attempt in 1..=2 {
        let req = Request::builder()
            .method("POST")
            .uri("/api/management/admin/bootstrap/confirm")
            .header("authorization", "Bearer wrong-candidate-secret")
            .header("content-type", "application/json")
            .extension(ConnectInfo(
                "198.51.100.10:12345".parse::<SocketAddr>().unwrap(),
            ))
            .body(Body::from(
                serde_json::json!({"claim_id":candidate.claim_id}).to_string(),
            ))
            .unwrap();
        assert_eq!(
            app.clone().oneshot(req).await.unwrap().status(),
            if attempt == 1 {
                StatusCode::UNAUTHORIZED
            } else {
                StatusCode::TOO_MANY_REQUESTS
            }
        );
    }
    let req = Request::builder()
        .method("POST")
        .uri("/api/management/admin/bootstrap/confirm")
        .header("authorization", format!("Bearer {}", candidate.token))
        .header("content-type", "application/json")
        .extension(ConnectInfo(
            "198.51.100.10:12345".parse::<SocketAddr>().unwrap(),
        ))
        .body(Body::from(
            serde_json::json!({"claim_id":candidate.claim_id}).to_string(),
        ))
        .unwrap();
    assert_eq!(
        app.oneshot(req).await.unwrap().status(),
        StatusCode::TOO_MANY_REQUESTS
    );
}

#[test]
fn startup_refuses_sample_admin_and_signing_secrets_without_leaking_them() {
    use std::process::{Command, Stdio};
    use wait_timeout::ChildExt as _;
    for args in [
        vec!["--token-secret", "your-secure-secret-here"],
        vec![
            "--token-secret",
            "management-security-test-secret",
            "--admin-key",
            "your-admin-key",
        ],
    ] {
        let dir = tempfile::tempdir().unwrap();
        let mut child = Command::new(env!("CARGO_BIN_EXE_router"))
            .args(&args)
            .arg("serve")
            .env_clear()
            .env("HOME", dir.path())
            .env("DATA_DIR", dir.path())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .unwrap();
        if child
            .wait_timeout(Duration::from_secs(10))
            .unwrap()
            .is_none()
        {
            child.kill().unwrap();
            child.wait().unwrap();
            panic!("example-secret startup did not fail before binding");
        }
        let output = child.wait_with_output().unwrap();
        assert!(!output.status.success());
        let error = String::from_utf8_lossy(&output.stderr);
        let flag = if args.len() == 2 {
            "--token-secret"
        } else {
            "--admin-key"
        };
        assert!(error.contains(flag), "{error}");
        assert!(error.contains("documented example"), "{error}");
        assert!(!error.contains(args.last().unwrap()), "{error}");
        assert!(!dir.path().join("tokens.lino").exists());
    }
}

#[tokio::test]
async fn real_http_and_https_listeners_supply_peer_addresses_share_bans_and_expire() {
    use link_assistant_router::primary_listener::{PrimaryListenerConfig, bind_all};
    use link_assistant_router::tls::{TlsSetup, ensure_generated, generated_subject_names};
    let dir = tempfile::tempdir().unwrap();
    let state = setup(dir.path());
    let mut config = config();
    config.management.lockout_failures = 2;
    config.management.lockout_secs = 1;
    config.management.exempt_loopback = false;
    let (cert, key) = ensure_generated(dir.path(), &generated_subject_names("127.0.0.1")).unwrap();
    let configs: Vec<PrimaryListenerConfig> =
        ["127.0.0.1:0=combined,http", "127.0.0.1:0=combined,tls"]
            .iter()
            .map(|value| value.parse().unwrap())
            .collect();
    let bound = bind_all(
        &configs,
        &TlsSetup::Enabled {
            cert: cert.clone(),
            key,
        },
    )
    .await
    .unwrap();
    let client = reqwest::Client::builder()
        .no_proxy()
        .timeout(Duration::from_secs(10))
        .add_root_certificate(
            reqwest::Certificate::from_pem(&std::fs::read(cert).unwrap()).unwrap(),
        )
        .build()
        .unwrap();
    let mut endpoints = Vec::new();
    let mut servers = Vec::new();
    for listener in bound {
        endpoints.push(format!(
            "{}://{}/api/management/tokens",
            listener.config().transport.scheme(),
            listener.local_addr().unwrap()
        ));
        let app = link_assistant_router::server_router::router(state.clone(), &config);
        let (stop, stopped) = tokio::sync::oneshot::channel();
        let task = tokio::spawn(async move {
            listener
                .serve(app, async {
                    let _ = stopped.await;
                })
                .await
                .unwrap();
        });
        servers.push((stop, task));
    }
    assert_eq!(
        client.get(&endpoints[0]).send().await.unwrap().status(),
        StatusCode::UNAUTHORIZED
    );
    let response = client.get(&endpoints[1]).send().await.unwrap();
    assert_eq!(response.status(), StatusCode::TOO_MANY_REQUESTS);
    assert_eq!(response.headers()["retry-after"], "1");
    assert_eq!(
        client
            .get(&endpoints[0])
            .bearer_auth("management-test-admin")
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::TOO_MANY_REQUESTS
    );
    tokio::time::sleep(Duration::from_millis(1100)).await;
    assert_eq!(
        client
            .get(&endpoints[0])
            .bearer_auth("management-test-admin")
            .send()
            .await
            .unwrap()
            .status(),
        StatusCode::OK
    );
    for (stop, task) in servers {
        stop.send(()).unwrap();
        task.await.unwrap();
    }
}

#[test]
fn startup_checks_secret_files_and_doctor_reads_active_bans() {
    use std::process::Command;
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("signing-secret");
    std::fs::write(&path, "your-router-token-secret\n").unwrap();
    let output = bounded_output(
        Command::new(env!("CARGO_BIN_EXE_router"))
            .args(["serve"])
            .env_clear()
            .env("TOKEN_SECRET_FILE", &path)
            .env("HOME", dir.path())
            .env("DATA_DIR", dir.path()),
    );
    assert!(!output.status.success());
    assert!(String::from_utf8_lossy(&output.stderr).contains("TOKEN_SECRET"));
    assert!(!String::from_utf8_lossy(&output.stderr).contains("your-router-token-secret"));
    let output = bounded_output(
        Command::new(env!("CARGO_BIN_EXE_router"))
            .args(["--json", "serve"])
            .env_clear()
            .env("TOKEN_SECRET_FILE", &path)
            .env("HOME", dir.path())
            .env("DATA_DIR", dir.path()),
    );
    assert!(!output.status.success());
    let result: serde_json::Value = serde_json::from_slice(&output.stdout).unwrap();
    assert_eq!(result["success"], false);
    assert!(result["diagnostics"].to_string().contains("--token-secret"));
    assert!(!result.to_string().contains("your-router-token-secret"));
    let state = setup(dir.path());
    state.admin.management_access().configure(
        link_assistant_router::management_config::ManagementConfig {
            lockout_failures: 1,
            ..Default::default()
        },
    );
    state
        .admin
        .management_access()
        .failure("198.51.100.10".parse().unwrap());
    let output = bounded_output(
        Command::new(env!("CARGO_BIN_EXE_router"))
            .args(["doctor", "--local"])
            .env_clear()
            .env("TOKEN_SECRET", "management-security-test-secret")
            .env("HOME", dir.path())
            .env("DATA_DIR", dir.path()),
    );
    let report = String::from_utf8_lossy(&output.stdout);
    assert!(report.contains("management_ban"), "{report}");
    assert!(report.contains("198.51.100.10"), "{report}");
}

fn bounded_output(command: &mut std::process::Command) -> std::process::Output {
    use std::process::Stdio;
    use wait_timeout::ChildExt as _;
    let mut child = command
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .spawn()
        .unwrap();
    if child
        .wait_timeout(Duration::from_secs(10))
        .unwrap()
        .is_none()
    {
        child.kill().unwrap();
        child.wait().unwrap();
        panic!("management CLI test exceeded its deadline");
    }
    child.wait_with_output().unwrap()
}
