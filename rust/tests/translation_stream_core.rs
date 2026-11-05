//! Independent SSE oracle SOURCE. Execute only in same-SHA JS-gated CI.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use link_assistant_router::translation_stream_core::sse_push_base64;

#[test]
fn every_byte_boundary_preserves_complete_scalars_and_pending_bytes() {
    let input = "data: λ😀\r\n\r\ndata: 世\n\npartial".as_bytes();
    for split in 0..=input.len() {
        let first = sse_push_base64("", &STANDARD.encode(&input[..split])).expect("first chunk");
        let second = sse_push_base64(first["pending"].as_str().expect("pending"), &STANDARD.encode(&input[split..])).expect("second chunk");
        let blocks = first["blocks"].as_array().expect("first blocks").iter().chain(second["blocks"].as_array().expect("second blocks").iter()).cloned().collect::<Vec<_>>();
        assert_eq!(blocks, vec![serde_json::json!("data: λ😀"), serde_json::json!("data: 世")]);
        assert_eq!(second["pending"], STANDARD.encode(b"partial"));
    }
}

#[test]
fn lossy_bom_empty_blocks_limits_and_errors_are_explicit() {
    let frame = [0xef, 0xbb, 0xbf, b'd', b'\n', b'\n'];
    assert_eq!(sse_push_base64("", &STANDARD.encode(frame)).expect("BOM")["blocks"], serde_json::json!(["\u{feff}d"]));
    assert_eq!(sse_push_base64("", &STANDARD.encode([0xe4, 0xb8, b'\n', b'\n'])).expect("lossy")["blocks"], serde_json::json!(["\u{fffd}"]));
    assert_eq!(sse_push_base64("", &STANDARD.encode(b"\n\n\r\n\r\n")).expect("empty")["blocks"], serde_json::json!(["", ""]));
    assert_eq!(sse_push_base64("Zh==", ""), Err(String::from("invalid SSE pending base64")));
    assert_eq!(sse_push_base64("", "bad"), Err(String::from("invalid SSE chunk base64")));
    assert_eq!(sse_push_base64("", &STANDARD.encode(b"\n\n".repeat(1_025))), Err(String::from("SSE block count exceeds limit")));
    assert_eq!(sse_push_base64("", &STANDARD.encode(vec![0_u8; 1_048_577])), Err(String::from("SSE buffer exceeds limit")));
}
