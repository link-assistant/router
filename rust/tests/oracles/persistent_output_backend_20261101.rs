//! Independent native oracle SOURCE, UNRUN. Requires the exact installed copied
//! persistent profile before inclusion by a CI native target. No current default
//! exports, builtin equivalence or cross-platform provider evidence is assumed.
use std::collections::BTreeMap;
use std::path::PathBuf;
use link_assistant_router::translation_core::{
    PersistentOutputContext, PersistentOutputOptions,
    persistent_run_launcher_operational_sync, persistent_run_launcher_sync,
    persistent_with_trace_writer, persistent_with_operational_writer,
    output_literal_write, output_literal_result, output_literal_passthrough,
};

fn directory(label: &str) -> PathBuf {
    std::env::temp_dir().join(format!("router-persistent-native-{}-{label}", std::process::id()))
}
fn options<'a>(path: &'a std::path::Path) -> PersistentOutputOptions<'a> {
    PersistentOutputOptions { data_directory: path, verbose: false, quiet: false,
        operation: "oracle", token: None, secrets: vec![], version: "fixture", source_commit: "UNRUN" }
}
#[test]
fn persistent_real_original_capture_routing_redaction_and_lossy_writer_drop() {
    let path = directory("capture");
    std::fs::create_dir_all(&path).unwrap();
    let context = PersistentOutputContext::new(BTreeMap::from([
        ("API_TOKEN".into(), "known-credential".into()),
    ]));
    let code = context.scope(|| persistent_run_launcher_operational_sync(&options(&path), || {
        output_literal_write(false, link_assistant_router::translation_core::literal_arguments!("Bearer abcdef secret=none\n"));
        output_literal_result(false, link_assistant_router::translation_core::literal_arguments!("result\n"));
        output_literal_passthrough(true, link_assistant_router::translation_core::literal_arguments!("pass\n"));
        persistent_with_trace_writer(|writer| { assert_eq!(writer.write(&[b'a', 0xff]), 2); writer.flush(); });
        persistent_with_operational_writer(|writer| { assert_eq!(writer.write(&[b'b', 0xff]), 2); writer.flush(); });
        0
    }));
    assert_eq!(code, 0);
    assert_eq!(context.snapshot(), ("result\n".into(), "Bearer [redacted] secret=[redacted]\npass\n".into()));
    let text = std::fs::read_to_string(path.join("launcher/launcher.log")).unwrap();
    let rows: Vec<serde_json::Value> = text.lines().map(|line| serde_json::from_str(line).unwrap()).collect();
    assert_eq!(rows.iter().map(|row| row["event"].as_str().unwrap()).collect::<Vec<_>>(),
        ["launch_started", "diagnostic", "trace", "launch_finished"]);
    assert_eq!(rows[1]["message"], "Bearer [redacted] secret=[redacted]");
    assert_eq!(rows[2]["message"], "a�");
    assert!(rows[0]["timestamp"].as_str().unwrap().ends_with("+00:00"));
    let operational = std::fs::read_to_string(path.join("logs/operational.log")).unwrap();
    assert!(operational.contains("process_start version=fixture source_commit=UNRUN operation=oracle"));
    assert!(operational.contains("b�"));
    assert!(operational.contains("process_exit exit_code=0 outcome=success"));
    assert!(!operational.contains("abcdef"));
    // Persistent native global retains its FILE; directory teardown is tested
    // in a separate receiving child after process exit, not guessed on Windows.
}
#[test]
fn launcher_nonzero_result_and_exact_native_exitcode_debug() {
    let path = directory("nonzero");
    let context = PersistentOutputContext::new(BTreeMap::new());
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options(&path), || Ok(7))), 7);
    let text = std::fs::read_to_string(path.join("launcher/launcher.log")).unwrap();
    let rows: Vec<serde_json::Value> = text.lines().map(|line| serde_json::from_str(line).unwrap()).collect();
    assert_eq!(rows.iter().map(|row| row["event"].as_str().unwrap()).collect::<Vec<_>>(),
        ["launch_started", "launch_failed", "launch_finished"]);
    assert_eq!(rows[1]["message"], format!("launcher exit status: {:?}", std::process::ExitCode::from(7)));
    std::fs::remove_dir_all(path).unwrap();
}
#[test]
fn launcher_error_returns_one_and_scoped_context_is_restored() {
    let path = directory("error");
    let context = PersistentOutputContext::new(BTreeMap::new());
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options(&path), || Err("failure".into()))), 1);
    assert_eq!(context.snapshot().1, "error: failure\n");
    assert!(std::fs::read_to_string(path.join("launcher/launcher.log")).unwrap().contains("launch_failed"));
    std::fs::remove_dir_all(path).unwrap();
}
#[cfg(unix)]
#[test]
fn actual_native_private_modes_and_launcher_symlink_refusal() {
    use std::os::unix::fs::{PermissionsExt, symlink};
    let path = directory("permissions");
    let context = PersistentOutputContext::new(BTreeMap::new());
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options(&path), || Ok(0))), 0);
    assert_eq!(std::fs::metadata(path.join("launcher")).unwrap().permissions().mode() & 0o777, 0o700);
    assert_eq!(std::fs::metadata(path.join("launcher/launcher.log")).unwrap().permissions().mode() & 0o777, 0o600);
    let bad = directory("symlink");std::fs::create_dir_all(&bad).unwrap();
    symlink(path.join("launcher"), bad.join("launcher")).unwrap();
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options(&bad), || panic!("must not enter work"))), 1);
    std::fs::remove_dir_all(bad).unwrap();std::fs::remove_dir_all(path).unwrap();
}

#[test]
fn actual_native_sanitizer_runs_all_independent_scanner_vectors() {
    let vectors: serde_json::Value = serde_json::from_str(include_str!(
        "../fixtures/persistent-credential-token-runs-20261101.json"
    )).unwrap();
    let rows = vectors["rows"].as_array().unwrap();
    assert_eq!(rows.len(), 17);
    let path = directory("scanner-vectors");
    let context = PersistentOutputContext::new(BTreeMap::new());
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options(&path), || {
        for row in rows {
            link_assistant_router::translation_core::persistent_record_launcher(
                "scanner_case", row["input"].as_str().unwrap()
            );
        }
        Ok(0)
    })), 0);
    let log = std::fs::read_to_string(path.join("launcher/launcher.log")).unwrap();
    let actual: Vec<serde_json::Value> = log.lines().map(|line| serde_json::from_str(line).unwrap())
        .filter(|row: &serde_json::Value| row["event"] == "scanner_case").collect();
    assert_eq!(actual.len(), rows.len());
    for (actual, expected) in actual.iter().zip(rows) {
        // Native launcher trims the record, independently of the pure scanner.
        assert_eq!(actual["message"], expected["expected"].as_str().unwrap().trim_end());
    }
    std::fs::remove_dir_all(path).unwrap();
}

#[test]
#[should_panic(expected = "Unicode context key ordering remains unqualified")]
fn unicode_context_keys_do_not_assume_js_utf16_native_osstring_order() {
    PersistentOutputContext::new(BTreeMap::from([("TÖKEN".into(), "value".into())]));
}
