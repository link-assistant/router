use super::{
    ClientKind, Config, ExitCode, IssueRequest, TokenManager, build_token_store,
    build_token_store_read_only,
};

/// Validate that a supplied local token is bound to exactly this adapter.
pub(super) struct LocalTokenBinding {
    pub(super) token_id: String,
    pub(super) principal_id: String,
}

fn exact_local_token_binding(
    claims: crate::token::TokenClaims,
    client: ClientKind,
) -> Result<LocalTokenBinding, Box<dyn std::error::Error>> {
    let client_name = claims
        .client_kind
        .as_deref()
        .ok_or("the supplied token has no managed-client binding")?;
    if client_name != client.canonical_name() {
        if ClientKind::ALL
            .iter()
            .any(|candidate| client_name == candidate.canonical_name())
        {
            return Err(format!(
                "the supplied token is bound to {client_name}, not {}",
                client.canonical_name()
            )
            .into());
        }
        return Err(
            "the supplied token has an unknown or non-canonical managed-client binding".into(),
        );
    }
    let principal_id = claims
        .principal_id
        .filter(|value| !value.trim().is_empty())
        .ok_or("the supplied token has no subscriber principal")?;
    Ok(LocalTokenBinding {
        token_id: claims.sub,
        principal_id,
    })
}

pub(super) fn local_token_binding(
    config: &Config,
    token: &str,
    client: ClientKind,
) -> Result<Option<LocalTokenBinding>, Box<dyn std::error::Error>> {
    crate::token_secret::ensure_real(&config.token_secret)?;
    let store = build_token_store_read_only(config.storage_policy, &config.data_dir)?;
    let manager = TokenManager::with_store(&config.token_secret, store);
    let Ok(claims) = manager.validate_token(token) else {
        // The supplied credential can belong to a remote Router with a
        // different signing key. Its catalog endpoint is the authority for
        // that credential; only locally verifiable tokens can be inspected or
        // revoked from this data directory.
        return Ok(None);
    };
    exact_local_token_binding(claims, client).map(Some)
}

/// Read the self-describing binding from a foreign token before asking its
/// issuing Router to authenticate it through the client's non-inference
/// catalog. The payload is not trusted until that catalog succeeds.
pub(super) fn decoded_token_binding(
    token: &str,
    client: ClientKind,
) -> Result<LocalTokenBinding, Box<dyn std::error::Error + Send + Sync>> {
    let (client_kind, principal_id) = crate::managed_server::token_client_binding(token)?;
    let client_kind = client_kind.ok_or("the supplied token has no managed-client binding")?;
    if client_kind != client.canonical_name() {
        return Err(format!(
            "the supplied token is bound to {client_kind}, not {}",
            client.canonical_name()
        )
        .into());
    }
    let principal_id = principal_id
        .filter(|value| !value.trim().is_empty())
        .ok_or("the supplied token has no subscriber principal")?;
    Ok(LocalTokenBinding {
        token_id: crate::managed_server::token_subject(token)?,
        principal_id,
    })
}

pub(super) fn token_manager(config: &Config) -> Result<TokenManager, Box<dyn std::error::Error>> {
    if !config.data_dir.exists() {
        std::fs::create_dir_all(&config.data_dir)?;
    }
    let store = build_token_store(config.storage_policy, &config.data_dir)?;
    crate::token_secret::ensure_real(&config.token_secret)?;
    Ok(TokenManager::with_store(&config.token_secret, store))
}

pub(super) fn issue_client_token(
    config: &Config,
    client: ClientKind,
    ttl_hours: i64,
) -> Result<(String, String), Box<dyn std::error::Error>> {
    let manager = token_manager(config)?;
    Ok(manager.issue_with_id(&IssueRequest {
        ttl_hours,
        label: &format!("client-{client}"),
        account: Some(crate::credential_recovery_store::PRIMARY_ACCOUNT),
        max_requests: None,
        max_tokens: None,
        rate_limit_per_minute: None,
        scope: "",
        github_repos: Vec::new(),
        sliding_window_seconds: None,
        client_kind: Some(client.canonical_name()),
        principal_id: Some(crate::credential_recovery_store::PRIMARY_ACCOUNT),
    })?)
}

pub(super) fn local_client_base_url(config: &Config) -> String {
    let host = match config.listen_addr.ip() {
        std::net::IpAddr::V4(ip) if ip.is_unspecified() => "127.0.0.1".to_string(),
        std::net::IpAddr::V6(ip) if ip.is_unspecified() => "[::1]".to_string(),
        ip => ip.to_string(),
    };
    format!("http://{host}:{}", config.listen_addr.port())
}

pub(super) fn shell_quote(value: &str) -> String {
    format!("'{}'", value.replace('\'', "'\\''"))
}

pub fn failed(error: impl std::fmt::Display) -> ExitCode {
    eprintln!(
        "error: {}",
        crate::login_url::redact_secrets(&error.to_string())
    );
    ExitCode::from(1)
}

#[cfg(test)]
mod binding_tests {
    use super::*;

    fn claims(client_kind: Option<&str>, principal_id: Option<&str>) -> crate::token::TokenClaims {
        crate::token::TokenClaims {
            sub: "token-id".into(),
            iat: 1,
            exp: i64::MAX,
            label: String::new(),
            scope: String::new(),
            github_repos: Vec::new(),
            client_kind: client_kind.map(str::to_string),
            principal_id: principal_id.map(str::to_string),
        }
    }

    #[test]
    fn adopted_local_tokens_require_the_exact_complete_binding() {
        let accepted =
            exact_local_token_binding(claims(Some("codex"), Some("primary")), ClientKind::Codex)
                .expect("canonical complete binding");
        assert_eq!(accepted.token_id, "token-id");
        assert_eq!(accepted.principal_id, "primary");

        for rejected in [
            claims(None, None),
            claims(None, Some("primary")),
            claims(Some("codex"), None),
            claims(Some("codex"), Some("  ")),
            claims(Some("claude-code"), Some("primary")),
            claims(Some("future-client"), Some("primary")),
            claims(Some("claude"), Some("primary")),
        ] {
            assert!(
                exact_local_token_binding(rejected, ClientKind::Codex).is_err(),
                "generic, partial, non-canonical and foreign bindings must fail closed"
            );
        }
    }
}
