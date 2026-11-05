// Independent written immutable alias oracle SOURCE; gated CI only, UNRUN.
use link_assistant_router::{translation_integer_core as integer, translation_text_core as text, translation_collections_core as collections, translation_state_core as state};
use serde_json::{json, Value};
#[test]
fn typed_fixed_integer_aliases_preserve_limits_and_chained_results() {
    for value in [0_u64, 1, u64::MAX - 1, u64::MAX] {
        let alias: u64 = value;
        let first: u64 = alias.saturating_add(1);
        let original = first.saturating_mul(2);
        let adopted: u64 = value;
        let selected: u64 = integer::u64_saturating_add(adopted, 1);
        assert_eq!(integer::u64_saturating_mul(selected, 2), original);
    }
    let minimum: i64 = -9223372036854775808;
    assert_eq!(integer::i64_saturating_abs(minimum), minimum.saturating_abs());
}
#[test]
fn typed_owned_and_shared_text_and_native_counts_keep_utf8_and_zero() {
    for value in ["", "é😀", "ab"] {
        for count in [0_usize, 1, 3] {
            let owned: String = value.to_owned();
            let view: &str = owned.as_str();
            let amount: usize = count;
            assert_eq!(text::repeat(view, amount as u64), view.repeat(amount));
        }
    }
}
#[test]
fn typed_json_slice_aliases_preserve_empty_order_null_false_and_unicode() {
    for values in [vec![], vec![Value::Null, json!(false), json!("é😀")]] {
        let items: &[Value] = values.as_slice();
        let mapped: Vec<Value> = items.iter().map(|value| value.clone()).collect();
        assert_eq!(link_assistant_router::translation_core::json_map(items, |value| value.clone()), mapped);
        let mut original = json!([]);
        for value in items { original = state::json_append(original, value.clone()); }
        assert_eq!(collections::json_fold(items, json!([]), |result, value| state::json_append(result, value.clone())), original);
    }
}
