// Independent native conditional and short-circuit oracles. CI only; UNRUN.
fn add(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(u8::checked_add(left, right), "attempt to add with overflow")
}
fn subtract(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(u8::checked_sub(left, right), "attempt to subtract with overflow")
}
fn multiply(left: u8, right: u8) -> u8 {
    ::core::option::Option::expect(u8::checked_mul(left, right), "attempt to multiply with overflow")
}
#[test]
fn conditional_and_short_circuit_selection() {
    assert_eq!(if false { add(255, 1) } else { subtract(255, 1) }, 254);
    assert!(std::panic::catch_unwind(|| if true { add(255, 1) } else { 255 }).is_err());
    assert!(!(false && add(255, 1) > 0));
    assert!(true || add(255, 1) > 0);
    assert!(std::panic::catch_unwind(|| true && add(255, 1) > 0).is_err());
    assert!(std::panic::catch_unwind(|| false || add(255, 1) > 0).is_err());
}
#[test]
fn earlier_operand_and_selected_continuation() {
    assert_eq!(add(multiply(3, 2), if true { subtract(3, 2) } else { 3 }), 7);
    assert_eq!(add(multiply(3, 2), if false { subtract(3, 2) } else { 3 }), 9);
    assert!(std::panic::catch_unwind(|| add(multiply(255, 2), if false { subtract(255, 2) } else { 255 })).is_err());
    let selected = if false { add(3, 2) } else { subtract(3, 2) };
    assert_eq!(multiply(selected, 2), 2);
}
