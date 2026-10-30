//! Independent original explicit generic argument oracle. Gated CI only.
use std::cell::Cell;
fn raw<T>(value: T) -> T { value }
fn option<T>(value: Option<T>) -> Option<T> { value }
fn result<T>(value: Result<T, String>) -> Result<T, String> { value }
fn booleans(value: bool) -> bool { raw::<bool>(raw(value)) }
fn inferred(value: bool) -> bool { raw::<_>(raw::<bool>(value)) }
fn forwarded<T>(value: Result<T, String>) -> Result<T, String> {
    raw::<Result<T, String>>(result::<T>(value))
}
#[test]
fn original_type_arguments_preserve_boundaries_borrowing_and_nested_carriers() {
    for value in [false, true] {
        assert_eq!(booleans(value), value);
        assert_eq!(inferred(value), value);
        assert_eq!(option::<bool>(Some(value)), Some(value));
        assert_eq!(result::<bool>(Ok(value)), Ok(value));
        assert_eq!(result::<Option<bool>>(Ok(Some(value))), Ok(Some(value)));
    }
    assert_eq!(option::<bool>(None), None);
    assert_eq!(raw::<u64>(u64::MAX), u64::MAX);
    assert_eq!(raw::<i64>(i64::MIN), i64::MIN);
    let text = String::from("é😀");
    assert_eq!(raw::<&str>(&text), text);
    for error in ["", "é😀", "\0"] {
        assert_eq!(result::<bool>(Err(String::from(error))), Err(String::from(error)));
    }
}
#[test]
fn generic_whole_result_forwarding_moves_one_opaque_value_without_early_drop() {
    struct Counted<'a>(&'a Cell<usize>);
    impl Drop for Counted<'_> { fn drop(&mut self) { self.0.set(self.0.get() + 1); } }
    let drops = Cell::new(0);
    let value = forwarded(Ok(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(value);
    assert_eq!(drops.get(), 1);
    let failure = forwarded::<Counted<'_>>(Err(String::from("expected")));
    assert_eq!(drops.get(), 1);
    drop(failure);
    assert_eq!(drops.get(), 1);
}
