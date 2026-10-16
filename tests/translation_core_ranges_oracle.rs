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
