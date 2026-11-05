// Independent typed division/remainder oracles. CI ONLY; ALL UNRUN.
fn panic_text(payload: &(dyn std::any::Any + Send)) -> &str {
    payload.downcast_ref::<&str>().copied()
        .or_else(|| payload.downcast_ref::<String>().map(String::as_str)).unwrap()
}
#[test]
fn integer_division_truncates_toward_zero_and_remainder_follows_dividend() {
    let left = std::hint::black_box(-7_i8);
    let right = std::hint::black_box(3_i8);
    assert_eq!(left / right, -2);
    assert_eq!(left % right, -1);
    assert_eq!(-left / -right, -2);
    assert_eq!(-left % -right, 1);
}
#[test]
fn native_operators_preserve_distinct_zero_and_overflow_failures() {
    let minimum = std::hint::black_box(i8::MIN);
    let zero = std::hint::black_box(0_i8);
    let minus_one = std::hint::black_box(-1_i8);
    let divide_zero = std::panic::catch_unwind(|| minimum / zero).unwrap_err();
    let remain_zero = std::panic::catch_unwind(|| minimum % zero).unwrap_err();
    let divide_overflow = std::panic::catch_unwind(|| minimum / minus_one).unwrap_err();
    let remain_overflow = std::panic::catch_unwind(|| minimum % minus_one).unwrap_err();
    assert!(panic_text(divide_zero.as_ref()).contains("attempt to divide by zero"));
    assert!(panic_text(remain_zero.as_ref()).contains("attempt to calculate the remainder with a divisor of zero"));
    assert!(panic_text(divide_overflow.as_ref()).contains("attempt to divide with overflow"));
    assert!(panic_text(remain_overflow.as_ref()).contains("attempt to calculate the remainder with overflow"));
}
#[test]
fn source_operand_evaluation_precedes_the_division() {
    let panic = std::panic::catch_unwind(|| {
        let left = std::hint::black_box(255_u8);
        let zero = std::hint::black_box(0_u8);
        let numerator = left.checked_add(1).expect("attempt to add with overflow");
        numerator / zero
    }).unwrap_err();
    assert!(panic_text(panic.as_ref()).contains("attempt to add with overflow"));
}
#[test]
fn unselected_division_does_not_execute() {
    let flag = std::hint::black_box(false);
    let zero = std::hint::black_box(0_i8);
    assert_eq!(if flag {-128_i8 / zero} else {7_i8}, 7);
}
