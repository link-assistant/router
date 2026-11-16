//! Untranslated native lookup kernel for the unrestricted standard map view.
//! The collection and selected value have no entry/byte size restriction.

pub const BORROWED_MAP_LITERAL_LIMIT: usize = 64;

#[must_use]
pub fn borrowed_text_map_matches_literals(
    map: &::std::collections::BTreeMap<::std::string::String, ::std::string::String>,
    key: &str,
    literals: &[&str],
) -> bool {
    assert!(literals.len() <= BORROWED_MAP_LITERAL_LIMIT, "borrowed map literal count");
    map.get(key)
        .is_some_and(|value| literals.iter().any(|literal| value.as_str() == *literal))
}
