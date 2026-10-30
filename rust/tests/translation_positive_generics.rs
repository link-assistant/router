// Independent native oracle SOURCE. CI only after all same-SHA JavaScript gates.
fn identity<T>(value: T) -> T { value }
struct Count<const N: usize = 3>;
impl<const N: usize> Count<N> { fn value() -> usize { N } }
struct Settings<const ENABLED: bool = true, const OFFSET: i32 = -7, const CODE: char = 'Ω'>;
impl<const ENABLED: bool, const OFFSET: i32, const CODE: char> Settings<ENABLED, OFFSET, CODE> {
    fn values() -> (bool, i32, char) { (ENABLED, OFFSET, CODE) }
}

#[test]
fn generic_paths_and_const_arguments_preserve_nested_type_and_scalar_values() {
    assert_eq!(identity::<u8>(7), 7);
    assert_eq!(Count::<3>::value(), 3);
    assert_eq!(Count::<{ 1 + 2 }>::value(), 3);
    assert_eq!(Settings::<true, -7, 'Ω'>::values(), (true, -7, 'Ω'));
    assert_eq!(Settings::<false, -4, '🦀'>::values(), (false, -4, '🦀'));
    assert_eq!(std::mem::size_of::<[u8; 3]>(), 3);
    let values = Vec::<u8>::from([1, 2, 3]);
    assert_eq!(identity::<Vec<u8>>(values), [1, 2, 3]);
}
