//! Independent local JSON field loan oracle SOURCE. UNRUN; gated native CI only.
use link_assistant_router::{translation_core as core, translation_json_fields_core as fields, translation_text_core as text};

fn choose<'a>(left: &'a core::Json, right: &'a core::Json, choice: bool) -> &'a str {
    if choice { fields::json_str_field_or_empty(left, "name") }
    else { fields::json_str_field_or_empty(right, "name") }
}
fn copied(value: &core::Json) -> String {
    let owner = core::json_copy(value);
    let view = fields::json_str_field_or_empty(&owner, "name");
    text::to_owned(text::trim(view))
}
fn projected_copy(value: &core::Json) -> core::Json {
    let owner = core::json_copy(value);
    match fields::json_field(&owner, "name") {
        Some(view) => core::json_copy(view),
        None => core::Json::Null,
    }
}
#[test]
fn local_borrows_copy_out_and_leave_original_owners_unchanged() {
    for value in [serde_json::json!({"name":" é😀 "}), serde_json::json!({"name":""}), serde_json::json!({"name":null}), core::Json::Null] {
        let original = value.clone();
        assert_eq!(copied(&value), value.get("name").and_then(core::Json::as_str).unwrap_or_default().trim());
        assert_eq!(projected_copy(&value), value.get("name").cloned().unwrap_or(core::Json::Null));
        assert_eq!(value, original);
    }
}
#[test]
fn helper_result_keeps_both_possible_input_roots_and_receiver_pointer_identity() {
    let left = serde_json::json!({"name":"left é😀"});
    let right = serde_json::json!({"name":"right λ"});
    for choice in [false, true] {
        let selected = choose(&left, &right, choice);
        let root = if choice { &left } else { &right };
        let original = root.get("name").and_then(core::Json::as_str).unwrap();
        assert_eq!(selected, original);
        assert!(std::ptr::eq(selected.as_ptr(), original.as_ptr()));
        let owner = core::json_copy(&right);
        let view = choose(&left, &owner, choice);
        assert_eq!(text::to_owned(view), if choice { "left é😀" } else { "right λ" });
    }
}
#[test]
fn a_completed_scope_releases_its_local_view_before_owner_replacement() {
    let value = serde_json::json!({"name":"present"});
    let mut owner = core::json_copy(&value);
    let seen = { let view = fields::json_str_field_or_empty(&owner, "name"); view == "present" };
    owner = core::json_with_field(owner, "after", core::Json::Null);
    assert!(seen);
    assert_eq!(owner, serde_json::json!({"name":"present", "after":null}));
    assert_eq!(value, serde_json::json!({"name":"present"}));
}
