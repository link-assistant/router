//! Independent native oracle for the owned vector construction boundary.
//! Run in CI only, after the complete same-head JavaScript gate.

use link_assistant_router::translation_core;

#[test]
fn primitive_text_and_empty_vectors() {
    let numbers: Vec<u8> = translation_core::vec![0_u8, 255_u8, 7_u8];
    assert_eq!(numbers, [0, 255, 7]);
    let flags: Vec<bool> = translation_core::vec![true, false];
    assert_eq!(flags, [true, false]);
    let empty: Vec<bool> = translation_core::vec![];
    assert!(empty.is_empty());
    let headers: Vec<&'static translation_core::Str> =
        translation_core::vec!["user-agent", "😀", "content-type"];
    assert_eq!(headers, ["user-agent", "😀", "content-type"]);
    let text: Vec<translation_core::Text> = translation_core::vec![
        translation_core::format!("alpha"),
        translation_core::format!("{}", "beta"),
    ];
    assert_eq!(text, ["alpha", "beta"]);
}

#[test]
fn each_operand_runs_once_in_source_order() {
    let mut observations = Vec::new();
    let values = translation_core::vec![
        {
            observations.push(1);
            4_u8
        },
        {
            observations.push(2);
            5_u8
        },
    ];
    assert_eq!(observations, [1, 2]);
    assert_eq!(values, [4, 5]);
}

#[test]
fn borrowed_elements_keep_their_original_lifetime() {
    let value = String::from("borrowed 😀");
    let references: Vec<&translation_core::Str> = translation_core::vec![value.as_str()];
    assert_eq!(references, ["borrowed 😀"]);
    assert_eq!(value, "borrowed 😀");
}
