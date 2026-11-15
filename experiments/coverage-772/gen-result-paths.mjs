// Generates Rust integration tests that drive every success and error path of
// the drafted Result cores (issue #772 coverage drop). Usage:
//   node experiments/coverage-772/gen-result-paths.mjs owned|primitive > out.rs
// The output is plain test source; lines are kept short so rustfmt's default
// width heuristics (fn_call_width 60, max_width 100) leave it unchanged.
const which = process.argv[2];
if (which !== 'owned' && which !== 'primitive') throw new Error('owned|primitive');
const module = which === 'owned' ? 'translation_owned_results_core' : 'translation_primitive_results_core';
const kinds = {
  bool: { ok: 'r::bool_ok(true)', bad: 'r::bool_err("bad")', v: 'true', other: 'false', bool: true },
  u64: { ok: 'r::u64_ok(7)', bad: 'r::u64_err("bad")', v: '7', other: '8' },
  i64: { ok: 'r::i64_ok(-7)', bad: 'r::i64_err("bad")', v: '-7', other: '8' },
  str: { ok: 'r::str_ok("é")', bad: 'r::str_err("bad")', v: '"é"', other: '"out"' },
  text: { ok: 'r::text_ok(s())', bad: 'r::text_err("bad")', v: 's()', other: 'o()' },
};
const targets = which === 'owned' ? ['bool', 'u64', 'i64', 'str', 'text'] : ['bool', 'u64', 'i64', 'str'];
const sources = which === 'owned' ? Object.keys(kinds) : ['bool', 'u64', 'i64', 'str'];
const out = { bool: 'true', u64: '3', i64: '-3', str: '"out"', text: 'o()' };

function check(stmts, call, expected, isBool) {
  stmts.push(`let got = ${call};`);
  if (isBool) stmts.push(expected === 'true' ? 'assert!(got);' : 'assert!(!got);');
  else if (expected === 'None') stmts.push('assert!(got.is_none());');
  else stmts.push(`assert_eq!(got, ${expected});`);
}

function basics(k) {
  const d = kinds[k], s = [];
  s.push(`let ok = || ${d.ok};`, `let bad = || ${d.bad};`);
  check(s, `r::${k}_is_ok(ok())`, 'true', true);
  check(s, `r::${k}_is_ok(bad())`, 'false', true);
  check(s, `r::${k}_is_err(ok())`, 'false', true);
  check(s, `r::${k}_is_err(bad())`, 'true', true);
  check(s, `r::${k}_unwrap_or(ok(), ${d.other})`, d.v, d.bool);
  check(s, `r::${k}_unwrap_or(bad(), ${d.other})`, d.other, d.bool);
  check(s, `r::${k}_unwrap(ok())`, d.v, d.bool);
  s.push(`assert!(panics(|| r::${k}_unwrap(bad())));`);
  check(s, `r::${k}_expect(ok(), "why")`, d.v, d.bool);
  s.push(`assert!(panics(|| r::${k}_expect(bad(), "why")));`);
  check(s, `r::${k}_ok_option(ok())`, `Some(${d.v})`);
  check(s, `r::${k}_ok_option(bad())`, 'None');
  check(s, `r::${k}_err_option(ok())`, 'None');
  check(s, `r::${k}_err_option(bad())`, 'Some(e())');
  check(s, `r::${k}_unwrap_err(bad())`, 'e()');
  s.push(`assert!(panics(|| r::${k}_unwrap_err(ok())));`);
  check(s, `r::${k}_expect_err(bad(), "why")`, 'e()');
  s.push(`assert!(panics(|| r::${k}_expect_err(ok(), "why")));`);
  return s;
}

function maps(k) {
  const d = kinds[k], s = [];
  s.push(`let ok = || ${d.ok};`, `let bad = || ${d.bad};`);
  for (const t of targets) {
    check(s, `r::${k}_to_${t}_map(ok(), |_| ${out[t]})`, `Ok(${out[t]})`);
    check(s, `r::${k}_to_${t}_map(bad(), |_| ${out[t]})`, 'Err(e())');
    check(s, `r::${k}_to_${t}_and_then(ok(), |_| Ok(${out[t]}))`, `Ok(${out[t]})`);
    check(s, `r::${k}_to_${t}_and_then(ok(), |_| Err(e()))`, 'Err(e())');
    check(s, `r::${k}_to_${t}_and_then(bad(), |_| Ok(${out[t]}))`, 'Err(e())');
  }
  return s;
}

function recovery(k) {
  const d = kinds[k], s = [];
  s.push(`let ok = || ${d.ok};`, `let bad = || ${d.bad};`);
  check(s, `r::${k}_map_err(ok(), |error| error + "!")`, `Ok(${d.v})`);
  check(s, `r::${k}_map_err(bad(), |error| error + "!")`, 'Err(e() + "!")');
  check(s, `r::${k}_unwrap_or_else(ok(), |_| ${d.other})`, d.v, d.bool);
  check(s, `r::${k}_unwrap_or_else(bad(), |_| ${d.other})`, d.other, d.bool);
  check(s, `r::${k}_or_else(ok(), |_| Err(e()))`, `Ok(${d.v})`);
  check(s, `r::${k}_or_else(bad(), |_| Ok(${d.other}))`, `Ok(${d.other})`);
  check(s, `r::${k}_or_else(bad(), |error| Err(error + "!"))`, 'Err(e() + "!")');
  return s;
}

const lines = [
  `//! Path oracle for the drafted \`${module}\` (issue #772).`,
  '//!',
  '//! Every accessor and combinator is driven through both its success and its',
  '//! error arm, and every panicking accessor through the arm that panics, so the',
  '//! generated core is exercised as a whole rather than by sampled call sites.',
  `use link_assistant_router::${module} as r;`,
  '',
  'fn s() -> String {',
  '    "é".to_owned()',
  '}',
  '',
  'fn o() -> String {',
  '    "out".to_owned()',
  '}',
  '',
  'fn e() -> String {',
  '    "bad".to_owned()',
  '}',
  '',
  'fn panics<T>(call: impl FnOnce() -> T + std::panic::UnwindSafe) -> bool {',
  '    std::panic::catch_unwind(call).is_err()',
  '}',
];
function test(name, body) {
  lines.push('', '#[test]', `fn ${name}() {`);
  for (const stmt of body) lines.push(`    ${stmt}`);
  lines.push('}');
}
const half = (name, body) => {
  // Clippy's too_many_lines (pedantic) caps a function body at 100 lines.
  if (body.length <= 90) return test(name, body);
  const head = body.slice(0, 2), rest = body.slice(2), mid = Math.ceil(rest.length / 4) * 2;
  test(`${name}_first`, [...head, ...rest.slice(0, mid)]);
  test(`${name}_second`, [...head, ...rest.slice(mid)]);
};
for (const k of sources) {
  test(`${k}_accessors_cover_both_arms`, basics(k));
  half(`${k}_maps_cover_both_arms`, maps(k));
  test(`${k}_recovery_covers_both_arms`, recovery(k));
}
if (which === 'owned') {
  test('result_identity_keeps_both_arms', [
    'let got = r::text_result_identity::<u8>(Ok(1));',
    'assert_eq!(got, Ok(1));',
    'let got = r::text_result_identity::<u8>(Err(e()));',
    'assert_eq!(got, Err(e()));',
  ]);
}
const text = lines.join('\n') + '\n';
const long = text.split('\n').filter(line => line.length > 100);
if (long.length) throw new Error(`lines over 100 chars:\n${long.join('\n')}`);
process.stdout.write(text);
