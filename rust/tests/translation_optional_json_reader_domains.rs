//! Independent optional JSON operation oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_core::{self, Json};

fn text(value: Option<&Json>) -> Option<&str> {
    match value {
        Some(value) => Json::as_str(value),
        None => None,
    }
}

fn decimal(value: Option<&Json>) -> Option<f64> {
    match value {
        Some(value) => Json::as_f64(value),
        None => None,
    }
}

fn array(value: Option<&Json>) -> Option<&Vec<Json>> {
    match value {
        Some(value) => Json::as_array(value),
        None => None,
    }
}

#[test]
fn optional_reads_preserve_absence_unit_scalars_and_borrowed_storage() {
    assert_eq!(text(None), None);
    assert_eq!(decimal(None), None);
    assert_eq!(array(None), None);
    let text_value = translation_core::json!("猫😀\0");
    assert_eq!(text(Some(&text_value)), Some("猫😀\0"));
    let values = translation_core::json!([false, null, "Ω"]);
    let projected = array(Some(&values)).expect("array");
    assert!(core::ptr::eq(projected, values.as_array().expect("array")));
    let null = translation_core::json!(null);
    assert_eq!(Some(&null).and_then(Json::as_null), Some(()));
    assert_eq!(None::<&Json>.and_then(Json::as_null), None);
    let zero = translation_core::json!(-0.0);
    assert_eq!(decimal(Some(&zero)).expect("float").to_bits(), (-0.0_f64).to_bits());
    let maximum = translation_core::json!(u64::MAX);
    assert_eq!(Some(&maximum).and_then(Json::as_u64), Some(u64::MAX));
    assert_eq!(Some(&maximum).and_then(Json::as_i64), None);
    assert_eq!(decimal(Some(&maximum)), Some(18446744073709551616.0_f64));
    let floating_integer = translation_core::json!(1.0);
    assert_eq!(Some(&floating_integer).and_then(Json::as_u64), None);
    assert_eq!(Some(&floating_integer).and_then(Json::as_i64), None);
}
