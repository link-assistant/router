//! Independent JSON-vector value/borrow oracle. CI only after eight JS gates.
use link_assistant_router::translation_core::{self, Json};
fn owned(seed: Json) -> Vec<Json> {
    translation_core::vec![translation_core::json_copy(&seed), seed]
}
fn shared(seed: &Json) -> Vec<Json> {
    translation_core::vec![translation_core::json_copy(seed), translation_core::json_copy(seed)]
}
fn conditional(flag: bool, seed: Json) -> Vec<Json> {
    if flag { translation_core::vec![seed] } else { translation_core::vec![] }
}
#[test]
fn copies_preserve_values_and_independent_nested_storage() {
    let seed = translation_core::json!({"items": ["Ω😀", null]});
    let values = shared(&seed);
    assert_eq!(values, [seed.clone(), seed.clone()]);
    let a = values[0]["items"].as_array().unwrap();
    let b = values[1]["items"].as_array().unwrap();
    let original = seed["items"].as_array().unwrap();
    assert!(!std::ptr::eq(a.as_ptr(), b.as_ptr()));
    assert!(!std::ptr::eq(a.as_ptr(), original.as_ptr()));
    assert_eq!(owned(seed.clone()), values);
    assert!(conditional(false, seed.clone()).is_empty());
    assert_eq!(conditional(true, seed.clone()), [seed]);
}
