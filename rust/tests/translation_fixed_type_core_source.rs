// Independent actual native scalar aliases. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
#[test]
fn explicit_scalar_alias_domains_match_native_intrinsics() {
    assert_eq!(std::mem::size_of::<scalar::U8>(), 1);
    assert_eq!(std::mem::size_of::<scalar::U16>(), 2);
    assert_eq!(std::mem::size_of::<scalar::U32>(), 4);
    assert_eq!(std::mem::size_of::<scalar::U64>(), 8);
    assert_eq!(std::mem::size_of::<scalar::U128>(), 16);
    assert_eq!(std::mem::size_of::<scalar::I8>(), 1);
    assert_eq!(std::mem::size_of::<scalar::I16>(), 2);
    assert_eq!(std::mem::size_of::<scalar::I32>(), 4);
    assert_eq!(std::mem::size_of::<scalar::I64>(), 8);
    assert_eq!(std::mem::size_of::<scalar::I128>(), 16);
    assert_eq!(scalar::U128::MAX, 340282366920938463463374607431768211455);
    assert_eq!(scalar::I128::MIN, -170141183460469231731687303715884105728);
    let flag: scalar::Bool = true;
    assert!(flag);
    let negative_zero: scalar::F64 = -0.0;
    assert!(negative_zero.is_sign_negative());
    let nan: scalar::F64 = f64::NAN;
    assert!(nan.is_nan());
}
