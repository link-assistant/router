// Independent native scalar-local oracle. CI only after the complete JS gate.
fn compute(a: bool, b: bool, c: bool) -> bool {
    let first = !a;
    let second = first && b;
    second || c
}
fn conditional(a: bool, b: bool, c: bool) -> bool {
    let selected = if a { b } else { c };
    selected && b
}
#[test]
fn scalar_initializer_scopes_and_conditional_truth_tables() {
    for a in [false, true] {
        for b in [false, true] {
            for c in [false, true] {
                assert_eq!(compute(a, b, c), (!a && b) || c);
                assert_eq!(conditional(a, b, c), (if a { b } else { c }) && b);
            }
        }
    }
    assert_eq!(0_u64.checked_add(1), Some(1));
    assert_eq!((u64::MAX - 1).checked_add(1), Some(u64::MAX));
    assert_eq!(u64::MAX.checked_add(1), None);
}
