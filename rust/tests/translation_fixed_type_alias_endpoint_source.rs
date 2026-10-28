// Independent genuine scalar alias endpoint oracle. UNRUN; gated CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
type First = scalar::U64;
type Second = First;
type Flag = scalar::Bool;
type Real = scalar::F64;
fn identity(value: Second) -> Second { value }
#[test]
fn explicit_native_alias_chains_retain_actual_scalar_assignment_domains() {
    for value in [0, 1, u64::MAX] { assert_eq!(identity(value), value); }
    let flag: Flag = false;
    assert!(!flag);
    let real: Real = -0.0;
    assert!(real.is_sign_negative());
}
