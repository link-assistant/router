// Every imported grammar contributes to one concept space. Productions remain
// language-owned; a concept is shared only after a closed one-to-one proof.
import { createHash } from 'node:crypto';
import { Parser } from 'links-notation';

import { CONCEPT_RECORDS } from './concept-records.js';
import { Grammar } from './grammar.js';
import { DEFAULT_SETTLING, grammarDeclarations } from './grammar-feature-forms.js';
import { parseGrammarLinks, percentDecodeLinksText, percentEncodeLinksText, renderDeclarationLinks, renderLinksExpression, renderRuleFieldLinks } from './grammar-links.js';
import { compareText } from './grammar-merge-normalize.js';
import { verifyGlobalConceptCorrespondence } from './global-concept-rules.js';
import { LANGUAGE_CATALOG, languageEntry } from './language-catalog.js';
import { LinkNetwork } from './network.js';
import { LinkId } from './primitives.js';
import { readFormalConceptDefinition } from './formal-concept-definition.js';

/** The decision procedure used for every shared global identity. */
export const GLOBAL_CONCEPT_PROOF_METHOD = 'recursive-structural-bijection';

const canonical = (value) => {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`).join(',')}}`;
  return JSON.stringify(value);
};
const digest = (value) => createHash('sha256').update(value).digest('hex');
const copy = (value) => JSON.parse(JSON.stringify(value));

function prepare(sources, records, formalDefinitions = {}) {
  if (!Array.isArray(sources)) throw new TypeError('global concept sources must be an array');
  const recordsByAlias = new Map();
  const recordsById = new Map();
  for (const record of records) {
    if (!recordsById.has(record.id)) recordsById.set(record.id, record);
    for (const alias of record.sourceAliases) {
      const key = canonical([alias.source, alias.name]);
      if (!recordsByAlias.has(key)) recordsByAlias.set(key, []);
      recordsByAlias.get(key).push(record);
    }
  }
  const sourceIds = new Set();
  const aliases = new Map();
  const nodes = [];
  const ambiguities = [];
  const formal = {};
  const ordered = [...sources].sort((first, second) => compareText(first.id ?? '', second.id ?? ''));
  for (const source of ordered) {
    if (typeof source.id !== 'string' || source.id === '' || typeof source.language !== 'string' || source.language === '' || (source.edition !== undefined && typeof source.edition !== 'string') || !(source.grammar instanceof Grammar)) throw new TypeError('a global concept source needs an identity, language, edition and imported grammar');
    if (sourceIds.has(source.id)) throw new TypeError(`duplicate global concept source ${source.id}`);
    sourceIds.add(source.id);
    const nativeSources = new Set([`native:${source.language}`]);
    for (const { id } of languageEntry(source.language)?.grammars ?? []) {
      const file = LANGUAGE_CATALOG.nativeGrammars?.[id]?.file;
      if (file) nativeSources.add(`native:${file.replace(/^.*\//u, '').replace(/\.lino$/u, '')}`);
    }
    for (const rule of [...source.grammar.rules.values()].sort((first, second) => compareText(first.name, second.name))) {
      const alias = `${source.id}:${rule.name}`;
      if (aliases.has(alias)) throw new TypeError(`colliding global concept origin ${alias}`);
      const sourceNames = (rule.sourceNames?.map((entry) => ({ ...entry })) ?? []).sort((first, second) => compareText(first.source, second.source) || compareText(first.name, second.name));
      const origin = { alias, source: source.id, language: source.language, edition: source.edition ?? '', rule: rule.name, concept: rule.concept ?? null, sourceNames };
      const spellings = [{ source: source.id, name: rule.name }, ...[...nativeSources].map((source) => ({ source, name: rule.name })), ...sourceNames];
      const matchingRecords = new Set(spellings.flatMap((alias) => recordsByAlias.get(canonical([alias.source, alias.name])) ?? []));
      const meanings = [...matchingRecords].map(({ id }) => id);
      if (rule.concept !== undefined && !meanings.includes(rule.concept)) meanings.push(rule.concept);
      meanings.sort(compareText);
      if (meanings.length > 1) ambiguities.push({ alias, meanings });
      aliases.set(alias, nodes.length);
      const record = meanings.length === 1 ? recordsById.get(meanings[0]) : null;
      // Catalog identifiers and prose identify candidates, never semantic
      // premises. Sharing requires an explicit supported operational graph.
      const declared = formalDefinitions[alias] ?? (record ? formalDefinitions[record.id] ?? record.formalDefinition : undefined);
      let meaning = `unproved:${canonical(origin)}`;
      if (declared && meanings.length <= 1) {
        try {
          meaning = canonical(readFormalConceptDefinition(declared));
          formal[alias] = { links: declared.network instanceof LinkNetwork ? declared.network.toLino() : LinkNetwork.fromLino(declared.links).toLino(), root: LinkId.from(declared.root).asU64() };
        } catch { /* Missing or counterfeit operational premises stay unknown. */ }
      }
      nodes.push({ source, rule, origin, meaning });
    }
  }
  return { ordered, aliases, nodes, ambiguities, formal };
}

// Replace only actual rule references. Capture labels, external token names,
// actions, modes and all other attributes remain in their own scopes.
function shapeValue(value, source, aliases, targets) {
  if (Array.isArray(value)) return value.map((entry) => shapeValue(entry, source, aliases, targets));
  if (value === null || typeof value !== 'object') return value;
  const shaped = {};
  for (const key of Object.keys(value).sort(compareText)) {
    if (value.kind === 'ref' && key === 'name' && typeof value.name === 'string') {
      const target = source.grammar.rules.has(value.name) ? aliases.get(`${source.id}:${value.name}`) : undefined;
      // Unresolved imports and external bindings do not establish a cross-source proof.
      shaped.name = target === undefined ? { unresolved: source.id, name: value.name } : { reference: targets.length };
      if (target !== undefined) targets.push(target);
    } else shaped[key] = shapeValue(value[key], source, aliases, targets);
  }
  return shaped;
}

function production(rule) {
  const definition = { kind: rule.kind, expression: rule.expression };
  for (const key of ['parameters', 'channel', 'modes', 'action']) if (rule[key] !== undefined) definition[key] = rule[key];
  return definition;
}

function graphOf(nodes, aliases) {
  const shapes = [];
  const meanings = [];
  const offsets = [0];
  const edges = [];
  for (const node of nodes) {
    const targets = [];
    const declarations = grammarDeclarations(node.source.grammar);
    declarations.matching ??= 'generalized';
    declarations.settling ??= [...DEFAULT_SETTLING[declarations.matching]];
    const definition = shapeValue(production(node.rule), node.source, aliases, targets);
    const context = shapeValue(declarations, node.source, aliases, targets);
    shapes.push(canonical({ definition, context }));
    meanings.push(node.meaning);
    edges.push(...targets);
    offsets.push(edges.length);
  }
  return { shapes, meanings, offsets, edges };
}

function candidate(graph, first, second) {
  const one = [];
  const other = [];
  const firstMap = new Map();
  const secondMap = new Map();
  const pending = [[first, second]];
  for (let at = 0; at < pending.length; at += 1) {
    const [left, right] = pending[at];
    if (firstMap.has(left) || secondMap.has(right)) {
      if (firstMap.get(left) !== right || secondMap.get(right) !== left) return null;
      continue;
    }
    if (graph.shapes[left] !== graph.shapes[right] || graph.meanings[left] !== graph.meanings[right]) return null;
    firstMap.set(left, right);
    secondMap.set(right, left);
    one.push(left);
    other.push(right);
    const count = graph.offsets[left + 1] - graph.offsets[left];
    if (count !== graph.offsets[right + 1] - graph.offsets[right]) return null;
    for (let edge = 0; edge < count; edge += 1) pending.push([graph.edges[graph.offsets[left] + edge], graph.edges[graph.offsets[right] + edge]]);
  }
  return verifyGlobalConceptCorrespondence(graph.shapes, graph.meanings, graph.offsets, graph.edges, one, other) ? one.map((left, at) => [left, other[at]]) : null;
}

/**
 * Copy every rule from every imported language into one global space, then
 * share identities only after recursively proving a bijection of the entire
 * reachable rule graphs, including meanings and operational grammar context.
 * Required `equivalences` are alias pairs; unproved obligations remain failures.
 * `previous` preserves established identities during incremental import.
 */
export function createGlobalConceptSpace(sources, options = {}) {
  const { ordered, aliases, nodes, ambiguities, formal } = prepare(sources, options.records ?? CONCEPT_RECORDS, options.formalDefinitions);
  const graph = graphOf(nodes, aliases);
  const parents = nodes.map((_, index) => index);
  const find = (index) => { while (parents[index] !== index) index = parents[index]; return index; };
  const unite = (first, second) => {
    const one = find(first);
    const other = find(second);
    parents[Math.max(one, other)] = Math.min(one, other);
  };
  const proofs = [];
  // Exact shape and meaning nominate candidates. Neither nomination nor a
  // previous result can bypass the shared verifier on the current definitions.
  const buckets = new Map();
  nodes.forEach((node, index) => {
    const key = canonical([graph.shapes[index], graph.meanings[index]]);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(index);
  });
  for (const bucket of buckets.values()) {
    for (let at = 0; at < bucket.length; at += 1) {
      for (let other = at + 1; other < bucket.length; other += 1) {
        const first = bucket[at];
        const second = bucket[other];
        if (find(first) === find(second)) continue;
        const correspondence = candidate(graph, first, second);
        if (correspondence === null) continue;
        proofs.push({ method: GLOBAL_CONCEPT_PROOF_METHOD, first: nodes[first].origin.alias, second: nodes[second].origin.alias, correspondence: correspondence.map(([one, two]) => [nodes[one].origin.alias, nodes[two].origin.alias]) });
        for (const [one, two] of correspondence) unite(one, two);
      }
    }
  }
  const classes = new Map();
  nodes.forEach((node, index) => {
    const identity = find(index);
    if (!classes.has(identity)) classes.set(identity, []);
    classes.get(identity).push(index);
  });
  const previous = options.previous?.concepts ?? [];
  const concepts = [];
  const mappings = {};
  const redirects = {};
  for (const indices of classes.values()) {
    const origins = indices.map((index) => copy(nodes[index].origin));
    const present = new Set(origins.map(({ alias }) => alias));
    const established = previous.filter((concept) => {
      const surviving = concept.origins.map(({ alias }) => alias).filter((alias) => aliases.has(alias)).sort(compareText);
      return surviving.length > 0 && present.has(surviving[0]);
    }).map(({ id }) => id).sort(compareText);
    const id = established[0] ?? `global-concept.${digest(canonical(origins[0]))}`;
    for (const old of established.slice(1)) redirects[old] = id;
    const proofIndices = proofs.flatMap((proof, index) => proof.correspondence.some(([first, second]) => present.has(first) && present.has(second)) ? [index] : []);
    // All source definitions remain available even when the concept is shared.
    const definitions = indices.map((index) => ({ origin: nodes[index].origin.alias, definition: copy(production(nodes[index].rule)) }));
    concepts.push({ id, origins, definition: definitions[0].definition, definitions, proofs: proofIndices });
    for (const origin of origins) mappings[origin.alias] = id;
  }
  const failures = (options.equivalences ?? []).flatMap((members) => {
    if (!Array.isArray(members) || members.length !== 2 || members.some((alias) => typeof alias !== 'string')) throw new TypeError('a global concept equivalence names exactly two source rule aliases');
    if (members.some((alias) => !aliases.has(alias))) return [{ members: [...members], reason: 'unknown-origin' }];
    return mappings[members[0]] === mappings[members[1]] ? [] : [{ members: [...members], reason: 'no-one-to-one-proof' }];
  });
  return { schemaVersion: 1, sources: ordered.map(({ id, language, edition, grammar }) => ({ id, language, edition: edition ?? '', start: grammar.start, ruleOrder: grammar.ruleNames(), context: copy(grammarDeclarations(grammar)) })), concepts, mappings, proofs, failures, ambiguities, redirects, formalDefinitions: formal };
}

/** Resolve a construct through its proven global identity, retaining target alternatives. */
export function translateGlobalConstruct(space, alias, language, options = {}) {
  const empty = { relation: 'unknown', concept: null, origins: [], proofs: [] };
  if (space.ambiguities.some((entry) => entry.alias === alias)) return { ...empty, relation: 'ambiguous' };
  const id = space.mappings[alias];
  const concept = space.concepts.find((entry) => entry.id === id);
  if (!concept) return empty;
  const targetLanguage = languageEntry(language)?.name ?? language;
  const origins = concept.origins.filter((origin) => (languageEntry(origin.language)?.name ?? origin.language) === targetLanguage && (options.edition === undefined || origin.edition === options.edition)).map(copy);
  const relation = origins.length === 0 ? 'untranslatable' : origins.length === 1 ? 'translated' : 'ambiguous';
  return { relation, concept: id, origins, proofs: [...concept.proofs] };
}

/** Serialize the copied productions, qualified origins and proof witnesses as links. */
export function globalConceptSpaceToLinks(space) {
  const word = percentEncodeLinksText;
  const lines = ['(global-concept-space (schema-version 1))'];
  for (const source of space.sources) {
    const start = source.start === null ? '(start unspecified)' : `(start defined ${word(source.start)})`;
    lines.push(`(grammar-origin ${word(source.id)} ${word(source.language)} ${word(source.edition)} ${start} (rule-order ${source.ruleOrder.map(word).join(' ')}))`);
    if (source.context.matching !== null) lines.push(`(grammar-context ${word(source.id)} (matching ${word(source.context.matching)}))`);
    if (source.context.settling !== null) lines.push(`(grammar-context ${word(source.id)} (settling ${source.context.settling.map(word).join(' ')}))`);
    for (const declaration of renderDeclarationLinks(source.context)) lines.push(`(grammar-context ${word(source.id)} ${declaration})`);
  }
  for (const [alias, definition] of Object.entries(space.formalDefinitions ?? {})) lines.push(`(formal-origin-definition ${word(alias)} ${definition.root} (links ${definition.links.trim().replaceAll('\n', ' ')}))`);
  for (const { id, origins, definitions } of space.concepts) {
    lines.push(`(global-concept ${word(id)})`);
    for (const origin of origins) {
      lines.push(`(concept-origin ${word(id)} ${word(origin.alias)} (source ${word(origin.source)}) (language ${word(origin.language)}) (edition ${word(origin.edition)}) (rule ${word(origin.rule)})${origin.concept === null ? '' : ` (meaning ${word(origin.concept)})`})`);
      for (const alias of origin.sourceNames) lines.push(`(source-alias ${word(origin.alias)} ${word(alias.source)} ${word(alias.name)})`);
    }
    for (const { origin, definition } of definitions) lines.push(`(concept-definition ${word(id)} ${word(origin)} ${word(definition.kind)} ${renderLinksExpression(definition.expression)} ${renderRuleFieldLinks(definition).join(' ')})`);
  }
  for (const proof of space.proofs) lines.push(`(concept-proof ${word(proof.method)} ${word(proof.first)} ${word(proof.second)} (correspondence ${proof.correspondence.map(([first, second]) => `(${word(first)} ${word(second)})`).join(' ')}))`);
  for (const { members, reason } of space.failures) lines.push(`(unproved-equivalence ${members.map(word).join(' ')} ${word(reason)})`);
  for (const { alias, meanings } of space.ambiguities) lines.push(`(ambiguous-origin ${word(alias)} ${meanings.map(word).join(' ')})`);
  for (const [old, current] of Object.entries(space.redirects)) lines.push(`(concept-redirect ${word(old)} ${word(current)})`);
  return `${lines.join('\n')}\n`;
}

// Read the linked definitions directly; there is no serialized JSON or saved
// source envelope. The existing native grammar codec supplies the expression
// and operation readers, so the space cannot drift from grammar semantics.
const linkParts = (value) => {
  if (value.id !== null || value.values.length === 0 || value.values[0].id === null || value.values[0].values.length !== 0) throw new TypeError('expected a structured global concept link');
  return [value.values[0].id, value.values.slice(1)];
};
const linkWord = (value) => {
  if (!value || value.id === null || value.values.length !== 0) throw new TypeError('expected a global concept word');
  return percentDecodeLinksText(value.id);
};
const printLink = (value) => value.values.length === 0 ? value.id : `(${value.values.map(printLink).join(' ')})`;
const printNetworkLink = (value) => value.values.length === 0 ? value.id : `(${value.id === null ? '' : `${value.id}: `}${value.values.map(printNetworkLink).join(' ')})`;

/** Reload source-free links and recheck every recorded shared concept proof. */
export function readGlobalConceptSpaceLinks(source, options = {}) {
  const statements = new Parser({ comments: false }).parse(source);
  const space = { schemaVersion: 1, sources: [], concepts: [], mappings: {}, proofs: [], failures: [], ambiguities: [], redirects: {}, formalDefinitions: {} };
  const sourcesById = new Map();
  const conceptsById = new Map();
  const originsByAlias = new Map();
  const contexts = new Map();
  for (let at = 0; at < statements.length; at += 1) {
    const [head, args] = linkParts(statements[at]);
    if (at === 0) {
      if (head !== 'global-concept-space' || args.length !== 1 || printLink(args[0]) !== '(schema-version 1)') throw new TypeError('unsupported global concept space header');
      continue;
    }
    if (head === 'grammar-origin') {
      if (args.length !== 5) throw new TypeError('a grammar origin has source, language, edition, start and rule order');
      const [id, language, edition] = args.slice(0, 3).map(linkWord);
      const [startTag, startValues] = linkParts(args[3]);
      if (startTag !== 'start' || startValues.length < 1 || !['unspecified', 'defined'].includes(linkWord(startValues[0])) || startValues.length !== (linkWord(startValues[0]) === 'defined' ? 2 : 1)) throw new TypeError('invalid grammar origin start');
      const start = startValues.length === 1 ? null : linkWord(startValues[1]);
      const [orderTag, orderValues] = linkParts(args[4]);
      if (orderTag !== 'rule-order') throw new TypeError('missing grammar origin rule order');
      const ruleOrder = orderValues.map(linkWord);
      if (new Set(ruleOrder).size !== ruleOrder.length) throw new TypeError('duplicate grammar origin rule order');
      if (sourcesById.has(id)) throw new TypeError(`duplicate grammar origin ${id}`);
      const entry = { id, language, edition, start, ruleOrder, context: null };
      space.sources.push(entry);
      sourcesById.set(id, entry);
      contexts.set(id, []);
    } else if (head === 'grammar-context') {
      if (args.length !== 2 || !sourcesById.has(linkWord(args[0]))) throw new TypeError('unknown grammar context origin');
      contexts.get(linkWord(args[0])).push(args[1]);
    } else if (head === 'formal-origin-definition') {
      if (args.length !== 3 || Object.hasOwn(space.formalDefinitions, linkWord(args[0]))) throw new TypeError('invalid or duplicated formal origin definition');
      const [tag, links] = linkParts(args[2]);
      if (tag !== 'links') throw new TypeError('a formal origin needs actual linked definitions');
      const network = LinkNetwork.fromLino(`${links.map(printNetworkLink).join('\n')}\n`);
      const definition = { root: Number(linkWord(args[1])), links: network.toLino() };
      readFormalConceptDefinition(definition);
      space.formalDefinitions[linkWord(args[0])] = definition;
    } else if (head === 'global-concept') {
      if (args.length !== 1) throw new TypeError('a global concept has one identity');
      const id = linkWord(args[0]);
      if (conceptsById.has(id)) throw new TypeError(`duplicate global concept ${id}`);
      const entry = { id, origins: [], definition: null, definitions: [], proofs: [] };
      space.concepts.push(entry);
      conceptsById.set(id, entry);
    } else if (head === 'concept-origin') {
      if (args.length < 6 || args.length > 7) throw new TypeError('a concept origin has identity, alias and qualification fields');
      const id = linkWord(args[0]);
      const alias = linkWord(args[1]);
      const concept = conceptsById.get(id);
      if (!concept || originsByAlias.has(alias)) throw new TypeError('unknown concept or duplicate origin');
      const fields = {};
      for (const field of args.slice(2)) {
        const [key, values] = linkParts(field);
        if (!['source', 'language', 'edition', 'rule', 'meaning'].includes(key) || values.length !== 1 || Object.hasOwn(fields, key)) throw new TypeError(`invalid concept origin field ${key}`);
        fields[key] = linkWord(values[0]);
      }
      if (['source', 'language', 'edition', 'rule'].some((key) => !Object.hasOwn(fields, key))) throw new TypeError('incomplete concept origin qualification');
      const grammar = sourcesById.get(fields.source);
      if (!grammar || grammar.language !== fields.language || grammar.edition !== fields.edition || alias !== `${fields.source}:${fields.rule}`) throw new TypeError('inconsistent concept origin qualification');
      const origin = { alias, source: fields.source, language: fields.language, edition: fields.edition, rule: fields.rule, concept: fields.meaning ?? null, sourceNames: [] };
      concept.origins.push(origin);
      originsByAlias.set(alias, origin);
      space.mappings[alias] = id;
    } else if (head === 'source-alias') {
      if (args.length !== 3 || !originsByAlias.has(linkWord(args[0]))) throw new TypeError('unknown source alias origin');
      originsByAlias.get(linkWord(args[0])).sourceNames.push({ source: linkWord(args[1]), name: linkWord(args[2]) });
    } else if (head === 'concept-definition') {
      if (args.length < 4) throw new TypeError('incomplete concept definition');
      const id = linkWord(args[0]);
      const alias = linkWord(args[1]);
      const concept = conceptsById.get(id);
      if (!concept || space.mappings[alias] !== id || concept.definitions.some((entry) => entry.origin === alias)) throw new TypeError('unknown or duplicated concept definition origin');
      const grammar = parseGrammarLinks(`(grammar)\n(rule ${percentEncodeLinksText(alias)} ${printLink(args[2])} ${args.slice(3).map(printLink).join(' ')})\n`);
      const definition = copy(production(grammar.rule(alias)));
      concept.definitions.push({ origin: alias, definition });
      concept.definition ??= definition;
    } else if (head === 'concept-proof') {
      if (args.length !== 4) throw new TypeError('incomplete concept proof');
      const [tag, pairs] = linkParts(args[3]);
      if (tag !== 'correspondence') throw new TypeError('missing proof correspondence');
      const correspondence = pairs.map((pair) => {
        if (pair.id !== null || pair.values.length !== 2) throw new TypeError('invalid proof correspondence pair');
        return pair.values.map(linkWord);
      });
      space.proofs.push({ method: linkWord(args[0]), first: linkWord(args[1]), second: linkWord(args[2]), correspondence });
    } else if (head === 'unproved-equivalence') {
      if (args.length !== 3) throw new TypeError('invalid unproved equivalence');
      space.failures.push({ members: args.slice(0, 2).map(linkWord), reason: linkWord(args[2]) });
    } else if (head === 'ambiguous-origin') {
      if (args.length < 3) throw new TypeError('invalid ambiguous origin');
      space.ambiguities.push({ alias: linkWord(args[0]), meanings: args.slice(1).map(linkWord) });
    } else if (head === 'concept-redirect') {
      if (args.length !== 2) throw new TypeError('invalid concept redirect');
      const old = linkWord(args[0]);
      if (Object.hasOwn(space.redirects, old)) throw new TypeError('duplicate concept redirect');
      space.redirects[old] = linkWord(args[1]);
    } else throw new TypeError(`unknown global concept link ${head}`);
  }
  if (statements.length === 0) throw new TypeError('missing global concept space header');
  const imported = space.sources.map((entry) => {
    const context = contexts.get(entry.id);
    const header = context.filter((field) => ['matching', 'settling'].includes(linkParts(field)[0])).map(printLink);
    const declarations = context.filter((field) => !['matching', 'settling'].includes(linkParts(field)[0])).map(printLink);
    const placeholder = parseGrammarLinks(`(grammar ${header.join(' ')})\n${declarations.join('\n')}\n(rule placeholder normal (empty))\n`);
    entry.context = grammarDeclarations(placeholder);
    const rules = space.concepts.flatMap((concept) => concept.definitions.filter(({ origin }) => originsByAlias.get(origin).source === entry.id).map(({ origin, definition }) => {
      const provenance = originsByAlias.get(origin);
      return [provenance.rule, { ...definition, concept: provenance.concept ?? undefined, sourceNames: provenance.sourceNames }];
    }));
    const byName = new Map(rules);
    if (rules.length !== entry.ruleOrder.length || entry.ruleOrder.some((name) => !byName.has(name)) || (entry.start !== null && !byName.has(entry.start))) throw new TypeError('grammar origin start or rule order disagrees with copied productions');
    const orderedRules = entry.ruleOrder.map((name) => [name, byName.get(name)]);
    return { id: entry.id, language: entry.language, edition: entry.edition, grammar: new Grammar(entry.start, orderedRules, null, entry.context) };
  });
  if (space.concepts.some((concept) => concept.origins.length === 0 || concept.definitions.length !== concept.origins.length)) throw new TypeError('a copied global origin needs exactly one production');
  if (Object.keys(space.formalDefinitions).some((alias) => !originsByAlias.has(alias))) throw new TypeError('unknown formal definition origin');
  const { nodes, aliases } = prepare(imported, options.records ?? CONCEPT_RECORDS, space.formalDefinitions);
  const graph = graphOf(nodes, aliases);
  const witnessed = nodes.map((_, index) => index);
  const witnessRoot = (index) => { while (witnessed[index] !== index) index = witnessed[index]; return index; };
  for (const proof of space.proofs) {
    if (proof.method !== GLOBAL_CONCEPT_PROOF_METHOD || proof.correspondence.length === 0 || proof.correspondence[0][0] !== proof.first || proof.correspondence[0][1] !== proof.second || proof.correspondence.some((pair) => pair.some((alias) => !aliases.has(alias)))) throw new TypeError('invalid global concept proof witness');
    const first = proof.correspondence.map(([alias]) => aliases.get(alias));
    const second = proof.correspondence.map(([, alias]) => aliases.get(alias));
    if (!verifyGlobalConceptCorrespondence(graph.shapes, graph.meanings, graph.offsets, graph.edges, first, second)) throw new TypeError('unproved global concept correspondence');
    proof.correspondence.forEach(([one, other]) => {
      if (space.mappings[one] !== space.mappings[other]) throw new TypeError('a proof correspondence has different global identities');
      const oneRoot = witnessRoot(aliases.get(one));
      const otherRoot = witnessRoot(aliases.get(other));
      witnessed[Math.max(oneRoot, otherRoot)] = Math.min(oneRoot, otherRoot);
    });
  }
  const checked = createGlobalConceptSpace(imported, { records: options.records, previous: space, equivalences: space.failures.map(({ members }) => members), formalDefinitions: space.formalDefinitions });
  if (canonical(checked.mappings) !== canonical(space.mappings)) throw new TypeError('shared global identity lacks a current one-to-one proof');
  if (canonical(checked.failures) !== canonical(space.failures) || canonical(checked.ambiguities) !== canonical(space.ambiguities)) throw new TypeError('global concept uncertainty disagrees with current definitions');
  for (const concept of space.concepts) {
    const present = new Set(concept.origins.map(({ alias }) => alias));
    if (concept.origins.some(({ alias }) => witnessRoot(aliases.get(alias)) !== witnessRoot(aliases.get(concept.origins[0].alias)))) throw new TypeError('a shared global concept lacks its proof witnesses');
    concept.proofs = space.proofs.flatMap((proof, index) => proof.correspondence.some(([first, second]) => present.has(first) && present.has(second)) ? [index] : []);
  }
  for (const [old, current] of Object.entries(space.redirects)) if (conceptsById.has(old) || !conceptsById.has(current) || old === current) throw new TypeError('invalid global concept identity redirect');
  return space;
}
