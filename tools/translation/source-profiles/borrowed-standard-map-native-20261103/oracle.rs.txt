// Native oracle SOURCE ONLY. Rust executes in CI after the complete JS gate.
#[path = "../src/borrowed_standard_map_20261102.rs"]
mod borrowed_map;
use ::std::collections::BTreeMap;
use borrowed_map::borrowed_text_map_matches_literals as matches;

#[test]
fn stream_query_preserves_unrestricted_standard_map_input_domain() {
    let mut map = BTreeMap::new();
    for at in 0..5000 { map.insert(format!("key-{at}"), "unused".to_owned()); }
    map.insert("huge".to_owned(), "x".repeat(1_048_577));
    assert!(!matches(&map, "stream", &["true", "1"]));
    for (value, expected) in [("true", true), ("1", true), ("false", false), ("TRUE", false), ("", false)] {
        map.insert("stream".to_owned(), value.to_owned());
        assert_eq!(matches(&map, "stream", &["true", "1"]), expected);
        assert_eq!(map.len(), 5002);
    }
    assert_eq!(map["huge"].len(), 1_048_577);
}

#[test]
fn exact_unicode_empty_and_literal_boundary_behavior() {
    let map = BTreeMap::from([("𐐀".to_owned(), "é".to_owned()), ("".to_owned(), "".to_owned())]);
    assert!(matches(&map, "𐐀", &["é"]));
    assert!(!matches(&map, "𐐀", &["e\u{301}"]));
    assert!(matches(&map, "", &[""]));
    assert!(!matches(&map, "", &[]));
    assert!(matches(&map, "𐐀", &["é"; 64]));
    assert!(std::panic::catch_unwind(|| matches(&map, "𐐀", &["é"; 65])).is_err());
}
