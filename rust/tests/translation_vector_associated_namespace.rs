// Independent allocation/checked-call namespace oracles. CI ONLY; ALL UNRUN.
mod translation_core { pub use std::vec; }
fn values(left: u8, right: u8, flag: bool) -> Vec<u8> {
    if !flag {
        crate::translation_core::vec![
            ::core::option::Option::expect(
                ::core::primitive::u8::checked_add(left, right),
                "attempt to add with overflow"),
            right]
    } else {
        crate::translation_core::vec![left]
    }
}
#[test]
fn qualified_allocation_preserves_checked_call_and_guard() {
    assert_eq!(values(3, 2, false), vec![5, 2]);
    assert_eq!(values(255, 1, true), vec![255]);
    assert!(std::panic::catch_unwind(|| values(255, 1, false)).is_err());
}
#[test]
fn checked_prefix_before_vector_keeps_its_original_namespace() {
    let selected = ::core::option::Option::expect(
        ::core::primitive::u8::checked_add(3, 2),
        "attempt to add with overflow");
    let result = crate::translation_core::vec![selected, 2_u8];
    assert_eq!(result, vec![5, 2]);
}
