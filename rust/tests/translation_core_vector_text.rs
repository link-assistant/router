//! Independent owned String vector oracle; CI only after all same-SHA JS gates.
use link_assistant_router::translation_core;
fn copied(seed: String) -> Vec<String> {
    translation_core::vec![
        <String as Clone>::clone(&seed),
        <String as Clone>::clone(&seed),
        seed,
    ]
}
#[test]
fn cloned_positions_keep_independent_owned_storage_and_unicode_values() {
    let mut values = copied(String::from("Ω😀"));
    assert_eq!(values, ["Ω😀", "Ω😀", "Ω😀"]);
    values[0].push('!');
    assert_eq!(values, ["Ω😀!", "Ω😀", "Ω😀"]);
    assert_eq!(copied(String::new()), ["", "", ""]);
}
