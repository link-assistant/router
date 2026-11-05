//! Independent checked arithmetic oracle SOURCE. Only gated CI executes Rust.
#[test]
fn actual_signed_arithmetic_has_native_bounds_and_truncating_division() {
    for (a,b,sub,mul,div,rem) in [(7_i64,2_i64,5_i64,14_i64,3_i64,1_i64),(-7,2,-9,-14,-3,-1)] {
        assert_eq!(a.checked_sub(b),Some(sub));assert_eq!(a.checked_mul(b),Some(mul));
        assert_eq!(a.checked_div(b),Some(div));assert_eq!(a.checked_rem(b),Some(rem));
    }
    assert_eq!(i64::MIN.checked_sub(1),None);assert_eq!(i64::MIN.checked_mul(-1),None);
    assert_eq!(1_i64.checked_div(0),None);assert_eq!(1_i64.checked_rem(0),None);
    assert_eq!(i64::MIN.checked_div(-1),None);assert_eq!(i64::MIN.checked_rem(-1),None);
    assert_eq!(i64::MIN.checked_neg(),None);assert_eq!(0_i64.checked_neg(),Some(0));
}
