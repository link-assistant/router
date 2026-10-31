// Independent source-only native oracle; no local Rust execution authorized.
use link_assistant_router::translation_primitive_vectors_core as vector;
mod helpers {
    use super::vector;
    pub fn seed(value: u8) -> Vec<u8> { vector::vec_u8_push(vector::vec_u8_new(), value) }
    pub fn bounded(values: Vec<u8>) -> Vec<u8> { vector::vec_u8_truncate(values, u64::MAX) }
    pub fn count(values: &Vec<u8>) -> u64 { let _checked = vector::vec_u8_len(values); vector::vec_u8_len(values) }
}
mod bridge { pub use super::helpers::seed as forwarded; }
#[test]
fn separate_modules_preserve_owned_values_shared_argument_duration_and_alias_targets() {
    for value in [0_u8, 255_u8] {
        let mut values = helpers::seed(value);
        values = vector::vec_u8_push(values, value);
        assert_eq!(values, vec![value, value]);
        assert_eq!(helpers::count(&values), 2);
        assert_eq!(helpers::bounded(values), vec![value, value]);
        assert_eq!(bridge::forwarded(value), vec![value]);
    }
}
