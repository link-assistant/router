//! Independent native oracle source. CI only after all same-SHA JS stages.
use link_assistant_router::translation_core::Json;
use link_assistant_router::translation_json_fields_core::*;

#[test]
fn field_presence_and_scalar_domains_remain_distinct() {
    let value: Json = serde_json::json!({"null":null,"false":false,"empty":"","zero":0,"max":u64::MAX,"negative":-1,"name":"λ😀"});
    assert_eq!(json_field(&value,"absent"),None);
    assert_eq!(json_field(&value,"null"),Some(&Json::Null));
    assert_eq!(json_str_field(&value,"name"),Some("λ😀"));
    assert_eq!(json_str_field(&value,"empty"),Some(""));
    assert_eq!(json_bool_field(&value,"false"),Some(false));
    assert_eq!(json_bool_field(&value,"null"),None);
    assert_eq!(json_u64_field(&value,"zero"),Some(0));
    assert_eq!(json_i64_field(&value,"zero"),Some(0));
    assert_eq!(json_u64_field(&value,"max"),Some(u64::MAX));
    assert_eq!(json_i64_field(&value,"max"),None);
    assert_eq!(json_i64_field(&value,"negative"),Some(-1));
    assert_eq!(json_u64_field(&value,"negative"),None);
}

#[test]
fn indexes_and_json_float_zero_preserve_native_reader_domains() {
    let value: Json = serde_json::json!([null,"λ😀"]);
    assert_eq!(json_index(&value,0),Some(&Json::Null));
    assert_eq!(json_index(&value,1).and_then(Json::as_str),Some("λ😀"));
    assert_eq!(json_index(&value,2),None);
    assert_eq!(json_index(&value,u64::MAX),None);
    assert_eq!(json_index(&Json::Null,0),None);
    let float: Json = serde_json::from_str("{\"zero\":0.0}").unwrap();
    assert_eq!(json_u64_field(&float,"zero"),None);
    assert_eq!(json_i64_field(&float,"zero"),None);
}
