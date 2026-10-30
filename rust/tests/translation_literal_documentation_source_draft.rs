//! Independent actual Rust doc-comment token payload oracle. Gated CI only.
macro_rules! doc_data {
    (#[doc = $value:literal]) => { $value };
    (#![doc = $value:literal]) => { $value };
    () => { "" };
}
const OUTER: &str = doc_data! {
    /// original "quote" \ α😀
};
const INNER: &str = doc_data! {
    //! inner α😀
};
const ORDINARY: &str = doc_data! {
    //// ordinary comment
};
const EXPLICIT: &str = doc_data!(#[doc = " original \"quote\" \\ α😀"]);
#[test]
fn actual_native_line_doc_style_and_content_match_literal_metadata_payloads() {
    assert_eq!(OUTER, " original \"quote\" \\ α😀");
    assert_eq!(INNER, " inner α😀");
    assert_eq!(ORDINARY, "");
    assert_eq!(OUTER, EXPLICIT);
}
