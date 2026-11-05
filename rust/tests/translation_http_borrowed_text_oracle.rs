//! Independent root/lifetime oracle SOURCE. Run only in JavaScript-gated CI.
use link_assistant_router::translation_http_protocol_core as http;
use serde_json::json;

fn encoded<'a>(value: &'a serde_json::Value) -> Result<&'a str, String> {
    http::http_body_base64(value)
}

#[test]
fn original_response_owns_borrowed_encoded_text() {
    let response = http::http_response(200, &json!([]), "w6nwn5iA").unwrap();
    let first = encoded(&response).unwrap();
    let second = encoded(&response).unwrap();
    assert_eq!(first, "w6nwn5iA");
    assert_eq!(first.as_ptr(), second.as_ptr());
    assert_eq!(http::http_body_text(&response), Ok("é😀".to_owned()));
    assert!(encoded(&json!(null)).is_err());
}
