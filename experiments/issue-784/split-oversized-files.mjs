#!/usr/bin/env node
// Issue #784: bring rust/src/anthropic_stream.rs and rust/src/gonka.rs back under
// the 1000-line limit of scripts/check-file-size.rs (rustfmt line wrapping added
// by this PR pushed them over). Whole test functions move, unchanged except for
// the 4-space de-indent, into sibling test files. Every edit is exact-match.
import fs from 'node:fs';

const root = new URL('../../', import.meta.url).pathname;
const read = (p) => fs.readFileSync(root + p, 'utf8');
const write = (p, s) => fs.writeFileSync(root + p, s);

function cut(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  if (start < 0) throw new Error(`missing start: ${startMarker}`);
  const end = source.indexOf(endMarker, start);
  if (end < 0) throw new Error(`missing end: ${endMarker}`);
  return [source.slice(0, start) + source.slice(end), source.slice(start, end)];
}

const dedent = (block) =>
  block
    .split('\n')
    .map((line) => {
      if (line === '') return line;
      if (!line.startsWith('    ')) throw new Error(`unexpected indent: ${line}`);
      return line.slice(4);
    })
    .join('\n');

// ---- anthropic_stream.rs -------------------------------------------------
{
  const file = 'rust/src/anthropic_stream.rs';
  let src = read(file);
  let a, b, c;
  [src, a] = cut(
    src,
    '    #[test]\n    fn failed_responses_stream_after_deltas_emits_anthropic_error()',
    '    #[test]\n    fn streamed_refusal_is_displayed_in_source_order_without_duplication()',
  );
  // `a` holds both failed_responses_* and standalone_error_* (adjacent tests).
  if (!a.includes('fn standalone_error_after_deltas_emits_anthropic_error()')) {
    throw new Error('standalone test not adjacent');
  }
  [src, b] = cut(
    src,
    '\n    #[test]\n    fn finish_is_idempotent_and_reports_a_cut_stream_as_an_error()',
    '\n}\n',
  );
  // The cut leaves `    }\n\n}\n`; rustfmt wants no blank line before the module's `}`.
  if (!src.endsWith('    }\n\n}\n')) throw new Error('unexpected tail');
  src = src.slice(0, -'\n}\n'.length) + '}\n';
  c = b.replace(/^\n/, '') + '\n';
  write(file, src);

  const tests = 'rust/src/anthropic_stream_termination_tests.rs';
  let t = read(tests);
  if (t.includes('fn finish_is_idempotent')) throw new Error('already moved');
  t = t.replace(/\n$/, '') + '\n\n' + dedent(a).replace(/\n+$/, '') + '\n\n' + dedent(c).replace(/\n+$/, '') + '\n';
  write(tests, t);
}

// ---- gonka.rs ------------------------------------------------------------
{
  const file = 'rust/src/gonka.rs';
  let src = read(file);
  let moved;
  [src, moved] = cut(
    src,
    '    #[test]\n    fn unconfigured_gonka_injects_no_default()',
    '    #[test]\n    fn provider_errors_carry_their_status_and_message()',
  );
  src = src.replace(
    '}\n#[cfg(test)]\nmod tests {\n',
    '}\n\n#[cfg(test)]\n#[path = "gonka_model_default_tests.rs"]\nmod model_default_tests;\n\n#[cfg(test)]\nmod tests {\n',
  );
  if (!src.includes('mod model_default_tests;')) throw new Error('mod wiring failed');
  write(file, src);
  write(
    'rust/src/gonka_model_default_tests.rs',
    '//! `GONKA_MODEL` default-model injection into `OpenAI` request bodies.\n\n' +
      'use super::with_default_model;\nuse serde_json::json;\n\n' +
      dedent(moved).replace(/\n+$/, '') +
      '\n',
  );
}
