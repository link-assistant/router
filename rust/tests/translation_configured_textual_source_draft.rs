//! Independent actual outer cfg and textual module oracle. Gated CI only.
#[cfg(any())]
unknown_inactive_producer!();
#[cfg(all())]
#[macro_use]
#[path = "../../tools/translation/test/fixtures/configured-textual/native-provider.rs"]
mod provider;
#[cfg_attr(any(), unknown::producer("original"))]
chosen!(selected);
#[test]
fn actual_inactive_items_and_false_attributes_do_not_replace_the_selected_textual_definition() {
    assert_eq!(selected(), 7);
}
