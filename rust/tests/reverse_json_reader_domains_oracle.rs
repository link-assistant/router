//! Independent native optional JSON reader domain oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_core::{self, Json};

#[test]
fn number_array_and_map_readers_return_their_original_input_storage() {
    let array = translation_core::json!(["猫😀", false, null]);
    let object = translation_core::json!({"猫": "😀", "__proto__": "safe"});
    let number = translation_core::json!(1.5);
    let array_read = Json::as_array(&array).expect("array");
    let object_read = Json::as_object(&object).expect("map");
    let number_read = Json::as_number(&number).expect("number");
    assert!(core::ptr::eq(array_read, array.as_array().expect("array")));
    assert!(core::ptr::eq(object_read, object.as_object().expect("map")));
    assert!(core::ptr::eq(number_read, number.as_number().expect("number")));
    assert_eq!(Json::as_array(&object), None);
    assert_eq!(Json::as_object(&array), None);
    assert_eq!(Json::as_number(&array), None);
}

#[test]
fn copied_scalar_optional_values_preserve_unit_and_binary64_signed_zero() {
    let null = translation_core::json!(null);
    assert_eq!(Json::as_null(&null), Some(()));
    assert_eq!(Json::as_f64(&null), None);
    assert_eq!(Json::as_null(&translation_core::json!(false)), None);
    let negative_zero = translation_core::json!(-0.0);
    assert_eq!(
        Json::as_f64(&negative_zero).expect("float").to_bits(),
        (-0.0_f64).to_bits()
    );
    assert_eq!(
        Json::as_f64(&translation_core::json!(u64::MAX)),
        Some(18446744073709551616.0_f64)
    );
}
