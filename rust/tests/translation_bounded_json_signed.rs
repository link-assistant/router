//! Independent checked numeric JSON conversion oracle. CI after eight JS gates.
use link_assistant_router::translation_json_core::json_build_i64_unsigned;
use serde_json::json;
#[test]
fn unsigned_values_retain_the_signed_destination_bound() {
    assert_eq!(json_build_i64_unsigned(0), json!(0i64));
    assert_eq!(json_build_i64_unsigned(i64::MAX as u64), json!(i64::MAX));
    assert!(std::panic::catch_unwind(|| json_build_i64_unsigned(i64::MAX as u64 + 1)).is_err());
    assert!(std::panic::catch_unwind(|| json_build_i64_unsigned(u64::MAX)).is_err());
}
