// Discovery output integration. Discovery and semantic inference themselves
// remain separate operations; finite parser examples are never proof premises.
import { isDeepStrictEqual } from 'node:util';
import { Grammar } from './grammar.js';
import { createGlobalConceptSpace } from './global-concept-space.js';
import { readFormalConceptDefinition } from './formal-concept-definition.js';
import { acceptDiscoveredConceptShape } from './discovered-concept-rules.js';
import { LinkNetwork } from './network.js';
import { LinkId, LinkMetadata, LinkType } from './primitives.js';
import { decodeStructuredDataLinks, encodeStructuredDataLinks } from './structured-data-links.js';

const language = 'meta-language discovered concepts';
const nodeLimit = 100000;
const byteLimit = 128 * 1024 * 1024;
const encoder = new TextEncoder();
const fail = message => { throw new TypeError(`discovered concepts: ${message}`); };
const key = id => LinkId.from(id).asU64();
const metadata = (term, definition) => new LinkMetadata({ linkType: LinkType.Semantic, named: true, language, term, definition });
const bareSpace = ({ formalDefinitions, ...space }) => space;

function validateNetwork(network) {
  const links = network.links();
  if (links.length > nodeLimit) fail('node resource limit exceeded');
  let references = 0;
  let bytes = 0;
  for (const link of links) {
    const targets = link.references();
    if (![link.id(), ...targets].every(id => Number.isSafeInteger(key(id)) && key(id) > 0)) fail('invalid graph identity');
    references += targets.length;
    for (const field of ['term', 'language', 'definition']) bytes += encoder.encode(link.metadata()[field] ?? '').length;
    if (references > nodeLimit || bytes > byteLimit) fail('graph resource limit exceeded');
  }
}

function copyNetwork(target, source) {
  validateNetwork(source);
  if (target.links().length + source.links().length > nodeLimit) fail('node resource limit exceeded');
  const ids = new Map();
  for (const link of source.links()) ids.set(key(link.id()), target.insertLink([], link.metadata().clone()));
  for (const link of source.links()) target.link(ids.get(key(link.id()))).setReferences(link.references().map(reference => {
    const id = ids.get(key(reference));
    if (!id) fail('dangling formal definition reference');
    return id;
  }));
  return ids;
}

// Explicit node inventories retain semantic reference cycles and disconnected
// provenance without permitting references into another candidate archive.
function island(network, ids, root, registered = []) {
  const result = new LinkNetwork();
  const members = new Set(ids.map(key));
  if (members.size !== ids.length || !members.has(key(root))) fail('invalid definition node inventory');
  for (const id of ids) {
    const link = network.link(id);
    if (!link || link.references().some(reference => !members.has(key(reference)))) fail('foreign or dangling definition reference');
    result.insertLinkWithOptionalId(id, link.references(), link.metadata().clone());
  }
  if (new Set(registered.map(key)).size !== registered.length) fail('duplicate registered definition point');
  for (const id of registered) {
    const term = result.link(id)?.metadata().term;
    if (typeof term !== 'string' || result._terms.has(term)) fail('foreign or ambiguous registered definition point');
    result._terms.set(term, LinkId.from(id));
  }
  return result;
}

function dataIsland(network, root) {
  const seen = new Set();
  const pending = [root];
  for (let at = 0; at < pending.length; at += 1) {
    const id = pending[at];
    if (seen.has(key(id))) continue;
    seen.add(key(id));
    const link = network.link(id);
    if (!link || seen.size > nodeLimit) fail('invalid data graph');
    pending.push(...link.references());
  }
  return island(network, [...seen].map(LinkId.from), root);
}

function sourcesFromData(values) {
  if (!Array.isArray(values)) fail('candidate sources must be an array');
  return values.map(source => {
    const value = source.grammar;
    if (!value || value.schemaVersion !== 1 || !Array.isArray(value.rules)) fail('invalid candidate grammar');
    const rules = new Map(value.rules.map(rule => [rule.name, rule]));
    if (rules.size !== value.rules.length) fail('duplicate candidate production');
    const grammar = new Grammar(value.start, rules, value.sourceFormat, value.declarations);
    grammar.kinds = value.kinds ?? [];
    if (value.start !== null && !grammar.startRule()) fail('missing candidate start production');
    return { id: source.id, language: source.language, edition: source.edition, grammar };
  });
}

function dependencies(expression, source, space) {
  const aliases = [];
  const pending = [expression];
  for (let at = 0; at < pending.length; at += 1) {
    const value = pending[at];
    if (!value || typeof value !== 'object') continue;
    if (at > nodeLimit) fail('production traversal resource limit exceeded');
    if (value.kind === 'ref' && typeof value.name === 'string' && Object.hasOwn(space.mappings, `${source}:${value.name}`)) aliases.push(space.mappings[`${source}:${value.name}`]);
    pending.push(...Object.values(value).filter(child => child && typeof child === 'object'));
  }
  return aliases;
}

function definitionAliases(origin, space, definitions, prepared) {
  const result = [origin.alias, origin.concept].filter(alias => Object.hasOwn(definitions, alias));
  const accepted = space.formalDefinitions[origin.alias];
  if (accepted) {
    const premise = readFormalConceptDefinition(accepted);
    for (const [alias, definition] of prepared) if (isDeepStrictEqual(premise, definition)) result.push(alias);
  }
  return [...new Set(result)];
}

function preparedDefinitions(definitions) {
  const prepared = new Map();
  for (const [alias, declared] of Object.entries(definitions)) {
    try { prepared.set(alias, readFormalConceptDefinition(declared)); }
    catch { /* Retained unsupported alternatives never serve as premises. */ }
  }
  return prepared;
}

/**
 * Integrate explicit discovery outputs using caller-provided semantic records.
 * Every formal archive is copied as links, including unsupported alternatives.
 * The existing global verifier alone decides whether identities can be shared.
 */
export function createDiscoveredConceptLinks(sources, options = {}) {
  const records = (options.records ?? []).map(({ formalDefinition, ...record }) => record);
  const definitions = { ...options.formalDefinitions };
  for (const record of options.records ?? []) if (record.formalDefinition && !Object.hasOwn(definitions, record.id)) definitions[record.id] = record.formalDefinition;
  const space = createGlobalConceptSpace(sources, { ...options, records, formalDefinitions: definitions });
  const previous = options.previous?.concepts?.map(({ id, origins }) => ({ id, origins })) ?? null;
  const value = { schemaVersion: 1, sources: sources.map(source => {
    const grammar = source.grammar.normalized();
    for (const rule of grammar.rules) {
      const original = source.grammar.rule(rule.name);
      if (original.concept !== undefined) rule.concept = original.concept;
      if (original.sourceNames !== undefined) rule.sourceNames = original.sourceNames;
    }
    grammar.kinds = source.grammar.kinds;
    return { id: source.id, language: source.language, edition: source.edition ?? '', grammar };
  }), records, equivalences: options.equivalences ?? [], previous, space: bareSpace(space) };
  const network = new LinkNetwork();
  const data = encodeStructuredDataLinks(value);
  const dataRoot = copyNetwork(network, data.network).get(key(data.root));
  const sequence = references => network.insertLink(references, metadata('discovered concept sequence'));
  const definitionIds = new Map();
  for (const [alias, declared] of Object.entries(definitions)) {
    const original = declared.network instanceof LinkNetwork ? declared.network : LinkNetwork.fromLino(declared.links);
    const ids = copyNetwork(network, original);
    const root = ids.get(key(declared.root));
    if (!root) fail('missing formal definition root');
    if (original._terms.size > ids.size) fail('invalid registered definition points');
    for (const [term, id] of original._terms) {
      if (original.link(id)?.metadata().term !== term) fail('inconsistent registered definition term');
    }
    const registered = [...original._terms.values()].sort((first, second) => key(first) - key(second)).map(id => ids.get(key(id)));
    definitionIds.set(alias, network.insertLink([root, sequence([...ids.values()]), sequence(registered)], metadata('discovered formal definition', alias)));
  }
  const identities = new Map(space.concepts.map(concept => [concept.id, network.insertLink([], metadata('discovered concept identity', concept.id))]));
  const prepared = preparedDefinitions(definitions);
  const candidates = [];
  for (const concept of space.concepts) {
    const members = [];
    for (const origin of concept.origins) {
      const data = encodeStructuredDataLinks(origin);
      const originRoot = copyNetwork(network, data.network).get(key(data.root));
      const formal = definitionAliases(origin, space, definitions, prepared).map(alias => definitionIds.get(alias));
      const definition = concept.definitions.find(definition => definition.origin === origin.alias).definition;
      const references = dependencies(definition.expression, origin.source, space).map(id => identities.get(id));
      const candidate = network.insertLink([originRoot, identities.get(concept.id), sequence(formal), sequence(references)], metadata('discovered concept candidate', origin.alias));
      members.push(candidate); candidates.push(candidate);
    }
    network.link(identities.get(concept.id)).setReferences(members);
  }
  const root = network.insertLink([dataRoot, sequence(candidates), sequence([...identities.values()]), sequence([...definitionIds.values()])], metadata('discovered concept graph', '1'));
  validateNetwork(network);
  return { network, root, space };
}

/** Reload candidate grammars and recheck identities and complete proof premises. */
export function readDiscoveredConceptLinks(network, root) {
  if (!(network instanceof LinkNetwork)) fail('invalid graph');
  validateNetwork(network);
  const owned = new Set();
  const inspect = (id, term) => {
    const link = network.link(id);
    const data = link?.metadata();
    if (!data || data.term !== term || data.linkType !== LinkType.Semantic || data.language !== language || !data.named || data.span || Object.values(data.flags).some(Boolean) || !acceptDiscoveredConceptShape(term, String(link.references().length), data.definition !== undefined)) fail('invalid discovery graph role');
    owned.add(key(id));
    return link;
  };
  const list = id => inspect(id, 'discovered concept sequence').references();
  const decode = id => {
    const graph = dataIsland(network, id);
    for (const link of graph.links()) owned.add(key(link.id()));
    return decodeStructuredDataLinks(graph, id);
  };
  const graph = inspect(root, 'discovered concept graph');
  if (graph.metadata().definition !== '1') fail('unknown schema version');
  const [dataRoot, candidateRoot, identityRoot, formalRoot] = graph.references();
  const value = decode(dataRoot);
  if (value.schemaVersion !== 1 || Object.keys(value).sort().join(',') !== 'equivalences,previous,records,schemaVersion,sources,space') fail('invalid discovery data envelope');
  const formalDefinitions = Object.create(null);
  const definitionIds = new Map();
  for (const id of list(formalRoot)) {
    const record = inspect(id, 'discovered formal definition');
    const alias = record.metadata().definition;
    if (!alias || Object.hasOwn(formalDefinitions, alias)) fail('duplicate formal interpretation');
    const [definition, inventory, registration] = record.references();
    const members = list(inventory);
    const formal = island(network, members, definition, list(registration));
    for (const link of formal.links()) {
      if (owned.has(key(link.id())) || link.metadata().language === language) fail('formal interpretations share foreign graph nodes');
      owned.add(key(link.id()));
    }
    formalDefinitions[alias] = { network: formal, root: definition };
    definitionIds.set(key(id), alias);
  }
  const sources = sourcesFromData(value.sources);
  const space = createGlobalConceptSpace(sources, { records: value.records, formalDefinitions, equivalences: value.equivalences, previous: value.previous === null ? undefined : { concepts: value.previous } });
  if (!isDeepStrictEqual(bareSpace(space), value.space)) fail('stale or counterfeit global concept certificate');
  const identities = new Map();
  const identitiesById = new Map();
  for (const id of list(identityRoot)) {
    const identity = inspect(id, 'discovered concept identity');
    const name = identity.metadata().definition;
    if (identities.has(name) || !space.concepts.some(concept => concept.id === name)) fail('unknown or duplicate global identity');
    identities.set(name, identity); identitiesById.set(key(id), name);
  }
  if (identities.size !== space.concepts.length) fail('missing global identity');
  const candidates = new Map();
  const prepared = preparedDefinitions(formalDefinitions);
  for (const id of list(candidateRoot)) {
    const candidate = inspect(id, 'discovered concept candidate');
    const alias = candidate.metadata().definition;
    if (candidates.has(alias) || !Object.hasOwn(space.mappings, alias)) fail('unknown or duplicate candidate origin');
    const [originRoot, identity, formal, referenceRoot] = candidate.references();
    const concept = space.concepts.find(concept => concept.id === space.mappings[alias]);
    const origin = concept.origins.find(origin => origin.alias === alias);
    if (!isDeepStrictEqual(decode(originRoot), origin) || identitiesById.get(key(identity)) !== concept.id) fail('foreign candidate provenance or identity');
    const expected = definitionAliases(origin, space, formalDefinitions, prepared);
    if (!isDeepStrictEqual(list(formal).map(id => definitionIds.get(key(id))), expected)) fail('foreign formal interpretation');
    const definition = concept.definitions.find(definition => definition.origin === alias).definition;
    if (!isDeepStrictEqual(list(referenceRoot).map(id => identitiesById.get(key(id))), dependencies(definition.expression, origin.source, space))) fail('foreign recursive concept dependency');
    candidates.set(alias, id);
  }
  if (candidates.size !== Object.keys(space.mappings).length) fail('missing discovered candidate');
  for (const concept of space.concepts) if (!isDeepStrictEqual(identities.get(concept.id).references().map(key), concept.origins.map(origin => key(candidates.get(origin.alias))))) fail('incomplete global identity membership');
  if (owned.size !== network.links().length) fail('unowned discovery graph nodes');
  return { sources, space, formalDefinitions };
}
