//! Independent native oracle SOURCE. CI only after every same-SHA JS gate.
use base64::Engine as _;
use base64::engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD};
use link_assistant_router::translation_core as core;

#[test]
fn production_owned_and_borrowed_base64_inputs_keep_native_results() {
    for text in ["", "f", "foo", "π\0🙂", "line\nline\r\n"] {
        assert_eq!(core::base64_standard_encode_text(text), STANDARD.encode(text));
        assert_eq!(
            core::base64_standard_encode_bytes(text.as_bytes()),
            STANDARD.encode(text.as_bytes())
        );
        assert_eq!(
            core::base64_standard_encode_owned_bytes(text.as_bytes().to_vec()),
            STANDARD.encode(text.as_bytes())
        );
        let encoded = URL_SAFE_NO_PAD.encode(text);
        assert_eq!(
            core::base64_url_no_pad_decode_text(&encoded),
            URL_SAFE_NO_PAD.decode(&encoded)
        );
        assert_eq!(
            core::base64_url_no_pad_decode_owned_text(encoded.clone()),
            URL_SAFE_NO_PAD.decode(encoded)
        );
    }
    assert_eq!(core::base64_standard_encode_text("π\0🙂"), "z4AA8J+Zgg==");
    for bytes in [
        [0_u8; 32],
        [255_u8; 32],
        std::array::from_fn(|index| u8::try_from(index).expect("index below 32")),
    ] {
        assert_eq!(
            core::base64_url_no_pad_encode_array32(bytes),
            URL_SAFE_NO_PAD.encode(bytes)
        );
    }
}

#[test]
fn production_decode_error_identity_and_display_remain_native() {
    for text in ["", "Zg", "Zg=", "Zg==", "Zh", "?", "AP8Q", "π", "Zm9v\n", "AA=A"] {
        let original = STANDARD.decode(text);
        let adopted = core::base64_standard_decode_text(text);
        assert_eq!(adopted, original, "standard input: {text:?}");
        if let (Err(left), Err(right)) = (&adopted, &original) {
            assert_eq!(left.to_string(), right.to_string());
            assert_eq!(format!("{left:?}"), format!("{right:?}"));
        }
        let original = URL_SAFE_NO_PAD.decode(text);
        assert_eq!(
            core::base64_url_no_pad_decode_text(text),
            original,
            "URL input: {text:?}"
        );
        assert_eq!(
            core::base64_url_no_pad_decode_owned_text(text.to_owned()),
            original
        );
    }
}

#[test]
fn expression_operands_evaluate_once_and_moved_containers_keep_their_call_boundary() {
    let mut evaluations = 0;
    let encoded = core::base64_standard_encode_text({
        evaluations += 1;
        "secret"
    });
    assert_eq!(evaluations, 1);
    assert_eq!(encoded, "c2VjcmV0");
    let mut packed = vec![0_u8, 255, 16];
    packed.reserve(128);
    assert_eq!(core::base64_standard_encode_owned_bytes(packed), "AP8Q");
    let signature = String::from("c2VjcmV0");
    assert_eq!(
        core::base64_url_no_pad_decode_owned_text(signature).unwrap(),
        b"secret"
    );
}
