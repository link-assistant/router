// Independent Rust oracle SOURCE. CI only after all JavaScript gates pass.
#[test]
fn octet_parsing_keeps_unicode_null_and_invalid_utf8_distinct() {
    let bytes = "{\"name\":\"é😀\"}".as_bytes().to_vec();
    let value: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    assert_eq!(value, serde_json::json!({"name":"é😀"}));
    assert_eq!(serde_json::from_slice::<serde_json::Value>(b"null").ok(), Some(serde_json::Value::Null));
    for bytes in [&[][..], &[255][..], &[192, 128][..], b"{"] {
        assert!(serde_json::from_slice::<serde_json::Value>(bytes).is_err());
    }
    let borrowed: &[u8] = &bytes;
    assert!(std::ptr::eq(borrowed.as_ptr(), bytes.as_ptr()));
}
