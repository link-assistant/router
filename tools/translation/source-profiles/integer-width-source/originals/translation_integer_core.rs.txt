//! Explicit fixed-width numeric interfaces; implementations remain native.

#[must_use]
pub fn u64_saturating_add(value: u64, other: u64) -> u64 {
    value.saturating_add(other)
}

#[must_use]
pub fn u64_saturating_sub(value: u64, other: u64) -> u64 {
    value.saturating_sub(other)
}

#[must_use]
pub fn u64_saturating_mul(value: u64, other: u64) -> u64 {
    value.saturating_mul(other)
}

#[must_use]
pub fn u64_wrapping_add(value: u64, other: u64) -> u64 {
    value.wrapping_add(other)
}

#[must_use]
pub fn u64_wrapping_sub(value: u64, other: u64) -> u64 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn u64_wrapping_mul(value: u64, other: u64) -> u64 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn u64_min(value: u64, other: u64) -> u64 {
    value.min(other)
}

#[must_use]
pub fn u64_max(value: u64, other: u64) -> u64 {
    value.max(other)
}

#[must_use]
pub fn u64_clamp(value: u64, other: u64, upper: u64) -> u64 {
    value.clamp(other, upper)
}

#[must_use]
pub fn u64_checked_add(value: u64, other: u64) -> Option<u64> {
    value.checked_add(other)
}

#[must_use]
pub fn u64_checked_sub(value: u64, other: u64) -> Option<u64> {
    value.checked_sub(other)
}

#[must_use]
pub fn u64_checked_mul(value: u64, other: u64) -> Option<u64> {
    value.checked_mul(other)
}

#[must_use]
pub fn u64_checked_div(value: u64, other: u64) -> Option<u64> {
    value.checked_div(other)
}

#[must_use]
pub fn u64_checked_rem(value: u64, other: u64) -> Option<u64> {
    value.checked_rem(other)
}

#[must_use]
pub fn i64_saturating_add(value: i64, other: i64) -> i64 {
    value.saturating_add(other)
}

#[must_use]
pub fn i64_saturating_sub(value: i64, other: i64) -> i64 {
    value.saturating_sub(other)
}

#[must_use]
pub fn i64_saturating_mul(value: i64, other: i64) -> i64 {
    value.saturating_mul(other)
}

#[must_use]
pub fn i64_wrapping_add(value: i64, other: i64) -> i64 {
    value.wrapping_add(other)
}

#[must_use]
pub fn i64_wrapping_sub(value: i64, other: i64) -> i64 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn i64_wrapping_mul(value: i64, other: i64) -> i64 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn i64_min(value: i64, other: i64) -> i64 {
    value.min(other)
}

#[must_use]
pub fn i64_max(value: i64, other: i64) -> i64 {
    value.max(other)
}

#[must_use]
pub fn i64_clamp(value: i64, other: i64, upper: i64) -> i64 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i64_checked_add(value: i64, other: i64) -> Option<i64> {
    value.checked_add(other)
}

#[must_use]
pub fn i64_checked_sub(value: i64, other: i64) -> Option<i64> {
    value.checked_sub(other)
}

#[must_use]
pub fn i64_checked_mul(value: i64, other: i64) -> Option<i64> {
    value.checked_mul(other)
}

#[must_use]
pub fn i64_checked_div(value: i64, other: i64) -> Option<i64> {
    value.checked_div(other)
}

#[must_use]
pub fn i64_checked_rem(value: i64, other: i64) -> Option<i64> {
    value.checked_rem(other)
}

#[must_use]
pub fn i64_checked_abs(value: i64) -> Option<i64> {
    value.checked_abs()
}

#[must_use]
pub fn i64_saturating_abs(value: i64) -> i64 {
    value.saturating_abs()
}
