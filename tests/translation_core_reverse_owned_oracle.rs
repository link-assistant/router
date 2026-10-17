//! Independent native witnesses for the reverse owned-core ABI.
//!
//! These are authored expectations, not an execution claim for generated Rust.
//! The JavaScript receiving suites inspect both emitted targets; native tests
//! run only in CI after every JavaScript stage is green for the same SHA.

use link_assistant_router::translation_core;

/// Authored receiving source; the real producer performs both meta round trips.
/// Fixture functions are excluded from actual application coverage counts.
pub const REVERSE_OWNED_JS_WITNESS: &str = r###"import {router_core_json_copy as copy,router_core_json_with_field as update,router_core_json_index_str as index} from './runtime/json-update-runtime.mjs';
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function copied(value){return copy(value);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function nested(value){return update(value,"nested",value);}
/** @param {import('./runtime/json-macro-runtime.mjs').JsonValue} value */
export function named(value){return index(value,"name");}
"###;

// Root installs this exact actual producer output. Never hand-author it.
#[path = "../tools/translation/js-to-rust/generated/owned-core-witness.rs"]
mod reverse_generated;

use link_assistant_router::translation_core::{
    json_copy, json_index_str, json_index_usize, json_map_index, json_with_field,
};
use serde_json::{json, Value};

#[test]
fn copy_does_not_move_or_mutate_a_reusable_input() {
    let input = json!({"name": "🦀", "items": [true, null]});
    let copy = json_copy(&input);
    assert_eq!(copy, input);
    assert_eq!(input["name"], "🦀");
}

#[test]
fn reverse_update_copies_after_all_arguments_are_evaluated() {
    let input = json!({"before": 1});
    let base_argument = &input;
    let key_argument = "nested";
    let value_argument = &input;
    let base = json_copy(base_argument);
    let value = json_copy(value_argument);
    let result = json_with_field(base, key_argument, value);
    assert_eq!(result, json!({"before": 1, "nested": {"before": 1}}));
    assert_eq!(input, json!({"before": 1}));
}

#[test]
fn null_promotes_and_repeated_keys_replace_the_existing_value() {
    let first = json_with_field(Value::Null, "é", json!(false));
    let result = json_with_field(first, "é", json!(true));
    assert_eq!(result, json!({"é": true}));
}

#[test]
fn value_indices_borrow_the_input_and_missing_values_are_null() {
    let input = json!({"name": "valid"});
    assert_eq!(json_index_str(&input, "name"), &json!("valid"));
    assert_eq!(json_index_str(&input, "missing"), &Value::Null);
    assert_eq!(json_index_usize(&json!([7]), 0), &json!(7));
    assert_eq!(json_index_usize(&json!([]), 0), &Value::Null);
}

#[test]
#[should_panic(expected = "no entry found for key")]
fn map_indices_keep_the_distinct_missing_entry_panic() {
    let map = serde_json::Map::new();
    let _ = json_map_index(&map, "missing");
}

#[test]
fn native_json_has_a_larger_domain_than_the_reverse_resource_contract() {
    let input = Value::Array(vec![Value::Null; 4096]);
    let copied = json_copy(&input);
    assert_eq!(copied.as_array().map(Vec::len), Some(4096));
    // The reverse profile counts this array root too (4097 nodes), so its
    // generated guard must refuse it. The native library has no such cap.
}


#[test]
fn actual_reverse_emission_compiles_and_matches_independent_native_goldens() {
    let input = json!({"name": "🦀"});
    assert_eq!(reverse_generated::copied(&input), json!({"name": "🦀"}));
    assert_eq!(
        reverse_generated::nested(&input),
        json!({"name": "🦀", "nested": {"name": "🦀"}})
    );
    assert_eq!(reverse_generated::named(&input), &json!("🦀"));
    assert_eq!(input, json!({"name": "🦀"}));
}
