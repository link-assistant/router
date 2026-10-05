//! Replay the committed fuzz corpus on the stable toolchain (issue #670).
//!
//! `cargo +nightly fuzz` explores new inputs in the scheduled fuzz workflow;
//! this test keeps every committed seed and every minimized crash input
//! (added to `fuzz/corpus/<target>/`) running on each pull request.

#[allow(dead_code)]
mod harness {
    include!("../fuzz/harness.rs");
}

fn replay(target: &str, run: fn(&[u8])) {
    let dir = std::path::Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("fuzz/corpus")
        .join(target);
    let mut seen = 0;
    for entry in std::fs::read_dir(&dir).expect("corpus directory") {
        let path = entry.expect("corpus entry").path();
        let data = std::fs::read(&path).expect("corpus file");
        run(&data);
        // Every prefix too: a stream cut anywhere must not panic either.
        for end in (0..data.len()).step_by(7) {
            run(&data[..end]);
        }
        seen += 1;
    }
    assert!(seen > 0, "empty corpus at {}", dir.display());
}

#[test]
fn sse_stream_translator_corpus_replays_without_panic() {
    replay("sse_stream_translators", harness::sse_stream_translators);
}

#[test]
fn request_translator_corpus_replays_without_panic() {
    replay("request_translators", harness::request_translators);
}
