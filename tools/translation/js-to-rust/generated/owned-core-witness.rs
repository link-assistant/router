// GENERATED: actual checked reverse owned-core receiving witness.
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_domain(value: &crate::translation_core::Json) {
    fn visit(value: &crate::translation_core::Json, depth: usize, nodes: &mut usize) {
        *nodes += 1;
        assert!(*nodes <= 4096 && depth <= 32, "owned reverse JSON budget");
        match value {
            ::serde_json::Value::Array(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items { visit(item, depth + 1, nodes); }
            }
            ::serde_json::Value::Object(items) => {
                assert!(items.len() <= 4096, "owned reverse dense bound");
                for item in items.values() { visit(item, depth + 1, nodes); }
            }
            _ => {}
        }
    }
    visit(value, 0, &mut 0);
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_copy(value: &crate::translation_core::Json) -> crate::translation_core::Json {
    __ro_domain(value);
    crate::translation_core::json_copy(value)
}
#[allow(dead_code)]
#[rustfmt::skip]
fn __ro_with_field(base: &crate::translation_core::Json, key: &str, value: &crate::translation_core::Json) -> crate::translation_core::Json {
    let base = __ro_copy(base);
    let value = __ro_copy(value);
    assert!(base.is_null() || base.is_object(), "Owned JSON string-key update requires an object or null");
    let result = crate::translation_core::json_with_field(base, key, value);
    __ro_domain(&result);
    result
}

#[must_use]
#[rustfmt::skip]
pub fn copied(value: &crate::translation_core::Json) -> crate::translation_core::Json {
    return { let __ro_arg_0 = value; __ro_copy(__ro_arg_0) };
}

#[must_use]
#[rustfmt::skip]
pub fn nested(value: &crate::translation_core::Json) -> crate::translation_core::Json {
    let local = { let __ro_arg_1 = value; __ro_copy(__ro_arg_1) };
    let alias = __ro_copy(&local);
    return { let __ro_arg_2 = &local; let __ro_arg_3 = "nested"; let __ro_arg_4 = &alias; __ro_with_field(__ro_arg_2, __ro_arg_3, __ro_arg_4) };
}

#[must_use]
#[rustfmt::skip]
pub fn named(value: &crate::translation_core::Json) -> &crate::translation_core::Json {
    return { let __ro_arg_5 = value; let __ro_arg_6 = "name"; crate::translation_core::json_index_str(__ro_arg_5, __ro_arg_6) };
}
