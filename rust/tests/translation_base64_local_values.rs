// Independent original/adopted boundary oracle SOURCE; gated CI only.
use base64::{Engine as _, engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD}};
use link_assistant_router::translation_core as core;
#[test]
fn original_immutable_locals_and_borrowed_utf8_views_keep_exact_encodings() {
    for (value, wanted) in [("", ""), ("f", "Zg=="), ("fo", "Zm8="), ("foo", "Zm9v"), ("Hello", "SGVsbG8="), ("\0", "AA=="), ("😀", "8J+YgA==")] {
        let original = STANDARD.encode(value.as_bytes());
        let adopted = core::base64_standard_encode_bytes(value.as_bytes());
        assert_eq!(original, wanted);
        assert_eq!(adopted, wanted);
        assert_eq!(core::base64_standard_encode_text(value), wanted);
        let owned = value.to_owned();
        assert_eq!(core::base64_url_no_pad_encode_bytes(owned.as_bytes()), URL_SAFE_NO_PAD.encode(owned.as_bytes()));
        // The borrowed call must leave its actual original owner usable.
        assert_eq!(owned.as_str(), value);
    }
}
#[test]
fn original_vec_slice_and_owned_string_views_keep_borrows_and_native_errors() {
    for value in [vec![], vec![0], vec![255, 0, 128], vec![1, 2, 3, 4]] {
        let original = STANDARD.encode(value.as_slice());
        let adopted = core::base64_standard_encode_bytes(value.as_slice());
        assert_eq!(original, adopted);
        assert_eq!(value.len(), value.as_slice().len());
    }
    for value in ["", "Zg==", "Zm9v", "Zg", "====", "SGVsbG8=", "A==="] {
        let owned = value.to_owned();
        let original = STANDARD.decode(owned.as_str());
        let adopted = core::base64_standard_decode_text(owned.as_str());
        assert_eq!(original, adopted);
        assert_eq!(owned.as_str(), value);
    }
}
