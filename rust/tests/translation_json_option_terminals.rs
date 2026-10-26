// Independent native oracle SOURCE. CI only after all same-SHA JS gates pass.
use serde_json::{Value, json};

#[test]
fn nested_fields_presence_and_scalar_fallbacks_keep_option_semantics() {
    let value = json!({"image_url":{"url":"猫😀\u{0}"},"kind":"","count":u64::MAX,"field":null});
    assert_eq!(value.get("image_url").and_then(|child| child.get("url")).and_then(Value::as_str), Some("猫😀\u{0}"));
    assert_eq!(value.get("kind").and_then(Value::as_str).unwrap_or("default"), "");
    assert_eq!(value.get("missing").and_then(Value::as_str).unwrap_or("default"), "default");
    assert_eq!(value.get("count").and_then(Value::as_u64).unwrap_or(9), u64::MAX);
    assert!(value.get("field").is_some());
    assert!(value.get("missing").is_none());
    assert!(value.get("field").and_then(Value::as_array).is_none());
    for wrong in [Value::Null, json!(false), json!([]), json!({})] {
        assert_eq!(wrong.get("image_url").and_then(|child| child.get("url")).and_then(Value::as_str), None);
    }
}

#[test]
fn eager_fallback_runs_once_even_for_some_and_closed_callback_skips_none() {
    use std::cell::RefCell;
    let trace = RefCell::new(Vec::new());
    let fallback = || { trace.borrow_mut().push("fallback"); "default" };
    assert_eq!(Some("present").unwrap_or(fallback()), "present");
    assert_eq!(*trace.borrow(), ["fallback"]);
    trace.borrow_mut().clear();
    let input = { trace.borrow_mut().push("receiver"); Some("present") };
    let eager = fallback();
    let selected = if let Some(payload) = input { payload } else { eager };
    assert_eq!(selected, "present");
    assert_eq!(*trace.borrow(), ["receiver", "fallback"]);
    trace.borrow_mut().clear();
    let missing: Option<&Value> = None;
    let result = missing.and_then(|child| { trace.borrow_mut().push("callback"); child.get("url") });
    assert_eq!(result, None);
    assert!(trace.borrow().is_empty());
}
