use serde_json::Value;

const PERMISSION_ERROR_CODES: [&str; 1] = ["oauth_not_allowed_for_organization"];

pub(super) fn resource_error_code(body: &str) -> Option<String> {
    let value: Value = serde_json::from_str(body).ok()?;
    let error = value.get("error")?;
    [
        &["details", "error_code"][..],
        &["error_code"][..],
        &["code"][..],
    ]
    .into_iter()
    .find_map(|path| {
        path.iter()
            .try_fold(error, |node, key| node.get(key))?
            .as_str()
            .map(str::to_string)
    })
}

/// Whether a catalog failure is a permission verdict rather than a credential
/// one — the organization is not allowed to use OAuth right now.
#[must_use]
pub fn is_permission_refusal(error: &str) -> bool {
    let Some(body) = error.strip_prefix("HTTP ") else {
        return false;
    };
    let Some((status, body)) = body.split_once(": ") else {
        return false;
    };
    if !status.starts_with("403") {
        return false;
    }
    resource_error_code(body).is_some_and(|code| PERMISSION_ERROR_CODES.contains(&code.as_str()))
}

/// Whether a catalog response proves that the supplied credential is unusable.
#[must_use]
pub fn is_credential_rejection(error: &str) -> bool {
    (error.starts_with("HTTP 401") || error.starts_with("HTTP 403"))
        && !is_permission_refusal(error)
}
