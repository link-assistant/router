//! Actual native line documentation oracle SOURCE; unrun.
#![forbid(unsafe_code)]

/// Original "quote" \ α😀
macro_rules! chosen {
    ($name:ident) => {
        #[doc = "generated literal"]
        fn $name() -> u8 { 7 }
    };
}

chosen!(after);

/// Absent documentation belongs to the absent whole item.
#[cfg(any())]
compile_error!("the inactive item must not expand");

/// Outer function documentation.
#[cfg(all())]
fn selected() -> u8 { after() }

mod nested {
    //! Inner module documentation.
    /// Consecutive outer line one.
    /// Consecutive outer line two.
    pub fn value() -> u8 { 9 }
}

fn literal() -> &'static str { "/// literal" }

//// Ordinary four-slash comment.
/**/
/*** Ordinary block comment. */
#[test]
fn native_line_doc_attachment_preserves_values_and_macro_scope() {
    assert_eq!(selected(), 7);
    assert_eq!(nested::value(), 9);
    assert_eq!(literal(), "/// literal");
}
