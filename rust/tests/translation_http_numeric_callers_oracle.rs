//! Independent fixed-width algorithm SOURCE. JavaScript-gated Rust CI only.
use link_assistant_router::{translation_integer_core as integer,
    translation_primitive_option_core as option};

fn factorial(amount: u64) -> u64 {
    if amount == 0 {1} else {
        integer::u64_wrapping_mul(amount,factorial(integer::u64_saturating_sub(amount,1)))
    }
}

#[test]
fn wrapping_recursion_overflow_and_primitive_options_keep_native_boundaries() {
    for (amount,expected) in [(0,1),(1,1),(5,120),(20,2432902008176640000),(21,14197454024290336768)] {
        assert_eq!(factorial(amount),expected);
    }
    assert_eq!(option::u64_unwrap_or(integer::u64_checked_add(u64::MAX,1),7),7);
    assert_eq!(integer::u64_checked_sub(0,1),None);
    assert_eq!(integer::u64_saturating_sub(0,1),0);
    assert_eq!(integer::u64_wrapping_sub(0,1),u64::MAX);
}
