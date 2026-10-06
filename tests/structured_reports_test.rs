//! Domain facts are available without interpreting the human report (#699).
use link_assistant_router::{cli, operation_context::OperationContext, operations};

async fn execute(context: &OperationContext, arguments: &[&str]) -> operations::OperationResult {
    let args = std::iter::once("router")
        .chain(arguments.iter().copied())
        .map(Into::into)
        .collect();
    let cli = context.scope(|| cli::try_parse_arguments(args)).unwrap();
    operations::execute(context.clone(), cli)
        .await
        .unwrap_or_else(|error| error.result)
}

#[tokio::test]
async fn isolated_doctor_reports_checks_providers_and_deployment_fields() {
    let root = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(root.path());
    context.set_env("TOKEN_SECRET", "structured-report-fixture-secret");
    context.set_env("STORAGE_POLICY", "text");
    let report = execute(&context, &["doctor", "--local"]).await;
    assert!(report.success, "{:?}", report.diagnostics);
    assert_eq!(report.data["status"], "healthy");
    assert!(report.data["checks"].is_array());
    assert!(report.data["providers"].is_array());
    assert!(report.data["deployments"].is_array());
    assert!(report.data["recommended_models"].is_array());
    assert!(
        !report
            .data
            .to_string()
            .contains("structured-report-fixture-secret")
    );
}

#[tokio::test]
async fn doctor_and_auth_report_provider_acceptance_and_recommendation_transitions() {
    use tokio::io::{AsyncReadExt as _, AsyncWriteExt as _};
    let root = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(root.path());
    context.set_env("TOKEN_SECRET", "structured-report-fixture-secret");
    context.set_env("STORAGE_POLICY", "text");
    let absent = execute(&context, &["doctor", "--local"]).await;
    let provider = |report: &operations::OperationResult| {
        report.data["providers"]
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["provider"] == "qwen")
            .unwrap()
            .clone()
    };
    assert_eq!(provider(&absent)["state"], "absent");
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let resource_url = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move {
        for (status, body) in [
            ("200 OK", r#"{"data":[{"id":"synthetic-exact-model"}]}"#),
            ("200 OK", r#"{"data":[{"id":"synthetic-exact-model"}]}"#),
            ("403 Forbidden", r#"{"error":"credential rejected"}"#),
            ("403 Forbidden", r#"{"error":"credential rejected"}"#),
        ] {
            let (mut socket, _) =
                tokio::time::timeout(std::time::Duration::from_secs(10), listener.accept())
                    .await
                    .unwrap()
                    .unwrap();
            let mut request = [0_u8; 4096];
            tokio::time::timeout(std::time::Duration::from_secs(3), socket.read(&mut request))
                .await
                .unwrap()
                .unwrap();
            socket
                .write_all(
                    format!(
                        "HTTP/1.1 {status}\r\ncontent-type: application/json\r\ncontent-length: {}\r\nconnection: close\r\n\r\n{body}",
                        body.len()
                    )
                    .as_bytes(),
                )
                .await
                .unwrap();
        }
    });
    let home = context.home.as_ref().unwrap().join(".qwen");
    std::fs::create_dir_all(&home).unwrap();
    std::fs::write(
        home.join("oauth_creds.json"),
        serde_json::to_vec(&serde_json::json!({
            "access_token":"synthetic-access", "refresh_token":"synthetic-refresh",
            "expiry_date":9_999_999_999_999_i64, "resource_url":resource_url
        }))
        .unwrap(),
    )
    .unwrap();
    let accepted = execute(&context, &["doctor", "--local"]).await;
    assert!(accepted.success, "{:?}", accepted.diagnostics);
    assert_eq!(provider(&accepted)["state"], "usable");
    assert_eq!(provider(&accepted)["models"][0], "synthetic-exact-model");
    assert_eq!(
        accepted.data["recommended_models"][0]["model"],
        "synthetic-exact-model"
    );
    let auth_accepted = execute(&context, &["auth", "status", "--local"]).await;
    let credential = |report: &operations::OperationResult| {
        report.data["credentials"]
            .as_array()
            .unwrap()
            .iter()
            .find(|entry| entry["provider"] == "qwen")
            .unwrap()
            .clone()
    };
    assert!(auth_accepted.success);
    assert_eq!(credential(&auth_accepted)["state"], "usable");
    let rejected = execute(&context, &["doctor", "--local"]).await;
    assert!(!rejected.success);
    assert_eq!(rejected.data["status"], "unhealthy");
    assert_eq!(provider(&rejected)["state"], "rejected");
    assert_eq!(rejected.data["recommended_models"], serde_json::json!([]));
    let auth_rejected = execute(&context, &["auth", "status", "--local"]).await;
    server.await.unwrap();
    assert_eq!(credential(&auth_rejected)["state"], "rejected");
}

#[tokio::test]
async fn absent_auth_and_client_probes_expose_their_state() {
    let root = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(root.path());
    context.set_env("TOKEN_SECRET", "structured-report-fixture-secret");
    let auth = execute(&context, &["auth", "status", "--local"]).await;
    assert!(auth.success, "{:?}", auth.diagnostics);
    let providers = auth.data["credentials"].as_array().unwrap();
    assert!(!providers.is_empty());
    assert!(providers.iter().all(|entry| entry["state"] == "absent"));
    let client = execute(&context, &["clients", "doctor", "codex"]).await;
    assert!(!client.success);
    assert_eq!(client.data["client"]["configured"], false);
    assert_eq!(client.data["reachable"], false);
}

#[tokio::test]
async fn log_records_are_filtered_and_decoded_in_the_payload() {
    let root = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(root.path());
    context.set_env("TOKEN_SECRET", "structured-report-fixture-secret");
    let log = context.data_dir.as_ref().unwrap().join("requests/fixture");
    std::fs::create_dir_all(&log).unwrap();
    std::fs::write(
        log.join("requests.jsonl"),
        concat!(
            "{\"correlation_id\":\"chosen\",\"event\":\"response\",\"status\":201}\n",
            "{\"correlation_id\":\"other\",\"event\":\"response\",\"status\":500}\n"
        ),
    )
    .unwrap();
    let report = execute(&context, &["logs", "show", "chosen"]).await;
    assert!(report.success, "{:?}", report.diagnostics);
    let records = report.data["records"].as_array().unwrap();
    assert_eq!(records.len(), 1);
    assert_eq!(records[0]["status"], 201);
    assert_eq!(records[0]["correlation_id"], "chosen");
}

#[tokio::test]
async fn deployment_discovery_and_server_selection_report_state_changes() {
    use link_assistant_router::{deploy::registry, operation_reports};
    let root = tempfile::tempdir().unwrap();
    let mut context = OperationContext::isolated(root.path());
    context.set_env("TOKEN_SECRET", "structured-report-fixture-secret");
    let deployment = root.path().join("registered");
    context
        .scope(|| {
            registry::register(
                &registry::path(context.data_dir.as_ref().unwrap()),
                registry::Entry {
                    root: deployment.clone(),
                    mode: "host".into(),
                    port: 18080,
                    instance: Some("fixture".into()),
                    registered_at: 123,
                },
            )
        })
        .unwrap();
    let cli::Command::Doctor { target } = context
        .scope(|| {
            cli::try_parse_arguments(vec!["router".into(), "doctor".into(), "--local".into()])
        })
        .unwrap()
        .command
        .unwrap()
    else {
        panic!("doctor");
    };
    let before = operation_reports::doctor(context.clone(), target)
        .await
        .unwrap();
    assert_eq!(before.data.deployments.len(), 1);
    assert!(!before.data.deployments[0].present);
    std::fs::create_dir_all(deployment.join("data")).unwrap();
    let after = execute(&context, &["doctor", "--local"]).await;
    assert_eq!(after.data["deployments"][0]["present"], true);
    context.set_env("ROUTER_URL", "http://127.0.0.1:12345");
    let selected = operation_reports::server_status(context.clone())
        .await
        .unwrap();
    assert_eq!(selected.data.selection.source, "environment");
    assert_eq!(
        selected.data.selection.url.as_deref(),
        Some("http://127.0.0.1:12345")
    );
    context.set_env("ROUTER_URL", "http://127.0.0.1:12346");
    let changed = operation_reports::server_status(context).await.unwrap();
    assert_eq!(
        changed.data.selection.url.as_deref(),
        Some("http://127.0.0.1:12346")
    );
}

#[test]
fn inventories_validate_success_schema_and_operation_before_decoding() {
    use serde_json::json;
    let decode = operations::decode_token_inventory;
    assert!(decode(b"[]").unwrap().is_empty());
    let legacy = br#"[{"id":"fixture","label":"laptop","issued_at":1,"expires_at":9999999999,"revoked":false,"client_kind":"codex","principal_id":"primary"}]"#;
    let records = decode(legacy).unwrap();
    assert_eq!(records[0].label, "laptop");
    assert_eq!(records[0].client_kind.as_deref(), Some("codex"));
    let valid = json!({"schema":"link-assistant-router/tokens-list/v1", "operation":"tokens.list",
        "success":true,"exit_code":0,"data":[],"diagnostics":[]});
    assert!(
        decode(&serde_json::to_vec(&valid).unwrap())
            .unwrap()
            .is_empty()
    );
    let mut populated = valid.clone();
    populated["data"] = serde_json::to_value(&records).unwrap();
    assert_eq!(
        decode(&serde_json::to_vec(&populated).unwrap()).unwrap(),
        records
    );
    for (field, value) in [
        ("operation", json!("accounts.list")),
        ("schema", json!("link-assistant-router/tokens-list/v9")),
        ("success", json!(false)),
        ("exit_code", json!(7)),
        ("data", json!({"output":[]})),
    ] {
        let mut invalid = valid.clone();
        invalid[field] = value;
        assert!(
            decode(&serde_json::to_vec(&invalid).unwrap()).is_err(),
            "accepted {invalid}"
        );
    }
    assert!(decode(b"{broken").is_err());
}
