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
