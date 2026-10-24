// Independent scalar control oracle. CI only after all same-SHA JS stages pass.
// Preserve explicit local-return syntax for the translation oracle.
#[allow(clippy::let_and_return)]
fn branch(a: bool, b: bool, c: bool) -> bool {
    let first = !a;
    if b {
        let left = first && c;
        left
    } else {
        let right = first || c;
        right
    }
}
fn nested(a: bool, b: bool, c: bool) -> bool {
    if a {
        if b {
            c
        } else {
            !c
        }
    } else {
        let negated = !b;
        negated && c
    }
}
#[test]
fn complete_branch_truth_tables_keep_scoped_values() {
    for a in [false, true] {
        for b in [false, true] {
            for c in [false, true] {
                assert_eq!(branch(a, b, c), if b { !a && c } else { !a || c });
                let expected = if a {
                    if b {
                        c
                    } else {
                        !c
                    }
                } else {
                    !b && c
                };
                assert_eq!(nested(a, b, c), expected);
            }
        }
    }
}
