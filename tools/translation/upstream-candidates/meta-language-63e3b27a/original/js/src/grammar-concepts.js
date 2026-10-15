// The concepts of the native grammars (requirement
// I195-GRAMMAR-SHARED-CONCEPTS): every rule of every native grammar names a
// canonical concept record with `(concept ID)`, and the record carries a
// `native:<language>` source alias for each rule that names it. A concept that
// two or more native grammars name is shared; a concept that one grammar names
// is specific to that language. A construct translates from one native
// grammar to another through its concept record alone, with no rule for the
// pair of languages. rust/src/grammar_concepts.rs is the Rust port.
import { CONCEPT_RECORDS, conceptRecordsForSourceName } from './concept-records.js';
import { decoratorSet } from './decorators.js';
import { compileGrammar } from './grammar.js';
import { parseGrammarLinks } from './grammar-links.js';
import { LANGUAGE_CATALOG } from './language-catalog.js';
import { nativeGrammarText } from './native-grammar-parser.js';

const NATIVE_GRAMMARS = LANGUAGE_CATALOG.nativeGrammars ?? {};
const NATIVE_SOURCE_PREFIX = 'native:';
const PARSERS = new Map();
const RULE_CONCEPTS = new Map();

/** The id of every native grammar of the catalog, sorted. */
export function nativeGrammarIds() {
  return Object.keys(NATIVE_GRAMMARS).sort();
}

/** The language of the native grammar `id`, its file name: `json` for `native-json`. */
export function nativeGrammarLanguage(id) {
  const entry = NATIVE_GRAMMARS[id];
  if (!entry) throw new Error(`no native grammar is named ${id}`);
  return entry.file.replace(/^.*\//u, '').replace(/\.lino$/u, '');
}

/** The source concept records name the rules of the native grammar `id` under: `native:json`. */
export function nativeGrammarSource(id) {
  return `${NATIVE_SOURCE_PREFIX}${nativeGrammarLanguage(id)}`;
}

/**
 * Every rule of the native grammar `id` with the concept it names, in grammar
 * order: `[{ rule, concept }]`, where `concept` is null for a rule that names
 * none.
 */
export function nativeGrammarRuleConcepts(id) {
  const text = nativeGrammarText(id);
  let snapshot = RULE_CONCEPTS.get(id);
  if (!snapshot || snapshot.text !== text) {
    const rules = [...parseGrammarLinks(text).rules].map(([rule, { concept }]) => ({ rule, concept: concept ?? null }));
    snapshot = { text, rules };
    RULE_CONCEPTS.set(id, snapshot);
  }
  return snapshot.rules.map((entry) => ({ ...entry }));
}

// The language a concept identity is specific to by its namespace:
// `grammar.diff.hunk` belongs to diff.
const namespaceLanguage = (concept, languages) => {
  const parts = concept.split('.');
  return parts.length > 2 && languages.has(parts[1]) ? parts[1] : null;
};

/**
 * Checks that every rule of every native grammar names a concept that has a
 * record, that the records' native source aliases are exactly the rules that
 * name them, and that a concept in a language namespace (`grammar.diff.…`) is
 * named by that language alone. Returns the problems, `[{ kind, grammar, rule,
 * concept }]`; the kinds are `rule-without-concept`, `concept-without-record`,
 * `rule-without-alias`, `alias-without-rule` and `namespace-mismatch`.
 */
export function checkNativeGrammarConcepts(options = {}) {
  const { records = CONCEPT_RECORDS, grammars = nativeGrammarIds() } = options;
  const ruleConcepts = options.ruleConcepts ?? ((id) => nativeGrammarRuleConcepts(id));
  const byId = new Map(records.map((record) => [record.id, record]));
  const languages = new Set(grammars.map(nativeGrammarLanguage));
  const problems = [];
  for (const grammar of grammars) {
    const source = nativeGrammarSource(grammar);
    const language = nativeGrammarLanguage(grammar);
    const named = new Map();
    for (const { rule, concept } of ruleConcepts(grammar)) {
      if (concept === null) {
        problems.push({ kind: 'rule-without-concept', grammar, rule, concept });
        continue;
      }
      named.set(rule, concept);
      const record = byId.get(concept);
      if (!record) {
        problems.push({ kind: 'concept-without-record', grammar, rule, concept });
        continue;
      }
      if (!record.sourceAliases.some((alias) => alias.source === source && alias.name === rule)) {
        problems.push({ kind: 'rule-without-alias', grammar, rule, concept });
      }
      const owner = namespaceLanguage(concept, languages);
      if (owner !== null && owner !== language) problems.push({ kind: 'namespace-mismatch', grammar, rule, concept });
    }
    for (const record of records) {
      for (const alias of record.sourceAliases) {
        if (alias.source === source && named.get(alias.name) !== record.id) {
          problems.push({ kind: 'alias-without-rule', grammar, rule: alias.name, concept: record.id });
        }
      }
    }
  }
  return problems;
}

// The native grammars each record's source aliases name, by concept.
function conceptLanguages(records, grammars) {
  const languageOf = new Map(grammars.map((id) => [nativeGrammarSource(id), nativeGrammarLanguage(id)]));
  const languages = new Map();
  for (const record of records) {
    const named = [...new Set(record.sourceAliases.map(({ source }) => languageOf.get(source)).filter(Boolean))].sort();
    if (named.length > 0) languages.set(record.id, named);
  }
  return languages;
}

/**
 * The per-language reuse report: for every native grammar, its rules split
 * into those that name a shared concept (one that two or more native
 * grammars name, listed with those languages) and those that name a concept
 * specific to that language; and every concept the native grammars name with
 * the languages that name it.
 */
export function nativeGrammarConceptReuse(options = {}) {
  const { records = CONCEPT_RECORDS, grammars = nativeGrammarIds() } = options;
  const languages = conceptLanguages(records, grammars);
  const report = grammars.map((grammar) => {
    const shared = [];
    const specific = [];
    for (const { rule, concept } of nativeGrammarRuleConcepts(grammar)) {
      const named = languages.get(concept) ?? [];
      if (named.length > 1) shared.push({ rule, concept, languages: named });
      else specific.push({ rule, concept });
    }
    return { grammar, language: nativeGrammarLanguage(grammar), rules: shared.length + specific.length, shared, specific };
  });
  const concepts = [...languages]
    .sort(([first], [second]) => first.localeCompare(second))
    .map(([concept, named]) => ({ concept, languages: named, shared: named.length > 1 }));
  return { grammars: report, concepts };
}

/**
 * Translates the rule `rule` of the native grammar `from` to the native
 * grammar `to` through its concept record: the record whose source alias
 * names the rule, then that record's alias in the target grammar. No rule for
 * the pair of languages takes part. The relation is `translated` (one target
 * rule), `untranslatable` (the target names no rule with the concept),
 * `ambiguous` (several records or target rules) or `unknown` (no record names
 * the rule). `options.decorators` holds `concept-mapping` decorators, which
 * see the result as `{ from, to, rule, relation, concept, rules }` (rules
 * joined by spaces): they may change the concept or the target rules, whose
 * relation then follows from their number unless a decorator set it, and
 * `drop` makes the construct `unknown`.
 */
export function translateNativeConstruct(from, rule, to, options = {}) {
  const found = findNativeConstruct(from, rule, to, options);
  const decorators = decoratorSet(options.decorators);
  if (!decorators.has('concept-mapping')) return found;
  const record = { from, to, rule, relation: found.relation, concept: found.concept ?? '', rules: found.rules.join(' ') };
  const decorated = decorators.decorate('concept-mapping', record);
  if (decorated === null) return { relation: 'unknown', concept: null, rules: [] };
  const rules = decorated.rules.split(' ').filter((name) => name !== '');
  const relation = decorated.relation !== record.relation || decorated.rules === record.rules ? decorated.relation : relationOf(rules);
  return { relation, concept: decorated.concept === '' ? null : decorated.concept, rules };
}

const relationOf = (rules) => (rules.length === 1 ? 'translated' : rules.length === 0 ? 'untranslatable' : 'ambiguous');

function findNativeConstruct(from, rule, to, options) {
  const { records = CONCEPT_RECORDS } = options;
  const source = nativeGrammarSource(from);
  const target = nativeGrammarSource(to);
  const meanings = records === CONCEPT_RECORDS
    ? conceptRecordsForSourceName(source, rule)
    : records.filter(({ sourceAliases }) => sourceAliases.some((alias) => alias.source === source && alias.name === rule));
  if (meanings.length === 0) return { relation: 'unknown', concept: null, rules: [] };
  if (meanings.length > 1) return { relation: 'ambiguous', concept: null, rules: [] };
  const [record] = meanings;
  const rules = record.sourceAliases.filter((alias) => alias.source === target).map(({ name }) => name);
  return { relation: relationOf(rules), concept: record.id, rules };
}

// Each native grammar is compiled on its first use and kept for the process.
function rawParser(id) {
  let parser = PARSERS.get(id);
  if (!parser) {
    parser = compileGrammar(parseGrammarLinks(nativeGrammarText(id)));
    PARSERS.set(id, parser);
  }
  return parser;
}

/**
 * The construct tree of `source` under the native grammar `id`: the nodes of
 * its parse tree whose kind is a rule of the grammar, each `{ kind, concept,
 * children }`, without trivia, literals and token kinds that are not rules.
 * Input the grammar does not accept throws.
 */
export function nativeConstructTree(id, source) {
  const concepts = new Map(nativeGrammarRuleConcepts(id).map(({ rule, concept }) => [rule, concept]));
  const { tree } = rawParser(id).parseTree(source);
  if (!tree || tree.type !== 'node') throw new Error(`the native grammar ${id} does not accept the input`);
  const constructs = (node) => {
    if (node.type === 'error' || node.type === 'missing') throw new Error(`the native grammar ${id} does not accept the input`);
    const children = node.type === 'node' ? node.children.flatMap(constructs) : [];
    if (node.trivia || !concepts.has(node.kind)) return children;
    return [{ kind: node.kind, concept: concepts.get(node.kind), children }];
  };
  return constructs(tree)[0];
}

/**
 * Translates a construct tree of the native grammar `from` to the native
 * grammar `to`, every node through `translateNativeConstruct`. Returns `{
 * tree, problems }`: the tree with the target rule names, or null when a
 * construct does not translate, and every construct that does not, `[{ kind,
 * concept, relation }]`.
 */
export function translateNativeConstructTree(tree, from, to, options = {}) {
  const problems = [];
  const translate = (node) => {
    const { relation, concept, rules } = translateNativeConstruct(from, node.kind, to, options);
    const children = node.children.map(translate);
    if (relation !== 'translated') {
      problems.push({ kind: node.kind, concept, relation });
      return null;
    }
    return { kind: rules[0], concept, children };
  };
  const translated = translate(tree);
  return { tree: problems.length === 0 ? translated : null, problems };
}
