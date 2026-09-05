use std::collections::BTreeSet;

use crate::route_contract::{
    ApiDialect, ListenerKind, RouteAuth, RouteClass, RouteId, ServiceKind, endpoint_base,
    management_endpoint, route_for_path, route_specs,
};

#[test]
fn every_registered_route_has_one_canonical_class_and_listener_contract() {
    let specs = route_specs();
    let unique = specs
        .iter()
        .map(|spec| (spec.method.as_str(), spec.template, spec.listeners))
        .collect::<BTreeSet<_>>();
    assert_eq!(unique.len(), specs.len(), "duplicate route contract");

    for spec in specs {
        assert!(
            spec.template.starts_with("/api/")
                || spec.id == RouteId::GitHubAdapterGit && spec.template.starts_with("/git/"),
            "non-canonical route: {}",
            spec.template
        );
        match spec.class {
            RouteClass::Neutral => {
                if spec.id == RouteId::Health {
                    assert_eq!(spec.template, "/api/health");
                    assert_eq!(spec.auth, RouteAuth::None);
                } else {
                    assert!(matches!(
                        spec.id,
                        RouteId::AggregateModels
                            | RouteId::SubscriptionUsage
                            | RouteId::SubscriptionUsageProvider
                    ));
                    assert!(
                        spec.template == "/api/models" || spec.template.starts_with("/api/usage")
                    );
                    assert_eq!(spec.auth, RouteAuth::Client);
                }
            }
            RouteClass::Management => {
                assert!(spec.template.starts_with("/api/management/"));
                if matches!(
                    spec.id,
                    RouteId::AdminStatus | RouteId::AdminBootstrap | RouteId::AdminBootstrapConfirm
                ) {
                    assert_eq!(spec.auth, RouteAuth::None);
                } else {
                    assert_eq!(spec.auth, RouteAuth::Admin);
                }
            }
            RouteClass::Service(service) => {
                if matches!(
                    spec.id,
                    RouteId::GitHubAdapterRest
                        | RouteId::GitHubAdapterGraphql
                        | RouteId::GitHubAdapterGit
                ) {
                    assert!(
                        spec.template.starts_with("/api/v3/")
                            || spec.template == "/api/graphql"
                            || spec.template.starts_with("/git/")
                    );
                    assert_eq!(spec.listeners, &[ListenerKind::GitHubAdapter]);
                } else {
                    assert!(spec.template.starts_with("/api/services/"));
                }
                if service == ServiceKind::ActivityPub {
                    assert_eq!(spec.auth, RouteAuth::None);
                } else {
                    assert_eq!(spec.auth, RouteAuth::Client);
                }
            }
        }
    }
}

#[test]
fn canonical_endpoint_builders_treat_saved_servers_as_origins() {
    for origin in ["https://router.example", "https://router.example/"] {
        assert_eq!(
            endpoint_base(origin, ServiceKind::Anthropic),
            "https://router.example/api/services/anthropic"
        );
        assert_eq!(
            endpoint_base(origin, ServiceKind::OpenAi),
            "https://router.example/api/services/openai/v1"
        );
        assert_eq!(
            endpoint_base(origin, ServiceKind::Codex),
            "https://router.example/api/services/codex/v1"
        );
        assert_eq!(
            endpoint_base(origin, ServiceKind::Qwen),
            "https://router.example/api/services/qwen/v1"
        );
        assert_eq!(
            endpoint_base(origin, ServiceKind::Gemini),
            "https://router.example/api/services/gemini"
        );
        assert_eq!(
            management_endpoint(origin, RouteId::Tokens),
            "https://router.example/api/management/tokens"
        );
    }
}

#[test]
fn listener_eligibility_is_a_security_boundary() {
    let health = route_for_path(&http::Method::GET, "/api/health").unwrap();
    assert!(health.listeners.contains(&ListenerKind::Combined));
    assert!(health.listeners.contains(&ListenerKind::InferenceOnly));

    for path in ["/api/models", "/api/usage", "/api/usage/openai"] {
        let client_neutral = route_for_path(&http::Method::GET, path).unwrap();
        assert_eq!(client_neutral.class, RouteClass::Neutral);
        assert_eq!(client_neutral.auth, RouteAuth::Client);
        assert!(client_neutral.listeners.contains(&ListenerKind::Combined));
        assert!(
            client_neutral
                .listeners
                .contains(&ListenerKind::InferenceOnly)
        );
        assert!(!client_neutral.listeners.contains(&ListenerKind::Admin));
    }

    let management = route_for_path(&http::Method::GET, "/api/management/tokens").unwrap();
    assert!(management.listeners.contains(&ListenerKind::Combined));
    assert!(management.listeners.contains(&ListenerKind::Admin));
    assert!(!management.listeners.contains(&ListenerKind::InferenceOnly));

    let anthropic =
        route_for_path(&http::Method::POST, "/api/services/anthropic/v1/messages").unwrap();
    assert!(anthropic.listeners.contains(&ListenerKind::Combined));
    assert!(anthropic.listeners.contains(&ListenerKind::InferenceOnly));
    assert!(!anthropic.listeners.contains(&ListenerKind::Admin));

    let github = route_for_path(&http::Method::POST, "/api/services/github/api/graphql").unwrap();
    assert_eq!(github.class, RouteClass::Service(ServiceKind::GitHub));
    assert!(!github.listeners.contains(&ListenerKind::InferenceOnly));

    for (method, path) in [
        (http::Method::GET, "/api/v3/user"),
        (http::Method::POST, "/api/graphql"),
        (http::Method::POST, "/git/owner/repo.git/git-upload-pack"),
    ] {
        let adapter = route_for_path(&method, path).unwrap();
        assert_eq!(adapter.listeners, &[ListenerKind::GitHubAdapter]);
    }
}

#[test]
fn codex_remote_control_has_only_its_seven_canonical_service_routes() {
    use http::Method;

    let canonical = [
        (
            Method::GET,
            "/api/services/codex/backend-api/wham/remote/control/server",
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server/enroll",
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server/refresh",
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server/pair",
        ),
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server/pair/status",
        ),
        (
            Method::GET,
            "/api/services/codex/backend-api/wham/remote/control/environments/env%2Fone/clients",
        ),
        (
            Method::DELETE,
            "/api/services/codex/backend-api/wham/remote/control/environments/env%2Fone/clients/client%3Fone",
        ),
    ];
    for (method, path) in canonical {
        let route = route_for_path(&method, path)
            .unwrap_or_else(|| panic!("missing remote-control route: {method} {path}"));
        assert_eq!(route.id, RouteId::NativeCodexBackend);
        assert_eq!(route.class, RouteClass::Service(ServiceKind::Codex));
        assert_eq!(route.auth, RouteAuth::Client);
        assert_eq!(route.dialect, ApiDialect::OpenAi);
        assert_eq!(
            route.listeners,
            &[ListenerKind::Combined, ListenerKind::InferenceOnly]
        );
    }

    for (method, path) in [
        (
            Method::POST,
            "/api/services/codex/backend-api/wham/remote/control/server",
        ),
        (
            Method::GET,
            "/api/services/codex/backend-api/wham/remote/control/server/enroll",
        ),
        (Method::GET, "/wham/remote/control/server"),
        (Method::GET, "/api/codex/wham/remote/control/server"),
        (
            Method::GET,
            "/api/services/openai/v1/wham/remote/control/server",
        ),
        (Method::GET, "/api/management/wham/remote/control/server"),
    ] {
        assert!(
            route_for_path(&method, path).is_none(),
            "noncanonical remote-control alias exists: {method} {path}"
        );
    }
}

#[test]
fn removed_paths_have_no_route_contract() {
    for (method, path) in [
        (http::Method::GET, "/health"),
        (http::Method::GET, "/health/subscriptions"),
        (http::Method::POST, "/v1/messages"),
        (http::Method::POST, "/v1/chat/completions"),
        (http::Method::GET, "/v1/models"),
        (http::Method::POST, "/api/anthropic/v1/messages"),
        (http::Method::POST, "/api/openai/v1/responses"),
        (http::Method::POST, "/api/codex/v1/responses"),
        (http::Method::POST, "/api/qwen/v1/chat/completions"),
        (http::Method::GET, "/api/gemini/v1beta/models"),
        (
            http::Method::POST,
            "/api/vertex/v1/projects/p/locations/l/models/m:rawPredict",
        ),
        (http::Method::POST, "/invoke"),
        (http::Method::GET, "/api/tokens"),
        (http::Method::GET, "/api/providers"),
        (http::Method::POST, "/api/login"),
        (http::Method::GET, "/api/admin/status"),
        (http::Method::GET, "/metrics"),
        (http::Method::GET, "/user"),
        (http::Method::GET, "/actor/code"),
    ] {
        assert!(
            route_for_path(&method, path).is_none(),
            "removed route still classified: {method} {path}"
        );
    }
}

#[test]
fn responses_lifecycle_is_an_authenticated_openai_service_surface() {
    for (service, kind) in [
        ("openai", ServiceKind::OpenAi),
        ("codex", ServiceKind::Codex),
        ("qwen", ServiceKind::Qwen),
    ] {
        for (method, suffix) in [
            (http::Method::GET, "resp_123"),
            (http::Method::DELETE, "resp_123"),
            (http::Method::POST, "resp_123/cancel"),
            (http::Method::GET, "resp_123/input_items"),
        ] {
            let path = format!("/api/services/{service}/v1/responses/{suffix}");
            let route = route_for_path(&method, &path)
                .unwrap_or_else(|| panic!("missing route contract for {method} {path}"));
            assert_eq!(route.class, RouteClass::Service(kind), "{method} {path}");
            assert_eq!(route.auth, RouteAuth::Client, "{method} {path}");
            assert_eq!(route.dialect, ApiDialect::OpenAi, "{method} {path}");
            assert!(route.listeners.contains(&ListenerKind::Combined));
            assert!(route.listeners.contains(&ListenerKind::InferenceOnly));
            assert!(!route.listeners.contains(&ListenerKind::Admin));
        }
    }
}

#[test]
fn conversations_lifecycle_is_an_authenticated_openai_service_surface() {
    for (service, kind) in [
        ("openai", ServiceKind::OpenAi),
        ("codex", ServiceKind::Codex),
        ("qwen", ServiceKind::Qwen),
    ] {
        for (method, suffix) in [
            (http::Method::POST, ""),
            (http::Method::GET, "/conv_123"),
            (http::Method::PATCH, "/conv_123"),
            (http::Method::DELETE, "/conv_123"),
            (http::Method::POST, "/conv_123/items"),
            (http::Method::GET, "/conv_123/items"),
            (http::Method::GET, "/conv_123/items/item_123"),
            (http::Method::DELETE, "/conv_123/items/item_123"),
        ] {
            let path = format!("/api/services/{service}/v1/conversations{suffix}");
            let route = route_for_path(&method, &path)
                .unwrap_or_else(|| panic!("missing route contract for {method} {path}"));
            assert_eq!(route.class, RouteClass::Service(kind), "{method} {path}");
            assert_eq!(route.auth, RouteAuth::Client, "{method} {path}");
            assert_eq!(route.dialect, ApiDialect::OpenAi, "{method} {path}");
        }
    }
}

#[test]
fn single_model_routes_use_the_native_service_dialect() {
    for (service, kind, dialect) in [
        ("anthropic", ServiceKind::Anthropic, ApiDialect::Anthropic),
        ("openai", ServiceKind::OpenAi, ApiDialect::OpenAi),
        ("codex", ServiceKind::Codex, ApiDialect::OpenAi),
        ("qwen", ServiceKind::Qwen, ApiDialect::OpenAi),
    ] {
        let path = format!("/api/services/{service}/v1/models/future-model");
        let route = route_for_path(&http::Method::GET, &path)
            .unwrap_or_else(|| panic!("missing route contract for GET {path}"));
        assert_eq!(route.class, RouteClass::Service(kind));
        assert_eq!(route.auth, RouteAuth::Client);
        assert_eq!(route.dialect, dialect);
    }
}

#[test]
fn codex_history_and_notes_have_only_the_ten_native_post_routes() {
    let operations = [
        "alpha/history/v2/list_windows",
        "alpha/history/v2/list_items",
        "alpha/history/v2/read_item",
        "alpha/history/v2/search_contents",
        "alpha/notes/v2/thread_hint",
        "alpha/notes/v2/list_files_by_prefix",
        "alpha/notes/v2/read_file",
        "alpha/notes/v2/search_contents",
        "alpha/notes/v2/append_to_file",
        "alpha/notes/v2/write_file",
    ];
    for operation in operations {
        let path = format!("/api/services/codex/v1/{operation}");
        let route = route_for_path(&http::Method::POST, &path)
            .unwrap_or_else(|| panic!("missing POST {path}"));
        assert_eq!(route.id, RouteId::NativeCodex);
        assert_eq!(route.class, RouteClass::Service(ServiceKind::Codex));
        assert_eq!(route.auth, RouteAuth::Client);
        assert_eq!(route.dialect, ApiDialect::OpenAi);
        assert!(route.listeners.contains(&ListenerKind::Combined));
        assert!(route.listeners.contains(&ListenerKind::InferenceOnly));
        assert!(!route.listeners.contains(&ListenerKind::Admin));
        assert!(route_for_path(&http::Method::GET, &path).is_none());
        assert!(route_for_path(&http::Method::PUT, &path).is_none());
        assert!(route_for_path(&http::Method::DELETE, &path).is_none());

        for alias in [
            format!("/{operation}"),
            format!("/api/services/openai/v1/{operation}"),
            format!("/api/services/anthropic/v1/{operation}"),
            format!("/api/services/qwen/v1/{operation}"),
            format!("/api/management/{operation}"),
            path.replace("/alpha/", "/alpha%2F"),
        ] {
            assert!(
                route_for_path(&http::Method::POST, &alias).is_none(),
                "unexpected history/notes alias: {alias}"
            );
        }
    }
}

#[test]
fn stored_chat_lifecycle_is_an_authenticated_openai_service_surface() {
    for (service, kind) in [
        ("openai", ServiceKind::OpenAi),
        ("codex", ServiceKind::Codex),
        ("qwen", ServiceKind::Qwen),
    ] {
        for (method, suffix) in [
            (http::Method::GET, ""),
            (http::Method::GET, "/chatcmpl_123"),
            (http::Method::POST, "/chatcmpl_123"),
            (http::Method::DELETE, "/chatcmpl_123"),
            (http::Method::GET, "/chatcmpl_123/messages"),
        ] {
            let path = format!("/api/services/{service}/v1/chat/completions{suffix}");
            let route = route_for_path(&method, &path)
                .unwrap_or_else(|| panic!("missing route contract for {method} {path}"));
            assert_eq!(route.class, RouteClass::Service(kind), "{method} {path}");
            assert_eq!(route.auth, RouteAuth::Client, "{method} {path}");
            assert_eq!(route.dialect, ApiDialect::OpenAi, "{method} {path}");
            assert!(route.listeners.contains(&ListenerKind::Combined));
            assert!(route.listeners.contains(&ListenerKind::InferenceOnly));
            assert!(!route.listeners.contains(&ListenerKind::Admin));
        }
    }
}
