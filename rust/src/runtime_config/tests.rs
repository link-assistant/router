use std::net::SocketAddr;

use axum::Router;
use axum::body::{Body, to_bytes};
use axum::extract::ConnectInfo;
use axum::http::{Request, StatusCode, header};
use serde_json::{Value, json};
use tower::ServiceExt as _;

use super::{payload, redaction, schema, storage};
use crate::app_state::AppState;
use crate::token::{ADMIN_SCOPE, CONFIG_WRITE_SCOPE, IssueRequest};

#[path = "boundary_tests.rs"]
mod boundaries;

const ROOT: &str = "/api/management/config";

fn cli(root: &std::path::Path, extra: &[&str]) -> crate::cli::Cli {
    let mut args = vec![
        "router".into(),
        "--data-dir".into(),
        root.as_os_str().into(),
        "--token-secret".into(),
        "runtime-config-test-signing-fixture".into(),
    ];
    args.extend(extra.iter().copied().map(std::ffi::OsString::from));
    crate::cli::try_parse_arguments(args).expect("valid runtime configuration")
}

fn state(root: &std::path::Path) -> AppState {
    let mut state = AppState::for_tests(root);
    state.admin_key = Some("runtime-test-admin-key".into());
    state
        .request_log
        .install_runtime_config(cli(root, &[]).runtime_config.unwrap());
    state
}

fn issue(state: &AppState, scope: &str) -> String {
    state
        .token_manager
        .issue(&IssueRequest {
            label: "test-runtime-operator",
            ttl_hours: 1,
            scope,
            ..IssueRequest::default()
        })
        .unwrap()
}

async fn call(
    app: &Router,
    method: &str,
    path: &str,
    token: &str,
    value: Option<Value>,
) -> (StatusCode, Value) {
    let mut request = Request::builder()
        .method(method)
        .uri(path)
        .header(header::AUTHORIZATION, format!("Bearer {token}"))
        .extension(ConnectInfo(SocketAddr::from(([127, 0, 0, 1], 25000))));
    if value.is_some() {
        request = request.header(
            header::CONTENT_TYPE,
            if method == "PATCH" {
                "application/merge-patch+json"
            } else {
                "application/json"
            },
        );
    }
    let request = request
        .body(value.map_or_else(Body::empty, |value| Body::from(value.to_string())))
        .unwrap();
    let response = app.clone().oneshot(request).await.unwrap();
    let status = response.status();
    let bytes = to_bytes(response.into_body(), storage::MAX_BYTES * 2)
        .await
        .unwrap();
    (status, serde_json::from_slice(&bytes).unwrap())
}

#[test]
fn schema_tracks_clap_and_toml_round_trips_edits() {
    let root = tempfile::tempdir().unwrap();
    let path = root.path().join("runtime.toml");
    let original = "# operator note\n[cli]\nport = 9081 # chosen service port\nverbose = true\n";
    std::fs::write(&path, original).unwrap();
    let parsed = cli(root.path(), &["--port", "9082"]);
    assert_eq!(parsed.port, 9082);
    assert!(parsed.verbose);
    let store = parsed.runtime_config.unwrap();
    assert_eq!(store.status()["overridden"], json!(["port"]));
    let (toml, mut document) = storage::decode(original).unwrap();
    assert!(
        jsonschema::validator_for(schema())
            .unwrap()
            .is_valid(&document)
    );
    document["cli"]["port"] = json!(9083);
    document["payload"] = json!({
        "override": [{"models": [{"name": "*"}], "params": {"empty": null}}]
    });
    let edited = storage::encode(toml, &document).unwrap();
    assert!(edited.contains("# operator note"));
    assert!(edited.contains("port = 9083 # chosen service port"));
    assert_eq!(storage::decode(&edited).unwrap().1, document);
}

#[test]
fn removing_a_rule_keeps_comments_on_surviving_toml_tables() {
    let original = r#"
[[payload.filter]]
models = [{ name = "*" }]
params = ["remove"] # deleted rule

[[payload.filter]]
models = [{ name = "*" }]
params = ["keep"] # surviving rule
"#;
    let (toml, mut document) = storage::decode(original).unwrap();
    document["payload"]["filter"]
        .as_array_mut()
        .unwrap()
        .remove(0);
    let edited = storage::encode(toml, &document).unwrap();
    assert!(edited.contains("# surviving rule"));
    assert!(!edited.contains("# deleted rule"));
    assert_eq!(storage::decode(&edited).unwrap().1, document);
}

#[test]
fn every_clap_secret_and_nested_payload_secret_is_redacted() {
    let options = schema()["properties"]["cli"]["properties"]
        .as_object()
        .unwrap();
    let secrets = options
        .iter()
        .filter(|(_, schema)| schema["writeOnly"] == true)
        .map(|(key, _)| (key.clone(), json!("secret-test-fixture")))
        .collect::<serde_json::Map<_, _>>();
    assert!(secrets.contains_key("token-secret"));
    assert!(secrets.contains_key("admin-key"));
    let document = json!({
        "cli": secrets,
        "payload": {
            "override-raw": [{
                "params": {
                    "metadata": "{\"access_token\":\"secret-test-fixture\"}",
                    "/headers/authorization": "secret-test-fixture",
                    "upstream": "https://user:secret-test-fixture@example.test",
                    "context": "at-eyJhbGci.encoded_payload.signature-secret-test-fixture",
                    "max_tokens": "200"
                }
            }]
        }
    });
    let rendered = redaction::view(&document);
    assert!(!rendered.to_string().contains("secret-test-fixture"));
    assert_eq!(
        rendered["payload"]["override-raw"][0]["params"]["max_tokens"],
        "200"
    );
    assert!(
        !redaction::diff(&json!({}), &document)
            .to_string()
            .contains("secret-test-fixture")
    );
}

#[tokio::test]
async fn writer_is_scoped_and_can_replace_merge_and_edit_pointers() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let admin = issue(&state, ADMIN_SCOPE);
    let writer = issue(&state, CONFIG_WRITE_SCOPE);
    let app = crate::admin_api::router(state.clone());
    assert_eq!(
        call(&app, "PUT", ROOT, &admin, Some(json!({}))).await.0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        call(
            &app,
            "POST",
            &format!("{ROOT}/reload"),
            "runtime-test-admin-key",
            None
        )
        .await
        .0,
        StatusCode::FORBIDDEN
    );
    assert_eq!(
        call(&app, "GET", "/api/management/tokens", &writer, None)
            .await
            .0,
        StatusCode::UNAUTHORIZED
    );
    assert!(
        state
            .token_manager
            .authenticate_incoming(&writer, &axum::http::HeaderMap::new())
            .is_err()
    );

    let document = json!({
        "cli": {"port": 9084, "verbose": true},
        "cors": {"origins": ["https://first.example", "https://second.example"]},
        "payload": {"override": [{"models": [{"name": "*"}], "params": {"metadata.a/b": 1}}]}
    });
    assert_eq!(
        call(&app, "PUT", ROOT, &writer, Some(document)).await.0,
        StatusCode::OK
    );
    let patch = json!({"cli": {"verbose": null}, "cors": {"origins": ["https://third.example"]}});
    let (status, update) = call(&app, "PATCH", ROOT, &writer, Some(patch)).await;
    assert_eq!(status, StatusCode::OK);
    assert_eq!(update["restart_required"], json!(["port"]));

    let pointer = format!("{ROOT}/payload/override/0/params/metadata.a~1b");
    assert_eq!(
        call(&app, "GET", &pointer, &admin, None).await,
        (StatusCode::OK, json!(1))
    );
    assert_eq!(
        call(&app, "PUT", &pointer, &writer, Some(json!(2))).await.0,
        StatusCode::OK
    );
    assert_eq!(call(&app, "GET", &pointer, &admin, None).await.1, 2);
    let list_item = format!("{ROOT}/cors/origins/0");
    assert_eq!(
        call(&app, "DELETE", &list_item, &writer, None).await.0,
        StatusCode::OK
    );
    let document = call(&app, "GET", ROOT, &admin, None).await.1;
    assert_eq!(document["cors"]["origins"], json!([]));
    assert!(document["cli"].get("verbose").is_none());

    let forbidden = json!({"cli": {"allow-subscription-bridge": ["codex:claude"]}});
    assert_eq!(
        call(&app, "PATCH", ROOT, &writer, Some(forbidden)).await.0,
        StatusCode::BAD_REQUEST
    );
    let trust = json!({"cli": {"token-secret": "another-signing-key"}});
    assert_eq!(
        call(&app, "PATCH", ROOT, &writer, Some(trust)).await.0,
        StatusCode::BAD_REQUEST
    );
    let destination = json!({"cli": {"upstream-base-url": "https://another-provider.example"}});
    assert_eq!(
        call(&app, "PATCH", ROOT, &writer, Some(destination))
            .await
            .0,
        StatusCode::BAD_REQUEST
    );
    let audit = std::fs::read_to_string(root.path().join("runtime-config-audit.jsonl")).unwrap();
    assert!(audit.contains("\"action\":\"put_pointer\""));
    assert!(audit.contains("\"port\""));
    assert!(!audit.contains(&writer));
    let id = state.token_manager.validate_token(&writer).unwrap().sub;
    state.token_manager.revoke_token(&id).unwrap();
    assert_eq!(
        call(&app, "PATCH", ROOT, &writer, Some(json!({}))).await.0,
        StatusCode::UNAUTHORIZED
    );
}

#[tokio::test]
async fn watcher_and_explicit_reload_activate_cors_and_keep_the_last_valid_snapshot() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let store = state.request_log.runtime_config().unwrap();
    let app = crate::admin_api::router(state.clone());
    let writer = issue(&state, CONFIG_WRITE_SCOPE);
    let path = root.path().join("runtime.toml");
    std::fs::write(
        &path,
        "[cli]\nport = 9089\n[cors]\norigins = ['https://console.example']\nmethods = ['PATCH']\nheaders = ['authorization']\ncredentials = true\n",
    )
    .unwrap();
    store.watch();
    tokio::time::timeout(std::time::Duration::from_secs(5), async {
        while store.cors().is_none() {
            tokio::time::sleep(std::time::Duration::from_millis(20)).await;
        }
    })
    .await
    .expect("the watcher loaded CORS");
    let reload = format!("{ROOT}/reload");
    assert_eq!(
        call(&app, "POST", &reload, &writer, None).await.1["restart_required"],
        json!(["port"])
    );
    std::fs::write(&path, "[cors]\norigins = ['*']\ncredentials = true\n").unwrap();
    assert_eq!(
        call(&app, "POST", &reload, &writer, None).await.0,
        StatusCode::CONFLICT
    );
    let preflight = Request::builder()
        .method("OPTIONS")
        .uri(ROOT)
        .header(header::ORIGIN, "https://console.example")
        .header(header::ACCESS_CONTROL_REQUEST_METHOD, "PATCH")
        .header(header::ACCESS_CONTROL_REQUEST_HEADERS, "authorization")
        .body(Body::empty())
        .unwrap();
    let response = app.oneshot(preflight).await.unwrap();
    assert!(response.status().is_success());
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_ORIGIN],
        "https://console.example"
    );
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_METHODS],
        "PATCH"
    );
    assert_eq!(
        response.headers()[header::ACCESS_CONTROL_ALLOW_CREDENTIALS],
        "true"
    );
}

#[tokio::test]
async fn http_final_barrier_records_final_values_and_rejects_before_any_send() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let store = state.request_log.runtime_config().unwrap();
    let document = json!({
        "payload": {
            "override": [{"models": [{"name": "claude-*", "protocol": "claude"}], "params": {"temperature": 0.1}}],
            "override-raw": [{"models": [{"name": "*"}], "params": {"max_tokens": "200"}}],
            "filter": [{"models": [{"name": "*", "exist": ["system"]}],
                "params": ["system", "messages.0", "tools.#(type==\"image_generation\")#"]}]
        }
    });
    store.edit(super::Edit::Replace(document), "test").unwrap();
    let upstream = Router::new().route(
        "/v1/messages",
        axum::routing::post(
            |axum::Json(value): axum::Json<Value>| async move { axum::Json(value) },
        ),
    );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });
    let client = reqwest::Client::new();
    let url = format!("http://{address}/v1/messages");
    let send = |id: &'static str, body: Value| {
        state
            .request_log
            .send_upstream(id, &client, client.post(&url).json(&body))
    };
    let body = json!({
        "model": "claude-opus", "system": "late injection",
        "messages": ["first", "second", "third"],
        "tools": [{"type": "image_generation"}, {"type": "function"}, {"type": "image_generation"}]
    });
    let final_body: Value = send("barrier-success", body)
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(final_body["temperature"], 0.1);
    assert_eq!(final_body["max_tokens"], 200);
    assert_eq!(final_body["messages"], json!(["second", "third"]));
    assert_eq!(final_body["tools"], json!([{"type": "function"}]));
    assert!(final_body.get("system").is_none());
    let admin = issue(&state, ADMIN_SCOPE);
    let management = crate::admin_api::router(state.clone());
    let (status, evidence) = call(
        &management,
        "GET",
        "/api/management/logs/requests/barrier-success",
        &admin,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let evidence = evidence["records"]
        .as_array()
        .unwrap()
        .iter()
        .find(|record| record["phase"] == "payload_rules_applied")
        .unwrap();
    assert!(
        evidence["changes"]
            .as_array()
            .unwrap()
            .iter()
            .any(|change| { change["path"] == "/max_tokens" && change["value"] == 200 })
    );
    let error = send(
        "barrier-failure",
        json!({"model": "claude-opus", "top_p": 0.5}),
    )
    .await
    .unwrap_err();
    assert!(matches!(
        error,
        crate::upstream_client::UpstreamSendError::PayloadRule(_)
    ));
    let (status, evidence) = call(
        &management,
        "GET",
        "/api/management/logs/requests/barrier-failure",
        &admin,
        None,
    )
    .await;
    assert_eq!(status, StatusCode::OK);
    let records = evidence["records"].as_array().unwrap();
    assert!(
        records
            .iter()
            .any(|record| record["phase"] == "payload_rules_rejected")
    );
    assert!(
        records
            .iter()
            .all(|record| record["phase"] != "upstream_request")
    );
    server.abort();
}

#[tokio::test]
async fn native_codex_request_records_scoped_rules_and_enforces_the_output_cap() {
    let root = tempfile::tempdir().unwrap();
    let codex_home = tempfile::tempdir().unwrap();
    std::fs::write(
        codex_home.path().join("auth.json"),
        r#"{"tokens":{"access_token":"codex-upstream","account_id":"account-42"}}"#,
    )
    .unwrap();
    let reader = crate::subscription::SubscriptionReader::new(
        crate::subscription::SubscriptionProvider::Codex,
        codex_home.path(),
    );
    let mut state = state(root.path());
    state.upstream_provider = crate::config::UpstreamProvider::Codex;
    state.subscription_reader = Some(reader.clone());
    state.subscription_readers = vec![reader];

    let captured = std::sync::Arc::new(std::sync::Mutex::new(Vec::new()));
    let upstream_captured = captured.clone();
    let upstream = Router::new().fallback(move |axum::Json(body): axum::Json<Value>| {
        let captured = upstream_captured.clone();
        async move {
            captured.lock().unwrap().push(body);
            axum::Json(json!({
                "id": "resp_fixture",
                "model": "gpt-live",
                "status": "completed",
                "output": [{"type": "message", "role": "assistant",
                    "content": [{"type": "output_text", "text": "0123456789"}]}]
            }))
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    state.subscription_base_url = Some(format!("http://{}", listener.local_addr().unwrap()));
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });
    let issue_token = || {
        crate::model_routing::tests::bound_client_token(
            &state,
            crate::clients::ClientKind::Codex,
            None,
        )
    };
    let scoped_token = issue_token();
    let unscoped_token = issue_token();
    let scoped_id = state
        .token_manager
        .validate_token(&scoped_token)
        .unwrap()
        .sub;
    state
        .request_log
        .runtime_config()
        .unwrap()
        .edit(
            super::Edit::Replace(json!({
                "payload": {"override": [{
                    "models": [{"name": "gpt-live", "protocol": "codex", "token": scoped_id}],
                    "params": {"temperature": 0.1, "max_output_tokens": 1}
                }]}
            })),
            "test",
        )
        .unwrap();
    let path = "/api/services/codex/v1/responses";
    let app = Router::new()
        .route(
            path,
            axum::routing::post(crate::proxy::openai_responses_route),
        )
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            super::egress::scope,
        ))
        .layer(axum::middleware::from_fn_with_state(
            state.clone(),
            crate::request_log::log_http_exchange,
        ))
        .with_state(state.clone());
    for (token, scoped) in [(scoped_token, true), (unscoped_token, false)] {
        let request = Request::post(path)
            .header(header::AUTHORIZATION, format!("Bearer {token}"))
            .header(header::USER_AGENT, "codex_exec/0.154.0")
            .header("originator", "codex_exec")
            .header("x-codex-turn-metadata", "fixture-turn")
            .header(header::CONTENT_TYPE, "application/json")
            .body(Body::from(
                json!({"model": "gpt-live", "input": "hi", "store": false}).to_string(),
            ))
            .unwrap();
        let response = app.clone().oneshot(request).await.unwrap();
        let correlation = response.headers()["x-router-request-id"]
            .to_str()
            .unwrap()
            .to_owned();
        let status = response.status();
        let bytes = to_bytes(response.into_body(), 16_384).await.unwrap();
        assert_eq!(
            status,
            StatusCode::OK,
            "{}",
            String::from_utf8_lossy(&bytes)
        );
        let body: Value = serde_json::from_slice(&bytes).unwrap();
        let text = body.pointer("/output/0/content/0/text").unwrap();
        let entries = state.request_log.lookup(&correlation).unwrap();
        let applied = entries
            .iter()
            .find(|row| row["phase"] == "payload_rules_applied");
        if scoped {
            assert_eq!(text, "0123");
            assert_eq!(body["status"], "incomplete");
            assert_eq!(body["incomplete_details"]["reason"], "max_output_tokens");
            assert_eq!(
                applied.unwrap()["changes"],
                json!([
                    {"path": "/max_output_tokens", "stage": "override", "value": 1},
                    {"path": "/temperature", "stage": "override", "value": 0.1}
                ])
            );
        } else {
            assert_eq!(text, "0123456789");
            assert!(applied.is_none());
        }
    }
    {
        let captured = captured.lock().unwrap();
        assert_eq!(captured.len(), 2);
        assert_eq!(captured[0]["temperature"], 0.1);
        assert!(captured[0].get("max_output_tokens").is_none());
        assert!(captured[1].get("temperature").is_none());
    }
    server.abort();
}

#[tokio::test]
async fn canonical_codex_refuses_sampling_and_uses_a_local_websocket_cap() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let store = state.request_log.runtime_config().unwrap();
    let model = json!([{"name": "gpt-live", "protocol": "codex"}]);
    let rules = |params: Value| {
        super::Edit::Replace(json!({
            "payload": {"override": [{"models": model, "params": params}]}
        }))
    };
    store
        .edit(
            rules(json!({"temperature": 0.1, "max_output_tokens": 1})),
            "test",
        )
        .unwrap();
    let url = "https://chatgpt.com/backend-api/codex/responses";
    let mut request = reqwest::Client::new()
        .post(url)
        .json(&json!({"model": "gpt-live", "input": "hi"}))
        .build()
        .unwrap();
    let outcome = super::egress::destination(
        "codex",
        None,
        super::egress::http(&state.request_log, "official-codex", &mut request),
    )
    .await;
    assert!(
        matches!(outcome, Err(crate::upstream_client::UpstreamSendError::PayloadRule(reason))
            if reason.contains("does not support configured sampling"))
    );

    let token = issue(&state, ADMIN_SCOPE);
    let claims = state.token_manager.validate_token(&token).unwrap();
    let headers = axum::http::HeaderMap::new();
    let websocket = |body: &mut Value| {
        super::egress::websocket(
            &state,
            "codex-socket",
            &headers,
            &claims,
            crate::config::UpstreamProvider::Codex,
            "wss://chatgpt.com/backend-api/codex/responses",
            body,
        )
    };
    let create = json!({"type": "response.create", "model": "gpt-live", "input": "hi"});
    assert!(websocket(&mut create.clone()).is_err());
    store
        .edit(rules(json!({"max_output_tokens": 1})), "test")
        .unwrap();
    let mut upstream = create.clone();
    assert_eq!(websocket(&mut upstream), Ok((true, Some(1))));
    assert_eq!(upstream, create);
}

#[tokio::test]
async fn rebuilt_attempts_and_url_selected_models_share_the_final_barrier() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let store = state.request_log.runtime_config().unwrap();
    store
        .edit(
            super::Edit::Replace(json!({
                "payload": {
                    "override": [
                        {"models": [{"name": "gemini-*", "protocol": "gemini"}],
                         "params": {"generationConfig.temperature": 0.1}},
                        {"models": [{"name": "gpt-*", "protocol": "codex"}],
                         "params": {"service_tier": "priority"}}
                    ],
                    "filter": [{"models": [{"name": "*", "protocol": "codex"}],
                        "params": ["tools.#(type==\"image_generation\")#", "previous_response_id"]}]
                }
            })),
            "test",
        )
        .unwrap();

    let upstream = Router::new()
        .fallback(|axum::Json(value): axum::Json<Value>| async move { axum::Json(value) });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, upstream).await.unwrap() });
    let client = reqwest::Client::new();
    let send = |id: &'static str, path: &str, body: &Value| {
        state.request_log.send_upstream(
            id,
            &client,
            client.post(format!("http://{address}{path}")).json(body),
        )
    };
    let original = json!({
        "model": "gpt-example", "service_tier": "auto",
        "previous_response_id": "resp_previous",
        "tools": [{"type": "function"}, {"type": "image_generation"}]
    });
    for id in ["codex-first", "codex-rebuilt"] {
        let received: Value = send(id, "/backend-api/codex/responses", &original)
            .await
            .unwrap()
            .json()
            .await
            .unwrap();
        assert_eq!(received["service_tier"], "priority");
        assert_eq!(received["tools"], json!([{"type": "function"}]));
        assert!(received.get("previous_response_id").is_none());
        let entries = state.request_log.lookup(id).unwrap();
        let applied = entries
            .iter()
            .find(|row| row["phase"] == "payload_rules_applied")
            .unwrap();
        assert_eq!(applied["changes"].as_array().unwrap().len(), 3);
    }
    let body = json!({"contents": [], "generationConfig": {}});
    let gemini: Value = send(
        "gemini",
        "/v1beta/models/gemini-test:generateContent",
        &body,
    )
    .await
    .unwrap()
    .json()
    .await
    .unwrap();
    assert_eq!(gemini["generationConfig"]["temperature"], 0.1);
    assert!(gemini.get("service_tier").is_none());
    let openai: Value = send("openai", "/v1/responses", &original)
        .await
        .unwrap()
        .json()
        .await
        .unwrap();
    assert_eq!(openai, original);
    server.abort();
}

#[test]
fn conditions_and_token_scopes_use_the_destination_payload() {
    let rules = serde_json::from_value::<payload::Payload>(json!({
        "default": [{"models": [{"name": "*"}], "params": {"metadata.score": 1}}],
        "override": [{
            "models": [{"name": "gpt-*", "protocol": "codex", "token": "resume-app",
                "match": [{"metadata.score": 1}], "not-match": [{"metadata.mode": "off"}],
                "exist": ["input"], "not-exist": ["disabled"]}],
            "params": {"metadata.score": 2}
        }]
    }))
    .unwrap()
    .compile()
    .unwrap();
    let context = payload::Context {
        protocol: "codex",
        from_protocol: "responses",
        model: "gpt-test",
        token_id: Some("token-id"),
        token_label: Some("resume-app"),
    };
    let mut body = json!({"input": [], "metadata": {}});
    assert_eq!(rules.apply(&mut body, &context).unwrap().len(), 2);
    assert_eq!(body["metadata"]["score"], 2);
    let mut body = json!({"input": [], "metadata": {}});
    let other = payload::Context {
        token_label: Some("other"),
        ..context
    };
    assert_eq!(rules.apply(&mut body, &other).unwrap().len(), 1);
    assert_eq!(body["metadata"]["score"], 1);
}

#[test]
fn native_realtime_rules_use_the_connection_model_for_implicit_turns() {
    let root = tempfile::tempdir().unwrap();
    let state = state(root.path());
    let store = state.request_log.runtime_config().unwrap();
    let document = json!({
        "payload": {
            "override": [{"models": [{"name": "gpt-realtime", "protocol": "openai"}],
                "params": {"response.max_output_tokens": 24}}]
        }
    });
    store.edit(super::Edit::Replace(document), "test").unwrap();
    let token = issue(&state, "");
    let claims = state.token_manager.validate_token(&token).unwrap();
    let context = super::egress::NativeContext::new(
        &state,
        &axum::http::HeaderMap::new(),
        claims,
        "openai",
        "https://api.example/v1/realtime?model=gpt-realtime",
    );
    let event = br#"{"type":"response.create","response":{}}"#;
    let bytes = context.realtime(event).unwrap().unwrap();
    let changed = serde_json::from_slice::<Value>(&bytes).unwrap();
    assert_eq!(changed["response"]["max_output_tokens"], 24);

    let explicit = br#"{"type":"response.create","response":{"model":"other"}}"#;
    assert!(context.realtime(explicit).unwrap().is_none());
}
