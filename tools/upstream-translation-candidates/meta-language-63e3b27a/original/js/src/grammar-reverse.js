// Reverse conversion of a grammar back to its source format. The checked
// cycle is source grammar -> native links -> exported grammar -> native
// links: the source is imported, written as the native links form and read
// back from those links alone, so the emitter is handed a grammar decoded from
// links and never the source text. The export is re-imported and compared
// with the imported grammar rule by rule (names, start rule, kinds,
// definitions modulo the documented canonical spelling of single-character
// sets, and rule documentation, the provenance an importer keeps from
// comments), and both grammars are run on independent accept and reject
// samples. It mirrors rust/src/grammar/reverse.rs.
import { ruleDoc } from './grammar-emitters/structural.js';
import { parseGrammarLinks, renderGrammarLinks } from './grammar-links.js';
import { acceptsText, canonicalRuleDefinition } from './grammar-round-trip.js';

/**
 * Runs the reverse conversion cycle on `source` and reports every way the
 * cycle failed to keep the grammar. Malformed sources are rejected by the
 * importer, whose error propagates.
 */
export function checkGrammarReverseConversion(source, { importGrammar, emitGrammar, accepts = [], rejects = [] } = {}) {
  if (typeof importGrammar !== 'function' || typeof emitGrammar !== 'function') {
    throw new TypeError('checkGrammarReverseConversion needs importGrammar and emitGrammar functions');
  }
  const failures = [];
  const imported = importGrammar(source);
  sampleFailures(failures, 'imported', imported, accepts, rejects);

  const links = renderGrammarLinks(imported);
  const decoded = parseGrammarLinks(links);
  if (renderGrammarLinks(decoded) !== links) {
    failures.push({ kind: 'links-not-faithful', stage: 'links', detail: 'reading the links back writes different links' });
  }

  const exported = emitGrammar(decoded);
  for (const note of exported.report.lossy) failures.push({ kind: 'lossy-export', stage: 'exported', detail: note });

  const reimported = importGrammar(exported.source);
  const reimportedLinks = renderGrammarLinks(reimported);
  compareGrammars(failures, imported, reimported);
  sampleFailures(failures, 'reimported', reimported, accepts, rejects);

  return {
    status: failures.length === 0 ? 'equivalent' : 'different',
    failures,
    links,
    exported: exported.source,
    reimportedLinks,
  };
}

function compareGrammars(failures, expected, actual) {
  const changed = (detail) => failures.push({ kind: 'rules-changed', stage: 'reimported', detail });
  const expectedNames = expected.ruleNames();
  const actualNames = actual.ruleNames();
  if (expectedNames.join('\n') !== actualNames.join('\n')) {
    changed(`rule names [${expectedNames.join(', ')}] became [${actualNames.join(', ')}]`);
  }
  if ((expected.startRule()?.name ?? null) !== (actual.startRule()?.name ?? null)) changed('the start rule changed');
  for (const name of expectedNames) {
    const rule = actual.rule(name);
    if (!rule) continue;
    if (canonicalRuleDefinition(rule) !== canonicalRuleDefinition(expected.rule(name))) {
      changed(`rule ${name} changed its definition`);
    }
    if (ruleDoc(actual, rule) !== ruleDoc(expected, expected.rule(name))) {
      failures.push({ kind: 'doc-changed', stage: 'reimported', detail: `rule ${name} changed its documentation` });
    }
  }
}

function sampleFailures(failures, stage, grammar, accepts, rejects) {
  for (const text of accepts) {
    if (!acceptsText(grammar, text)) failures.push({ kind: 'sample-rejected', stage, detail: text });
  }
  for (const text of rejects) {
    if (acceptsText(grammar, text)) failures.push({ kind: 'sample-accepted', stage, detail: text });
  }
}
