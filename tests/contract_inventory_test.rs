//! Publication cannot omit a command, method, route or schema.
use link_assistant_router::contracts;
use serde_json::Value;

#[test]
fn existing_public_enum_discriminants_remain_stable() {
    use clap::Subcommand as _;
    use link_assistant_router::accounts::SelectionStrategy;
    use link_assistant_router::route_contract::RouteId;
    assert_eq!(SelectionStrategy::Priority as isize, 1);
    assert_eq!(SelectionStrategy::LeastUsed as isize, 2);
    assert_eq!(RouteId::CredentialStatus as isize, 19);
    assert_eq!(RouteId::NativeCodexBackend as isize, 93);
    let account_commands =
        link_assistant_router::cli::AccountOp::augment_subcommands(clap::Command::new("accounts"));
    let existing_names: Vec<_> = account_commands
        .get_subcommands()
        .take(3)
        .map(clap::Command::get_name)
        .collect();
    assert_eq!(existing_names, ["list", "pause", "resume"]);
}

#[test]
fn published_catalog_matches_the_rust_inventory() {
    let published: Value =
        serde_json::from_str(include_str!("../schemas/operation-catalog.v1.json")).unwrap();
    assert_eq!(published, contracts::document());
    for operation in contracts::operations() {
        let name = operation["name"].as_str().unwrap();
        let schema =
            std::fs::read_to_string(format!("schemas/{}.v1.json", name.replace('.', "-"))).unwrap();
        let schema: Value = serde_json::from_str(&schema).unwrap();
        jsonschema::draft202012::new(&schema).unwrap();
        let document = serde_json::json!({"schema":operation["schema"],"operation":name,"success":false,"exit_code":1,"data":{"output":[]},"diagnostics":["fixture failure"]});
        contracts::validation::operation(name, &document).unwrap();
        let mut unexpected = document;
        unexpected["undocumented"] = true.into();
        assert!(
            contracts::validation::operation(name, &unexpected).is_err(),
            "{name}"
        );
    }
}

#[test]
fn openapi_covers_every_served_route_and_method() {
    let spec: Value = serde_json::from_str(include_str!("../openapi/router.yaml")).unwrap();
    assert_eq!(spec["openapi"], "3.1.0");
    let mut expected = std::collections::BTreeSet::new();
    expected.insert(("/".to_owned(), "get".to_owned()));
    expected.insert(("/".to_owned(), "head".to_owned()));
    for route in contracts::routes() {
        let path = route["path"].as_str().unwrap().replace("{*", "{");
        let methods = if route["method"] == "ANY" {
            vec![
                "get", "post", "put", "patch", "delete", "options", "head", "trace",
            ]
        } else if route["method"] == "GET" {
            vec!["get", "head"]
        } else {
            vec![]
        };
        let method = route["method"].as_str().unwrap().to_lowercase();
        for method in if methods.is_empty() {
            vec![method.as_str()]
        } else {
            methods
        } {
            assert_eq!(spec["paths"][&path][method]["x-router-route"], route);
            expected.insert((path.clone(), method.to_owned()));
        }
    }
    let actual: std::collections::BTreeSet<_> = spec["paths"]
        .as_object()
        .unwrap()
        .iter()
        .flat_map(|(path, methods)| {
            methods
                .as_object()
                .unwrap()
                .keys()
                .map(move |method| (path.clone(), method.clone()))
        })
        .collect();
    assert_eq!(actual, expected);
}

#[tokio::test]
async fn native_axum_methods_are_published_and_validated() {
    use axum::{
        Router,
        body::Body,
        http::{Method, Request, StatusCode},
        routing::{any, get},
    };
    use tower::ServiceExt;

    let wildcard = contracts::routes()
        .into_iter()
        .find(|route| route["method"] == "ANY")
        .unwrap();
    let path = wildcard["path"].as_str().unwrap().replace("{*", "{");
    let concrete = path.split('{').next().unwrap().to_owned() + "fixture";
    let app = Router::new()
        .route(
            "/api/management/tokens",
            get(|| async { axum::Json(serde_json::json!({"data":[]})) }),
        )
        .route(
            wildcard["path"].as_str().unwrap(),
            any(|| async { axum::Json(serde_json::json!({"fixture":true})) }),
        )
        .layer(axum::middleware::from_fn(
            contracts::validation::response_contract,
        ));
    let head = app
        .clone()
        .oneshot(
            Request::builder()
                .method(Method::HEAD)
                .uri("/api/management/tokens")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(head.status(), StatusCode::OK);
    assert!(
        axum::body::to_bytes(head.into_body(), 1024)
            .await
            .unwrap()
            .is_empty()
    );

    let spec: Value = serde_json::from_str(include_str!("../openapi/router.yaml")).unwrap();
    assert!(spec["paths"]["/api/health"]["head"].is_object());
    assert!(
        link_assistant_router::route_contract::route_for_path(&Method::HEAD, "/api/health")
            .is_some()
    );
    for method in [
        Method::TRACE,
        Method::CONNECT,
        Method::from_bytes(b"PROPFIND").unwrap(),
    ] {
        let response = app
            .clone()
            .oneshot(
                Request::builder()
                    .method(method.clone())
                    .uri(&concrete)
                    .body(Body::empty())
                    .unwrap(),
            )
            .await
            .unwrap();
        assert_eq!(response.status(), StatusCode::OK);
        let bytes = axum::body::to_bytes(response.into_body(), 1024)
            .await
            .unwrap();
        if method == Method::CONNECT {
            assert!(bytes.is_empty());
            assert!(
                contracts::validation::http(&method, &concrete, 200, &serde_json::json!({}))
                    .is_err()
            );
        } else {
            let document: Value = serde_json::from_slice(&bytes).unwrap();
            contracts::validation::http(&method, &concrete, 200, &document).unwrap();
        }
        let error = serde_json::json!({"message":"missing token"});
        contracts::validation::http(&method, &concrete, 401, &error).unwrap();
    }
}

#[test]
fn native_model_and_error_envelopes_match_the_served_protocols() {
    use axum::http::Method;
    for path in [
        "/api/services/codex/v1/models",
        "/api/services/gemini/v1beta/models",
    ] {
        let native = serde_json::json!({"models": []});
        contracts::validation::http(&Method::GET, path, 200, &native).unwrap();
        let undocumented = serde_json::json!({"models": [], "undocumented": true});
        assert!(contracts::validation::http(&Method::GET, path, 200, &undocumented).is_err());
    }
    let authentication = serde_json::json!({
        "type": "error", "error": {"type": "authentication_error", "message": "missing token"}
    });
    contracts::validation::http(
        &Method::GET,
        "/api/services/openai/v1/models",
        401,
        &authentication,
    )
    .unwrap();
    let fixture: Value = serde_json::from_str(include_str!(
        "fixtures/vendor/anthropic/error-500-api-error.json"
    ))
    .unwrap();
    for path in [
        "/api/services/anthropic/v1/messages",
        "/api/services/openai/v1/chat/completions",
    ] {
        contracts::validation::http(&Method::POST, path, 500, &fixture["response"]["json"])
            .unwrap();
    }
}

#[test]
fn aggregate_catalog_publishes_thinking_without_accepting_unknown_fields() {
    use axum::http::Method;
    let mut catalog = serde_json::json!({"data":[{
        "id":"exact-model", "service":"claude", "owned_by":"anthropic",
        "capability_provenance":{},
        "thinking":{"supported":true,"min_budget_tokens":1024,"max_budget_tokens":8192}
    }]});
    contracts::validation::http(&Method::GET, "/api/models", 200, &catalog).unwrap();
    catalog["data"][0]["undocumented"] = true.into();
    assert!(contracts::validation::http(&Method::GET, "/api/models", 200, &catalog).is_err());
}
