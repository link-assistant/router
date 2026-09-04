use super::*;

pub fn token_subject(token: &str) -> Result<String, AnyError> {
    token_claim(token)?
        .get("sub")
        .and_then(Value::as_str)
        .map(str::to_string)
        .ok_or_else(|| "router run token has no subject to revoke".into())
}

pub fn token_client_binding(token: &str) -> Result<(Option<String>, Option<String>), AnyError> {
    let claims = token_claim(token)?;
    Ok((
        claims
            .get("client_kind")
            .and_then(Value::as_str)
            .map(str::to_string),
        claims
            .get("principal_id")
            .and_then(Value::as_str)
            .map(str::to_string),
    ))
}

pub(super) fn exact_token_binding(token: &str, client: ClientKind) -> Result<String, AnyError> {
    let (bound, principal) = token_client_binding(token)?;
    if bound.as_deref() != Some(client.canonical_name()) {
        return Err(format!(
            "the supplied token must carry the exact `{}` client binding",
            client.canonical_name()
        )
        .into());
    }
    principal
        .filter(|value| !value.trim().is_empty())
        .ok_or_else(|| "the supplied token must carry a subscriber principal".into())
}

fn token_claim(token: &str) -> Result<Value, AnyError> {
    let payload = token
        .split('.')
        .nth(1)
        .ok_or("router returned a token without a JWT payload")?;
    let decoded = base64::engine::general_purpose::URL_SAFE_NO_PAD
        .decode(payload)
        .map_err(|error| format!("router returned an invalid JWT payload: {error}"))?;
    serde_json::from_slice(&decoded).map_err(Into::into)
}
