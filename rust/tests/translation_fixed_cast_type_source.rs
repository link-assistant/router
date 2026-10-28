// Independent native cast oracle source. UNRUN; gated Rust CI only.
#![cfg(target_pointer_width = "64")]
use link_assistant_router::translation_fixed_types_core as scalar;
#[test]
fn explicit_cast_targets_match_native_truncation_and_widening() {
    let input: scalar::U64 = u64::MAX;
    assert_eq!(input as scalar::U8, input as u8);
    assert_eq!(input as scalar::U16, input as u16);
    assert_eq!(input as scalar::U32, input as u32);
    assert_eq!(input as scalar::U64, input as u64);
    assert_eq!(input as scalar::U128, input as u128);
    assert_eq!(input as scalar::I8, input as i8);
    assert_eq!(input as scalar::I16, input as i16);
    assert_eq!(input as scalar::I32, input as i32);
    assert_eq!(input as scalar::I64, input as i64);
    assert_eq!(input as scalar::I128, input as i128);
    assert_eq!(input as scalar::Usize, input as usize);
    assert_eq!(input as scalar::Isize, input as isize);
}
#[test]
fn explicit_float_cast_targets_match_native_saturation_and_truncation() {
    assert_eq!(f64::NAN as scalar::I64, 0);
    assert_eq!(f64::INFINITY as scalar::I64, i64::MAX);
    assert_eq!(f64::NEG_INFINITY as scalar::I64, i64::MIN);
    assert_eq!(f64::NAN as scalar::U64, 0);
    assert_eq!(f64::INFINITY as scalar::U64, u64::MAX);
    assert_eq!(f64::NEG_INFINITY as scalar::U64, 0);
    assert_eq!(-1.9_f64 as scalar::I64, -1);
    assert_eq!(1.9_f64 as scalar::U64, 1);
}
