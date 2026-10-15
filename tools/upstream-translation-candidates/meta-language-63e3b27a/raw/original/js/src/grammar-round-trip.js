// Mutation-guarded grammar interchange round trips. A plain round trip
// (import, emit, re-import, compare) cannot tell a correct importer/emitter
// pair from two that are wrong in mutually cancelling ways, and it cannot tell
// an emitter that re-emits a cached source from one that prints the grammar it
// was given. The guard therefore changes the grammar before export, requires
// the change in the exported text and in the re-imported grammar, and checks
// both the imported and the re-imported grammar against independent accept
// and reject samples that do not come from the pair under test. It mirrors
// rust/src/grammar/round_trip.rs.
import { carryRuleDocs, Grammar, parseWithGrammar } from './grammar.js';
import { normalizedRuleDefinition } from './grammar-merge.js';

/** The literal alternative the guard adds to the start rule by default. */
export const GRAMMAR_ROUND_TRIP_MARKER = 'round-trip-mutation';

/**
 * Returns `grammar` with `marker` added as a literal alternative of its start
 * rule. PEG grammars get an ordered choice, every other notation an unordered
 * one, so the mutation is expressible without a lossy fallback.
 */
export function mutateGrammarStartRule(grammar, marker = GRAMMAR_ROUND_TRIP_MARKER) {
  const start = grammar.startRule();
  if (!start) throw new TypeError('the grammar has no start rule to mutate');
  const rules = new Map();
  for (const rule of grammar.rules.values()) {
    if (rule.name !== start.name) {
      rules.set(rule.name, rule);
      continue;
    }
    const alternatives = [rule.expression, { kind: 'literal', value: marker }];
    rules.set(rule.name, {
      ...rule,
      expression: { kind: 'choice', items: alternatives, ordered: grammar.sourceFormat === 'peg' },
    });
  }
  return carryRuleDocs(new Grammar(grammar.start, rules, grammar.sourceFormat, grammar.declarations), grammar);
}

/**
 * Imports `source`, mutates the grammar, exports it, re-imports the export and
 * reports every way the pair failed to carry the grammar and the mutation.
 * Malformed sources are rejected by the importer, whose error propagates.
 */
export function checkGrammarRoundTrip(source, {
  importGrammar,
  emitGrammar,
  marker = GRAMMAR_ROUND_TRIP_MARKER,
  accepts = [],
  rejects = [],
} = {}) {
  if (typeof importGrammar !== 'function' || typeof emitGrammar !== 'function') {
    throw new TypeError('checkGrammarRoundTrip needs importGrammar and emitGrammar functions');
  }
  const failures = [];
  const imported = importGrammar(source);
  checkSamples(failures, 'imported', imported, accepts, rejects);
  if (acceptsText(imported, marker)) {
    failures.push({ kind: 'marker-already-accepted', stage: 'imported', detail: marker });
  }

  const mutated = mutateGrammarStartRule(imported, marker);
  const unmutated = emitGrammar(imported).source;
  const exported = emitGrammar(mutated);
  for (const note of exported.report.lossy) {
    failures.push({ kind: 'lossy-export', stage: 'exported', detail: note });
  }
  if (exported.source === unmutated || !exported.source.includes(marker)) {
    failures.push({ kind: 'mutation-not-exported', stage: 'exported', detail: marker });
  }

  const reimported = importGrammar(exported.source);
  compareRules(failures, mutated, reimported);
  if (!acceptsText(reimported, marker)) {
    failures.push({ kind: 'mutation-not-visible', stage: 'reimported', detail: marker });
  }
  checkSamples(failures, 'reimported', reimported, accepts, rejects);
  // A notation may print an equivalent construct differently once (ABNF has
  // no character classes), so the second export must carry the same rules
  // and be a fixpoint rather than repeat the first text.
  const again = emitGrammar(reimported).source;
  const settled = importGrammar(again);
  if (!sameDefinitions(mutated, settled) || emitGrammar(settled).source !== again) {
    failures.push({ kind: 'export-not-stable', stage: 'reimported', detail: 'a second export does not settle' });
  }

  return {
    status: failures.length === 0 ? 'preserved' : 'broken',
    failures,
    mutated,
    exported: exported.source,
    reimported,
  };
}

function compareRules(failures, expected, actual) {
  const expectedNames = expected.ruleNames();
  const actualNames = actual.ruleNames();
  if (expectedNames.join('\n') !== actualNames.join('\n')) {
    failures.push({
      kind: 'rules-changed',
      stage: 'reimported',
      detail: `rule names [${expectedNames.join(', ')}] became [${actualNames.join(', ')}]`,
    });
  }
  if ((expected.startRule()?.name ?? null) !== (actual.startRule()?.name ?? null)) {
    failures.push({ kind: 'rules-changed', stage: 'reimported', detail: 'the start rule changed' });
  }
  for (const name of expectedNames) {
    const rule = actual.rule(name);
    if (rule && canonicalRuleDefinition(rule) !== canonicalRuleDefinition(expected.rule(name))) {
      failures.push({ kind: 'rules-changed', stage: 'reimported', detail: `rule ${name} changed its definition` });
    }
  }
}

function sameDefinitions(expected, actual) {
  const definitions = (grammar) => grammar.ruleNames().map((name) => `${name}=${canonicalRuleDefinition(grammar.rule(name))}`);
  return definitions(expected).join('\n') === definitions(actual).join('\n');
}

/**
 * The meaning-aware definition of a rule, after spelling every set of single
 * characters as one unordered choice: a character class, a choice of its
 * ranges and an ordered choice of them all consume the same one character.
 */
export function canonicalRuleDefinition(rule) {
  return normalizedRuleDefinition({ ...rule, expression: canonicalCharacters(rule.expression) });
}

function canonicalCharacters(expression) {
  const set = characterSet(expression);
  if (set) return set.length === 1 ? set[0] : { kind: 'choice', items: set, ordered: false };
  const copy = { ...expression };
  if (Array.isArray(expression.items) && expression.kind !== 'charClass') {
    copy.items = expression.items.map(canonicalCharacters);
  }
  if (expression.item) copy.item = canonicalCharacters(expression.item);
  return copy;
}

function characterSet(expression) {
  switch (expression.kind) {
    case 'literal': return [...expression.value].length === 1 ? [expression] : null;
    case 'charRange': return [expression];
    case 'charClass':
      if (expression.negated === true || !Array.isArray(expression.items)) return null;
      return expression.items.map((item) => (item.kind === 'range'
        ? { kind: 'charRange', start: item.start, end: item.end }
        : { kind: 'literal', value: item.value }));
    case 'choice': {
      const sets = expression.items.map(characterSet);
      return sets.every(Boolean) ? sets.flat() : null;
    }
    default: return null;
  }
}

function checkSamples(failures, stage, grammar, accepts, rejects) {
  for (const text of accepts) {
    if (!acceptsText(grammar, text)) failures.push({ kind: 'sample-rejected', stage, detail: text });
  }
  for (const text of rejects) {
    if (acceptsText(grammar, text)) failures.push({ kind: 'sample-accepted', stage, detail: text });
  }
}

/** Whether `grammar` parses all of `text`. */
export function acceptsText(grammar, text) {
  try {
    parseWithGrammar(grammar, text);
    return true;
  } catch {
    return false;
  }
}
