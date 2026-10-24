//! Independent standard iterator comparisons; gated CI only, no local Rust.
use link_assistant_router::translation_collections_core::{json_all, json_any, json_filter, json_find, json_fold};
use link_assistant_router::translation_core::Json;
use link_assistant_router::translation_state_core::json_append;
use std::cell::Cell;

#[test]
fn predicates_filter_and_owned_find_match_standard_iteration() {
    let cases = vec![Vec::new(), vec![Json::Null], vec![Json::Bool(false),Json::String("λ😀".into())], vec![Json::Null,Json::Bool(false),Json::Null]];
    for values in cases {
        assert_eq!(json_any(&values, |value| value.is_null()), values.iter().any(|value| value.is_null()));
        assert_eq!(json_all(&values, |value| !value.is_null()), values.iter().all(|value| !value.is_null()));
        assert_eq!(json_filter(&values, |value| !value.is_null()), values.iter().filter(|value| !value.is_null()).cloned().collect::<Vec<_>>());
        assert_eq!(json_find(&values, |value| value.is_null()), values.iter().find(|value| value.is_null()).cloned());
        assert_eq!(json_fold(&values, Json::Array(Vec::new()), |accumulator,value| json_append(accumulator,value.clone())), Json::Array(values.clone()));
    }
}

#[test]
fn short_circuit_order_is_independent_of_the_adoption_description() {
    let values = vec![Json::Bool(false),Json::Null,Json::Bool(true)];
    let calls = Cell::new(0);
    assert!(json_any(&values, |value| {calls.set(calls.get()+1);value.is_null()}));
    assert_eq!(calls.get(),2);
    calls.set(0);
    assert!(!json_all(&values, |value| {calls.set(calls.get()+1);!value.is_null()}));
    assert_eq!(calls.get(),2);
    calls.set(0);
    assert_eq!(json_find(&values, |value| {calls.set(calls.get()+1);value.is_null()}),Some(Json::Null));
    assert_eq!(calls.get(),2);
}
