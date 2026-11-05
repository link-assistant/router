#[test]
fn uri_path_and_query_retains_literal_text_and_empty_query_behavior() {
    let cases: Vec<(String, String, String)> = serde_json::from_str(include_str!(
        "../../../parity/fixtures/translation/uri-path-query.json"
    ))
    .expect("independently authored URI helper fixtures must be valid JSON");

    for (path, query, expected) in cases {
        assert_eq!(super::uri_path_and_query(&path, &query), expected);
    }
}
