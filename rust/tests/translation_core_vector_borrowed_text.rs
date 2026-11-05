//! Independent borrowed/static str vector oracle; CI only after all JS gates.
use link_assistant_router::translation_core;
fn repeated(seed: &str) -> Vec<&str> { translation_core::vec![seed; 3] }
fn empty(seed: &str) -> Vec<&str> { translation_core::vec![seed; 0] }
fn fixed() -> Vec<&'static str> { translation_core::vec!["Ω😀"; 2] }
#[test]
fn repeated_borrows_keep_values_and_original_storage() {
    let owner = String::from("Ω😀");
    let values = repeated(&owner);
    assert_eq!(values, ["Ω😀", "Ω😀", "Ω😀"]);
    for value in values { assert!(std::ptr::eq(value.as_ptr(), owner.as_ptr())); }
    assert!(empty(&owner).is_empty());
    assert_eq!(fixed(), ["Ω😀", "Ω😀"]);
}
