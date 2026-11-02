// Independent native caller oracle source, UNRUN. Existing CI Rust gating applies.
use link_assistant_router::translation_ordered_text_map_core::{self as maps, OrderedTextMap};

fn stream_requested(query: &OrderedTextMap) -> bool {
    maps::text_map_get(query, "stream").is_some_and(|value| matches!(value, "true" | "1"))
}

#[test]
fn request_query_caller_has_exact_scalar_truth_table() {
    assert!(!stream_requested(&maps::text_map_new()));
    for (value, expected) in [("", false), ("true", true), ("1", true), ("TRUE", false), ("false", false), (" true", false), ("true\0", false)] {
        let query = maps::text_map_insert(maps::text_map_new(), "stream".to_owned(), value.to_owned());
        assert_eq!(stream_requested(&query), expected);
        assert_eq!(maps::text_map_get(&query, "stream"), Some(value));
    }
}

#[test]
fn lookup_loan_is_rooted_in_map_and_survives_temporary_key() {
    let query = maps::text_map_insert(maps::text_map_new(), "stream".to_owned(), "true".to_owned());
    let value = { let key = String::from("stream"); maps::text_map_get(&query, key.as_str()) };
    assert_eq!(value, Some("true"));
    assert_eq!(maps::text_map_len(&query), 1);
}

#[test]
fn reverse_copy_boundary_preserves_the_original_input() {
    let original = maps::text_map_insert(maps::text_map_new(), "stream".to_owned(), "true".to_owned());
    let replacement = maps::text_map_insert(maps::text_map_copy(&original), "stream".to_owned(), "false".to_owned());
    assert!(stream_requested(&original));
    assert!(!stream_requested(&replacement));
    let removed = maps::text_map_remove(replacement, "stream");
    assert_eq!(maps::text_map_get(&removed, "stream"), None);
    assert!(stream_requested(&original));
}

#[test]
fn owned_keys_keep_scalar_order_and_survive_consumed_map_update() {
    let mut map = maps::text_map_new();
    for (key, value) in [("\u{10000}", "astral"), ("\u{e000}", "bmp"), ("a", "first"), ("a", "replacement")] {
        map = maps::text_map_insert(map, key.to_owned(), value.to_owned());
    }
    let keys: Vec<String> = maps::text_map_keys(&map);
    let updated = maps::text_map_insert(map, "z".to_owned(), "next".to_owned());
    assert_eq!(keys, ["a", "\u{e000}", "\u{10000}"]);
    assert_eq!(maps::text_map_keys(&updated), ["a", "z", "\u{e000}", "\u{10000}"]);
}

fn independently_borrowed<'ro_map>(map: &'ro_map OrderedTextMap, key: &str, _unused: &OrderedTextMap) -> Option<&'ro_map str> {
    maps::text_map_get(map, key)
}

#[test]
fn return_loan_does_not_capture_key_or_unused_map_lifetime() {
    let map = maps::text_map_insert(maps::text_map_new(), "stream".to_owned(), "true".to_owned());
    let value = {
        let key = String::from("stream");
        let unused = maps::text_map_new();
        independently_borrowed(&map, key.as_str(), &unused)
    };
    assert_eq!(value, Some("true"));
}

#[test]
fn pair_signatures_preserve_native_order_duplicates_and_owned_projection() {
    let input: Vec<(String, String)> = [("\u{10000}", "astral"), ("\u{e000}", "bmp"), ("", ""), ("x", "before"), ("x", "after")]
        .into_iter().map(|(key, value)| (key.to_owned(), value.to_owned())).collect();
    let map = maps::text_map_from_pairs(input);
    let pairs: Vec<(String, String)> = maps::text_map_pairs(&map);
    let updated = maps::text_map_insert(map, "z".to_owned(), "next".to_owned());
    let expected: Vec<(String, String)> = [("", ""), ("x", "after"), ("\u{e000}", "bmp"), ("\u{10000}", "astral")]
        .into_iter().map(|(key, value)| (key.to_owned(), value.to_owned())).collect();
    assert_eq!(pairs, expected);
    assert_eq!(maps::text_map_pairs(&maps::text_map_from_pairs(pairs)), expected);
    assert_eq!(maps::text_map_len(&updated), 5);
}

#[test]
fn pair_input_bounds_apply_before_duplicate_keys_are_collapsed() {
    let too_many = vec![("x".to_owned(), String::new()); 4097];
    assert!(std::panic::catch_unwind(|| maps::text_map_from_pairs(too_many)).is_err());
    let too_large = vec![("x".to_owned(), "a".repeat(524_288)), ("x".to_owned(), "b".repeat(524_288))];
    assert!(std::panic::catch_unwind(|| maps::text_map_from_pairs(too_large)).is_err());
}
