//! Independent native control/multiple owned-Text output oracle SOURCE, UNRUN.
//! UNSCHEDULED until exact copied generalized profile is installed after all
//! eight same-SHA JS gates. Original native String Drop/backend are unchanged.
use std::collections::BTreeMap;
use link_assistant_router::translation_core::{Text, PersistentOutputContext,
    output_text_write, output_text_result, output_text_passthrough};
fn multiple(value: u64, label: &str) {
    output_text_write(false, link_assistant_router::translation_core::format!("BEGIN={label};"));
    if value > 0 { let message = link_assistant_router::translation_core::format!("POS={value};"); output_text_result(false, message); }
    else { output_text_result(true, link_assistant_router::translation_core::format!("ZERO;")); }
    output_text_passthrough(true, link_assistant_router::translation_core::format!("END={label};"));
}
fn ranged(limit: u64, label: &str) {
    for index in 0_u64..limit {
        if index == 1 { continue; }
        let value = link_assistant_router::translation_core::format!("ITER={index};");
        output_text_write(false, value);
        if index == 2 { break; }
    }
    output_text_result(false, link_assistant_router::translation_core::format!("DONE={label};"));
}
fn countdown(count: u64) {
    let mut left = count;
    while left > 0 {
        output_text_write(false, link_assistant_router::translation_core::format!("LEFT={left};"));
        left -= 1;
    }
    output_text_result(false, link_assistant_router::translation_core::format!("STOP;"));
}
fn early(stop: bool) {
    output_text_write(false, link_assistant_router::translation_core::format!("A;"));
    if stop { return; }
    output_text_write(false, link_assistant_router::translation_core::format!("B;"));
}
fn shadow(value: u64) {
    let value = value + 1;
    output_text_write(false, link_assistant_router::translation_core::format!("OUTER={value};"));
    if value > 0 { let value = value + 1; output_text_result(false, link_assistant_router::translation_core::format!("INNER={value};")); }
    output_text_write(false, link_assistant_router::translation_core::format!("OUTER_AGAIN={value};"));
}
fn exclusive(flag: bool) {
    let value = link_assistant_router::translation_core::format!("OWNED;");
    if flag { output_text_write(false, value); } else { output_text_result(true, value); }
}
#[test]
fn real_string_drop_and_actual_native_order_across_complete_control() {
    assert!(std::mem::needs_drop::<Text>());
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| { multiple(2, "東京{}"); ranged(5, "end"); countdown(3); early(true); shadow(1); exclusive(false); });
    assert_eq!(context.snapshot(), (
        "BEGIN=東京{};POS=2;ITER=0;ITER=2;DONE=end;LEFT=3;LEFT=2;LEFT=1;STOP;A;OUTER=2;INNER=3;OUTER_AGAIN=2;".into(),
        "END=東京{};OWNED;".into(),
    ));
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| { multiple(0, "é"); ranged(0, "empty"); early(false); exclusive(true); });
    assert_eq!(context.snapshot(), ("BEGIN=é;DONE=empty;A;B;OWNED;".into(), "ZERO;END=é;".into()));
}
#[test]
fn later_formatter_failure_preserves_prior_records_and_eager_allocation_boundary() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    let divisor = std::hint::black_box(0_u8);
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| context.scope(|| {
        output_text_write(false, link_assistant_router::translation_core::format!("BEFORE;"));
        output_text_write(true, link_assistant_router::translation_core::format!("AFTER={}", 1_u8 / divisor));
    })));
    assert!(result.is_err());
    assert_eq!(context.snapshot(), ("BEFORE;".into(), String::new()));
}
#[test]
fn independently_changed_native_loop_format_reproduces_literal_braces() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| { for index in 0_u64..3_u64 { if index == 1 { continue; } output_text_write(false, link_assistant_router::translation_core::format!("INDEX{{}}={index};")); } });
    assert_eq!(context.snapshot(), ("INDEX{}=0;INDEX{}=2;".into(), String::new()));
}
#[test]
fn real_launcher_capture_does_not_become_a_generic_console_transport() {
    use link_assistant_router::translation_core::{PersistentOutputOptions, persistent_run_launcher_sync};
    let directory = std::env::temp_dir().join(format!("router-generalized-native-{}", std::process::id()));
    let options = PersistentOutputOptions { data_directory: &directory, verbose: false,
        quiet: true, operation: "generalized", token: None, secrets: vec![],
        version: "fixture", source_commit: "UNRUN" };
    let context = PersistentOutputContext::new(BTreeMap::new());
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options, || { multiple(2, "x"); ranged(3, "z"); Ok(0) })), 0);
    assert_eq!(context.snapshot(), ("POS=2;DONE=z;".into(), "BEGIN=x;END=x;ITER=0;ITER=2;".into()));
    let rows: Vec<serde_json::Value> = std::fs::read_to_string(directory.join("launcher/launcher.log")).unwrap()
        .lines().map(|line| serde_json::from_str(line).unwrap()).collect();
    assert_eq!(rows.iter().map(|row| row["event"].as_str().unwrap()).collect::<Vec<_>>(),
        ["launch_started", "diagnostic", "diagnostic", "diagnostic", "launch_finished"]);
    assert_eq!(rows[1]["message"], "BEGIN=x;");
    assert_eq!(rows[2]["message"], "ITER=0;");
    assert_eq!(rows[3]["message"], "ITER=2;");
    std::fs::remove_dir_all(directory).unwrap();
}
