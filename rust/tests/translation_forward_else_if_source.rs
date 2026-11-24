// Drafted translation oracle: these shapes mirror the JavaScript source the
// translator read. Clippy findings are fixed in its rules, not by hand (#772 ledger).
#![allow(clippy::missing_const_for_fn)]
#![allow(clippy::needless_bool)]
// Independent source oracle. UNRUN; Rust CI only after all same-SHA JS gates.
fn original(a: bool, b: bool) -> bool {
    if a {
        !b
    } else if b {
        true
    } else {
        false
    }
}
#[test]
fn original_else_if_conditions_and_branch_order() {
    for a in [false, true] {
        for b in [false, true] {
            assert_eq!(original(a, b), a != b);
        }
    }
}
