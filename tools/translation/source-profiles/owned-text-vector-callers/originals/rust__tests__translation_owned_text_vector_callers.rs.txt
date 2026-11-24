//! Independent native ownership/oracle source. Execution is CI-only and UNRUN.
use link_assistant_router::translation_owned_text_vectors_core as core;

fn move_text(value: String) -> String { value }
fn shared_count(values: &Vec<String>) -> u64 { core::vec_text_len(values) }
fn append_text(values: Vec<String>, text: String) -> Vec<String> {
    core::vec_text_push(values, move_text(text))
}

#[test]
fn cloned_lookup_outlives_consumed_collection() {
    let values = core::vec_text_push(core::vec_text_new(), "🦀\0文".to_owned());
    let cloned = core::vec_text_get(&values, 0);
    let moved = core::vec_text_append(values, core::vec_text_new());
    assert_eq!(cloned, Some("🦀\0文".to_owned()));
    assert_eq!(shared_count(&moved), 1);
}

#[test]
fn slice_copy_and_helper_moves_preserve_independent_inputs() {
    let input = vec![String::new(), "é".to_owned()];
    let copied = core::vec_text_from_slice(&input);
    let extended = append_text(copied, "third".to_owned());
    assert_eq!(input, vec![String::new(), "é".to_owned()]);
    assert_eq!(extended, vec![String::new(), "é".to_owned(), "third".to_owned()]);
    assert_eq!(core::vec_text_get(&extended, u64::MAX), None);
}

#[test]
fn reassignment_restores_owned_vector_at_each_loop_backedge() {
    let mut values = core::vec_text_new();
    for _ in 0..3 { values = core::vec_text_push(values, "x".to_owned()); }
    assert_eq!(core::vec_text_len(&values), 3);
    assert_eq!(core::vec_text_get(&values, 2), Some("x".to_owned()));
}
