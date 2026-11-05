// Independent source-f64 oracle. CI only after every same-SHA JS stage passes.
fn bounded_float_loop(value: f64) -> f64 {
    let mut current = value;
    let mut remaining = 4_u64;
    while current < 1.0 && remaining > 0 {
        current += 0.25;
        remaining -= 1;
    }
    current
}
#[test]
fn exact_decimal_rounding_signed_zero_and_ieee_runtime_classes() {
    assert_eq!(0.1_f64.to_bits(), 0x3fb9_9999_9999_999a);
    assert_eq!(5e-324_f64.to_bits(), 1);
    assert_eq!(2.2250738585072014e-308_f64.to_bits(), 0x0010_0000_0000_0000);
    assert_eq!(1.7976931348623157e308_f64.to_bits(), 0x7fef_ffff_ffff_ffff);
    assert_eq!((-0.0_f64).to_bits(), 0x8000_0000_0000_0000);
    assert!(f64::NAN.is_nan());
    assert_eq!((7.0_f64 / 2.0).to_bits(), 3.5_f64.to_bits());
    assert_eq!((-7.0_f64 % 2.0).to_bits(), (-1.0_f64).to_bits());
    assert!((f64::MAX * 2.0).is_infinite());
    assert_eq!((-0.0_f64 / 1.0).to_bits(), (-0.0_f64).to_bits());
    assert_eq!(bounded_float_loop(0.0).to_bits(), 1.0_f64.to_bits());
    assert_eq!(bounded_float_loop(-1.0).to_bits(), 0.0_f64.to_bits());
    assert_eq!(
        bounded_float_loop(f64::NEG_INFINITY).to_bits(),
        f64::NEG_INFINITY.to_bits()
    );
    assert!(bounded_float_loop(f64::NAN).is_nan());
}
