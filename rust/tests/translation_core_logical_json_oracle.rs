//! Native behavioral oracle for logical owned-JSON interpolation.
//! Test instrumentation does not admit blocks or effects in translated leaves.
//! UNRUN locally; execute only after the complete same-SHA JavaScript CI gate.
use link_assistant_router::translation_core::{self, Json};

#[allow(clippy::nonminimal_bool)] // Preserve the translated source expression.
fn logical(left: bool, right: bool) -> Json {
    translation_core::json!({
        "not": !left,
        "or": left || right,
        "and": left && right,
        "nested": !(left && (!right || false)),
        "equal": left == !right
    })
}

#[test]
fn independent_truth_table_matches_logical_interpolation() {
    for (left, right, not, or, and, nested, equal) in [
        (false, false, true, false, false, true, false),
        (false, true, true, true, false, true, true),
        (true, false, false, true, false, false, true),
        (true, true, false, true, true, true, false),
    ] {
        assert_eq!(
            logical(left, right),
            translation_core::json!({
                "not": not, "or": or, "and": and, "nested": nested, "equal": equal
            }),
        );
    }
}

fn or_division(left: bool, denominator: u64) -> Json {
    translation_core::json!(left || (8_u64 / denominator == 2_u64))
}

fn and_division(left: bool, denominator: u64) -> Json {
    translation_core::json!(left && (8_u64 / denominator == 2_u64))
}

#[test]
fn short_circuit_skips_only_untaken_division_panics() {
    assert_eq!(or_division(true, 0), Json::Bool(true));
    assert_eq!(and_division(false, 0), Json::Bool(false));
    assert_eq!(or_division(false, 4), Json::Bool(true));
    assert_eq!(and_division(true, 4), Json::Bool(true));
    assert!(std::panic::catch_unwind(|| or_division(false, 0)).is_err());
    assert!(std::panic::catch_unwind(|| and_division(true, 0)).is_err());
}

#[test]
#[allow(clippy::nonminimal_bool)] // Keep original logical interpolation order.
fn source_field_evaluation_precedes_object_key_sorting() {
    let trace = std::cell::RefCell::new(Vec::new());
    let value = translation_core::json!({
        "z": false || { trace.borrow_mut().push("z"); true },
        "a": false || { trace.borrow_mut().push("a"); false }
    });
    assert_eq!(&*trace.borrow(), &["z", "a"]);
    assert_eq!(value, translation_core::json!({"a": false, "z": true}));
    let object = value.as_object().expect("object literal");
    assert_eq!(
        object.keys().map(String::as_str).collect::<Vec<_>>(),
        ["a", "z"],
    );
}
