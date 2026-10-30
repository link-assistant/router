// Independent native original/adopted constant caller oracle. UNRUN; gated CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
fn original(flag: bool) -> u64 { let limit = u64::MAX; if flag { u64::MIN } else { limit } }
fn adopted(flag: scalar::Bool) -> scalar::U64 { let limit = scalar::U64::MAX; if flag { scalar::U64::MIN } else { limit } }
#[test]
fn explicit_constant_adoption_retains_original_native_branch_values() {
    for flag in [false, true] { assert_eq!(adopted(flag), original(flag)); }
    assert_eq!(adopted(false), u64::MAX);
    assert_eq!(adopted(true), 0);
    assert_eq!(scalar::I128::MIN, i128::MIN);
}
