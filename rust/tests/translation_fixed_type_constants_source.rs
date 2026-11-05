// Independent native alias constant oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
#[test]
fn actual_alias_extremes_match_all_ten_native_scalar_domains() {
    assert_eq!(scalar::U8::MIN, u8::MIN);
    assert_eq!(scalar::U8::MAX, u8::MAX);
    assert_eq!(scalar::U16::MIN, u16::MIN);
    assert_eq!(scalar::U16::MAX, u16::MAX);
    assert_eq!(scalar::U32::MIN, u32::MIN);
    assert_eq!(scalar::U32::MAX, u32::MAX);
    assert_eq!(scalar::U64::MIN, u64::MIN);
    assert_eq!(scalar::U64::MAX, u64::MAX);
    assert_eq!(scalar::U128::MIN, u128::MIN);
    assert_eq!(scalar::U128::MAX, u128::MAX);
    assert_eq!(scalar::I8::MIN, i8::MIN);
    assert_eq!(scalar::I8::MAX, i8::MAX);
    assert_eq!(scalar::I16::MIN, i16::MIN);
    assert_eq!(scalar::I16::MAX, i16::MAX);
    assert_eq!(scalar::I32::MIN, i32::MIN);
    assert_eq!(scalar::I32::MAX, i32::MAX);
    assert_eq!(scalar::I64::MIN, i64::MIN);
    assert_eq!(scalar::I64::MAX, i64::MAX);
    assert_eq!(scalar::I128::MIN, i128::MIN);
    assert_eq!(scalar::I128::MAX, i128::MAX);
    assert_eq!(scalar::U128::MAX, 340282366920938463463374607431768211455);
    assert_eq!(scalar::I128::MIN, -170141183460469231731687303715884105728);
}
