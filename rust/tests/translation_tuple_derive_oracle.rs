//! Independent tuple-derive edge cases. Execute in JavaScript-gated CI only.

#[derive(Clone, Debug)]
struct Empty();

#[derive(Clone, Debug)]
struct Pair(u8, String);

#[derive(Clone, Debug)]
struct Many(u8, u8, u8, u8, u8, u8);

fn empty(value: &str) -> bool {
    value.is_empty()
}

#[test]
fn empty_tuple_clone_and_debug_use_the_original_unit_field_path() {
    let copied = Empty().clone();
    assert_eq!(format!("{copied:?}"), "Empty");
    assert!(empty(""));
    assert!(!empty("\0"));
    assert!(!empty("Ω😀"));
}

#[test]
fn tuple_clone_keeps_field_order_and_owns_its_string() {
    let original = Pair(u8::MAX, String::from("Ω😀"));
    let mut copied = original.clone();
    copied.1.push('!');
    assert_eq!(copied.0, u8::MAX);
    assert_eq!(original.1, "Ω😀");
    assert_eq!(copied.1, "Ω😀!");
    assert_eq!(format!("{original:?}"), "Pair(255, \"Ω😀\")");
    assert_eq!(format!("{copied:?}"), "Pair(255, \"Ω😀!\")");
}

#[test]
fn tuple_debug_crosses_the_five_field_formatter_cutoff() {
    let many = Many(0, 1, 2, 3, 4, u8::MAX);
    let copied = many.clone();
    assert_eq!(copied.0, 0);
    assert_eq!(copied.1, 1);
    assert_eq!(copied.2, 2);
    assert_eq!(copied.3, 3);
    assert_eq!(copied.4, 4);
    assert_eq!(copied.5, u8::MAX);
    assert_eq!(format!("{copied:?}"), "Many(0, 1, 2, 3, 4, 255)");
}
