//! Independent standard Option pattern boundary and drop source, CI only.
fn selected<T>(value: Option<T>) -> Option<T> {
    let Some(value) = value else { return None; };
    Some(value)
}
#[test]
fn native_let_else_keeps_absence_and_moves_the_successful_payload_once() {
    assert_eq!(selected::<bool>(None), None);
    for flag in [false, true] { assert_eq!(selected(Some(flag)), Some(flag)); }
    for integer in [i64::MIN, 0, i64::MAX] { assert_eq!(selected(Some(integer)), Some(integer)); }
    assert_eq!(selected(Some(u64::MAX)), Some(u64::MAX));
    assert_eq!(selected(Some(String::from("é😀"))), Some(String::from("é😀")));
    use std::cell::Cell;
    struct Counted<'a>(&'a Cell<u8>);
    impl Drop for Counted<'_> { fn drop(&mut self) { self.0.set(self.0.get() + 1); } }
    let drops = Cell::new(0);
    let result = selected(Some(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(result);
    assert_eq!(drops.get(), 1);
}
