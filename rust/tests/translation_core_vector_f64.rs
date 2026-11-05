//! Independent native f64 vector oracle; CI only after same-SHA JS gates.
use link_assistant_router::translation_core;
#[test]
fn binary64_copy_retains_zero_subnormal_extrema_and_classification() {
    for seed in [-0.0f64, 0.0, f64::from_bits(1), f64::MAX, f64::INFINITY, f64::NEG_INFINITY, f64::NAN] {
        let values = translation_core::vec![seed; 3usize];
        assert_eq!(values.len(), 3);
        for value in values { if seed.is_nan() { assert!(value.is_nan()); } else { assert_eq!(value.to_bits(), seed.to_bits()); } }
        let empty: Vec<f64> = translation_core::vec![seed; 0usize];
        assert!(empty.is_empty());
    }
}
