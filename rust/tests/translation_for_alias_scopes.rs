// Independent ordinary-for immutable alias oracle SOURCE; gated CI only, UNRUN.
use link_assistant_router::{translation_integer_core as integer, translation_text_core as text, translation_primitive_option_core as option};
#[test]
fn real_loop_calls_preserve_zero_and_count_order_with_copy_and_shared_aliases() {
    for count in [0_u64, 1, 3] {
        for value in [0_u64, 1, u64::MAX] {
            let alias = value;
            let mut original = 0_u64;
            for _index in 0_u64..count { if alias.saturating_add(1) > 0 { original += 1; } }
            let mut adopted = 0_u64;
            for _index in 0_u64..count { if integer::u64_saturating_add(alias, 1) > 0 { adopted += 1; } }
            assert_eq!(adopted, original);
        }
        for value in ["", "é😀"] {
            let alias = value;
            let mut original = 0_u64;
            for _index in 0_u64..count { if !alias.is_empty() { original += 1; } }
            let mut adopted = 0_u64;
            for _index in 0_u64..count { if !text::is_empty(alias) { adopted += 1; } }
            assert_eq!(adopted, original);
        }
        for value in [None, Some(0_u64), Some(1), Some(u64::MAX)] {
            let alias = value;
            let mut original = 0_u64;
            for _index in 0_u64..count { if alias.unwrap_or(0) > 0 { original += 1; } }
            let mut adopted = 0_u64;
            for _index in 0_u64..count { if option::u64_unwrap_or(alias, 0) > 0 { adopted += 1; } }
            assert_eq!(adopted, original);
        }
    }
}
#[test]
fn actual_for_pattern_shadowing_does_not_change_the_outer_alias() {
    let alias = "outer";
    for alias in ["", "é😀"] { assert_eq!(text::is_empty(alias), alias.is_empty()); }
    assert_eq!(alias, "outer");
}
