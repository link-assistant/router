// Independent native scoped-item oracle SOURCE. CI only after same-SHA JS gates.
#[test]
fn local_modules_traits_and_implementations_keep_their_native_scopes() {
    mod local {
        pub struct Holder { pub value: u8 }
        pub trait Select {
            type Item;
            const LIMIT: u8;
            fn choose(&self) -> Self::Item;
            fn bounded(&self) -> bool { Self::LIMIT == 7 }
        }
        impl Select for Holder {
            type Item = u8;
            const LIMIT: u8 = 7;
            fn choose(&self) -> Self::Item { self.value }
        }
        impl Holder { pub fn new(value: u8) -> Self { Self { value } } }
        mod deeper { pub const OFFSET: u8 = 2; }
        pub fn value() -> u8 {
            macro_rules! local_value { () => { deeper::OFFSET } }
            local_value!()
        }
    }
    use local::Select;
    let value = local::Holder::new(5);
    assert_eq!(value.choose(), 5);
    assert!(value.bounded());
    assert_eq!(local::value(), 2);
}
