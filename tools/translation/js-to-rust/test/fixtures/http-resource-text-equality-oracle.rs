// Independent native source. Execution requires every JavaScript stage green.
#[test]
fn scalar_text_views_compare_without_consuming_original_strings() {
    let first = String::from("é😀");
    let second = String::from("é😀");
    let left: &str = &first;
    let right: &str = &second;
    assert_eq!(left, right);
    assert_ne!(left, "e\u{301}😀");
    assert_eq!(first, "é😀");
    assert_eq!(second, "é😀");
}

#[test]
fn immediate_callbacks_read_owned_text_through_shared_views() {
    let needle = String::from("é😀");
    let values = [true, false];
    let selected: Vec<_> = values
        .iter()
        .filter(|_| needle.contains('😀'))
        .collect();
    assert_eq!(selected.len(), 2);
    assert_eq!(needle, "é😀");
}
