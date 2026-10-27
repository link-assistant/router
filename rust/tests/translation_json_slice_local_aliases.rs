// Independent slice/vector alias and iteration oracle SOURCE; gated CI only.
use link_assistant_router::{translation_collections_core as core, translation_core};
use serde_json::{json, Value};
#[test]
fn immutable_slice_vector_and_explicit_views_preserve_order_and_payloads() {
    for values in [vec![], vec![Value::Null, json!(false), json!("é😀")]] {
        let items = values.as_slice();
        let original: Vec<Value> = items.iter().map(|value| value.clone()).collect();
        let adopted = translation_core::json_map(items, |value| value.clone());
        assert_eq!(adopted, original);
        let owned = values.clone();
        let direct = translation_core::json_map(owned.as_slice(), |value| value.clone());
        assert_eq!(direct, original);
    }
}
#[test]
fn alias_predicates_keep_empty_truth_values_short_circuiting_and_owned_find() {
    for values in [vec![], vec![Value::Null, json!(false), json!("é😀")]] {
        let items = values.as_slice();
        let mut native_calls = 0;
        let original = items.iter().any(|value| { native_calls += 1; value.is_null() });
        let mut adopted_calls = 0;
        let adopted = core::json_any(items, |value| { adopted_calls += 1; value.is_null() });
        assert_eq!(adopted, original);
        assert_eq!(adopted_calls, native_calls);
        assert_eq!(core::json_all(items, |value| !value.is_null()), items.iter().all(|value| !value.is_null()));
        assert_eq!(core::json_find(items, |value| value.is_null()), items.iter().find(|value| value.is_null()).cloned());
    }
}
