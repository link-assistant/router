//! Ordinary construction/push/join source oracles. Only gated CI may compile.
#[path = "../src/translation_owned_text_vectors_core.rs"]
pub mod core;

#[test]
fn original_construct_push_and_shared_join_retains_input_and_vector_ownership() {
    for input in ["", "é", "🦀\0文"] {
        for separator in ["", "\n\n", ","] {
            let input = String::from(input);
            let mut original = vec![String::from("é"), input.clone()];
            original.push(input.clone());
            let mut adopted = core::vec_text_from_slice(&[String::from("é"), input.clone()]);
            adopted = core::vec_text_push(adopted,input.clone());
            assert_eq!(original.join(separator),adopted.join(separator));
            assert_eq!(original,adopted);
            assert_eq!(input.as_str(),original[1]);
        }
    }
}
#[test]
fn independent_multiple_local_constructions_do_not_alias_mutated_vectors() {
    let first = core::vec_text_from_slice(&[String::from("first")]);
    let mut second = core::vec_text_new();
    second = core::vec_text_push(second,String::from("second"));
    assert_eq!(first.join("|"),"first");
    assert_eq!(second.join("|"),"second");
    assert_eq!(core::vec_text_len(&first),1);
}

#[test]
fn nested_shared_joins_keep_the_original_vector_and_owned_separator_available() {
    for input in ["", "é", "🦀\0"] {
        let values = vec![String::from("é"),String::from(input)];
        let before = values.clone();
        let separator = values.join("");
        let outer = values.join(&separator);
        assert_eq!(outer,format!("é{}{}",separator,input));
        assert_eq!(values,before);
        assert_eq!(separator,before.join(""));
    }
}
#[test]
fn repeated_scalar_inputs_define_the_exact_source_literal_utf8_boundary() {
    let input = "é".repeat(8192);
    let values = vec![input.clone();64];
    assert_eq!(values.join("").len(),1_048_576);
    assert_eq!(values.join(""),"é".repeat(524288));
    assert_eq!(input.len(),16_384);
}
