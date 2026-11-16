// CI-only independent native alpha-rename edge oracles. No local Rust runs.
#[test]
fn scalar_mutation_and_early_return_keep_the_same_binding_behavior() {
    fn original(input: u8) -> Option<u8> {
        let mut value = input;
        value = value.checked_add(1)?;
        Some(value)
    }
    fn renamed(input: u8) -> Option<u8> {
        let mut output = input;
        output = output.checked_add(1)?;
        Some(output)
    }
    for (input, expected) in [(0, Some(1)), (254, Some(255)), (255, None)] {
        assert_eq!(original(input), expected);
        assert_eq!(renamed(input), expected);
    }
}
#[test]
fn owned_unicode_local_rename_preserves_borrow_and_move_order() {
    fn original(input: &str) -> String {
        let mut value = String::new();
        value.push_str(input);
        value.push('!');
        value
    }
    fn renamed(input: &str) -> String {
        let mut output = String::new();
        output.push_str(input);
        output.push('!');
        output
    }
    for (input, expected) in [("", "!"), ("a", "a!"), ("😀é", "😀é!")] {
        assert_eq!(original(input), expected);
        assert_eq!(renamed(input), expected);
    }
}
