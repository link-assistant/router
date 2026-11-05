//! Independent binary64 vector oracle. CI only after every JS gate passes.
use link_assistant_router::translation_core;
fn values(flag: bool, seed: f64) -> Vec<f64> {
    if !flag { translation_core::vec![seed, seed, -0.0_f64] } else { translation_core::vec![] }
}
#[test]
fn all_binary64_inputs_retain_native_value_class_and_zero_sign() {
    for seed in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY, -0.0, f64::from_bits(1), f64::MAX] {
        let result = values(false, seed);
        assert_eq!(result.len(), 3);
        for value in &result[..2] {
            if seed.is_nan() { assert!(value.is_nan()); } else { assert_eq!(value.to_bits(), seed.to_bits()); }
        }
        assert_eq!(result[2].to_bits(), (-0.0_f64).to_bits());
        assert!(values(true, seed).is_empty());
    }
}
#[test]
fn finite_literal_boundaries_round_once() {
    let values = translation_core::vec![-0.0_f64, 0.0_f64, 5e-324_f64, 1.7976931348623157e308_f64];
    assert_eq!(values[0].to_bits(), (-0.0_f64).to_bits());
    assert_eq!(values[1].to_bits(), 0);
    assert_eq!(values[2].to_bits(), 1);
    assert_eq!(values[3].to_bits(), f64::MAX.to_bits());
}
