// Independent native module/interface oracle SOURCE. CI after same-SHA JS gates.
mod primitive_implementation {
    pub fn mask(left: u8, right: u8) -> u8 { left | right }
    pub fn unchanged(value: u128) -> u128 { value }
    pub fn moved(value: u128, count: i8) -> u128 {
        assert!((count as u128) < 128_u128, "Rust integer shift count overflow");
        value << count
    }
}
use primitive_implementation::{mask as selected_mask, unchanged, moved};
#[test]
fn private_scalar_module_public_names_preserve_native_types_and_checked_counts() {
    assert_eq!(selected_mask(85, 51), 119);
    assert_eq!(unchanged(u128::MAX), u128::MAX);
    assert_eq!(moved(1, 127), 170141183460469231731687303715884105728_u128);
    assert!(std::panic::catch_unwind(|| moved(1, -1)).is_err());
}
