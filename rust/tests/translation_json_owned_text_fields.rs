//! Independent owned-field native oracle SOURCE; gated CI only, UNRUN.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn depth_1_matches_native_owned_string_reads() {
    for leaf in [serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(null), serde_json::json!(false), serde_json::json!(7)] {
        let mut value = leaf;
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(Json::as_str);
        assert_eq!(fields::json_text_field(&value, "0"), original.map(str::to_owned));
        assert_eq!(fields::json_text_field(&value, "0"), original.map(str::to_string));
        assert_eq!(fields::json_text_field_or_empty(&value, "0"), original.unwrap_or_default().to_owned());
        assert_eq!(fields::json_text_field_or_empty(&value, "0"), original.map(str::to_owned).unwrap_or_default());
    }
    let owned = {
        let mut value = serde_json::json!("independent lifetime é😀");
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field(&value, "0").unwrap()
    };
    assert_eq!(owned, "independent lifetime é😀");
}

#[test]
fn depth_1_empty_default_outlives_its_receiver() {
    let owned = { let value = Json::Null; fields::json_text_field_or_empty(&value, "0") };
    assert_eq!(owned, "");
}

#[test]
fn depth_2_matches_native_owned_string_reads() {
    for leaf in [serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(null), serde_json::json!(false), serde_json::json!(7)] {
        let mut value = leaf;
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(Json::as_str);
        assert_eq!(fields::json_text_field2(&value, "0", "a/b"), original.map(str::to_owned));
        assert_eq!(fields::json_text_field2(&value, "0", "a/b"), original.map(str::to_string));
        assert_eq!(fields::json_text_field2_or_empty(&value, "0", "a/b"), original.unwrap_or_default().to_owned());
        assert_eq!(fields::json_text_field2_or_empty(&value, "0", "a/b"), original.map(str::to_owned).unwrap_or_default());
    }
    let owned = {
        let mut value = serde_json::json!("independent lifetime é😀");
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field2(&value, "0", "a/b").unwrap()
    };
    assert_eq!(owned, "independent lifetime é😀");
}

#[test]
fn depth_2_empty_default_outlives_its_receiver() {
    let owned = { let value = Json::Null; fields::json_text_field2_or_empty(&value, "0", "a/b") };
    assert_eq!(owned, "");
}

#[test]
fn depth_3_matches_native_owned_string_reads() {
    for leaf in [serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(null), serde_json::json!(false), serde_json::json!(7)] {
        let mut value = leaf;
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀")).and_then(Json::as_str);
        assert_eq!(fields::json_text_field3(&value, "0", "a/b", "~é😀"), original.map(str::to_owned));
        assert_eq!(fields::json_text_field3(&value, "0", "a/b", "~é😀"), original.map(str::to_string));
        assert_eq!(fields::json_text_field3_or_empty(&value, "0", "a/b", "~é😀"), original.unwrap_or_default().to_owned());
        assert_eq!(fields::json_text_field3_or_empty(&value, "0", "a/b", "~é😀"), original.map(str::to_owned).unwrap_or_default());
    }
    let owned = {
        let mut value = serde_json::json!("independent lifetime é😀");
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field3(&value, "0", "a/b", "~é😀").unwrap()
    };
    assert_eq!(owned, "independent lifetime é😀");
}

#[test]
fn depth_3_empty_default_outlives_its_receiver() {
    let owned = { let value = Json::Null; fields::json_text_field3_or_empty(&value, "0", "a/b", "~é😀") };
    assert_eq!(owned, "");
}

#[test]
fn depth_4_matches_native_owned_string_reads() {
    for leaf in [serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(null), serde_json::json!(false), serde_json::json!(7)] {
        let mut value = leaf;
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀")).and_then(|child| child.get("last")).and_then(Json::as_str);
        assert_eq!(fields::json_text_field4(&value, "0", "a/b", "~é😀", "last"), original.map(str::to_owned));
        assert_eq!(fields::json_text_field4(&value, "0", "a/b", "~é😀", "last"), original.map(str::to_string));
        assert_eq!(fields::json_text_field4_or_empty(&value, "0", "a/b", "~é😀", "last"), original.unwrap_or_default().to_owned());
        assert_eq!(fields::json_text_field4_or_empty(&value, "0", "a/b", "~é😀", "last"), original.map(str::to_owned).unwrap_or_default());
    }
    let owned = {
        let mut value = serde_json::json!("independent lifetime é😀");
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field4(&value, "0", "a/b", "~é😀", "last").unwrap()
    };
    assert_eq!(owned, "independent lifetime é😀");
}

#[test]
fn depth_4_empty_default_outlives_its_receiver() {
    let owned = { let value = Json::Null; fields::json_text_field4_or_empty(&value, "0", "a/b", "~é😀", "last") };
    assert_eq!(owned, "");
}

#[test]
fn native_json_string_domain_keeps_large_owned_copies() {
    let text = "é".repeat(524289);
    let value = serde_json::json!({"name":text});
    assert_eq!(fields::json_text_field(&value, "name").as_deref(), value.get("name").and_then(Json::as_str));
}
