// Independent native public fixed aliases SOURCE. CI after all same-SHA JS gates.
mod implementation {
    pub fn mask(left: u8, right: u8) -> u8 { left | right }
}
pub type Word = ::core::primitive::u8;
pub type Wide = ::core::primitive::u128;
pub type Signed = ::core::primitive::i128;
pub use implementation::mask;
#[test]
fn public_native_aliases_keep_the_same_fixed_size_sign_and_callable_interface() {
    let left: Word = 85;
    let right: Word = 51;
    let value: Word = mask(left, right);
    assert_eq!(value, 119);
    let largest: Wide = u128::MAX;
    let smallest: Signed = i128::MIN;
    assert_eq!(largest, 340282366920938463463374607431768211455_u128);
    assert_eq!(smallest, -170141183460469231731687303715884105728_i128);
    assert_eq!(std::mem::size_of::<Word>(), 1);
    assert_eq!(std::mem::size_of::<Wide>(), 16);
}
