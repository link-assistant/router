//! Independent public-API expectations paired with mutable-f64-control.test.mjs.
//! Cargo's default integration-test discovery includes this file. Source only:
//! run in CI after the JavaScript gate; no local Rust execution qualifies it.
use link_assistant_router::generated_js_first::policy::retry_backoff;

#[test]
fn retry_backoff_floors_failure_counts_and_stops_at_the_maximum() {
    for (failures, base, maximum, expected) in [
        (0.0, 10.0, 100.0, 10.0_f64),
        (0.9, 10.0, 100.0, 10.0),
        (1.0, 10.0, 100.0, 20.0),
        (2.0, 10.0, 100.0, 40.0),
        (3.9, 10.0, 100.0, 80.0),
        (4.0, 10.0, 100.0, 100.0),
        (4.9, 10.0, 100.0, 100.0),
        (-0.5, 10.0, 100.0, 10.0),
        (-3.0, 10.0, 100.0, 10.0),
        (0.0, 200.0, 100.0, 100.0),
        (1.0, -1.0, 100.0, -2.0),
        (2.0, -1.0, 100.0, -4.0),
    ] {
        assert_eq!(
            retry_backoff(failures, base, maximum).to_bits(),
            expected.to_bits()
        );
    }
}

#[test]
fn retry_backoff_preserves_defined_zero_signs() {
    for (failures, base, maximum, expected) in [
        (0.0, -0.0, 100.0, -0.0_f64),
        (3.0, -0.0, 100.0, -0.0_f64),
        (0.0, 0.0, -0.0, -0.0_f64),
        (0.0, -0.0, 0.0, -0.0_f64),
        (0.0, 0.0, 100.0, 0.0_f64),
        (-0.0, 10.0, 100.0, 10.0_f64),
    ] {
        assert_eq!(
            retry_backoff(failures, base, maximum).to_bits(),
            expected.to_bits()
        );
    }
}

#[test]
fn retry_backoff_distinguishes_nan_failures_from_nan_delay_or_maximum() {
    assert_eq!(
        retry_backoff(f64::NAN, 10.0, 100.0).to_bits(),
        10.0_f64.to_bits()
    );
    assert!(retry_backoff(3.0, f64::NAN, 100.0).is_nan());
    assert!(retry_backoff(3.0, 10.0, f64::NAN).is_nan());
    assert!(retry_backoff(f64::NAN, f64::NAN, f64::NAN).is_nan());
}

#[test]
fn retry_backoff_handles_terminating_infinity_and_subnormal_boundaries() {
    let smallest = f64::from_bits(1);
    for (failures, base, maximum, expected) in [
        (f64::NEG_INFINITY, 10.0, 100.0, 10.0),
        (f64::INFINITY, 1.0, 8.0, 8.0),
        // Positive doubling reaches infinity in finitely many iterations.
        (f64::INFINITY, 1.0, f64::INFINITY, f64::INFINITY),
        (1.0, f64::INFINITY, 100.0, 100.0),
        (2.0, f64::NEG_INFINITY, 100.0, f64::NEG_INFINITY),
        (2.0, 1.0, f64::NEG_INFINITY, f64::NEG_INFINITY),
        (0.0, smallest, 1.0, smallest),
        (1.0, smallest, 1.0, f64::from_bits(2)),
        (1.0, f64::MAX, f64::INFINITY, f64::INFINITY),
    ] {
        assert_eq!(
            retry_backoff(failures, base, maximum).to_bits(),
            expected.to_bits()
        );
    }
    // Infinite/nonprogress loops (for example infinite failures with zero base
    // and a positive maximum) are deliberately not executed by this test.
}
