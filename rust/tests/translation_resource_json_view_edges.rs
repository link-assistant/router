// Independent native oracle SOURCE; execute only after every JS CI gate passes.
use link_assistant_router::translation_core::{self as core, Json};
use link_assistant_router::translation_http_protocol_core as http;
use link_assistant_router::translation_text_core as text;

fn projected(value: &Json) -> &Json {
    core::json_index_str(value, "child")
}

fn selected<'a>(left: &'a Json, right: &'a Json, choice: bool) -> &'a Json {
    if choice {
        projected(left)
    } else {
        projected(right)
    }
}

fn copied(value: &Json) -> Json {
    let owner = core::json_copy(value);
    let view = core::json_index_str(&owner, "child");
    core::json_copy(view)
}

fn copied_body(value: &Json) -> Result<String, String> {
    let owner = core::json_copy(value);
    let view = http::http_body_base64(&owner)?;
    Ok(text::repeat(view, 1))
}

#[test]
fn json_views_preserve_identity_roots_and_owned_copies() {
    let left = core::json!({"child": {"value": "é😀"}});
    let right = core::json!({"child": "λ"});
    assert!(std::ptr::eq(projected(&left), &left["child"]));
    assert_eq!(projected(&core::json!(null)), &core::json!(null));
    assert_eq!(copied(&left), left["child"]);
    for choice in [false, true] {
        let expected = if choice { &left["child"] } else { &right["child"] };
        assert!(std::ptr::eq(selected(&left, &right, choice), expected));
    }
    let response = http::http_response(200, &core::json!([]), "aGk=").unwrap();
    assert_eq!(copied_body(&response), Ok(String::from("aGk=")));
}
