// GENERATED: actual checked reverse base64 receiving witness.
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_domain(value: &crate::translation_core::Json) {
    fn visit(value: &crate::translation_core::Json, depth: usize, nodes: &mut usize) {
        *nodes += 1;
        assert!(*nodes <= 4096 && depth <= 32, "owned reverse JSON budget");
        match value {
            ::serde_json::Value::Array(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items { visit(item, depth + 1, nodes); }
            }
            ::serde_json::Value::Object(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items.values() { visit(item, depth + 1, nodes); }
            }
            _ => {}
        }
    }
    visit(value, 0, &mut 0);
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_copy(value: &crate::translation_core::Json) -> crate::translation_core::Json {
    __ro_domain(value);
    crate::translation_core::json_copy(value)
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_with_field(base: &crate::translation_core::Json, key: &str, value: &crate::translation_core::Json) -> crate::translation_core::Json {
    let base = __ro_copy(base);
    let value = __ro_copy(value);
    assert!(base.is_null() || base.is_object(), "Owned JSON string-key update requires an object or null");
    let result = crate::translation_core::json_with_field(base, key, value);
    __ro_domain(&result);
    result
}

#[must_use]
#[rustfmt::skip]
pub fn standard_encode_bytes(value: &[u8]) -> ::std::string::String {
    return { let __ro_arg_0 = value; { assert!(__ro_arg_0.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_encode_bytes(__ro_arg_0) } };
}

#[must_use]
#[rustfmt::skip]
pub fn standard_encode_text(value: &str) -> ::std::string::String {
    return { let __ro_arg_1 = value; { assert!(__ro_arg_1.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_encode_text(__ro_arg_1) } };
}

#[must_use]
#[rustfmt::skip]
pub fn standard_encode_owned_bytes(value: &[u8]) -> ::std::string::String {
    return { let __ro_arg_2 = value; { assert!(__ro_arg_2.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_encode_owned_bytes(__ro_arg_2.to_vec()) } };
}

#[must_use]
#[rustfmt::skip]
pub fn standard_no_pad_encode_text(value: &str) -> ::std::string::String {
    return { let __ro_arg_3 = value; { assert!(__ro_arg_3.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_no_pad_encode_text(__ro_arg_3) } };
}

#[must_use]
#[rustfmt::skip]
pub fn url_no_pad_encode_bytes(value: &[u8]) -> ::std::string::String {
    return { let __ro_arg_4 = value; { assert!(__ro_arg_4.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_url_no_pad_encode_bytes(__ro_arg_4) } };
}

#[must_use]
#[rustfmt::skip]
pub fn url_no_pad_encode_owned_bytes(value: &[u8]) -> ::std::string::String {
    return { let __ro_arg_5 = value; { assert!(__ro_arg_5.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_url_no_pad_encode_owned_bytes(__ro_arg_5.to_vec()) } };
}

#[must_use]
#[rustfmt::skip]
pub fn url_no_pad_encode_owned_text(value: &str) -> ::std::string::String {
    return { let __ro_arg_6 = value; { assert!(__ro_arg_6.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_url_no_pad_encode_owned_text(__ro_arg_6.to_owned()) } };
}

#[must_use]
#[rustfmt::skip]
pub fn url_no_pad_encode_array32(value: &[u8]) -> ::std::string::String {
    return { let __ro_arg_7 = value; { assert!(__ro_arg_7.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_url_no_pad_encode_array32(::core::convert::TryInto::<[u8; 32]>::try_into(__ro_arg_7).expect("owned reverse base64 array32 length")) } };
}

#[must_use]
#[rustfmt::skip]
pub fn standard_decode_text(value: &str) -> ::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error> {
    return { let __ro_arg_8 = value; { assert!(__ro_arg_8.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_decode_text(__ro_arg_8) } };
}

#[must_use]
#[rustfmt::skip]
pub fn standard_decode_owned_text(value: &str) -> ::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error> {
    return { let __ro_arg_9 = value; { assert!(__ro_arg_9.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_decode_owned_text(__ro_arg_9.to_owned()) } };
}

#[must_use]
#[rustfmt::skip]
pub fn standard_no_pad_decode_text(value: &str) -> ::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error> {
    return { let __ro_arg_10 = value; { assert!(__ro_arg_10.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_standard_no_pad_decode_text(__ro_arg_10) } };
}

#[must_use]
#[rustfmt::skip]
pub fn url_no_pad_decode_text(value: &str) -> ::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error> {
    return { let __ro_arg_11 = value; { assert!(__ro_arg_11.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_url_no_pad_decode_text(__ro_arg_11) } };
}

#[must_use]
#[rustfmt::skip]
pub fn url_no_pad_decode_owned_text(value: &str) -> ::std::result::Result<::std::vec::Vec<u8>,crate::translation_core::Base64Error> {
    return { let __ro_arg_12 = value; { assert!(__ro_arg_12.len() <= 1048576, "owned reverse base64 input bound"); crate::translation_core::base64_url_no_pad_decode_owned_text(__ro_arg_12.to_owned()) } };
}

#[must_use]
#[rustfmt::skip]
pub fn error_text(error: &crate::translation_core::Base64Error) -> ::std::string::String {
    return { let __ro_arg_13 = error; ::std::format!("{}", __ro_arg_13) };
}
