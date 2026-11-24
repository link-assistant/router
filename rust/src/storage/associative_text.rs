//! Links Notation document framing for the associative token representation.

use lino_objects_codec::LinoValue;

use super::TokenRecord;
use super::associative::{
    expect_string_field, object_field, record_from_lino_value, record_to_lino_value,
};

pub(super) fn encode_text<'a>(records: impl IntoIterator<Item = &'a TokenRecord>) -> String {
    let records = records
        .into_iter()
        .map(record_to_lino_value)
        .collect::<Vec<_>>();
    lino_objects_codec::encode(&LinoValue::object([
        ("type", LinoValue::String("RouterState".into())),
        ("subtype", LinoValue::String("TokenStore".into())),
        ("value", LinoValue::Array(records)),
    ]))
}

pub(super) fn decode_text(input: &str) -> Result<Vec<TokenRecord>, String> {
    let root = lino_objects_codec::decode(input).map_err(|error| error.to_string())?;
    expect_string_field(&root, "type", "token store")?
        .eq("RouterState")
        .then_some(())
        .ok_or_else(|| "token store type must be RouterState".to_string())?;
    expect_string_field(&root, "subtype", "token store")?
        .eq("TokenStore")
        .then_some(())
        .ok_or_else(|| "token store subtype must be TokenStore".to_string())?;
    let records = object_field(&root, "value", "token store")?;
    let LinoValue::Array(records) = records else {
        return Err("token store value must be an array".into());
    };
    records.iter().map(record_from_lino_value).collect()
}
