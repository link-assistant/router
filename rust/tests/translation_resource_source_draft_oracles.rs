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
