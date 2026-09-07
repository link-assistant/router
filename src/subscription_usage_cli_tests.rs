use super::*;
use crate::subscription_usage::{
    Credits, ExtraUsage, NamedLimit, SpendControl, SpendLimit, UsageState, UsageWindow,
};
use axum::extract::Request;
use axum::response::IntoResponse as _;
use std::sync::{Arc, Mutex};

fn complete_envelope() -> UsageEnvelope {
    UsageEnvelope {
        schema_version: 1,
        subscriptions: vec![SubscriptionUsage {
            provider: UsageProvider::OpenAi,
            state: UsageState::Available,
            status: "available".into(),
            allowed: Some(true),
            limit_reached: Some(false),
            plan: Some("pro".into()),
            windows: vec![UsageWindow {
                name: "primary".into(),
                used_percentage: Some(20.0),
                remaining_percentage: Some(80.0),
                resets_at: Some("2030-01-01T00:00:00Z".into()),
                window_seconds: Some(300),
            }],
            additional_limits: vec![NamedLimit {
                name: "review".into(),
                limit_name: Some("Code review".into()),
                metered_feature: Some("review".into()),
                kind: None,
                group: None,
                model_display_name: None,
                allowed: Some(false),
                limit_reached: Some(true),
                windows: vec![UsageWindow {
                    name: "secondary".into(),
                    used_percentage: Some(40.0),
                    remaining_percentage: Some(60.0),
                    resets_at: Some("2030-01-02T00:00:00Z".into()),
                    window_seconds: Some(600),
                }],
                used: Some(2.0),
                limit: Some(10.0),
            }],
            credits: Some(Credits {
                balance: None,
                has_credits: Some(false),
                unlimited: Some(false),
                overage_limit_reached: Some(true),
                approximate_local_messages: Some(3),
                approximate_cloud_messages: Some(2),
            }),
            extra_usage: Some(ExtraUsage {
                is_enabled: Some(true),
                monthly_limit: Some(100.0),
                used_credits: Some(75.0),
                remaining_credits: Some(25.0),
                utilization: Some(75.0),
                currency: Some("USD".into()),
                resets_at: Some("2030-02-01T00:00:00Z".into()),
            }),
            spend_control: Some(SpendControl {
                reached: Some(true),
                individual_limit: Some(SpendLimit {
                    source: Some("workspace".into()),
                    limit: Some("25000".into()),
                    used: Some("25000".into()),
                    remaining: Some("0".into()),
                    used_percentage: Some(100.0),
                    remaining_percentage: Some(0.0),
                    reset_after_seconds: Some(3600),
                    resets_at: Some("2030-01-01T00:00:00+00:00".into()),
                }),
            }),
            rate_limit_reached_type: Some("workspace_member_credits_depleted".into()),
            rate_limit_reset_credits_available: Some(1),
            subscription_end: Some("2031-01-01T00:00:00Z".into()),
            trial_end: Some("2030-02-01T00:00:00Z".into()),
            subscription_created: Some("2029-01-01T00:00:00Z".into()),
            retry_after_seconds: Some(45),
        }],
    }
}

#[test]
fn human_output_preserves_every_present_limit_and_warning() {
    let output = format_envelope(&complete_envelope(), false).unwrap();
    for expected in [
        "openai",
        "status: available",
        "allowed: true",
        "limit reached: false",
        "plan: pro",
        "20.0% used, 80.0% remaining, window 5m, resets 2030-01-01T00:00:00Z",
        "40.0% used, 60.0% remaining, window 10m, resets 2030-01-02T00:00:00Z",
        "amount: 2 / 10",
        "display name: Code review",
        "metered feature: review",
        "allowed: false",
        "reached: true",
        "credits: overage limit reached",
        "credits available: false",
        "approximate local messages: 3",
        "approximate cloud messages: 2",
        "extra usage:",
        "amount: 75 / 100 USD",
        "remaining: 25",
        "utilization: 75.0%",
        "spend control:",
        "source: workspace",
        "amount: 25000 / 25000, 0 remaining",
        "utilization: 100.0% used, 0.0% remaining",
        "resets after: 1h",
        "limit reason: workspace_member_credits_depleted",
        "reset credits available: 1",
        "subscription ends: 2031-01-01T00:00:00Z",
        "trial ends: 2030-02-01T00:00:00Z",
        "retry after: 45s",
    ] {
        assert!(output.contains(expected), "missing {expected:?}: {output}");
    }
}

#[test]
fn json_output_is_the_api_envelope_without_a_cli_projection() {
    let envelope = complete_envelope();
    let output = format_envelope(&envelope, true).unwrap();
    let cli: serde_json::Value = serde_json::from_str(&output).unwrap();
    let api = serde_json::to_value(envelope).unwrap();
    assert_eq!(cli, api);
}

#[test]
fn unfiltered_output_keeps_every_provider_and_renders_unavailable_state() {
    let subscriptions = UsageProvider::ALL
        .into_iter()
        .map(|provider| SubscriptionUsage {
            provider,
            state: if provider == UsageProvider::Lefine {
                UsageState::Unavailable
            } else {
                UsageState::Available
            },
            status: if provider == UsageProvider::Lefine {
                "usage_source_unavailable".into()
            } else {
                "available".into()
            },
            allowed: None,
            limit_reached: None,
            plan: None,
            windows: Vec::new(),
            additional_limits: Vec::new(),
            credits: None,
            extra_usage: None,
            spend_control: None,
            rate_limit_reached_type: None,
            rate_limit_reset_credits_available: None,
            subscription_end: None,
            trial_end: None,
            subscription_created: None,
            retry_after_seconds: None,
        })
        .collect();
    let envelope = UsageEnvelope {
        schema_version: 1,
        subscriptions,
    };

    let human = format_envelope(&envelope, false).unwrap();
    for provider in UsageProvider::ALL {
        assert_eq!(
            human.matches(&format!("{}\n", provider.as_str())).count(),
            1
        );
    }
    assert!(
        human.contains("status: usage_source_unavailable"),
        "{human}"
    );
    let json: serde_json::Value =
        serde_json::from_str(&format_envelope(&envelope, true).unwrap()).unwrap();
    assert_eq!(json["subscriptions"].as_array().unwrap().len(), 6);
    assert_eq!(json["subscriptions"][3]["state"], "unavailable");
}

#[tokio::test]
async fn selected_provider_request_carries_the_router_token_in_all_supported_carriers() {
    let captured = Arc::new(Mutex::new(Vec::new()));
    let captured_for_server = Arc::clone(&captured);
    let app = axum::Router::new().fallback(move |request: Request| {
        let captured = Arc::clone(&captured_for_server);
        async move {
            captured
                .lock()
                .unwrap()
                .push((request.uri().path().to_string(), request.headers().clone()));
            axum::Json(serde_json::json!({
                "schema_version": 1,
                "subscriptions": []
            }))
            .into_response()
        }
    });
    let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
    let address = listener.local_addr().unwrap();
    let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

    for provider in [
        UsageProvider::OpenAi,
        UsageProvider::Gemini,
        UsageProvider::Qwen,
    ] {
        let exit = run(
            &format!("http://{address}"),
            Some("router-client-token"),
            Some(provider),
            true,
        )
        .await;
        assert_eq!(exit, ExitCode::SUCCESS);
    }

    let captured = captured.lock().unwrap();
    assert_eq!(captured.len(), 3);
    assert_eq!(captured[0].0, "/api/usage/openai");
    assert_eq!(captured[1].0, "/api/usage/gemini");
    assert_eq!(captured[2].0, "/api/usage/qwen");
    for (_, headers) in captured.iter() {
        assert_eq!(headers["authorization"], "Bearer router-client-token");
        assert_eq!(headers["x-api-key"], "router-client-token");
        assert_eq!(headers["x-goog-api-key"], "router-client-token");
    }
    drop(captured);
    server.abort();
}

#[tokio::test]
async fn cli_rejects_declared_and_streamed_usage_bodies_while_reading() {
    for chunked in [false, true] {
        let app = axum::Router::new().fallback(move || async move {
            let body = if chunked {
                axum::body::Body::from_stream(futures_util::stream::iter([
                    Ok::<_, std::io::Error>(bytes::Bytes::from_static(b"abc")),
                    Ok(bytes::Bytes::from_static(b"de")),
                ]))
            } else {
                axum::body::Body::from("abcde")
            };
            let mut response = axum::response::Response::new(body);
            if !chunked {
                response
                    .headers_mut()
                    .insert("content-length", "5".parse().unwrap());
            }
            response
        });
        let listener = tokio::net::TcpListener::bind("127.0.0.1:0").await.unwrap();
        let address = listener.local_addr().unwrap();
        let server = tokio::spawn(async move { axum::serve(listener, app).await.unwrap() });

        let exit = run_with_limit(
            &format!("http://{address}"),
            Some("router-client-token"),
            Some(UsageProvider::OpenAi),
            true,
            4,
        )
        .await;
        assert_eq!(exit, ExitCode::from(1), "chunked={chunked}");
        server.abort();
    }
}
