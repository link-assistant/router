// Independent original operators versus existing paired core. UNRUN; gated CI only.
use link_assistant_router::translation_text_core as text;
// This source shape is the behavior being translated, so retain the assignment.
#[allow(clippy::assign_op_pattern)]
fn assignment_add(mut output: String, value: &str) -> String {
    output = output + value;
    output
}
#[test]
fn original_add_and_add_assign_retain_allocation_and_match_paired_append() {
    for value in ["", "é😀", "a\0b", " é😀 "] {
        let mut original = String::with_capacity(128);
        original.push_str("prefix");
        let original_pointer = original.as_ptr();
        let mut mirror = String::with_capacity(128);
        mirror.push_str("prefix");
        let mirror_pointer = mirror.as_ptr();
        original += value;
        let mirror = text::append_owned(mirror, value);
        assert_eq!(original, mirror);
        assert_eq!(original.as_ptr(), original_pointer);
        assert_eq!(mirror.as_ptr(), mirror_pointer);
        let original = assignment_add(original, "tail");
        let mirror = text::append_owned(mirror, "tail");
        assert_eq!(original, mirror);
        assert_eq!(original.as_ptr(), original_pointer);
        assert_eq!(mirror.as_ptr(), mirror_pointer);
    }
}
