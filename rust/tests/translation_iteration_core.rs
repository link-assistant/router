//! Independent native oracle source; gated CI only, never local Rust execution.
use link_assistant_router::translation_collections_core::{json_all, json_any, json_filter, json_find, json_fold};
use link_assistant_router::translation_core::Json;

#[test]
fn filter_copies_survivors_in_order() {
    let values = vec![Json::Null, Json::String("λ😀".into()), Json::Bool(false)];
    let mut seen = Vec::new();
    let result = json_filter(&values, |value| { seen.push(value.clone()); !value.is_null() });
    assert_eq!(seen, values);
    assert_eq!(result, vec![Json::String("λ😀".into()), Json::Bool(false)]);
}

#[test]
fn predicate_operations_stop_at_the_first_decisive_value() {
    let values = vec![Json::String("first".into()), Json::Null, Json::String("last".into())];
    let mut calls = 0;
    assert!(json_any(&values, |value| { calls += 1; value.is_null() }));
    assert_eq!(calls, 2);
    calls = 0;
    assert!(!json_all(&values, |value| { calls += 1; !value.is_null() }));
    assert_eq!(calls, 2);
    calls = 0;
    assert_eq!(json_find(&values, |value| { calls += 1; value.is_null() }), Some(Json::Null));
    assert_eq!(calls, 2);
    assert_eq!(json_find(&values, |_| false), None);
}

#[test]
fn empty_inputs_have_their_actual_identities() {
    assert!(json_filter(&[], |_| panic!("empty filter callback")).is_empty());
    assert!(!json_any(&[], |_| panic!("empty any callback")));
    assert!(json_all(&[], |_| panic!("empty all callback")));
    assert_eq!(json_find(&[], |_| panic!("empty find callback")), None);
    assert_eq!(json_fold(&[], Json::Null, |_, _| panic!("empty fold callback")), Json::Null);
}

#[test]
fn fold_consumes_each_accumulator_and_value_in_source_order() {
    let values = vec![Json::String("a".into()), Json::Null, Json::Bool(false)];
    let mut seen = Vec::new();
    let result = json_fold(&values, Json::String("start".into()), |accumulator, value| {
        seen.push((accumulator, value.clone()));
        value.clone()
    });
    assert_eq!(seen, vec![(Json::String("start".into()), Json::String("a".into())), (Json::String("a".into()), Json::Null), (Json::Null, Json::Bool(false))]);
    assert_eq!(result, Json::Bool(false));
}
