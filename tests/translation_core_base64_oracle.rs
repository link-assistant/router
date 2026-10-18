//! Independent shared cases for owned base64, including native error identity.
//! Rust is UNRUN locally in issue #759. CI must first pass same-SHA JavaScript.
use link_assistant_router::translation_core::{self as core, Base64Error};
use serde_json::{json, Value};

fn vectors() -> Value {
    serde_json::from_str(include_str!(
        "../tools/translation/test/fixtures/router-core-base64-vectors.json"
    ))
    .expect("complete shared fixture JSON")
}

fn bytes(value: &Value) -> Vec<u8> {
    value
        .as_array()
        .expect("byte array")
        .iter()
        .map(|part| u8::try_from(part.as_u64().expect("unsigned byte")).expect("u8 domain"))
        .collect()
}

fn error_fields(error: &Base64Error) -> Value {
    match error {
        Base64Error::InvalidByte(offset, byte) => {
            json!({"variant":"InvalidByte", "field0":offset, "field1":byte})
        }
        Base64Error::InvalidLength(length) => {
            json!({"variant":"InvalidLength", "field0":length})
        }
        Base64Error::InvalidLastSymbol {
            offset,
            symbol,
            symbol_value,
        } => json!({
            "variant":"InvalidLastSymbol", "offset":offset,
            "symbol":symbol, "symbol_value":symbol_value
        }),
        Base64Error::InvalidPadding => json!({"variant":"InvalidPadding"}),
    }
}

fn observe(value: Result<Vec<u8>, Base64Error>, row: &Value) {
    let name = row["name"].as_str().expect("case name");
    match value {
        Ok(value) => assert_eq!(json!({"Ok":value}), row["result"], "{name}"),
        Err(error) => {
            assert_eq!(json!({"Err":error_fields(&error)}), row["result"], "{name}");
            assert_eq!(error.to_string(), row["display"].as_str().unwrap(), "{name}");
            assert_eq!(format!("{error:?}"), row["debug"].as_str().unwrap(), "{name}");
        }
    }
}

#[test]
fn every_concrete_encoder_uses_the_same_complete_shared_bytes() {
    let fixture = vectors();
    assert_eq!(fixture["schema"], "router-owned-base64-shared-v1");
    for row in fixture["encode"].as_array().unwrap() {
        let input = bytes(&row["bytes"]);
        let name = row["name"].as_str().unwrap();
        let standard = row["standard"].as_str().unwrap();
        let url = row["urlNoPad"].as_str().unwrap();
        assert_eq!(core::base64_standard_encode_bytes(&input), standard, "{name}");
        assert_eq!(core::base64_standard_encode_owned_bytes(input.clone()), standard, "{name}");
        assert_eq!(core::base64_url_no_pad_encode_bytes(&input), url, "{name}");
        assert_eq!(core::base64_url_no_pad_encode_owned_bytes(input.clone()), url, "{name}");
        if input.len() == 32 {
            let array: [u8; 32] = input.as_slice().try_into().unwrap();
            assert_eq!(core::base64_url_no_pad_encode_array32(array), url, "{name}");
        }
        if let Some(text) = row["text"].as_str() {
            assert_eq!(text.as_bytes(), input.as_slice(), "{name}");
            assert_eq!(core::base64_standard_encode_text(text), standard, "{name}");
            assert_eq!(
                core::base64_standard_no_pad_encode_text(text),
                row["standardNoPad"].as_str().unwrap(),
                "{name}"
            );
            assert_eq!(core::base64_url_no_pad_encode_owned_text(text.to_owned()), url, "{name}");
        }
    }
}

#[test]
fn all_shared_decode_errors_keep_fields_utf8_offsets_and_native_display_debug() {
    let fixture = vectors();
    for row in fixture["decode"].as_array().unwrap() {
        let input = row["input"].as_str().unwrap();
        match row["configuration"].as_str().unwrap() {
            "STANDARD" => {
                observe(core::base64_standard_decode_text(input), row);
                observe(core::base64_standard_decode_owned_text(input.to_owned()), row);
            }
            "STANDARD_NO_PAD" => observe(core::base64_standard_no_pad_decode_text(input), row),
            "URL_SAFE_NO_PAD" => {
                observe(core::base64_url_no_pad_decode_text(input), row);
                observe(core::base64_url_no_pad_decode_owned_text(input.to_owned()), row);
            }
            other => panic!("unknown shared configuration: {other}"),
        }
    }
}

#[test]
fn error_alias_keeps_native_question_mark_conversion_identity() {
    fn actual(value: &str) -> Result<Vec<u8>, base64::DecodeError> {
        let result = core::base64_standard_decode_text(value)?;
        Ok(result)
    }
    assert_eq!(actual("Zg==").unwrap(), b"f");
    assert_eq!(actual("AA=!"), Err(base64::DecodeError::InvalidByte(2, b'=')));
}
