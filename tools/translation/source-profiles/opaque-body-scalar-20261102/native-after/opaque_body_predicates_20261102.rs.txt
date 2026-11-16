//! Independent predicate edge oracle source. CI only after all eight JS gates.

fn predicates(left: u64, right: u64) -> [bool; 6] {
    [left == right, left != right, left < right, left <= right, left > right, left >= right]
}

#[test]
fn unsigned_boundaries_keep_all_six_relations() {
    let cases = [
        (0, 0, [true, false, false, true, false, true]),
        (0, 1, [false, true, true, true, false, false]),
        (1, 0, [false, true, false, false, true, true]),
        (u64::MAX - 1, u64::MAX, [false, true, true, true, false, false]),
        (u64::MAX, u64::MAX - 1, [false, true, false, false, true, true]),
        (u64::MAX, u64::MAX, [true, false, false, true, false, true]),
    ];
    for (left, right, expected) in cases {
        assert_eq!(predicates(left, right), expected);
    }
}

#[test]
fn boolean_operators_keep_truth_tables_and_short_circuit_order() {
    let cases = [
        (false, false, false, false, 0, 1),
        (false, true, false, true, 0, 1),
        (true, false, false, true, 1, 0),
        (true, true, true, true, 1, 0),
    ];
    for (left, right, and_expected, or_expected, and_calls, or_calls) in cases {
        let mut calls = 0;
        let and = left && {
            calls += 1;
            right
        };
        assert_eq!(and, and_expected);
        assert_eq!(calls, and_calls);
        calls = 0;
        let or = left || {
            calls += 1;
            right
        };
        assert_eq!(or, or_expected);
        assert_eq!(calls, or_calls);
    }
}

#[test]
fn signed_and_unicode_equality_edges_remain_distinct() {
    let signed = [i64::MIN, -1, 0, i64::MAX];
    for pair in signed.windows(2) {
        assert!(pair[0] < pair[1]);
    }
    let cases = [("\u{e9}", "e\u{301}", false), ("\u{1f600}", "\u{1f600}", true), ("", "\0", false)];
    for (left, right, expected) in cases {
        assert_eq!(left == right, expected);
    }
}
