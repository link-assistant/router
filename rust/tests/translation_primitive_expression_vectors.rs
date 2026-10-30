// Independent native scalar-vector edge oracles. CI ONLY; NEVER RUN LOCALLY.
#[test]
fn vector_items_retain_left_to_right_failure_order() {
    let panic = std::panic::catch_unwind(|| {
        let left = std::hint::black_box(u8::MAX);
        let right = std::hint::black_box(2_u8);
        vec![left.checked_add(right).expect("attempt to add with overflow"),
             left.checked_mul(right).expect("attempt to multiply with overflow")]
    }).unwrap_err();
    let message = panic.downcast_ref::<&str>().copied()
        .or_else(|| panic.downcast_ref::<String>().map(String::as_str)).unwrap();
    assert!(message.contains("attempt to add with overflow"));
}
#[test]
fn guarded_items_move_once_without_evaluating_unselected_failure() {
    let left = std::hint::black_box(255_u8);
    let flag = std::hint::black_box(false);
    let first = vec![if flag {left.checked_add(1).expect("attempt to add with overflow")} else {left}, 1];
    let next = first;
    assert_eq!(next, vec![255, 1]);
}
#[test]
fn unused_primitive_vector_still_evaluates_its_items() {
    assert!(std::panic::catch_unwind(|| {
        let value = std::hint::black_box(255_u8);
        let _discarded = vec![value.checked_mul(2).expect("attempt to multiply with overflow")];
        vec![value]
    }).is_err());
}
#[test]
fn boolean_vectors_keep_conditional_shape() {
    let left = std::hint::black_box(true);
    let right = std::hint::black_box(false);
    for flag in [false, true] {
        let result = if flag {vec![left && !right, left == right]} else {vec![right]};
        assert_eq!(result, if flag {vec![true, false]} else {vec![false]});
    }
}
