// Independent lexical alias/boundary oracle SOURCE; CI only after all JS gates.
use base64::{Engine as _, engine::general_purpose::STANDARD};
use link_assistant_router::translation_core as core;
#[test]
fn immutable_parameter_and_byte_aliases_keep_original_values_and_encodings() {
    for (value, wanted) in [("", ""), ("f", "Zg=="), ("foo", "Zm9v"), ("Hello", "SGVsbG8="), ("😀", "8J+YgA==")] {
        let alias = value;
        let original = STANDARD.encode(alias);
        let adopted = core::base64_standard_encode_text(alias);
        assert_eq!(original, wanted);
        assert_eq!(adopted, wanted);
        let moved = value.to_owned();
        let raw = moved.as_bytes();
        assert_eq!(STANDARD.encode(raw), core::base64_standard_encode_bytes(raw));
        assert_eq!(moved.as_str(), value);
    }
}
#[test]
fn actual_encode_result_aliases_preserve_native_roundtrip_and_owner_borrow() {
    for value in ["", "f", "foo", "Hello", "😀"] {
        let original = STANDARD.encode(value);
        let original_view = original.as_str();
        let decoded_original = STANDARD.decode(original_view).unwrap();
        let adopted = core::base64_standard_encode_text(value);
        let adopted_view = adopted.as_str();
        let decoded_adopted = core::base64_standard_decode_text(adopted_view).unwrap();
        assert_eq!(decoded_original, value.as_bytes());
        assert_eq!(decoded_adopted, value.as_bytes());
        assert_eq!(original, adopted);
    }
}
