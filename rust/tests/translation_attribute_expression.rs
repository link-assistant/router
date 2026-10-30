//! Native documentation-expression oracle SOURCE. CI only after same-SHA JS.

#[doc = include_str!(
    "../../tools/translation/test/fixtures/attribute-expression-doc.md"
)]
fn documented_identity(value: bool) -> bool {
    value
}

#[doc = concat!("A ", "documented native type.")]
struct Documented;

impl Documented {
    #[doc = concat!(
        "Member documentation: ",
        include_str!("../../tools/translation/test/fixtures/attribute-expression-doc.md")
    )]
    fn identity(value: bool) -> bool {
        value
    }
}

#[test]
fn original_macro_valued_docs_keep_root_and_member_behavior() {
    let _documented = Documented;
    for value in [false, true] {
        assert_eq!(documented_identity(value), value);
        assert_eq!(Documented::identity(value), value);
    }
}
