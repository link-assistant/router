#!/usr/bin/env node
// Translate the JavaScript frontend decisions into the Rust module that the
// lexer, parser and checker use. Only the shared emitter decorators and
// rustfmt adapt generated output to its place in the crate.
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

import { DecoratorSet } from '../src/decorators.js';
import { decorateEmitted } from '../src/grammar-emitters/common.js';
import { checkProgram } from '../src/translation/check.js';
import { emitRust } from '../src/translation/emit-rust.js';
import { parseJavaScript } from '../src/translation/javascript.js';

const sourcePath = new URL('../src/translation/frontend-rules.js', import.meta.url);
const outputPath = new URL('../../rust/src/translation/frontend_rules.rs', import.meta.url);
const decoratorsPath = new URL('../../parity/self-translation/frontend-rules-decorators.lino', import.meta.url);
const source = readFileSync(sourcePath, 'utf8');
const decorators = DecoratorSet.fromLino(readFileSync(decoratorsPath, 'utf8'));
const emitted = emitRust(checkProgram(parseJavaScript(source)));
const decorated = decorateEmitted('Rust', { source: emitted.text }, decorators).source;
const formatted = spawnSync('rustfmt', ['--edition', '2024', '--emit', 'stdout'], { input: decorated, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
if (formatted.error || formatted.status !== 0) throw formatted.error ?? new Error(formatted.stderr);
// Module-level style rules can replace a formatted expression spanning lines.
// The decorator engine and its Links Notation data are shared by both runtimes.
let final = formatted;
for (let round = 0; round < 10; round += 1) {
  const styled = decorators.decorate('emitter', { format: 'Rust', scope: 'formatted-module', source: final.stdout });
  const next = spawnSync('rustfmt', ['--edition', '2024', '--emit', 'stdout'], { input: styled.source, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  if (next.error || next.status !== 0) throw next.error ?? new Error(next.stderr);
  // Formatting a simplified block can expose another style replacement.
  // Require a fixed point so regeneration never depends on how many times
  // the command happened to run.
  if (next.stdout === final.stdout) break;
  final = next;
  if (round === 9) throw new Error('frontend style decorators do not converge');
}
const notice = `// Generated from js/src/translation/frontend-rules.js by
// js/scripts/generate-frontend-rules.mjs. Do not edit by hand.
`;
// Keep the generated continuation machinery in a separate module so both
// generated Rust files obey the repository source-file size limit.
const boundary = final.stdout.search(/#\[derive\(Clone, Debug, PartialEq\)\]\npub enum Ml/u);
if (boundary < 0) throw new Error('generated continuation boundary is missing');
const outputs = [
  [outputPath, notice + final.stdout.slice(0, boundary) + 'mod continuations;\npub use continuations::*;\n'],
  [new URL('../../rust/src/translation/frontend_rules/continuations.rs', import.meta.url), notice + 'use super::*;\n\n' + final.stdout.slice(boundary)],
];
if (process.argv.includes('--check')) {
  for (const [path, text] of outputs) {
    if (readFileSync(path, 'utf8') !== text) throw new Error('frontend rules are stale; run node js/scripts/generate-frontend-rules.mjs');
  }
  console.log('generated Rust frontend rules match the JavaScript module');
} else {
  mkdirSync(new URL('../../rust/src/translation/frontend_rules/', import.meta.url), { recursive: true });
  for (const [path, text] of outputs) writeFileSync(path, text);
  console.log(`wrote ${outputs.length} generated frontend modules`);
}
