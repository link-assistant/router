//! Authoritative credential coverage for `router auth status`.

use std::process::Command;

#[test]
fn status_probes_an_authoritatively_loaded_unexpired_credential() {
    use std::io::{Read as _, Write as _};
    use std::sync::{
        Arc,
        atomic::{AtomicUsize, Ordering},
    };

    let listener = std::net::TcpListener::bind("127.0.0.1:0").expect("catalog listener");
    let resource_url = format!(
        "http://{}",
        listener.local_addr().expect("listener address")
    );
    let requests = Arc::new(AtomicUsize::new(0));
    let observed = Arc::clone(&requests);
    let server = std::thread::spawn(move || {
        let (mut socket, _) = listener.accept().expect("catalog request");
        let mut request = [0_u8; 4096];
        let _ = socket.read(&mut request).expect("read catalog request");
        observed.fetch_add(1, Ordering::SeqCst);
        let body = r#"{"data":[{"id":"qwen-live"}]}"#;
        write!(
            socket,
            "HTTP/1.1 200 OK\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
            body.len()
        )
        .expect("write catalog response");
    });

    let config = tempfile::tempdir().expect("config home");
    let home = tempfile::tempdir().expect("temp home");
    let qwen = home.path().join(".qwen");
    std::fs::create_dir_all(&qwen).expect("qwen home");
    std::fs::write(
        qwen.join("oauth_creds.json"),
        serde_json::to_vec(&serde_json::json!({
            "access_token": "current-access",
            "refresh_token": "current-refresh",
            "expiry_date": 9_999_999_999_999_i64,
            "resource_url": resource_url
        }))
        .expect("serialize credential"),
    )
    .expect("seed qwen credential");

    let output = Command::new(env!("CARGO_BIN_EXE_link-assistant-router"))
        .args(["auth", "status", "--managed"])
        .env("XDG_CONFIG_HOME", config.path())
        .env("HOME", home.path())
        .env("DATA_DIR", home.path().join("router-data"))
        .env("TOKEN_SECRET", "auth-cli-test-secret")
        .output()
        .expect("router CLI should run");
    server.join().expect("catalog server");

    let stdout = String::from_utf8_lossy(&output.stdout);
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert!(output.status.success(), "stdout={stdout}\nstderr={stderr}");
    assert!(stdout.contains("qwen     usable"), "{stdout}");
    assert_eq!(requests.load(Ordering::SeqCst), 1);
}
