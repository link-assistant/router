// Translates every corpus project through the public translateProgram API and prints the contract summary.
import { readFileSync } from 'node:fs';
import { translateProgram } from '../src/index.js';
const corpus = new URL('../../parity/fixtures/translation-corpus/', import.meta.url);
const files = { JavaScript: 'project.mjs', Rust: 'project.rs', Lean: 'project.lean', Rocq: 'project.v' };
for (const [source, file] of Object.entries(files)) {
  const text = readFileSync(new URL(file, corpus), 'utf8');
  for (const target of Object.keys(files)) {
    if (target === source) continue;
    const t = translateProgram(text, source, target);
    console.log(source, '->', target, t.contract.support, t.contract.encoding, JSON.stringify(t.semantics?.runtimeDependencies), t.semantics?.obligations.length, t.code.split('\n')[0]);
  }
}
