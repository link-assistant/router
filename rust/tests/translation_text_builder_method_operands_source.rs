// Independent original Rust method/builder oracle. UNRUN; gated CI only.
fn original(value: &str, flag: bool) -> String {
    let mut output = String::from(value.trim());
    output.push_str(if flag { value.trim_start() } else { value.trim_end() });
    output
}
#[test]
fn original_suffix_method_order_and_unicode_trim_domains() {
    for value in ["", "é😀", "a\0b", " é😀 ", "\u{85}é😀\u{2003}"] {
        assert_eq!(original(value, true), format!("{}{}", value.trim(), value.trim_start()));
        assert_eq!(original(value, false), format!("{}{}", value.trim(), value.trim_end()));
    }
    let owned = " é😀 ".to_owned();
    let mut result = String::new();
    result.push_str(owned.as_str().trim());
    assert_eq!(result, "é😀");
    assert_eq!(owned, " é😀 ");
}
