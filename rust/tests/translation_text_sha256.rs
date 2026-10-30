//! Native oracle SOURCE only. Rust may run in CI after every same-SHA JS gate.
use base64::Engine as _;
use base64::engine::general_purpose::URL_SAFE_NO_PAD;
use link_assistant_router::translation_text_core::sha256_base64_url_no_pad;
use sha2::{Digest, Sha256};
use serde_json::Value;

#[test]
fn independent_fixed_vectors_match_the_owned_text_operation() {
    let fixture: Value = serde_json::from_str(include_str!(
        "../../tools/translation/test/fixtures/text-sha256-vectors.json"
    ))
    .expect("complete independent vector source");
    for vector in fixture["vectors"].as_array().expect("vector array") {
        let input = vector["input"].as_str().expect("scalar text input");
        let expected = vector["expected"].as_str().expect("fixed expected output");
        assert_eq!(sha256_base64_url_no_pad(input), expected);
        assert_eq!(URL_SAFE_NO_PAD.encode(Sha256::digest(input.as_bytes())), expected);
    }
}

#[test]
fn scalar_utf8_nul_and_hash_block_boundaries_preserve_native_bytes() {
    for text in ["π\0🙂", "é", "e\u{0301}", "\r\n", "\u{10ffff}"] {
        assert_eq!(
            sha256_base64_url_no_pad(text),
            URL_SAFE_NO_PAD.encode(Sha256::digest(text.as_bytes()))
        );
    }
    for length in [55, 56, 63, 64, 65, 127, 128, 129, 1_048_576, 1_048_577] {
        let value = "x".repeat(length);
        let encoded = sha256_base64_url_no_pad(&value);
        assert_eq!(encoded, URL_SAFE_NO_PAD.encode(Sha256::digest(value.as_bytes())));
        assert_eq!(encoded.len(), 43);
        assert!(!encoded.contains('='));
    }
}
