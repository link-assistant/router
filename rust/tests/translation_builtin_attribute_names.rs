//! Independent bare builtin-name namespace oracle SOURCE; gated CI only, UNRUN.
#![allow(non_camel_case_types)]

struct inline;
struct cold;
struct must_use;
struct repr;

macro_rules! inline {
    () => { false };
}

#[inline]
#[must_use = "use the selected value"]
fn selected(value: bool) -> bool {
    value
}

#[cold]
fn selected_cold(value: bool) -> bool {
    !value
}

#[repr(C)]
struct Record {
    enabled: bool,
    count: u64,
}

#[test]
fn bare_builtin_attributes_keep_their_names_across_type_and_bang_namespaces() {
    let _types = (inline, cold, must_use, repr);
    let record = Record { enabled: true, count: 7 };
    assert!(record.enabled);
    assert_eq!(record.count, 7);
    assert!(!inline!());
    for value in [false, true] {
        assert_eq!(selected(value), value);
        assert_eq!(selected_cold(value), !value);
    }
}
