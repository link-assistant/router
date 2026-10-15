// Rooted linked views over global identities; no inference from grammar usage.
import { LinkNetwork } from './network.js';
import { LinkId, LinkMetadata, LinkType } from './primitives.js';
import { readDiscoveredConceptLinks } from './discovered-concept-links.js';
import { decodeStructuredDataLinks, encodeStructuredDataLinks } from './structured-data-links.js';
import { acceptConceptViewRelation, acceptConceptViewShape } from './concept-view-rules.js';

const LANGUAGE = 'meta-language concept views';
const LIMIT = 100000;
const BYTE_LIMIT = 128 * 1024 * 1024;
const key = id => LinkId.from(id).asU64();
const fail = message => { throw new TypeError(`concept views: ${message}`); };
const meta = (term, definition) => new LinkMetadata({ linkType: LinkType.Semantic, named: true, language: LANGUAGE, term, definition });
const ids = value => value.map(key);

function validate(network) {
  const links = network.links();
  if (links.length > LIMIT) fail('node resource limit exceeded');
  let references = 0;
  let bytes = 0;
  for (const link of links) {
    if (!Number.isSafeInteger(key(link.id())) || key(link.id()) <= 0) fail('invalid identity');
    for (const id of link.references()) if (!network.link(id) || !Number.isSafeInteger(key(id)) || key(id) <= 0) fail('foreign or dangling reference');
    references += link.references().length;
    for (const field of ['term', 'language', 'definition']) bytes += Buffer.byteLength(link.metadata()[field] ?? '', 'utf8');
    if (references > LIMIT || bytes > BYTE_LIMIT) fail('graph resource limit exceeded');
  }
}

function isolated(network, inventory, registration, owned) {
  const members = new Set(ids(inventory));
  if (members.size !== inventory.length || new Set(ids(registration)).size !== registration.length) fail('duplicate archive identity');
  const result = new LinkNetwork();
  for (const id of inventory) {
    const link = network.link(id);
    if (!link || owned.has(key(id)) || link.metadata().language === LANGUAGE || link.references().some(target => !members.has(key(target)))) fail('foreign archive identity');
    owned.add(key(id));
    result.insertLinkWithOptionalId(id, link.references(), link.metadata().clone());
  }
  for (const id of registration) {
    const term = result.link(id)?.metadata().term;
    if (typeof term !== 'string' || result._terms.has(term)) fail('foreign or ambiguous archive registration');
    result._terms.set(term, LinkId.from(id));
  }
  return result;
}

/**
 * Create separate ontology and taxonomy roots in one network. Orphans have
 * explicit identities and actual formal archives. Unknown interpretations are
 * retained, never promoted into semantic equivalence or hierarchy proofs.
 */
export function createConceptViews(base = null, options = {}) {
  const network = new LinkNetwork();
  const node = (term, references, definition) => network.insertLink(references, meta(term, definition));
  const sequence = references => node('concept view sequence', references);
  const archives = [];
  const copies = new Map();
  const identities = new Map();
  function copy(source) {
    if (copies.has(source)) return copies.get(source);
    validate(source);
    if (network.links().length + source.links().length > LIMIT) fail('node resource limit exceeded');
    const mapping = new Map();
    for (const link of source.links()) {
      if (link.metadata().language === LANGUAGE) fail('foreign view archive');
      mapping.set(key(link.id()), network.insertLink([], link.metadata().clone()));
    }
    for (const link of source.links()) network.link(mapping.get(key(link.id()))).setReferences(link.references().map(id => mapping.get(key(id))));
    const registered = [...(source._terms?.entries() ?? [])].map(([term, id]) => {
      if (source.link(id)?.metadata().term !== term) fail('inconsistent archive registration');
      return id;
    }).sort((first, second) => key(first) - key(second)).map(id => mapping.get(key(id)));
    const group = node('concept view archive', [sequence([...mapping.values()]), sequence(registered)]);
    archives.push(group);
    const result = { mapping, group };
    copies.set(source, result);
    return result;
  }
  function archive(value, role = 'concept view definition') {
    const source = value?.network ?? (typeof value?.links === 'string' ? LinkNetwork.fromLino(value.links) : null);
    if (!source || value.root === undefined) fail('missing linked interpretation');
    const { mapping, group } = copy(source);
    const root = mapping.get(key(value.root));
    if (!root) fail('foreign interpretation root');
    return node(role, [root, group]);
  }
  const bases = [];
  if (base !== null) {
    const checked = readDiscoveredConceptLinks(base.network, base.root);
    const { mapping, group } = copy(base.network);
    const root = mapping.get(key(base.root));
    const identityList = base.network.link(base.root).references()[2];
    for (const id of base.network.link(identityList).references()) {
      const name = base.network.link(id).metadata().definition;
      if (!checked.space.concepts.some(concept => concept.id === name) || identities.has(name)) fail('ambiguous base identity');
      identities.set(name, mapping.get(key(id)));
    }
    bases.push(node('concept view base', [root, group]));
  }
  const orphans = [];
  for (const orphan of options.orphans ?? []) {
    if (typeof orphan.identity !== 'string' || orphan.identity === '' || identities.has(orphan.identity)) fail('ambiguous or colliding declared identity');
    const definition = archive(orphan.definition);
    const provenance = archive(encodeStructuredDataLinks(orphan.provenance ?? {}), 'concept view provenance');
    const concept = node('concept view concept', [definition, provenance], orphan.identity);
    identities.set(orphan.identity, concept); orphans.push(concept);
  }
  const identity = name => identities.get(name) ?? fail('unknown concept identity');
  function view(role, values = {}) {
    const members = (values.members ?? [...identities.keys()]).map(identity);
    if (new Set(ids(members)).size !== members.length) fail('duplicate view membership');
    const memberSet = new Set(ids(members));
    const roots = (values.roots ?? []).map(value => {
      const target = identity(value.identity);
      if (!memberSet.has(key(target))) fail('root is outside view membership');
      const type = value.typeModel === undefined ? [] : [node('concept view root type declaration', [target, archive(value.typeModel)])];
      return node('concept view root', [target, sequence(type)]);
    });
    const relations = (values.relations ?? []).map(value => {
      if (!acceptConceptViewRelation(role, value.kind)) fail('relation does not belong to the selected view');
      const source = identity(value.source); const target = identity(value.target);
      if (![source, target].every(id => memberSet.has(key(id)))) fail('relation is outside view membership');
      return node('concept view relation', [source, target, archive(value.model)], value.kind);
    });
    return node(role, [sequence(members), sequence(roots), sequence(relations)]);
  }
  const ontology = view('ontology view', options.ontology);
  const taxonomy = view('taxonomy view', options.taxonomy);
  const root = node('concept view graph', [sequence(bases), sequence(orphans), sequence(archives), ontology, taxonomy], '1');
  validate(network);
  readConceptOntology(network, root);
  return { network, root, ontology, taxonomy };
}

function readViews(network, root) {
  if (!(network instanceof LinkNetwork)) fail('invalid graph');
  validate(network);
  const owned = new Set();
  function inspect(id, term) {
    const link = network.link(id); const value = link?.metadata();
    if (!value || value.term !== term || value.language !== LANGUAGE || value.linkType !== LinkType.Semantic || !value.named || value.span || Object.values(value.flags).some(Boolean)
      || !acceptConceptViewShape(term, String(link.references().length), value.definition !== undefined)) fail('invalid view role');
    owned.add(key(id)); return link;
  }
  const list = id => inspect(id, 'concept view sequence').references();
  const graph = inspect(root, 'concept view graph');
  if (graph.metadata().definition !== '1') fail('unsupported schema version');
  const [baseList, orphanList, archiveList, ontologyRoot, taxonomyRoot] = graph.references();
  const groups = new Map();
  for (const id of list(archiveList)) {
    if (groups.has(key(id))) fail('duplicate archive');
    const [inventory, registration] = inspect(id, 'concept view archive').references();
    groups.set(key(id), isolated(network, list(inventory), list(registration), owned));
  }
  function archive(id, role = 'concept view definition') {
    const [root, group] = inspect(id, role).references();
    const source = groups.get(key(group));
    if (!source?.link(root)) fail('foreign interpretation root');
    return { root, network: source };
  }
  const identities = new Map();
  const add = (name, id, definitions = [], provenance = null, provenanceRoots = []) => {
    if (typeof name !== 'string' || name === '' || identities.has(name)) fail('ambiguous or colliding declared identity');
    identities.set(name, { identity: name, link: key(id), definitionRoots: ids(definitions), provenanceRoots: ids(provenanceRoots), provenance });
  };
  const bases = list(baseList);
  if (bases.length > 1) fail('ambiguous grammar base');
  for (const id of bases) {
    const packet = archive(id, 'concept view base');
    const checked = readDiscoveredConceptLinks(packet.network, packet.root);
    const identityList = packet.network.link(packet.root).references()[2];
    for (const target of packet.network.link(identityList).references()) {
      const name = packet.network.link(target).metadata().definition;
      if (!checked.space.concepts.some(concept => concept.id === name)) fail('foreign global identity');
      const definitions = packet.network.link(target).references().flatMap(candidate => {
        const formalList = packet.network.link(candidate).references()[2];
        return packet.network.link(formalList).references().map(formal => packet.network.link(formal).references()[0]);
      });
      const provenanceRoots = packet.network.link(target).references().map(candidate => packet.network.link(candidate).references()[0]);
      add(name, target, [...new Map(definitions.map(id => [key(id), id])).values()], checked.space.concepts.find(concept => concept.id === name).origins, provenanceRoots);
    }
  }
  for (const id of list(orphanList)) {
    const concept = inspect(id, 'concept view concept');
    const [definition, provenance] = concept.references();
    const formal = archive(definition);
    const origin = archive(provenance, 'concept view provenance');
    add(concept.metadata().definition, id, [formal.root], decodeStructuredDataLinks(origin.network, origin.root), [origin.root]);
  }
  const known = new Set([...identities.values()].map(value => value.link));
  function view(id, role) {
    const [membersList, rootsList, relationsList] = inspect(id, role).references();
    const members = ids(list(membersList));
    if (new Set(members).size !== members.length || members.some(id => !known.has(id))) fail('foreign or duplicate membership');
    const roots = list(rootsList).map(id => {
      const [concept, declarations] = inspect(id, 'concept view root').references();
      if (!members.includes(key(concept))) fail('foreign root membership');
      const types = list(declarations);
      if (types.length > 1) fail('ambiguous root type declaration');
      let typeModel = null;
      if (types.length) {
        const [target, definition] = inspect(types[0], 'concept view root type declaration').references();
        if (key(target) !== key(concept)) fail('foreign root type declaration');
        typeModel = key(archive(definition).root);
      }
      return { link: key(id), concept: key(concept), typeModel };
    });
    if (new Set(roots.map(value => value.link)).size !== roots.length) fail('duplicate root entry');
    const relations = list(relationsList).map(id => {
      const link = inspect(id, 'concept view relation');
      const [source, target, definition] = link.references();
      const kind = link.metadata().definition;
      if (!acceptConceptViewRelation(role, kind) || ![source, target].every(value => members.includes(key(value)))) fail('foreign relation or classification role');
      return { link: key(id), source: key(source), target: key(target), kind, model: key(archive(definition).root) };
    });
    if (new Set(relations.map(value => value.link)).size !== relations.length) fail('duplicate relation entry');
    return { view: key(id), concepts: members.map(id => [...identities.values()].find(value => value.link === id)), roots, relations };
  }
  const ontology = view(ontologyRoot, 'ontology view'); const taxonomy = view(taxonomyRoot, 'taxonomy view');
  if (owned.size !== network.links().length) fail('unowned graph nodes');
  return { ontology, taxonomy };
}

function select(view, selectedRoot) {
  const selectedRoots = selectedRoot === undefined ? view.roots : view.roots.filter(root => root.link === key(selectedRoot));
  if (selectedRoot !== undefined && selectedRoots.length === 0) fail('unknown selected root');
  const reachable = []; const visited = new Set(); const pending = selectedRoots.map(root => root.concept);
  for (let at = 0; at < pending.length; at += 1) {
    const id = pending[at]; if (visited.has(id)) continue;
    visited.add(id); reachable.push(id);
    for (const edge of view.relations) if (edge.source === id) pending.push(edge.target);
  }
  return { ...view, selectedRoots: selectedRoots.map(root => root.link), reachable };
}

/** Read ontology concepts, declared relations and independently selected roots. */
export function readConceptOntology(network, root, options = {}) {
  return select(readViews(network, root).ontology, options.selectedRoot);
}

/** Read only explicit classification/subsumption declarations and their roots. */
export function readConceptTaxonomy(network, root, options = {}) {
  return select(readViews(network, root).taxonomy, options.selectedRoot);
}
