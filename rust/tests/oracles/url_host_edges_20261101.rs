//! Independent pinned url2.5.8 host oracle SOURCE, entirely UNRUN.
//! Native success outside the translated domain is explicitly not target parity.
use serde_json::Value;
use std::collections::BTreeSet;

#[test]
fn actual_locked_url_parser_retains_numeric_dns_ipv6_and_idna_boundaries() {
    let data: Value = serde_json::from_str(include_str!(
        "../fixtures/persistent-url-host-boundaries-20261101.json"
    )).expect("independent host-boundary expectations");
    assert_eq!(data["upstream"], "url2.5.8");
    let mut seen = BTreeSet::new();
    let rows = data["rows"].as_array().expect("all independent URL cases");
    assert_eq!(rows.len(), 18);
    for row in rows {
        let input = row["input"].as_str().expect("actual full URL");
        assert!(seen.insert(input), "duplicate native host case");
        let parsed = url::Url::parse(input);
        if row["nativeCanonical"].is_null() {
            assert!(parsed.is_err(), "invalid numeric-host URL was accepted: {input}");
        } else {
            let expected = row["nativeCanonical"].as_str().expect("independent complete canonical URL");
            assert_eq!(parsed.expect("valid native URL domain").as_str(), expected, "{input}");
        }
    }
}
