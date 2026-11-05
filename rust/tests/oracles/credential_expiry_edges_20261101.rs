//! Independent production credential-report oracle SOURCE, CI-only and UNRUN.
//! These expectations preserve current spelling and truncation, including zero.
use link_assistant_router::auth_import::describe_credential;
use link_assistant_router::operation_context::OperationContext;
use link_assistant_router::subscription::SubscriptionToken;
use serde_json::Value;

fn cases() -> Value {
    serde_json::from_str(include_str!("../fixtures/credential-expiry-edges-20261101.json"))
        .expect("independently authored expiry boundaries")
}
fn context(now_ms: i64) -> OperationContext {
    let mut scope = OperationContext::default();
    scope.now = chrono::DateTime::from_timestamp_millis(now_ms);
    scope
}
fn token(expires_at_ms: Option<i64>, refresh_token: Option<String>) -> SubscriptionToken {
    SubscriptionToken {
        access_token: "secret-access-do-not-render".to_owned(),
        refresh_token,
        expires_at_ms,
        account_id: Some("secret-account-do-not-render".to_owned()),
        resource_url: Some("https://private-origin.invalid/do-not-render".to_owned()),
    }
}

#[test]
fn exact_millisecond_boundaries_and_refresh_presence_keep_native_text_and_token_secrecy() {
    let cases = cases();
    let now_ms: i64 = cases["nowMs"].as_str().unwrap().parse().unwrap();
    let scope = context(now_ms);
    for vector in cases["vectors"].as_array().unwrap() {
        let expires_at_ms = vector["deltaMs"]
            .as_str()
            .map(|delta| now_ms.checked_add(delta.parse().unwrap()).unwrap());
        for refresh in cases["refreshStates"].as_array().unwrap() {
            let credential = token(
                expires_at_ms,
                refresh["token"].as_str().map(str::to_owned),
            );
            let before = serde_json::to_value(&credential).expect("token serializes");
            let actual = scope.scope(|| describe_credential(&credential));
            assert_eq!(
                actual,
                format!(
                    "{}, {}",
                    vector["expiry"].as_str().unwrap(),
                    refresh["suffix"].as_str().unwrap()
                )
            );
            assert_eq!(serde_json::to_value(&credential).unwrap(), before);
            for secret in [
                "secret-access-do-not-render",
                "secret-refresh-do-not-render",
                "secret-account-do-not-render",
                "private-origin.invalid",
            ] {
                assert!(!actual.contains(secret), "credential report disclosed a secret");
            }
        }
    }
}

#[test]
fn nested_injected_clocks_restore_the_outer_report_after_normal_return_and_unwind() {
    let now_ms = 1_800_000_000_000;
    let outer = context(now_ms);
    let inner = context(now_ms + 120_000);
    let credential = token(Some(now_ms + 60_000), None);
    outer.scope(|| {
        let before = describe_credential(&credential);
        assert_eq!(
            before,
            "expires in 1 minutes, NO refresh token, so it cannot be renewed"
        );
        inner.scope(|| {
            assert_eq!(
                describe_credential(&credential),
                "EXPIRED 1 minutes ago, NO refresh token, so it cannot be renewed"
            );
        });
        assert_eq!(describe_credential(&credential), before);
        let failed = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
            inner.scope(|| {
                assert!(describe_credential(&credential).starts_with("EXPIRED"));
                panic!("independent scoped-clock unwind marker");
            });
        }));
        assert!(failed.is_err());
        assert_eq!(describe_credential(&credential), before);
    });
}
