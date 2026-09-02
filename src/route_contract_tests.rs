use std::collections::BTreeSet;

use crate::route_contract::{
    ListenerKind, RouteAuth, RouteClass, RouteId, ServiceKind, endpoint_base, management_endpoint,
    route_for_path, route_specs,
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
            spec.template.starts_with("/api/"),
            "non-canonical route: {}",
            spec.template
        );
        match spec.class {
            RouteClass::Neutral => {
                assert_eq!(spec.template, "/api/health");
                assert_eq!(spec.auth, RouteAuth::None);
            }
            RouteClass::Management => {
                assert!(spec.template.starts_with("/api/management/"));
                assert_eq!(spec.auth, RouteAuth::Admin);
            }
            RouteClass::Service(_) => {
                assert!(spec.template.starts_with("/api/services/"));
                assert_eq!(spec.auth, RouteAuth::Client);
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
    let health = route_for_path(http::Method::GET, "/api/health").unwrap();
    assert!(health.listeners.contains(&ListenerKind::Combined));
    assert!(health.listeners.contains(&ListenerKind::InferenceOnly));

    let management = route_for_path(http::Method::GET, "/api/management/tokens").unwrap();
    assert!(management.listeners.contains(&ListenerKind::Combined));
    assert!(management.listeners.contains(&ListenerKind::Admin));
    assert!(!management.listeners.contains(&ListenerKind::InferenceOnly));

    let anthropic =
        route_for_path(http::Method::POST, "/api/services/anthropic/v1/messages").unwrap();
    assert!(anthropic.listeners.contains(&ListenerKind::Combined));
    assert!(anthropic.listeners.contains(&ListenerKind::InferenceOnly));
    assert!(!anthropic.listeners.contains(&ListenerKind::Admin));

    let github = route_for_path(http::Method::POST, "/api/services/github/api/graphql").unwrap();
    assert_eq!(github.class, RouteClass::Service(ServiceKind::GitHub));
    assert!(!github.listeners.contains(&ListenerKind::InferenceOnly));
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
        (http::Method::GET, "/api/v3/user"),
        (http::Method::POST, "/api/graphql"),
        (http::Method::GET, "/user"),
        (http::Method::POST, "/git/owner/repo.git/git-upload-pack"),
        (http::Method::GET, "/actor/code"),
    ] {
        assert!(
            route_for_path(method.clone(), path).is_none(),
            "removed route still classified: {method} {path}"
        );
    }
}
