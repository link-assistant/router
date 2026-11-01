//! Independent native owned Text/primitive output oracle SOURCE, UNRUN.
//! Requires exact installed dynamic copied profile and post-8-JS native CI
//! scheduling. It is not included by unchanged default policy targets.
use std::collections::BTreeMap;
use link_assistant_router::translation_core::{
    Text, PersistentOutputContext, output_text_write, output_text_result,
    output_text_passthrough,
};
fn describe(count: u64, enabled: bool, label: &str) {
    output_text_write(false, link_assistant_router::translation_core::format!(
        "COUNT={count} ok={enabled} {label}\n"
    ));
}
fn local(value: &str) {
    let text = link_assistant_router::translation_core::format!("text={value}\n");
    output_text_result(false, text);
}
fn padded(value: &str, number: u64) {
    output_text_passthrough(true, link_assistant_router::translation_core::format!(
        "|{value:界^7.3}|{number:#06x}|"
    ));
}
#[test]
fn standard_string_is_real_drop_and_owned_transport_preserves_primitive_unicode_values() {
    assert!(std::mem::needs_drop::<Text>());
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| { describe(7, true, "é東京😀"); local("value{}"); padded("é東京😀", 42); });
    assert_eq!(context.snapshot(), (
        "COUNT=7 ok=true é東京😀\ntext=value{}\n".into(),
        "|界界é東京界界|0x002a|".into(),
    ));
}
#[test]
fn actual_native_edited_argument_and_template_are_semantic_changes() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| {
        output_text_write(true, link_assistant_router::translation_core::format!("VALUE={}", 8_u64));
        output_text_write(false, link_assistant_router::translation_core::format!("TOTAL{{}}={} ok={} {}\n", 9_u64, true, "x"));
    });
    assert_eq!(context.snapshot(), ("TOTAL{}=9 ok=true x\n".into(), "VALUE=8".into()));
}
fn order(value: u8, first: u8, second: u8) {
    output_text_write(true, link_assistant_router::translation_core::format!(
        "{} {}", value / first, value % second
    ));
}
fn panic_text(value: Box<dyn std::any::Any + Send>) -> String {
    if let Some(text) = value.downcast_ref::<&str>() { (*text).to_string() }
    else if let Some(text) = value.downcast_ref::<String>() { text.clone() }
    else { panic!("independent actual native panic text required") }
}
#[test]
fn left_to_right_argument_failure_precedes_output_and_uses_real_native_panic() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    let error = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| context.scope(|| order(1, 0, 0)))).unwrap_err();
    assert!(panic_text(error).contains("divide by zero"));
    assert_eq!(context.snapshot(), (String::new(), String::new()));
    // A succeeding first operand exposes the DIFFERENT second failure, proving
    // the two argument expressions were neither duplicated nor reordered.
    let error = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| context.scope(|| order(1, 1, 0)))).unwrap_err();
    assert!(panic_text(error).contains("remainder"));
    assert_eq!(context.snapshot(), (String::new(), String::new()));
}
#[test]
fn exact_utf8_owned_boundary_is_checked_before_any_output_route() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| output_text_result(false, "😀".repeat(524288)));
    assert_eq!(context.snapshot().0.len(), 2097152);
    let refused = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| context.scope(|| {
        output_text_result(false, "😀".repeat(524289));
    })));
    assert!(refused.is_err());
    assert_eq!(context.snapshot().0.len(), 2097152);
}
#[test]
fn launcher_captures_eager_text_before_normal_channel_dispatch() {
    use link_assistant_router::translation_core::{PersistentOutputOptions, persistent_run_launcher_sync};
    let directory = std::env::temp_dir().join(format!("router-dynamic-native-{}", std::process::id()));
    let options = PersistentOutputOptions { data_directory: &directory, verbose: false,
        quiet: true, operation: "dynamic", token: None, secrets: vec![],
        version: "fixture", source_commit: "UNRUN" };
    let context = PersistentOutputContext::new(BTreeMap::new());
    assert_eq!(context.scope(|| persistent_run_launcher_sync(&options, || {
        describe(3, false, "x");
        output_text_result(false, "RESULT\n".to_owned());
        output_text_passthrough(true, "PASS\n".to_owned());
        Ok(0)
    })), 0);
    assert_eq!(context.snapshot(), ("RESULT\n".into(), "COUNT=3 ok=false x\nPASS\n".into()));
    let rows: Vec<serde_json::Value> = std::fs::read_to_string(directory.join("launcher/launcher.log")).unwrap()
        .lines().map(|line| serde_json::from_str(line).unwrap()).collect();
    assert_eq!(rows.iter().map(|row| row["event"].as_str().unwrap()).collect::<Vec<_>>(),
        ["launch_started", "diagnostic", "launch_finished"]);
    assert_eq!(rows[1]["message"], "COUNT=3 ok=false x");
    std::fs::remove_dir_all(directory).unwrap();
}

#[test]
#[allow(non_snake_case)]
fn source_parameter_names_do_not_change_actual_primitive_formatter() {
    fn hygienic(String: &str, Math: u64) {
        output_text_write(false, link_assistant_router::translation_core::format!("{String}:{Math}"));
    }
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| hygienic("shadow", 2));
    assert_eq!(context.snapshot().0, "shadow:2");
}
