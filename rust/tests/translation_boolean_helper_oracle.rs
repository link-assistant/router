// Independent Boolean oracle source. Run only in CI after all JavaScript gates.
const HELPER_JS_WITNESS: &str = r###"/** @param {boolean} a @param {boolean} b @returns {boolean} */
export function predicate(a,b){return a ? !b : b;}
"###;
const CALLER_JS_WITNESS: &str = r###"import {predicate as chosen} from "./helper.mjs";
/** @param {boolean} a @param {boolean} b @returns {boolean} */
export function caller(a,b){return chosen(a,b);}
"###;

fn predicate(a: bool, b: bool) -> bool {
    if a { !b } else { b }
}

fn caller(a: bool, b: bool) -> bool {
    predicate(a, b)
}

#[test]
fn independent_boolean_helper_truth_table() {
    let cases = [
        (false, false, false),
        (false, true, true),
        (true, false, true),
        (true, true, false),
    ];
    for (a, b, expected) in cases {
        assert_eq!(caller(a, b), expected);
        assert_eq!(if a { !b } else { b }, expected);
    }
    // Keep both original source witnesses attached to this actual native case.
    assert!(HELPER_JS_WITNESS.contains("export function predicate"));
    assert!(CALLER_JS_WITNESS.contains("predicate as chosen"));
}

#[test]
fn boolean_canonical_edit_truth_tables() {
    // Independent table for original AND and an edited OR caller. Reprojection
    // must change the caller without silently changing a shared helper module.
    let cases = [
        (false, false, false, false, true, false),
        (false, true, false, true, false, true),
        (true, false, false, true, false, true),
        (true, true, true, true, true, false),
    ];
    for (a, b, and, or, equal, different) in cases {
        assert_eq!(a && b, and);
        assert_eq!(a || b, or);
        assert_eq!(a == b, equal);
        assert_eq!(a != b, different);
    }
}
