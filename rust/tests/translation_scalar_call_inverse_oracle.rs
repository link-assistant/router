// Independent native oracle. CI only after all JavaScript stages pass.
fn negate(value: bool) -> bool {
    !value
}
fn conjunction(first: bool, second: bool) -> bool {
    first && second
}
fn caller(first: bool, second: bool) -> bool {
    crate::conjunction(crate::negate(first), second)
}
fn choose(flag: bool, first: bool, second: bool) -> bool {
    crate::conjunction(if flag { first } else { second }, crate::negate(second))
}
fn pass(value: &str) -> &str {
    value
}
fn word(value: &str) -> &str {
    crate::pass(value)
}
#[test]
fn complete_boolean_call_truth_tables_and_unicode_borrows() {
    for first in [false, true] {
        for second in [false, true] {
            assert_eq!(caller(first, second), !first && second);
            for flag in [false, true] {
                assert_eq!(
                    choose(flag, first, second),
                    (if flag { first } else { second }) && !second
                );
            }
        }
    }
    for value in ["", "雪😀", "a\0b"] {
        assert_eq!(word(value), value);
    }
}
