//! Independent original constructor behavior oracle. Gated CI only.

fn changed(flag: bool, value: bool) -> Option<bool> {
    if flag { Some(!value) } else { None }
}

fn extracted(value: Option<bool>) -> Option<bool> {
    if let Some(payload) = value { Some(!payload) } else { return None; }
}

fn outcome<T>(flag: bool, error: String, value: T) -> Result<T, String> {
    if flag { Ok(value) } else { Err(error) }
}

fn signed() -> Option<i64> { Some(-9223372036854775808_i64) }
fn unsigned() -> Option<u64> { Some(18446744073709551615_u64) }
fn nested() -> Option<Option<bool>> { Some(Some(true)) }

#[test]
fn original_constructors_keep_branch_payloads_absence_numeric_boundaries_and_nested_tags() {
    for flag in [false, true] {
        for value in [false, true] {
            assert_eq!(changed(flag, value), if flag { Some(!value) } else { None });
        }
    }
    assert_eq!(extracted(None), None);
    assert_eq!(extracted(Some(false)), Some(true));
    assert_eq!(extracted(Some(true)), Some(false));
    assert_eq!(signed(), Some(i64::MIN));
    assert_eq!(unsigned(), Some(u64::MAX));
    assert_eq!(nested(), Some(Some(true)));
    assert_eq!(outcome(true, String::from("unused"), 17), Ok(17));
    assert_eq!(outcome(false, String::from("é😀"), 17), Err(String::from("é😀")));
}

#[test]
fn constructed_opaque_success_values_are_moved_and_discarded_failure_values_drop_once() {
    use std::cell::Cell;
    struct Counted<'a>(&'a Cell<usize>);
    impl Drop for Counted<'_> {
        fn drop(&mut self) { self.0.set(self.0.get() + 1); }
    }
    let drops = Cell::new(0);
    let success = outcome(true, String::new(), Counted(&drops));
    assert_eq!(drops.get(), 0);
    drop(success);
    assert_eq!(drops.get(), 1);
    let failure = outcome(false, String::from("expected"), Counted(&drops));
    assert_eq!(drops.get(), 2);
    assert!(failure.is_err());
    drop(failure);
    assert_eq!(drops.get(), 2);
}
