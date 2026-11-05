// Independent original reader edge oracle SOURCE. Gated CI only, UNRUN.
use super::resource_error_code;

// Independent CI-only native core expression. Never installed in production.
fn core_reader(body: &str) -> Option<String> {
    use crate::translation_json_fields_core as fields;
    let value = crate::translation_core::json_parse(body)?;
    let error = fields::json_field(&value, "error")?;
    if let Some(value) = fields::json_text_field2(error, "details", "error_code") {
        Some(value)
    } else if let Some(value) = fields::json_text_field(error, "error_code") {
        Some(value)
    } else {
        fields::json_text_field(error, "code")
    }
}

#[test]
fn original_reader_and_paired_core_keep_parser_and_field_edge_semantics() {
    let bodies = [
        r#"{"error":{"details":{"error_code":"nested"},"error_code":"flat","code":"last"}}"#,
        r#"{"error":{"details":{"error_code":""},"code":"last"}}"#,
        r#"{"error":{"details":{"error_code":" "},"code":"last"}}"#,
        r#"{"error":{"details":{"error_code":false},"error_code":"flat"}}"#,
        r#"{"error":{"details":{"error_code":0},"error_code":null,"code":"last"}}"#,
        r#"{"error":{"details":[],"code":"last"}}"#,
        r#"{"error":{"details":{"error_code":["ignored"]},"code":"last"}}"#,
        r#"{"error":{"details":{"error_code":"λ😀\u0000"}}}"#,
        r#"{"error":{"code":"first","code":"last"}}"#,
        r#"{"error":{"details":{"error_code":"first","error_code":"last"}}}"#,
        r#"{"error":{"details":{"error_code":18446744073709551615},"code":"last"}}"#,
        r#"{"error":{"error_code":-9223372036854775808,"code":"last"}}"#,
        r#"{"error":{"error_code":true,"code":false}}"#,
        r#"{"error":null}"#,
        r#"{"error":[]}"#,
        r#"{"error":"text"}"#,
        r#"{"error":0}"#,
        r#"{"error":false}"#,
        r#"{}"#,
        r#"[]"#,
        r#"null"#,
        r#"{"error":{"code":"bad\uD800"}}"#,
        r#"{"error":{"code":"tail"}} trailing"#,
        r#"{"error":{"code":"unfinished"}"#,
        "",
        "not json",
    ];
    for body in bodies {
        assert_eq!(core_reader(body), resource_error_code(body), "{body}");
    }
}


#[test]
fn resource_error_code_keeps_priority_empty_strings_and_typed_fallbacks() {
    let cases = [
        (r#"{"error":{"details":{"error_code":"nested"},"error_code":"flat","code":"last"}}"#, Some("nested")),
        (r#"{"error":{"details":{"error_code":""},"error_code":"flat"}}"#, Some("")),
        (r#"{"error":{"details":{"error_code":" "},"code":"last"}}"#, Some(" ")),
        (r#"{"error":{"details":{"error_code":false},"error_code":"flat"}}"#, Some("flat")),
        (r#"{"error":{"details":{"error_code":0},"error_code":false,"code":"last"}}"#, Some("last")),
        (r#"{"error":{"details":null,"code":"last"}}"#, Some("last")),
        (r#"{"error":{"details":{"error_code":["wrong type"]},"code":"last"}}"#, Some("last")),
        (r#"{"error":{"details":{"error_code":"λ😀"}}}"#, Some("λ😀")),
        (r#"{"error":{"code":"first","code":"last"}}"#, Some("last")),
        (r#"{"error":{"error_code":null,"code":false}}"#, None),
        (r#"{"error":null}"#, None),
        (r#"{"error":[]}"#, None),
        (r#"{}"#, None),
        ("not json", None),
    ];
    for (body, expected) in cases {
        assert_eq!(resource_error_code(body).as_deref(), expected, "{body}");
    }
}
