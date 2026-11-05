// Independent native oracle SOURCE. Rust execution is restricted to gated CI.
use link_assistant_router::translation_collections_core as collection;
use link_assistant_router::translation_core::{self as core, Json};
use link_assistant_router::translation_state_core as state;

#[test]
fn collection_callbacks_preserve_order_variants_and_owned_accumulators() {
    let first = core::json!({"keep": true, "value": "é😀"});
    let middle = core::json!({"skip": null});
    let last = core::json!({"keep": false});
    let values = vec![first.clone(), middle, last.clone()];
    let predicate = |value: &Json| state::json_object_has(value, "keep");
    assert_eq!(core::json_map(&values, core::json_copy), values);
    assert_eq!(
        collection::json_filter(&values, predicate),
        vec![first.clone(), last.clone()]
    );
    assert!(collection::json_any(&values, predicate));
    assert!(!collection::json_all(&values, predicate));
    assert_eq!(collection::json_find(&values, predicate), Some(first.clone()));
    let optional = core::json_filter_map(&values, |value| {
        if predicate(value) {
            Some(value.clone())
        } else {
            None
        }
    });
    assert_eq!(optional, vec![first, last]);
    let folded = collection::json_fold(&values, core::json!([]), |acc, value| {
        state::json_append(acc, value.clone())
    });
    assert_eq!(folded, state::json_from_values(values));
    assert!(!collection::json_any(&[], predicate));
    assert!(collection::json_all(&[], predicate));
    assert_eq!(collection::json_find(&[], predicate), None);
    assert_eq!(
        collection::json_find(&[core::json!(null)], |_| true),
        Some(core::json!(null))
    );
}

#[test]
fn short_circuit_predicates_run_in_original_order_without_extra_calls() {
    let values = vec![core::json!("first"), core::json!("second"), core::json!("last")];
    let mut seen = Vec::new();
    assert!(collection::json_any(&values, |value| {
        seen.push(value.clone());
        value == &core::json!("second")
    }));
    assert_eq!(seen, vec![core::json!("first"), core::json!("second")]);
    seen.clear();
    assert!(!collection::json_all(&values, |value| {
        seen.push(value.clone());
        value == &core::json!("missing")
    }));
    assert_eq!(seen, vec![core::json!("first")]);
}
