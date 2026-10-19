use base64::Engine as _;
use serde_json::Value;

const IMAGE_MEDIA_TYPES: [&str; 4] = ["image/jpeg", "image/png", "image/gif", "image/webp"];

pub(super) fn validate_image_media(media: &str, path: &str) -> Result<(), String> {
    if IMAGE_MEDIA_TYPES.contains(&media) {
        Ok(())
    } else {
        Err(format!("{path} has unsupported image media type {media}"))
    }
}

pub(super) fn validate_http_url(uri: &str, path: &str) -> Result<(), String> {
    let parsed = url::Url::parse(uri).map_err(|_| format!("{path} must be an absolute URI"))?;
    if matches!(parsed.scheme(), "http" | "https") {
        Ok(())
    } else {
        Err(format!("{path} URI must use HTTP or HTTPS"))
    }
}

pub(super) fn reject_image_detail(detail: Option<&Value>, path: &str) -> Result<(), String> {
    if detail.is_some_and(|value| !value.is_null() && value.as_str() != Some("auto")) {
        return Err(format!("{path}.detail cannot be represented by Gemini"));
    }
    Ok(())
}

pub(super) fn reject_unknown_fields(
    value: &Value,
    allowed: &[&str],
    path: &str,
) -> Result<(), String> {
    let object = value
        .as_object()
        .ok_or_else(|| format!("{path} must be an object"))?;
    if let Some(field) = object
        .keys()
        .find(|field| !allowed.contains(&field.as_str()))
    {
        return Err(format!(
            "{path}.{field} cannot be represented by this bridge"
        ));
    }
    Ok(())
}

pub(super) fn reject_non_completed_status(
    status: Option<&Value>,
    path: &str,
) -> Result<(), String> {
    if status.is_some_and(|value| !value.is_null() && value.as_str() != Some("completed")) {
        return Err(format!("{path}.status must be completed"));
    }
    Ok(())
}

pub(super) fn alias_string<'a>(
    value: &'a Value,
    camel: &str,
    snake: &str,
    path: &str,
) -> Result<&'a str, String> {
    value
        .get(camel)
        .or_else(|| value.get(snake))
        .and_then(Value::as_str)
        .filter(|value| !value.is_empty())
        .ok_or_else(|| format!("{path}.{camel} must be a non-empty string"))
}

pub(super) fn required_string<'a>(
    value: &'a Value,
    key: &str,
    path: &str,
) -> Result<&'a str, String> {
    value
        .get(key)
        .and_then(Value::as_str)
        .ok_or_else(|| format!("{path}.{key} must be a string"))
}

pub(super) fn required_value_string<'a>(value: &'a Value, path: &str) -> Result<&'a str, String> {
    value
        .as_str()
        .ok_or_else(|| format!("{path} must be a string"))
}

pub(super) fn required_nonempty_string<'a>(
    value: &'a Value,
    key: &str,
    path: &str,
) -> Result<&'a str, String> {
    required_string(value, key, path).and_then(|text| {
        (!text.is_empty())
            .then_some(text)
            .ok_or_else(|| format!("{path}.{key} must not be empty"))
    })
}

pub(super) fn parse_object(raw: &str, path: &str) -> Result<Value, String> {
    serde_json::from_str(raw)
        .ok()
        .filter(Value::is_object)
        .ok_or_else(|| format!("{path} must encode a JSON object"))
}

pub(super) fn decode_base64(data: &str) -> Result<Vec<u8>, base64::DecodeError> {
    base64::engine::general_purpose::STANDARD
        .decode(data)
        .or_else(|_| base64::engine::general_purpose::STANDARD_NO_PAD.decode(data))
}

pub(super) fn take_explicit_call(
    pending: &mut Vec<(String, String)>,
    id: &str,
    name: &str,
    path: &str,
) -> Result<String, String> {
    let index = pending
        .iter()
        .position(|(candidate_name, candidate_id)| candidate_name == name && candidate_id == id)
        .ok_or_else(|| format!("{path}.functionResponse id/name has no matching call"))?;
    Ok(pending.remove(index).1)
}

pub(super) fn take_unambiguous_call(
    pending: &mut Vec<(String, String)>,
    name: &str,
    path: &str,
) -> Result<String, String> {
    let matches = pending
        .iter()
        .enumerate()
        .filter_map(|(index, (candidate, _))| (candidate == name).then_some(index))
        .collect::<Vec<_>>();
    match matches.as_slice() {
        [index] => Ok(pending.remove(*index).1),
        [] => Err(format!(
            "{path}.functionResponse has no matching call named {name}"
        )),
        _ => Err(format!(
            "{path}.functionResponse is ambiguous; include its function call id"
        )),
    }
}
