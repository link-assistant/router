//! Independent object-view source oracle; all cases UNRUN, gated CI only.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn object_views_match_value_string_get_and_retain_receiver_borrows() {
    let values = [Json::Null, serde_json::json!([]), serde_json::json!([{"name":"array"}]), serde_json::json!({}), serde_json::json!({"name":"é😀","root":{"name":"nested","next":{"name":"deep"}}}), serde_json::json!({"name":null,"root":false}), serde_json::json!({"0":"object numeric key","a/b":"literal slash","~":"literal tilde"})];
    for value in values {
        for key in ["name", "missing", "0", "a/b", "~"] {
            let original = value.as_object().and_then(|map| map.get(key));
            assert_eq!(fields::json_field(&value, key), original);
            assert_eq!(fields::json_str_field_or_empty(&value, key), original.and_then(Json::as_str).unwrap_or_default());
            let nested = value.get("root").and_then(Json::as_object).and_then(|map| map.get(key));
            assert_eq!(fields::json_field2(&value, "root", key), nested);
            assert_eq!(fields::json_str_field2_or_empty(&value, "root", key), nested.and_then(Json::as_str).unwrap_or_default());
            let deep = value.as_object().and_then(|map| map.get("root")).and_then(Json::as_object).and_then(|map| map.get("next")).and_then(|node| node.get(key));
            assert_eq!(fields::json_field3(&value, "root", "next", key), deep);
            if let Some(original) = nested { assert!(std::ptr::eq(fields::json_field2(&value, "root", key).unwrap(), original)); }
        }
    }
    let value = serde_json::json!({"root":{"name":"receiver-only lifetime"}});
    let borrowed = { let key = String::from("name"); fields::json_str_field2_or_empty(&value, "root", &key) };
    assert_eq!(borrowed, "receiver-only lifetime");
}
