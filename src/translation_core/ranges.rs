//! Inclusive binary64 bounds in the owned compatibility interface.
//!
//! This library implementation is intentionally untranslated. Both targets
//! evaluate the three by-value arguments once, from left to right, and use
//! IEEE ordered comparisons. NaN in any position therefore returns false.

#[must_use]
pub fn f64_inclusive_contains(lower: f64, upper: f64, value: f64) -> bool {
    lower <= value && value <= upper
}
