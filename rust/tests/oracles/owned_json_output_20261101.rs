//! Independent owned-Text/helper and shared-Json native oracle SOURCE, UNRUN.
//! Included through the generalized oracle in the existing dynamic binary.
//! Requires its exact String/backend profile and all eight same-SHA JS gates.
//! Shared Json custody here does not claim translated standard JSON readers,
//! Option callbacks, static indexing, token_report::row or general application parity.
use std::collections::BTreeMap;
use link_assistant_router::translation_core::{
    Json, Text, PersistentOutputContext, output_text_write, output_text_result,
};

// These whole functions are the independently authored native counterparts of
// the receiving fixture. The record is borrowed but deliberately not read.
fn row(_record: &Json, count: u64) -> Text {
    link_assistant_router::translation_core::format!("ROW={count};")
}
fn table(records: &[Json]) {
    for record in records {
        output_text_write(false,
            link_assistant_router::translation_core::format!("{}", row(record, 7_u64)));
    }
}
fn leaf(n: u64) -> Text {
    link_assistant_router::translation_core::format!("N={n};")
}
fn render(n: u64) -> Text { leaf(n) }
fn render_output(n: u64) {
    output_text_write(false, link_assistant_router::translation_core::format!("{}", render(n)));
}

#[test]
fn two_shared_records_produce_two_ordered_owned_results_and_empty_input_produces_none() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    let records = [Json::Null, serde_json::json!({"label": "東京{}"})];
    context.scope(|| table(&records));
    assert_eq!(context.snapshot(), ("ROW=7;ROW=7;".into(), String::new()));
    // No move, mutation or fabricated borrowed return is part of this profile.
    assert_eq!(records[0], Json::Null);
    assert_eq!(records[1], serde_json::json!({"label": "東京{}"}));
    let empty = PersistentOutputContext::new(BTreeMap::new());
    empty.scope(|| table(&[]));
    assert_eq!(empty.snapshot(), (String::new(), String::new()));
}

#[test]
fn nested_copy_argument_and_owned_string_helper_return_emit_exactly_once() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| render_output(9));
    assert_eq!(context.snapshot(), ("N=9;".into(), String::new()));
    assert_eq!(render(0), "N=0;");
    assert_eq!(render(u64::MAX), "N=18446744073709551615;");
}

#[test]
fn actual_accounts_header_matches_independent_literal_columns_and_caller_newline() {
    // Literal padding is independent of the product formatter, not generated
    // by calling it to create an expected table. This calls the actual owner.
    let expected = concat!(
        "name            ", "  ", "healthy ", "  ", "credential  ", "  ",
        "used  ", "  ", "limit    ", "  ", "remaining", "  home"
    );
    let heading = link_assistant_router::accounts_cli::header();
    assert_eq!(heading, expected);
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| output_text_write(false,
        link_assistant_router::translation_core::format!("{}\n",
            link_assistant_router::accounts_cli::header())));
    assert_eq!(context.snapshot(), (String::from(expected) + "\n", String::new()));
}

#[test]
fn real_string_drop_clone_and_mutation_do_not_implicitly_write_a_formatted_result() {
    assert!(std::mem::needs_drop::<Text>());
    let context = PersistentOutputContext::new(BTreeMap::new());
    context.scope(|| {
        let mut original = row(&Json::Null, 3);
        let detached = original.clone();
        original.clear();
        assert_eq!(detached, "ROW=3;");
        assert_eq!(original, "");
        drop(detached);
        drop(original);
    });
    assert_eq!(context.snapshot(), (String::new(), String::new()));
    // Mutation is a native library baseline; no translated mutable String API
    // is admitted by this fixture or by its JS receiving cases.
}

#[test]
fn earlier_helper_output_survives_later_native_argument_failure() {
    let context = PersistentOutputContext::new(BTreeMap::new());
    let divisor = std::hint::black_box(0_u64);
    let failed = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| context.scope(|| {
        render_output(9);
        output_text_result(true, row(&Json::Null, 1_u64 / divisor));
    })));
    assert!(failed.is_err());
    assert_eq!(context.snapshot(), ("N=9;".into(), String::new()));
}

#[test]
fn unissued_standard_json_readers_have_native_baselines_without_a_translation_claim() {
    // These valid Rust library calls intentionally remain compiler refusals in
    // the current new JS profile until their original private issuer is added.
    assert!(Json::Null.is_null());
    assert!(!serde_json::json!({}).is_null());
    assert_eq!(serde_json::json!(true).as_bool(), Some(true));
    assert_eq!(serde_json::json!("λ").as_str(), Some("λ"));
    assert_eq!(serde_json::json!(18446744073709551615_u64).as_u64(), Some(u64::MAX));
    assert_eq!(serde_json::json!(-1).as_u64(), None);
}
