// Independent original carrier-builder source oracle. UNRUN; gated CI only.
fn optional(value: &str, present: bool) -> Option<String> {
    let mut output = String::new();
    output.push_str(value);
    if present { Some(output) } else { None }
}
fn result(value: &str, success: bool) -> Result<String, String> {
    let mut output = String::new();
    output.push_str(value);
    if success { Ok(output) } else { Err(output) }
}
fn else_if_error(value: &str, first: bool, second: bool) -> Result<u64, String> {
    let mut output = String::new();
    output.push_str(value);
    if first { Err(output) } else if second { Ok(1) } else { Ok(2) }
}
#[test]
fn original_builder_exclusive_carrier_moves_and_empty_paths() {
    for value in ["", "é😀", "a\0b"] {
        assert_eq!(optional(value, true), Some(value.to_owned()));
        assert_eq!(optional(value, false), None);
        assert_eq!(result(value, true), Ok(value.to_owned()));
        assert_eq!(result(value, false), Err(value.to_owned()));
        assert_eq!(else_if_error(value, true, false), Err(value.to_owned()));
        assert_eq!(else_if_error(value, false, true), Ok(1));
        assert_eq!(else_if_error(value, false, false), Ok(2));
    }
}
