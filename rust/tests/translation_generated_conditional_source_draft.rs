//! Independent generated conditional native oracle SOURCE; unrun.
#![forbid(unsafe_code)]

macro_rules! chosen {
    () => {
        #[cfg_attr(not(any()), doc = "generated α😀", allow(dead_code))]
        fn after() -> u8 { 7 }

        // Native configuration must remove this before literal type checking.
        #[cfg_attr(all(), cfg(any()))]
        fn hidden() -> u8 { 999 }
    };
}

chosen!();

#[test]
fn native_generated_configuration_preserves_selected_behavior() {
    assert_eq!(after(), 7);
}
