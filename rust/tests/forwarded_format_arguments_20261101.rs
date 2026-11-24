// CI-only independent native formatting prerequisite oracle. UNRUN.
// This does not implement/qualify scoped Router output or its Arguments ABI.
#[test]
fn immediate_definition_literal_and_nested_caller_literal_formatting() {
    let mut zero = String::new();
    std::fmt::write(&mut zero, format_args!("\n")).expect("String formatting");
    assert_eq!(zero, "\n");
    let mut literal = String::new();
    std::fmt::write(
        &mut literal,
        format_args!("{}\n", format_args!("Paste authorization code:")),
    )
    .expect("String formatting");
    assert_eq!(literal, "Paste authorization code:\n");
}
