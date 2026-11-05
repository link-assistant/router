// Independent native qualified type oracle SOURCE. CI after all same-SHA JS gates.
#[test]
fn associated_qualified_paths_and_higher_ranked_callbacks_keep_native_types() {
    trait Owner {
        type Output;
        fn make(value: u8) -> Self::Output;
    }
    struct Marker;
    impl Owner for Marker {
        type Output = u8;
        fn make(value: u8) -> Self::Output { value }
    }
    fn selected<T: Owner<Output = u8>>(value: u8) -> <T as Owner>::Output {
        <T as Owner>::make(value)
    }
    fn apply<F>(callback: F, value: &str) -> &str
    where F: for<'a> Fn(&'a str) -> &'a str {
        callback(value)
    }
    fn identity(value: &str) -> &str { value }
    let pointer: for<'a> fn(&'a str) -> &'a str = identity;
    assert_eq!(selected::<Marker>(7), 7);
    assert_eq!(apply(pointer, "source"), "source");
}
