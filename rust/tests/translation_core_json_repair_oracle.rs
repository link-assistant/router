//! Independent native witnesses for nested copy evaluation and the repaired
//! statement/constructor spelling. UNRUN locally; same-SHA JavaScript CI gates Rust.
use link_assistant_router::translation_core::{self as core, Json, Maybe, Str};
use std::cell::Cell;

#[test]
fn nested_copy_interpolations_evaluate_each_written_argument_once() {
    // The counter is an independent native evaluation witness, not permission
    // for arbitrary effectful operands in the translated pure-copy domain.
    fn observed<'a>(value: &'a Json, calls: &Cell<usize>) -> &'a Json {
        calls.set(calls.get() + 1);
        value
    }
    let calls = Cell::new(0);
    let value = core::json!({"nested": [true, "猫😀"]});
    let result = core::json!({
        "left": core::json_copy(observed(&value, &calls)),
        "right": core::json_copy(observed(&value, &calls)),
    });
    assert_eq!(calls.get(), 2);
    assert_eq!(result["left"], value);
    assert_eq!(result["right"], value);
    let mut changed = core::json_copy(&result);
    changed["left"]["nested"][0] = core::json!(false);
    assert_eq!(value["nested"][0], true);
    assert_eq!(result["right"]["nested"][0], true);
}

fn original(flag: bool, value: Maybe<&Str>) -> Maybe<Json> {
    let mut document = core::json!({});
    if !flag {
        document["selected"] = core::json!(true);
    }
    document["text"] = core::json!([value?]);
    Some(document)
}

fn adopted(flag: bool, value: Maybe<&Str>) -> Maybe<Json> {
    let mut document = core::json!({});
    if !flag {
        {
            let computed = core::json!(true);
            document = core::json_with_field(document, "selected", computed);
        };
    }
    {
        let computed = core::json!([value?]);
        document = core::json_with_field(document, "text", computed);
    };
    Some(document,)
}

#[test]
fn block_semicolons_unary_negation_and_constructor_commas_keep_native_results() {
    for flag in [false, true] {
        for value in [None, Some(""), Some("Ω😀")] {
            assert_eq!(original(flag, value), adopted(flag, value));
        }
    }
}
