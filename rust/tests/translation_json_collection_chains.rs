// Independent native oracle SOURCE. CI only after every same-SHA JavaScript gate.
use serde_json::{Value, json};

#[test]
fn collection_callbacks_and_filters_keep_the_original_shared_payload() {
    let value = json!({"kind":"猫😀\u{0}","schema":{"type":"string"},"field":null});
    assert_eq!(value.as_object().and_then(|object| object.get("kind")).and_then(Value::as_str), Some("猫😀\u{0}"));
    let selected = value.get("schema").filter(|child| child.is_object()).unwrap();
    assert!(std::ptr::eq(selected, &value["schema"]));
    assert!(value.get("field").filter(|child| !child.is_null()).is_none());
    assert!(value.get("absent").filter(|child| child.is_object()).is_none());
    let items = json!(["first", false]);
    assert_eq!(items.as_array().and_then(|items| items.get(0)).and_then(Value::as_str), Some("first"));
    assert_eq!(items.as_array().and_then(|items| items.get(1)).and_then(Value::as_str), None);
    assert_eq!(items.as_array().and_then(|items| items.get(2)), None);
}

#[test]
fn filter_and_existing_lazy_error_conversion_keep_branch_order() {
    use std::cell::RefCell;
    let trace = RefCell::new(Vec::new());
    let value = json!({"schema":{}});
    let selected = value.get("schema")
        .filter(|child| { trace.borrow_mut().push("predicate"); child.is_object() })
        .ok_or_else(|| { trace.borrow_mut().push("error"); String::from("missing") });
    assert!(std::ptr::eq(selected.unwrap(), &value["schema"]));
    assert_eq!(*trace.borrow(), ["predicate"]);
    trace.borrow_mut().clear();
    let failed = value.get("missing")
        .filter(|child| { trace.borrow_mut().push("unreachable"); child.is_object() })
        .ok_or_else(|| { trace.borrow_mut().push("error"); String::from("missing") });
    assert_eq!(failed, Err(String::from("missing")));
    assert_eq!(*trace.borrow(), ["error"]);
}
