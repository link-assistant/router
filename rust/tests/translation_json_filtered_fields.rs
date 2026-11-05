//! Independent filtered-field native oracle SOURCE. CI-only after all JS gates; UNRUN.
use link_assistant_router::{translation_core::Json, translation_json_fields_core as fields};

#[test]
fn depth_1_matches_native_filter_and_retains_storage() {
    for leaf in [serde_json::json!(""),serde_json::json!(" \t\n"),serde_json::json!("\u{85}\u{a0}\u{1680}\u{200a}\u{202f}\u{3000}"),serde_json::json!("\u{feff}"),serde_json::json!("\u{180e}"),serde_json::json!("\0"),serde_json::json!(" é😀 "),Json::Null,serde_json::json!(false)] {
        let mut value = leaf;
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        for mode in [false,true] {
            let original = value.get("0").and_then(Json::as_str).filter(|text| if mode { !text.trim().is_empty() } else { !text.is_empty() });
            let borrowed = fields::json_str_field_nonempty(&value,"0",mode);
            assert_eq!(borrowed,original);
            if let (Some(got),Some(expected)) = (borrowed,original) { assert_eq!(got.as_ptr(),expected.as_ptr()); }
            assert_eq!(fields::json_str_field_nonempty_or_empty(&value,"0",mode),original.unwrap_or_default());
            assert_eq!(fields::json_text_field_nonempty(&value,"0",mode),original.map(str::to_owned));
            assert_eq!(fields::json_text_field_nonempty_or_empty(&value,"0",mode),original.unwrap_or_default().to_owned());
        }
    }
    let escaped = {
        let mut value = serde_json::json!(" independent lifetime é😀 ");
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field_nonempty(&value,"0",true).unwrap()
    };
    assert_eq!(escaped," independent lifetime é😀 ");
}

#[test]
fn depth_2_matches_native_filter_and_retains_storage() {
    for leaf in [serde_json::json!(""),serde_json::json!(" \t\n"),serde_json::json!("\u{85}\u{a0}\u{1680}\u{200a}\u{202f}\u{3000}"),serde_json::json!("\u{feff}"),serde_json::json!("\u{180e}"),serde_json::json!("\0"),serde_json::json!(" é😀 "),Json::Null,serde_json::json!(false)] {
        let mut value = leaf;
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        for mode in [false,true] {
            let original = value.get("0").and_then(|child| child.get("a/b")).and_then(Json::as_str).filter(|text| if mode { !text.trim().is_empty() } else { !text.is_empty() });
            let borrowed = fields::json_str_field2_nonempty(&value,"0", "a/b",mode);
            assert_eq!(borrowed,original);
            if let (Some(got),Some(expected)) = (borrowed,original) { assert_eq!(got.as_ptr(),expected.as_ptr()); }
            assert_eq!(fields::json_str_field2_nonempty_or_empty(&value,"0", "a/b",mode),original.unwrap_or_default());
            assert_eq!(fields::json_text_field2_nonempty(&value,"0", "a/b",mode),original.map(str::to_owned));
            assert_eq!(fields::json_text_field2_nonempty_or_empty(&value,"0", "a/b",mode),original.unwrap_or_default().to_owned());
        }
    }
    let escaped = {
        let mut value = serde_json::json!(" independent lifetime é😀 ");
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field2_nonempty(&value,"0", "a/b",true).unwrap()
    };
    assert_eq!(escaped," independent lifetime é😀 ");
}

#[test]
fn depth_3_matches_native_filter_and_retains_storage() {
    for leaf in [serde_json::json!(""),serde_json::json!(" \t\n"),serde_json::json!("\u{85}\u{a0}\u{1680}\u{200a}\u{202f}\u{3000}"),serde_json::json!("\u{feff}"),serde_json::json!("\u{180e}"),serde_json::json!("\0"),serde_json::json!(" é😀 "),Json::Null,serde_json::json!(false)] {
        let mut value = leaf;
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        for mode in [false,true] {
            let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀")).and_then(Json::as_str).filter(|text| if mode { !text.trim().is_empty() } else { !text.is_empty() });
            let borrowed = fields::json_str_field3_nonempty(&value,"0", "a/b", "~é😀",mode);
            assert_eq!(borrowed,original);
            if let (Some(got),Some(expected)) = (borrowed,original) { assert_eq!(got.as_ptr(),expected.as_ptr()); }
            assert_eq!(fields::json_str_field3_nonempty_or_empty(&value,"0", "a/b", "~é😀",mode),original.unwrap_or_default());
            assert_eq!(fields::json_text_field3_nonempty(&value,"0", "a/b", "~é😀",mode),original.map(str::to_owned));
            assert_eq!(fields::json_text_field3_nonempty_or_empty(&value,"0", "a/b", "~é😀",mode),original.unwrap_or_default().to_owned());
        }
    }
    let escaped = {
        let mut value = serde_json::json!(" independent lifetime é😀 ");
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field3_nonempty(&value,"0", "a/b", "~é😀",true).unwrap()
    };
    assert_eq!(escaped," independent lifetime é😀 ");
}

#[test]
fn depth_4_matches_native_filter_and_retains_storage() {
    for leaf in [serde_json::json!(""),serde_json::json!(" \t\n"),serde_json::json!("\u{85}\u{a0}\u{1680}\u{200a}\u{202f}\u{3000}"),serde_json::json!("\u{feff}"),serde_json::json!("\u{180e}"),serde_json::json!("\0"),serde_json::json!(" é😀 "),Json::Null,serde_json::json!(false)] {
        let mut value = leaf;
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        for mode in [false,true] {
            let original = value.get("0").and_then(|child| child.get("a/b")).and_then(|child| child.get("~é😀")).and_then(|child| child.get("last")).and_then(Json::as_str).filter(|text| if mode { !text.trim().is_empty() } else { !text.is_empty() });
            let borrowed = fields::json_str_field4_nonempty(&value,"0", "a/b", "~é😀", "last",mode);
            assert_eq!(borrowed,original);
            if let (Some(got),Some(expected)) = (borrowed,original) { assert_eq!(got.as_ptr(),expected.as_ptr()); }
            assert_eq!(fields::json_str_field4_nonempty_or_empty(&value,"0", "a/b", "~é😀", "last",mode),original.unwrap_or_default());
            assert_eq!(fields::json_text_field4_nonempty(&value,"0", "a/b", "~é😀", "last",mode),original.map(str::to_owned));
            assert_eq!(fields::json_text_field4_nonempty_or_empty(&value,"0", "a/b", "~é😀", "last",mode),original.unwrap_or_default().to_owned());
        }
    }
    let escaped = {
        let mut value = serde_json::json!(" independent lifetime é😀 ");
        value = Json::Object([(String::from("last"), value)].into_iter().collect());
        value = Json::Object([(String::from("~é😀"), value)].into_iter().collect());
        value = Json::Object([(String::from("a/b"), value)].into_iter().collect());
        value = Json::Object([(String::from("0"), value)].into_iter().collect());
        fields::json_text_field4_nonempty(&value,"0", "a/b", "~é😀", "last",true).unwrap()
    };
    assert_eq!(escaped," independent lifetime é😀 ");
}
