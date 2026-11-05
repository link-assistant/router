// Independent native type-alias adoption oracle. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
fn ordinary(value: u64) -> u64 { value }
fn adopted(value: scalar::U64) -> scalar::U64 { value }
fn nested(value: Option<(scalar::U64, scalar::Bool)>) -> Option<(u64, bool)> { value }
fn borrow(value: &mut scalar::U32) -> &mut u32 { value }
const LIMIT: scalar::U64 = u64::MAX;
#[test]
fn qualified_alias_adoption_retains_native_assignment_domains() {
    for value in [0, 1, u64::MAX] { assert_eq!(adopted(value), ordinary(value)); }
    assert_eq!(nested(Some((u64::MAX, false))), Some((u64::MAX, false)));
    assert_eq!(nested(None), None);
    assert_eq!(LIMIT, u64::MAX);
    let mut value: u32 = u32::MAX;
    *borrow(&mut value) = 0;
    assert_eq!(value, 0);
    let signed: scalar::I128 = i128::MIN;
    let native: i128 = signed;
    assert_eq!(native, i128::MIN);
}
