//! Independent native oracle SOURCE; execute in gated CI after all JS stages.
use link_assistant_router::translation_carriers_core::*;
use link_assistant_router::translation_core::Json;

#[test]
fn null_presence_result_error_and_eager_fallback_are_distinct() {
    let null = Json::Null;
    let some = json_some(&null);
    assert_eq!(json_option_to_result(&some, "missing"), Ok(Json::Null));
    assert_eq!(json_option_to_result(&json_none(), "missing"), Err("missing".to_owned()));
    let failure = json_err("λ😀\0");
    assert_eq!(failure, Err("λ😀\0".to_owned()));
    assert_eq!(json_result_to_option(&failure), None);
    assert_eq!(json_result_to_option(&json_ok(&null)), Some(Json::Null));
    let fallback = Json::Bool(false);
    assert_eq!(json_result_or(&failure, &fallback), fallback);
    assert_eq!(json_option_or(&some, &fallback), Json::Null);
    assert_eq!(json_option_or(&json_none(), &fallback), fallback);
}

#[test]
fn carrier_copies_keep_owned_payload_storage_independent() {
    let original = serde_json::json!({"nested":[null,false,"λ😀"]});
    let result = json_ok(&original);
    let mut copied = json_result_copy(&result).unwrap();
    copied["nested"][0] = Json::Bool(true);
    assert_eq!(result, Ok(original));
    assert_eq!(copied["nested"][0], Json::Bool(true));
}
