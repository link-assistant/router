//! Publication cannot omit a command, method, route or schema.
use link_assistant_router::contracts;
use serde_json::Value;

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
    for route in contracts::routes() {
        let path = route["path"].as_str().unwrap().replace("{*", "{");
        let methods = if route["method"] == "ANY" {
            vec!["get", "post", "put", "patch", "delete", "options", "head"]
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
    contracts::validation::http(
        &Method::POST,
        "/api/services/anthropic/v1/messages",
        500,
        &fixture["response"]["json"],
    )
    .unwrap();
}
