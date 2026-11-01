//! Independent native routing/memory oracle SOURCE; all execution UNRUN.
//! This checks the actual new explicit backend model, not persistent host log
//! locking/redaction/rotation parity or an installed canonical facade.
#[path = "../src/translation_core/output_literal_core_20261101_routing.rs"]
mod routing;
#[path = "../src/translation_core/literal_arguments_core_20261101.rs"]
mod literal;
use routing::{MemoryBackend, MemoryOptions, Mode, route};
fn options() -> MemoryOptions {
    MemoryOptions { capture_active: false, capture_terminal: false,
        operation_active: true, file_diagnostics: None, transport_error: false }
}
#[test]
fn complete_channel_capture_quiet_result_and_passthrough_matrix() {
    for mode in [Mode::Write, Mode::Result, Mode::Passthrough] {
        for stderr in [false, true] {
            for quiet in [None, Some(false), Some(true)] {
                for context in [false, true] {
                    let backend = MemoryBackend::new(MemoryOptions {
                        file_diagnostics: quiet, operation_active: context, ..options()
                    });
                    let value = literal::__literal_arguments_from_static(&["é{}\n"]);
                    route(&backend, mode, stderr, format_args!("{value}"));
                    let actual = backend.snapshot();
                    let mut kinds = Vec::new();
                    if mode == Mode::Write { kinds.push("capture-probe"); }
                    if mode == Mode::Write && stderr && quiet.is_some() { kinds.push("diagnostic"); }
                    if context { kinds.push("context"); }
                    else if !(mode == Mode::Write && stderr && quiet == Some(true)) { kinds.push("process"); }
                    assert_eq!(actual.events.iter().map(|event| event.kind).collect::<Vec<_>>(), kinds);
                    assert_eq!(actual.stdout, if context && !stderr { "é{}\n" } else { "" });
                    assert_eq!(actual.stderr, if context && stderr { "é{}\n" } else { "" });
                }
            }
        }
    }
}
#[test]
fn capture_precedes_diagnostics_and_mirrors_original_channel_as_stderr() {
    for terminal in [false, true] {
        for context in [false, true] {
            let backend = MemoryBackend::new(MemoryOptions { capture_active: true,
                capture_terminal: terminal, operation_active: context,
                file_diagnostics: Some(true), ..options() });
            route(&backend, Mode::Write, false, format_args!("literal\r\n"));
            let actual = backend.snapshot();
            let mut kinds = vec!["capture-probe", "capture-record"];
            if terminal || context { kinds.push(if context { "context" } else { "process" }); }
            assert_eq!(actual.events.iter().map(|event| event.kind).collect::<Vec<_>>(), kinds);
            assert_eq!(actual.stdout, "");
            assert_eq!(actual.stderr, if context { "literal\r\n" } else { "" });
        }
    }
}
#[test]
fn unicode_raw_braces_empty_newline_and_ignored_transport_errors() {
    let backend = MemoryBackend::new(options());
    for value in ["", "{}", "é東京😀", "\n", "\r\n", "\0"] {
        route(&backend, Mode::Write, false, format_args!("{value}"));
    }
    assert_eq!(backend.snapshot().stdout, "{}é東京😀\n\r\n\0");
    let failing = MemoryBackend::new(MemoryOptions { operation_active: false,
        transport_error: true, ..options() });
    route(&failing, Mode::Result, true, format_args!("result"));
    assert_eq!(failing.snapshot().events[0].kind, "process");
}
#[test]
fn explicit_backend_borrow_has_no_ambient_inheritance_and_unwind_changes_no_other_owner() {
    let outer = MemoryBackend::new(options());
    let inner = MemoryBackend::new(options());
    let failure = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        route(&inner, Mode::Write, false, format_args!("inner"));
        panic!("exact backend panic");
    }));
    assert!(failure.is_err());
    route(&outer, Mode::Write, false, format_args!("outer"));
    assert_eq!(outer.snapshot().stdout, "outer");
    assert_eq!(inner.snapshot().stdout, "inner");
    std::thread::spawn(|| {
        let child = MemoryBackend::new(options());
        assert!(child.snapshot().events.is_empty());
    }).join().unwrap();
}
#[test]
#[should_panic(expected = "owned memory event/UTF8 envelope")]
fn complete_event_occurrence_cap_is_preserved() {
    let backend = MemoryBackend::new(options());
    for _ in 0..2049 { route(&backend, Mode::Write, false, format_args!("")); }
}
