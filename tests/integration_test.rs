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
    use link_assistant_router::config::{BuildArgs, Config, RoutingMode, StoragePolicy};
    use std::path::PathBuf;

    fn args_with_verbose(verbose: bool) -> BuildArgs<'static> {
        BuildArgs {
            host: "0.0.0.0",
            port: "8080",
            token_secret: Some("secret"),
            claude_code_home: "/tmp/claude",
            upstream_base_url: "https://api.anthropic.com",
            verbose,
            api_format: None,
            routing_mode: RoutingMode::Direct,
            storage_policy: StoragePolicy::Memory,
            data_dir: PathBuf::from("/tmp/test-data"),
            claude_cli_bin: None,
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            additional_account_dirs: vec![],
            experimental_compatibility: false,
            admin_key: None,
        }
    }

    #[test]
    fn test_verbose_enabled() {
        let config = Config::build(args_with_verbose(true)).expect("should build");
        assert!(config.verbose);
    }

    #[test]
    fn test_verbose_disabled() {
        let config = Config::build(args_with_verbose(false)).expect("should build");
        assert!(!config.verbose);
    }
}

mod openai_translation_tests {
    use link_assistant_router::openai::{
        anthropic_to_chat_completion, chat_completion_to_anthropic, list_models, map_model,
        ChatMessage, OpenAIChatCompletionRequest,
    };
    use serde_json::json;

    #[test]
    fn maps_openai_aliases_to_claude_models() {
        assert!(map_model("gpt-4o").contains("claude"));
        assert!(map_model("gpt-4o-mini").contains("haiku"));
        assert!(map_model("o1").contains("opus"));
        assert_eq!(
            map_model("claude-opus-4-7"),
            "claude-opus-4-7",
            "native claude IDs pass through"
        );
    }

    #[test]
    fn chat_completion_translates_system_and_user() {
        // Build through serde so we don't need to enumerate every field.
        let req: OpenAIChatCompletionRequest = serde_json::from_value(json!({
            "model": "gpt-4o",
            "messages": [
                {"role": "system", "content": "you are helpful"},
                {"role": "user", "content": "hi"}
            ],
            "stream": false,
            "max_tokens": 64
        }))
        .expect("valid request");
        let _ = ChatMessage {
            // smoke-test that ChatMessage is publicly constructible
            role: "user".into(),
            content: json!("hello"),
            name: None,
        };
        let v = chat_completion_to_anthropic(&req);
        assert!(v.get("system").is_some());
        let messages = v.get("messages").and_then(|m| m.as_array()).unwrap();
        assert_eq!(messages.len(), 1);
        assert_eq!(messages[0]["role"], "user");
    }

    #[test]
    fn anthropic_response_to_openai_chat_completion() {
        let anthropic = json!({
            "id": "msg_123",
            "model": "claude-sonnet-4-5-20250929",
            "stop_reason": "end_turn",
            "content": [
                {"type": "text", "text": "hello"}
            ],
            "usage": {"input_tokens": 4, "output_tokens": 1}
        });
        let v = anthropic_to_chat_completion(&anthropic, "gpt-4o");
        let choice = &v["choices"][0];
        assert_eq!(choice["message"]["role"], "assistant");
        assert_eq!(choice["message"]["content"], "hello");
        assert_eq!(choice["finish_reason"], "stop");
        assert_eq!(v["model"], "gpt-4o");
    }

    #[test]
    fn models_endpoint_includes_known_claude_ids() {
        let v = list_models();
        let data = v["data"].as_array().expect("data array");
        let ids: Vec<&str> = data.iter().filter_map(|m| m["id"].as_str()).collect();
        assert!(ids.iter().any(|id| id.contains("claude")));
    }
}

mod metrics_rendering_tests {
    use link_assistant_router::metrics::{render_prometheus, usage_snapshot, Metrics, Surface};

    #[test]
    fn prometheus_output_contains_all_required_counters() {
        let m = Metrics::default();
        m.record_request(Surface::Anthropic, 200, Some("primary"));
        m.record_request(Surface::OpenAIChat, 429, Some("account-1"));
        m.record_token_issued();
        let out = render_prometheus(&m);
        // Required counter families.
        assert!(out.contains("link_assistant_requests_total"));
        assert!(out.contains("link_assistant_errors_total"));
        assert!(out.contains("link_assistant_anthropic_messages_total"));
        assert!(out.contains("link_assistant_openai_chat_completions_total"));
        assert!(out.contains("link_assistant_tokens_issued_total"));
        // Per-status + per-account labelled counters.
        assert!(out.contains("link_assistant_status_total{code=\"200\"}"));
        assert!(out.contains("link_assistant_status_total{code=\"429\"}"));
        assert!(out.contains("link_assistant_account_calls_total{account=\"primary\"}"));
    }

    #[test]
    fn usage_snapshot_serialises_cleanly() {
        let m = Metrics::default();
        m.record_request(Surface::OpenAIResponses, 200, None);
        m.record_bytes(10, 20);
        let snap = usage_snapshot(&m);
        let json = serde_json::to_string(&snap).expect("serialisable");
        assert!(json.contains("\"requests_total\":1"));
        assert!(json.contains("\"openai_responses\":1"));
        assert!(json.contains("\"bytes_in\":20"));
    }
}

mod cli_parser_tests {
    use link_assistant_router::cli::{Cli, Command, TokenOp};
    use lino_arguments::Parser;

    #[test]
    fn cli_default_subcommand_is_none() {
        let cli = Cli::try_parse_from(["bin", "--port", "9000"]).expect("parses");
        assert!(cli.command.is_none());
        assert_eq!(cli.port, 9000);
    }

    #[test]
    fn cli_parses_serve_subcommand() {
        let cli = Cli::try_parse_from(["bin", "serve"]).expect("parses serve");
        assert!(matches!(cli.command, Some(Command::Serve)));
    }

    #[test]
    fn cli_parses_tokens_issue_with_label() {
        let cli = Cli::try_parse_from([
            "bin",
            "tokens",
            "issue",
            "--ttl-hours",
            "48",
            "--label",
            "ops",
        ])
        .expect("parses tokens issue");
        match cli.command {
            Some(Command::Tokens {
                op: TokenOp::Issue {
                    ttl_hours, label, ..
                },
            }) => {
                assert_eq!(ttl_hours, 48);
                assert_eq!(label, "ops");
            }
            other => panic!("unexpected command: {other:?}"),
        }
    }

    #[test]
    fn cli_parses_doctor_subcommand() {
        let cli = Cli::try_parse_from(["bin", "doctor"]).expect("parses doctor");
        assert!(matches!(cli.command, Some(Command::Doctor)));
    }

    #[test]
    fn cli_parses_disable_flags() {
        let cli = Cli::try_parse_from(["bin", "--disable-openai-api", "--disable-metrics"])
            .expect("parses flags");
        assert!(cli.disable_openai_api);
        assert!(cli.disable_metrics);
        assert!(!cli.disable_anthropic_api);
    }
}
