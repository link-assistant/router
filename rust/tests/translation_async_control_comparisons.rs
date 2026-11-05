// Independent primitive branch oracle SOURCE; CI only after JavaScript gates.
#[test]
fn exact_u64_order_preserves_values_above_binary64_and_all_boundaries() {
    let cases = [
        (0_u64, 0_u64, [true, false, false, true, false, true]),
        (0, 1, [false, true, true, true, false, false]),
        (1, 0, [false, true, false, false, true, true]),
        (u64::MAX, u64::MAX, [true, false, false, true, false, true]),
        (9007199254740992, 9007199254740993, [false, true, true, true, false, false]),
    ];
    for (left, right, expected) in cases {
        assert_eq!([left == right, left != right, left < right, left <= right, left > right, left >= right], expected);
    }
}
#[test]
fn primitive_boolean_equality_and_composed_conditions_preserve_truth_tables() {
    for (left, right, equal) in [(false, false, true), (false, true, false), (true, false, false), (true, true, true)] {
        assert_eq!(left == right, equal);
        assert_eq!(left != right, !equal);
    }
    fn composed(amount: u64, upper: u64, ready: bool) -> bool { (amount < upper && ready) || amount == 0 }
    assert!(composed(1, 2, true));
    assert!(!composed(1, 2, false));
    assert!(composed(0, 0, false));
}
