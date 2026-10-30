// Independent native machine scalar oracle source. UNRUN; gated Rust CI only.
use link_assistant_router::translation_fixed_types_core as scalar;
fn count(value: scalar::Usize) -> scalar::Usize { value }
fn delta(value: scalar::Isize) -> scalar::Isize { value }
#[test]
fn actual_machine_aliases_retain_native_pointer_width_and_identity() {
    assert_eq!(std::mem::size_of::<scalar::Usize>(), std::mem::size_of::<usize>());
    assert_eq!(std::mem::size_of::<scalar::Isize>(), std::mem::size_of::<isize>());
    for value in [usize::MIN, 1, usize::MAX] { assert_eq!(count(value), value); }
    for value in [isize::MIN, -1, 0, 1, isize::MAX] { assert_eq!(delta(value), value); }
}
#[cfg(target_pointer_width = "64")]
#[test]
fn translation_profile_boundaries_match_native_sixty_four_bit_domains() {
    assert_eq!(scalar::Usize::MAX, 18446744073709551615);
    assert_eq!(scalar::Isize::MIN, -9223372036854775808);
    assert_eq!(scalar::Isize::MAX, 9223372036854775807);
}
