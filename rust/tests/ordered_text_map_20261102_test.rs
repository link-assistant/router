//! Independently authored native expectations. CI only after all JS gates pass.
use link_assistant_router::translation_ordered_text_map_core::*;

#[test]
fn empty_missing_and_empty_present_are_distinct() {
    let empty = text_map_new();
    assert_eq!(text_map_len(&empty), 0);
    assert_eq!(text_map_get(&empty, ""), None);
    let present = text_map_insert(empty, String::new(), String::new());
    assert!(text_map_contains(&present, ""));
    assert_eq!(text_map_get(&present, ""), Some(""));
}

#[test]
fn native_scalar_order_duplicate_values_and_copies() {
    let pairs = [("😀", "supplementary"), ("\u{e000}", "bmp"), ("a", "old"), ("é", "accent"), ("", "empty"), ("\0", "nul"), ("a", "new")];
    let map = text_map_from_pairs(pairs.into_iter().map(|(key, value)| (key.to_owned(), value.to_owned())).collect());
    assert_eq!(text_map_keys(&map), vec!["", "\0", "a", "é", "\u{e000}", "😀"]);
    assert_eq!(text_map_get(&map, "a"), Some("new"));
    let changed = text_map_insert(text_map_copy(&map), "a".into(), "changed".into());
    assert_eq!(text_map_get(&changed, "a"), Some("changed"));
    assert_eq!(text_map_get(&map, "a"), Some("new"));
    assert_eq!(text_map_len(&text_map_remove(changed, "a")), 5);
    assert_eq!(text_map_pairs(&text_map_remove(text_map_copy(&map), "missing")), text_map_pairs(&map));
}

#[test]
fn scalar_spellings_and_special_names_are_not_normalized() {
    let map = text_map_from_pairs(vec![("é".into(), "one".into()), ("e\u{301}".into(), "two".into()), ("__proto__".into(), "safe".into())]);
    assert_eq!(text_map_len(&map), 3);
    assert_eq!(text_map_get(&map, "é"), Some("one"));
    assert_eq!(text_map_get(&map, "e\u{301}"), Some("two"));
}

#[test]
fn replacement_at_entry_bound_is_valid() {
    let map = text_map_from_pairs((0..4096).map(|index| (index.to_string(), String::new())).collect());
    assert_eq!(text_map_len(&text_map_insert(map, "0".into(), "replace".into())), 4096);
}

#[test]
#[should_panic(expected = "text map entry bound")]
fn additional_entry_exceeds_bound() {
    let map = text_map_from_pairs((0..4096).map(|index| (index.to_string(), String::new())).collect());
    text_map_insert(map, "new".into(), String::new());
}

#[test]
#[should_panic(expected = "text map input entry bound")]
fn duplicate_input_still_has_an_input_entry_bound() {
    text_map_from_pairs((0..4097).map(|_| ("same".into(), String::new())).collect());
}

#[test]
#[should_panic(expected = "text map input byte bound")]
fn superseded_input_still_counts_toward_input_bytes() {
    text_map_from_pairs(vec![("a".into(), "x".repeat(1_048_575)), ("a".into(), "replace".into())]);
}

#[test]
fn full_byte_bound_can_be_replaced_by_small_value() {
    let map = text_map_from_pairs(vec![("a".into(), "x".repeat(1_048_575))]);
    assert!(text_map_contains(&map, "a"));
    assert_eq!(text_map_pairs(&text_map_insert(map, "a".into(), "small".into())), vec![("a".into(), "small".into())]);
}

#[test]
#[should_panic(expected = "text map byte bound")]
fn complete_output_still_counts_other_entries() {
    let map = text_map_from_pairs(vec![("a".into(), "x".repeat(1_048_575))]);
    text_map_insert(map, "b".into(), String::new());
}

#[test]
#[should_panic(expected = "text map byte bound")]
fn supplementary_scalars_count_four_utf8_bytes() {
    text_map_from_pairs(vec![("a".into(), "😀".repeat(262_144))]);
}
