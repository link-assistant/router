// Independent Rust oracle SOURCE. CI only after every JavaScript gate passes.
fn parsed(value: Result<Vec<u8>, std::io::Error>) -> Option<serde_json::Value> {
    let bytes = match value { Ok(bytes) => bytes, Err(_) => return None };
    serde_json::from_slice(&bytes).ok()
}

#[test]
fn explicit_io_fallback_preserves_null_invalid_and_absent_outcomes() {
    assert_eq!(parsed(Ok(b"null".to_vec())), Some(serde_json::Value::Null));
    assert_eq!(parsed(Ok("{\"name\":\"é😀\"}".as_bytes().to_vec())), Some(serde_json::json!({"name":"é😀"})));
    assert_eq!(parsed(Ok(vec![255])), None);
    assert_eq!(parsed(Ok(Vec::new())), None);
    assert_eq!(parsed(Err(std::io::Error::from(std::io::ErrorKind::NotFound))), None);
}
