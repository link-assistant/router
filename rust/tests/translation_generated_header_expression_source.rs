// Independent native source oracle. UNRUN; CI only after all same-SHA JS gates.
#[doc = concat!("Packet ", "documentation.")]
#[repr(C)]
struct Packet(u64);
impl Packet {
    #[doc = stringify!(get packet value)]
    fn get(&self) -> u64 { self.0 }
}
#[test]
fn documentation_expression_macros_preserve_native_layout_and_member_behavior() {
    assert_eq!(std::mem::size_of::<Packet>(), std::mem::size_of::<u64>());
    assert_eq!(Packet(7).get(), 7);
    assert_eq!(concat!("Packet ", "documentation."), "Packet documentation.");
    assert_eq!(stringify!(get packet value), "get packet value");
}
