//! Independent ordinary-call/loan oracle SOURCE; only JS-gated CI runs it.
use link_assistant_router::translation_core::Json;
use link_assistant_router::translation_integer_core::u64_saturating_add;

fn cloned(value: &Json) -> Json {
    value.clone()
}
fn middle(value: &Json) -> Json {
    cloned(value)
}
fn entry(value: &Json) -> Json {
    middle(value)
}
fn incremented(value: u64) -> u64 {
    u64_saturating_add(value, 1)
}
fn counted(value: u64) -> u64 {
    incremented(incremented(value))
}
fn viewed(value: &Json) -> Option<&str> {
    value.as_str()
}
fn borrowed(value: &Json) -> Option<&str> {
    viewed(value)
}

#[test]
fn chained_copy_and_scalar_calls_preserve_values() {
    let value = serde_json::json!({"a":false,"text":"λ😀"});
    assert_eq!(entry(&value), value);
    assert_eq!(counted(0), 2);
    assert_eq!(counted(u64::MAX), u64::MAX);
    let values = [Json::Null, Json::String(String::from("a"))];
    assert_eq!(values.iter().map(cloned).collect::<Vec<_>>(), values);
}

#[test]
fn returned_string_loan_is_the_actual_original_input() {
    let value = Json::String(String::from("λ😀"));
    assert_eq!(borrowed(&value), Some("λ😀"));
    assert_eq!(borrowed(&Json::Null), None);
    let first = value.as_str().expect("source string");
    let second = borrowed(&value).expect("borrowed source string");
    assert!(std::ptr::eq(first.as_ptr(), second.as_ptr()));
}
