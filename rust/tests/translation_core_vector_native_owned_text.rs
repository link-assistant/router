//! Independent qualified standard String ownership oracle; gated Rust CI only.
use link_assistant_router::translation_core;
fn values(flag: bool, seed: String) -> Vec<String> {
    if flag {
        translation_core::vec![
            ::std::borrow::ToOwned::to_owned(&seed),
            ::std::borrow::ToOwned::to_owned(&seed),
            ::std::borrow::ToOwned::to_owned("Ω😀"),
        ]
    } else { translation_core::vec![] }
}
#[test]
fn output_strings_have_independent_owned_buffers_without_a_new_text_size_limit() {
    for seed in [String::new(), String::from("Ω😀"), "x".repeat(1_048_577)] {
        let result = values(true, seed.clone());
        assert_eq!(result, [seed.clone(), seed.clone(), String::from("Ω😀")]);
        if !seed.is_empty() {
            assert_ne!(result[0].as_ptr(), seed.as_ptr());
            assert_ne!(result[0].as_ptr(), result[1].as_ptr());
        }
        assert!(values(false, seed).is_empty());
    }
}
