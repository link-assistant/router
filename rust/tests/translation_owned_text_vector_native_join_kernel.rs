//! Independent canonical join-fold oracle source; gated CI only.
//! Standard-library join supplies expectations, not the JavaScript kernel.
pub use link_assistant_router::{translation_owned_text_vectors_core, translation_text_core};

fn joined(values: &::std::vec::Vec<::std::string::String>, separator: &str) -> ::std::string::String {
    let count = crate::translation_owned_text_vectors_core::vec_text_len(values);
    let _separator_bytes = crate::translation_text_core::len_utf8(separator);
    let mut output = crate::translation_text_core::to_owned("");
    let mut index = 0u64;
    while index < count {
        if index > 0u64 { output = crate::translation_text_core::append_owned(output, separator); }
        match crate::translation_owned_text_vectors_core::vec_text_get(values, index) {
            Some(value) => { output = crate::translation_text_core::append_owned(output, &value); }
            None => {}
        }
        index = index + 1u64;
    }
    output
}

#[test]
fn canonical_join_preserves_inputs_and_unicode_at_full_vector_capacity() {
    for values in [vec![], vec![String::new()], vec![String::from("é"), String::from("🦀\0文")], vec![String::from("x"); 4096]] {
        let before = values.clone();
        for separator in ["", ",", "\n"] {
            assert_eq!(joined(&values, separator), values.join(separator));
            assert_eq!(values, before);
        }
    }
}

#[test]
fn canonical_join_keeps_the_text_and_collection_resource_boundaries() {
    let value = "x".repeat(1_048_576);
    assert_eq!(joined(&vec![value.clone()], ""), value);
    assert!(std::panic::catch_unwind(|| joined(&vec!["x".repeat(1_048_576), String::from("x")], "")).is_err());
    assert!(std::panic::catch_unwind(|| joined(&vec![String::new(); 4097], "")).is_err());
    assert!(std::panic::catch_unwind(|| joined(&vec![], &"x".repeat(1_048_577))).is_err());
}
