//! Independent native oracle SOURCE; execute only in gated CI, never locally.
#![doc = concat!("Inner documentation ", "keeps module behavior.")]

#[doc = include_str!("../../tools/translation/test/fixtures/attribute-expression-doc.md")]
struct Record;

trait Documented {
    #[doc = concat!("Trait ", "member documentation.")]
    fn selected(value: bool) -> bool;
}

impl Documented for Record {
    #[inline]
    #[doc = concat!("Impl ", "member documentation.")]
    fn selected(value: bool) -> bool {
        value
    }
}

mod nested {
    #![doc = include_str!("../../tools/translation/test/fixtures/attribute-expression-doc.md")]

    #[doc = concat!("Nested ", "documentation.")]
    pub fn selected(value: bool) -> bool {
        !value
    }
}

#[test]
fn documentation_expressions_preserve_module_and_trait_behavior() {
    for value in [false, true] {
        assert_eq!(<Record as Documented>::selected(value), value);
        assert_eq!(nested::selected(value), !value);
    }
}
