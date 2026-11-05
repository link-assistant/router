//! Independent original Rust textual-scope oracle. Gated CI only; never local.
macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 7 } }; }

mod first {
    chosen!(inherited);
    macro_rules! chosen { ($name:ident) => { pub fn $name() -> u8 { 9 } }; }
    chosen!(shadowed);
    pub mod deep { chosen!(nested); }
}
mod sibling { chosen!(separate); }
chosen!(after);

#[test]
fn prior_textual_definitions_enter_children_and_shadow_only_within_their_scope() {
    assert_eq!(first::inherited(), 7);
    assert_eq!(first::shadowed(), 9);
    assert_eq!(first::deep::nested(), 9);
    assert_eq!(sibling::separate(), 7);
    assert_eq!(after(), 7);
}
