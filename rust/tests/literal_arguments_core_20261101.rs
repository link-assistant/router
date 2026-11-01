//! CI-only independent owned carrier oracle. SOURCE ONLY: UNRUN locally.
//! This imports the real new leaf; the canonical translation_core adoption is
//! intentionally uninstalled. This is not a std::fmt::Arguments ABI oracle.
#[path = "../src/translation_core/literal_arguments_core_20261101.rs"]
mod literal_arguments_core;
use literal_arguments_core::{__literal_arguments_from_static as make,
    literal_arguments_byte_len as bytes, literal_arguments_piece_count as pieces,
    literal_arguments_is_empty as empty, LiteralArguments};

#[test]
fn static_storage_empty_piece_distinctions_and_fixed_u64_counts() {
    let zero: u64 = pieces(make(&[]));
    let one: u64 = pieces(make(&[""]));
    assert_eq!((zero, one), (0, 1));
    assert!(empty(make(&[])));
    assert!(empty(make(&[""])));
    assert_eq!(bytes(make(&[])), 0);
    assert_eq!(bytes(make(&[""])), 0);
    assert!(!empty(make(&["x"])));
    assert_eq!(bytes(make(&["é東京😀"])), 12);
    assert_eq!(bytes(make(&["{} {{}}"])), 7);
    assert_eq!(format!("{}", make(&["{uninterpreted} {{}}"])), "{uninterpreted} {{}}");
}

#[test]
fn exact_empty_destructor_seals_move_only_consumption() {
    assert!(::std::mem::needs_drop::<LiteralArguments>());
    let value = make(&["static"]);
    assert_eq!(bytes(value), 6);
    // Reusing value or implementing Copy/custom Drop is rejected by Rust's
    // ordinary move/coherence checker; source refusal cases cover those inputs.
}

#[test]
#[should_panic(expected = "zero or one piece")]
fn two_static_pieces_are_outside_the_owned_contract() {
    let _ = make(&["a", "b"]);
}
