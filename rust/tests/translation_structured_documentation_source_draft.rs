//! Independent stable structured documentation oracle SOURCE; unrun.
#![forbid(unsafe_code)]
#![doc(html_root_url = "https://example.invalid/router", test(no_crate_inject))]

#[doc(hidden, alias = "legacy_selected")]
#[cfg_attr(any(), doc(cfg(any())))]
fn selected() -> u8 { 7 }

macro_rules! chosen {
    () => {
        #[cfg_attr(not(any()), doc(hidden, alias = "generated"), inline)]
        fn after() -> u8 { 9 }
    };
}
chosen!();

#[doc(alias("response", "reply"))]
fn answer() -> u8 { selected() + after() }

#[test]
fn native_stable_doc_metadata_preserves_original_items_and_generated_values() {
    assert_eq!(selected(), 7);
    assert_eq!(after(), 9);
    assert_eq!(answer(), 16);
}
