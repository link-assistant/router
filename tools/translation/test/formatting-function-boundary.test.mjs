import test from 'node:test';
import assert from 'node:assert/strict';
import {proposeSourceBackedCoreFormattingCorpus} from '../source-backed-core-formatting.mjs';
import {iterateSourceBackedCoreFormattingCorpusPackets} from '../source-backed-formatting-packets.mjs';
import {proposeCoreFormattingCorpus} from '../propose-core-formatting-corpus.mjs';
import {ROUTER_FORMATTING_FACADE_SOURCE} from '../router-core-formatting.mjs';
import {ROUTER_CORE_PRIMITIVES_SOURCE} from '../router-core-primitives.mjs';
import {transportConcreteSyntaxMeta} from '../concrete-syntax-meta.mjs';
const bound = {timeout: 60000};
const files = source => ({'src/lib.rs': 'pub mod translation_core;pub mod app;',
  'src/translation_core.rs': ROUTER_FORMATTING_FACADE_SOURCE,
  'src/translation_core/primitives.rs': ROUTER_CORE_PRIMITIVES_SOURCE, 'src/app.rs': source});
function inspect(source) {
  const proposal = proposeSourceBackedCoreFormattingCorpus({files: files(source)});
  const row = proposal.rows.find(row => row.path === 'src/app.rs');
  assert.equal(proposal.inputs.find(row => row.path === 'src/app.rs').source, source);
  if (row.proposal) {
    assert.equal(transportConcreteSyntaxMeta(row.proposal.before.meta).source, source);
    assert.equal(transportConcreteSyntaxMeta(row.proposal.after.meta).source, row.proposal.after.source);
  }
  return {proposal, row};
}
test('opaque enclosing macro tokens keep their exact original formatting spellings', bound, () => {
  const source = 'pub fn keep()->String{capture!{format!("opaque")}}';
  const legacy = proposeCoreFormattingCorpus({files: files(source)}).rows.find(row => row.path === 'src/app.rs');
  assert.ok(legacy.proposal.edits.length > 0, 'the unchanged original API exposes the candidate boundary');
  const {row} = inspect(source);
  assert.equal(row.proposal.after.source, source);
  assert.deepEqual(row.proposal.functions, []);
  assert.ok(row.proposal.skipped.some(row => row.reason === 'function body retains an unresolved macro or local producer'));
});
test('unknown earlier body expansion cannot introduce a shadow before a later formatting call', bound, () => {
  const source = 'pub fn keep()->String{introduce!();format!("later")}';
  const {row} = inspect(source);
  assert.equal(row.proposal.after.source, source);
  assert.deepEqual(row.proposal.edits, []);
  assert.deepEqual(row.proposal.functions, []);
});
test('unknown qualified macro owners remain opaque while comments strings and character literals are retained', bound, () => {
  for (const prefix of ['external::capture!("tokens");', 'external::format!("tokens");', 'a\u0301!("tokens");', 'r#capture!("tokens");']) {
    const source = 'pub fn keep()->String{' + prefix + 'format!("later")}';
    const {row} = inspect(source);assert.equal(row.proposal.after.source, source);
  }
  const source = 'pub fn selected()->String{/* unknown!(); */let text="capture!(format!)";let marker=\'!\';format!("ok")}';
  const {row} = inspect(source);assert.equal(row.status, 'proposed');
  assert.ok(row.proposal.after.source.includes('/* unknown!(); */let text="capture!(format!)";let marker=\'!\';'));
});
test('nested selected formatting invocations retain all argument tokens and independent source inverses', bound, () => {
  const source = 'pub fn selected()->String{format!("outer {}",format!("inner"))}';
  const {row} = inspect(source);assert.equal(row.status, 'proposed');
  assert.equal(row.proposal.after.source, 'pub fn selected()->crate::translation_core::Text{crate::translation_core::format!("outer {}",crate::translation_core::format!("inner"))}');
  let restored = row.proposal.after.source;
  for (const part of [...row.proposal.mapping].reverse()) if (part.kind === 'substitution') {
    assert.equal(restored.slice(...part.after), part.replacement);
    restored = restored.slice(0, part.after[0]) + part.expected + restored.slice(part.after[1]);
  }
  assert.equal(restored, source);
});
test('detached packets preserve the complete materialized refusal and every boundary diagnostic', bound, () => {
  const source = 'pub fn keep()->String{unknown!{format!("keep")}}pub fn selected()->String{format!("yes")}';
  const input = files(source), expected = proposeSourceBackedCoreFormattingCorpus({files: input}), stream = iterateSourceBackedCoreFormattingCorpusPackets({files: input});
  const rows = [], inspections = [], inputs = [];let metadata, edges, diagnostics;
  for (;;) {
    const next = stream.next();if (next.done) break;const event = next.value, value = JSON.parse(event.text);
    if (event.section === 'rows') rows.push(value);
    else if (event.section === 'binding-inspections') inspections.push(value);
    else if (event.section === 'inputs') inputs.push(value);
    else if (event.section === 'metadata') metadata = value;
    else if (event.section === 'module-edges') edges = value;
    else if (event.section === 'module-diagnostics') diagnostics = value;
    else assert.fail('unknown full formatting section');
  }
  stream.verify();
  const sections = {rows, bindingInspections: inspections, inputs, moduleEdges: edges, moduleDiagnostics: diagnostics};
  const actual = Object.fromEntries(metadata.keys.map(key => [key, Object.hasOwn(metadata.values, key) ? metadata.values[key] : sections[key]]));
  assert.deepEqual(actual, JSON.parse(JSON.stringify(expected)));
  const row = actual.rows.find(row => row.path === 'src/app.rs');assert.deepEqual(row.proposal.functions.map(row => row.name), ['selected']);
  assert.ok(row.proposal.after.source.includes('unknown!{format!("keep")}'));
});
