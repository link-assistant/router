//! Black-box coverage for a persisted z.ai exhaustion (issue #664).
//!
//! A deployment whose data directory records that the z.ai Coding Plan
//! account refused inference must say so on every catalog a client reads, and
//! `router doctor` must find the record. The projection unit tests build the
//! state in-process; this one starts the real binary over a data directory
//! that already holds the provider and the exhaustion file.

#![cfg(unix)]

use std::net::TcpListener;
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

use link_assistant_router::providers::{ProviderStore, ProviderUpsert};

const TOKEN_SECRET: &str = "zai-exhaustion-e2e-secret";
const ADMIN_KEY: &str = "zai-exhaustion-e2e-admin";
const PROVIDER: &str = "z-ai-personal";
/// Client tokens minted by the management API carry this principal.
const SUBSCRIBER: &str = "primary";

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

/// A z.ai account whose catalog and quota answer but whose inference is
/// refused with code 1113.
async fn exhausted_zai() -> String {
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind fake z.ai");
    let address = listener.local_addr().expect("fake z.ai address");
    let app = axum::Router::new()
        .route(
            link_assistant_router::zai_coding_plan::CATALOG_PATH,
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "object": "list",
                    "data": [{"id": "glm-5"}, {"id": "glm-5.3"}]
                }))
            }),
        )
        .route(
            link_assistant_router::zai_coding_plan::HEALTH_PATH,
            axum::routing::get(|| async { axum::Json(serde_json::json!({})) }),
        )
        .fallback(|| async {
            (
                axum::http::StatusCode::TOO_MANY_REQUESTS,
                axum::Json(serde_json::json!({
                    "error": {
                        "code": "1113",
                        "message": "[1113][Insufficient balance or no resource package. Please recharge.][e2e]",
                        "type": "rate_limit_error"
                    },
                    "type": "error"
                })),
            )
        });
    tokio::spawn(async move { axum::serve(listener, app).await.expect("serve z.ai") });
    format!("http://{address}")
}

/// Seed the data directory the way an earlier run of the deployment left it.
fn seed_data_dir(data: &std::path::Path, base_url: &str) {
    let store = ProviderStore::open(data, TOKEN_SECRET).expect("open provider store");
    store
        .upsert(ProviderUpsert {
            name: PROVIDER.into(),
            kind: Some("z.ai-coding-plan".into()),
            base_url: "https://api.z.ai".into(),
            default_model: Some("glm-5".into()),
            models: Some(vec!["glm-5".into()]),
            supported_clients: None,
            api_key: Some("zai-e2e-key".into()),
            api_key_env: None,
            encrypted_api_key: None,
            enabled: Some(true),
            subscriber_id: Some(SUBSCRIBER.into()),
            acknowledge_intermediary_risk: Some(true),
            acknowledge_unsupported_clients: None,
            if_absent: false,
        })
        .expect("install z.ai provider");
    drop(store);
    // The store pins z.ai's public endpoint outside the library's own tests;
    // loading does not, so point the stored record at the loopback fake.
    let path = data.join("providers.lenv");
    let stored = std::fs::read_to_string(&path).expect("read provider store");
    assert!(stored.contains("https://api.z.ai"), "{stored}");
    std::fs::write(&path, stored.replace("https://api.z.ai", base_url))
        .expect("point the provider at the fake z.ai");
    // Written as the serving process persists it, not through the store, so
    // the test also pins the on-disk format a restart reads.
    std::fs::write(
        data.join(link_assistant_router::zai_upstream_error::STATE_FILE),
        serde_json::json!({
            PROVIDER: {
                "state": "exhausted",
                "code": "1113",
                "reason": "Insufficient balance or no resource package. Please recharge.",
                "request_id": "e2e",
                "observed_at_unix": 1_790_000_000_u64,
            }
        })
        .to_string(),
    )
    .expect("write exhaustion record");
}

fn router(data: &std::path::Path, home: &std::path::Path) -> Command {
    let mut command = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"));
    command
        .env("TOKEN_SECRET", TOKEN_SECRET)
        .env("TOKEN_ADMIN_KEY", ADMIN_KEY)
        .env("HOME", home)
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("GEMINI_HOME")
        .env_remove("GEMINI_CLI_HOME")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env("DATA_DIR", data)
        .env("CLAUDE_CODE_HOME", home.join("claude"))
        .env("STORAGE_POLICY", "memory")
        // The mock provider listens on loopback (issue #669).
        .env("UPSTREAM_ALLOW_PRIVATE_NETWORKS", "loopback")
        .env("DISABLE_LOGIN_API", "true")
        .env("UPSTREAM_PROVIDER", "auto");
    command
}

async fn get_json(
    client: &reqwest::Client,
    url: &str,
    token: &str,
    client_kind: &str,
) -> serde_json::Value {
    let response = client
        .get(url)
        .bearer_auth(token)
        .header("x-link-assistant-client", client_kind)
        .send()
        .await
        .unwrap_or_else(|error| panic!("GET {url}: {error}"));
    assert_eq!(response.status(), reqwest::StatusCode::OK, "GET {url}");
    response.json().await.expect("catalog JSON")
}

#[tokio::test]
async fn a_persisted_exhaustion_marks_every_catalog_after_a_restart() {
    let home = tempfile::tempdir().expect("home");
    let data = tempfile::tempdir().expect("data");
    seed_data_dir(data.path(), &exhausted_zai().await);

    let port = free_port();
    let child = router(data.path(), home.path())
        .arg("serve")
        .env("ROUTER_HOST", "127.0.0.1")
        .env("ROUTER_PORT", port.to_string())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("start Router");
    let mut process = RouterProcess(child);

    let client = reqwest::Client::new();
    let base = format!("http://127.0.0.1:{port}");
    let deadline = Instant::now() + Duration::from_secs(60);
    while client
        .get(format!("{base}/api/health"))
        .send()
        .await
        .is_err()
    {
        assert!(
            !matches!(process.0.try_wait(), Ok(Some(_))),
            "Router exited before it accepted connections"
        );
        assert!(
            Instant::now() < deadline,
            "Router never accepted connections"
        );
        tokio::time::sleep(Duration::from_millis(50)).await;
    }

    let issued: serde_json::Value = client
        .post(format!("{base}/api/management/tokens/client"))
        .bearer_auth(ADMIN_KEY)
        .json(&serde_json::json!({"client_kind": "claude", "ttl_hours": 1}))
        .send()
        .await
        .expect("issue a client token")
        .json()
        .await
        .expect("token JSON");
    let token = issued["token"].as_str().expect("token").to_string();

    let aggregate = get_json(&client, &format!("{base}/api/models"), &token, "claude").await;
    let anthropic = get_json(
        &client,
        &format!("{base}/api/services/anthropic/v1/models?limit=1000"),
        &token,
        "claude",
    )
    .await;
    for (surface, catalog) in [("/api/models", &aggregate), ("anthropic", &anthropic)] {
        let glm = catalog["data"]
            .as_array()
            .unwrap_or_else(|| panic!("{surface} has rows: {catalog}"))
            .iter()
            .find(|row| row["id"] == "glm-5.3")
            .unwrap_or_else(|| panic!("{surface} lists the exhausted row: {catalog}"));
        assert_eq!(glm["router_available"], false, "{surface}: {glm}");
        let reason = glm["router_unavailable_reason"]
            .as_str()
            .unwrap_or_default();
        assert!(reason.contains("code 1113"), "{surface}: {glm}");
        assert!(!reason.ends_with('.'), "{surface}: {reason}");
    }
    let degraded = aggregate["degraded_providers"].to_string();
    assert!(
        degraded.contains("z.ai"),
        "the aggregate names the exhausted subscription degraded: {aggregate}"
    );
    drop(process);

    let doctor = router(data.path(), home.path())
        .arg("doctor")
        .output()
        .expect("run router doctor");
    let report = String::from_utf8_lossy(&doctor.stdout);
    assert!(
        report.contains("code 1113") && report.contains("recorded in"),
        "router doctor reports the persisted exhaustion:\n{report}\n{}",
        String::from_utf8_lossy(&doctor.stderr)
    );
}
