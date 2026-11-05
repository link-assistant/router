//! Independent native builtin metadata oracle SOURCE; unrun.
#![forbid(unsafe_code)]
#![allow(dead_code)]

#[repr(C, align(8))]
struct Packet { byte: u8 }

#[repr(packed)]
struct Packed { byte: u8, word: u16 }

#[repr(u8)]
#[non_exhaustive]
enum Choice { First = 1, Second = 2 }

#[inline(always)]
#[must_use = "consume the selected value"]
fn selected() -> u8 { 7 }

#[cold]
fn cold_selected() -> u8 { selected() }

#[track_caller]
fn caller() -> &'static std::panic::Location<'static> { std::panic::Location::caller() }

#[deprecated(since = "0.1.0", note = "native diagnostics remain a separate contract")]
fn legacy() -> u8 { 9 }

macro_rules! generated {
    () => {
        #[cfg_attr(not(any()), inline(never), must_use = "native generated")]
        fn after() -> u8 { 11 }
    };
}
generated!();

#[test]
#[allow(deprecated)]
fn native_builtin_metadata_keeps_behavior_layout_and_caller_location_observable() {
    assert_eq!(cold_selected(), 7);
    assert_eq!(after(), 11);
    assert_eq!(legacy(), 9);
    assert_eq!(std::mem::align_of::<Packet>(), 8);
    assert_eq!(std::mem::size_of::<Packet>(), 8);
    assert_eq!(std::mem::align_of::<Packed>(), 1);
    assert_eq!(std::mem::size_of::<Packed>(), 3);
    assert_eq!(std::mem::size_of::<Choice>(), 1);
    let expected = line!() + 1;
    let location = caller();
    assert_eq!(location.line(), expected);
    assert!(location.file().ends_with("translation_common_builtin_metadata_source_draft.rs"));
}
