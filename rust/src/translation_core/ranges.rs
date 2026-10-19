//! Inclusive floating-point bounds in the owned compatibility interface.
//!
//! This library implementation is intentionally untranslated. Rust callers use
//! one input type, so f32 endpoints round before exact widening to f64; f64
//! inputs remain unchanged. The checked JavaScript contract accepts f64 only.
//! Arguments evaluate once, left to right; IEEE ordered comparisons reject NaN.

#[must_use]
pub fn f64_inclusive_contains<
    T: ::std::convert::Into<::std::primitive::f64> + ::std::marker::Copy,
>(lower: T, upper: T, value: T) -> bool {
    let lower: ::std::primitive::f64 = lower.into();
    let upper: ::std::primitive::f64 = upper.into();
    let value: ::std::primitive::f64 = value.into();
    lower <= value && value <= upper
}
