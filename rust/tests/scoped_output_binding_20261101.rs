// CI-only native oracle SOURCE. UNRUN; no scoped-output transport equivalence.
#[macro_use]
mod output {
    macro_rules! choose { ($value:tt) => {{ $value }}; }
}
mod child {
    pub fn inherited() -> u8 { if true { choose!(9) } else { 0 } }
}
mod shadow {
    macro_rules! choose { ($value:tt) => {{ 11 }}; }
    pub fn own() -> u8 { choose!(9) }
}
fn direct() -> u8 { choose!(7) }
#[test]
fn original_textual_scope_and_nested_body_values() {
    assert_eq!(direct(), 7);
    assert_eq!(child::inherited(), 9);
    assert_eq!(shadow::own(), 11);
}
