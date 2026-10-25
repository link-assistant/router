//! Independent common-family oracle SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::{translation_text_core as text,
    translation_owned_results_core as result, translation_carriers_core as carrier};
use serde_json::json;

fn cleaned(input: &str) -> String {
    let changed = text::replace(input,"x"," ");
    let view = text::trim(&changed);
    text::repeat(view,1)
}

#[test]
fn text_views_result_moves_and_json_carriers_preserve_original_behavior() {
    assert_eq!(cleaned(" xé😀x "),"é😀");
    assert_eq!(text::strip_prefix("xé","x"),Some("é"));
    assert_eq!(text::strip_prefix("é","x"),None);
    assert_eq!(result::str_ok_option(result::str_ok("é😀")),Some("é😀"));
    assert_eq!(result::u64_unwrap_or(result::u64_ok(text::len_utf8("é😀")),0),6);
    let value = json!({"items":[null,true,1]});
    let copied = carrier::json_result_to_option(carrier::json_ok(&value));
    assert_eq!(copied,Some(value));
}
