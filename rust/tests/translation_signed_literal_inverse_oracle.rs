//! Independent numeric oracle SOURCE. Rust executes only in gated CI.
#[test]
fn actual_signed_extreme_and_cross_zero_values_retain_native_domains() {
    let minimum:i64=-9223372036854775808_i64;
    let maximum:i64=9223372036854775807_i64;
    assert_eq!(minimum,i64::MIN);assert_eq!(maximum,i64::MAX);
    assert_eq!(-1_i64+1,0_i64);assert_eq!(2_i64-5,-3_i64);
    assert_eq!(i8::MIN,-128_i8);assert_eq!(i8::MAX,127_i8);
    assert_eq!(0_u64.checked_sub(1),None);
    assert_eq!(minimum.checked_sub(1),None);assert_eq!(maximum.checked_add(1),None);
}
