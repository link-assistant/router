//! Every generation of the request log still reads, exactly.
//!
//! A deployment's log holds every format the router has ever written to it: a
//! record is appended and never rewritten, so upgrading does not convert what
//! is already on disk. Three formats exist —
//!
//! | Written by | Looks like |
//! | --- | --- |
//! | up to v0.121.0 | `{"phase":"stream_end"}` |
//! | v0.122.0 – v0.123.3 | `((:"phase" "stream_end"))` |
//! | since | `(#o ("phase" "stream_end"))` |
//!
//! — and a file can hold all three at once. These tests read fixtures written
//! by the real encoders of each generation and require the decoded value to
//! equal the original record exactly, so a format change cannot quietly drop
//! or reshape history (issues #336, #346, #350).

use base64::Engine as _;
use std::io::BufRead;

/// The original records, one JSON object per line.
///
/// Compatibility records covering the shapes that break encoders: two-element
/// arrays whose first element is a scalar, empty containers, empty keys, nulls,
/// embedded newlines and quotes. All payloads and deployment identifiers are
/// synthetic.
const RECORDS: &str = include_str!("fixtures/log_generations/records.json");

/// The same records as v0.122.0 through v0.123.3 wrote them, produced by that
/// release's own encoder rather than a re-implementation of it.
const COLON_DIALECT: &str = include_str!("fixtures/log_generations/gen2_colon_dialect.txt");

fn records() -> Vec<serde_json::Value> {
    RECORDS
        .as_bytes()
        .lines()
        .map(|line| line.expect("a fixture line"))
        .filter(|line| !line.trim().is_empty())
        .map(|line| serde_json::from_str(&line).expect("the fixture is JSON"))
        .collect()
}

fn colon_lines() -> Vec<String> {
    COLON_DIALECT
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(str::to_owned)
        .collect()
}

/// The fixtures describe the same records, or the comparison means nothing.
#[test]
fn the_fixtures_are_two_encodings_of_one_set_of_records() {
    assert_eq!(
        records().len(),
        colon_lines().len(),
        "the generations must hold the same records"
    );
    assert!(records().len() >= 50, "the corpus must be worth reading");
}

/// Synthetic binary bodies must still be records the production writer could
/// emit: valid base64, non-UTF-8 bytes, and an exact declared byte count.
#[test]
fn synthetic_binary_payload_lengths_are_consistent() {
    let mut payload_count = 0;

    for (index, record) in records().into_iter().enumerate() {
        let Some(body) = record.get("body").and_then(serde_json::Value::as_object) else {
            continue;
        };
        let Some(encoded) = body.get("base64").and_then(serde_json::Value::as_str) else {
            continue;
        };
        let declared_bytes = body
            .get("bytes")
            .and_then(serde_json::Value::as_u64)
            .unwrap_or_else(|| panic!("record {index} has base64 without a byte count"));
        let decoded = base64::engine::general_purpose::STANDARD
            .decode(encoded)
            .unwrap_or_else(|error| panic!("record {index} has invalid base64: {error}"));

        assert_eq!(
            u64::try_from(decoded.len()).expect("fixture payload length fits u64"),
            declared_bytes,
            "record {index} must declare its exact decoded length"
        );
        assert!(
            std::str::from_utf8(&decoded).is_err(),
            "record {index} must represent a binary body"
        );
        payload_count += 1;
    }

    assert!(payload_count > 0, "the corpus must exercise binary bodies");
}

/// JSON Lines, as written up to v0.121.0.
#[test]
fn the_oldest_generation_still_decodes_exactly() {
    for (index, record) in records().into_iter().enumerate() {
        let line = serde_json::to_string(&record).expect("serialise");
        assert_eq!(
            link_assistant_router::lino_json::decode_line(&line),
            Some(record),
            "record {index} written as JSON Lines must decode unchanged"
        );
    }
}

/// The `:` dialect, as written by v0.122.0 through v0.123.3.
///
/// This is the encoding issue #350 removed. Removing it from the *writer* must
/// not remove it from the *reader*: a deployment that ran any of those
/// releases has records in this form, and they are the only copy.
#[test]
fn the_colon_dialect_still_decodes_exactly() {
    for (index, (record, line)) in records().into_iter().zip(colon_lines()).enumerate() {
        assert!(
            line.starts_with("((:") || line.starts_with('('),
            "fixture line {index} is not the ':' dialect: {line}"
        );
        assert_eq!(
            link_assistant_router::lino_json::decode_line(&line),
            Some(record),
            "record {index} written by v0.123.x must decode unchanged: {line}"
        );
    }
}

/// The current form, and the properties issue #350 was filed about.
#[test]
fn the_current_generation_is_real_links_notation() {
    for (index, record) in records().into_iter().enumerate() {
        let line = link_assistant_router::lino_json::encode_line(&record).expect("encode");

        assert_eq!(
            line.lines().count(),
            1,
            "record {index} must stay on one line, or compaction cuts inside it"
        );
        // The two failures the issue reported, as assertions.
        assert!(
            links_notation::parse_lino(&line).is_ok(),
            "record {index}: the notation's own parser must accept a file this \
             project calls links notation: {line}"
        );
        assert!(
            lino_objects_codec::decode(&line).is_ok(),
            "record {index}: the codec must decode it: {line}"
        );
        assert_eq!(
            link_assistant_router::lino_json::decode_line(&line),
            Some(record),
            "record {index} must round-trip exactly: {line}"
        );
    }
}

/// An object and an array that would otherwise write the same text.
///
/// `lino-objects-codec` 0.4.1 decodes a two-element group whose first element
/// is a scalar as an *object*, so `["a","b"]` and `{"a":"b"}` collide unless
/// containers say what they are. Tool schemas commonly contain these `enum`
/// arrays, so this remains a practical compatibility boundary (issue #350).
#[test]
fn a_two_element_array_is_never_confused_with_a_field() {
    let array = serde_json::json!({"enum": ["worktree", "remote"]});
    let object = serde_json::json!({"enum": {"worktree": "remote"}});

    let encoded_array = link_assistant_router::lino_json::encode_line(&array).expect("encode");
    let encoded_object = link_assistant_router::lino_json::encode_line(&object).expect("encode");
    assert_ne!(
        encoded_array, encoded_object,
        "an array and an object must not write the same text"
    );

    assert_eq!(
        link_assistant_router::lino_json::decode_line(&encoded_array),
        Some(array),
        "the array must come back an array: {encoded_array}"
    );
    assert_eq!(
        link_assistant_router::lino_json::decode_line(&encoded_object),
        Some(object),
        "the object must come back an object: {encoded_object}"
    );

    // And the codec must see the same distinction, since that is the whole
    // point of leaving the private dialect behind.
    let decoded_array = lino_objects_codec::decode(&encoded_array).expect("codec reads the array");
    let decoded_object =
        lino_objects_codec::decode(&encoded_object).expect("codec reads the object");
    assert_ne!(
        format!("{decoded_array:?}"),
        format!("{decoded_object:?}"),
        "the codec must tell them apart too"
    );
}

/// A file holding every generation at once reads as one log.
///
/// This is what an upgraded deployment actually looks like: old records in the
/// old forms, new records appended after them.
#[test]
fn a_file_holding_every_generation_reads_as_one_log() {
    let all = records();
    let mixed = all
        .iter()
        .enumerate()
        .map(|(index, record)| match index % 3 {
            0 => serde_json::to_string(record).expect("serialise"),
            1 => colon_lines()[index].clone(),
            _ => link_assistant_router::lino_json::encode_line(record).expect("encode"),
        })
        .collect::<Vec<_>>()
        .join("\n");

    let decoded = mixed
        .lines()
        .filter(|line| !line.trim().is_empty())
        .map(|line| {
            link_assistant_router::lino_json::decode_line(line)
                .unwrap_or_else(|| panic!("every line must read: {line}"))
        })
        .collect::<Vec<_>>();

    assert_eq!(
        decoded, all,
        "a mixed-format file must decode to its records"
    );
}
