//! Independent real generic Option ABI movement oracle. Gated CI only.
use link_assistant_router::translation_primitive_option_core::option_identity;
use std::cell::Cell;

#[test]
fn generic_library_keeps_absence_scalars_unicode_and_payload_drop_timing() {
    assert_eq!(option_identity::<bool>(None), None);
    for value in [false, true] {
        assert_eq!(option_identity(Some(value)), Some(value));
    }
    assert_eq!(option_identity(Some(u64::MAX)), Some(u64::MAX));
    assert_eq!(option_identity(Some(i64::MIN)), Some(i64::MIN));
    assert_eq!(option_identity(Some(String::from("é😀"))), Some(String::from("é😀")));
    struct Counted<'a>(&'a Cell<u8>);
    impl Drop for Counted<'_> {
        fn drop(&mut self) {
            self.0.set(self.0.get() + 1);
        }
    }
    let drops = Cell::new(0);
    let returned = option_identity(Some(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(returned);
    assert_eq!(drops.get(), 1);
}
