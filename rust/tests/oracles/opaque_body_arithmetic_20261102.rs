//! Independent checked arithmetic boundary and evaluation-order source.

#[test]
fn unsigned_checked_arithmetic_covers_zero_order_and_overflow() {
    let cases = [
        (0, 0, Some(0), Some(0), Some(0)),
        (0, 1, Some(1), None, Some(0)),
        (1, 0, Some(1), Some(1), Some(0)),
        (7, 9, Some(16), None, Some(63)),
        (u64::MAX, 1, None, Some(u64::MAX - 1), Some(u64::MAX)),
        (u64::MAX, 2, None, Some(u64::MAX - 2), None),
    ];
    for (left, right, add, sub, mul) in cases {
        assert_eq!(left.checked_add(right), add);
        assert_eq!(left.checked_sub(right), sub);
        assert_eq!(left.checked_mul(right), mul);
    }
}

#[test]
fn signed_minimum_and_negative_results_keep_checked_domains() {
    let cases = [
        (i64::MIN, -1, None, Some(i64::MIN + 1), None),
        (i64::MAX, 1, None, Some(i64::MAX - 1), Some(i64::MAX)),
        (-7, 9, Some(2), Some(-16), Some(-63)),
        (0, -1, Some(-1), Some(1), Some(0)),
    ];
    for (left, right, add, sub, mul) in cases {
        assert_eq!(left.checked_add(right), add);
        assert_eq!(left.checked_sub(right), sub);
        assert_eq!(left.checked_mul(right), mul);
    }
}

fn left(trace: &mut Vec<char>) -> u64 {
    trace.push('L');
    3
}

fn right(trace: &mut Vec<char>) -> u64 {
    trace.push('R');
    5
}

#[test]
fn operand_effect_order_is_left_then_right_for_both_operations() {
    let mut trace = Vec::new();
    let sum = left(&mut trace) + right(&mut trace);
    assert_eq!(sum, 8);
    assert_eq!(trace, ['L', 'R']);
    trace.clear();
    let product = left(&mut trace) * right(&mut trace);
    assert_eq!(product, 15);
    assert_eq!(trace, ['L', 'R']);
}
