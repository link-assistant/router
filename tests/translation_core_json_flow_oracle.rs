//! Independent native ownership-valid JSON update examples.
//! UNRUN locally. Rust execution remains gated on all JavaScript CI stages for
//! the same SHA; this source does not establish translator or borrow-check parity.
use link_assistant_router::translation_core::{self as core, Json, Maybe, Str};

fn conditional(flag: bool) -> Json {
    let mut document = core::json!({"start": true});
    document = core::json_with_field(document, "first", core::json!(1));
    if flag {
        document = core::json_with_field(document, "second", core::json!([false, "猫😀"]));
    }
    core::json_with_field(document, "last", core::json!(null))
}

#[test]
fn assignments_reinitialize_the_outer_local_on_both_conditional_paths() {
    assert_eq!(conditional(false), core::json!({"start": true, "first": 1, "last": null}));
    assert_eq!(conditional(true), core::json!({
        "start": true, "first": 1, "second": [false, "猫😀"], "last": null
    }));
}

fn paths(value: Json, branch: bool) -> Json {
    if branch {
        core::json_with_field(value, "yes", core::json!(true))
    } else {
        core::json_with_field(value, "no", core::json!(false))
    }
}

#[test]
fn mutually_exclusive_branches_each_move_the_parameter_once() {
    assert_eq!(paths(core::json!({}), true), core::json!({"yes": true}));
    assert_eq!(paths(core::json!({}), false), core::json!({"no": false}));
}

fn early(value: Json, branch: bool) -> Json {
    if branch {
        return core::json_with_field(value, "early", core::json!(true));
    }
    core::json_with_field(value, "late", core::json!(false))
}

#[test]
fn an_exiting_branch_does_not_move_the_other_continuations_value() {
    assert_eq!(early(core::json!({}), true), core::json!({"early": true}));
    assert_eq!(early(core::json!({}), false), core::json!({"late": false}));
}

fn optional(branch: bool, text: Maybe<&Str>) -> Maybe<Json> {
    let mut document = core::json!({});
    if branch {
        return Some(core::json!({"early": true}));
    }
    let value = core::json!(text?);
    document = core::json_with_field(document, "text", value);
    Some(document)
}

#[test]
fn question_mark_preserves_the_original_enclosing_optional_boundary() {
    assert_eq!(optional(false, None), None);
    assert_eq!(optional(true, None), Some(core::json!({"early": true})));
    assert_eq!(optional(false, Some("Ω😀")), Some(core::json!({"text": "Ω😀"})));
}

#[test]
fn a_shared_copy_can_precede_a_move_of_the_same_source_value() {
    let original = core::json!({"n": 1});
    let value = core::json_copy(&original);
    let value = core::json_copy(&value);
    let result = core::json_with_field(core::json_copy(&value), "copy", value);
    assert_eq!(result, core::json!({"n": 1, "copy": {"n": 1}}));
    assert_eq!(original, core::json!({"n": 1}));
}

#[test]
fn direct_json_interpolation_borrows_while_a_composite_expression_can_move() {
    let value = core::json!({"n": 1});
    let borrowed_twice = core::json!([value, value]);
    assert_eq!(value, core::json!({"n": 1}));
    let moved = core::json!((if true { value } else { core::json!(null) }));
    assert_eq!(borrowed_twice, core::json!([{"n": 1}, {"n": 1}]));
    assert_eq!(moved, core::json!({"n": 1}));
}
