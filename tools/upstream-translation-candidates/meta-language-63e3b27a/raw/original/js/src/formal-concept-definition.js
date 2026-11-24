import { readRuntimeProjectData } from './project-data-loader.js';
// Equality of rooted operational definitions under declared shared primitives.
// The correspondence and its two premises are themselves inspectable links.
import { LinkNetwork } from './network.js';
import { LinkId, LinkMetadata, LinkType } from './primitives.js';
import { decodeTypedProgramLinks, encodeTypedProgramLinks, emitTypedProgramLinks, readTypedProgramBindingIdentities } from './typed-program-links.js';
import { verifyGlobalConceptCorrespondence } from './global-concept-rules.js';
import { acceptFormalRelationEdgeIdentity, acceptFormalRelationIdentity, acceptFormalRelationLabelIdentity } from './formal-relation-rules.js';
import { readSharedNumericFunctionModel, createSharedNumericFunctionMeaning, SHARED_NUMERIC_FUNCTION_MODEL } from './shared-numeric-function-model.js';

const LANGUAGE = 'meta-language formal definition';
const SCHEMA = '1';
const ROOT = 'formal concept definition';
const CERTIFICATE = 'formal equivalence certificate';
const PAIRS = 'formal node correspondence list';
const PAIR = 'formal node correspondence';
const MODELS = Object.freeze(readRuntimeProjectData(new URL('./data/formal-concept-models.lino', import.meta.url)));
const key = (id) => LinkId.from(id).asU64();
const canonical = (value) => JSON.stringify(value);
const metadata = (term, definition) => LinkMetadata.new().withLinkType(LinkType.Semantic).withLanguage(LANGUAGE).withNamed(true).withTerm(term).withDefinition(definition);

function archive(value) {
  const network = value?.network ?? (typeof value?.links === 'string' ? LinkNetwork.fromLino(value.links) : null);
  if (!(network instanceof LinkNetwork) || value.root === undefined) throw new TypeError('a formal definition needs a linked archive and a root');
  return { network, root: LinkId.from(value.root) };
}

function data(network, value) {
  if (Array.isArray(value)) return network.insertLink(value.map((item) => data(network, item)), metadata('formal declaration list'));
  if (value !== null && typeof value === 'object') {
    const id = network.insertLink([], metadata('formal declaration'));
    for (const name of Object.keys(value).sort()) network.insertFieldRelation(id, name, data(network, value[name]));
    return id;
  }
  if (!['string', 'number', 'boolean'].includes(typeof value)) throw new TypeError('formal primitive declarations contain only linked data');
  return network.insertLink([], metadata(`formal declaration ${typeof value}`, String(value)));
}

function fields(network) {
  const result = new Map();
  for (const link of network.links()) {
    if (link.metadata().linkType !== LinkType.Field) continue;
    const references = link.references();
    // Label points are vertices, not outgoing labeled relations.
    if (references.length === 0 || references.length === 1 && key(references[0]) === key(link.id())) continue;
    const labelId = references[1];
    const labelLink = labelId === undefined ? null : network.link(labelId);
    const label = labelLink?.metadata().term ?? '';
    const relation = { link, parent: references[0], label, labelId, child: references[2] };
    const parent = key(relation.parent);
    if (!result.has(parent)) result.set(parent, []);
    result.get(parent).push(relation);
  }
  for (const relations of result.values()) relations.sort((first, second) => first.label < second.label ? -1 : first.label > second.label ? 1 : 0);
  return result;
}

function admittedRelation(network, relation, sameLabelIdentity) {
  const label = relation.labelId === undefined ? null : network.link(relation.labelId);
  const value = label?.metadata();
  const edge = relation.link.metadata();
  const labelAdmitted = acceptFormalRelationLabelIdentity(value?.linkType ?? '', value?.definition ?? '', value?.term !== undefined,
    value?.language !== undefined, value?.named ?? false,
    label != null && label.references().length === 1 && key(label.references()[0]) === key(relation.labelId));
  const relationAdmitted = acceptFormalRelationEdgeIdentity(edge.linkType ?? '', edge.language !== undefined, edge.term !== undefined,
    edge.definition !== undefined, edge.named ?? false, relation.link.references().length);
  return acceptFormalRelationIdentity(labelAdmitted, relationAdmitted, sameLabelIdentity);
}

// Ordered references and labeled relations are both edges. Sharing and cycles
// remain observable, rather than being unfolded into trees or gloss strings.
function graph(network, root, exclusions = new Set()) {
  const relations = fields(network);
  const pending = [LinkId.from(root)];
  const indices = new Map([[key(root), 0]]);
  const shapes = [];
  const offsets = [0];
  const edges = [];
  const entries = [];
  const labelIdentities = new Map();
  const edge = (id) => {
    const identity = key(id);
    if (!indices.has(identity)) { indices.set(identity, pending.length); pending.push(LinkId.from(id)); }
    edges.push(indices.get(identity));
  };
  for (let at = 0; at < pending.length; at += 1) {
    if (pending.length > 100_000) throw new TypeError('the formal definition exceeds its graph resource limit');
    const id = pending[at];
    const link = network.link(id);
    if (!link) throw new TypeError('a formal definition contains a dangling reference');
    const value = link.metadata();
    const positional = link.references();
    const outgoing = relations.get(key(id)) ?? [];
    const labels = new Set();
    for (const relation of outgoing) {
      const previous = labelIdentities.get(relation.label);
      if (!admittedRelation(network, relation, previous === undefined || previous === key(relation.labelId))) throw new TypeError('a formal definition contains an unsupported relation identity');
      if (labels.has(relation.label)) throw new TypeError('a formal definition contains a duplicate relation label');
      labels.add(relation.label);
      labelIdentities.set(relation.label, key(relation.labelId));
    }
    const selected = outgoing.filter(({ label }) => !exclusions.has(`${key(id)}:${label}`));
    const shape = canonical([value.linkType, value.language ?? null, value.term ?? null, value.definition ?? null, value.named ?? null, positional.length, selected.map(({ label }) => label)]);
    shapes.push(shape);
    entries.push({ id, metadata: value, references: positional, fields: selected });
    for (const reference of positional) edge(reference);
    for (const { child } of selected) edge(child);
    offsets.push(edges.length);
  }
  return { shapes, offsets, edges, entries, indices };
}

function matrices(first, second) {
  return {
    shapes: [...first.shapes, ...second.shapes],
    meanings: Array(first.shapes.length + second.shapes.length).fill('declared shared formal primitives'),
    offsets: [...first.offsets, ...second.offsets.slice(1).map((offset) => offset + first.edges.length)],
    edges: [...first.edges, ...second.edges.map((edge) => edge + first.shapes.length)],
  };
}

function correspondence(first, second) {
  const left = [];
  const right = [];
  const forward = new Map();
  const reverse = new Map();
  const pending = [[0, 0]];
  for (let at = 0; at < pending.length; at += 1) {
    const [one, other] = pending[at];
    if (forward.has(one) || reverse.has(other)) {
      if (forward.get(one) !== other || reverse.get(other) !== one) return null;
      continue;
    }
    if (first.shapes[one] !== second.shapes[other]) return null;
    forward.set(one, other); reverse.set(other, one);
    left.push(one); right.push(other);
    const count = first.offsets[one + 1] - first.offsets[one];
    if (count !== second.offsets[other + 1] - second.offsets[other]) return null;
    for (let edge = 0; edge < count; edge += 1) pending.push([first.edges[first.offsets[one] + edge], second.edges[second.offsets[other] + edge]]);
  }
  const combined = matrices(first, second);
  return left.length === first.shapes.length && right.length === second.shapes.length
    && verifyGlobalConceptCorrespondence(combined.shapes, combined.meanings, combined.offsets, combined.edges, left, right.map((index) => index + first.shapes.length))
    ? left.map((index, at) => [index, right[at]]) : null;
}

function bindingExclusions(network, body, exclusions, bindings) {
  const semantic = graph(network, body, exclusions);
  const protectedNames = new Set();
  const visitedTypes = new Set();
  const pending = [];
  for (const entry of semantic.entries) {
    const kind = entry.fields.find(({ label }) => label === 'construct kind');
    const record = kind && network.link(kind.child).metadata().definition === 'record';
    for (const relation of entry.fields) {
      if (['type', 'domain', 'return type', 'from', 'to', 'constructors'].includes(relation.label)) pending.push(relation.child);
      // Field descriptors name observable properties. They must retain that
      // role if a linked edit aliases one descriptor with a lexical binder.
      if (record && ['entries', 'fields'].includes(relation.label)) for (const member of network.link(relation.child).references()) protectedNames.add(key(member));
    }
  }
  for (let at = 0; at < pending.length; at += 1) {
    const id = pending[at];
    if (visitedTypes.has(key(id))) continue;
    visitedTypes.add(key(id));
    protectedNames.add(key(id));
    const entry = semantic.entries[semantic.indices.get(key(id))];
    if (!entry) continue;
    pending.push(...entry.references, ...entry.fields.map(({ child }) => child));
  }
  for (const id of bindings) if (!protectedNames.has(key(id))) exclusions.add(`${key(id)}:name`);
}

function checked(value) {
  const { network, root } = archive(value);
  const wrapper = network.link(root);
  if (!wrapper || wrapper.metadata().language !== LANGUAGE || wrapper.metadata().term !== ROOT || wrapper.metadata().definition !== SCHEMA || wrapper.references().length !== 2) throw new TypeError('unsupported or missing formal definition basis');
  const [body, basis] = wrapper.references();
  const modelLink = network.link(basis);
  const model = modelLink?.metadata().definition;
  if (!Object.hasOwn(MODELS, model ?? '') || modelLink.metadata().language !== LANGUAGE || modelLink.metadata().term !== 'formal primitive model' || modelLink.references().length !== 1) throw new TypeError('unsupported or counterfeit formal primitive model');
  const expected = new LinkNetwork();
  const expectedRoot = data(expected, MODELS[model]);
  if (!correspondence(graph(network, modelLink.references()[0]), graph(expected, expectedRoot))) throw new TypeError('the formal primitive model differs from its supported declaration');
  const exclusions = new Set([`${key(root)}:provenance`]);
  let meaning = network;
  if (model === 'checked typed program' || model === SHARED_NUMERIC_FUNCTION_MODEL) {
    decodeTypedProgramLinks(network, body);
    // Both emitters interpret this exact checked model. An unsupported IR
    // construct is an unknown formal basis, even if its host data is alike.
    emitTypedProgramLinks(network, body, 'JavaScript');
    emitTypedProgramLinks(network, body, 'Rust');
    for (const relation of network.fieldRelations()) {
      if (relation.label === 'source span' || key(relation.parent) === key(body) && relation.label === 'provenance') exclusions.add(`${key(relation.parent)}:${relation.label}`);
    }
    bindingExclusions(network, body, exclusions, readTypedProgramBindingIdentities(network, body));
    if (model === SHARED_NUMERIC_FUNCTION_MODEL) {
      const profile = readSharedNumericFunctionModel(network, body);
      exclusions.add(`${key(profile.languageParent)}:${profile.languageLabel}`);
      for (const field of profile.signatureFields) exclusions.add(`${key(field.parent)}:${field.label}`);
      meaning = createSharedNumericFunctionMeaning(network, profile);
    }
  } else {
    const expectedBody = data(expected, MODELS[model]);
    if (!correspondence(graph(network, body), graph(expected, expectedBody))) throw new TypeError('a source interpretation differs from its declared primitive meaning');
  }
  return { network, root, model, graph: graph(meaning, root, exclusions) };
}

/** Copy a checked operational definition and its supported primitive basis. */
export function encodeFormalConceptDefinition(value, { model = 'checked typed program', provenance } = {}) {
  if (!Object.hasOwn(MODELS, model)) throw new TypeError('unsupported formal primitive model');
  let network;
  let body;
  if (model === 'checked typed program' || model === SHARED_NUMERIC_FUNCTION_MODEL) {
    const input = value?.network || value?.links ? archive(value) : encodeTypedProgramLinks(value);
    network = LinkNetwork.fromLino(input.network.toLino());
    body = input.root;
  } else {
    if (value !== undefined && canonical(value) !== canonical(MODELS[model])) throw new TypeError('a source primitive has no declared formal interpretation');
    network = new LinkNetwork();
    body = data(network, MODELS[model]);
  }
  const basis = network.insertLink([data(network, MODELS[model])], metadata('formal primitive model', model));
  const root = network.insertLink([body, basis], metadata(ROOT, SCHEMA));
  if (provenance !== undefined) network.insertFieldRelation(root, 'provenance', data(network, provenance));
  const result = { network, root };
  checked(result);
  return result;
}

/** Portable preparation for the same generated verifier in both runtimes. */
export function readFormalConceptDefinition(value) {
  const result = checked(value);
  return { schemaVersion: 1, model: result.model, shapes: result.graph.shapes, offsets: result.graph.offsets, edges: result.graph.edges };
}

function snapshot(network, source) {
  const ids = source.entries.map(({ metadata: value }) => network.insertLink([], value));
  for (const [index, entry] of source.entries.entries()) {
    network.link(ids[index]).setReferences(entry.references.map((id) => ids[source.indices.get(key(id))]));
    for (const { label, child } of entry.fields) network.insertFieldRelation(ids[index], label, ids[source.indices.get(key(child))]);
  }
  return ids;
}

/** A closed correspondence proves equality under the declared model only. */
export function proveFormalConceptEquivalence(first, second) {
  let one;
  let other;
  try { one = checked(first); other = checked(second); } catch { return null; }
  if (one.model !== other.model) return null;
  const pairs = correspondence(one.graph, other.graph);
  if (!pairs) return null;
  const network = new LinkNetwork();
  const left = snapshot(network, one.graph);
  const right = snapshot(network, other.graph);
  const list = network.insertLink(pairs.map(([a, b]) => network.insertLink([left[a], right[b]], metadata(PAIR))), metadata(PAIRS));
  return { network, root: network.insertLink([left[0], right[0], list], metadata(CERTIFICATE, SCHEMA)) };
}

/** Recheck every premise and pair against the current operational definitions. */
export function verifyFormalConceptEquivalence(first, second, certificate) {
  try {
    const one = checked(first);
    const other = checked(second);
    if (one.model !== other.model) return false;
    const { network, root } = archive(certificate);
    const link = network.link(root);
    if (!link || link.metadata().language !== LANGUAGE || link.metadata().term !== CERTIFICATE || link.metadata().definition !== SCHEMA || link.references().length !== 3) return false;
    const [leftRoot, rightRoot, listRoot] = link.references();
    const left = graph(network, leftRoot);
    const right = graph(network, rightRoot);
    if (canonical([left.shapes, left.offsets, left.edges]) !== canonical([one.graph.shapes, one.graph.offsets, one.graph.edges]) || canonical([right.shapes, right.offsets, right.edges]) !== canonical([other.graph.shapes, other.graph.offsets, other.graph.edges])) return false;
    const list = network.link(listRoot);
    if (!list || list.metadata().language !== LANGUAGE || list.metadata().term !== PAIRS || list.references().length !== left.shapes.length || left.shapes.length !== right.shapes.length) return false;
    const firstIndices = [];
    const secondIndices = [];
    for (const id of list.references()) {
      const pair = network.link(id);
      if (!pair || pair.metadata().language !== LANGUAGE || pair.metadata().term !== PAIR || pair.references().length !== 2) return false;
      const [a, b] = pair.references();
      const firstIndex = left.indices.get(key(a));
      const secondIndex = right.indices.get(key(b));
      if (firstIndex === undefined || secondIndex === undefined) return false;
      firstIndices.push(firstIndex); secondIndices.push(secondIndex + left.shapes.length);
    }
    if (firstIndices[0] !== 0 || secondIndices[0] !== left.shapes.length) return false;
    const combined = matrices(left, right);
    return verifyGlobalConceptCorrespondence(combined.shapes, combined.meanings, combined.offsets, combined.edges, firstIndices, secondIndices);
  } catch { return false; }
}
