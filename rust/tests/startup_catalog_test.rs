//! Black-box coverage for the startup catalog window (issue #665).
//!
//! A Router that accepts connections before its subscription catalogs have
//! been refreshed answers `/api/models` without the subscription's rows and
//! calls the healthy subscription degraded. A client that starts in that
//! window caches the empty list. The listener must therefore not accept until
//! the first refresh has decided every subscription.

#![cfg(unix)]

use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

/// Long enough that a listener bound before the refresh is plainly caught.
const CATALOG_DELAY: Duration = Duration::from_secs(3);

struct RouterProcess(Child);

impl Drop for RouterProcess {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0")
        .expect("reserve loopback port")
        .local_addr()
        .expect("read loopback port")
        .port()
}

/// A Qwen catalog that answers only after `CATALOG_DELAY`.
async fn slow_qwen_catalog() -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind fake catalog");
    let address = listener.local_addr().expect("fake catalog address");
    let app = axum::Router::new().route(
        "/v1/models",
        axum::routing::get(|| async {
            tokio::time::sleep(CATALOG_DELAY).await;
            axum::Json(serde_json::json!({
                "object": "list",
                "data": [{"id": "startup-fixture-model", "object": "model"}]
            }))
        }),
    );
    tokio::spawn(async move { axum::serve(listener, app).await.expect("serve catalog") });
    format!("http://{address}/v1")
}

#[tokio::test]
async fn the_first_models_response_already_contains_a_healthy_subscription() {
    let port = free_port();
    let home = tempfile::tempdir().expect("home");
    let data = tempfile::tempdir().expect("data");
    let qwen = home.path().join(".qwen");
    std::fs::create_dir_all(&qwen).expect("qwen home");
    let catalog = slow_qwen_catalog().await;
    std::fs::write(
        qwen.join("oauth_creds.json"),
        serde_json::json!({
            "access_token": "startup-fixture-access",
            "token_type": "Bearer",
            "resource_url": catalog,
            "expiry_date": 99_999_999_999_999_u64,
        })
        .to_string(),
    )
    .expect("write qwen credential");

    let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .arg("serve")
        .env("ROUTER_HOST", "127.0.0.1")
        .env("ROUTER_PORT", port.to_string())
        .env("TOKEN_SECRET", "startup-catalog-test-secret")
        .env("TOKEN_ADMIN_KEY", "startup-catalog-admin")
        .env("HOME", home.path())
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("GEMINI_HOME")
        .env_remove("GEMINI_CLI_HOME")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env("DATA_DIR", data.path())
        .env("CLAUDE_CODE_HOME", home.path().join("claude"))
        .env("STORAGE_POLICY", "memory")
        .env("DISABLE_LOGIN_API", "true")
        .env("UPSTREAM_PROVIDER", "auto")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("start Router");
    let mut process = RouterProcess(child);
    let started = Instant::now();

    let client = reqwest::Client::new();
    let base = format!("http://127.0.0.1:{port}");
    // The first moment the listener accepts anything at all.
    let deadline = Instant::now() + Duration::from_secs(60);
    loop {
        if client
            .get(format!("{base}/api/health"))
            .send()
            .await
            .is_ok()
        {
            break;
        }
        assert!(
            !matches!(process.0.try_wait(), Ok(Some(_))),
            "Router exited before it accepted connections"
        );
        assert!(
            Instant::now() < deadline,
            "Router never accepted connections"
        );
        tokio::time::sleep(Duration::from_millis(20)).await;
    }
    let accepted_after = started.elapsed();

    let issued = client
        .post(format!("{base}/api/management/tokens/client"))
        .bearer_auth("startup-catalog-admin")
        .json(&serde_json::json!({
            "client_kind": "qwen",
            "ttl_hours": 1,
            "label": "startup-catalog"
        }))
        .send()
        .await
        .expect("issue a client token");
    assert_eq!(issued.status(), reqwest::StatusCode::OK);
    let issued: serde_json::Value = issued.json().await.expect("token JSON");
    let token = issued["token"].as_str().expect("token").to_string();

    let response = client
        .get(format!("{base}/api/models"))
        .bearer_auth(&token)
        .header("x-link-assistant-client", "qwen")
        .send()
        .await
        .expect("first /api/models");
    assert_eq!(response.status(), reqwest::StatusCode::OK);
    let models: serde_json::Value = response.json().await.expect("models JSON");

    let listed = models["data"]
        .as_array()
        .expect("model rows")
        .iter()
        .any(|row| row["id"] == "startup-fixture-model");
    assert!(
        listed,
        "the first /api/models after the listener accepted ({accepted_after:?}) \
         omitted the healthy subscription's rows: {models}"
    );
    let degraded = models["degraded_providers"].as_array().cloned();
    assert!(
        degraded.is_none_or(|degraded| degraded.is_empty()),
        "a healthy subscription was reported degraded at startup: {models}"
    );
    assert!(
        accepted_after >= CATALOG_DELAY,
        "the listener accepted before the first catalog refresh finished"
    );
}
