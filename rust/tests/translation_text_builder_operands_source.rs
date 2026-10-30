// Independent original Rust source oracle. UNRUN; gated CI only.
fn conditional(value: &str, flag: bool) -> String {
    let mut output = String::new();
    output.push_str(if flag { value } else { "é😀" });
    output
}
fn borrowed_owned_input(value: String) -> String {
    let mut output = String::new();
    output.push_str(value.as_str());
    output.push_str(&value);
    output
}
#[test]
fn original_borrowed_suffix_branches_and_owned_inputs() {
    for value in ["", "é😀", "a\0b", " é😀 "] {
        assert_eq!(conditional(value, true), value);
        assert_eq!(conditional(value, false), "é😀");
        assert_eq!(borrowed_owned_input(value.to_owned()), format!("{}{}", value, value));
    }
}
