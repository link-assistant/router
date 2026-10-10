// GENERATED: node scripts/regenerate-js-first.mjs
// JavaScript -> portable-router-v1 Links IR -> target; IR sha256=d0021328c8826b7998cd0581491779aeb3e03352980c211ee0cdef36921b2938
#![allow(unused_parens, clippy::needless_return, clippy::float_cmp)]

#[rustfmt::skip]
fn js_min(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        return if a.is_sign_negative() || b.is_sign_negative() { -0.0 } else { 0.0 };
    }
    if a < b { a } else { b }
}

#[rustfmt::skip]
fn js_max(a: f64, b: f64) -> f64 {
    if a.is_nan() || b.is_nan() {
        return f64::NAN;
    }
    if a == 0.0 && b == 0.0 {
        return if a.is_sign_positive() || b.is_sign_positive() { 0.0 } else { -0.0 };
    }
    if a > b { a } else { b }
}

#[rustfmt::skip]
pub fn token_budget_permits(used: f64, reserved: f64, reserve: f64, max: f64) -> bool {
    return ((max < 0.0) || (((used + reserved) < max) && (((used + reserved) + reserve) <= max)));
}

#[rustfmt::skip]
pub fn cooldown_active(until: f64, now: f64) -> bool {
    return (until > now);
}

#[rustfmt::skip]
pub fn provider_model_id(provider: &str, model: &str) -> String {
    return format!("{}{}", format!("{}{}", provider.to_string(), "/".to_string()), model.to_string());
}

#[rustfmt::skip]
pub fn clamp(value: f64, minimum: f64, maximum: f64) -> f64 {
    return js_min(js_max(value, minimum), maximum);
}

#[rustfmt::skip]
pub fn longest_cooldown(previous: f64, next: f64) -> f64 {
    return js_max(previous, next);
}

#[rustfmt::skip]
pub fn retry_after_deadline(seconds: f64, now: f64, maximum: f64) -> f64 {
    if ((!f64::is_finite(seconds)) || (seconds < 0.0)) {
        return now;
    }
    return (now + clamp(seconds, 0.0, maximum));
}

#[rustfmt::skip]
pub fn token_cost(input: f64, output: f64, input_per_million: f64, output_per_million: f64) -> f64 {
    return (((input * input_per_million) + (output * output_per_million)) / 1000000.0);
}

#[rustfmt::skip]
pub fn valid_token_count(value: f64) -> bool {
    return ((f64::is_finite(value) && (value >= 0.0)) && (f64::floor(value) == value));
}

#[rustfmt::skip]
pub fn settled_token_usage(total: f64, reserved: f64, actual: f64) -> f64 {
    return (js_max(0.0, (total - reserved)) + actual);
}

#[rustfmt::skip]
pub fn remaining_token_budget(used: f64, reserved: f64, max: f64) -> f64 {
    if (max < 0.0) {
        return (-1.0);
    }
    return js_max(0.0, ((max - used) - reserved));
}

#[rustfmt::skip]
pub fn completion_token_limit(requested: f64, available: f64, limit: f64) -> f64 {
    return js_max(0.0, f64::floor(js_min(requested, js_min(available, limit))));
}

#[rustfmt::skip]
pub fn retry_backoff(failures: f64, base: f64, maximum: f64) -> f64 {
    let mut delay = base;
    let mut remaining = js_max(0.0, f64::floor(failures));
    while ((remaining > 0.0) && (delay < maximum)) {
        delay = js_min((delay * 2.0), maximum);
        remaining = (remaining - 1.0);
    }
    return js_min(delay, maximum);
}

#[rustfmt::skip]
pub fn retryable_status(status: f64) -> bool {
    return (((status == 408.0) || (status == 429.0)) || ((status >= 500.0) && (status <= 599.0)));
}

#[rustfmt::skip]
pub fn success_status(status: f64) -> bool {
    return ((status >= 200.0) && (status <= 299.0));
}

#[rustfmt::skip]
pub fn weighted_capacity(weight: f64, load: f64) -> f64 {
    if (((weight <= 0.0) || (!f64::is_finite(weight))) || (load < 0.0)) {
        return 0.0;
    }
    return (weight / (load + 1.0));
}

#[rustfmt::skip]
pub fn token_expired(now: f64, expires: f64, skew: f64) -> bool {
    return (now >= (expires + skew));
}

#[rustfmt::skip]
pub fn is_qualified_model(model: &str) -> bool {
    return model.to_string().contains(&"/".to_string());
}

#[rustfmt::skip]
pub fn credential_prefix_matches(value: &str, prefix: &str) -> bool {
    return value.to_string().starts_with(&prefix.to_string());
}

#[rustfmt::skip]
pub fn utf16_length(value: &str) -> f64 {
    return (value.to_string().encode_utf16().count() as f64);
}

#[rustfmt::skip]
pub fn model_name_length_permits(value: &str, maximum: f64) -> bool {
    return ((utf16_length(&value.to_string()) > 0.0) && (utf16_length(&value.to_string()) <= maximum));
}

#[cfg(test)]
#[rustfmt::skip]
mod shared_fixtures {
    use super::*;

    #[test]
    fn budget_unlimited() {
        assert_eq!(token_budget_permits(1000.0_f64, 500.0_f64, 20.0_f64, -1.0_f64), true);
    }

    #[test]
    fn budget_exact_reservation() {
        assert_eq!(token_budget_permits(50.0_f64, 30.0_f64, 20.0_f64, 100.0_f64), true);
    }

    #[test]
    fn budget_over_reservation() {
        assert_eq!(token_budget_permits(50.0_f64, 30.0_f64, 21.0_f64, 100.0_f64), false);
    }

    #[test]
    fn budget_exhausted_zero_reserve() {
        assert_eq!(token_budget_permits(80.0_f64, 20.0_f64, 0.0_f64, 100.0_f64), false);
    }

    #[test]
    fn budget_zero_cap() {
        assert_eq!(token_budget_permits(0.0_f64, 0.0_f64, 0.0_f64, 0.0_f64), false);
    }

    #[test]
    fn cooldown_future() {
        assert_eq!(cooldown_active(101.0_f64, 100.0_f64), true);
    }

    #[test]
    fn cooldown_boundary() {
        assert_eq!(cooldown_active(100.0_f64, 100.0_f64), false);
    }

    #[test]
    fn provider_model_id() {
        assert_eq!(provider_model_id("openai", "gpt-4.1"), "openai/gpt-4.1");
    }

    #[test]
    fn provider_unicode_id() {
        assert_eq!(provider_model_id("提供者", "😀"), "提供者/😀");
    }

    #[test]
    fn clamp_low() {
        assert_eq!(clamp(-2.0_f64, 0.0_f64, 10.0_f64).to_bits(), (0.0_f64).to_bits());
    }

    #[test]
    fn clamp_high() {
        assert_eq!(clamp(12.0_f64, 0.0_f64, 10.0_f64).to_bits(), (10.0_f64).to_bits());
    }

    #[test]
    fn clamp_nan() {
        assert!(clamp(f64::NAN, 0.0_f64, 10.0_f64).is_nan());
    }

    #[test]
    fn clamp_negative_zero() {
        assert_eq!(clamp(-0.0, -0.0, 0.0_f64).to_bits(), (-0.0).to_bits());
    }

    #[test]
    fn cooldown_never_shortens() {
        assert_eq!(longest_cooldown(100.0_f64, 50.0_f64).to_bits(), (100.0_f64).to_bits());
    }

    #[test]
    fn max_zero_sign() {
        assert_eq!(longest_cooldown(-0.0, 0.0_f64).to_bits(), (0.0_f64).to_bits());
    }

    #[test]
    fn max_nan_right() {
        assert!(longest_cooldown(10.0_f64, f64::NAN).is_nan());
    }

    #[test]
    fn retry_deadline_capped() {
        assert_eq!(retry_after_deadline(1000.0_f64, 20.0_f64, 300.0_f64).to_bits(), (320.0_f64).to_bits());
    }

    #[test]
    fn retry_negative() {
        assert_eq!(retry_after_deadline(-1.0_f64, 20.0_f64, 300.0_f64).to_bits(), (20.0_f64).to_bits());
    }

    #[test]
    fn retry_infinite() {
        assert_eq!(retry_after_deadline(f64::INFINITY, 20.0_f64, 300.0_f64).to_bits(), (20.0_f64).to_bits());
    }

    #[test]
    fn retry_nan() {
        assert_eq!(retry_after_deadline(f64::NAN, 20.0_f64, 300.0_f64).to_bits(), (20.0_f64).to_bits());
    }

    #[test]
    fn cost_per_million() {
        assert_eq!(token_cost(1000000.0_f64, 1000000.0_f64, 2.0_f64, 8.0_f64).to_bits(), (10.0_f64).to_bits());
    }

    #[test]
    fn cost_fractional() {
        assert_eq!(token_cost(100.0_f64, 50.0_f64, 2.0_f64, 8.0_f64).to_bits(), (0.0006_f64).to_bits());
    }

    #[test]
    fn valid_count() {
        assert_eq!(valid_token_count(42.0_f64), true);
    }

    #[test]
    fn fractional_count() {
        assert_eq!(valid_token_count(1.5_f64), false);
    }

    #[test]
    fn infinite_count() {
        assert_eq!(valid_token_count(f64::INFINITY), false);
    }

    #[test]
    fn negative_count() {
        assert_eq!(valid_token_count(-1.0_f64), false);
    }

    #[test]
    fn settle_refund() {
        assert_eq!(settled_token_usage(100.0_f64, 40.0_f64, 15.0_f64).to_bits(), (75.0_f64).to_bits());
    }

    #[test]
    fn settle_floor() {
        assert_eq!(settled_token_usage(20.0_f64, 40.0_f64, 15.0_f64).to_bits(), (15.0_f64).to_bits());
    }

    #[test]
    fn remaining_budget() {
        assert_eq!(remaining_token_budget(20.0_f64, 10.0_f64, 100.0_f64).to_bits(), (70.0_f64).to_bits());
    }

    #[test]
    fn remaining_unlimited() {
        assert_eq!(remaining_token_budget(20.0_f64, 10.0_f64, -1.0_f64).to_bits(), (-1.0_f64).to_bits());
    }

    #[test]
    fn remaining_exhausted() {
        assert_eq!(remaining_token_budget(80.0_f64, 30.0_f64, 100.0_f64).to_bits(), (0.0_f64).to_bits());
    }

    #[test]
    fn completion_context_cap() {
        assert_eq!(completion_token_limit(1000.0_f64, 500.0_f64, 2000.0_f64).to_bits(), (500.0_f64).to_bits());
    }

    #[test]
    fn completion_floor() {
        assert_eq!(completion_token_limit(10.9_f64, 20.0_f64, 100.0_f64).to_bits(), (10.0_f64).to_bits());
    }

    #[test]
    fn completion_negative() {
        assert_eq!(completion_token_limit(-1.0_f64, 20.0_f64, 100.0_f64).to_bits(), (0.0_f64).to_bits());
    }

    #[test]
    fn backoff_zero() {
        assert_eq!(retry_backoff(0.0_f64, 2.0_f64, 60.0_f64).to_bits(), (2.0_f64).to_bits());
    }

    #[test]
    fn backoff_four() {
        assert_eq!(retry_backoff(4.0_f64, 2.0_f64, 60.0_f64).to_bits(), (32.0_f64).to_bits());
    }

    #[test]
    fn backoff_cap() {
        assert_eq!(retry_backoff(10.0_f64, 2.0_f64, 60.0_f64).to_bits(), (60.0_f64).to_bits());
    }

    #[test]
    fn retryable_rate_limit() {
        assert_eq!(retryable_status(429.0_f64), true);
    }

    #[test]
    fn retryable_server_error() {
        assert_eq!(retryable_status(503.0_f64), true);
    }

    #[test]
    fn retryable_client_error() {
        assert_eq!(retryable_status(400.0_f64), false);
    }

    #[test]
    fn retryable_outside_http() {
        assert_eq!(retryable_status(600.0_f64), false);
    }

    #[test]
    fn success_minimum() {
        assert_eq!(success_status(200.0_f64), true);
    }

    #[test]
    fn success_maximum() {
        assert_eq!(success_status(299.0_f64), true);
    }

    #[test]
    fn redirect_not_success() {
        assert_eq!(success_status(300.0_f64), false);
    }

    #[test]
    fn weighted_capacity() {
        assert_eq!(weighted_capacity(12.0_f64, 3.0_f64).to_bits(), (3.0_f64).to_bits());
    }

    #[test]
    fn negative_weight() {
        assert_eq!(weighted_capacity(-1.0_f64, 0.0_f64).to_bits(), (0.0_f64).to_bits());
    }

    #[test]
    fn infinite_weight() {
        assert_eq!(weighted_capacity(f64::INFINITY, 0.0_f64).to_bits(), (0.0_f64).to_bits());
    }

    #[test]
    fn token_expiry_boundary() {
        assert_eq!(token_expired(110.0_f64, 100.0_f64, 10.0_f64), true);
    }

    #[test]
    fn token_before_expiry() {
        assert_eq!(token_expired(109.0_f64, 100.0_f64, 10.0_f64), false);
    }

    #[test]
    fn qualified_model() {
        assert_eq!(is_qualified_model("openai/gpt-4.1"), true);
    }

    #[test]
    fn unqualified_model() {
        assert_eq!(is_qualified_model("gpt-4.1"), false);
    }

    #[test]
    fn credential_prefix() {
        assert_eq!(credential_prefix_matches("la_sk_example", "la_sk_"), true);
    }

    #[test]
    fn credential_prefix_case() {
        assert_eq!(credential_prefix_matches("LA_sk_example", "la_sk_"), false);
    }

    #[test]
    fn utf16_astral() {
        assert_eq!(utf16_length("a😀é").to_bits(), (4.0_f64).to_bits());
    }

    #[test]
    fn utf16_combining() {
        assert_eq!(utf16_length("é").to_bits(), (2.0_f64).to_bits());
    }

    #[test]
    fn model_length_cap() {
        assert_eq!(model_name_length_permits("😀", 1.0_f64), false);
    }

    #[test]
    fn model_length_accepted() {
        assert_eq!(model_name_length_permits("😀", 2.0_f64), true);
    }

    #[test]
    fn empty_model() {
        assert_eq!(model_name_length_permits("", 100.0_f64), false);
    }
}
