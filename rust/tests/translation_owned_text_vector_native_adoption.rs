//! Independent bounded String-vector native oracles. CI only after JS gates.
#[path = "../src/translation_owned_text_vectors_core.rs"]
mod core;

#[test]
fn functional_constructor_push_literal_and_unicode_results_match_original_values() {
    let input = String::from("🦀\0é");
    let mut original = Vec::new();
    original.push(input.clone());
    let mut adopted = core::vec_text_new();
    let item = input.clone();
    adopted = core::vec_text_push(adopted, item);
    assert_eq!(adopted, original);
    let literal = core::vec_text_from_slice(&[String::from(""), input.clone()]);
    assert_eq!(literal, vec![String::from(""), input]);
    assert_eq!(core::vec_text_len(&literal), 2_u64);
}

#[test]
fn operand_is_evaluated_once_before_receiver_move_and_can_read_its_length() {
    let mut original = vec![String::from("seed")];
    original.push(original.len().to_string());
    let mut adopted = core::vec_text_from_slice(&[String::from("seed")]);
    let mut calls = 0;
    let item = { calls += 1; core::vec_text_len(&adopted).to_string() };
    adopted = core::vec_text_push(adopted, item);
    assert_eq!(calls, 1);
    assert_eq!(adopted, original);
}

#[test]
fn native_literal_clones_are_explicit_and_do_not_move_borrowed_slice_elements() {
    let source = vec![String::from("é"), String::from("\0")];
    let adopted = core::vec_text_from_slice(&source);
    assert_eq!(adopted, source);
    assert_eq!(source.len(), 2);
    let full = core::vec_text_from_slice(&vec![String::new(); 4096]);
    assert_eq!(core::vec_text_len(&full), 4096);
    assert!(std::panic::catch_unwind(|| core::vec_text_push(full, String::new())).is_err());
}
