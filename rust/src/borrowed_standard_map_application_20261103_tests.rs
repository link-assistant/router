//! Actual application oracle source. Runs only in Rust CI after all JS gates.
use ::std::collections::BTreeMap;

#[test]
fn stream_query_matches_the_original_expression_on_large_standard_maps() {
    let mut query = BTreeMap::new();
    for index in 0..5000 {
        query.insert(format!("unused-{index}"), "unused".to_owned());
    }
    query.insert("large-unused".to_owned(), "x".repeat(1_048_577));
    assert!(!crate::openai::query_stream_requested(&query));
    for value in ["true", "1", "false", "TRUE", "", "true ", " 1", "é", "e\u{301}"] {
        query.insert("stream".to_owned(), value.to_owned());
        // Independent historical expression, not the new shared helper.
        let expected = query.get("stream").is_some_and(|text| {
            matches!(text.as_str(), "true" | "1")
        });
        assert_eq!(crate::openai::query_stream_requested(&query), expected);
        assert_eq!(query.len(), 5002);
        assert_eq!(query["large-unused"].len(), 1_048_577);
    }
    query.insert("stream".to_owned(), "x".repeat(1_048_577));
    assert!(!crate::openai::query_stream_requested(&query));
    query.remove("stream");
    assert!(!crate::openai::query_stream_requested(&query));
}

#[test]
fn stream_query_never_mutates_standard_map_entries() {
    let query = BTreeMap::from([
        ("stream".to_owned(), "true".to_owned()),
        ("Stream".to_owned(), "false".to_owned()),
        ("".to_owned(), "1".to_owned()),
    ]);
    let before = query.clone();
    assert!(crate::openai::query_stream_requested(&query));
    assert_eq!(query, before);
}
