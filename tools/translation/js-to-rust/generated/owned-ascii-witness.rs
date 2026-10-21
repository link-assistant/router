// GENERATED: actual checked reverse ASCII receiving witness.
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
pub fn accepted(value: &crate::translation_core::Str, alphabet: &crate::translation_core::Str) -> bool {
    return { let __ro_arg_0 = value; let __ro_arg_1 = alphabet; crate::translation_core::ascii_chars_in(__ro_arg_0, __ro_arg_1) };
}

#[must_use]
#[rustfmt::skip]
pub fn hexadecimal(value: &crate::translation_core::Str) -> bool {
    let alphabet = "0123456789ABCDEFabcdef";
    return { let __ro_arg_2 = value; let __ro_arg_3 = alphabet; crate::translation_core::ascii_chars_in(__ro_arg_2, __ro_arg_3) };
}

#[must_use]
#[rustfmt::skip]
pub fn lazy(value: &crate::translation_core::Str, alphabet: &crate::translation_core::Str, yes: bool) -> bool {
    return (yes && { let __ro_arg_4 = value; let __ro_arg_5 = alphabet; crate::translation_core::ascii_chars_in(__ro_arg_4, __ro_arg_5) });
}

#[must_use]
#[rustfmt::skip]
pub fn guard<'a>(value: &'a crate::translation_core::Str, alphabet: &crate::translation_core::Str) -> &'a crate::translation_core::Str {
    if { let __ro_arg_6 = value; let __ro_arg_7 = alphabet; crate::translation_core::ascii_chars_in(__ro_arg_6, __ro_arg_7) } {
        return value;
    } else {
        return "";
    }
}
