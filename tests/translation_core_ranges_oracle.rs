//! Independent owned-range behavior oracle. CI only; never run locally for #759.
use link_assistant_router::translation_core::f64_inclusive_contains;

#[test]
fn inclusive_ieee_boundary_cases() {
    let cases = [
        (0.0, 1.0, 0.0, true), (0.0, 1.0, 1.0, true),
        (0.0, 1.0, 0.5, true), (0.0, 1.0, -f64::from_bits(1), false),
        (0.0, 1.0, 1.0000000000000002, false),
        (-2.0, 2.0, -2.0, true), (-2.0, 2.0, 2.0, true),
        (-2.0, 2.0, -3.0, false), (-2.0, 2.0, 3.0, false),
        (2.0, -2.0, 0.0, false), (-0.0, 0.0, -0.0, true),
        (0.0, -0.0, 0.0, true), (-0.0, -0.0, -0.0, true),
        (f64::NEG_INFINITY, f64::INFINITY, 0.0, true),
        (f64::NEG_INFINITY, f64::INFINITY, f64::INFINITY, true),
        (f64::NEG_INFINITY, f64::INFINITY, f64::NEG_INFINITY, true),
        (f64::INFINITY, f64::INFINITY, f64::INFINITY, true),
        (f64::NEG_INFINITY, f64::NEG_INFINITY, f64::NEG_INFINITY, true),
        (f64::INFINITY, f64::NEG_INFINITY, 0.0, false),
        (f64::NAN, 1.0, 0.0, false), (0.0, f64::NAN, 0.0, false),
        (0.0, 1.0, f64::NAN, false),
        (f64::NEG_INFINITY, f64::INFINITY, f64::NAN, false),
        (-f64::MAX, f64::MAX, f64::MAX, true),
        (-f64::from_bits(1), f64::from_bits(1), 0.0, true),
    ];
    for (lower, upper, value, expected) in cases {
        assert_eq!(f64_inclusive_contains(lower, upper, value), expected);
    }
}

#[test]
fn evaluated_arguments_are_left_to_right_once() {
    use std::cell::RefCell;
    let tape = RefCell::new(Vec::new());
    let read = |name, value| { tape.borrow_mut().push(name); value };
    assert!(f64_inclusive_contains(read("lower", 0.0), read("upper", 1.0), read("value", 0.5)));
    assert_eq!(*tape.borrow(), ["lower", "upper", "value"]);
}

// These are Rust-only f32 source-typing oracles. They do not grant the checked
// JavaScript route any f32, generic trait dispatch or library-body authority.
#[test]
fn inclusive_binary32_boundaries_match_authored_answers_and_original_ranges() {
    let cases: &[(f32, f32, f32, bool)] = &[
        (0.0, 1.0, 0.0, true), (0.0, 1.0, 1.0, true),
        (0.0, 1.0, 0.5, true), (0.0, 1.0, -f32::from_bits(1), false),
        (0.0, 1.0, f32::from_bits(0x3f80_0001), false),
        (-2.0, 2.0, -2.0, true), (-2.0, 2.0, 2.0, true),
        (-2.0, 2.0, -3.0, false), (-2.0, 2.0, 3.0, false),
        (2.0, -2.0, 0.0, false), (-0.0, 0.0, -0.0, true),
        (0.0, -0.0, 0.0, true), (-0.0, -0.0, -0.0, true),
        (f32::NEG_INFINITY, f32::INFINITY, 0.0, true),
        (f32::NEG_INFINITY, f32::INFINITY, f32::INFINITY, true),
        (f32::NEG_INFINITY, f32::INFINITY, f32::NEG_INFINITY, true),
        (f32::INFINITY, f32::INFINITY, f32::INFINITY, true),
        (f32::NEG_INFINITY, f32::NEG_INFINITY, f32::NEG_INFINITY, true),
        (f32::INFINITY, f32::NEG_INFINITY, 0.0, false),
        (f32::NAN, 1.0, 0.0, false), (0.0, f32::NAN, 0.0, false),
        (0.0, 1.0, f32::NAN, false),
        (-f32::MAX, f32::MAX, f32::MAX, true),
        (-f32::from_bits(1), f32::from_bits(1), 0.0, true),
        (f32::from_bits(1), f32::from_bits(1), f32::from_bits(1), true),
        (0.1, 0.1, 0.1, true), (-0.1, -0.1, -0.1, true),
        (0.1, 0.1, f32::from_bits(0x3dcc_cccc), false),
        (0.1, 0.1, f32::from_bits(0x3dcc_ccce), false),
    ];
    for &(lower, upper, value, expected) in cases {
        assert_eq!((lower..=upper).contains(&value), expected);
        assert_eq!(f64_inclusive_contains(lower, upper, value), expected);
    }
}

#[test]
fn binary32_decimal_endpoints_round_before_widening() {
    let decimal = 0.1_f32;
    // Independent exact IEEE bit witnesses prevent a wrongly f64-typed bound
    // from passing just because the production 0/1 and -2/2 bounds are exact.
    assert_eq!(decimal.to_bits(), 0x3dcc_cccd);
    assert_eq!(f64::from(decimal).to_bits(), 0x3fb9_9999_a000_0000);
    assert_ne!(f64::from(decimal), 0.1_f64);
    assert!((decimal..=decimal).contains(&decimal));
    assert!(f64_inclusive_contains(decimal, decimal, decimal));
    assert!(f64_inclusive_contains(0.1, 0.1, decimal));
    assert!(!(0.1_f64..=0.1_f64).contains(&f64::from(decimal)));
    assert!(f64_inclusive_contains(0.1_f64, 0.1_f64, 0.1_f64));
}

#[test]
fn original_option_binary32_and_json_binary64_call_shapes_keep_one_type() {
    // The actual responses.top_p and OpenAI penalties are Option<f32>.
    let top_p: Option<f32> = Some(0.5);
    let frequency_penalty: Option<f32> = Some(-2.0);
    let presence_penalty: Option<f32> = Some(2.0);
    assert!(top_p.is_some_and(|value| f64_inclusive_contains(0.0, 1.0, value)));
    for value in [frequency_penalty, presence_penalty] {
        assert!(value.is_some_and(|value| f64_inclusive_contains(-2.0, 2.0, value)));
    }
    // Gemini's Value::as_f64 branch remains the original f64 operation.
    let json_value: Option<f64> = Some(0.5);
    assert!(json_value.is_some_and(|value| f64_inclusive_contains(0.0, 1.0, value)));
}
