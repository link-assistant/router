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
