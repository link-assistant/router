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

fn original_branches<T>(value: Option<T>) -> Option<T> {
    if let Some(payload) = value {
        return Some(payload);
    } else {
        return None;
    }
}

fn original_alternative<T>(value: Option<T>) -> Option<T> {
    let Some(payload) = value else { return None; };
    Some(payload)
}

fn original_propagation<T>(value: Option<T>) -> Option<T> {
    let payload: T = value?;
    Some(payload)
}

fn original_forwarded<T>(value: Option<T>) -> Option<T> {
    let alias = option_identity(value);
    original_branches(alias)
}

#[test]
fn original_generic_carrier_forms_move_opaque_values_without_early_or_duplicate_drop() {
    struct Counted(std::rc::Rc<Cell<usize>>);
    impl Drop for Counted {
        fn drop(&mut self) {
            self.0.set(self.0.get() + 1);
        }
    }
    let drops = std::rc::Rc::new(Cell::new(0));
    let operations: [fn(Option<Counted>) -> Option<Counted>; 4] = [
        original_branches,
        original_alternative,
        original_propagation,
        original_forwarded,
    ];
    for (index, operation) in operations.into_iter().enumerate() {
        assert!(operation(None).is_none());
        assert_eq!(drops.get(), index);
        let returned = operation(Some(Counted(drops.clone())));
        assert!(returned.is_some());
        assert_eq!(drops.get(), index);
        drop(returned);
        assert_eq!(drops.get(), index + 1);
    }
}
