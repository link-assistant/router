//! Independent native active cfg_attr oracle SOURCE; unrun.
#![cfg_attr(all(), forbid(unsafe_code), cfg_attr(not(any()), allow(dead_code)))]

#[cfg_attr(not(any()), macro_use)]
#[path = "../../tools/translation/test/fixtures/active-conditional/native-provider.rs"]
mod provider;

chosen!(after);

/// Documentation remains attached before conditional attribute expansion.
#[cfg_attr(all(), doc = "first", cfg_attr(any(), unknown_attribute), doc = "second")]
fn selected() -> u8 { after() }

#[cfg_attr(all(), cfg(any()), doc = "absent")]
compile_error!("inactive conditional item must not expand");

#[test]
fn native_recursive_conditional_attrs_preserve_items_and_macro_use() {
    assert_eq!(selected(), 7);
}
