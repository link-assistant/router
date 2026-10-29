// Independent exact-value oracle; CI only after same-SHA JavaScript gates.
// SOURCE DRAFT ONLY. Do not compile or test Rust locally.
fn unsigned(value: u128) -> Vec<u128> {
    let wide: u128 = 0xffffffffffffffffffffffffffffffff;
    let copied = wide;
    vec![copied.checked_add(0).unwrap(), value, wide]
}
fn signed(value: i128) -> Vec<i128> {
    let wide: i128 = -0x80000000000000000000000000000000;
    let copied = wide;
    vec![copied.checked_add(0).unwrap(), value, wide]
}
fn choice(value: u128, flag: bool) -> Vec<u128> {
    let wide: u128 = 340282366920938463463374607431768211455;
    vec![if flag { wide } else { 0 }, value]
}
#[test]
fn exact_wide_aliases_and_choices() {
    assert_eq!(unsigned(0), vec![u128::MAX, 0, u128::MAX]);
    assert_eq!(signed(0), vec![i128::MIN, 0, i128::MIN]);
    assert_eq!(choice(3, true), vec![u128::MAX, 3]);
    assert_eq!(choice(3, false), vec![0, 3]);
}
