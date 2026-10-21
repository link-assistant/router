//! Native compatibility oracle. Run in gated CI; no local Rust execution.

use link_assistant_router::translation_core::{Json, Maybe, json_parse, json_parse_bytes};

#[test]
fn successful_null_is_distinct_from_invalid_json() {
    assert_eq!(json_parse("null"), Maybe::Some(Json::Null));
    assert_eq!(json_parse("false"), Maybe::Some(Json::Bool(false)));
    assert_eq!(json_parse("invalid"), Maybe::None);
    assert_eq!(json_parse_bytes(b"null"), Maybe::Some(Json::Null));
}

#[test]
fn scalar_strings_preserve_unicode_and_escapes() {
    assert_eq!(
        json_parse(r#""猫😀""#),
        Maybe::Some(Json::String("猫😀".into()))
    );
    assert_eq!(
        json_parse(r#""\uD83D\uDE00""#),
        Maybe::Some(Json::String("😀".into()))
    );
    assert_eq!(json_parse(r#""\uD800""#), Maybe::None);
}

#[test]
fn invalid_bytes_and_trailing_input_return_none() {
    assert_eq!(json_parse_bytes(&[b'"', 0xff, b'"']), Maybe::None);
    for input in ["", "01", "[1,]", "{\"v\":}", "true false", "1e309"] {
        assert_eq!(json_parse(input), Maybe::None, "{input}");
        assert_eq!(json_parse_bytes(input.as_bytes()), Maybe::None, "{input}");
    }
}

#[test]
fn integer_limits_keep_the_native_number_kind() {
    let unsigned = json_parse("18446744073709551615").unwrap();
    let signed = json_parse("-9223372036854775808").unwrap();
    assert_eq!(unsigned.as_u64(), Maybe::Some(u64::MAX));
    assert_eq!(signed.as_i64(), Maybe::Some(i64::MIN));
    let overflow = json_parse("18446744073709551616").unwrap();
    assert!(overflow.as_number().unwrap().is_f64());
}

#[test]
fn selected_roundtrip_ties_signed_zero_and_subnormals_remain_native() {
    let midpoint = json_parse("1.000000000000000110000").unwrap();
    assert_eq!(midpoint.as_f64().unwrap().to_bits(), 1.0_f64.to_bits());
    for input in ["-0", "-0.0", "-0e999999999999999"] {
        assert_eq!(
            json_parse(input).unwrap().as_f64().unwrap().to_bits(),
            (-0.0_f64).to_bits()
        );
    }
    assert_eq!(json_parse("5e-324").unwrap().as_f64().unwrap().to_bits(), 1);
    assert_eq!(json_parse("1e-325").unwrap().as_f64().unwrap().to_bits(), 0);
}

#[test]
fn complete_objects_keep_last_duplicate_value_and_default_key_order() {
    let value = json_parse(r#"{"z":1,"a":true,"z":2}"#).unwrap();
    let object = value.as_object().unwrap();
    assert_eq!(
        object.keys().map(String::as_str).collect::<Vec<_>>(),
        ["a", "z"]
    );
    assert_eq!(object["z"].as_u64(), Maybe::Some(2));
}

#[test]
fn optional_decode_can_feed_a_complete_owned_field_copy() {
    fn field(body: &[u8], name: &str) -> Maybe<Json> {
        let value = json_parse_bytes(body)?;
        value.get(name).cloned()
    }
    assert_eq!(field(br#"{"v":null}"#, "v"), Maybe::Some(Json::Null));
    assert_eq!(
        field(r#"{"v":"猫😀"}"#.as_bytes(), "v"),
        Maybe::Some(Json::String("猫😀".into()))
    );
    assert_eq!(field(b"{}", "v"), Maybe::None);
    assert_eq!(field(b"invalid", "v"), Maybe::None);
}

#[test]
fn let_some_else_has_the_same_lazy_failure_branch_as_discarding_ok() {
    let mut evaluations = Vec::new();
    let body = {
        evaluations.push("input");
        b"null".as_slice()
    };
    let Some(value) = json_parse_bytes(body) else {
        panic!("valid null must be Some");
    };
    evaluations.push("continuation");
    assert!(value.is_null());
    assert_eq!(evaluations, ["input", "continuation"]);
    let Some(_) = json_parse_bytes(b"invalid") else {
        evaluations.push("failure");
        assert_eq!(evaluations, ["input", "continuation", "failure"]);
        return;
    };
    panic!("invalid JSON must be None");
}
