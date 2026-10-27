//! Independent JSON Option-Try source oracle. UNRUN; native CI only after JS.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

fn original<'a>(value: &'a Json, key: &str) -> Option<&'a str> {
    Some(value.get("root")?.as_object()?.get("next")?.get(key)?.as_str()?)
}
fn selected<'a>(value: &'a Json, key: &str) -> Option<&'a str> {
    Some(fields::json_str_field3(value, "root", "next", key)?)
}
#[test]
fn original_and_fused_try_chains_keep_none_wrong_kind_and_exact_borrowed_text() {
    for value in [Json::Null, serde_json::json!({}), serde_json::json!({"root":false}), serde_json::json!({"root":{"next":null}}), serde_json::json!({"root":{"next":{"name":null}}}), serde_json::json!({"root":{"next":{"name":"é😀","0":"literal numeric key"}}})] {
        for key in ["name", "missing", "0"] {
            assert_eq!(selected(&value, key), original(&value, key));
            if let (Some(left), Some(right)) = (selected(&value, key), original(&value, key)) { assert!(std::ptr::eq(left.as_ptr(), right.as_ptr())); }
        }
    }
}
#[test]
fn a_non_try_successor_preserves_original_early_return_and_later_effects() {
    fn original(value: &Json, effects: &mut u64) -> Option<bool> {
        let selected = value.get("root")?.get("name");
        *effects += 1;
        Some(selected.is_some())
    }
    fn selected(value: &Json, effects: &mut u64) -> Option<bool> {
        let selected = fields::json_field(value, "root")?.get("name");
        *effects += 1;
        Some(selected.is_some())
    }
    for value in [Json::Null, serde_json::json!({"root":null}), serde_json::json!({"root":{"name":"present"}})] {
        let (mut left, mut right) = (0, 0);
        assert_eq!(original(&value, &mut left), selected(&value, &mut right));
        assert_eq!(left, right);
    }
}
