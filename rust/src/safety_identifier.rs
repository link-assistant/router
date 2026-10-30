//! Lossless end-user safety identifier handling across protocol bridges.


/// `OpenAI` accepts at most 64 Unicode characters for `safety_identifier`.
const OPENAI_MAX_CHARACTERS: usize = 64;

pub fn validate_openai(
    identifier: crate::translation_core::Maybe<&crate::translation_core::Str>,
) -> crate::translation_core::Outcome<(), String> {
    if identifier.is_some_and(|value| crate::translation_core::unicode_scalar_count(value) > OPENAI_MAX_CHARACTERS) {
        return Err(crate::translation_core::format!(
            "safety_identifier must contain at most {OPENAI_MAX_CHARACTERS} characters"
        ));
    }
    Ok(())
}

pub fn validate_openai_value(
    value: crate::translation_core::Maybe<&crate::translation_core::Json>,
) -> crate::translation_core::Outcome<(), String> {
    let Some(value) = value else {
        return Ok(());
    };
    if value.is_null() {
        return Ok(());
    }
    let Some(identifier) = value.as_str() else {
        return Err("safety_identifier must be a string".into());
    };
    validate_openai(Some(identifier))
}

pub fn validate_openai_user(
    user: crate::translation_core::Maybe<&crate::translation_core::Str>,
) -> crate::translation_core::Outcome<(), String> {
    if user.is_some_and(|value| crate::translation_core::unicode_scalar_count(value) > OPENAI_MAX_CHARACTERS) {
        return Err(crate::translation_core::format!(
            "user must contain at most {OPENAI_MAX_CHARACTERS} characters"
        ));
    }
    Ok(())
}

pub fn validate_openai_user_value(
    value: crate::translation_core::Maybe<&crate::translation_core::Json>,
) -> crate::translation_core::Outcome<(), String> {
    let Some(value) = value else {
        return Ok(());
    };
    if value.is_null() {
        return Ok(());
    }
    let Some(user) = value.as_str() else {
        return Err("user must be a string".into());
    };
    validate_openai_user(Some(user))
}

/// Read and validate Anthropic's optional metadata identifier for an `OpenAI` target.
pub fn anthropic_user_id(
    body: &crate::translation_core::Json,
) -> crate::translation_core::Outcome<crate::translation_core::Maybe<&crate::translation_core::Str>, String> {
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

#[cfg(test)]
mod json_projection_translation_tests {
    use super::{validate_openai, validate_openai_user};

    pub fn validate_openai_value_reference(
        value: crate::translation_core::Maybe<&crate::translation_core::Json>,
    ) -> crate::translation_core::Outcome<(), String> {
        match value {
            None | Some(crate::translation_core::Json::Null) => Ok(()),
            Some(crate::translation_core::Json::String(identifier)) => validate_openai(Some(identifier)),
            Some(_) => Err("safety_identifier must be a string".into()),
        }
    }

    pub fn validate_openai_user_value_reference(
        value: crate::translation_core::Maybe<&crate::translation_core::Json>,
    ) -> crate::translation_core::Outcome<(), String> {
        match value {
            None | Some(crate::translation_core::Json::Null) => Ok(()),
            Some(crate::translation_core::Json::String(user)) => validate_openai_user(Some(user)),
            Some(_) => Err("user must be a string".into()),
        }
    }

    #[test]
    fn projected_validation_preserves_original_json_patterns() {
        assert_eq!(super::validate_openai_value(None), validate_openai_value_reference(None));
        assert_eq!(super::validate_openai_user_value(None), validate_openai_user_value_reference(None));
        let mut values = vec![
            serde_json::Value::Null,
            serde_json::Value::Bool(false),
            serde_json::json!(0),
            serde_json::json!(1.25),
            serde_json::json!([]),
            serde_json::json!({}),
        ];
        for size in [0, 1, 63, 64, 65] {
            for scalar in ["a", "😀", "e\u{301}"] {
                values.push(serde_json::Value::String(scalar.repeat(size)));
            }
        }
        for value in &values {
            assert_eq!(super::validate_openai_value(Some(value)), validate_openai_value_reference(Some(value)));
            assert_eq!(super::validate_openai_user_value(Some(value)), validate_openai_user_value_reference(Some(value)));
        }
    }
}
