// Independent native behavior oracle. CI only after all same-SHA JS gates.
// SOURCE DRAFT ONLY. No local Rust command is authorized.
fn check(value: u8) {
    let _checked = value.checked_add(1).expect("attempt to add with overflow");
}
fn second(value: u8) {
    let _checked = 1u8.checked_div(value).expect("attempt to divide by zero");
}
fn relay(value: u8) { check(value) }
fn values(value: u8) -> Vec<u8> {
    check(value);
    let _ignored = relay(value);
    vec![value]
}
fn guarded(left: u8, right: u8, flag: bool) -> Vec<u8> {
    check(left);
    if flag {
        second(right);
        vec![left]
    } else {
        vec![left.checked_add(right).expect("attempt to add with overflow")]
    }
}
fn message(error: Box<dyn std::any::Any + Send>) -> String {
    if let Some(text) = error.downcast_ref::<&str>() { return (*text).into(); }
    if let Some(text) = error.downcast_ref::<String>() { return text.clone(); }
    panic!("unexpected panic payload")
}
#[test]
fn unit_tail_and_local_values_preserve_eager_failures() {
    assert_eq!(relay(3), ());
    assert_eq!(values(3), vec![3]);
    assert!(message(std::panic::catch_unwind(|| values(255)).unwrap_err()).contains("attempt to add with overflow"));
}
#[test]
fn unit_discard_order_and_guarded_continuation() {
    assert_eq!(guarded(3, 0, false), vec![3]);
    assert_eq!(guarded(3, 1, true), vec![3]);
    assert!(message(std::panic::catch_unwind(|| guarded(255, 0, true)).unwrap_err()).contains("attempt to add with overflow"));
    assert!(message(std::panic::catch_unwind(|| guarded(3, 0, true)).unwrap_err()).contains("attempt to divide by zero"));
}
