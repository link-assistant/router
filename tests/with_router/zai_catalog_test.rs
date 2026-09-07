use super::*;

fn mock_chatgpt_and_zai_catalog_router() -> (String, thread::JoinHandle<Vec<String>>) {
    let listener = TcpListener::bind("127.0.0.1:0").expect("bind mixed-catalog router");
    let port = listener.local_addr().expect("mixed-catalog address").port();
    let handle = thread::spawn(move || {
        let mut paths = Vec::new();
        for _ in 0..3 {
            let (mut stream, _) = listener.accept().expect("accept wrapper request");
            let request = read_request(&mut stream);
            let path = request
                .lines()
                .next()
                .and_then(|line| line.split_whitespace().nth(1))
                .unwrap_or("")
                .to_string();
            paths.push(path.clone());
            let (status, body) = match path.as_str() {
                "/api/health" => ("200 OK", r#"{"status":"ok","version":"1.3.2"}"#),
                "/api/management/tokens" => (
                    "401 Unauthorized",
                    r#"{"error":{"message":"ordinary token"}}"#,
                ),
                "/api/models" => (
                    "200 OK",
                    r#"{"object":"list","data":[{"id":"gpt-live","owned_by":"openai","default_reasoning_level":"high","supported_reasoning_levels":[{"effort":"high","description":"Deep reasoning"},{"effort":"xhigh","description":"Extra deep reasoning"}]},{"id":"glm-live","owned_by":"z.ai"},{"id":"glm-newly-discovered","owned_by":"z.ai"},{"id":"incomplete-unrelated","owned_by":"unknown-provider"}]}"#,
                ),
                _ => ("404 Not Found", r#"{"error":"unexpected path"}"#),
            };
            let response = format!(
                "HTTP/1.1 {status}\r\nContent-Type: application/json\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{body}",
                body.len()
            );
            stream
                .write_all(response.as_bytes())
                .expect("write mock response");
        }
        paths
    });
    (format!("http://127.0.0.1:{port}"), handle)
}

#[test]
fn router_with_codex_launches_with_live_chatgpt_and_zai_catalogs() {
    for (effort, expected_ids) in [
        (
            "high",
            &["glm-live", "glm-newly-discovered", "gpt-live"][..],
        ),
        ("xhigh", &["gpt-live"][..]),
    ] {
        let directory = tempfile::tempdir().expect("temporary test directory");
        let home = directory.path().join("home");
        let bin = directory.path().join("bin");
        let capture = directory.path().join("capture");
        let codex_home = home.join("codex-state");
        fs::create_dir_all(&codex_home).expect("create Codex home");
        fs::create_dir_all(&capture).expect("create capture directory");
        let original = format!("model_reasoning_effort = \"{effort}\"\n");
        fs::write(codex_home.join("config.toml"), &original)
            .expect("seed explicit reasoning effort");
        fake_codex(&bin);
        let (server, requests) = mock_chatgpt_and_zai_catalog_router();

        let output = run_with(
            env!("CARGO_BIN_EXE_link-assistant-router"),
            &home,
            &bin,
            &capture,
            &server,
            false,
        );

        assert_eq!(
            output.status.code(),
            Some(23),
            "the child stub was not invoked for {effort}; stdout: {}; stderr: {}",
            String::from_utf8_lossy(&output.stdout),
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(
            String::from_utf8_lossy(&output.stderr).contains("incomplete-unrelated"),
            "the omitted capability limitation was not explicit: {}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert_eq!(
            fs::read_to_string(capture.join("config")).expect("captured real config"),
            original,
            "the wrapper must preserve the caller's {effort} configuration"
        );
        let catalog: serde_json::Value = serde_json::from_slice(
            &fs::read(capture.join("model-catalog.json")).expect("captured model catalog"),
        )
        .expect("valid generated model catalog");
        let models = catalog["models"].as_array().unwrap();
        let mut ids = models
            .iter()
            .map(|model| model["slug"].as_str().unwrap())
            .collect::<Vec<_>>();
        ids.sort_unstable();
        assert_eq!(ids, expected_ids, "wrong {effort} compatibility filter");
        for model in models {
            let default = model["default_reasoning_level"].as_str().unwrap();
            assert!(
                model["supported_reasoning_levels"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .any(|level| level["effort"] == default),
                "invalid reasoning metadata for {model}"
            );
        }
        assert_eq!(
            requests.join().expect("mock router thread"),
            ["/api/health", "/api/management/tokens", "/api/models"],
            "catalog generation must not send inference"
        );
    }
}
