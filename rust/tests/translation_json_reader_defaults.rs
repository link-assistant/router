//! Independent concrete Option default oracle SOURCE. CI only; UNRUN.
use link_assistant_router::translation_core::{self, Json};

fn original_text(value: &Json) -> &str {
    value.get("v").and_then(Json::as_str).unwrap_or_default()
}

fn explicit_text(value: &Json) -> &str {
    let input = {
        let reader_input = value.get("v");
        if let Some(payload) = reader_input {
            Json::as_str(payload)
        } else {
            None
        }
    };
    if let Some(payload) = input {
        payload
    } else {
        ""
    }
}

#[test]
fn borrowed_text_missing_empty_unicode_and_storage_keep_native_defaults() {
    for value in [
        translation_core::json!(null),
        translation_core::json!({}),
        translation_core::json!({"v": null}),
        translation_core::json!({"v": false}),
        translation_core::json!({"v": ""}),
        translation_core::json!({"v": "猫😀\0\r\n"}),
    ] {
        assert_eq!(original_text(&value), explicit_text(&value));
        if let Some(text) = value.get("v").and_then(Json::as_str) {
            assert_eq!(text.as_ptr(), explicit_text(&value).as_ptr());
        }
    }
}

#[test]
fn boolean_integers_float_and_unit_keep_their_concrete_defaults() {
    for value in [
        translation_core::json!({}),
        translation_core::json!({"v": null}),
        translation_core::json!({"v": false}),
        translation_core::json!({"v": true}),
        translation_core::json!({"v": u64::MAX}),
        translation_core::json!({"v": i64::MIN}),
        translation_core::json!({"v": 1.5}),
        translation_core::json!({"v": -0.0}),
    ] {
        let boolean = value.get("v").and_then(Json::as_bool);
        assert_eq!(boolean.unwrap_or_default(), boolean.unwrap_or(false));
        let unsigned = value.get("v").and_then(Json::as_u64);
        assert_eq!(unsigned.unwrap_or_default(), unsigned.unwrap_or(0_u64));
        let signed = value.get("v").and_then(Json::as_i64);
        assert_eq!(signed.unwrap_or_default(), signed.unwrap_or(0_i64));
        let float = value.get("v").and_then(Json::as_f64);
        assert_eq!(
            float.unwrap_or_default().to_bits(),
            float.unwrap_or(0.0_f64).to_bits()
        );
        let unit = value.get("v").and_then(Json::as_null);
        assert_eq!(format!("{:?}", unit.unwrap_or_default()), "()");
        assert_eq!(format!("{:?}", unit.unwrap_or(())), "()");
    }
}
