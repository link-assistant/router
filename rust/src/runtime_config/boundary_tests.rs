use axum::Router;
use axum::body::{Body, Bytes, to_bytes};
use axum::extract::{ConnectInfo, State};
use axum::http::{HeaderMap, Request, StatusCode, header};
use axum::routing::post;
use serde_json::{Value, json};
use tower::ServiceExt as _;

use crate::app_state::AppState;
use crate::token::{ADMIN_SCOPE, CONFIG_WRITE_SCOPE, TokenClaims};

use super::super::{Edit, egress, payload, storage};
use super::{ROOT, call, issue, state};

#[tokio::test]
async fn configuration_writers_cannot_change_host_authority() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let app = crate::admin_api::router(state.clone());
    let writer = issue(&state, CONFIG_WRITE_SCOPE);
    for (key, value) in [
        ("account-egress-proxy", json!("primary=env:ACCOUNT_PROXY")),
        ("model-catalog-sources", json!(["catalog.json"])),
        (
            "crater-forgefed-inbox",
            json!("https://forge.example/inbox"),
        ),
        ("listener", json!(["127.0.0.1:9000=admin"])),
        ("admin-host", json!("0.0.0.0")),
        ("admin-port", json!(9000)),
    ] {
        let path = format!("{ROOT}/cli/{key}");
        let patch = json!({"cli": {(key): value.clone()}});
        for (method, uri, body) in [("PATCH", ROOT, patch), ("PUT", path.as_str(), value)] {
            let (status, response) = call(&app, method, uri, &writer, Some(body)).await;
            assert_eq!(status, StatusCode::BAD_REQUEST);
            assert_eq!(
                response["error"]["message"],
                "this CLI setting may only be changed in the local TOML file"
            );
        }
    }
    assert!(!root.path().join("runtime.toml").exists());
    assert!(!root.path().join("runtime-config-audit.jsonl").exists());
}

#[tokio::test]
async fn management_export_and_pointer_errors_preserve_secrets() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("runtime.toml");
    let original = "[cli]\nadmin-key = 'secret-export-fixture'\n[cors]\norigins = []\n";
    std::fs::write(&path, original).unwrap();
    let state = state(root.path());
    let app = crate::admin_api::router(state.clone());
    let admin = issue(&state, ADMIN_SCOPE);
    let writer = issue(&state, CONFIG_WRITE_SCOPE);
    let peer = std::net::SocketAddr::from(([127, 0, 0, 1], 25000));
    let request = Request::get(format!("{ROOT}.yaml"))
        .header(header::AUTHORIZATION, format!("Bearer {admin}"))
        .extension(ConnectInfo(peer))
        .body(Body::empty())
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    assert_eq!(response.headers()[header::CONTENT_TYPE], "application/yaml");
    let bytes = to_bytes(response.into_body(), storage::MAX_BYTES)
        .await
        .unwrap();
    let exported: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(exported["cli"]["admin-key"], "[REDACTED]");
    assert_eq!(
        call(&app, "PUT", ROOT, &writer, Some(exported)).await.0,
        StatusCode::OK
    );
    assert!(
        std::fs::read_to_string(&path)
            .unwrap()
            .contains("secret-export-fixture")
    );

    let (status, schema) = call(&app, "GET", &format!("{ROOT}/schema"), &admin, None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(
        schema["properties"]["cli"]["properties"]["admin-key"]["writeOnly"],
        true
    );
    let (status, desired) = call(&app, "GET", &format!("{ROOT}/status"), &admin, None).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(desired["restart_required"], json!([]));

    let invalid = format!("{ROOT}/cli/invalid~2escape");
    let absent = format!("{ROOT}/cors/origins/0");
    for (method, value) in [("GET", None), ("PUT", Some(json!(1))), ("DELETE", None)] {
        assert_eq!(
            call(&app, method, &invalid, &writer, value).await.0,
            StatusCode::BAD_REQUEST
        );
    }
    assert_eq!(
        call(&app, "GET", &absent, &admin, None).await.0,
        StatusCode::NOT_FOUND
    );
    assert_eq!(
        call(&app, "DELETE", &absent, &writer, None).await.0,
        StatusCode::NOT_FOUND
    );
    let append = format!("{ROOT}/cors/origins/-");
    assert_eq!(
        call(
            &app,
            "PUT",
            &append,
            &writer,
            Some(json!("https://console.example"))
        )
        .await
        .0,
        StatusCode::OK
    );
    assert_eq!(
        call(&app, "GET", &absent, &admin, None).await.1,
        "https://console.example"
    );
}

#[tokio::test]
async fn io_failures_keep_the_live_document_and_report_reload_conflicts() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let app = crate::admin_api::router(state.clone());
    let writer = issue(&state, CONFIG_WRITE_SCOPE);
    let original = json!({"cors": {"origins": ["*"], "headers": ["*"], "methods": ["*"]}});
    assert_eq!(
        call(&app, "PUT", ROOT, &writer, Some(original.clone()))
            .await
            .0,
        StatusCode::OK
    );
    let invalid = json!({"cors": {"origins": ["https://example.test/path"]}});
    assert_eq!(
        call(&app, "PUT", ROOT, &writer, Some(invalid)).await.0,
        StatusCode::BAD_REQUEST
    );

    let audit = root.path().join("runtime-config-audit.jsonl");
    std::fs::remove_file(&audit).unwrap();
    std::fs::create_dir(&audit).unwrap();
    assert_eq!(
        call(&app, "PUT", ROOT, &writer, Some(json!({}))).await.0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    let path = root.path().join("runtime.toml");
    let persisted = std::fs::read_to_string(&path).unwrap();
    assert_eq!(storage::decode(&persisted).unwrap().1, original);
    let reload = format!("{ROOT}/reload");
    std::fs::write(&path, "[cors]\norigins = []\n").unwrap();
    assert_eq!(
        call(&app, "POST", &reload, &writer, None).await.0,
        StatusCode::INTERNAL_SERVER_ERROR
    );
    assert_eq!(call(&app, "GET", ROOT, &writer, None).await.1, original);
    std::fs::remove_file(&path).unwrap();
    std::fs::create_dir(&path).unwrap();
    assert_eq!(
        call(&app, "POST", &reload, &writer, None).await.0,
        StatusCode::CONFLICT
    );
    let (_, status) = call(&app, "GET", &format!("{ROOT}/status"), &writer, None).await;
    assert_eq!(
        status["reload_error"],
        "could not read runtime configuration file"
    );
    assert!(state.request_log.runtime_config().unwrap().cors().is_some());
}

#[test]
fn storage_rejects_ambiguous_or_oversized_documents() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("runtime.toml");
    std::fs::write(&path, " ".repeat(storage::MAX_BYTES + 1)).unwrap();
    assert_eq!(
        storage::read(&path).unwrap_err().kind(),
        std::io::ErrorKind::InvalidData
    );
    assert!(storage::decode("cors-json = '{}'\n[cors]\norigins = []\n").is_err());
    assert!(storage::decode("[cli]\ndate = 2026-11-01\n").is_err());
    let document = json!({"payload": {"note": "a".repeat(storage::MAX_BYTES)}});
    assert_eq!(
        storage::encode(toml_edit::DocumentMut::default(), &document).unwrap_err(),
        "runtime configuration TOML exceeds limit"
    );
}

#[tokio::test]
async fn forgefed_rule_decisions_are_scoped_and_audited_before_delivery() {
    let root = tempfile::tempdir().unwrap();
    let mut state = state(root.path());
    state.max_proxy_request_bytes = 96;
    let token = issue(&state, "");
    let claims = state.token_manager.validate_token(&token).unwrap();
    let rules = json!({"payload": {"override": [
        {"models": [{"name": "forge-*", "protocol": "forgefed", "token": claims.sub}],
            "params": {"object.metadata.score": 1}},
        {"models": [{"name": "forge-oversized"}],
            "params": {"object.content": "a".repeat(128)}}
    ]}});
    state
        .request_log
        .runtime_config()
        .unwrap()
        .edit(Edit::Replace(rules), "test")
        .unwrap();
    let app = Router::new()
        .route("/test", post(forgefed_boundary))
        .with_state((state.clone(), claims))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::request_log::log_http_exchange,
        ));
    for (model, status, phase) in [
        ("forge-test", StatusCode::OK, Some("payload_rules_applied")),
        (
            "forge-oversized",
            StatusCode::BAD_REQUEST,
            Some("payload_rules_rejected"),
        ),
        ("other", StatusCode::OK, None),
    ] {
        let input = json!({
            "model": model, "id": "activity", "object": {"content": "hello"}
        });
        let request = Request::post("/test")
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(input.to_string()))
            .unwrap();
        let response = app.clone().oneshot(request).await.unwrap();
        assert_eq!(response.status(), status);
        let correlation = response.headers()["x-router-request-id"].to_str().unwrap();
        let entries = state.request_log.lookup(correlation).unwrap();
        let recorded = entries
            .iter()
            .filter_map(|entry| entry["phase"].as_str())
            .find(|value| value.starts_with("payload_rules_"));
        assert_eq!(recorded, phase);
        let bytes = to_bytes(response.into_body(), 1024).await.unwrap();
        let body: Value = serde_json::from_slice(&bytes).unwrap();
        assert_eq!(body["id"], "activity");
        if phase.is_some() {
            assert_eq!(body["object"]["metadata"]["score"], 1);
        } else {
            assert!(body["object"].get("metadata").is_none());
        }
    }
}

async fn forgefed_boundary(
    State((state, claims)): State<(AppState, TokenClaims)>,
    headers: HeaderMap,
    axum::Json(mut body): axum::Json<Value>,
) -> (StatusCode, axum::Json<Value>) {
    let model = body["model"].as_str().unwrap().to_owned();
    let result = egress::forgefed_scope(&state, &headers, &claims, async {
        egress::forgefed(&model, &mut body)
    })
    .await;
    (
        result.map_or(StatusCode::BAD_REQUEST, |()| StatusCode::OK),
        axum::Json(body),
    )
}

#[test]
fn native_batches_apply_rules_per_model_and_reject_invalid_items() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let token = issue(&state, "");
    let claims = state.token_manager.validate_token(&token).unwrap();
    let context = egress::NativeContext::new(
        &state,
        &HeaderMap::new(),
        claims,
        "claude",
        "https://api.example/v1/messages/batches",
    );
    assert!(context.http(None, true).unwrap().is_none());
    let rules = json!({"payload": {"default-raw": [
        {"models": [{"name": "claude-a", "from-protocol": "claude"}], "params": {"max_tokens": "20"}}
    ]}});
    state
        .request_log
        .runtime_config()
        .unwrap()
        .edit(Edit::Replace(rules), "test")
        .unwrap();
    let single = Bytes::from_static(br#"{"model":"claude-a","max_tokens":5}"#);
    assert!(context.http(Some(&single), false).unwrap().is_none());
    let batch = Bytes::from_static(
        br#"{"requests":[
            {"custom_id":"one","params":{"model":"claude-a"}},
            {"custom_id":"two","params":{"model":"claude-b"}}
        ]}"#,
    );
    let bytes = context.http(Some(&batch), true).unwrap().unwrap();
    let body: Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(body["requests"][0]["params"]["max_tokens"], 20);
    assert!(body["requests"][1]["params"].get("max_tokens").is_none());
    let malformed = Bytes::from_static(br#"{"requests":[{"custom_id":"missing-params"}]}"#);
    let error = context.http(Some(&malformed), true).unwrap_err();
    assert_eq!(error, payload::FAILURE);
    context.rejected(error);
}

#[tokio::test]
async fn http_rules_preserve_zstd_and_use_models_from_bedrock_urls() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let config = state.request_log.runtime_config().unwrap();
    let rules = json!({"payload": {"override": [
        {"models": [{"name": "gpt-*", "protocol": "codex"}],
            "params": {"service_tier": "priority"}},
        {"models": [{"name": "claude-bedrock", "protocol": "bedrock"}],
            "params": {"max_tokens": 24}}
    ]}});
    config.edit(Edit::Replace(rules), "test").unwrap();
    let client = reqwest::Client::new();
    let log = &state.request_log;
    let codex = "https://upstream.example/backend-api/codex/responses";
    let body = br#"{"model":"gpt-native","input":"hello"}"#;
    let compressed = zstd::encode_all(body.as_slice(), 0).unwrap();
    let mut request = client
        .post(codex)
        .header(header::CONTENT_ENCODING, "zstd")
        .body(compressed)
        .build()
        .unwrap();
    let limit = egress::http(log, "encoded", &mut request).await.unwrap();
    assert!(limit.is_none());
    assert_eq!(request.headers()[header::CONTENT_ENCODING], "zstd");
    let bytes = request.body().and_then(reqwest::Body::as_bytes).unwrap();
    let decoded = zstd::decode_all(bytes).unwrap();
    let body: Value = serde_json::from_slice(&decoded).unwrap();
    assert_eq!(body["service_tier"], "priority");
    assert_eq!(body["input"], "hello");

    let bedrock = "https://upstream.example/model/claude-bedrock/invoke";
    let mut request = client.post(bedrock).json(&json!({})).build().unwrap();
    let limit = egress::http(log, "bedrock", &mut request).await.unwrap();
    assert!(limit.is_none());
    let bytes = request.body().and_then(reqwest::Body::as_bytes).unwrap();
    let body: Value = serde_json::from_slice(bytes).unwrap();
    assert_eq!(body, json!({"max_tokens": 24}));

    let mut no_body = client.post(bedrock).build().unwrap();
    assert!(egress::http(log, "missing", &mut no_body).await.is_err());
    let mut read = client.get(bedrock).build().unwrap();
    let limit = egress::http(log, "read", &mut read).await.unwrap();
    assert!(limit.is_none());
    let mut unknown = client
        .post("https://upstream.example/unrelated")
        .build()
        .unwrap();
    let limit = egress::http(log, "unknown", &mut unknown).await.unwrap();
    assert!(limit.is_none());
}

#[test]
fn invalid_rules_cannot_write_routing_fields_or_unresolved_query_targets() {
    let compile = |models: Value, params: Value| {
        serde_json::from_value::<payload::Payload>(json!({
            "override": [{"models": models, "params": params}]
        }))
        .unwrap()
        .compile()
    };
    let models = json!([{"name": "gpt-*-preview-*"}]);
    for (path, reason) in [
        (
            "model",
            "payload rule changes a protected routing or transport field",
        ),
        (
            "previous_response_id",
            "payload rules may only remove a continuation ID",
        ),
        ("/tools/~2", "invalid payload JSON Pointer"),
        ("tools..name", "invalid payload path"),
        ("tools.#(type==broken)", "invalid payload array selector"),
    ] {
        let result = compile(models.clone(), json!({(path): 2}));
        assert_eq!(result.unwrap_err(), reason);
    }
    assert_eq!(
        compile(json!([]), json!({"max_tokens": 2})).unwrap_err(),
        "payload rule requires at least one model selector"
    );
    assert_eq!(
        compile(models.clone(), json!({})).unwrap_err(),
        "payload rule requires at least one parameter"
    );
    let rules = compile(models, json!({"tools.#(type==\"function\").strict": true})).unwrap();
    let context = payload::Context {
        protocol: "openai",
        from_protocol: "responses",
        model: "gpt-fast-preview-01",
        token_id: None,
        token_label: None,
    };
    let mut body = json!({"tools": [{"type": "web_search"}]});
    let result = rules.apply(&mut body, &context);
    assert_eq!(result.unwrap_err(), payload::FAILURE);
    assert_eq!(body, json!({"tools": [{"type": "web_search"}]}));
    let mut body = json!({"tools": [{"type": "function"}, {"type": "function"}]});
    let other = payload::Context {
        model: "gpt-fast-stable-01",
        ..context
    };
    assert!(rules.apply(&mut body, &other).unwrap().is_empty());
    assert_eq!(rules.apply(&mut body, &context).unwrap().len(), 1);
    assert_eq!(body["tools"][0]["strict"], true);
    assert!(body["tools"][1].get("strict").is_none());
}
