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
