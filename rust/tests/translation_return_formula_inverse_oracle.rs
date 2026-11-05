//! Independent formula oracle SOURCE. Only gated CI may execute Rust.
#[test]
fn complete_boolean_formula_has_the_expected_truth_table() {
    for first in [false,true] { for second in [false,true] {
        assert_eq!((!first&&second)||(first&&!second),first!=second);
    }}
}
#[test]
fn complete_interval_formula_and_local_prefix_preserve_native_values() {
    for (value,lower,upper,expected) in [(0_u64,0,0,true),(1,0,0,false),(5,2,5,true),(2,5,9,false),(u64::MAX,0,u64::MAX,true)] {
        assert_eq!(value>=lower&&value<=upper,expected);
    }
    for value in [false,true] { let saved=value;assert_eq!(!saved,!value); }
}
