//! Independent branch scope/Option movement source. Execution is gated CI only.
#[allow(clippy::manual_map, clippy::manual_let_else, clippy::needless_return)]
fn selected<T>(value: Option<T>) -> Option<T> {
    if let Some(value) = value {
        Some(value)
    } else {
        return None;
    }
}

#[allow(clippy::manual_map, clippy::manual_let_else, clippy::needless_return)]
fn chained(flag: bool, value: Option<bool>) -> Option<bool> {
    if flag {
        Some(false)
    } else if let Some(value) = value {
        Some(value)
    } else {
        return None;
    }
}

#[test]
fn source_branches_keep_absence_values_lazy_else_and_original_payload_drop() {
    assert_eq!(selected::<bool>(None), None);
    for flag in [false, true] {
        assert_eq!(selected(Some(flag)), Some(flag));
        assert_eq!(chained(false, Some(flag)), Some(flag));
        assert_eq!(chained(true, Some(flag)), Some(false));
    }
    assert_eq!(chained(false, None), None);
    assert_eq!(chained(true, None), Some(false));
    for value in [i64::MIN, 0, i64::MAX] {
        assert_eq!(selected(Some(value)), Some(value));
    }
    assert_eq!(selected(Some(u64::MAX)), Some(u64::MAX));
    assert_eq!(selected(Some(String::from("é😀"))), Some(String::from("é😀")));
    use std::cell::Cell;
    struct Counted<'a>(&'a Cell<u8>);
    impl Drop for Counted<'_> {
        fn drop(&mut self) {
            self.0.set(self.0.get() + 1);
        }
    }
    let drops = Cell::new(0);
    let result = selected(Some(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(result);
    assert_eq!(drops.get(), 1);
}
