//! Pure native oracle shared with the automated translation regression.
//! Issue #759 runs Rust only in CI after every same-SHA JavaScript stage passes.

#[test]
fn tool_choice_matches_shared_translation_edge_cases_without_mutation() {
    let cases: serde_json::Value = serde_json::from_str(include_str!(
        "../fixtures/translation/openai-tool-choice.json"
    ))
    .expect("valid shared tool-choice fixtures");
    let cases = cases.as_array().expect("array of shared cases");
    assert_eq!(cases.len(), 24);
    for case in cases {
        let name = case["name"].as_str().expect("case name");
        let input = case.get("input").expect("case input");
        let expected = case.get("expected").expect("case expected result");
        let before = input.clone();
        let actual = crate::openai::translate_tool_choice(input);
        assert_eq!(&actual, expected, "{name}");
        assert_eq!(input, &before, "input changed: {name}");
    }
}
