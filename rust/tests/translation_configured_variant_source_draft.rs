//! Independent Rust cfg/variant and registered tool namespace source, CI only.
mod fixture {
    pub enum Choice<T> {
        #[cfg(any())]
        rustfmt(T),
        #[cfg(all())]
        Value(T),
    }
    use Choice::*;
    #[rustfmt::skip]
    pub fn selected(value: bool) -> bool { let Value(value) = Value(value); value }
}
#[test]
fn inactive_variants_do_not_enter_the_original_glob_or_shadow_the_tool_prefix() {
    assert!(fixture::selected(true));
    assert!(!fixture::selected(false));
}
