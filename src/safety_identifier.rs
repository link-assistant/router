//! Lossless end-user safety identifier handling across protocol bridges.

use serde_json::Value;

/// `OpenAI` accepts at most 64 Unicode characters for `safety_identifier`.
const OPENAI_MAX_CHARACTERS: usize = 64;

pub fn validate_openai(identifier: Option<&str>) -> Result<(), String> {
    if identifier.is_some_and(|value| value.chars().count() > OPENAI_MAX_CHARACTERS) {
        return Err(format!(
            "safety_identifier must contain at most {OPENAI_MAX_CHARACTERS} characters"
        ));
    }
    Ok(())
}

pub fn validate_openai_value(value: Option<&Value>) -> Result<(), String> {
    match value {
        None | Some(Value::Null) => Ok(()),
        Some(Value::String(identifier)) => validate_openai(Some(identifier)),
        Some(_) => Err("safety_identifier must be a string".into()),
    }
}

pub fn validate_openai_user(user: Option<&str>) -> Result<(), String> {
    if user.is_some_and(|value| value.chars().count() > OPENAI_MAX_CHARACTERS) {
        return Err(format!(
            "user must contain at most {OPENAI_MAX_CHARACTERS} characters"
        ));
    }
    Ok(())
}

pub fn validate_openai_user_value(value: Option<&Value>) -> Result<(), String> {
    match value {
        None | Some(Value::Null) => Ok(()),
        Some(Value::String(user)) => validate_openai_user(Some(user)),
        Some(_) => Err("user must be a string".into()),
    }
}

/// Read and validate Anthropic's optional metadata identifier for an `OpenAI` target.
pub fn anthropic_user_id(body: &Value) -> Result<Option<&str>, String> {
    let Some(metadata) = body.get("metadata") else {
        return Ok(None);
    };
    let Some(metadata) = metadata.as_object() else {
        return Err("metadata must be an object".into());
    };
    let Some(identifier) = metadata.get("user_id") else {
        return Ok(None);
    };
    let Some(identifier) = identifier.as_str() else {
        return Err("metadata.user_id must be a string".into());
    };
    validate_openai(Some(identifier))?;
    Ok(Some(identifier))
}
