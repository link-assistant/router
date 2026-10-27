//! Independent owned JSON field/index oracle SOURCE. Gated CI-only, UNRUN.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn depth_0_matches_original_copy_null_and_borrowed_storage() {
    for leaf in [Json::Null,serde_json::json!(false),serde_json::json!(u64::MAX),serde_json::json!(i64::MIN),serde_json::json!("é😀"),serde_json::json!([{"key":"value"}])] {
        let mut value = leaf;
        value = Json::Array(vec![value]);
        let original = value.get(0);
        assert_eq!(fields::json_owned_index(&value,0),original.cloned());
        assert_eq!(fields::json_owned_index_or_null(&value,0),original.cloned().unwrap_or(Json::Null));
        let borrowed = fields::json_index_or_null(&value,0);
        assert_eq!(borrowed,original.unwrap_or(&Json::Null));
        if let Some(selected) = original { assert!(std::ptr::eq(borrowed,selected)); }
        assert_eq!(fields::json_owned_index(&Json::Null,0),None);
        assert_eq!(fields::json_owned_index_or_null(&Json::Null,0),Json::Null);
    }
    let escaped = {
        let mut value = serde_json::json!({"nested":["é😀",true]});
        value = Json::Array(vec![value]);
        fields::json_owned_index_or_null(&value,0)
    };
    assert_eq!(escaped,serde_json::json!({"nested":["é😀",true]}));
}

#[test]
fn depth_1_matches_original_copy_null_and_borrowed_storage() {
    for leaf in [Json::Null,serde_json::json!(false),serde_json::json!(u64::MAX),serde_json::json!(i64::MIN),serde_json::json!("é😀"),serde_json::json!([{"key":"value"}])] {
        let mut value = leaf;
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0");
        assert_eq!(fields::json_owned_field(&value,"0"),original.cloned());
        assert_eq!(fields::json_owned_field_or_null(&value,"0"),original.cloned().unwrap_or(Json::Null));
        let borrowed = fields::json_field_or_null(&value,"0");
        assert_eq!(borrowed,original.unwrap_or(&Json::Null));
        if let Some(selected) = original { assert!(std::ptr::eq(borrowed,selected)); }
        assert_eq!(fields::json_owned_field(&Json::Null,"0"),None);
        assert_eq!(fields::json_owned_field_or_null(&Json::Null,"0"),Json::Null);
    }
    let escaped = {
        let mut value = serde_json::json!({"nested":["é😀",true]});
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_owned_field_or_null(&value,"0")
    };
    assert_eq!(escaped,serde_json::json!({"nested":["é😀",true]}));
}

#[test]
fn depth_2_matches_original_copy_null_and_borrowed_storage() {
    for leaf in [Json::Null,serde_json::json!(false),serde_json::json!(u64::MAX),serde_json::json!(i64::MIN),serde_json::json!("é😀"),serde_json::json!([{"key":"value"}])] {
        let mut value = leaf;
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b"));
        assert_eq!(fields::json_owned_field2(&value,"0", "a/b"),original.cloned());
        assert_eq!(fields::json_owned_field2_or_null(&value,"0", "a/b"),original.cloned().unwrap_or(Json::Null));
        let borrowed = fields::json_field2_or_null(&value,"0", "a/b");
        assert_eq!(borrowed,original.unwrap_or(&Json::Null));
        if let Some(selected) = original { assert!(std::ptr::eq(borrowed,selected)); }
        assert_eq!(fields::json_owned_field2(&Json::Null,"0", "a/b"),None);
        assert_eq!(fields::json_owned_field2_or_null(&Json::Null,"0", "a/b"),Json::Null);
    }
    let escaped = {
        let mut value = serde_json::json!({"nested":["é😀",true]});
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_owned_field2_or_null(&value,"0", "a/b")
    };
    assert_eq!(escaped,serde_json::json!({"nested":["é😀",true]}));
}

#[test]
fn depth_3_matches_original_copy_null_and_borrowed_storage() {
    for leaf in [Json::Null,serde_json::json!(false),serde_json::json!(u64::MAX),serde_json::json!(i64::MIN),serde_json::json!("é😀"),serde_json::json!([{"key":"value"}])] {
        let mut value = leaf;
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀"));
        assert_eq!(fields::json_owned_field3(&value,"0", "a/b", "~é😀"),original.cloned());
        assert_eq!(fields::json_owned_field3_or_null(&value,"0", "a/b", "~é😀"),original.cloned().unwrap_or(Json::Null));
        let borrowed = fields::json_field3_or_null(&value,"0", "a/b", "~é😀");
        assert_eq!(borrowed,original.unwrap_or(&Json::Null));
        if let Some(selected) = original { assert!(std::ptr::eq(borrowed,selected)); }
        assert_eq!(fields::json_owned_field3(&Json::Null,"0", "a/b", "~é😀"),None);
        assert_eq!(fields::json_owned_field3_or_null(&Json::Null,"0", "a/b", "~é😀"),Json::Null);
    }
    let escaped = {
        let mut value = serde_json::json!({"nested":["é😀",true]});
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_owned_field3_or_null(&value,"0", "a/b", "~é😀")
    };
    assert_eq!(escaped,serde_json::json!({"nested":["é😀",true]}));
}

#[test]
fn depth_4_matches_original_copy_null_and_borrowed_storage() {
    for leaf in [Json::Null,serde_json::json!(false),serde_json::json!(u64::MAX),serde_json::json!(i64::MIN),serde_json::json!("é😀"),serde_json::json!([{"key":"value"}])] {
        let mut value = leaf;
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀")).and_then(|child| child.get("last"));
        assert_eq!(fields::json_owned_field4(&value,"0", "a/b", "~é😀", "last"),original.cloned());
        assert_eq!(fields::json_owned_field4_or_null(&value,"0", "a/b", "~é😀", "last"),original.cloned().unwrap_or(Json::Null));
        let borrowed = fields::json_field4_or_null(&value,"0", "a/b", "~é😀", "last");
        assert_eq!(borrowed,original.unwrap_or(&Json::Null));
        if let Some(selected) = original { assert!(std::ptr::eq(borrowed,selected)); }
        assert_eq!(fields::json_owned_field4(&Json::Null,"0", "a/b", "~é😀", "last"),None);
        assert_eq!(fields::json_owned_field4_or_null(&Json::Null,"0", "a/b", "~é😀", "last"),Json::Null);
    }
    let escaped = {
        let mut value = serde_json::json!({"nested":["é😀",true]});
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_owned_field4_or_null(&value,"0", "a/b", "~é😀", "last")
    };
    assert_eq!(escaped,serde_json::json!({"nested":["é😀",true]}));
}
