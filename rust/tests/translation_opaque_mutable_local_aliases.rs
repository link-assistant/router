// Independent opaque-mutable/immutable alias oracle SOURCE; gated native CI only.
use link_assistant_router::{translation_primitive_option_core as option_core, translation_text_core as text_core};
#[test]
fn independent_mutable_scalar_locals_preserve_immutable_text_alias_behavior() {
    for value in ["", "é😀", "failure"] {
        let alias = value;
        let mut scratch = 0_u64;
        scratch += 1;
        let original = alias.is_empty();
        assert_eq!(scratch, 1);
        let adopted_alias = value;
        let mut adopted_scratch = 0_u64;
        adopted_scratch += 1;
        assert_eq!(text_core::is_empty(adopted_alias), original);
        assert_eq!(adopted_scratch, scratch);
    }
}
#[test]
fn independent_mutable_scalar_locals_preserve_option_alias_and_boundary_values() {
    for value in [None, Some(0_u64), Some(u64::MAX)] {
        let alias = value;
        let mut scratch = 0_u64;
        scratch += 1;
        let original = alias.unwrap_or(9);
        assert_eq!(scratch, 1);
        let adopted_alias = value;
        let mut adopted_scratch = 0_u64;
        adopted_scratch += 1;
        assert_eq!(option_core::u64_unwrap_or(adopted_alias, 9), original);
        assert_eq!(adopted_scratch, scratch);
    }
}
