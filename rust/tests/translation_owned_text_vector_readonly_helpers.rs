//! Readonly str/vector helper oracle source; gated CI only.
#[path = "../src/translation_owned_text_vectors_core.rs"]
pub mod core;
fn repeated(values:&Vec<String>,suffix:&str)->String { let count=core::vec_text_len(values);suffix.repeat(count as usize) }
fn consuming(values:Vec<String>,suffix:&str)->String { let bounded=core::vec_text_truncate(values,u64::MAX);repeated(&bounded,suffix) }
#[test]
fn copied_str_arguments_preserve_shared_vector_and_own_their_result() {
    for suffix in ["","é","🦀\0"] {
        let values=vec![String::from("one"),String::from("two")];
        let before=values.clone();
        let result=repeated(&values,suffix);
        assert_eq!(result,suffix.repeat(2));
        assert_eq!(values,before);
        assert_eq!(consuming(values,suffix),result);
    }
}
#[test]
fn readonly_text_loans_end_after_calls_and_allow_later_owner_moves() {
    let values=vec![String::from("value")];
    let suffix=String::from("🦀");
    let result=repeated(&values,suffix.as_str());
    let moved=suffix;
    assert_eq!(moved,result);
    assert_eq!(values,vec![String::from("value")]);
}
