//! Independent native oracle source. Run only in CI after the full JS gate.
use link_assistant_router::translation_core::{json_copy, json_filter_map, json_map, Json};

#[test]
fn map_preserves_order_values_and_independent_owned_storage() {
    let input = vec![Json::Null, Json::String("λ😀".into()), Json::Bool(false)];
    let mut visited = Vec::new();
    let output = json_map(&input, |value| {
        visited.push(value.clone());
        json_copy(value)
    });
    assert_eq!(visited, input);
    assert_eq!(output, input);
    let mut changed = output;
    changed[1] = Json::String("changed".into());
    assert_eq!(input[1], Json::String("λ😀".into()));
}

#[test]
fn filter_map_visits_each_input_once_and_preserves_survivor_order() {
    let input = vec![Json::Null, Json::Bool(false), Json::Null, Json::String("".into())];
    let mut count = 0;
    let output = json_filter_map(&input, |value| {
        count += 1;
        if value.is_null() { None } else { Some(json_copy(value)) }
    });
    assert_eq!(count, 4);
    assert_eq!(output, vec![Json::Bool(false), Json::String("".into())]);
}

#[test]
fn empty_collections_do_not_invoke_callbacks() {
    assert!(json_map(&[], |_| panic!("empty map callback")).is_empty());
    assert!(json_filter_map(&[], |_| panic!("empty filter callback")).is_empty());
}

#[test]
fn callback_panic_stops_before_later_values() {
    use std::cell::RefCell;
    let seen = RefCell::new(Vec::new());
    let input = vec![Json::Bool(false), Json::Null, Json::Bool(true)];
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        json_map(&input, |value| {
            seen.borrow_mut().push(value.clone());
            if value.is_null() { panic!("stop"); }
            json_copy(value)
        })
    }));
    assert!(result.is_err());
    assert_eq!(*seen.borrow(), vec![Json::Bool(false), Json::Null]);
}
