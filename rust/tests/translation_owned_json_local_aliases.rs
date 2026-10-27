// Independent JSON carrier alias/branch oracle SOURCE; gated native CI only.
use link_assistant_router::translation_carriers_core as core;
use serde_json::{json, Value};
#[test]
fn moved_alias_and_default_values_keep_optional_and_result_selection() {
    for value in [Value::Null, json!(false), json!("é😀"), json!({"array": [0, false, null]})] {
        for original in [None, Some(value.clone())] {
            let alias = original.clone();
            let alternative = value.clone();
            let selected = alias.unwrap_or(alternative);
            let adopted_alias = original;
            let adopted_alternative = value.clone();
            assert_eq!(core::json_option_or(&adopted_alias, &adopted_alternative), selected);
        }
        for original in [Ok(value.clone()), Err("failure".to_owned())] {
            let chosen = original.clone().ok();
            let selected = chosen.unwrap_or(value.clone());
            let adopted_chosen = core::json_result_to_option(&original);
            assert_eq!(core::json_option_or(&adopted_chosen, &value), selected);
            let reference = &original;
            assert_eq!(core::json_result_to_option(reference), reference.clone().ok());
        }
    }
}
#[test]
fn optional_error_conversion_preserves_empty_and_unicode_payloads() {
    for value in [None, Some(json!("")), Some(json!("é😀"))] {
        let alias = value.clone();
        let original = alias.ok_or_else(|| "missing".to_owned());
        assert_eq!(core::json_option_to_result(&value, "missing"), original);
    }
}
