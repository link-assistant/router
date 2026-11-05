// Independent native oracle SOURCE. CI remains gated by all JavaScript stages.
use link_assistant_router::translation_core::{self as core, Json};
use link_assistant_router::translation_integer_core as integer;
use link_assistant_router::translation_state_core as state;

fn patch_object(base: &Json, patch: &Json) -> Json {
    let mut current = core::json_copy(base);
    current = core::json_with_field(current, "greeting", core::json!("é😀"));
    if state::json_object_has(&current, "remove") {
        current = state::json_without_field(current, "remove");
    }
    state::json_merge(current, patch)
}

fn array_built() -> Json {
    let mut current = core::json!([]);
    let mut count = 0_u64;
    while count < 3 {
        current = state::json_append(current, core::json!(count));
        count = integer::u64_saturating_add(count, 1);
    }
    current
}

fn parsed(input: &str) -> Option<Json> {
    let base = core::json_parse(input)?;
    Some(core::json_with_field(base, "parsed", core::json!(1)))
}

#[test]
fn owned_json_state_changes_preserve_inputs_and_optional_null() {
    let base = core::json!({"keep": 7, "remove": null});
    let patch = core::json!({"added": "λ"});
    assert_eq!(
        patch_object(&base, &patch),
        core::json!({"keep": 7, "greeting": "é😀", "added": "λ"})
    );
    assert_eq!(base, core::json!({"keep": 7, "remove": null}));
    assert_eq!(patch, core::json!({"added": "λ"}));
    assert_eq!(array_built(), core::json!([0, 1, 2]));
    assert_eq!(parsed("{}"), Some(core::json!({"parsed": 1})));
    assert_eq!(parsed("{"), None);
    assert_eq!(core::json_parse("null"), Some(core::json!(null)));
}

#[test]
#[should_panic]
fn replacement_outside_an_empty_array_keeps_native_failure() {
    let _ = state::json_with_index(core::json!([]), 0, core::json!(1));
}
