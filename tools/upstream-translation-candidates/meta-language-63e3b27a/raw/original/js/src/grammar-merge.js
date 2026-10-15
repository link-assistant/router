// Deterministic, meaning-aware merging of grammars from several sources, and
// binding-aware renaming of grammar rules. It mirrors
// rust/src/grammar/merge/: both runtimes normalize rule definitions the same
// way, prove equivalence by the same recursive structural bisimulation and
// print the same canonical definitions, so their decisions agree.
import { createHash } from 'node:crypto';

import { Grammar } from './grammar.js';
import { grammarDeclarations } from './grammar-feature-forms.js';
import { renderDeclarationLinks, renderLinksExpression, renderRuleFieldLinks } from './grammar-links.js';
import { DecoratorSet, decoratorSet } from './decorators.js';
import { GrammarMergeError, compareText, normalize, q } from './grammar-merge-normalize.js';
import { reconcileClasses } from './grammar-reconcile.js';
import { mapDeclarations, mapReferences, renamedRule } from './grammar-rename.js';
import { preserveSourceAlternatives, wrapLexicalProduction } from './grammar-merge-decisions.js';
import { createGlobalConceptSpace } from './global-concept-space.js';

export { GrammarMergeError } from './grammar-merge-normalize.js';

export { GrammarRenameError, renameGrammarRule, restoreSourceNames } from './grammar-rename.js';

/** How an accepted equivalence is justified. */
export const GRAMMAR_MERGE_METHOD = 'recursive-structural-bisimulation';

/**
 * Merges grammars of several sources without user interaction.
 *
 * Each source is `{ id, language, edition, precedence, grammar }`. Sources of
 * different languages or editions are never merged with each other. Within one
 * language edition, rules are merged only when their normalized definitions are
 * equivalent under a recursive structural bisimulation; similar names and
 * identical caller-supplied samples (`options.samples`, keyed by
 * `sourceId:ruleName`) only nominate candidates. `options.requiredEquivalences`
 * lists `[aliasA, aliasB]` pairs that must end up merged, otherwise the result
 * is `incomplete`. `options.previous` is an earlier result: unchanged groups are
 * reused and established canonical names are kept. `options.decorators` holds
 * `merge-decision` decorators, which see each decision as `{ kind, name,
 * members, basis, definition }` (members joined by spaces): they may change
 * its `kind` or `basis`, or drop it from the report. They never change the
 * merged grammar, and a group is reused only under the same decorators.
 * `options.reconcile: true` also unites corresponding rules of different
 * sources that are equivalent up to their lexical roles (see
 * grammar-reconcile.js); each such class is a `reconciled` decision, kept by
 * the union of all of its source productions. Correspondence nominates a
 * shared grammar rule; it is not an equivalence proof for concept identity.
 * Every source also contributes to `globalConceptSpace`, across language and
 * edition boundaries; `globalEquivalences` requires exact one-to-one proofs.
 * `formalDefinitions` supplies explicit operational Links archives for those
 * proofs. Without supported premises, concepts retain their original identities.
 */
export function mergeGrammars(sources, options = {}) {
  const prepared = prepareSources(sources);
  const decorators = decoratorSet(options.decorators);
  const samples = normalizeSamples(options.samples ?? {});
  const required = normalizeRequired(options.requiredEquivalences ?? []);
  const previousGroups = new Map((options.previous?.groups ?? []).map((group) => [group.key, group]));
  const reconcile = options.reconcile === true;

  const grouped = new Map();
  for (const source of prepared) {
    const key = groupKey(source.language, source.edition);
    if (!grouped.has(key)) grouped.set(key, { language: source.language, edition: source.edition, sources: [] });
    grouped.get(key).sources.push(source);
  }
  const ordered = [...grouped.values()].sort((left, right) =>
    compareText(left.language, right.language) || compareText(left.edition, right.edition));

  const groups = [];
  const reused = [];
  const recomputed = [];
  for (const entry of ordered) {
    const key = groupKey(entry.language, entry.edition);
    const ids = new Set(entry.sources.map(({ id }) => id));
    const groupRequired = required.filter((pair) => pair.some((alias) => ids.has(sourceOf(alias))));
    const fingerprint = groupFingerprint(entry, groupRequired, samples, decorators, reconcile);
    const previous = previousGroups.get(key);
    if (previous && previous.fingerprint === fingerprint) {
      groups.push(previous);
      reused.push(key);
      continue;
    }
    groups.push(mergeGroup(entry, fingerprint, samples, previous?.identities ?? {}, decorators, reconcile));
    recomputed.push(key);
  }

  const alternatives = editionAlternatives(groups);
  const failures = requiredFailures(required, groups);
  const globalConceptSpace = createGlobalConceptSpace(prepared, {
    previous: options.previous?.globalConceptSpace,
    equivalences: options.globalEquivalences,
    records: options.conceptRecords,
    formalDefinitions: options.formalDefinitions,
  });
  return {
    status: failures.length === 0 && globalConceptSpace.failures.length === 0 ? 'complete' : 'incomplete',
    groups,
    alternatives,
    failures,
    reused,
    recomputed,
    globalConceptSpace,
  };
}

/** Throws when a merge left a required equivalence unresolved. */
export function assertMergeComplete(result) {
  const failures = [...result.failures, ...(result.globalConceptSpace?.failures ?? [])];
  if (failures.length === 0) return result;
  const detail = failures.map(({ members, reason }) => `${members.join(' = ')} (${reason})`).join('; ');
  throw new GrammarMergeError(`unresolved required equivalence: ${detail}`, failures);
}

/**
 * The decisions of a merge group that share a rule between its sources: the
 * merged and reconciled classes with members of more than one source.
 */
export function sharedRuleDecisions(group) {
  return group.decisions.filter(({ kind, members }) => (kind === 'merged' || kind === 'reconciled')
    && new Set(members.map(sourceOf)).size > 1);
}

/**
 * Throws when a group of two or more sources shares no rule between them:
 * such a merge only concatenates its sources side by side.
 */
export function assertMergeShares(result) {
  const concatenated = result.groups.filter((group) => group.sources.length > 1 && sharedRuleDecisions(group).length === 0);
  if (concatenated.length === 0) return;
  const detail = concatenated.map((group) => `${group.key} (${group.sources.join(', ')}: ${group.grammar.rules.size} rules)`).join('; ');
  throw new GrammarMergeError(`the merge only concatenates its sources, sharing no rule: ${detail}`, concatenated.map(({ key }) => key));
}

/** The canonical text of a rule definition after meaning-aware normalization. */
export function normalizedRuleDefinition(rule) {
  return `${rule.kind ?? 'normal'}:${normalize(rule.expression, nameLabel).text}`;
}

// The rule fields (parameters, channel, modes and action) as they take part
// in a rule's signature, with action references printed by `label`; empty for
// a rule without them, so plain rules keep their definitions.
function ruleFields(rule, label) {
  const action = rule.action === undefined ? undefined : mapReferences(rule.action, label);
  const fields = renderRuleFieldLinks({ ...rule, action });
  return fields.length === 0 ? '' : ` ${fields.join(' ')}`;
}

// The declarations of one grammar as one line of links.
function declarationsText(declarations) {
  const matching = declarations.matching === null ? [] : [`(matching ${declarations.matching})`];
  const settling = declarations.settling === null ? [] : [`(settling ${declarations.settling.join(' ')})`];
  return [...matching, ...settling, ...renderDeclarationLinks(declarations)].join(' ');
}

function prepareSources(sources) {
  if (!Array.isArray(sources)) throw new GrammarMergeError('merge sources must be an array');
  const seen = new Set();
  const prepared = sources.map((source) => {
    const { id, language, edition = '', precedence = 0, grammar } = source ?? {};
    if (typeof id !== 'string' || id.length === 0 || id.includes(':')) {
      throw new GrammarMergeError(`invalid merge source id ${JSON.stringify(id)}`);
    }
    if (seen.has(id)) throw new GrammarMergeError(`duplicate merge source id ${id}`);
    seen.add(id);
    if (typeof language !== 'string' || language.length === 0) {
      throw new GrammarMergeError(`merge source ${id} has no language`);
    }
    if (typeof edition !== 'string') throw new GrammarMergeError(`merge source ${id} has an invalid edition`);
    if (!Number.isSafeInteger(precedence) || precedence < 0) {
      throw new GrammarMergeError(`merge source ${id} has an invalid precedence`);
    }
    if (!(grammar instanceof Grammar)) throw new GrammarMergeError(`merge source ${id} has no grammar`);
    return { id, language, edition, precedence, grammar };
  });
  return prepared.sort((left, right) => left.precedence - right.precedence || compareText(left.id, right.id));
}

function normalizeSamples(samples) {
  const normalized = new Map();
  for (const alias of Object.keys(samples).sort(compareText)) {
    const values = [...new Set(samples[alias].map(String))].sort(compareText);
    if (values.length > 0) normalized.set(alias, values);
  }
  return normalized;
}

function normalizeRequired(pairs) {
  const normalized = pairs.map((pair) => {
    if (!Array.isArray(pair) || pair.length !== 2 || pair.some((alias) => typeof alias !== 'string')) {
      throw new GrammarMergeError('a required equivalence is a pair of sourceId:ruleName aliases');
    }
    return [...pair].sort(compareText);
  });
  const unique = new Map(normalized.map((pair) => [pair.join('\u0000'), pair]));
  return [...unique.values()].sort((left, right) => compareText(left[0], right[0]) || compareText(left[1], right[1]));
}

function groupKey(language, edition) {
  return `${language}@${edition}`;
}

function sourceOf(alias) {
  const colon = alias.indexOf(':');
  return colon < 0 ? alias : alias.slice(0, colon);
}

function formatOf(source) {
  return source.grammar.sourceFormat ?? 'none';
}

function groupFingerprint(entry, required, samples, decorators, reconcile) {
  const lines = ['grammar-merge v1', `group ${q(entry.language)} ${q(entry.edition)}`];
  if (reconcile) lines.push('reconcile');
  const ids = new Set();
  for (const source of entry.sources) {
    ids.add(source.id);
    const start = source.grammar.startRule()?.name;
    lines.push(`source ${q(source.id)} ${source.precedence} ${q(formatOf(source))} ${start === undefined ? '-' : q(start)}`);
    const label = sourceLabel(source, nameLabel);
    for (const rule of source.grammar.rules.values()) {
      lines.push(`rule ${q(rule.name)} ${rule.kind}:${normalize(rule.expression, label).text}${ruleFields(rule, label)}`);
      if (rule.concept !== undefined) lines.push(`concept ${q(rule.name)} ${q(rule.concept)}`);
      if (rule.sourceNames !== undefined) lines.push(`source-names ${q(rule.name)} ${q(rule.sourceNames)}`);
    }
    const declarations = declarationsText(grammarDeclarations(source.grammar));
    if (declarations.length > 0) lines.push(`declarations ${q(source.id)} ${q(declarations)}`);
  }
  for (const [first, second] of required) lines.push(`required ${q(first)} ${q(second)}`);
  for (const [alias, values] of samples) {
    if (ids.has(sourceOf(alias))) lines.push(`samples ${q(alias)} ${values.map(q).join(',')}`);
  }
  for (const entry of decorators.forLevel('merge-decision')) lines.push(`decorator ${q(new DecoratorSet([entry]).toLino().trim())}`);
  return createHash('sha256').update(`${lines.join('\n')}\n`).digest('hex');
}

function sourceLabel(source, internal) {
  const format = formatOf(source);
  return (name) => (source.grammar.rules.has(name) ? internal(name) : `ext(${q(format)},${q(name)})`);
}

function nameLabel(name) {
  return `ref(${q(name)})`;
}

function mergeGroup(entry, fingerprint, samples, previousIdentities, decorators, reconcile) {
  const nodes = [];
  const index = new Map();
  const externals = new Set();
  for (const source of entry.sources) {
    let position = 0;
    for (const rule of source.grammar.rules.values()) {
      const alias = `${source.id}:${rule.name}`;
      index.set(alias, nodes.length);
      nodes.push({ alias, source, position, name: rule.name, kind: rule.kind, expression: rule.expression, rule });
      position += 1;
    }
    for (const name of source.grammar.referencedNonterminals()) {
      if (!source.grammar.rules.has(name)) externals.add(name);
    }
  }

  const strict = refine(nodes, index);
  const reconciled = reconcile ? reconcileClasses(nodes, index, strict, sourceLabel) : null;
  const classes = reconciled ? reconciled.classes : strict;
  const members = new Map();
  for (const [position, node] of nodes.entries()) {
    const id = classes[position];
    if (!members.has(id)) members.set(id, []);
    members.get(id).push(node);
  }
  const classOrder = [...members.keys()];

  const names = new Map();
  const taken = new Set(externals);
  const renamed = new Map();
  for (const id of classOrder) {
    for (const node of members.get(id)) {
      const previous = previousIdentities[node.alias];
      if (previous !== undefined && !taken.has(previous)) {
        names.set(id, previous);
        taken.add(previous);
        break;
      }
    }
  }
  for (const id of classOrder) {
    if (names.has(id)) continue;
    const best = members.get(id)[0];
    let name = best.name;
    if (taken.has(name)) {
      const base = `${best.name}_from_${best.source.id.replace(/[^A-Za-z0-9_]/gu, '_')}`;
      name = base;
      for (let suffix = 2; taken.has(name); suffix += 1) name = `${base}_${suffix}`;
      renamed.set(id, best.name);
    }
    names.set(id, name);
    taken.add(name);
  }

  const canonicalOf = (node) => names.get(classes[index.get(`${node.source.id}:${node.name}`)]);
  const rules = new Map();
  const definitions = new Map();
  const concepts = new Map();
  const sourceProductions = [];
  for (const id of classOrder) {
    const group = members.get(id);
    const representative = group[0];
    const productionRules = group.map((node) => {
      const rename = (name) => (node.source.grammar.rules.has(name)
        ? names.get(classes[index.get(`${node.source.id}:${name}`)])
        : name);
      const rule = renamedRule(node.rule, rename);
      sourceProductions.push({
        alias: node.alias,
        canonical: names.get(id),
        sourceFormat: formatOf(node.source),
        rule: node.rule,
        renamedRule: rule,
      });
      return rule;
    });
    const renamed = productionRules[0];
    const proven = group.every((node) => strict[index.get(node.alias)] === strict[index.get(representative.alias)]);
    const form = normalize(!preserveSourceAlternatives(proven, group.length > 1) ? renamed.expression : {
      kind: 'choice',
      ordered: false,
      items: productionRules.map((rule) => wrapLexicalProduction(rule.kind === 'token', renamed.kind === 'token')
        ? { kind: 'token', item: rule.expression }
        : rule.expression),
    }, nameLabel);
    // A reconciled rule takes the concept record of the first of its rules
    // that has one, so corresponding rules of every source share it.
    const concept = reconcile ? members.get(id).find((node) => node.rule.concept !== undefined)?.rule.concept : undefined;
    const sourceNames = group.length === 1 ? renamed.sourceNames : preservedSourceNames(group);
    rules.set(names.get(id), {
      ...renamed,
      expression: form.expr,
      ...(concept === undefined ? {} : { concept }),
      ...(sourceNames === undefined ? {} : { sourceNames }),
    });
    if (concept !== undefined) concepts.set(id, concept);
    definitions.set(id, `${representative.kind}:${form.text}${ruleFields(renamed, nameLabel)}`);
  }
  const merged = mergeDeclarations(entry.sources, (source, name) => (source.grammar.rules.has(name)
    ? names.get(classes[index.get(`${source.id}:${name}`)])
    : name));

  const startClasses = [];
  for (const source of entry.sources) {
    const start = source.grammar.startRule();
    if (!start) continue;
    const id = classes[index.get(`${source.id}:${start.name}`)];
    if (!startClasses.includes(id)) startClasses.push(id);
  }
  if (reconcile && startClasses.length > 1) {
    const first = startClasses[0];
    const name = names.get(first);
    const root = rules.get(name);
    const form = normalize({
      kind: 'choice', ordered: false,
      items: [root.expression, ...startClasses.slice(1).map((id) => ({ kind: 'ref', name: names.get(id) }))],
    }, nameLabel);
    const rule = { ...root, expression: form.expr };
    rules.set(name, rule);
    definitions.set(first, `${rule.kind}:${form.text}${ruleFields(rule, nameLabel)}`);
  }
  const formats = new Set(entry.sources.map(formatOf));
  const grammar = new Grammar(
    startClasses.length === 0 ? null : names.get(startClasses[0]),
    rules,
    formats.size === 1 ? entry.sources[0].grammar.sourceFormat : 'meta-language',
    merged.declarations,
  );

  const identities = {};
  for (const node of nodes) identities[node.alias] = canonicalOf(node);

  const decisions = [];
  for (const id of classOrder) {
    const group = members.get(id);
    const proven = group.every((node) => strict[index.get(node.alias)] === strict[index.get(group[0].alias)]);
    decisions.push({
      kind: group.length === 1 ? 'kept-unique' : proven ? 'merged' : 'reconciled',
      name: names.get(id),
      members: group.map(({ alias }) => alias),
      basis: group.length === 1 ? 'no-equivalent-rule' : proven ? GRAMMAR_MERGE_METHOD : reconciled.bases.get(id),
      definition: definitions.get(id),
      ...(concepts.has(id) ? { concept: concepts.get(id) } : {}),
    });
    if (renamed.has(id)) {
      decisions.push({
        kind: 'renamed-for-collision',
        name: names.get(id),
        members: [group[0].alias],
        basis: 'precedence',
        definition: null,
      });
    }
  }

  const alternatives = [];
  if (startClasses.length > 1) {
    alternatives.push({
      reason: 'start-rule',
      name: names.get(startClasses[0]),
      options: startClasses.slice(1).map((id) => names.get(id)),
    });
  }
  const byName = new Map();
  for (const id of classOrder) {
    for (const node of members.get(id)) {
      if (!byName.has(node.name)) byName.set(node.name, []);
      if (!byName.get(node.name).includes(id)) byName.get(node.name).push(id);
    }
  }
  for (const name of [...byName.keys()].sort(compareText)) {
    const ids = byName.get(name);
    if (ids.length < 2) continue;
    const options = ids.map((id) => names.get(id));
    decisions.push({ kind: 'homonym-kept-distinct', name, members: options, basis: 'different-definitions', definition: null });
    alternatives.push({ reason: 'distinct-meaning', name, options });
  }

  const nominations = nominate(nodes, classes, strict, samples);
  for (const nomination of nominations) {
    if (nomination.outcome !== 'unproven') continue;
    const [first, second] = nomination.members.map((alias) => identities[alias]);
    decisions.push({ kind: 'uncertain', name: first, members: nomination.members, basis: nomination.basis, definition: null });
    alternatives.push({ reason: 'uncertain-match', name: nomination.basis, options: [first, second] });
  }
  for (const conflict of merged.conflicts) {
    decisions.push({ kind: 'declaration-conflict', name: conflict.name, members: conflict.members, basis: conflict.basis, definition: null });
    alternatives.push({ reason: 'declaration-conflict', name: conflict.name, options: conflict.members });
  }

  return {
    key: groupKey(entry.language, entry.edition),
    language: entry.language,
    edition: entry.edition,
    fingerprint,
    sources: entry.sources.map(({ id }) => id),
    grammar,
    identities,
    sourceProductions,
    decisions: decorateDecisions(decisions, decorators),
    nominations,
    alternatives,
  };
}

// Original aliases and upstream aliases remain available after merging. A
// correspondence never erases the grammar production that nominated it.
function preservedSourceNames(nodes) {
  const aliases = new Map();
  for (const node of nodes) {
    for (const alias of [{ source: node.source.id, name: node.name }, ...(node.rule.sourceNames ?? [])]) {
      aliases.set(`${alias.source}\u0000${alias.name}`, { ...alias });
    }
  }
  return [...aliases.values()];
}

// The decisions the `merge-decision` decorators leave, with `kind` and
// `basis` as they set them; the other fields describe the merged grammar and
// stay as they are.
function decorateDecisions(decisions, decorators) {
  if (!decorators.has('merge-decision')) return decisions;
  return decisions.flatMap((decision) => {
    const decorated = decorators.decorate('merge-decision', {
      kind: decision.kind,
      name: decision.name,
      members: decision.members.join(' '),
      basis: decision.basis,
      definition: decision.definition ?? '',
    });
    return decorated === null ? [] : [{ ...decision, kind: decorated.kind, basis: decorated.basis }];
  });
}

// Greatest structural bisimulation by partition refinement: rules start in one
// class per normalized shape and are split until every member of a class
// references members of the same classes in the same way. Class numbers are
// ranks of sorted signatures, so they do not depend on the input order.
function refine(nodes, index) {
  let classes = nodes.map(() => 0);
  let count = 0;
  for (;;) {
    const current = classes;
    const keys = nodes.map((node, position) => {
      const label = sourceLabel(node.source, (name) => `#${current[index.get(`${node.source.id}:${name}`)]}`);
      const concept = node.rule.concept === undefined ? '' : `|concept:${q(node.rule.concept)}`;
      return `${count === 0 ? '' : current[position]}|${node.kind}:${normalize(node.expression, label).text}${ruleFields(node.rule, label)}${concept}`;
    });
    const ranks = new Map([...new Set(keys)].sort(compareText).map((key, rank) => [key, rank]));
    classes = keys.map((key) => ranks.get(key));
    if (ranks.size === count) return classes;
    count = ranks.size;
  }
}

// Merges the declarations of the sources in precedence order, with each
// source's rule names renamed to their canonical names. Imports, modes,
// extras, conflict groups and precedence orders are united; the first declared matching, macro
// or scanner of a name wins, and a later different one is a conflict. The
// settling is the one the source of the matching declares (none: its
// matching's default), else the first declared: a merged grammar settles
// its parses as the source it matches like.
function mergeDeclarations(sources, canonical) {
  const settlings = [];
  const declarations = { matching: null, settling: null, imports: [], modes: [], extras: [], conflicts: [], precedences: [], macros: [], scanners: [] };
  const conflicts = [];
  const seen = { extras: new Set(), conflicts: new Set(), precedences: new Set(), macros: new Map(), scanners: new Map() };
  let matchingOwner = null;
  const line = (entry) =>
    renderDeclarationLinks({ imports: [], modes: [], extras: [], conflicts: [], precedences: [], macros: [], scanners: [], ...entry })[0];
  for (const source of sources) {
    const own = mapDeclarations(grammarDeclarations(source.grammar), (name) => canonical(source, name));
    settlings.push({ owner: source.id, settling: own.settling ? [...own.settling] : null });
    if (own.matching !== undefined) {
      if (declarations.matching === null) {
        declarations.matching = own.matching;
        matchingOwner = source.id;
      } else if (declarations.matching !== own.matching) {
        conflicts.push({ name: 'matching', basis: 'different-matching', members: [matchingOwner, source.id] });
      }
    }
    for (const name of own.imports) if (!declarations.imports.includes(name)) declarations.imports.push(name);
    for (const name of own.modes) if (!declarations.modes.includes(name)) declarations.modes.push(name);
    for (const [field, key] of [['extras', renderLinksExpression], ['conflicts', (group) => line({ conflicts: [group] })], ['precedences', (order) => line({ precedences: [order] })]]) {
      for (const entry of own[field]) {
        const text = key(entry);
        if (seen[field].has(text)) continue;
        seen[field].add(text);
        declarations[field].push(entry);
      }
    }
    for (const [field, basis] of [['macros', 'different-macro'], ['scanners', 'different-scanner']]) {
      for (const entry of own[field]) {
        const text = line({ [field]: [entry] });
        const first = seen[field].get(entry.name);
        if (first === undefined) {
          seen[field].set(entry.name, { text, owner: source.id });
          declarations[field].push(entry);
        } else if (first.text !== text) {
          conflicts.push({ name: entry.name, basis, members: [first.owner, source.id] });
        }
      }
    }
  }
  declarations.settling = matchingOwner === null
    ? settlings.find(({ settling }) => settling !== null)?.settling ?? null
    : settlings.find(({ owner }) => owner === matchingOwner).settling;
  if (declarations.matching === null) delete declarations.matching;
  if (declarations.settling === null) delete declarations.settling;
  return { declarations, conflicts };
}

function nominate(nodes, classes, strict, samples) {
  const nominations = [];
  const seen = new Set();
  const add = (basis, first, second) => {
    const key = `${basis}\u0000${first.alias}\u0000${second.alias}`;
    if (seen.has(key)) return;
    seen.add(key);
    nominations.push({
      basis,
      members: [first.alias, second.alias],
      outcome: strict[first.position] === strict[second.position]
        ? 'proven'
        : classes[first.position] === classes[second.position] ? 'reconciled' : 'unproven',
    });
  };
  const located = nodes.map((node, position) => ({ ...node, position }));
  const byKey = new Map();
  for (const node of located) {
    const key = node.name.toLowerCase().replace(/[-_]/gu, '');
    if (!byKey.has(key)) byKey.set(key, []);
    byKey.get(key).push(node);
  }
  for (const group of byKey.values()) {
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) {
        if (group[left].name !== group[right].name) add('name-similarity', group[left], group[right]);
      }
    }
  }
  const bySamples = new Map();
  for (const node of located) {
    const values = samples.get(node.alias);
    if (!values) continue;
    const key = values.map(q).join(',');
    if (!bySamples.has(key)) bySamples.set(key, []);
    bySamples.get(key).push(node);
  }
  for (const group of bySamples.values()) {
    for (let left = 0; left < group.length; left += 1) {
      for (let right = left + 1; right < group.length; right += 1) add('identical-samples', group[left], group[right]);
    }
  }
  return nominations;
}

function editionAlternatives(groups) {
  const editions = new Map();
  for (const group of groups) {
    if (!editions.has(group.language)) editions.set(group.language, []);
    editions.get(group.language).push(group.edition);
  }
  return [...editions.entries()]
    .filter(([, list]) => list.length > 1)
    .map(([language, list]) => ({ reason: 'edition', name: language, options: list }));
}

function requiredFailures(required, groups) {
  const groupOf = new Map();
  for (const group of groups) for (const id of group.sources) groupOf.set(id, group);
  const failures = [];
  for (const members of required) {
    const owners = members.map((alias) => groupOf.get(sourceOf(alias)));
    const names = members.map((alias, position) => owners[position]?.identities[alias]);
    let reason = null;
    if (names.some((name) => name === undefined)) reason = 'unknown-rule';
    else if (owners[0] !== owners[1]) reason = 'different-language-or-edition';
    else if (names[0] !== names[1]) reason = 'not-proven';
    if (reason !== null) failures.push({ kind: 'unresolved-required-equivalence', members, reason });
  }
  return failures;
}
