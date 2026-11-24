//! Canonical, credential-free Router origins.

use super::AnyError;

/// Whether two spellings name the same Router.
pub(super) fn same_origin(one: &str, other: &str) -> bool {
    match (normalize_server(one), normalize_server(other)) {
        (Ok(one), Ok(other)) => one == other,
        _ => false,
    }
}

pub(super) fn normalize_server(server: &str) -> Result<String, AnyError> {
    let parsed = url::Url::parse(server.trim()).map_err(|_| {
        "server URL must be an absolute http:// or https:// origin without credentials, path, query, or fragment"
    })?;
    if !matches!(parsed.scheme(), "http" | "https")
        || parsed.cannot_be_a_base()
        || parsed.host_str().is_none()
        || !parsed.username().is_empty()
        || parsed.password().is_some()
        || parsed.path() != "/"
        || parsed.query().is_some()
        || parsed.fragment().is_some()
    {
        return Err(
            "server URL must be an absolute http:// or https:// origin without credentials, path, query, or fragment"
                .into(),
        );
    }
    let host = match parsed.host().expect("checked above") {
        url::Host::Ipv6(address) => format!("[{address}]"),
        host => host.to_string(),
    };
    Ok(parsed.port().map_or_else(
        || format!("{}://{host}", parsed.scheme()),
        |port| format!("{}://{host}:{port}", parsed.scheme()),
    ))
}

/// Validate and canonicalize a public server origin without ever embedding
/// the rejected input in an error.
pub fn canonical_server_origin(server: &str) -> Result<String, AnyError> {
    normalize_server(server)
}
