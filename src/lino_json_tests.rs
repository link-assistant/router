//! Tests for [`crate::lino_json`].

use super::*;

#[derive(Debug, PartialEq, serde::Serialize, serde::Deserialize)]
struct Sample {
    name: String,
    count: i64,
    enabled: bool,
    optional: Option<String>,
    items: Vec<String>,
}

fn sample() -> Sample {
    Sample {
        name: "router".to_string(),
        count: 42,
        enabled: true,
        optional: None,
        items: vec!["one".to_string(), "two".to_string()],
    }
}

/// State must survive the round trip unchanged, or a store would lose data on
/// its first write in the new format.
#[test]
fn state_round_trips_through_links_notation() {
    let encoded = encode(&sample()).expect("encode");
    let decoded: Sample = decode(&encoded).expect("decode");
    assert_eq!(decoded, sample());
}

/// The point of the change is that an operator can read the file. An earlier
/// codec base64-encoded every string, which made a formally associative store
/// unusable (issue #235).
#[test]
fn the_encoded_form_is_readable() {
    let encoded = encode(&sample()).expect("encode");
    assert!(encoded.contains("name \"router\""), "{encoded}");
    assert!(encoded.contains("count 42"), "{encoded}");
    assert!(encoded.contains("enabled true"), "{encoded}");
    // Numbers and booleans stay bare so their types survive the round trip.
    assert!(!encoded.contains("\"42\""), "{encoded}");
    // And nothing is base64: the marker would appear if it were.
    assert!(!encoded.contains("base64"), "{encoded}");
}

/// A file written by an earlier release is JSON, and must keep loading — it
/// migrates to links notation on the next write rather than being lost.
#[test]
fn json_written_by_an_earlier_release_still_loads() {
    let json = serde_json::to_string(&sample()).expect("serialize");
    let decoded: Sample = decode(&json).expect("JSON still decodes");
    assert_eq!(decoded, sample());
}

/// Every JSON shape the stores use converts in both directions.
#[test]
fn every_value_shape_converts_both_ways() {
    let value = serde_json::json!({
        "null": null,
        "bool": false,
        "int": -7,
        "float": 1.5,
        "string": "text",
        "array": [1, "two", true],
        "nested": {"inner": {"deep": 1}}
    });
    assert_eq!(from_lino(&to_lino(&value)), value);
}

/// A string that cannot be written as text is still carried losslessly, marked
/// individually rather than forcing the whole document into base64.
#[test]
fn a_control_character_is_carried_without_base64ing_everything() {
    let value = serde_json::json!({"plain": "readable", "raw": "a\u{0007}b"});
    let encoded = lino_objects_codec::encode(&to_lino(&value));
    assert!(encoded.contains("plain \"readable\""), "{encoded}");
    let decoded = lino_objects_codec::decode(&encoded).expect("decode");
    assert_eq!(from_lino(&decoded), value);
}

/// A links-notation document is never misread as JSON.
///
/// The sniff decides the format before parsing, because the links decoder
/// accepts JSON too but yields a different structure — so getting the
/// direction wrong misreads every file rather than falling back (issue #336).
#[test]
fn a_links_document_is_not_misread_as_json() {
    let encoded = encode(&sample()).expect("encode");
    assert!(
        encoded.trim_start().starts_with('('),
        "links notation opens with a paren: {encoded}"
    );
    let decoded: Sample = decode(&encoded).expect("links notation decodes");
    assert_eq!(decoded, sample());
}

/// An empty collection round-trips in both encodings.
///
/// The token transaction journal is a list, and a deployment that has just
/// started has none — the shape most likely to be written before anything
/// else and read back at the worst moment (issue #336).
#[test]
fn an_empty_collection_survives_both_encodings() {
    let empty: Vec<Sample> = Vec::new();
    let encoded = encode(&empty).expect("encode");
    let decoded: Vec<Sample> = decode(&encoded).expect("decode");
    assert!(decoded.is_empty(), "an empty list stays empty: {encoded}");

    // And the JSON an earlier release wrote for the same value still loads.
    let decoded: Vec<Sample> = decode("[]").expect("decode JSON");
    assert!(decoded.is_empty());
}

/// The decoder never turns a vendor's JSON into something else.
///
/// `.credentials.json` is Anthropic's, `auth.json` is Codex's, and the client
/// `settings.json` files belong to the clients that read them: the rule is
/// that router-owned state is links notation and vendor-owned state stays
/// whatever the vendor writes. This pins the half that could break silently —
/// a vendor document read through this module must come back unchanged, so a
/// future sweep that routed one through here cannot corrupt it (issue #336).
#[test]
fn a_vendor_document_survives_this_module_unchanged() {
    // The real shape of an Anthropic credential file.
    let credential = serde_json::json!({
        "claudeAiOauth": {
            "accessToken": "sk-ant-oat01-example",
            "refreshToken": "sk-ant-ort01-example",
            "expiresAt": 4_102_444_800_000_i64,
            "scopes": ["user:inference", "user:profile"],
        }
    });
    let written = serde_json::to_string_pretty(&credential).expect("serialize");

    // Read back through the sniffing decoder: JSON is recognised as JSON.
    let read: serde_json::Value = decode(&written).expect("a vendor file still decodes");
    assert_eq!(read, credential, "a vendor document must not be reshaped");

    // And a Codex `auth.json`, which carries fields this crate does not model.
    let codex = serde_json::json!({
        "OPENAI_API_KEY": null,
        "tokens": {"id_token": "header.payload.signature", "account_id": "acct_1"},
        "last_refresh": "2026-08-26T00:00:00Z",
    });
    let round_tripped: serde_json::Value =
        decode(&serde_json::to_string(&codex).expect("serialize")).expect("decode");
    assert_eq!(
        round_tripped, codex,
        "fields this crate does not model must survive untouched"
    );
}
