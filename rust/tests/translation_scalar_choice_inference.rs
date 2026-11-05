// Independent behavior oracle. CI only after all same-SHA JavaScript stages.
// SOURCE DRAFT ONLY. No local Rust execution is authorized.
fn unsigned(value: u128, flag: bool) -> Vec<u128> {
    let selected = if flag { u128::MAX } else { 0 };
    let copied = selected;
    vec![copied, selected, value]
}
fn signed(value: i128, flag: bool) -> Vec<i128> {
    let selected = if flag { i128::MIN } else { 0 };
    let copied = selected;
    vec![copied, selected, value]
}
fn scalar(value: u128, first: bool, second: bool) -> u128 {
    if first { u128::MAX } else if second { 0 } else { value }
}
fn gate(value: u8) -> bool {
    let _checked = value.checked_add(1).expect("attempt to add with overflow");
    value == 0
}
fn conditional(value: u128, input: u8) -> Vec<u128> {
    let selected = if gate(input) { u128::MAX } else { 0 };
    vec![selected, selected, value]
}
#[test]
fn scalar_local_and_return_values() {
    assert_eq!(unsigned(3, true), vec![u128::MAX, u128::MAX, 3]);
    assert_eq!(unsigned(3, false), vec![0, 0, 3]);
    assert_eq!(signed(3, true), vec![i128::MIN, i128::MIN, 3]);
    assert_eq!(signed(3, false), vec![0, 0, 3]);
    assert_eq!(scalar(3, true, false), u128::MAX);
    assert_eq!(scalar(3, false, true), 0);
    assert_eq!(scalar(3, false, false), 3);
}
#[test]
fn condition_failure_precedes_the_vector() {
    assert_eq!(conditional(3, 0), vec![u128::MAX, u128::MAX, 3]);
    assert_eq!(conditional(3, 1), vec![0, 0, 3]);
    assert!(std::panic::catch_unwind(|| conditional(3, 255)).is_err());
}
