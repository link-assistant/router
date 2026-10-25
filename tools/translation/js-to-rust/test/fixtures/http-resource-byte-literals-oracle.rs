//! Independent byte boundary and parser behavior source, gated CI only.
#[test]
fn octet_literals_retain_width_and_parser_behavior() {
    use link_assistant_router::translation_core::json_parse_bytes;
    let boundary: Vec<u8> = vec![0, 255];
    assert_eq!(boundary, [0, 255]);
    assert_eq!(json_parse_bytes(&[110, 117, 108, 108]), Some(serde_json::Value::Null));
    assert_eq!(json_parse_bytes(&boundary), None);
    assert_eq!(json_parse_bytes(&[192, 128]), None);
    let mut bytes: Vec<u8> = vec![0];
    assert_eq!(bytes, [0]);
    bytes = vec![255];
    assert_eq!(bytes, [255]);
}
