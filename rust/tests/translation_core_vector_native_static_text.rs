//! Independent static borrowed text oracle. Rust CI only after every JS gate.
use link_assistant_router::translation_core;
fn values(flag: bool, seed: &'static str) -> Vec<&'static str> {
    if flag { translation_core::vec![seed, seed, "Ω😀"] } else { translation_core::vec![] }
}
#[test]
fn static_values_reuse_original_borrowed_storage() {
    for seed in ["", "fixed", "Ω😀"] {
        let result = values(true, seed);
        assert_eq!(result, [seed, seed, "Ω😀"]);
        assert_eq!(result[0].as_ptr(), seed.as_ptr());
        assert_eq!(result[1].as_ptr(), seed.as_ptr());
        assert!(values(false, seed).is_empty());
    }
}
#[test]
fn escaped_literals_preserve_scalar_values() {
    let result: Vec<&'static str> = translation_core::vec!["", "Ω😀", "\u{0}\n\t", "\"\\"];
    assert_eq!(result[2].as_bytes(), &[0, 10, 9]);
    assert_eq!(result[3].as_bytes(), &[34, 92]);
}
