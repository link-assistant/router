use super::*;
use serde_json::json;

#[test]
fn shared_metadata_cases_preserve_prompts_and_opt_in() {
    let fixtures: Value =
        serde_json::from_str(include_str!("../../parity/fixtures/geolocation.json")).unwrap();
    for case in fixtures["bodies"].as_array().unwrap() {
        let mut value = case["input"].clone();
        assert_eq!(
            sanitize(&mut value, false),
            case["input"] != case["expected"],
            "{}",
            case["name"]
        );
        assert_eq!(value, case["expected"], "{}", case["name"]);
        assert!(!sanitize(&mut value, false));
        let mut shared = case["input"].clone();
        assert!(!sanitize(&mut shared, true));
        assert_eq!(shared, case["input"]);
    }
}

#[test]
fn location_headers_require_one_explicit_true() {
    let fixtures: Value =
        serde_json::from_str(include_str!("../../parity/fixtures/geolocation.json")).unwrap();
    for opt_in in [
        None,
        Some("false"),
        Some("TRUE"),
        Some("1"),
        Some("true, true"),
        Some("true"),
    ] {
        let mut headers = HeaderMap::new();
        if let Some(value) = opt_in {
            headers.insert(OPT_IN, value.parse().unwrap());
        }
        for name in fixtures["headers"].as_array().unwrap() {
            headers.insert(
                axum::http::HeaderName::from_bytes(name.as_str().unwrap().as_bytes()).unwrap(),
                "synthetic".parse().unwrap(),
            );
        }
        for name in fixtures["networkHeaders"].as_array().unwrap() {
            headers.insert(
                axum::http::HeaderName::from_bytes(name.as_str().unwrap().as_bytes()).unwrap(),
                "203.0.113.1".parse().unwrap(),
            );
        }
        headers.insert("x-request-id", "keep".parse().unwrap());
        headers.insert("x-forwarded-city", "London".parse().unwrap());
        let result = crate::proxy::native_request_headers(&headers, "upstream");
        for name in fixtures["headers"].as_array().unwrap() {
            assert_eq!(
                result.contains_key(name.as_str().unwrap()),
                opt_in == Some("true"),
                "{name}"
            );
        }
        assert!(!result.contains_key(OPT_IN));
        assert!(!result.contains_key("x-forwarded-city"));
        for name in fixtures["networkHeaders"].as_array().unwrap() {
            assert!(!result.contains_key(name.as_str().unwrap()));
        }
        assert_eq!(result["x-request-id"], "keep");
    }
    let mut repeated = HeaderMap::new();
    repeated.append(OPT_IN, "true".parse().unwrap());
    repeated.append(OPT_IN, "true".parse().unwrap());
    assert!(!shares_geolocation(&repeated));
    assert!(!sanitize(&mut json!(null), false));
}

#[tokio::test]
async fn native_location_rewrite_cannot_replay_original_zstd_bytes() {
    let source =
        br#"{ "model":"m", "tools":[{"type":"web_search","user_location":{"city":"London"}}] }"#;
    let encoded = zstd::encode_all(source.as_slice(), 0).unwrap();
    let mut headers = HeaderMap::new();
    headers.insert("content-encoding", "zstd".parse().unwrap());
    let mut parsed = crate::encoded_request_body::read_native_json(
        &headers,
        Body::from(encoded.clone()),
        4096,
        true,
    )
    .await
    .unwrap();
    assert!(sanitize(&mut parsed.value, false));
    let rewritten = parsed.native.encode(&parsed.value).unwrap();
    assert_ne!(rewritten, encoded);
    let reparsed =
        crate::encoded_request_body::read_native_json(&headers, Body::from(rewritten), 4096, true)
            .await
            .unwrap();
    assert!(reparsed.value["tools"][0].get("user_location").is_none());
    assert_eq!(reparsed.value["model"], "m");
}

#[test]
fn static_account_headers_cannot_restore_unconsented_location() {
    let fixtures: Value =
        serde_json::from_str(include_str!("../../parity/fixtures/geolocation.json")).unwrap();
    let mut policy = crate::account_routing_policy::AccountRoutingPolicy::default();
    for name in fixtures["headers"].as_array().unwrap() {
        policy
            .headers
            .insert(name.as_str().unwrap().to_string(), "synthetic".to_string());
    }
    for name in fixtures["networkHeaders"].as_array().unwrap() {
        policy.headers.insert(
            name.as_str().unwrap().to_string(),
            "203.0.113.1".to_string(),
        );
    }
    policy.headers.insert("x-request-id".into(), "keep".into());
    policy.validate().unwrap();
    for consent in [None, Some("true"), Some("false"), Some("true, true")] {
        let mut incoming = HeaderMap::new();
        if let Some(value) = consent {
            incoming.insert(OPT_IN, value.parse().unwrap());
        }
        let mut outgoing = HeaderMap::new();
        policy.apply_headers(&incoming, &mut outgoing);
        for name in fixtures["headers"].as_array().unwrap() {
            assert_eq!(
                outgoing.contains_key(name.as_str().unwrap()),
                consent == Some("true"),
                "{name}"
            );
        }
        assert_eq!(outgoing["x-request-id"], "keep");
        assert!(!outgoing.contains_key(OPT_IN));
        for name in fixtures["networkHeaders"].as_array().unwrap() {
            assert!(!outgoing.contains_key(name.as_str().unwrap()));
        }
    }
}
