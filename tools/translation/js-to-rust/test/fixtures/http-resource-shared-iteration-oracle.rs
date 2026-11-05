// Independent Rust oracle SOURCE; run only in CI after all JavaScript gates.
use crate::translation_core::Json;

fn gathered(values: &[Json]) -> Json {
    let mut result = Vec::new();
    for item in values { result.push(item.clone()); }
    Json::Array(result)
}

fn until_stop(values: &[Json]) -> Json {
    let mut result = Vec::new();
    for item in values {
        if item.get("stop").is_some() { break; }
        if item.get("skip").is_some() { continue; }
        result.push(item.clone());
    }
    Json::Array(result)
}

fn first<'a>(values: &'a [Json], fallback: &'a Json) -> &'a Json {
    for item in values { return item; }
    fallback
}

#[test]
fn slice_iteration_keeps_original_order_empty_and_borrowed_identity() {
    let values = vec![
        serde_json::json!({"first":"é😀"}),
        serde_json::json!({"skip":null}),
        serde_json::json!({"last":null}),
        serde_json::json!({"stop":null}),
        serde_json::json!({"after":null}),
    ];
    let fallback = Json::Null;
    assert_eq!(gathered(&values), Json::Array(values.clone()));
    assert_eq!(until_stop(&values), Json::Array(vec![values[0].clone(), values[2].clone()]));
    assert_eq!(gathered(&[]), serde_json::json!([]));
    assert_eq!(until_stop(&[]), serde_json::json!([]));
    assert!(std::ptr::eq(first(&values, &fallback), &values[0]));
    assert!(std::ptr::eq(first(&[], &fallback), &fallback));
}
