//! Independent scalar helper composition oracle SOURCE; gated CI-only, UNRUN.
use link_assistant_router::{translation_core::Json,translation_json_fields_core as field,translation_primitive_option_core as option,translation_text_core as text,translation_integer_core as integer};
#[test]
fn numeric_json_getters_feed_the_same_saturating_arithmetic() {
    for value in [Json::Null,serde_json::json!({"count":0}),serde_json::json!({"count":5}),serde_json::json!({"count":u64::MAX}),serde_json::json!({"count":"wrong kind"})] {
        assert_eq!(integer::u64_saturating_add(field::json_u64_field_or(&value,"count",0),2),value.get("count").and_then(Json::as_u64).unwrap_or_default().saturating_add(2));
    }
    for value in ["","é😀"] {assert_eq!(integer::u64_saturating_add(text::len_utf8(value),2),(value.len() as u64).saturating_add(2));}
    for value in [None,Some(0),Some(u64::MAX)] {assert_eq!(integer::u64_saturating_add(option::u64_unwrap_or(value,0),2),value.unwrap_or(0).saturating_add(2));}
}
