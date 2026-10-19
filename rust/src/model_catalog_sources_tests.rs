use super::*;
use crate::upstream_guard::NetworkPolicy;
use serde_json::json;

fn document(entries: &[&str]) -> Vec<u8> {
    serde_json::to_vec(&ModelCatalogDocument {
        version: 1,
        models: entries
            .iter()
            .map(|entry| local_model(entry).unwrap())
            .collect(),
    })
    .unwrap()
}

fn configured(
    sources: Vec<String>,
    local_models: Vec<ModelTruthDescriptor>,
) -> ModelCatalogSources {
    let cache = ModelCatalogSources::default();
    cache
        .configure(CatalogSourcesConfig {
            sources,
            refresh_secs: 10,
            local_models,
        })
        .unwrap();
    cache
}

#[test]
fn rejects_schema_and_model_truth_violations_atomically() {
    let valid = document(&["a=local:one"]);
    assert!(parse_document(&valid).is_ok());
    let value: Value = serde_json::from_slice(&valid).unwrap();
    for pointer in [
        "/version",
        "/models/0/route/protocols",
        "/models/0/selector_kind",
        "/models/0/requested_selector",
        "/models/0/capabilities",
    ] {
        let mut invalid = value.clone();
        *invalid.pointer_mut(pointer).unwrap() = json!(42);
        assert!(
            parse_document(&serde_json::to_vec(&invalid).unwrap()).is_err(),
            "{pointer}"
        );
    }
    for (pointer, replacement) in [
        ("/models/0/route/account", json!("different-account")),
        ("/models/0/route/endpoint", json!("http://localhost")),
        ("/models/0/upstream_served_model", json!("fabricated")),
        ("/models/0/allow_substitution", json!(true)),
        ("/models/0/selector_kind", json!("provider_dynamic_alias")),
        (
            "/models/0/capability_provenance",
            json!({"source_kind":"authenticated_live"}),
        ),
    ] {
        let mut invalid = value.clone();
        *invalid.pointer_mut(pointer).unwrap() = replacement;
        assert!(
            parse_document(&serde_json::to_vec(&invalid).unwrap()).is_err(),
            "{pointer}"
        );
    }
    let mut unknown = value;
    unknown["models"][0]["route"]["subscription_policy"] = json!("all");
    assert!(parse_document(&serde_json::to_vec(&unknown).unwrap()).is_err());
    assert!(parse_document(&document(&["a=local:one", "a=local:two"])).is_err());
    assert!(parse_document(&vec![b' '; MAX_DOCUMENT_BYTES + 1]).is_err());
}

#[test]
fn local_grammar_preserves_exact_ids_and_rejects_subscription_aliases() {
    let model = local_model("friendly=local:vendor:id").unwrap();
    assert_eq!(model.upstream_request_model.as_deref(), Some("vendor:id"));
    for invalid in [
        "",
        "a",
        "a=local",
        "a=:b",
        "=local:b",
        "a=local:",
        "a=local: b",
        "a=claude:b",
        "a=codex:b",
        "a=gemini:b",
        "a=qwen:b",
    ] {
        assert!(local_model(invalid).is_err(), "{invalid}");
    }
    assert_eq!(
        local_model("a=claude:a").unwrap().route.provider.as_deref(),
        Some("anthropic")
    );
}

#[tokio::test]
async fn refresh_precedence_last_good_retention_and_recovery_use_controllable_time() {
    let dir = tempfile::tempdir().unwrap();
    let first = dir.path().join("first.json");
    let second = dir.path().join("second.json");
    std::fs::write(
        &first,
        document(&["a=local:first", "b=local:one", "x=other:one"]),
    )
    .unwrap();
    std::fs::write(&second, document(&["a=local:second", "b=local:two"])).unwrap();
    let cache = configured(
        vec![first.display().to_string(), second.display().to_string()],
        vec![local_model("a=local:cli").unwrap()],
    );
    let now = Instant::now();
    cache.refresh_at(now).await;
    assert_eq!(
        cache.definitions("local")[0]
            .upstream_request_model
            .as_deref(),
        Some("cli")
    );
    assert_eq!(
        cache.definitions("local")[1]
            .upstream_request_model
            .as_deref(),
        Some("two")
    );
    assert_eq!(cache.definitions("other").len(), 1);
    std::fs::write(&second, b"{}").unwrap();
    cache.refresh_at(now + Duration::from_secs(10)).await;
    assert_eq!(
        cache.definitions("local")[1]
            .upstream_request_model
            .as_deref(),
        Some("two")
    );
    std::fs::write(&second, document(&["b=local:three"])).unwrap();
    cache.refresh_at(now + Duration::from_secs(19)).await;
    assert_eq!(
        cache.definitions("local")[1]
            .upstream_request_model
            .as_deref(),
        Some("two")
    );
    cache.refresh_at(now + Duration::from_secs(20)).await;
    assert_eq!(
        cache.definitions("local")[1]
            .upstream_request_model
            .as_deref(),
        Some("three")
    );
    std::fs::write(&second, document(&[])).unwrap();
    cache.refresh_at(now + Duration::from_secs(30)).await;
    assert_eq!(
        cache.definitions("local")[1]
            .upstream_request_model
            .as_deref(),
        Some("one")
    );
    assert!(!cache.snapshot.read().unwrap().sources[1].failing);
}

#[tokio::test]
async fn initial_failure_keeps_the_live_catalog_and_sources_refresh_independently() {
    let dir = tempfile::tempdir().unwrap();
    let good = dir.path().join("good.json");
    std::fs::write(&good, document(&["a=local:upstream"])).unwrap();
    let cache = configured(
        vec!["/does/not/exist.json".into(), good.display().to_string()],
        Vec::new(),
    );
    cache.refresh().await;
    assert_eq!(cache.definitions("local").len(), 1);
    assert!(cache.definitions("anthropic").is_empty());
    assert!(cache.snapshot.read().unwrap().sources[0].failing);
}

#[tokio::test]
async fn file_reads_are_capped_and_file_urls_work() {
    let dir = tempfile::tempdir().unwrap();
    let path = dir.path().join("models.json");
    std::fs::write(&path, document(&["a=local:a"])).unwrap();
    let url = url::Url::from_file_path(&path).unwrap().to_string();
    assert!(
        fetch::load_with_policy(&url, NetworkPolicy::default())
            .await
            .is_ok()
    );
    // Reject before filesystem access: Windows otherwise resolves this as SMB.
    assert_eq!(
        fetch::load_with_policy("file://127.0.0.1/catalog.json", NetworkPolicy::default())
            .await
            .unwrap_err(),
        "file URL must name a local path"
    );
    std::fs::write(&path, vec![b' '; MAX_DOCUMENT_BYTES + 1]).unwrap();
    assert!(
        fetch::load_with_policy(&url, NetworkPolicy::default())
            .await
            .unwrap_err()
            .contains("size limit")
    );
    assert!(
        fetch::load_with_policy(&dir.path().display().to_string(), NetworkPolicy::default())
            .await
            .is_err()
    );
}

#[tokio::test]
async fn private_urls_are_guarded_before_http() {
    for url in [
        "http://127.0.0.1/catalog",
        "http://[::1]/catalog",
        "http://10.0.0.1/catalog",
        "http://169.254.169.254/catalog",
        "http://localhost/catalog",
    ] {
        assert!(
            fetch::load_with_policy(url, NetworkPolicy::default())
                .await
                .is_err()
        );
    }
    assert!(
        fetch::load_with_policy(
            "http://user:secret@example.com/catalog",
            NetworkPolicy::allow_all()
        )
        .await
        .unwrap_err()
        .contains("credentials")
    );
    assert!(
        fetch::load_with_policy("ftp://example.com/catalog", NetworkPolicy::allow_all())
            .await
            .is_err()
    );
}

#[tokio::test]
async fn http_refresh_rejects_redirects_and_oversized_streams() {
    use axum::body::Body;
    use axum::{Router, response::IntoResponse, routing::get};
    let bytes = document(&["a=local:a"]);
    let app = Router::new()
        .route("/good", get(move || async move { bytes }))
        .route(
            "/redirect",
            get(|| async { axum::response::Redirect::temporary("/good") }),
        )
        .route(
            "/large",
            get(|| async { Body::from(vec![b' '; MAX_DOCUMENT_BYTES + 1]).into_response() }),
        )
        .route(
            "/stream",
            get(|| async {
                Body::from_stream(futures_util::stream::iter(
                    (0..17).map(|_| Ok::<_, std::io::Error>(vec![b' '; 65_536])),
                ))
                .into_response()
            }),
        );
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let base = format!("http://{}", listener.local_addr().unwrap());
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });
    assert!(
        fetch::load_with_policy(
            &format!("{base}/good"),
            NetworkPolicy::parse(Some("loopback"))
        )
        .await
        .is_ok()
    );
    for path in ["redirect", "large", "stream"] {
        let error = fetch::load_with_policy(&format!("{base}/{path}"), NetworkPolicy::allow_all())
            .await
            .unwrap_err();
        assert!(
            error.contains(if path == "redirect" {
                "HTTP"
            } else {
                "size limit"
            }),
            "{error}"
        );
    }
    server.abort();
    let _ = server.await;
}

#[test]
fn overlay_requires_live_target_preserves_inventory_and_does_not_shadow_live_ids() {
    use crate::providers::LiveProviderModel;
    let cache = configured(
        Vec::new(),
        vec![
            local_model("alias=local:upstream").unwrap(),
            local_model("phantom=local:missing").unwrap(),
            local_model("collision=local:upstream").unwrap(),
        ],
    );
    let live = vec![
        LiveProviderModel {
            id: "upstream".into(),
            raw: serde_json::from_value(json!({"id":"upstream", "context_window":1234})).unwrap(),
        },
        LiveProviderModel {
            id: "collision".into(),
            raw: serde_json::from_value(json!({"id":"collision"})).unwrap(),
        },
    ];
    let overlaid = cache.overlay("local", live.clone());
    assert_eq!(overlaid.len(), 3);
    assert_eq!(overlaid[0], live[0]);
    assert_eq!(overlaid[1], live[1]);
    assert_eq!(overlaid[2].id, "alias");
    assert_eq!(overlaid[2].raw["router_upstream_model"], "upstream");
    assert!(!overlaid[2].raw.contains_key("context_window"));
    assert_eq!(cache.overlay("other", live.clone()), live);
}

#[test]
fn reserved_mapping_fields_cannot_be_asserted_by_a_vendor_catalog() {
    let cache = ModelCatalogSources::default();
    let live = vec![crate::providers::LiveProviderModel {
        id: "live".into(),
        raw: serde_json::from_value(json!({"id":"live", "router_upstream_model":"hidden", "router_model_definition":{"requested_selector":"fabricated"}})).unwrap(),
    }];
    let overlaid = cache.overlay("local", live);
    assert!(!overlaid[0].raw.contains_key("router_upstream_model"));
    assert!(!overlaid[0].raw.contains_key("router_model_definition"));
}

#[test]
fn scoped_environment_defaults_and_invalid_polling_limits() {
    let dir = tempfile::tempdir().unwrap();
    let mut context = crate::operation_context::OperationContext::isolated(dir.path());
    context
        .environment
        .remove(std::ffi::OsStr::new("MODEL_CATALOG_SOURCES"));
    context
        .environment
        .remove(std::ffi::OsStr::new("MODEL_CATALOG_REFRESH_SECS"));
    let default = context.scope(CatalogSourcesConfig::from_env).unwrap();
    assert!(default.sources.is_empty());
    assert_eq!(default.refresh_secs, 10800);
    context.set_env(
        "MODEL_CATALOG_SOURCES",
        " first.json, ,https://example.com/models.json ",
    );
    context.set_env("MODEL_CATALOG_REFRESH_SECS", "60");
    let config = context.scope(CatalogSourcesConfig::from_env).unwrap();
    assert_eq!(
        config.sources,
        vec!["first.json", "https://example.com/models.json"]
    );
    assert_eq!(config.refresh_secs, 60);
    for invalid in ["0", "-1", "invalid", "31536001"] {
        context.set_env("MODEL_CATALOG_REFRESH_SECS", invalid);
        assert!(context.scope(CatalogSourcesConfig::from_env).is_err());
    }
    assert!(
        CatalogSourcesConfig {
            sources: vec!["one.json".into(); 33],
            ..CatalogSourcesConfig::default()
        }
        .validate()
        .is_err()
    );
}

#[tokio::test]
async fn unconfigured_and_local_only_sources_need_no_refresh_task_and_remain_instance_scoped() {
    let first = std::sync::Arc::new(configured(
        Vec::new(),
        vec![local_model("a=local:upstream").unwrap()],
    ));
    let second = std::sync::Arc::new(ModelCatalogSources::default());
    assert!(first.clone().start().await.is_none());
    assert!(second.clone().start().await.is_none());
    assert_eq!(first.definitions("local").len(), 1);
    assert!(second.definitions("local").is_empty());
    assert!(first.configure(CatalogSourcesConfig::default()).is_err());
}

#[tokio::test]
async fn failures_warn_once_until_a_successful_recovery() {
    use tracing::instrument::WithSubscriber as _;
    use tracing_subscriber::prelude::*;
    struct Warnings(std::sync::Arc<std::sync::atomic::AtomicUsize>);
    impl<S: tracing::Subscriber> tracing_subscriber::Layer<S> for Warnings {
        fn on_event(
            &self,
            event: &tracing::Event<'_>,
            _context: tracing_subscriber::layer::Context<'_, S>,
        ) {
            if *event.metadata().level() == tracing::Level::WARN {
                self.0.fetch_add(1, std::sync::atomic::Ordering::SeqCst);
            }
        }
    }
    let count = std::sync::Arc::new(std::sync::atomic::AtomicUsize::new(0));
    let subscriber = tracing_subscriber::registry().with(Warnings(count.clone()));
    async {
        let dir = tempfile::tempdir().unwrap();
        let path = dir.path().join("models.json");
        let cache = configured(vec![path.display().to_string()], Vec::new());
        let now = Instant::now();
        cache.refresh_at(now).await;
        cache.refresh_at(now + Duration::from_secs(10)).await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 1);
        std::fs::write(&path, document(&["a=local:a"])).unwrap();
        cache.refresh_at(now + Duration::from_secs(20)).await;
        std::fs::remove_file(&path).unwrap();
        cache.refresh_at(now + Duration::from_secs(30)).await;
        cache.refresh_at(now + Duration::from_secs(40)).await;
        assert_eq!(count.load(std::sync::atomic::Ordering::SeqCst), 2);
        assert_eq!(cache.definitions("local").len(), 1);
    }
    .with_subscriber(subscriber)
    .await;
}
