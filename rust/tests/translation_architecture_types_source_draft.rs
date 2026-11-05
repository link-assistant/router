//! Independent native architecture type oracle SOURCE; unrun.
#![forbid(unsafe_code)]

#[cfg(target_arch = "x86")]
use core::arch::x86::{__m128, __m128d, __m128i};
#[cfg(target_arch = "x86_64")]
use core::arch::x86_64::{__m128, __m128d, __m128i};

#[cfg(any(target_arch = "x86", target_arch = "x86_64"))]
#[test]
fn native_generated_simd_type_names_have_their_separate_layout_contract() {
    assert_eq!(std::mem::size_of::<__m128i>(), 16);
    assert_eq!(std::mem::size_of::<__m128>(), 16);
    assert_eq!(std::mem::size_of::<__m128d>(), 16);
    assert_eq!(std::mem::align_of::<__m128i>(), 16);
    assert_eq!(std::mem::align_of::<__m128>(), 16);
    assert_eq!(std::mem::align_of::<__m128d>(), 16);
}
