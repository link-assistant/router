//! Independent zero-divisor, overflow and signed rounding edge oracle source.

#[test]
fn unsigned_division_and_remainder_keep_zero_and_boundary_results() {
    let cases = [
        (0, 1, Some(0), Some(0)),
        (9, 2, Some(4), Some(1)),
        (u64::MAX, u64::MAX, Some(1), Some(0)),
        (1, 0, None, None),
        (0, 0, None, None),
    ];
    for (left, right, quotient, remainder) in cases {
        assert_eq!(left.checked_div(right), quotient);
        assert_eq!(left.checked_rem(right), remainder);
    }
}

#[test]
fn signed_results_truncate_toward_zero_and_remainder_keeps_dividend_sign() {
    let cases = [
        (-9, 2, Some(-4), Some(-1)),
        (9, -2, Some(-4), Some(1)),
        (-9, -2, Some(4), Some(-1)),
        (i64::MIN, 1, Some(i64::MIN), Some(0)),
    ];
    for (left, right, quotient, remainder) in cases {
        assert_eq!(left.checked_div(right), quotient);
        assert_eq!(left.checked_rem(right), remainder);
    }
}

#[test]
fn signed_minimum_overflow_and_zero_abort_for_both_operations() {
    let cases = [(i64::MIN, -1), (i64::MIN, 0), (i64::MAX, 0), (0, 0)];
    for (left, right) in cases {
        assert_eq!(left.checked_div(right), None);
        assert_eq!(left.checked_rem(right), None);
    }
}
