//! Independent literal ownership/oracle source. CI-only execution, UNRUN.
use link_assistant_router::translation_owned_text_vectors_core as core;

fn moved_pair(first: String, second: String) -> Vec<String> {
    core::vec_text_from_slice(&[first, second])
}

#[test]
fn individual_strings_move_into_a_temporary_and_clone_out_independently() {
    let values = moved_pair("é".to_owned(), "🦀\0文".to_owned());
    assert_eq!(values, vec!["é".to_owned(), "🦀\0文".to_owned()]);
    let selected = core::vec_text_get(&values, 1);
    let moved = core::vec_text_append(values, core::vec_text_new());
    assert_eq!(selected, Some("🦀\0文".to_owned()));
    assert_eq!(core::vec_text_len(&moved), 2);
}

#[test]
fn empty_and_capacity_bound_literal_slice_copies_remain_independent() {
    let empty = core::vec_text_from_slice(&[]);
    assert!(empty.is_empty());
    let input = vec![String::new(); 4096];
    let copied = core::vec_text_from_slice(&input);
    assert_eq!(copied, input);
    assert_eq!(core::vec_text_get(&copied, u64::MAX), None);
}

#[test]
fn explicit_bounded_text_copies_preserve_repeated_input_uses() {
    use link_assistant_router::translation_text_core as text;
    let input = "🦀\0文";
    let mut values = core::vec_text_from_slice(&[
        text::to_owned(input),
        text::to_owned(input),
    ]);
    values = core::vec_text_push(values, text::to_owned(input));
    assert_eq!(core::vec_text_len(&values), 3);
    assert_eq!(core::vec_text_get(&values, 2), Some(input.to_owned()));
    assert_eq!(input, "🦀\0文");
}
