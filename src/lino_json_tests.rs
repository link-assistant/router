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

/// A record encodes to one readable line and comes back unchanged.
///
/// The request log is one record per line, appended and compacted by scanning
/// for a newline, so a multi-line record breaks the framing. The codec's own
/// single-line form base64s every string, which is the unreadability issue
/// #328 removed from this same file — so the log needed a form that is both
/// (issue #336).
#[test]
fn a_record_round_trips_on_a_single_readable_line() {
    let record = serde_json::json!({
        "phase": "client_request",
        "uri": "/v1/messages?beta=true",
        "model": "claude-opus-5",
        "status": 200,
        "streamed": true,
        "detail": null,
        "frames": [1, 2, 3],
    });

    let line = encode_line(&record).expect("encode");
    assert_eq!(line.lines().count(), 1, "one record is one line: {line}");
    // Readable: the point of not using the compact form.
    assert!(line.contains("claude-opus-5"), "{line}");
    assert!(line.contains("/v1/messages?beta=true"), "{line}");
    assert!(!line.contains("base64"), "{line}");
    // And nothing that would break a `grep` for a model name.
    assert!(!line.contains("Y2xhdWRl"), "no base64 of 'claude': {line}");

    let decoded = decode_line(&line).expect("decode");
    assert_eq!(decoded, record, "the record survives the round trip");
}

/// A body containing newlines stays on one line.
///
/// An SSE body carries `\n` throughout; carrying it literally would end the
/// record early and split one exchange into two unparsable halves.
#[test]
fn a_newline_in_a_body_does_not_break_the_record() {
    let record = serde_json::json!({
        "body": "event: message_start\ndata: {\"model\":\"claude-opus-5\"}\n\n",
        "quote": "he said \"hello\"",
        "backslash": "C:\\path",
    });

    let line = encode_line(&record).expect("encode");
    assert_eq!(line.lines().count(), 1, "still one line: {line}");
    // The model name is still findable, which is what the log is read for.
    assert!(line.contains("claude-opus-5"), "{line}");

    let decoded = decode_line(&line).expect("decode");
    assert_eq!(decoded, record, "escapes are undone exactly");
}

/// A line written by an earlier release still reads.
///
/// There is 1.7 GB of `requests.jsonl` on a real deployment; it keeps reading
/// and migrates record by record as new ones are appended.
#[test]
fn a_json_line_from_an_earlier_release_still_reads() {
    let record = serde_json::json!({"phase": "client_request", "uri": "/v1/messages"});
    let json = serde_json::to_string(&record).expect("serialize");
    assert_eq!(
        decode_line(&json).expect("JSON still decodes"),
        record,
        "a line an earlier release wrote must keep reading"
    );
    // And a blank or damaged line yields nothing rather than a wrong answer.
    assert_eq!(decode_line("   "), None);
    assert_eq!(decode_line("(unterminated"), None);
}

/// An array of objects round-trips.
///
/// `messages` and `tools` in a request body are arrays of objects, and reading
/// the inner group as a malformed pair rejected every record that carried one —
/// which is most real traffic (issue #336).
#[test]
fn an_array_of_objects_round_trips() {
    let record = serde_json::json!({
        "body": {
            "model": "gpt-5",
            "messages": [{"role": "user", "content": "hi"}, {"role": "assistant", "content": "yo"}],
            "tools": [{"type": "function", "function": {"name": "lookup"}}],
        },
        "mixed": [1, "two", true, null],
        "empty": [],
    });

    let line = encode_line(&record).expect("encode");
    assert_eq!(line.lines().count(), 1, "one line: {line}");
    assert_eq!(
        decode_line(&line).expect("decode"),
        record,
        "an array of objects survives the round trip"
    );
}

/// Any record shape round-trips, including ones nobody thought to write.
///
/// The array-of-objects case reached CI because the hand-written tests only
/// covered shapes I imagined, and `messages`/`tools` -- which is most real
/// traffic -- was not among them. Generating the shapes instead is what makes
/// that class of gap visible here rather than on a deployment (issue #336).
fn arbitrary_json() -> impl proptest::strategy::Strategy<Value = serde_json::Value> {
    use proptest::prelude::*;

    let leaf = prop_oneof![
        Just(serde_json::Value::Null),
        any::<bool>().prop_map(serde_json::Value::Bool),
        any::<i64>().prop_map(|number| serde_json::json!(number)),
        // Strings that exercise the escapes: quotes, backslashes, newlines.
        "[a-zA-Z0-9 ..\"\\\\\n\r/:_-]{0,24}".prop_map(serde_json::Value::String),
    ];
    leaf.prop_recursive(4, 24, 4, |inner| {
        prop_oneof![
            proptest::collection::vec(inner.clone(), 0..4).prop_map(serde_json::Value::Array),
            proptest::collection::hash_map("[a-z_]{1,8}", inner, 0..4)
                .prop_map(|fields| serde_json::Value::Object(fields.into_iter().collect())),
        ]
    })
}

proptest::proptest! {
    #[test]
    fn any_record_survives_the_line_round_trip(record in arbitrary_json()) {
        let line = encode_line(&record).expect("encode");
        proptest::prop_assert_eq!(
            line.lines().count(),
            1,
            "every record is one line: {}",
            line
        );
        let decoded = decode_line(&line).expect("decode");
        proptest::prop_assert_eq!(decoded, record);
    }
}
