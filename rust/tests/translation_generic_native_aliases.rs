// Native oracle SOURCE, unrun locally. CI runs only after every JavaScript gate.
type Identity<T> = T;
type Earlier<T> = Identity<T>;
type Byte = Earlier<u8>;
type Wide = Earlier<u128>;
type Signed = Earlier<i128>;
fn byte_mask(left: Byte, right: Byte) -> Byte { left | right }
fn wide_mask(left: Wide, right: Wide) -> Wide { left | right }
fn signed_mask(left: Signed, right: Signed) -> Signed { left | right }
#[test]
fn generic_aliases_preserve_native_widths_and_signed_edges() {
    assert_eq!(byte_mask(85, 51), 119);
    assert_eq!(wide_mask(1_u128 << 127, 1), (1_u128 << 127) | 1);
    assert_eq!(signed_mask(i128::MIN, 1), i128::MIN + 1);
    assert_eq!(std::mem::size_of::<Byte>(), 1);
    assert_eq!(std::mem::size_of::<Wide>(), 16);
    assert_eq!(std::mem::size_of::<Signed>(), 16);
}
