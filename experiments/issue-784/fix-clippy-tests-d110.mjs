#!/usr/bin/env node
// Applies the repairs for the clippy findings on test targets in run
// 43532139435 (Lint job 132255591200, Rust 1.98.1, pedantic + nursery,
// -D warnings). Policy:
//   * oracle shapes that ARE the behavior under test (explicit `if let`,
//     `let ... else { return None }`, eager `unwrap_or(call())`, raw strings
//     parsed by JavaScript tools, generated witnesses, path-included sources)
//     get scoped `allow`s with a reason;
//   * incidental code gets a genuine fix (`&raw const` pointer witnesses,
//     separators in long literals, `u64::try_from`, bit-exact float compare).
// Each replacement must match exactly once; any other count aborts before a
// file is written. Run from the repository root.
import { readFileSync, writeFileSync } from 'node:fs';

const T = 'rust/tests/';
const edits = {
  [`${T}translation_core_json_collections_oracle.rs`]: [
    ['#[allow(clippy::manual_unwrap_or)] // Compare the explicit adopted branch with unwrap_or.',
      `// Compare the explicit adopted branches with the Option combinators.
#[allow(clippy::manual_unwrap_or, clippy::option_if_let_else)]`],
    [`#[test]
fn unwrap_default_evaluates_after_subject_even_for_some() {`,
      `#[test]
#[allow(clippy::or_fun_call)] // The eager default call is the behavior under test.
fn unwrap_default_evaluates_after_subject_even_for_some() {`],
  ],
  [`${T}translation_core_json_updates_oracle.rs`]: [
    ['fn original_shared_child(value: &Json) -> Json {',
      `#[allow(clippy::option_if_let_else)] // Keep the original explicit branch shape.
fn original_shared_child(value: &Json) -> Json {`],
    ['fn adopted_shared_child(value: &Json) -> Json {',
      `#[allow(clippy::option_if_let_else)] // Keep the adopted explicit branch shape.
fn adopted_shared_child(value: &Json) -> Json {`],
  ],
  [`${T}translation_namespace_source_oracles.rs`]: [
    ['mod literal_include {\n',
      `// The included fixture is translation input and stays byte-for-byte unchanged.
#[allow(clippy::missing_const_for_fn)]
mod literal_include {\n`],
  ],
  [`${T}translation_core_formatting_oracle.rs`]: [
    [`#[test]
fn compatibility_primitive_format_cases() {`,
      `#[test]
#[allow(clippy::needless_raw_string_hashes)] // A hashed raw format string is a case.
fn compatibility_primitive_format_cases() {`],
  ],
  [`${T}translation_core_json_reader_loans_oracle.rs`]: [
    ['fn optional(input: Maybe<&Json>) -> Maybe<Json> {',
      `#[allow(clippy::question_mark)] // The let-else early returns are the pattern under test.
fn optional(input: Maybe<&Json>) -> Maybe<Json> {`],
    ['fn branched(left: &Json, right: &Json, flag: bool) -> Maybe<Json> {',
      `#[allow(clippy::question_mark)] // The let-else early return is the pattern under test.
fn branched(left: &Json, right: &Json, flag: bool) -> Maybe<Json> {`],
    ['assert!(std::ptr::eq(value, &input["data"]));', 'assert!(std::ptr::eq(value, &raw const input["data"]));'],
    [`        returned(&input, "keep").unwrap(),
        &input["keep"]
`, `        returned(&input, "keep").unwrap(),
        &raw const input["keep"]
`],
  ],
  [`${T}callback_option_try_oracle.rs`]: [
    [`//! certify a translator's Try/FromResidual ownership or continuation lowering.
`,
      `//! certify a translator's Try/FromResidual ownership or continuation lowering.

// Each \`?\` case is compared with its hand-expanded \`match\`/\`if let\` form, and
// the callbacks keep their Option signatures, so these shapes stay as written.
#![allow(
    clippy::iter_on_single_items,
    clippy::manual_let_else,
    clippy::option_if_let_else,
    clippy::question_mark,
    clippy::unnecessary_wraps
)]
`],
  ],
  [`${T}translation_borrowed_json_let_else_oracle.rs`]: [
    [`//! Shared JSON let-else behavior oracle. CI only; unrun locally for issue #759.
`,
      `//! Shared JSON let-else behavior oracle. CI only; unrun locally for issue #759.

// The let-else early returns and the Result-returning constructors are the
// translated shapes under test, so they stay as written.
#![allow(
    clippy::items_after_statements,
    clippy::missing_const_for_fn,
    clippy::question_mark,
    clippy::unnecessary_wraps
)]
`],
    // A separate binding keeps the call within rustfmt's single-line width.
    ['    assert!(std::ptr::eq(selected(&body).unwrap(), &body["x"]));\n',
      '    let expected = &raw const body["x"];\n    assert!(std::ptr::eq(selected(&body).unwrap(), expected));\n'],
  ],
  [`${T}option_ok_or_translation_test.rs`]: [
    [`#[test]
fn ok_or_evaluates_receiver_then_error_once_even_for_some() {`,
      `#[test]
#[allow(clippy::or_fun_call)] // The eager error call is the behavior under test.
fn ok_or_evaluates_receiver_then_error_once_even_for_some() {`],
    [`        #[allow(
            clippy::manual_ok_or,
            reason = "independent match oracle for the eager method"
        )]`,
      `        #[allow(
            clippy::manual_ok_or,
            clippy::option_if_let_else,
            reason = "independent match oracle for the eager method"
        )]`],
    [`#[test]
fn ok_or_does_not_defer_or_replace_the_eager_panic_payload() {`,
      `#[test]
#[allow(clippy::or_fun_call)] // The eager panicking error call is the behavior under test.
fn ok_or_does_not_defer_or_replace_the_eager_panic_payload() {`],
  ],
  [`${T}translation_core_json_update_lexical_oracle.rs`]: [
    ['#[allow(clippy::nonminimal_bool)] // Preserve the original logical interpolation syntax.',
      `// Preserve the original logical interpolation and raw-string key syntax.
#[allow(clippy::nonminimal_bool, clippy::needless_raw_string_hashes)]`],
  ],
  [`${T}json_edit_candidate.rs`]: [
    [`#[path = "../src/translation_core/json_edit_candidate.rs"]
mod json_edit_candidate;`,
      `// The shared candidate source is translation input; keep its signatures as written.
#[allow(clippy::missing_const_for_fn)]
#[path = "../src/translation_core/json_edit_candidate.rs"]
mod json_edit_candidate;`],
  ],
  [`${T}json_remove_library_candidate.rs`]: [
    [`#[path = "../src/translation_core/json_edit_candidate.rs"]
mod json_edit_candidate;`,
      `// The shared candidate source is translation input; keep its signatures as written.
#[allow(clippy::missing_const_for_fn)]
#[path = "../src/translation_core/json_edit_candidate.rs"]
mod json_edit_candidate;`],
  ],
  [`${T}translation_core_primitives_oracle.rs`]: [
    [`//! These native tests do not claim that named lifetime syntax is translated.
`,
      `//! These native tests do not claim that named lifetime syntax is translated.

// The borrowed-text signatures, including the explicit named lifetime, are the
// shapes under test.
#![allow(clippy::missing_const_for_fn, clippy::needless_lifetimes)]
`],
  ],
  [`${T}translation_option_reference_payloads_oracle.rs`]: [
    [`#[test]
fn references_copy_without_copying_or_dropping_the_owned_string_record() {`,
      `#[test]
#[allow(clippy::or_fun_call)] // The eager fallback call is the behavior under test.
fn references_copy_without_copying_or_dropping_the_owned_string_record() {`],
    // A reference binding is no borrow expression, so the coercion stays implicit.
    [`        assert!(std::ptr::eq(
            eager,
            if input.is_some() { &first } else { &fallback }
        ));
`,
      `        let expected = if input.is_some() { &first } else { &fallback };
        assert!(std::ptr::eq(eager, expected));
`],
    [`    #[allow(clippy::unnecessary_lazy_evaluations)] // Keep the lazy Option body under test.
    fn nested(`,
      `    // Keep the lazy Option body and the nested Option payload under test.
    #[allow(clippy::unnecessary_lazy_evaluations, clippy::option_option)]
    fn nested(`],
    [`        nested(Some(Some(&owner))).unwrap().unwrap(),
        &owner
`,
      `        nested(Some(Some(&owner))).unwrap().unwrap(),
        &raw const owner
`],
    [`        contextual(Some(&owner)).unwrap().unwrap(),
        &owner
`,
      `        contextual(Some(&owner)).unwrap().unwrap(),
        &raw const owner
`],
    ['assert!(std::ptr::eq(found, &value["key"]));', 'assert!(std::ptr::eq(found, &raw const value["key"]));'],
  ],
  [`${T}translation_core_json_indices_oracle.rs`]: [
    [`        &value["猫😀"],\n`, `        &raw const value["猫😀"],\n`],
    [`        &value[1],\n`, `        &raw const value[1],\n`],
    [`        &map["nested"],\n`, `        &raw const map["nested"],\n`],
    ['assert!(std::ptr::eq(borrowed, &value["key"]));', 'assert!(std::ptr::eq(borrowed, &raw const value["key"]));'],
  ],
  [`${T}translation_core_json_reader_normalization_oracle.rs`]: [
    ['//! These equations do not translate Option or serde_json library internals.',
      '//! These equations do not translate `Option` or `serde_json` library internals.'],
    [`#[test]
fn eager_receiver_fallback_order_is_unchanged_for_some() {`,
      `#[test]
#[allow(clippy::or_fun_call)] // The eager fallback block is the behavior under test.
fn eager_receiver_fallback_order_is_unchanged_for_some() {`],
  ],
  [`${T}translation_core_ranges_oracle.rs`]: [
    ['(0.0, 1.0, 1.0000000000000002, false),', '(0.0, 1.0, 1.000_000_000_000_000_2, false),'],
    ['assert_ne!(f64::from(decimal), 0.1_f64);', 'assert_ne!(f64::from(decimal).to_bits(), 0.1_f64.to_bits());'],
  ],
  [`${T}translation_core_unit_matches_oracle.rs`]: [
    [`#[test]
fn unit_variants_const_and_single_subject_evaluation() {`,
      `#[test]
#[allow(clippy::assertions_on_constants)] // Check the const-evaluated results at run time.
fn unit_variants_const_and_single_subject_evaluation() {`],
  ],
  // The generator keeps an exact copy of the oracle above.
  ['tools/translation/prepare-core-unit-matches.mjs']: [
    [`#[test]
fn unit_variants_const_and_single_subject_evaluation() {`,
      `#[test]
#[allow(clippy::assertions_on_constants)] // Check the const-evaluated results at run time.
fn unit_variants_const_and_single_subject_evaluation() {`],
  ],
  [`${T}translation_core_unicode_predicates_oracle.rs`]: [
    ['for scalar in 0..=0x10ffff {', 'for scalar in 0..=u32::from(char::MAX) {'],
  ],
  [`${T}translation_core_algebraic_oracle.rs`]: [
    [`        let _owned = value.unwrap_or_else(|| {`,
      `        #[allow(clippy::unnecessary_literal_unwrap)] // A Some receiver must skip the default.
        let _owned = value.unwrap_or_else(|| {`],
  ],
  [`${T}reverse_owned_json_readers_oracle.rs`]: [
    [`#[allow(dead_code)]
const REVERSE_JSON_READER_JS_WITNESS`,
      `// JavaScript tests extract this witness by its exact r###"..."### delimiters.
#[allow(dead_code, clippy::needless_raw_string_hashes)]
const REVERSE_JSON_READER_JS_WITNESS`],
    [`fn borrowed_text<'a>(value: &'a Json, key: &str) -> Option<&'a str> {`,
      `#[allow(clippy::option_if_let_else)] // Keep the explicit reader match under test.
fn borrowed_text<'a>(value: &'a Json, key: &str) -> Option<&'a str> {`],
  ],
  [`${T}translation_core_ascii_reverse_oracle.rs`]: [
    [`#[allow(
    unused_parens,
    clippy::needless_return,
    clippy::used_underscore_binding
)]`,
      `#[allow(
    unused_parens,
    clippy::blocks_in_conditions,
    clippy::needless_return,
    clippy::redundant_else,
    clippy::used_underscore_binding
)]`],
  ],
  [`${T}translation_core_base64_reverse_oracle.rs`]: [
    ['#[allow(clippy::needless_return, clippy::used_underscore_binding)]\n#[path = "../../tools/translation/js-to-rust/generated/owned-base64-witness.rs"]',
      `#[allow(
    clippy::double_must_use,
    clippy::needless_return,
    clippy::uninlined_format_args,
    clippy::unreadable_literal,
    clippy::used_underscore_binding
)]
#[path = "../../tools/translation/js-to-rust/generated/owned-base64-witness.rs"]`],
    ['observe(reverse_generated::standard_no_pad_decode_text(input), row)\n',
      'observe(reverse_generated::standard_no_pad_decode_text(input), row);\n'],
  ],
  [`${T}translation_core_json_oracle.rs`]: [
    ['Some(-2147483648));', 'Some(-2_147_483_648));'],
    ['Some(4294967295));', 'Some(4_294_967_295));'],
    [`#[test]
fn qualified_owned_macro_does_not_select_a_local_same_name_macro() {`,
      `#[test]
#[allow(clippy::assertions_on_constants)] // The local macro expands to a constant on purpose.
fn qualified_owned_macro_does_not_select_a_local_same_name_macro() {`],
  ],
  [`${T}native_core_parity_test.rs`]: [
    [`        record.max_tokens = row["max"]
            .as_i64()
            .filter(|max| *max >= 0)
            .map(|max| max as u64);`,
      `        record.max_tokens = row["max"]
            .as_i64()
            .and_then(|value| u64::try_from(value).ok());`],
  ],
};

const out = new Map();
for (const [path, pairs] of Object.entries(edits)) {
  let text = readFileSync(path, 'utf8');
  for (const [from, to] of pairs) {
    const count = text.split(from).length - 1;
    if (count !== 1) throw new Error(`${path}: expected one match, found ${count}: ${from.slice(0, 80)}`);
    text = text.replace(from, () => to);
  }
  out.set(path, text);
}
for (const [path, text] of out) writeFileSync(path, text);
console.log(`applied ${[...Object.values(edits)].flat().length} edits to ${out.size} files`);
