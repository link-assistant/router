//! Actual reverse base64 witness; CI only after same-SHA JavaScript qualification.
//! Generated functions borrow the JS ABI inputs and copy explicitly at owned calls.
use link_assistant_router::translation_core;
use link_assistant_router::translation_core::Base64Error;
use serde_json::{json, Value};

#[allow(clippy::needless_raw_string_hashes)]
pub const REVERSE_BASE64_JS_WITNESS: &str = r###"import {router_core_base64_standard_encode_bytes as op0,router_core_base64_standard_encode_text as op1,router_core_base64_standard_encode_owned_bytes as op2,router_core_base64_standard_no_pad_encode_text as op3,router_core_base64_url_no_pad_encode_bytes as op4,router_core_base64_url_no_pad_encode_owned_bytes as op5,router_core_base64_url_no_pad_encode_owned_text as op6,router_core_base64_url_no_pad_encode_array32 as op7,router_core_base64_standard_decode_text as op8,router_core_base64_standard_decode_owned_text as op9,router_core_base64_standard_no_pad_decode_text as op10,router_core_base64_url_no_pad_decode_text as op11,router_core_base64_url_no_pad_decode_owned_text as op12,base64ErrorText as displayRuntime} from './runtime/base64-runtime.mjs';
/** @param {Parameters<typeof op0>[0]} value */
export function standard_encode_bytes(value){return op0(value);}
/** @param {Parameters<typeof op1>[0]} value */
export function standard_encode_text(value){return op1(value);}
/** @param {Parameters<typeof op2>[0]} value */
export function standard_encode_owned_bytes(value){return op2(value);}
/** @param {Parameters<typeof op3>[0]} value */
export function standard_no_pad_encode_text(value){return op3(value);}
/** @param {Parameters<typeof op4>[0]} value */
export function url_no_pad_encode_bytes(value){return op4(value);}
/** @param {Parameters<typeof op5>[0]} value */
export function url_no_pad_encode_owned_bytes(value){return op5(value);}
/** @param {Parameters<typeof op6>[0]} value */
export function url_no_pad_encode_owned_text(value){return op6(value);}
/** @param {Parameters<typeof op7>[0]} value */
export function url_no_pad_encode_array32(value){return op7(value);}
/** @param {Parameters<typeof op8>[0]} value */
export function standard_decode_text(value){return op8(value);}
/** @param {Parameters<typeof op9>[0]} value */
export function standard_decode_owned_text(value){return op9(value);}
/** @param {Parameters<typeof op10>[0]} value */
export function standard_no_pad_decode_text(value){return op10(value);}
/** @param {Parameters<typeof op11>[0]} value */
export function url_no_pad_decode_text(value){return op11(value);}
/** @param {Parameters<typeof op12>[0]} value */
export function url_no_pad_decode_owned_text(value){return op12(value);}
/** @param {Parameters<typeof displayRuntime>[0]} error */
export function error_text(error){return displayRuntime(error);}
"###;

// Produced by the genuine source/CST/semantic reverse pipeline; never handwritten.
#[allow(clippy::needless_return, clippy::used_underscore_binding)]
#[path = "../../tools/translation/js-to-rust/generated/owned-base64-witness.rs"]
mod reverse_generated;

fn vectors() -> Value {
    serde_json::from_str(include_str!(
        "../../tools/translation/test/fixtures/router-core-base64-vectors.json"
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
            assert_eq!(reverse_generated::error_text(&error), row["display"].as_str().unwrap(), "{name}");
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
        assert_eq!(reverse_generated::standard_encode_bytes(&input), standard, "{name}");
        assert_eq!(reverse_generated::standard_encode_owned_bytes(&input), standard, "{name}");
        assert_eq!(reverse_generated::url_no_pad_encode_bytes(&input), url, "{name}");
        assert_eq!(reverse_generated::url_no_pad_encode_owned_bytes(&input), url, "{name}");
        if input.len() == 32 {
            let array: [u8; 32] = input.as_slice().try_into().unwrap();
            assert_eq!(reverse_generated::url_no_pad_encode_array32(&array), url, "{name}");
        }
        if let Some(text) = row["text"].as_str() {
            assert_eq!(text.as_bytes(), input.as_slice(), "{name}");
            assert_eq!(reverse_generated::standard_encode_text(text), standard, "{name}");
            assert_eq!(
                reverse_generated::standard_no_pad_encode_text(text),
                row["standardNoPad"].as_str().unwrap(),
                "{name}"
            );
            assert_eq!(reverse_generated::url_no_pad_encode_owned_text(text), url, "{name}");
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
                observe(reverse_generated::standard_decode_text(input), row);
                observe(reverse_generated::standard_decode_owned_text(input), row);
            }
            "STANDARD_NO_PAD" => observe(reverse_generated::standard_no_pad_decode_text(input), row),
            "URL_SAFE_NO_PAD" => {
                observe(reverse_generated::url_no_pad_decode_text(input), row);
                observe(reverse_generated::url_no_pad_decode_owned_text(input), row);
            }
            other => panic!("unknown shared configuration: {other}"),
        }
    }
}

#[test]
fn error_alias_keeps_native_question_mark_conversion_identity() {
    fn actual(value: &str) -> Result<Vec<u8>, base64::DecodeError> {
        let result = reverse_generated::standard_decode_text(value)?;
        Ok(result)
    }
    assert_eq!(actual("Zg==").unwrap(), b"f");
    assert_eq!(actual("AA=!"), Err(base64::DecodeError::InvalidByte(2, b'=')));
}
