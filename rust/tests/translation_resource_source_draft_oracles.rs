//! Independently written native expectations. Existing CI discovers this test
//! only after the complete same-SHA JavaScript gate. Never run locally for #759.
mod translation_core {
    pub type Json = serde_json::Value;
}

#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-shared-iteration-oracle.rs"]
mod shared_iteration;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-captures-oracle.rs"]
mod captures;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-owned-signatures-oracle.rs"]
mod owned_signatures;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-filesystem-oracle.rs"]
mod filesystem;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-bytes-oracle.rs"]
mod octets;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-result-fallbacks-oracle.rs"]
mod result_fallbacks;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-option-loops-oracle.rs"]
mod option_loops;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-outcome-callbacks-oracle.rs"]
mod outcome_callbacks;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-option-callbacks-oracle.rs"]
mod option_callbacks;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-cold-return-types-oracle.rs"]
mod cold_return_types;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-do-loops-oracle.rs"]
mod do_loops;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-conditional-values-oracle.rs"]
mod conditional_values;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-boolean-values-oracle.rs"]
mod boolean_values;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-list-literals-oracle.rs"]
mod list_literals;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-signed-numbers-oracle.rs"]
mod signed_numbers;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-lexical-scopes-oracle.rs"]
mod lexical_scopes;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-for-headers-oracle.rs"]
mod for_headers;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-text-equality-oracle.rs"]
mod text_equality;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-switches-oracle.rs"]
mod switches;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-generic-identity-oracle.rs"]
mod generic_identity;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-generic-linear-oracle.rs"]
mod generic_linear;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-container-guards-oracle.rs"]
mod container_guards;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-nested-guards-oracle.rs"]
mod nested_guards;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-pure-deadlines-oracle.rs"]
mod pure_deadlines;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-cancellable-deadlines-oracle.rs"]
mod cancellable_deadlines;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-explicit-deadlines-oracle.rs"]
mod explicit_deadlines;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-call-grouping-oracle.rs"]
mod call_grouping;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-byte-literals-oracle.rs"]
mod byte_literals;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-native-bindings-oracle.rs"]
mod native_bindings;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-native-local-types-oracle.rs"]
mod native_local_types;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-native-control-oracle.rs"]
mod native_control;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-native-option-patterns-oracle.rs"]
mod native_option_patterns;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-native-unit-oracle.rs"]
mod native_unit;
#[path = "../../tools/translation/js-to-rust/test/fixtures/http-resource-native-option-match-oracle.rs"]
mod native_option_match;
