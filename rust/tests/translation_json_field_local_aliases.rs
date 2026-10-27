// Independent JSON field/key/index alias oracle SOURCE; gated Rust CI only.
use link_assistant_router::translation_json_fields_core as core;
use serde_json::{json, Value};
#[test]
fn receiver_key_and_owned_view_aliases_preserve_native_borrowed_fields() {
    let value = json!({"label": "é😀", "null": null, "false": false, "empty": "", "__proto__": "literal"});
    for key in ["label", "null", "false", "empty", "__proto__", "absent"] {
        let receiver = &value;
        let lookup = key;
        let original = receiver.get(lookup);
        let adopted = core::json_field(receiver, lookup);
        assert_eq!(adopted, original);
        if let (Some(before), Some(after)) = (original, adopted) { assert!(std::ptr::eq(before, after)); }
        let owned = key.to_owned();
        let view = owned.as_str();
        assert_eq!(core::json_field(receiver, view), receiver.get(view));
        assert_eq!(core::json_field(receiver, owned.as_str()), receiver.get(owned.as_str()));
        assert_eq!(core::json_str_field(receiver, lookup), receiver.get(lookup).and_then(Value::as_str));
    }
}
#[test]
fn native_usize_indices_and_local_aliases_preserve_missing_and_false_values() {
    let value = json!([null, false, "é😀"]);
    for index in [0_usize, 1, 2, 3, 4] {
        let receiver = &value;
        let amount = index;
        assert_eq!(core::json_index(receiver, amount as u64), receiver.get(amount));
    }
    let index = 1_usize;
    assert_eq!(core::json_index(&value, index as u64), Some(&json!(false)));
}
