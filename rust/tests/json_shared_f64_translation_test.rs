//! Independent source oracles for registered JSON f64 slots and shared reads.
//! CI only after the complete same-commit JavaScript gate; no local Rust run.

use serde_json::{Number, Value};

#[test]
fn original_json_numeric_signatures_preserve_binary64_boundaries() {
    for (number, expected) in [
        (Number::from(9_007_199_254_740_993_u64), 9_007_199_254_740_992.0_f64),
        (Number::from(u64::MAX), 18_446_744_073_709_551_616.0_f64),
        (Number::from(i64::MIN), -9_223_372_036_854_775_808.0_f64),
    ] {
        let direct = number.as_f64().expect("every default Number has f64 form");
        let forwarded = Value::Number(number)
            .as_f64()
            .expect("Value forwards its Number conversion");
        assert_eq!(direct.to_bits(), expected.to_bits());
        assert_eq!(forwarded.to_bits(), expected.to_bits());
    }
    for input in [-0.0_f64, 0.0, f64::from_bits(1), f64::MAX] {
        let number = Number::from_f64(input).expect("finite Number source");
        assert_eq!(number.as_f64().expect("Number f64").to_bits(), input.to_bits());
    }
    for input in [f64::NAN, f64::INFINITY, f64::NEG_INFINITY] {
        assert!(Number::from_f64(input).is_none());
    }
    for input in [Value::Null, Value::Bool(false), Value::String("1".into())] {
        assert!(input.as_f64().is_none());
    }
}

#[test]
fn explicit_shared_reads_keep_signed_zero_and_do_not_erase_reference_depth() {
    #[allow(
        clippy::trivially_copy_pass_by_ref,
        reason = "explicit shared primitive read is the behavior under test"
    )]
    fn read(value: &f64) -> f64 {
        *value
    }
    #[allow(
        clippy::trivially_copy_pass_by_ref,
        reason = "two separate reference reads are the behavior under test"
    )]
    fn nested(value: &&f64) -> f64 {
        **value
    }
    for input in [
        f64::NAN,
        f64::INFINITY,
        f64::NEG_INFINITY,
        -0.0,
        0.0,
        f64::from_bits(1),
        -f64::from_bits(1),
        f64::MAX,
    ] {
        if input.is_nan() {
            assert!(read(&input).is_nan());
            assert!(nested(&&input).is_nan());
        } else {
            assert_eq!(read(&input).to_bits(), input.to_bits());
            assert_eq!(nested(&&input).to_bits(), input.to_bits());
        }
    }
}

#[test]
fn a_visible_reference_trait_requires_separate_method_selection_evidence() {
    trait CompetingFinite: Copy {
        fn is_finite(self) -> bool;
    }
    impl CompetingFinite for &f64 {
        fn is_finite(self) -> bool {
            false
        }
    }
    let value = 1.0_f64;
    assert!(!(&value).is_finite());
    assert!(f64::is_finite(value));
}
