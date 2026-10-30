//! Independent fixed-point composition oracle SOURCE. CI-only after JS; UNRUN.
use link_assistant_router::{translation_primitive_option_core as option,translation_text_core as text};
#[test]
fn preceding_option_stage_after_text_substitution_matches_original() {
    for value in ["xé😀","other","x",""] {
        assert_eq!(option::str_unwrap_or(text::strip_prefix(value,"x"),"fallback"),value.strip_prefix("x").unwrap_or("fallback").to_owned());
    }
}
