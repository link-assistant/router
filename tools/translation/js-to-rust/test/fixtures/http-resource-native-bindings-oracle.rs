//! Independent native lexical scoping and move expectations. Gated CI only.
fn twice(input: bool) -> bool {
    let input = !input;
    let input = !input;
    input
}
fn inner(input: bool) -> bool {
    { let input = false; assert!(!input); }
    input
}
fn identity<T>(value: T) -> T {
    let value = value;
    value
}
#[test]
fn initializer_old_binding_scope_exit_and_one_owned_move() {
    for flag in [false, true] { assert_eq!(twice(flag), flag); assert_eq!(inner(flag), flag); }
    let text = String::from("é😀");
    assert_eq!(identity(text), "é😀");
}

#[tokio::test]
async fn child_shadowing_keeps_the_outer_cancellation_and_inner_value_distinct() {
    use link_assistant_router::translation_async_control_core as control;
    let cancellation = control::cancel_new();
    let result = control::with_deadline(1000, &cancellation, |cancellation| async move {
        control::cancel_is_set(&cancellation)
    }).await;
    assert_eq!(result, Ok(false));
    assert!(!control::cancel_is_set(&cancellation));
}
