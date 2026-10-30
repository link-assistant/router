//! Independent nested JSON oracle SOURCE. CI only after all JavaScript gates; UNRUN.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn depth_2_matches_original_native_readers_and_borrows() {
    let leaves = [Json::Null, serde_json::json!(false), serde_json::json!(true), serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(0), serde_json::json!(u64::MAX), serde_json::json!(i64::MIN), serde_json::json!(i64::MAX), serde_json::json!([])];
    for leaf in leaves {
        let mut value = leaf;
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b"));
        assert_eq!(fields::json_field2(&value, "0", "a/b"), original);
        assert_eq!(fields::json_str_field2(&value, "0", "a/b"), original.and_then(Json::as_str));
        assert_eq!(fields::json_str_field2_or_empty(&value, "0", "a/b"), original.and_then(Json::as_str).unwrap_or_default());
        assert_eq!(fields::json_bool_field2(&value, "0", "a/b"), original.and_then(Json::as_bool));
        assert_eq!(fields::json_bool_field2_or(&value, "0", "a/b", true), original.and_then(Json::as_bool).unwrap_or(true));
        assert_eq!(fields::json_u64_field2(&value, "0", "a/b"), original.and_then(Json::as_u64));
        assert_eq!(fields::json_u64_field2_or(&value, "0", "a/b", u64::MAX), original.and_then(Json::as_u64).unwrap_or(u64::MAX));
        assert_eq!(fields::json_i64_field2(&value, "0", "a/b"), original.and_then(Json::as_i64));
        assert_eq!(fields::json_i64_field2_or(&value, "0", "a/b", i64::MIN), original.and_then(Json::as_i64).unwrap_or(i64::MIN));
        if let Some(original) = original {
            assert!(std::ptr::eq(fields::json_field2(&value, "0", "a/b").unwrap(), original));
            if let Some(text) = original.as_str() {
                assert!(std::ptr::eq(fields::json_str_field2_or_empty(&value, "0", "a/b").as_ptr(), text.as_ptr()));
            }
        }
    }
    let value = Json::Null;
    assert_eq!(fields::json_field2(&value, "0", "a/b"), None);
    assert_eq!(fields::json_str_field2_or_empty(&value, "0", "a/b"), "");
}

#[test]
fn depth_2_result_lifetime_depends_on_receiver_and_never_on_key_storage() {
    let mut value = serde_json::json!("borrowed");
    value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
    value = Json::Object([(String::from("0"), value)].into_iter().collect());
    let borrowed = {
        let key0 = String::from("0");
        let key1 = String::from("a/b");
        fields::json_str_field2_or_empty(&value, &key0, &key1)
    };
    assert_eq!(borrowed, "borrowed");
}

#[test]
fn depth_2_numeric_object_keys_do_not_become_array_indices() {
    let value = serde_json::json!([{"a/b":{"~é😀":{"last":"array"}}}]);
    assert_eq!(fields::json_field2(&value, "0", "a/b"), None);
}

#[test]
fn depth_2_fallback_remains_eager() {
    let mut value = serde_json::json!(false);
    value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
    value = Json::Object([(String::from("0"), value)].into_iter().collect());
    let mut calls = 0;
    assert!(!fields::json_bool_field2_or(&value, "0", "a/b", { calls += 1; true }));
    assert_eq!(calls, 1);
}

#[test]
fn depth_3_matches_original_native_readers_and_borrows() {
    let leaves = [Json::Null, serde_json::json!(false), serde_json::json!(true), serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(0), serde_json::json!(u64::MAX), serde_json::json!(i64::MIN), serde_json::json!(i64::MAX), serde_json::json!([])];
    for leaf in leaves {
        let mut value = leaf;
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀"));
        assert_eq!(fields::json_field3(&value, "0", "a/b", "~é😀"), original);
        assert_eq!(fields::json_str_field3(&value, "0", "a/b", "~é😀"), original.and_then(Json::as_str));
        assert_eq!(fields::json_str_field3_or_empty(&value, "0", "a/b", "~é😀"), original.and_then(Json::as_str).unwrap_or_default());
        assert_eq!(fields::json_bool_field3(&value, "0", "a/b", "~é😀"), original.and_then(Json::as_bool));
        assert_eq!(fields::json_bool_field3_or(&value, "0", "a/b", "~é😀", true), original.and_then(Json::as_bool).unwrap_or(true));
        assert_eq!(fields::json_u64_field3(&value, "0", "a/b", "~é😀"), original.and_then(Json::as_u64));
        assert_eq!(fields::json_u64_field3_or(&value, "0", "a/b", "~é😀", u64::MAX), original.and_then(Json::as_u64).unwrap_or(u64::MAX));
        assert_eq!(fields::json_i64_field3(&value, "0", "a/b", "~é😀"), original.and_then(Json::as_i64));
        assert_eq!(fields::json_i64_field3_or(&value, "0", "a/b", "~é😀", i64::MIN), original.and_then(Json::as_i64).unwrap_or(i64::MIN));
        if let Some(original) = original {
            assert!(std::ptr::eq(fields::json_field3(&value, "0", "a/b", "~é😀").unwrap(), original));
            if let Some(text) = original.as_str() {
                assert!(std::ptr::eq(fields::json_str_field3_or_empty(&value, "0", "a/b", "~é😀").as_ptr(), text.as_ptr()));
            }
        }
    }
    let value = Json::Null;
    assert_eq!(fields::json_field3(&value, "0", "a/b", "~é😀"), None);
    assert_eq!(fields::json_str_field3_or_empty(&value, "0", "a/b", "~é😀"), "");
}

#[test]
fn depth_3_result_lifetime_depends_on_receiver_and_never_on_key_storage() {
    let mut value = serde_json::json!("borrowed");
    value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
    value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
    value = Json::Object([(String::from("0"), value)].into_iter().collect());
    let borrowed = {
        let key0 = String::from("0");
        let key1 = String::from("a/b");
        let key2 = String::from("~é😀");
        fields::json_str_field3_or_empty(&value, &key0, &key1, &key2)
    };
    assert_eq!(borrowed, "borrowed");
}

#[test]
fn depth_3_numeric_object_keys_do_not_become_array_indices() {
    let value = serde_json::json!([{"a/b":{"~é😀":{"last":"array"}}}]);
    assert_eq!(fields::json_field3(&value, "0", "a/b", "~é😀"), None);
}

#[test]
fn depth_3_fallback_remains_eager() {
    let mut value = serde_json::json!(false);
    value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
    value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
    value = Json::Object([(String::from("0"), value)].into_iter().collect());
    let mut calls = 0;
    assert!(!fields::json_bool_field3_or(&value, "0", "a/b", "~é😀", { calls += 1; true }));
    assert_eq!(calls, 1);
}

#[test]
fn depth_4_matches_original_native_readers_and_borrows() {
    let leaves = [Json::Null, serde_json::json!(false), serde_json::json!(true), serde_json::json!("é😀"), serde_json::json!(""), serde_json::json!(0), serde_json::json!(u64::MAX), serde_json::json!(i64::MIN), serde_json::json!(i64::MAX), serde_json::json!([])];
    for leaf in leaves {
        let mut value = leaf;
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀")).and_then(|child| child.get("last"));
        assert_eq!(fields::json_field4(&value, "0", "a/b", "~é😀", "last"), original);
        assert_eq!(fields::json_str_field4(&value, "0", "a/b", "~é😀", "last"), original.and_then(Json::as_str));
        assert_eq!(fields::json_str_field4_or_empty(&value, "0", "a/b", "~é😀", "last"), original.and_then(Json::as_str).unwrap_or_default());
        assert_eq!(fields::json_bool_field4(&value, "0", "a/b", "~é😀", "last"), original.and_then(Json::as_bool));
        assert_eq!(fields::json_bool_field4_or(&value, "0", "a/b", "~é😀", "last", true), original.and_then(Json::as_bool).unwrap_or(true));
        assert_eq!(fields::json_u64_field4(&value, "0", "a/b", "~é😀", "last"), original.and_then(Json::as_u64));
        assert_eq!(fields::json_u64_field4_or(&value, "0", "a/b", "~é😀", "last", u64::MAX), original.and_then(Json::as_u64).unwrap_or(u64::MAX));
        assert_eq!(fields::json_i64_field4(&value, "0", "a/b", "~é😀", "last"), original.and_then(Json::as_i64));
        assert_eq!(fields::json_i64_field4_or(&value, "0", "a/b", "~é😀", "last", i64::MIN), original.and_then(Json::as_i64).unwrap_or(i64::MIN));
        if let Some(original) = original {
            assert!(std::ptr::eq(fields::json_field4(&value, "0", "a/b", "~é😀", "last").unwrap(), original));
            if let Some(text) = original.as_str() {
                assert!(std::ptr::eq(fields::json_str_field4_or_empty(&value, "0", "a/b", "~é😀", "last").as_ptr(), text.as_ptr()));
            }
        }
    }
    let value = Json::Null;
    assert_eq!(fields::json_field4(&value, "0", "a/b", "~é😀", "last"), None);
    assert_eq!(fields::json_str_field4_or_empty(&value, "0", "a/b", "~é😀", "last"), "");
}

#[test]
fn depth_4_result_lifetime_depends_on_receiver_and_never_on_key_storage() {
    let mut value = serde_json::json!("borrowed");
    value = Json::Object([(String::from("last"), value)].into_iter().collect());
    value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
    value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
    value = Json::Object([(String::from("0"), value)].into_iter().collect());
    let borrowed = {
        let key0 = String::from("0");
        let key1 = String::from("a/b");
        let key2 = String::from("~é😀");
        let key3 = String::from("last");
        fields::json_str_field4_or_empty(&value, &key0, &key1, &key2, &key3)
    };
    assert_eq!(borrowed, "borrowed");
}

#[test]
fn depth_4_numeric_object_keys_do_not_become_array_indices() {
    let value = serde_json::json!([{"a/b":{"~é😀":{"last":"array"}}}]);
    assert_eq!(fields::json_field4(&value, "0", "a/b", "~é😀", "last"), None);
}

#[test]
fn depth_4_fallback_remains_eager() {
    let mut value = serde_json::json!(false);
    value = Json::Object([(String::from("last"), value)].into_iter().collect());
    value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
    value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
    value = Json::Object([(String::from("0"), value)].into_iter().collect());
    let mut calls = 0;
    assert!(!fields::json_bool_field4_or(&value, "0", "a/b", "~é😀", "last", { calls += 1; true }));
    assert_eq!(calls, 1);
}
