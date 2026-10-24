//! Native oracle SOURCE; execute in CI after the complete same-SHA JS gate.
use link_assistant_router as router;
use router::translation_core::Json;

#[test]
fn signed_endpoints_and_zero_keep_native_number_domains() {
    for value in [i64::MIN, -1, 0, 1, i64::MAX] {
        let json = Json::from(value);
        assert_eq!(json.as_i64(), Some(value));
        assert_eq!(json.as_u64(), u64::try_from(value).ok());
    }
    assert_eq!(Json::from(u64::MAX).as_i64(), None);
    assert_eq!(Json::from(u64::MAX).as_u64(), Some(u64::MAX));
}

#[test]
fn borrowed_map_lookup_preserves_unicode_null_and_missing_semantics() {
    let mut values = serde_json::Map::new();
    values.insert("λ😀".to_owned(), Json::String("value".to_owned()));
    values.insert("null".to_owned(), Json::Null);
    assert_eq!(router::translation_core::json_map_index(&values, "λ😀"), &Json::String("value".to_owned()));
    assert_eq!(router::translation_core::json_map_index(&values, "null"), &Json::Null);
    assert_eq!(router::translation_core::json_map_index(&values, "absent"), &Json::Null);
}
