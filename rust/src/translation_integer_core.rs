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

#[must_use]
pub fn u8_saturating_add(value: u8, other: u8) -> u8 {
    value.saturating_add(other)
}

#[must_use]
pub fn u8_saturating_sub(value: u8, other: u8) -> u8 {
    value.saturating_sub(other)
}

#[must_use]
pub fn u8_saturating_mul(value: u8, other: u8) -> u8 {
    value.saturating_mul(other)
}

#[must_use]
pub fn u8_wrapping_add(value: u8, other: u8) -> u8 {
    value.wrapping_add(other)
}

#[must_use]
pub fn u8_wrapping_sub(value: u8, other: u8) -> u8 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn u8_wrapping_mul(value: u8, other: u8) -> u8 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn u8_min(value: u8, other: u8) -> u8 {
    value.min(other)
}

#[must_use]
pub fn u8_max(value: u8, other: u8) -> u8 {
    value.max(other)
}

#[must_use]
pub fn u8_clamp(value: u8, other: u8, upper: u8) -> u8 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i8_saturating_add(value: i8, other: i8) -> i8 {
    value.saturating_add(other)
}

#[must_use]
pub fn i8_saturating_sub(value: i8, other: i8) -> i8 {
    value.saturating_sub(other)
}

#[must_use]
pub fn i8_saturating_mul(value: i8, other: i8) -> i8 {
    value.saturating_mul(other)
}

#[must_use]
pub fn i8_wrapping_add(value: i8, other: i8) -> i8 {
    value.wrapping_add(other)
}

#[must_use]
pub fn i8_wrapping_sub(value: i8, other: i8) -> i8 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn i8_wrapping_mul(value: i8, other: i8) -> i8 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn i8_min(value: i8, other: i8) -> i8 {
    value.min(other)
}

#[must_use]
pub fn i8_max(value: i8, other: i8) -> i8 {
    value.max(other)
}

#[must_use]
pub fn i8_clamp(value: i8, other: i8, upper: i8) -> i8 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i8_saturating_abs(value: i8) -> i8 {
    value.saturating_abs()
}

#[must_use]
pub fn u16_saturating_add(value: u16, other: u16) -> u16 {
    value.saturating_add(other)
}

#[must_use]
pub fn u16_saturating_sub(value: u16, other: u16) -> u16 {
    value.saturating_sub(other)
}

#[must_use]
pub fn u16_saturating_mul(value: u16, other: u16) -> u16 {
    value.saturating_mul(other)
}

#[must_use]
pub fn u16_wrapping_add(value: u16, other: u16) -> u16 {
    value.wrapping_add(other)
}

#[must_use]
pub fn u16_wrapping_sub(value: u16, other: u16) -> u16 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn u16_wrapping_mul(value: u16, other: u16) -> u16 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn u16_min(value: u16, other: u16) -> u16 {
    value.min(other)
}

#[must_use]
pub fn u16_max(value: u16, other: u16) -> u16 {
    value.max(other)
}

#[must_use]
pub fn u16_clamp(value: u16, other: u16, upper: u16) -> u16 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i16_saturating_add(value: i16, other: i16) -> i16 {
    value.saturating_add(other)
}

#[must_use]
pub fn i16_saturating_sub(value: i16, other: i16) -> i16 {
    value.saturating_sub(other)
}

#[must_use]
pub fn i16_saturating_mul(value: i16, other: i16) -> i16 {
    value.saturating_mul(other)
}

#[must_use]
pub fn i16_wrapping_add(value: i16, other: i16) -> i16 {
    value.wrapping_add(other)
}

#[must_use]
pub fn i16_wrapping_sub(value: i16, other: i16) -> i16 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn i16_wrapping_mul(value: i16, other: i16) -> i16 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn i16_min(value: i16, other: i16) -> i16 {
    value.min(other)
}

#[must_use]
pub fn i16_max(value: i16, other: i16) -> i16 {
    value.max(other)
}

#[must_use]
pub fn i16_clamp(value: i16, other: i16, upper: i16) -> i16 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i16_saturating_abs(value: i16) -> i16 {
    value.saturating_abs()
}

#[must_use]
pub fn u32_saturating_add(value: u32, other: u32) -> u32 {
    value.saturating_add(other)
}

#[must_use]
pub fn u32_saturating_sub(value: u32, other: u32) -> u32 {
    value.saturating_sub(other)
}

#[must_use]
pub fn u32_saturating_mul(value: u32, other: u32) -> u32 {
    value.saturating_mul(other)
}

#[must_use]
pub fn u32_wrapping_add(value: u32, other: u32) -> u32 {
    value.wrapping_add(other)
}

#[must_use]
pub fn u32_wrapping_sub(value: u32, other: u32) -> u32 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn u32_wrapping_mul(value: u32, other: u32) -> u32 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn u32_min(value: u32, other: u32) -> u32 {
    value.min(other)
}

#[must_use]
pub fn u32_max(value: u32, other: u32) -> u32 {
    value.max(other)
}

#[must_use]
pub fn u32_clamp(value: u32, other: u32, upper: u32) -> u32 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i32_saturating_add(value: i32, other: i32) -> i32 {
    value.saturating_add(other)
}

#[must_use]
pub fn i32_saturating_sub(value: i32, other: i32) -> i32 {
    value.saturating_sub(other)
}

#[must_use]
pub fn i32_saturating_mul(value: i32, other: i32) -> i32 {
    value.saturating_mul(other)
}

#[must_use]
pub fn i32_wrapping_add(value: i32, other: i32) -> i32 {
    value.wrapping_add(other)
}

#[must_use]
pub fn i32_wrapping_sub(value: i32, other: i32) -> i32 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn i32_wrapping_mul(value: i32, other: i32) -> i32 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn i32_min(value: i32, other: i32) -> i32 {
    value.min(other)
}

#[must_use]
pub fn i32_max(value: i32, other: i32) -> i32 {
    value.max(other)
}

#[must_use]
pub fn i32_clamp(value: i32, other: i32, upper: i32) -> i32 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i32_saturating_abs(value: i32) -> i32 {
    value.saturating_abs()
}

#[must_use]
pub fn u128_saturating_add(value: u128, other: u128) -> u128 {
    value.saturating_add(other)
}

#[must_use]
pub fn u128_saturating_sub(value: u128, other: u128) -> u128 {
    value.saturating_sub(other)
}

#[must_use]
pub fn u128_saturating_mul(value: u128, other: u128) -> u128 {
    value.saturating_mul(other)
}

#[must_use]
pub fn u128_wrapping_add(value: u128, other: u128) -> u128 {
    value.wrapping_add(other)
}

#[must_use]
pub fn u128_wrapping_sub(value: u128, other: u128) -> u128 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn u128_wrapping_mul(value: u128, other: u128) -> u128 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn u128_min(value: u128, other: u128) -> u128 {
    value.min(other)
}

#[must_use]
pub fn u128_max(value: u128, other: u128) -> u128 {
    value.max(other)
}

#[must_use]
pub fn u128_clamp(value: u128, other: u128, upper: u128) -> u128 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i128_saturating_add(value: i128, other: i128) -> i128 {
    value.saturating_add(other)
}

#[must_use]
pub fn i128_saturating_sub(value: i128, other: i128) -> i128 {
    value.saturating_sub(other)
}

#[must_use]
pub fn i128_saturating_mul(value: i128, other: i128) -> i128 {
    value.saturating_mul(other)
}

#[must_use]
pub fn i128_wrapping_add(value: i128, other: i128) -> i128 {
    value.wrapping_add(other)
}

#[must_use]
pub fn i128_wrapping_sub(value: i128, other: i128) -> i128 {
    value.wrapping_sub(other)
}

#[must_use]
pub fn i128_wrapping_mul(value: i128, other: i128) -> i128 {
    value.wrapping_mul(other)
}

#[must_use]
pub fn i128_min(value: i128, other: i128) -> i128 {
    value.min(other)
}

#[must_use]
pub fn i128_max(value: i128, other: i128) -> i128 {
    value.max(other)
}

#[must_use]
pub fn i128_clamp(value: i128, other: i128, upper: i128) -> i128 {
    value.clamp(other, upper)
}

#[must_use]
pub fn i128_saturating_abs(value: i128) -> i128 {
    value.saturating_abs()
}

#[must_use]
pub fn u8_checked_add(value: u8, other: u8) -> Option<u8> {
    value.checked_add(other)
}

#[must_use]
pub fn u8_checked_sub(value: u8, other: u8) -> Option<u8> {
    value.checked_sub(other)
}

#[must_use]
pub fn u8_checked_mul(value: u8, other: u8) -> Option<u8> {
    value.checked_mul(other)
}

#[must_use]
pub fn u8_checked_div(value: u8, other: u8) -> Option<u8> {
    value.checked_div(other)
}

#[must_use]
pub fn u8_checked_rem(value: u8, other: u8) -> Option<u8> {
    value.checked_rem(other)
}

#[must_use]
pub fn i8_checked_add(value: i8, other: i8) -> Option<i8> {
    value.checked_add(other)
}

#[must_use]
pub fn i8_checked_sub(value: i8, other: i8) -> Option<i8> {
    value.checked_sub(other)
}

#[must_use]
pub fn i8_checked_mul(value: i8, other: i8) -> Option<i8> {
    value.checked_mul(other)
}

#[must_use]
pub fn i8_checked_div(value: i8, other: i8) -> Option<i8> {
    value.checked_div(other)
}

#[must_use]
pub fn i8_checked_rem(value: i8, other: i8) -> Option<i8> {
    value.checked_rem(other)
}

#[must_use]
pub fn i8_checked_abs(value: i8) -> Option<i8> {
    value.checked_abs()
}

#[must_use]
pub fn u16_checked_add(value: u16, other: u16) -> Option<u16> {
    value.checked_add(other)
}

#[must_use]
pub fn u16_checked_sub(value: u16, other: u16) -> Option<u16> {
    value.checked_sub(other)
}

#[must_use]
pub fn u16_checked_mul(value: u16, other: u16) -> Option<u16> {
    value.checked_mul(other)
}

#[must_use]
pub fn u16_checked_div(value: u16, other: u16) -> Option<u16> {
    value.checked_div(other)
}

#[must_use]
pub fn u16_checked_rem(value: u16, other: u16) -> Option<u16> {
    value.checked_rem(other)
}

#[must_use]
pub fn i16_checked_add(value: i16, other: i16) -> Option<i16> {
    value.checked_add(other)
}

#[must_use]
pub fn i16_checked_sub(value: i16, other: i16) -> Option<i16> {
    value.checked_sub(other)
}

#[must_use]
pub fn i16_checked_mul(value: i16, other: i16) -> Option<i16> {
    value.checked_mul(other)
}

#[must_use]
pub fn i16_checked_div(value: i16, other: i16) -> Option<i16> {
    value.checked_div(other)
}

#[must_use]
pub fn i16_checked_rem(value: i16, other: i16) -> Option<i16> {
    value.checked_rem(other)
}

#[must_use]
pub fn i16_checked_abs(value: i16) -> Option<i16> {
    value.checked_abs()
}

#[must_use]
pub fn u32_checked_add(value: u32, other: u32) -> Option<u32> {
    value.checked_add(other)
}

#[must_use]
pub fn u32_checked_sub(value: u32, other: u32) -> Option<u32> {
    value.checked_sub(other)
}

#[must_use]
pub fn u32_checked_mul(value: u32, other: u32) -> Option<u32> {
    value.checked_mul(other)
}

#[must_use]
pub fn u32_checked_div(value: u32, other: u32) -> Option<u32> {
    value.checked_div(other)
}

#[must_use]
pub fn u32_checked_rem(value: u32, other: u32) -> Option<u32> {
    value.checked_rem(other)
}

#[must_use]
pub fn i32_checked_add(value: i32, other: i32) -> Option<i32> {
    value.checked_add(other)
}

#[must_use]
pub fn i32_checked_sub(value: i32, other: i32) -> Option<i32> {
    value.checked_sub(other)
}

#[must_use]
pub fn i32_checked_mul(value: i32, other: i32) -> Option<i32> {
    value.checked_mul(other)
}

#[must_use]
pub fn i32_checked_div(value: i32, other: i32) -> Option<i32> {
    value.checked_div(other)
}

#[must_use]
pub fn i32_checked_rem(value: i32, other: i32) -> Option<i32> {
    value.checked_rem(other)
}

#[must_use]
pub fn i32_checked_abs(value: i32) -> Option<i32> {
    value.checked_abs()
}

#[must_use]
pub fn u128_checked_add(value: u128, other: u128) -> Option<u128> {
    value.checked_add(other)
}

#[must_use]
pub fn u128_checked_sub(value: u128, other: u128) -> Option<u128> {
    value.checked_sub(other)
}

#[must_use]
pub fn u128_checked_mul(value: u128, other: u128) -> Option<u128> {
    value.checked_mul(other)
}

#[must_use]
pub fn u128_checked_div(value: u128, other: u128) -> Option<u128> {
    value.checked_div(other)
}

#[must_use]
pub fn u128_checked_rem(value: u128, other: u128) -> Option<u128> {
    value.checked_rem(other)
}

#[must_use]
pub fn i128_checked_add(value: i128, other: i128) -> Option<i128> {
    value.checked_add(other)
}

#[must_use]
pub fn i128_checked_sub(value: i128, other: i128) -> Option<i128> {
    value.checked_sub(other)
}

#[must_use]
pub fn i128_checked_mul(value: i128, other: i128) -> Option<i128> {
    value.checked_mul(other)
}

#[must_use]
pub fn i128_checked_div(value: i128, other: i128) -> Option<i128> {
    value.checked_div(other)
}

#[must_use]
pub fn i128_checked_rem(value: i128, other: i128) -> Option<i128> {
    value.checked_rem(other)
}

#[must_use]
pub fn i128_checked_abs(value: i128) -> Option<i128> {
    value.checked_abs()
}
