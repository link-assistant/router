use super::*;

fn diagnostic_catalog(ids: &[&str]) -> Value {
    json!({
        "object": "list",
        "data": ids.iter().enumerate().map(|(index, id)| json!({
            "id": id,
            "canonical_id": id,
            "native_id": id,
            "provider": "private-provider",
            "router_fetched_at": 1_893_456_000_i64,
            "owned_by": "private-owner",
            "object": "model",
            "type": "model",
            "display_name": format!("Model {index}"),
            "created_at": "2030-01-01T00:00:00Z",
            "created": index,
            "max_input_tokens": 200_000,
            "max_tokens": 64_000,
            "capabilities": {"batch": true},
            "private": "must-not-survive"
        })).collect::<Vec<_>>(),
        "using_fallback": false,
        "healthy_providers": ["private-provider"],
        "degraded_providers": ["another-provider"],
        "degraded_reasons": {"another-provider": "private path"},
        "catalog_conflicts": [],
    })
}

fn ids(value: &Value) -> Vec<&str> {
    value["data"]
        .as_array()
        .unwrap()
        .iter()
        .filter_map(|model| model["id"].as_str())
        .collect()
}

fn assert_no_router_fields(value: &Value) {
    let rendered = value.to_string();
    for forbidden in [
        "canonical_id",
        "native_id",
        "provider",
        "router_fetched_at",
        "using_fallback",
        "healthy_providers",
        "degraded_providers",
        "degraded_reasons",
        "catalog_conflicts",
        "private-owner",
        "must-not-survive",
    ] {
        assert!(
            !rendered.contains(forbidden),
            "leaked {forbidden}: {rendered}"
        );
    }
}

#[test]
fn anthropic_shape_preserves_exact_ids_and_only_native_metadata() {
    let projected = project(
        "/api/services/anthropic/v1/models",
        Some("limit=1000"),
        &diagnostic_catalog(&["model/exact:one", "models/exact-two"]),
    )
    .unwrap()
    .unwrap();
    assert_eq!(ids(&projected), ["model/exact:one", "models/exact-two"]);
    assert_eq!(projected["first_id"], "model/exact:one");
    assert_eq!(projected["last_id"], "models/exact-two");
    assert_eq!(projected["has_more"], false);
    assert!(projected.get("object").is_none());
    let first = &projected["data"][0];
    assert_eq!(first["type"], "model");
    assert_eq!(first["display_name"], "Model 0");
    assert_eq!(first["max_input_tokens"], 200_000);
    assert_eq!(first["max_tokens"], 64_000);
    assert_eq!(first["capabilities"]["batch"], true);
    assert_no_router_fields(&projected);
}

#[test]
fn anthropic_pagination_covers_empty_first_middle_last_and_both_directions() {
    let catalog = diagnostic_catalog(&["a", "b", "c", "d"]);
    let empty = project(
        "/api/services/anthropic/v1/models",
        None,
        &diagnostic_catalog(&[]),
    )
    .unwrap()
    .unwrap();
    assert_eq!(empty["data"], json!([]));
    assert_eq!(empty["first_id"], Value::Null);
    assert_eq!(empty["last_id"], Value::Null);
    assert_eq!(empty["has_more"], false);

    let first = project(
        "/api/services/anthropic/v1/models",
        Some("limit=1"),
        &catalog,
    )
    .unwrap()
    .unwrap();
    assert_eq!(ids(&first), ["a"]);
    assert_eq!(first["has_more"], true);

    let middle = project(
        "/api/services/anthropic/v1/models",
        Some("after_id=a&limit=2"),
        &catalog,
    )
    .unwrap()
    .unwrap();
    assert_eq!(ids(&middle), ["b", "c"]);
    assert_eq!(middle["first_id"], "b");
    assert_eq!(middle["last_id"], "c");
    assert_eq!(middle["has_more"], true);

    let last = project(
        "/api/services/anthropic/v1/models",
        Some("after_id=c&limit=1000"),
        &catalog,
    )
    .unwrap()
    .unwrap();
    assert_eq!(ids(&last), ["d"]);
    assert_eq!(last["has_more"], false);

    let before_middle = project(
        "/api/services/anthropic/v1/models",
        Some("before_id=d&limit=2"),
        &catalog,
    )
    .unwrap()
    .unwrap();
    assert_eq!(ids(&before_middle), ["b", "c"]);
    assert_eq!(before_middle["has_more"], true);

    let before_first = project(
        "/api/services/anthropic/v1/models",
        Some("before_id=b&limit=1"),
        &catalog,
    )
    .unwrap()
    .unwrap();
    assert_eq!(ids(&before_first), ["a"]);
    assert_eq!(before_first["has_more"], false);
}

#[test]
fn anthropic_invalid_limits_and_cursors_fail_closed() {
    let catalog = diagnostic_catalog(&["a", "b"]);
    for query in [
        "limit=0",
        "limit=1001",
        "limit=invalid",
        "after_id=missing",
        "before_id=missing",
        "after_id=a&before_id=b",
        "limit=1&limit=2",
        "after_id=a&after_id=b",
    ] {
        let error =
            project("/api/services/anthropic/v1/models", Some(query), &catalog).unwrap_err();
        assert_eq!(error.status, StatusCode::BAD_REQUEST, "{query}");
        assert_eq!(error.error_type, "invalid_request_error", "{query}");
    }
}

#[test]
fn openai_codex_and_qwen_shapes_have_no_router_diagnostics() {
    let catalog = diagnostic_catalog(&["synthetic-live"]);
    for path in [
        "/api/services/openai/v1/models",
        "/api/services/codex/v1/models",
        "/api/services/qwen/v1/models",
    ] {
        let projected = project(path, None, &catalog).unwrap().unwrap();
        assert_eq!(
            projected,
            json!({
                "object": "list",
                "data": [{
                    "id": "synthetic-live",
                    "object": "model",
                    "created": 0
                }]
            }),
            "{path}"
        );
        assert_no_router_fields(&projected);
    }
}

#[test]
fn neutral_catalog_is_not_projected_and_duplicate_success_is_refused() {
    assert!(
        project("/api/models", None, &diagnostic_catalog(&["one"]))
            .unwrap()
            .is_none()
    );
    let duplicate = diagnostic_catalog(&["same", "same"]);
    let error = project("/api/services/openai/v1/models", None, &duplicate).unwrap_err();
    assert_eq!(error.status, StatusCode::CONFLICT);
}
