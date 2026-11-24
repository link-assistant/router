//! `cargo +nightly fuzz run sse_stream_translators` (issue #670). See `../harness.rs`.

#![no_main]

include!("../harness.rs");

libfuzzer_sys::fuzz_target!(|data: &[u8]| sse_stream_translators(data));
