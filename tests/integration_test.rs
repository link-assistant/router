//! Integration tests for Link.Assistant.Router.
//!
//! Tests the token system, proxy behavior, API format routing, and header forwarding.

use link_assistant_router::config::ApiFormat;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::proxy::{resolve_upstream_path, REQUIRED_FORWARD_HEADERS};
use link_assistant_router::token::{TokenManager, TOKEN_PREFIX};
use link_assistant_router::VERSION;

mod token_integration_tests {
    use super::*;

    #[test]
    fn test_token_roundtrip() {
        let mgr = TokenManager::new("integration-test-secret");
        let token = mgr.issue_token(1, "integration-test").unwrap();
        assert!(token.starts_with(TOKEN_PREFIX));

        let claims = mgr.validate_token(&token).unwrap();
        assert_eq!(claims.label, "integration-test");
    }

    #[test]
    fn test_different_secrets_reject() {
        let mgr1 = TokenManager::new("secret-one");
        let mgr2 = TokenManager::new("secret-two");

        let token = mgr1.issue_token(1, "test").unwrap();
        let result = mgr2.validate_token(&token);
        assert!(result.is_err());
    }

    #[test]
    fn test_revoke_then_reject() {
        let mgr = TokenManager::new("revocation-test-secret");
        let token = mgr.issue_token(24, "to-revoke").unwrap();

        let claims = mgr.validate_token(&token).unwrap();
        mgr.revoke_token(&claims.sub).unwrap();

        let result = mgr.validate_token(&token);
        assert!(result.is_err());
    }

    #[test]
    fn test_multiple_tokens_independent() {
        let mgr = TokenManager::new("multi-token-secret");
        let t1 = mgr.issue_token(24, "token-1").unwrap();
        let t2 = mgr.issue_token(24, "token-2").unwrap();

        assert_ne!(t1, t2);

        let c1 = mgr.validate_token(&t1).unwrap();
        let c2 = mgr.validate_token(&t2).unwrap();
        assert_ne!(c1.sub, c2.sub);
        assert_eq!(c1.label, "token-1");
        assert_eq!(c2.label, "token-2");
    }
}

mod oauth_integration_tests {
    use super::*;

    #[test]
    fn test_manual_token_set_and_get() {
        let provider = OAuthProvider::new("/tmp/nonexistent-test-dir");
        provider.set_token("manually-set-oauth-token");
        let token = provider.get_token().unwrap();
        assert_eq!(token, "manually-set-oauth-token");
    }

    #[test]
    fn test_missing_credentials_error() {
        let provider = OAuthProvider::new("/tmp/definitely-does-not-exist");
        let result = provider.get_token();
        assert!(result.is_err());
    }

    #[test]
    fn test_credential_file_parsing() {
        let dir = std::env::temp_dir().join(format!("router-int-test-{}", uuid::Uuid::new_v4()));
        std::fs::create_dir_all(&dir).unwrap();

        std::fs::write(
            dir.join("credentials.json"),
            r#"{"accessToken": "file-based-token"}"#,
        )
        .unwrap();

        let provider = OAuthProvider::new(dir.to_str().unwrap());
        let token = provider.get_token().unwrap();
        assert_eq!(token, "file-based-token");

        std::fs::remove_dir_all(&dir).ok();
    }
}

mod version_tests {
    use super::*;

    #[test]
    fn test_version_is_not_empty() {
        assert!(!VERSION.is_empty());
    }

    #[test]
    fn test_version_matches_cargo_toml() {
        assert!(VERSION.starts_with("0."));
    }
}

mod api_format_tests {
    use super::*;

    #[test]
    fn test_api_format_anthropic_parsing() {
        assert_eq!(
            ApiFormat::from_str_opt("anthropic"),
            Some(ApiFormat::Anthropic)
        );
        assert_eq!(
            ApiFormat::from_str_opt("messages"),
            Some(ApiFormat::Anthropic)
        );
        assert_eq!(
            ApiFormat::from_str_opt("ANTHROPIC"),
            Some(ApiFormat::Anthropic)
        );
    }

    #[test]
    fn test_api_format_bedrock_parsing() {
        assert_eq!(ApiFormat::from_str_opt("bedrock"), Some(ApiFormat::Bedrock));
        assert_eq!(ApiFormat::from_str_opt("invoke"), Some(ApiFormat::Bedrock));
        assert_eq!(ApiFormat::from_str_opt("BEDROCK"), Some(ApiFormat::Bedrock));
    }

    #[test]
    fn test_api_format_vertex_parsing() {
        assert_eq!(ApiFormat::from_str_opt("vertex"), Some(ApiFormat::Vertex));
        assert_eq!(
            ApiFormat::from_str_opt("rawpredict"),
            Some(ApiFormat::Vertex)
        );
        assert_eq!(ApiFormat::from_str_opt("VERTEX"), Some(ApiFormat::Vertex));
    }

    #[test]
    fn test_api_format_unknown() {
        assert!(ApiFormat::from_str_opt("unknown").is_none());
        assert!(ApiFormat::from_str_opt("").is_none());
    }
}

mod path_routing_tests {
    use super::*;

    // Anthropic Messages API format
    #[test]
    fn test_anthropic_messages_path() {
        assert_eq!(resolve_upstream_path("/v1/messages"), "/v1/messages");
    }

    #[test]
    fn test_anthropic_count_tokens_path() {
        assert_eq!(
            resolve_upstream_path("/v1/messages/count_tokens"),
            "/v1/messages/count_tokens"
        );
    }

    // Bedrock InvokeModel API format
    #[test]
    fn test_bedrock_invoke_path() {
        assert_eq!(resolve_upstream_path("/invoke"), "/invoke");
    }

    #[test]
    fn test_bedrock_invoke_stream_path() {
        assert_eq!(
            resolve_upstream_path("/invoke-with-response-stream"),
            "/invoke-with-response-stream"
        );
    }

    // Vertex AI rawPredict API format
    #[test]
    fn test_vertex_raw_predict_path() {
        let path = "/v1/projects/my-project/locations/us-east5/publishers/anthropic/models/claude-sonnet-4-20250514:rawPredict";
        assert_eq!(resolve_upstream_path(path), path);
    }

    #[test]
    fn test_vertex_stream_raw_predict_path() {
        let path = "/v1/projects/my-project/locations/us-east5/publishers/anthropic/models/claude-sonnet-4-20250514:streamRawPredict";
        assert_eq!(resolve_upstream_path(path), path);
    }

    #[test]
    fn test_vertex_count_tokens_raw_predict_path() {
        let path = "/v1/projects/my-project/locations/us-east5/publishers/anthropic/models/claude-sonnet-4-20250514/count-tokens:rawPredict";
        assert_eq!(resolve_upstream_path(path), path);
    }

    // Legacy path prefix
    #[test]
    fn test_legacy_prefix_stripped() {
        assert_eq!(
            resolve_upstream_path("/api/latest/anthropic/v1/messages"),
            "/v1/messages"
        );
    }

    #[test]
    fn test_legacy_prefix_root() {
        assert_eq!(resolve_upstream_path("/api/latest/anthropic"), "");
    }

    #[test]
    fn test_legacy_prefix_with_nested_path() {
        assert_eq!(
            resolve_upstream_path("/api/latest/anthropic/v1/messages/count_tokens"),
            "/v1/messages/count_tokens"
        );
    }
}

mod required_headers_tests {
    use super::*;

    #[test]
    fn test_required_headers_include_anthropic_beta() {
        assert!(REQUIRED_FORWARD_HEADERS.contains(&"anthropic-beta"));
    }

    #[test]
    fn test_required_headers_include_anthropic_version() {
        assert!(REQUIRED_FORWARD_HEADERS.contains(&"anthropic-version"));
    }

    #[test]
    fn test_required_headers_include_session_id() {
        assert!(REQUIRED_FORWARD_HEADERS.contains(&"x-claude-code-session-id"));
    }
}

mod config_verbose_tests {
    use link_assistant_router::config::Config;

    #[test]
    fn test_verbose_enabled() {
        let config = Config::build(
            "0.0.0.0",
            "8080",
            Some("secret"),
            "/tmp/claude",
            "https://api.anthropic.com",
            true,
            None,
        )
        .expect("should build");
        assert!(config.verbose);
    }

    #[test]
    fn test_verbose_disabled() {
        let config = Config::build(
            "0.0.0.0",
            "8080",
            Some("secret"),
            "/tmp/claude",
            "https://api.anthropic.com",
            false,
            None,
        )
        .expect("should build");
        assert!(!config.verbose);
    }
}
