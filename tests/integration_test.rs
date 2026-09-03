//! Integration tests for Link.Assistant.Router.
//!
//! Tests the token system, proxy behavior, API format routing, and header forwarding.

use link_assistant_router::VERSION;
use link_assistant_router::config::ApiFormat;
use link_assistant_router::oauth::OAuthProvider;
use link_assistant_router::proxy::{REQUIRED_FORWARD_HEADERS, resolve_upstream_path};
use link_assistant_router::token::{TOKEN_PREFIX, TokenManager};

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
        assert_eq!(VERSION, env!("CARGO_PKG_VERSION"));
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
    fn test_namespaced_anthropic_messages_path() {
        assert_eq!(
            resolve_upstream_path("/api/anthropic/v1/messages"),
            "/v1/messages"
        );
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

    /// The client's session id is not forwarded.
    ///
    /// It is a stable identifier minted on the caller's machine that
    /// correlates requests into sessions no matter which token carried them,
    /// so relaying it undid the separation per-token issuance exists to
    /// provide. The router still reads it for its own routing; it just does
    /// not pass it on (issue #332).
    #[test]
    fn test_required_headers_exclude_the_client_session_id() {
        assert!(!REQUIRED_FORWARD_HEADERS.contains(&"x-claude-code-session-id"));
    }
}

mod activitypub_tests {
    use link_assistant_router::activitypub::{
        actor_document, follow_problemsets_activity, followers_document, outbox_document,
        validate_activity,
    };
    use serde_json::json;

    const BASE: &str = "https://router.example";
    const KEY: &str = "-----BEGIN PUBLIC KEY-----\nabc\n-----END PUBLIC KEY-----";

    #[test]
    fn actor_document_exposes_required_activitypub_fields() {
        let actor = actor_document(BASE, KEY);

        assert_eq!(
            actor["id"],
            "https://router.example/api/services/activitypub/actor/code"
        );
        assert_eq!(actor["type"], "Service");
        assert_eq!(
            actor["inbox"],
            "https://router.example/api/services/activitypub/inbox/code"
        );
        assert_eq!(
            actor["outbox"],
            "https://router.example/api/services/activitypub/outbox/code"
        );
        assert_eq!(
            actor["followers"],
            "https://router.example/api/services/activitypub/actors/code/followers"
        );
        assert_eq!(
            actor["publicKey"]["id"],
            "https://router.example/api/services/activitypub/actor/code#main-key"
        );
        assert_eq!(actor["publicKey"]["publicKeyPem"], KEY);
        assert!(actor["aliases"].as_array().expect("aliases").len() >= 2);
    }

    #[test]
    fn actor_context_includes_forgefed_and_fep_ef61_aliases() {
        let actor = actor_document(BASE, KEY);
        let context = actor["@context"].as_array().expect("context array");

        assert!(
            context
                .iter()
                .any(|item| item == "https://www.w3.org/ns/activitystreams")
        );
        assert!(context.iter().any(|item| item == "https://forgefed.org/ns"));
        assert!(context.iter().any(|item| item["aliases"] == "fep:aliases"));
    }

    #[test]
    fn follow_activity_can_be_posted_to_problemsets_inbox() {
        let follow = follow_problemsets_activity(BASE);

        assert_eq!(
            follow["id"],
            "https://router.example/api/services/activitypub/activities/follow-problemsets-code-001"
        );
        assert_eq!(follow["type"], "Follow");
        assert_eq!(
            follow["actor"],
            "https://router.example/api/services/activitypub/actor/code"
        );
        assert_eq!(
            follow["object"],
            "https://problemsets.lefine.pro/actor/code"
        );
        assert_eq!(follow["to"][0], "https://problemsets.lefine.pro/actor/code");
    }

    #[test]
    fn inbox_validation_rejects_objects_without_actor_or_attributed_to() {
        let activity = json!({
            "id": "https://remote.example/activities/1",
            "type": "Create"
        });

        assert_eq!(
            validate_activity(&activity),
            Err("activity must include actor or attributedTo")
        );
    }

    #[test]
    fn collections_are_addressable_ordered_collections() {
        assert_eq!(outbox_document(BASE)["type"], "OrderedCollection");
        assert_eq!(followers_document(BASE)["type"], "OrderedCollection");
    }
}

mod config_verbose_tests {
    use link_assistant_router::config::{
        BuildArgs, Config, RoutingMode, StoragePolicy, UpstreamProvider,
        default_activitypub_public_key_pem, default_crater_config, default_gonka_model,
        default_gonka_source_url,
    };
    use std::path::PathBuf;

    fn args_with_verbose(verbose: bool) -> BuildArgs<'static> {
        BuildArgs {
            bridge_model_policy: None,
            host: "0.0.0.0",
            port: "8080",
            token_secret: Some("secret"),
            claude_code_home: "/tmp/claude",
            upstream_base_url: "https://api.anthropic.com",
            verbose,
            max_proxy_request_bytes: link_assistant_router::config::DEFAULT_MAX_PROXY_REQUEST_BYTES,
            api_format: None,
            routing_mode: RoutingMode::Direct,
            storage_policy: StoragePolicy::Memory,
            data_dir: PathBuf::from("/tmp/test-data"),
            claude_cli_bin: None,
            codex_cli_bin: None,
            upstream_provider: UpstreamProvider::Anthropic,
            gonka_private_key: None,
            gonka_source_url: default_gonka_source_url(),
            gonka_model: default_gonka_model(),
            bridge_model: None,
            audit_log: None,
            crater: default_crater_config("https://router.example"),
            openai_compatible: link_assistant_router::config::default_openai_compatible_config(),
            activitypub_actor_base_url: "https://router.example".into(),
            activitypub_public_key_pem: default_activitypub_public_key_pem(),
            enable_openai_api: true,
            enable_anthropic_api: true,
            enable_metrics: true,
            inference_only: false,
            additional_account_dirs: vec![],
            account_routing_strategy: link_assistant_router::accounts::SelectionStrategy::default(),
            account_cooldown_secs: 60,
            session_affinity_ttl_secs: 3600,
            account_request_limits: vec![],
            experimental_compatibility: false,
            subscription_bridge_overrides: vec![],
            admin_key: None,
            allow_anonymous_admin: false,
            mpp: link_assistant_router::config::default_mpp_config(),
            login: link_assistant_router::login::LoginConfig::default(),
            admin_ui: link_assistant_router::admin::AdminUiConfig::default(),
            chat_admin: link_assistant_router::chat_admin::ChatAdminConfig::default(),
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
        ChatMessage, OpenAIChatCompletionRequest, anthropic_to_chat_completion,
        chat_completion_to_anthropic, list_models_from, map_model,
    };
    use serde_json::json;

    /// The router keeps no built-in alias table, so a requested model is
    /// passed through unchanged rather than rewritten to a vendor id compiled
    /// into the binary (issue #192).
    #[test]
    fn model_names_are_passed_through_not_rewritten() {
        assert_eq!(map_model("aurora-2-base"), "aurora-2-base");
        assert_eq!(map_model("borealis-9-ultra"), "borealis-9-ultra");
        assert_eq!(
            link_assistant_router::openai::resolve_model(""),
            None,
            "an empty model id is not routable"
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
            tool_call_id: None,
            tool_calls: None,
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
        assert_eq!(v["model"], "claude-sonnet-4-5-20250929");
    }

    /// The listing reflects the supplied live catalog and nothing else: the
    /// router carries no model names of its own (issue #192).
    #[test]
    fn models_endpoint_advertises_only_the_live_catalog() {
        let catalog = vec!["aurora-2-base".to_string()];
        let v = list_models_from(&catalog, "examplecorp");
        let data = v["data"].as_array().expect("data array");
        let ids: Vec<&str> = data.iter().filter_map(|m| m["id"].as_str()).collect();
        assert_eq!(ids, ["aurora-2-base"]);
        assert!(
            list_models_from(&[], "examplecorp")["data"]
                .as_array()
                .expect("data array")
                .is_empty(),
            "an undiscovered account must advertise nothing"
        );
    }
}

mod mpp_tests {
    use axum::http::{HeaderMap, HeaderValue, StatusCode};
    use link_assistant_router::mpp::{
        MppConfig, has_payment_credential, payment_required, unsupported_payment_verification,
    };

    #[test]
    fn openai_mpp_challenge_is_machine_readable_402() {
        let cfg = MppConfig {
            enabled: true,
            amount: "0.05".into(),
            currency: "USD".into(),
            recipient: "acct_router".into(),
            method: Some("stripe".into()),
        };

        let response = payment_required(&cfg, "/v1/responses");

        assert_eq!(response.status(), StatusCode::PAYMENT_REQUIRED);
        let challenge = response
            .headers()
            .get("www-authenticate")
            .and_then(|v| v.to_str().ok())
            .expect("MPP challenge header");
        assert!(challenge.starts_with("Payment "));
        assert!(challenge.contains(r#"protocol="mpp""#));
        assert!(challenge.contains(r#"intent="charge""#));
        assert!(challenge.contains(r#"amount="0.05""#));
        assert!(challenge.contains(r#"resource="/v1/responses""#));
    }

    #[test]
    fn mpp_payment_authorization_is_not_treated_as_bearer_token() {
        let mut headers = HeaderMap::new();
        headers.insert(
            "authorization",
            HeaderValue::from_static("Payment credential-for-charge"),
        );

        assert!(has_payment_credential(&headers));
        assert_eq!(
            unsupported_payment_verification().status(),
            StatusCode::NOT_IMPLEMENTED
        );
    }
}

mod metrics_rendering_tests {
    use link_assistant_router::metrics::{Metrics, Surface, render_prometheus, usage_snapshot};

    #[test]
    fn prometheus_output_contains_only_aggregate_required_counters() {
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
        // Status codes are aggregate; account identities stay admin-only.
        assert!(out.contains("link_assistant_status_total{code=\"200\"}"));
        assert!(out.contains("link_assistant_status_total{code=\"429\"}"));
        assert!(!out.contains("primary"));
        assert!(!out.contains("account-1"));
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
    use link_assistant_router::cli::{AuthFlow, AuthOp, Cli, Command, TokenOp};
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
    fn cli_parses_per_token_spend_and_rate_controls() {
        let cli = Cli::try_parse_from([
            "bin",
            "tokens",
            "issue",
            "--max-tokens",
            "1000",
            "--rate-limit-per-minute",
            "7",
        ])
        .expect("parses token controls");
        assert!(matches!(
            cli.command,
            Some(Command::Tokens {
                op: TokenOp::Issue {
                    max_tokens: Some(1000),
                    rate_limit_per_minute: Some(7),
                    ..
                }
            })
        ));
    }

    #[test]
    fn cli_parses_doctor_subcommand() {
        let cli = Cli::try_parse_from(["bin", "doctor"]).expect("parses doctor");
        assert!(matches!(cli.command, Some(Command::Doctor { .. })));
    }

    #[test]
    fn cli_parses_provider_auth_flows() {
        let claude = Cli::try_parse_from(["bin", "auth", "claude", "--code", "copied"])
            .expect("parses Claude auth");
        assert!(matches!(
            claude.command,
            Some(Command::Auth {
                op: AuthOp::Claude { code: Some(code), flow: AuthFlow::Auto, mode: None, .. }
            }) if code == "copied"
        ));

        // The narrow scope set is selectable explicitly (issue #193).
        let narrow = Cli::try_parse_from(["bin", "auth", "claude", "--mode", "setup-token"])
            .expect("parses Claude auth mode");
        assert!(matches!(
            narrow.command,
            Some(Command::Auth {
                op: AuthOp::Claude { mode: Some(mode), .. }
            }) if mode == "setup-token"
        ));

        let codex = Cli::try_parse_from([
            "bin", "auth", "codex", "--flow", "loopback", "--port", "1457",
        ])
        .expect("parses Codex auth");
        assert!(matches!(
            codex.command,
            Some(Command::Auth {
                op: AuthOp::Codex {
                    flow: AuthFlow::Loopback,
                    port: 1457,
                    ..
                }
            })
        ));
        let codex_device = Cli::try_parse_from(["bin", "auth", "codex", "--flow", "device"])
            .expect("parses Codex device auth");
        assert!(matches!(
            codex_device.command,
            Some(Command::Auth {
                op: AuthOp::Codex {
                    flow: AuthFlow::Device,
                    port: 1455,
                    ..
                }
            })
        ));
        let status = Cli::try_parse_from(["bin", "auth", "status"]).expect("parses auth status");
        assert!(matches!(
            status.command,
            Some(Command::Auth {
                op: AuthOp::Status { .. }
            })
        ));
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

mod support_docs_tests {
    use std::fs;

    #[test]
    fn forgefed_docs_describe_public_actor_and_inbox() {
        let docs = fs::read_to_string("docs/forgefed.md").expect("forgefed docs should exist");

        assert!(docs.contains("/api/services/activitypub/actor/code"));
        assert!(docs.contains("/api/services/activitypub/inbox/code"));
        assert!(docs.contains("https://forgefed.org/ns"));
        assert!(docs.contains("ACTIVITYPUB_ACTOR_BASE_URL"));
    }

    #[test]
    fn akash_template_exposes_router_and_required_configuration() {
        let sdl = fs::read_to_string("deploy/akash/deploy.yaml").expect("akash SDL should exist");

        assert!(sdl.contains("version: \"2.0\""));
        assert!(sdl.contains("port: 8080"));
        assert!(sdl.contains("TOKEN_SECRET=replace-with-secure-secret"));
        assert!(sdl.contains("ACTIVITYPUB_ACTOR_BASE_URL=https://router.example.com"));
    }

    #[test]
    fn kubernetes_template_includes_deployment_service_and_health_probes() {
        let manifest =
            fs::read_to_string("deploy/k8s/router.yaml").expect("k8s manifest should exist");

        assert!(manifest.contains("kind: Deployment"));
        assert!(manifest.contains("kind: Service"));
        assert!(manifest.contains("path: /api/health"));
        assert!(manifest.contains("ACTIVITYPUB_PUBLIC_KEY_PEM"));
    }
}
