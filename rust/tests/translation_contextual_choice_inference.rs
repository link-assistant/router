// Independent contextual-choice oracle. CI only after same-SHA JS gates.
// SOURCE DRAFT ONLY. No local Rust execution is authorized.
fn unsigned(value: u8, flag: bool) -> Vec<u8> {
    let selected = if flag { 0 } else { 1 };
    let copied = selected;
    vec![copied, selected, value]
}
fn signed(value: i8, flag: bool) -> Vec<i8> {
    let first = if flag { -1 } else { -2 };
    let second = if flag { -2 } else { -1 };
    let _equal = first == second;
    vec![first, second, value]
}
fn scalar(value: u8, flag: bool, select: bool) -> u8 {
    let choice = if flag { 0 } else { 1 };
    if select { choice } else { value }
}
fn default(flag: bool) -> u64 {
    let selected = if flag { 0 } else { 1 };
    selected
}
fn bitwise(value: u8, flag: bool) -> Vec<u8> {
    let selected = if flag { 0 } else { 1 };
    let result = selected & value;
    vec![result, value]
}
#[test]
fn typed_uses_and_default_results() {
    assert_eq!(unsigned(3, true), vec![0, 0, 3]);
    assert_eq!(unsigned(3, false), vec![1, 1, 3]);
    assert_eq!(signed(3, true), vec![-1, -2, 3]);
    assert_eq!(signed(3, false), vec![-2, -1, 3]);
    assert_eq!(scalar(3, true, true), 0);
    assert_eq!(scalar(3, false, true), 1);
    assert_eq!(scalar(3, true, false), 3);
    assert_eq!(default(true), 0);
    assert_eq!(default(false), 1);
    assert_eq!(bitwise(u8::MAX, true), vec![0, u8::MAX]);
    assert_eq!(bitwise(u8::MAX, false), vec![1, u8::MAX]);
}
