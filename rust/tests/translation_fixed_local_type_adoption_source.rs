// Independent native explicit local annotation oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
fn original() -> u64 { let value: u64 = u64::MAX; value }
fn adopted() -> scalar::U64 { let value: scalar::U64 = scalar::U64::MAX; value }
#[test]
fn scalar_alias_local_annotations_preserve_native_values_and_borrow_regions() {
    assert_eq!(adopted(), original());
    assert_eq!(adopted(), u64::MAX);
    let flag: scalar::Bool = true;
    assert!(flag);
    let zero: scalar::F64 = 0.0;
    assert_eq!(zero.to_bits(), 0.0_f64.to_bits());
    let signed: scalar::I128 = scalar::I128::MIN;
    assert_eq!(signed, i128::MIN);
    let borrowed: &scalar::U64 = &adopted();
    assert_eq!(*borrowed, u64::MAX);
    let array: [scalar::U16; 2] = [0, u16::MAX];
    assert_eq!(array, [0, u16::MAX]);
    let optional: Option<scalar::U32> = None;
    assert_eq!(optional, None);
}
