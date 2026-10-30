//! Independent original no-else continuation oracle. Gated CI only.
fn changed(value: Option<bool>) -> Option<bool> {
    if let Some(payload) = value { return Some(!payload); }
    None
}
fn forwarded<T>(value: Option<T>) -> Option<T> {
    if let Some(payload) = value { return Some(payload); }
    return None;
}
#[test]
fn real_missing_alternative_keeps_absence_and_computes_the_success_payload() {
    assert_eq!(changed(None), None);
    assert_eq!(changed(Some(false)), Some(true));
    assert_eq!(changed(Some(true)), Some(false));
    assert_eq!(forwarded::<String>(None), None);
    assert_eq!(forwarded(Some(String::from("é😀"))), Some(String::from("é😀")));
}
#[test]
fn no_early_drop_observes_the_generic_success_payload() {
    use std::cell::Cell;
    struct Counted<'a>(&'a Cell<usize>);
    impl Drop for Counted<'_> {
        fn drop(&mut self) { self.0.set(self.0.get() + 1); }
    }
    let drops = Cell::new(0);
    let value = forwarded(Some(Counted(&drops)));
    assert_eq!(drops.get(), 0);
    drop(value);
    assert_eq!(drops.get(), 1);
}
