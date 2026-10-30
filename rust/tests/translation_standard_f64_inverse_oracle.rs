// Independent native standard-f64 oracle. CI only after every JS stage passes.
fn negative_zero(value: f64) -> bool {
    if value == 0.0 {
        value.is_sign_negative()
    } else {
        false
    }
}
fn positive_zero(value: f64) -> bool {
    if value == 0.0 {
        value.is_sign_positive()
    } else {
        false
    }
}
#[test]
fn standard_floor_classification_and_zero_refined_signs() {
    for (value, expected) in [
        (0.25_f64, 0.0_f64),
        (-0.25, -1.0),
        (3.7, 3.0),
        (-3.7, -4.0),
    ] {
        assert_eq!(value.floor().to_bits(), expected.to_bits());
    }
    assert_eq!((-0.0_f64).floor().to_bits(), (-0.0_f64).to_bits());
    assert!(f64::NAN.floor().is_nan());
    assert!(!f64::INFINITY.is_finite());
    assert!(f64::NAN.is_nan());
    assert!(negative_zero(-0.0));
    assert!(!negative_zero(0.0));
    assert!(positive_zero(0.0));
    assert!(!positive_zero(-0.0));
    for value in [
        f64::NAN,
        f64::INFINITY,
        f64::NEG_INFINITY,
        1.0,
        -1.0,
        f64::MIN_POSITIVE,
    ] {
        assert!(!negative_zero(value));
        assert!(!positive_zero(value));
    }
}
