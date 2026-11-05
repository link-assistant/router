// Native oracle SOURCE only. No local Rust invocation is authorized.
#![allow(dead_code, non_camel_case_types, unused_macros)]
#![doc = "Inner documentation remains a builtin attribute."]

struct doc;
struct macro_use;
struct allow;

macro_rules! documentation_value {
    () => { "The argument has its own macro lookup." };
}

#[macro_use]
mod provider {
    #![allow(dead_code)]
    #![doc = "Provider documentation."]

    macro_rules! from_provider {
        () => { true };
    }
}

#[doc = documentation_value!()]
#[doc(hidden)]
fn selected(value: bool) -> bool {
    value && from_provider!()
}

#[test]
fn bare_builtin_names_and_argument_macro_names_remain_separate() {
    assert!(selected(true));
    assert!(!selected(false));
}
