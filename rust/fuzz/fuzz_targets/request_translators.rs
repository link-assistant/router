//! `cargo +nightly fuzz run request_translators` (issue #670). See `../harness.rs`.

#![no_main]

include!("../harness.rs");

libfuzzer_sys::fuzz_target!(|data: &[u8]| request_translators(data));
