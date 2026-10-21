//! Concrete owned base64 APIs. Native library internals are not translated.

use super::{Outcome, Str, Text};

/// Preserve the native error identity, fields, Display, Debug and conversions.
pub type Base64Error = ::base64::DecodeError;

/// Encode borrowed bytes with the canonical padded standard alphabet.
#[must_use]
pub fn base64_standard_encode_bytes(value: &[u8]) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::STANDARD, value)
}

/// Encode borrowed scalar text as UTF-8, with canonical standard padding.
#[must_use]
pub fn base64_standard_encode_text(value: &Str) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::STANDARD, value)
}

/// Consume owned bytes at the same native call boundary as Engine::encode.
#[must_use]
pub fn base64_standard_encode_owned_bytes(value: ::std::vec::Vec<u8>) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::STANDARD, value)
}

/// Encode borrowed scalar text without standard-alphabet padding.
#[must_use]
pub fn base64_standard_no_pad_encode_text(value: &Str) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::STANDARD_NO_PAD, value)
}

/// Encode borrowed bytes with the URL alphabet and no padding.
#[must_use]
pub fn base64_url_no_pad_encode_bytes(value: &[u8]) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::URL_SAFE_NO_PAD, value)
}

/// Consume owned bytes while encoding with the unpadded URL alphabet.
#[must_use]
pub fn base64_url_no_pad_encode_owned_bytes(value: ::std::vec::Vec<u8>) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::URL_SAFE_NO_PAD, value)
}

/// Consume owned text while encoding its UTF-8 with the unpadded URL alphabet.
#[must_use]
pub fn base64_url_no_pad_encode_owned_text(value: Text) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::URL_SAFE_NO_PAD, value)
}

/// Keep the concrete by-value 32-byte primitive array contract.
#[must_use]
pub fn base64_url_no_pad_encode_array32(value: [u8; 32]) -> Text {
    ::base64::Engine::encode(&::base64::engine::general_purpose::URL_SAFE_NO_PAD, value)
}

/// Decode borrowed text, preserving every native standard-alphabet error.
pub fn base64_standard_decode_text(value: &Str) -> Outcome<::std::vec::Vec<u8>, Base64Error> {
    ::base64::Engine::decode(&::base64::engine::general_purpose::STANDARD, value)
}

/// Consume owned text, preserving every native standard-alphabet error.
pub fn base64_standard_decode_owned_text(value: Text) -> Outcome<::std::vec::Vec<u8>, Base64Error> {
    ::base64::Engine::decode(&::base64::engine::general_purpose::STANDARD, value)
}

/// Decode borrowed standard text with padding strictly forbidden.
pub fn base64_standard_no_pad_decode_text(value: &Str) -> Outcome<::std::vec::Vec<u8>, Base64Error> {
    ::base64::Engine::decode(&::base64::engine::general_purpose::STANDARD_NO_PAD, value)
}

/// Decode borrowed URL text with padding strictly forbidden.
pub fn base64_url_no_pad_decode_text(value: &Str) -> Outcome<::std::vec::Vec<u8>, Base64Error> {
    ::base64::Engine::decode(&::base64::engine::general_purpose::URL_SAFE_NO_PAD, value)
}

/// Consume owned URL text, preserving native padding and trailing-bit errors.
pub fn base64_url_no_pad_decode_owned_text(value: Text) -> Outcome<::std::vec::Vec<u8>, Base64Error> {
    ::base64::Engine::decode(&::base64::engine::general_purpose::URL_SAFE_NO_PAD, value)
}
