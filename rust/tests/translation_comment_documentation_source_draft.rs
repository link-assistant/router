/*! Actual native block documentation oracle SOURCE.
	Inner tab and Unicode α😀; /* nested comment */ exact content.
*/
#![forbid(unsafe_code)]

/** Original "quote" \ α😀
 * Multiline outer documentation.
 */
macro_rules! chosen {
    ($name:ident) => {
        /** Generated outer
         * exact content.
         */
        fn $name() -> u8 { 7 }
    };
}

chosen!(after);

mod nested {
    /*! Actual inner module documentation. */
    /** First outer doc. */
    /// Second outer doc.
    pub fn value() -> u8 { 9 }
}

/**/
/*** Ordinary block comment. */
#[test]
fn native_block_docs_preserve_original_macro_and_module_behavior() {
    assert_eq!(after(), 7);
    assert_eq!(nested::value(), 9);
}
