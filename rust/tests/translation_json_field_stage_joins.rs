//! Independent source composition oracle. UNRUN; only gated native CI executes.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields, translation_text_core as text, translation_primitive_option_core as option};

#[test]
fn original_and_composed_field_text_option_calls_match() {
    for value in [Json::Null, serde_json::json!({}), serde_json::json!({"0":{"name":" é😀 ","count":u64::MAX}}), serde_json::json!({"0":{"name":"","count":0}}), serde_json::json!({"0":{"name":false,"count":-1}})] {
        let original = value.get("0").and_then(|child| child.get("name")).and_then(Json::as_str).unwrap_or_default().trim().to_owned();
        let selected = fields::json_str_field2_or_empty(&value, "0", "name");
        let cleaned = text::trim(selected);
        assert_eq!(text::to_owned(cleaned), original);
        for fallback in [0, 7, u64::MAX] {
            let original = value.get("0").and_then(|child| child.get("count")).and_then(Json::as_u64).unwrap_or(fallback);
            let selected = fields::json_u64_field2(&value, "0", "count");
            assert_eq!(option::u64_unwrap_or(selected, fallback), original);
            assert_eq!(selected.map(|item| item).unwrap_or(fallback), original);
        }
        assert_eq!(option::str_is_some(fields::json_str_field2(&value, "0", "name")), value.get("0").and_then(|child| child.get("name")).and_then(Json::as_str).is_some());
    }
}
