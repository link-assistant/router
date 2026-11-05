//! Independent native integer BITS oracle. SOURCE ONLY; UNRUN. CI after all JS gates.
use link_assistant_router::translation_fixed_types_core as scalar;
#[test]
fn fixed_integer_bit_widths_are_u32_independent_of_the_receiver_domain() {
    let actual: [u32; 10] = [scalar::U8::BITS, scalar::U16::BITS, scalar::U32::BITS, scalar::U64::BITS, scalar::U128::BITS, scalar::I8::BITS, scalar::I16::BITS, scalar::I32::BITS, scalar::I64::BITS, scalar::I128::BITS];
    assert_eq!(actual, [8, 16, 32, 64, 128, 8, 16, 32, 64, 128]);
    let sum: scalar::U32 = scalar::U8::BITS + scalar::U128::BITS;
    assert_eq!(sum, 136);
    assert_eq!(scalar::U64::BITS as scalar::U64, 64);
    assert_eq!(scalar::I128::BITS, 128_u32);
}
#[test]
fn machine_bit_widths_follow_the_real_native_pointer_width() {
    assert_eq!(scalar::Usize::BITS, usize::BITS);
    assert_eq!(scalar::Isize::BITS, isize::BITS);
    #[cfg(target_pointer_width = "64")]
    assert_eq!([scalar::Usize::BITS, scalar::Isize::BITS], [64_u32, 64_u32]);
}
