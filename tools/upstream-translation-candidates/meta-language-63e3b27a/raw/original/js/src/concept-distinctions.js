import { readRuntimeProjectData } from './project-data-loader.js';
import { CONCEPT_RECORDS, conceptRecord, conceptRecordsForSourceName } from './concept-records.js';
import { FOUNDATION_MODELS } from './foundation-models.js';

/**
 * Which concepts are shared across languages, and which must stay distinct.
 * Two source spellings name one concept only under a one-to-one
 * correspondence of meaning: each spelling resolves to exactly one concept
 * record or foundation model, and it is the same one. The same spelling with
 * different meanings, such as `|` in pest (ordered choice) and in BNF
 * (unordered choice), or `panic!` in Rust (abort) and in Lean (a default
 * value), never merges. The Rust twin is rust/src/concept_distinctions.rs.
 */

/** The concept pairs that stay distinct in every grammar and program, with the reason. */
export const REQUIRED_CONCEPT_DISTINCTIONS = Object.freeze(readRuntimeProjectData(
  new URL('./data/required-concept-distinctions.lino', import.meta.url),
).map((entry) => Object.freeze({ ...entry, concepts: Object.freeze(entry.concepts) })));

/** The foundation model pairs that stay distinct; the register records the reason for each. */
export const REQUIRED_FOUNDATION_DISTINCTIONS = Object.freeze([
  ['integer-model.natural-number', 'integer-model.unbounded-integer'],
  ['overflow-model.abort', 'overflow-model.wrapping'],
  ['effect-model.abort', 'effect-model.panic-with-default-value'],
  ['universe-model.non-cumulative-sort-hierarchy', 'universe-model.cumulative-type-hierarchy'],
  ['proof-system.bounded-property-check', 'proof-system.lean-kernel'],
  ['logic-model.constructive-propositions', 'logic-model.classical-propositions'],
].map((pair) => Object.freeze(pair)));

const withinMatches = (id, within) => within === undefined || id === within || id.startsWith(`${within}.`);

/**
 * The concepts and foundation models a source spelling `{ source, name }`
 * means, optionally only those under `within` (an identity or a prefix such
 * as `universe-model`). A concept record matches an alias with the same
 * source and name; a foundation model matches when its alias for the source
 * lists the name among its comma-separated spellings.
 */
export function sourceMeanings(alias, { within, records = CONCEPT_RECORDS, register = FOUNDATION_MODELS } = {}) {
  const concepts = records === CONCEPT_RECORDS
    ? conceptRecordsForSourceName(alias.source, alias.name)
    : records.filter((record) =>
      record.sourceAliases.some((candidate) => candidate.source === alias.source && candidate.name === alias.name),
    );
  const models = register.models.filter((model) =>
    model.sourceAliases.some((candidate) => candidate.source === alias.source && candidate.name.split(', ').includes(alias.name)),
  );
  return [...concepts, ...models].map(({ id }) => id).filter((id) => withinMatches(id, within));
}

const samePair = (pair, first, second) =>
  pair.length === 2 && ((pair[0] === first && pair[1] === second) || (pair[0] === second && pair[1] === first));

/**
 * Relates two source spellings: `shared` when both mean exactly one concept
 * and it is the same, `distinct` when they mean one concept each and the
 * concepts differ, `ambiguous` when a spelling means several concepts (so the
 * spelling alone justifies no correspondence), and `unknown` when a spelling
 * means none. Returns `{ relation, first, second, shared, justification,
 * correspondence }`: the justification is the shared concept's definition or
 * the recorded reason two distinct concepts differ, and the correspondence is
 * the kind of a recorded correspondence between two distinct foundation models.
 */
export function conceptCorrespondence(first, second, options = {}) {
  const { records = CONCEPT_RECORDS, register = FOUNDATION_MODELS } = options;
  const firstMeanings = sourceMeanings(first, options);
  const secondMeanings = sourceMeanings(second, options);
  const result = { relation: 'unknown', first: firstMeanings, second: secondMeanings, shared: null, justification: null, correspondence: null };
  if (firstMeanings.length === 0 || secondMeanings.length === 0) return result;
  if (firstMeanings.length > 1 || secondMeanings.length > 1) return { ...result, relation: 'ambiguous' };
  const [one] = firstMeanings;
  const [other] = secondMeanings;
  if (one === other) {
    const meaning = (records === CONCEPT_RECORDS ? conceptRecord(one) : records.find(({ id }) => id === one))
      ?? register.models.find(({ id }) => id === one);
    return { ...result, relation: 'shared', shared: one, justification: meaning?.definition ?? null };
  }
  const reason =
    REQUIRED_CONCEPT_DISTINCTIONS.find(({ concepts }) => samePair(concepts, one, other))?.reason ??
    register.distinctions.find(({ models }) => samePair(models, one, other))?.reason ??
    null;
  const correspondence = register.correspondences.find(({ from, to }) => samePair([from, to], one, other))?.kind ?? null;
  return { ...result, relation: 'distinct', justification: reason, correspondence };
}

const sharedSources = (aliases) =>
  new Set(aliases.map(({ source }) => source).filter((source) => source !== 'meta-language' && !source.endsWith(' grammar surface'))).size;

// A justification is a sentence of at least three words.
const isJustification = (text) => typeof text === 'string' && text.trim().endsWith('.') && text.trim().split(/\s+/u).length >= 3;

const canonical = (value) =>
  value !== null && typeof value === 'object'
    ? Array.isArray(value)
      ? `[${value.map(canonical).join(',')}]`
      : `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`
    : JSON.stringify(value);

/**
 * Checks that the records keep every required distinction and justify every
 * shared concept. A required pair names two recorded concepts (or models)
 * with different definitions (or properties) that do not record one another
 * as a former name or as what they represent, and every required foundation
 * pair carries a distinction with its reason in the register. A concept or
 * model several sources share states the meaning that justifies sharing it.
 * Returns the problems, each `{ kind, subject, message }`, with the kinds of
 * Rust's `check_concept_distinctions`; an empty list means the distinctions hold.
 */
export function checkConceptDistinctions(records = CONCEPT_RECORDS, register = FOUNDATION_MODELS) {
  const problems = [];
  const report = (kind, subject, message) => problems.push({ kind, subject, message });
  for (const { concepts } of REQUIRED_CONCEPT_DISTINCTIONS) {
    const subject = concepts.join(' / ');
    const found = concepts.map((id) => records.find((record) => record.id === id));
    concepts.forEach((id, index) => {
      if (!found[index]) report('unknown-concept', subject, `${subject} must stay distinct, but ${id} is not recorded`);
    });
    const [first, second] = found;
    if (!first || !second) continue;
    if (first.definition.trim().toLowerCase() === second.definition.trim().toLowerCase()) {
      report('indistinct-concepts', subject, `${subject} record the same definition, which merges two meanings`);
    }
    for (const [record, other] of [[first, second], [second, first]]) {
      if (record.formerNames.includes(other.id) || record.represents === other.id) {
        report('conflated-distinction', subject, `${record.id} records ${other.id} as itself, which merges two meanings`);
      }
    }
  }
  for (const pair of REQUIRED_FOUNDATION_DISTINCTIONS) {
    const subject = pair.join(' / ');
    const found = pair.map((id) => register.models.find((model) => model.id === id));
    pair.forEach((id, index) => {
      if (!found[index]) report('unknown-model', subject, `${subject} must stay distinct, but ${id} is not recorded`);
    });
    if (found[0] && found[1] && canonical(found[0].properties) === canonical(found[1].properties)) {
      report('indistinct-concepts', subject, `${subject} record the same properties, which merges two meanings`);
    }
    if (!register.distinctions.some(({ models, reason }) => samePair(models, pair[0], pair[1]) && isJustification(reason))) {
      report('unrecorded-distinction', subject, `the foundation register records no reason why ${subject} differ`);
    }
  }
  for (const record of records) {
    if (sharedSources(record.sourceAliases) > 1 && (!isJustification(record.definition) || record.constraints.length === 0)) {
      report('unjustified-sharing', record.id, `${record.id} is shared by several sources but states no meaning that justifies the correspondence`);
    }
  }
  for (const model of register.models) {
    if (sharedSources(model.sourceAliases) > 1 && (!isJustification(model.definition) || Object.keys(model.properties).length === 0)) {
      report('unjustified-sharing', model.id, `${model.id} is shared by several languages but states no meaning that justifies the correspondence`);
    }
  }
  return problems;
}

const EXPRESSION_CONCEPTS = Object.freeze({
  empty: 'grammar.empty-expression',
  literal: 'grammar.terminal',
  literalInsensitive: 'grammar.terminal',
  charRange: 'grammar.character-range',
  charClass: 'grammar.character-class',
  any: 'grammar.any-character',
  ref: 'grammar.nonterminal',
  seq: 'grammar.sequence',
  optional: 'grammar.optional-expression',
  repeat0: 'grammar.zero-or-more-repetition',
  repeat1: 'grammar.one-or-more-repetition',
  repeat: 'grammar.counted-repetition',
  and: 'grammar.positive-predicate',
  not: 'grammar.negative-predicate',
  capture: 'grammar.capture',
});

/**
 * The concept a grammar expression denotes, the twin of Rust's
 * `grammar_expr_concept_id`. A choice is `grammar.ordered-choice` when it
 * commits to its first matching alternative and `grammar.unordered-choice`
 * otherwise, so pest's `|` and BNF's `|` import as different concepts.
 */
export function grammarExprConceptId(expression) {
  if (expression.kind === 'choice') return expression.ordered ? 'grammar.ordered-choice' : 'grammar.unordered-choice';
  const concept = EXPRESSION_CONCEPTS[expression.kind];
  if (!concept) throw new TypeError(`unknown grammar expression kind ${expression.kind}`);
  return concept;
}

const PRECEDENCE_LABELS = Object.freeze(['prec', 'prec_left', 'prec_right', 'prec_dynamic']);
const isPrecedenceLabel = (label) => PRECEDENCE_LABELS.some((name) => label === name || label.startsWith(`${name}=`));

function collectPrecedence(rule, expression, inToken, uses) {
  if (!expression || typeof expression !== 'object') return;
  if (expression.kind === 'capture') {
    const label = expression.label ?? '';
    if (isPrecedenceLabel(label)) {
      const lexical = inToken && !label.startsWith('prec_dynamic');
      uses.push({ rule, label, concept: lexical ? 'grammar.lexical-precedence' : 'grammar.syntactic-precedence' });
    }
    collectPrecedence(rule, expression.item, inToken || label === 'token' || label === 'immediate_token', uses);
    return;
  }
  for (const item of expression.items ?? []) collectPrecedence(rule, item, inToken, uses);
  if (expression.item) collectPrecedence(rule, expression.item, inToken, uses);
}

/**
 * Every precedence use in `grammar`, each `{ rule, label, concept }`.
 * Precedence inside a token rule or a `token` capture decides between tokens
 * (lexical precedence); anywhere else, and dynamic precedence everywhere, it
 * decides between parse alternatives (syntactic precedence). Both runtimes
 * read tree-sitter's `prec` the same way, so the two never merge.
 */
export function grammarPrecedenceConcepts(grammar) {
  const uses = [];
  for (const name of grammar.ruleNames()) {
    const rule = grammar.rule(name);
    collectPrecedence(name, rule.expression, rule.kind === 'token', uses);
  }
  return uses;
}
