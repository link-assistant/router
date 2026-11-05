//! Independent native HTTP value oracle source; no local Rust execution.
use link_assistant_router::translation_http_protocol_core as http;
use serde_json::json;

#[test]
fn duplicate_binary_headers_keep_order_and_replace_at_the_first_old_position() {
    let values = json!([["Set-Cookie", "YT0x"], ["X-Other", ""], ["SET-cookie", "Yj0y"], ["x-binary", "/w=="]]);
    assert_eq!(http::http_headers_get_all(&values, "sEt-CoOkIe"), Ok(json!(["YT0x", "Yj0y"])));
    assert_eq!(http::http_headers_set(&values, "set-cookie", "bmV4dA=="), Ok(json!([["set-cookie", "bmV4dA=="], ["x-other", ""], ["x-binary", "/w=="]])));
    assert_eq!(http::http_headers_remove(&values, "SET-cookie"), Ok(json!([["x-other", ""], ["x-binary", "/w=="]])));
    assert_eq!(http::http_headers_append(&json!([]), "X-Empty", ""), Ok(json!([["x-empty", ""]])));
}

#[test]
fn header_controls_and_noncanonical_base64_remain_errors() {
    for encoded in ["AA==", "DQo=", "fw=="] {
        assert_eq!(http::http_headers_append(&json!([]), "x-value", encoded), Err("invalid HTTP header value".to_owned()));
    }
    assert_eq!(http::http_headers_append(&json!([]), "x-value", "YQ"), Err("invalid HTTP base64".to_owned()));
    assert_eq!(http::http_headers_append(&json!([]), &"x".repeat(257), ""), Err("HTTP header name bound".to_owned()));
    assert_eq!(http::http_headers_normalize(&json!(vec![["x", ""]; 129])), Err("HTTP header count bound".to_owned()));
}

#[test]
fn status_and_body_values_preserve_empty_nonstandard_binary_and_json_null() {
    for status in [100, 199, 200, 299, 300, 599, 618, 999] {
        let value = http::http_response(status, &json!([]), "").unwrap();
        assert_eq!(http::http_status(&value), Ok(status));
        assert_eq!(http::http_is_success(&value), Ok((200..300).contains(&status)));
        assert_eq!(http::http_body_text(&value), Ok(String::new()));
    }
    assert_eq!(http::http_body_text(&http::http_response(200, &json!([]), "/w==").unwrap()), Err("invalid HTTP UTF8 body".to_owned()));
    assert_eq!(http::http_body_json(&http::http_response(200, &json!([]), "bnVsbA==").unwrap()), Ok(json!(null)));
    assert_eq!(http::http_body_json(&http::http_response(200, &json!([]), "").unwrap()), Err("invalid HTTP JSON body".to_owned()));
}

#[test]
fn request_url_validation_does_not_execute_a_transport() {
    assert!(http::http_request("POST", "https://example.test/a?q=%23", &json!([]), "AAE=").is_ok());
    for url in ["file:///tmp/input", "https://user:pass@example.test", "http://@example.test", "http://:@example.test", "https://example.test/#", "https://example.test/#x", "https://example.test/a b", "http:example.test"] {
        assert_eq!(http::http_request("GET", url, &json!([]), ""), Err("invalid HTTP URL".to_owned()));
    }
}
