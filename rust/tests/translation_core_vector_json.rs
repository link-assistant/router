//! Independent owned JSON vector oracle; CI only after all same-SHA JS gates.
use link_assistant_router::translation_core::{self, Json};
fn moved(value: Json) -> Vec<Json> { translation_core::vec![value] }
fn copied(value: Json) -> Vec<Json> {
    let first = translation_core::json_copy(&value);
    translation_core::vec![first, value]
}
#[test]
fn values_keep_exact_numbers_unicode_and_independent_copied_storage() {
    let input = serde_json::json!({"key": ["Ω😀", 18446744073709551615u64]});
    assert_eq!(moved(input.clone()), [input.clone()]);
    let mut values = copied(input.clone());
    assert_eq!(values, [input.clone(), input.clone()]);
    values[0]["key"] = Json::Null;
    assert_eq!(values[1], input);
}
