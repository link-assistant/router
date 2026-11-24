//! Black-box coverage for simultaneous primary listeners (issue #556).

#![cfg(unix)]

use std::net::{TcpListener, TcpStream};
use std::process::{Child, Command, Stdio};
use std::time::{Duration, Instant};

#[path = "support/free_port.rs"]
mod free_port;
use free_port::free_port;

struct RouterProcess(Child);

impl Drop for RouterProcess {
    fn drop(&mut self) {
        let _ = self.0.kill();
        let _ = self.0.wait();
    }
}

/// Wait for the Router's own `ok` from `/api/health` at `url`; `false` if it
/// exited first, as it does when another listener took one of its ports.
async fn wait_until_ready(client: &reqwest::Client, url: &str, child: &mut Child) -> bool {
    let deadline = Instant::now() + Duration::from_secs(30);
    while matches!(child.try_wait(), Ok(None)) {
        if let Ok(response) = client.get(format!("{url}/api/health")).send().await
            && response.status().is_success()
            && response.text().await.is_ok_and(|body| body == "ok")
        {
            return true;
        }
        assert!(Instant::now() < deadline, "Router never made {url} ready");
        tokio::time::sleep(Duration::from_millis(100)).await;
    }
    false
}

#[tokio::test]
async fn one_process_serves_combined_and_inference_only_primary_listeners() {
    let data_dir = tempfile::tempdir().expect("data directory");
    let (cert, key) = link_assistant_router::tls::ensure_generated(
        data_dir.path(),
        &link_assistant_router::tls::generated_subject_names("127.0.0.1"),
    )
    .expect("generate an IP-SAN certificate");
    let upstream_listener = tokio::net::TcpListener::bind("127.0.0.1:0")
        .await
        .expect("bind upstream");
    let upstream_address = upstream_listener.local_addr().expect("upstream address");
    let upstream = axum::Router::new()
        .route(
            "/v1/models",
            axum::routing::get(|| async {
                axum::Json(serde_json::json!({
                    "object": "list",
                    "data": [{"id": "fixture-model", "object": "model"}]
                }))
            }),
        )
        .route("/v1/chat/completions", axum::routing::post(|| async {
            (
                [(axum::http::header::CONTENT_TYPE, "text/event-stream")],
                "data: {\"id\":\"chatcmpl_fixture\",\"object\":\"chat.completion.chunk\",\"choices\":[{\"index\":0,\"delta\":{\"content\":\"shared stream\"},\"finish_reason\":null}]}\n\ndata: [DONE]\n\n",
            )
        }));
    let upstream_task = tokio::spawn(async move {
        axum::serve(upstream_listener, upstream)
            .await
            .expect("serve upstream");
    });
    let mut default_headers = reqwest::header::HeaderMap::new();
    default_headers.insert(
        reqwest::header::CONNECTION,
        reqwest::header::HeaderValue::from_static("close"),
    );
    let client = reqwest::Client::builder()
        .http1_only()
        .default_headers(default_headers.clone())
        .build()
        .expect("build HTTP client");
    let certificate =
        reqwest::Certificate::from_pem(&std::fs::read(&cert).expect("read generated certificate"))
            .expect("parse generated certificate");
    let tls_client = reqwest::Client::builder()
        .http1_only()
        .add_root_certificate(certificate)
        .default_headers(default_headers)
        .build()
        .expect("build TLS client");
    // The ports are released before the Router binds them, so a parallel
    // test's listener can take one first; the Router then exits and is started
    // again on other ports.
    let mut attempts = 0;
    let (mut process, combined_port, inference_port, combined, inference) = loop {
        attempts += 1;
        assert!(
            attempts <= 5,
            "Router never served both listeners on ports of its own"
        );
        let combined_port = free_port();
        let inference_port = free_port();
        let child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
            .arg("--listener")
            .arg(format!("127.0.0.1:{combined_port}=combined,http"))
            .arg("--listener")
            .arg(format!("127.0.0.1:{inference_port}=inference-only,tls"))
            .arg("serve")
            .env("TOKEN_SECRET", "multi-listener-test-secret")
            .env("TOKEN_ADMIN_KEY", "multi-listener-admin")
            .env("HOME", data_dir.path())
            .env_remove("CODEX_HOME")
            .env_remove("CLAUDE_CONFIG_DIR")
            .env_remove("GEMINI_HOME")
            .env_remove("GEMINI_CLI_HOME")
            .env_remove("XDG_CONFIG_HOME")
            .env_remove("QWEN_HOME")
            .env("DATA_DIR", data_dir.path())
            .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
            .env("STORAGE_POLICY", "memory")
            // The mock provider listens on loopback (issue #669).
            .env("UPSTREAM_ALLOW_PRIVATE_NETWORKS", "loopback")
            .env("DISABLE_LOGIN_API", "true")
            .env("TLS_CERT_FILE", &cert)
            .env("TLS_KEY_FILE", &key)
            .env("UPSTREAM_PROVIDER", "openai-compatible")
            .env(
                "OPENAI_COMPATIBLE_BASE_URL",
                format!("http://{upstream_address}/v1"),
            )
            .env("OPENAI_COMPATIBLE_API_KEY", "fixture-key")
            .env("OPENAI_COMPATIBLE_MODELS", "fixture-model")
            .env("OPENAI_COMPATIBLE_SUPPORTED_CLIENTS", "opencode")
            .stdout(Stdio::null())
            .stderr(Stdio::null())
            .spawn()
            .expect("start Router");
        let mut process = RouterProcess(child);
        let combined = format!("http://127.0.0.1:{combined_port}");
        let inference = format!("https://127.0.0.1:{inference_port}");
        if wait_until_ready(&client, &combined, &mut process.0).await
            && wait_until_ready(&tls_client, &inference, &mut process.0).await
        {
            break (process, combined_port, inference_port, combined, inference);
        }
    };

    let issued = client
        .post(format!("{combined}/api/management/tokens/client"))
        .bearer_auth("multi-listener-admin")
        .json(&serde_json::json!({
            "client_kind": "opencode",
            "ttl_hours": 1,
            "label": "listener-shared"
        }))
        .send()
        .await
        .expect("issue a token through the combined listener");
    assert_eq!(issued.status(), reqwest::StatusCode::OK);
    let issued = issued
        .json::<serde_json::Value>()
        .await
        .expect("token response JSON");
    let token = issued["token"].as_str().expect("issued token").to_string();

    let catalog = tls_client
        .get(format!("{inference}/api/services/openai/v1/models"))
        .bearer_auth(&token)
        .header("x-link-assistant-client", "opencode")
        .send()
        .await
        .expect("use the same token on the inference listener");
    assert_eq!(catalog.status(), reqwest::StatusCode::OK);
    catalog.bytes().await.expect("read shared catalog");

    for path in [
        "/api/management/tokens",
        "/api/services/github/api/v3/user",
        "/api/services/activitypub/actor/code",
        "/",
    ] {
        let response = tls_client
            .get(format!("{inference}{path}"))
            .bearer_auth("multi-listener-admin")
            .send()
            .await
            .expect("inference listener response");
        assert_eq!(response.status(), reqwest::StatusCode::NOT_FOUND, "{path}");
    }

    let stream = tls_client
        .post(format!(
            "{inference}/api/services/openai/v1/chat/completions"
        ))
        .bearer_auth(&token)
        .header("user-agent", "opencode/fixture")
        .header("x-session-id", "shared-listener-session")
        .json(&serde_json::json!({
            "model": "fixture-model",
            "messages": [{"role": "user", "content": "hello"}],
            "stream": true
        }))
        .send()
        .await
        .expect("stream through the inference-only listener");
    assert_eq!(stream.status(), reqwest::StatusCode::OK);
    assert!(
        stream
            .text()
            .await
            .expect("read stream")
            .contains("shared stream")
    );

    let usage = client
        .get(format!("{combined}/api/management/usage"))
        .bearer_auth("multi-listener-admin")
        .send()
        .await
        .expect("read shared usage through the combined listener");
    assert_eq!(usage.status(), reqwest::StatusCode::OK);
    let usage = usage
        .json::<serde_json::Value>()
        .await
        .expect("shared usage JSON");
    assert_eq!(usage["openai_chat_completions"], 1);
    assert!(
        usage["token_calls"]
            .as_object()
            .is_some_and(|tokens| tokens.values().any(|entry| {
                entry["label"] == "listener-shared"
                    && entry["requests"]
                        .as_u64()
                        .is_some_and(|requests| requests >= 1)
            })),
        "the combined listener must observe inference usage: {usage}"
    );

    upstream_task.abort();
    drop(tls_client);
    drop(client);

    let signal = Command::new("kill")
        .args(["-TERM", &process.0.id().to_string()])
        .status()
        .expect("send SIGTERM");
    assert!(signal.success());
    assert!(
        process.0.wait().expect("wait for Router").success(),
        "every primary listener should drain and exit together"
    );
    assert!(TcpStream::connect(("127.0.0.1", combined_port)).is_err());
    assert!(TcpStream::connect(("127.0.0.1", inference_port)).is_err());
}

#[test]
fn a_failed_second_bind_never_leaves_the_first_listener_serving() {
    let first_port = free_port();
    let occupied = TcpListener::bind("127.0.0.1:0").expect("occupy second address");
    let second_port = occupied.local_addr().expect("occupied address").port();
    let data_dir = tempfile::tempdir().expect("data directory");
    let mut child = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .arg("--listener")
        .arg(format!("127.0.0.1:{first_port}=combined,http"))
        .arg("--listener")
        .arg(format!("127.0.0.1:{second_port}=inference-only,http"))
        .arg("serve")
        .env("TOKEN_SECRET", "multi-listener-bind-test-secret")
        .env("HOME", data_dir.path())
        .env_remove("CODEX_HOME")
        .env_remove("CLAUDE_CONFIG_DIR")
        .env_remove("GEMINI_HOME")
        .env_remove("GEMINI_CLI_HOME")
        .env_remove("XDG_CONFIG_HOME")
        .env_remove("QWEN_HOME")
        .env("DATA_DIR", data_dir.path())
        .env("CLAUDE_CODE_HOME", data_dir.path().join("claude"))
        .env("STORAGE_POLICY", "memory")
        // The mock provider listens on loopback (issue #669).
        .env("UPSTREAM_ALLOW_PRIVATE_NETWORKS", "loopback")
        .env("DISABLE_LOGIN_API", "true")
        .env_remove("TLS_CERT_FILE")
        .env_remove("TLS_KEY_FILE")
        .env_remove("TLS_SELF_SIGNED")
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .spawn()
        .expect("start Router");

    let deadline = Instant::now() + Duration::from_secs(10);
    let status = loop {
        if let Some(status) = child.try_wait().expect("inspect Router") {
            break status;
        }
        assert!(Instant::now() < deadline, "failed startup did not exit");
        std::thread::sleep(Duration::from_millis(25));
    };
    assert!(!status.success(), "the occupied listener must fail startup");
    TcpListener::bind(("127.0.0.1", first_port))
        .expect("the first listener must be released without serving");
}
