// A bounded RDF 1.1 abstract graph boundary, not a concrete-syntax parser or an
// OWL reasoner. Every term, statement, occurrence and equality witness is a link.
import { LinkNetwork } from './network.js';
import { LinkId, LinkMetadata, LinkType } from './primitives.js';
import { readRuntimeProjectData } from './project-data-loader.js';
import { acceptResourceDescriptionUnicode, acceptResourceDescriptionIdentifier, acceptResourceDescriptionLanguage, sameResourceDescriptionTerm } from './resource-description-rules.js';

export const RESOURCE_DESCRIPTION_SCHEMA = Object.freeze(readRuntimeProjectData(new URL('./data/resource-description-schema.lino', import.meta.url)));
const schema = RESOURCE_DESCRIPTION_SCHEMA;
const key = id => id.asU64();
const units = text => Array.from({ length: text.length }, (_, index) => text.charCodeAt(index));
const failure = text => { throw new TypeError('resource description graph: ' + text); };
const metadata = (kind, definition) => LinkMetadata.new().withLinkType(LinkType.Semantic).withNamed(true)
  .withLanguage(schema.language).withTerm(schema.terms[kind]).withDefinition(definition);
const identityParts = term => term.kind === 'identifier' ? [term.value]
  : term.kind === 'blank' ? [term.sourceIdentifier, term.value] : [term.value, term.datatype, term.language];
const identity = term => [term.kind, ...identityParts(term)].map(value => value.length + ':' + value).join('');
const same = (left, right) => sameResourceDescriptionTerm(left.kind, identityParts(left), right.kind, identityParts(right));

function text(value, context) {
  if (typeof value !== 'string' || value.length > 65536 || !acceptResourceDescriptionUnicode(units(value))) failure(context + ' needs a bounded Unicode scalar string');
  return value;
}
function identifier(value) {
  text(value, 'an identifier');
  if (!acceptResourceDescriptionIdentifier(units(value))) failure('an absolute identifier is malformed or uses an unsupported bracketed address');
  return value;
}
function normalizeTerm(input, sourceIdentifier) {
  if (!input || ![Object.prototype, null].includes(Object.getPrototypeOf(input))) failure('a term must be a data record');
  if (Object.values(Object.getOwnPropertyDescriptors(input)).some(field => field.get || field.set)) failure('a term cannot execute host accessors');
  const fields = input.kind === 'identifier' ? ['kind', 'value'] : input.kind === 'blank' ? ['kind', 'value', 'sourceIdentifier']
    : input.kind === 'literal' ? ['kind', 'value', 'datatype', 'language'] : [];
  if (!fields.length || Reflect.ownKeys(input).some(field => !fields.includes(field))) failure('a term has an unknown field');
  const value = text(input.value, 'a term value');
  if (input.kind === 'identifier') return { kind: input.kind, value: identifier(value) };
  if (input.kind === 'blank') {
    if (!value.length) failure('a blank node needs a local label');
    const source = text(input.sourceIdentifier ?? sourceIdentifier, 'a blank node source');
    if (!source.length) failure('blank node identity needs a nonempty explicit source scope');
    return { kind: input.kind, value, sourceIdentifier: source };
  }
  const language = input.language === undefined ? '' : text(input.language, 'a language tag').toLowerCase();
  const datatype = identifier(input.datatype ?? (language ? schema.languageDatatype : schema.stringDatatype));
  if (language) {
    if (datatype !== schema.languageDatatype || !acceptResourceDescriptionLanguage(units(language), schema.grandfatheredLanguages.includes(language))) failure('a language tag or its datatype is invalid');
  } else if (datatype === schema.languageDatatype) failure('a language string requires a nonempty language tag');
  return { kind: input.kind, value, datatype, language };
}

function writer(network) {
  const terms = new Map();
  const statements = new Map();
  const occurrences = [];
  const sources = [];
  const witnesses = [];
  let allocatedNodes = 0;
  const append = (references, data) => {
    if (allocatedNodes >= 100000) failure('the output structural node limit is exceeded');
    allocatedNodes += 1;
    return network.insertLink(references, data);
  };
  const insert = (kind, references = [], definition) => append(references, metadata(kind, definition));
  const scalar = value => insert('text', [], value);
  const model = insert('model', [scalar(schema.specification)], schema.model);
  function term(value) {
    const signature = identity(value);
    if (terms.has(signature)) return terms.get(signature);
    const references = value.kind === 'identifier' ? [scalar(value.value)]
      : value.kind === 'blank' ? [scalar(value.sourceIdentifier), scalar(value.value)]
        : [scalar(value.value), term({ kind: 'identifier', value: value.datatype }), scalar(value.language)];
    const id = insert(value.kind, references);
    terms.set(signature, id);
    return id;
  }
  function statement(triple) {
    const signature = triple.map(identity).map(value => value.length + ':' + value).join('');
    if (!statements.has(signature)) statements.set(signature, insert('statement', triple.map(term)));
    return statements.get(signature);
  }
  function occurrence(triple, sourceIdentifier, position, sourceLanguage) {
    const id = statement(triple);
    occurrences.push(insert('occurrence', [id, scalar(sourceIdentifier), insert('position', [], String(position)), scalar(sourceLanguage)]));
  }
  function finish() {
    const ordered = [...statements].sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0).map(([, id]) => id);
    return { network, root: insert('root', [model, insert('sequence', ordered), insert('sequence', occurrences), insert('sequence', sources), insert('sequence', witnesses)], String(schema.schemaVersion)) };
  }
  return { insert, append, model, scalar, term, statement, occurrence, sources, witnesses, finish };
}

/** Import structured triples. Blank node labels are scoped by an explicit source. */
export function importResourceDescriptionGraph(triples, { sourceIdentifier, network = new LinkNetwork() } = {}) {
  text(sourceIdentifier, 'a graph source');
  if (!sourceIdentifier.length || !Array.isArray(triples) || triples.length > 10000) failure('a bounded graph and a nonempty source identifier are required');
  const output = writer(network);
  for (const [position, input] of triples.entries()) {
    if (!Array.isArray(input) || input.length !== 3) failure('a statement needs exactly three terms');
    const triple = input.map(term => normalizeTerm(term, sourceIdentifier));
    for (const [index, role] of ['subject', 'predicate', 'object'].entries()) if (!schema.positions[role].includes(triple[index].kind)) failure('a term cannot occupy the ' + role + ' position');
    output.occurrence(triple, sourceIdentifier, position, input[2].kind === 'literal' ? input[2].language ?? '' : '');
  }
  const result = output.finish();
  decodeResourceDescriptionGraph(result.network, result.root);
  return result;
}

function reader(network, nodeLimit = 100000) {
  const terms = new Map();
  const roots = new Map();
  const active = new Set();
  const visited = new Set();
  const namedFields = new Set(network.fieldRelations().map(relation => key(relation.parent)));
  function node(id, kind, arity = null) {
    const link = network.link(id);
    if (!link) failure('a reference is dangling');
    visited.add(key(id));
    if (visited.size > nodeLimit) failure('the structural node limit is exceeded');
    const data = link.metadata();
    if (data.linkType !== LinkType.Semantic || !data.named || data.language !== schema.language || data.term !== schema.terms[kind]) failure('a semantic node has a foreign role or model');
    if (data.span !== undefined || Object.values(data.flags).some(Boolean)) failure('a semantic node carries unsupported concrete metadata');
    if (namedFields.has(key(id))) failure('positional semantic nodes cannot conceal named fields');
    const references = link.references();
    if (arity !== null && references.length !== arity) failure('a semantic node has the wrong arity');
    if (!['text', 'position', 'model', 'root'].includes(kind) && data.definition !== undefined) failure('a semantic node has unexpected scalar data');
    return { link, references, definition: data.definition };
  }
  const scalar = id => text(node(id, 'text', 0).definition, 'a linked text value');
  const sequence = id => node(id, 'sequence').references;
  function model(id) {
    const value = node(id, 'model', 1);
    if (value.definition !== schema.model || scalar(value.references[0]) !== schema.specification) failure('the selected term equality premises are not supported');
  }
  function term(id) {
    if (terms.has(key(id))) return terms.get(key(id));
    if (active.has(key(id))) failure('a term has a structural cycle');
    active.add(key(id));
    const kind = Object.entries(schema.terms).find(([, name]) => name === network.link(id)?.metadata().term)?.[0];
    let input;
    if (kind === 'identifier') input = { kind, value: scalar(node(id, kind, 1).references[0]) };
    else if (kind === 'blank') {
      const values = node(id, kind, 2).references;
      input = { kind, sourceIdentifier: scalar(values[0]), value: scalar(values[1]) };
    } else if (kind === 'literal') {
      const values = node(id, kind, 3).references;
      node(values[1], 'identifier', 1);
      const datatype = term(values[1]);
      if (datatype.kind !== 'identifier') failure('a datatype is not an identifier');
      input = { kind, value: scalar(values[0]), datatype: datatype.value, language: scalar(values[2]) };
    } else failure('a statement reference is not a resource term');
    const normalized = normalizeTerm(input);
    if (input.kind === 'literal' && normalized.language !== input.language) failure('a semantic language tag must be canonical lowercase');
    terms.set(key(id), normalized);
    active.delete(key(id));
    return normalized;
  }
  function statement(id) {
    const value = node(id, 'statement', 3).references.map(term);
    for (const [index, role] of ['subject', 'predicate', 'object'].entries()) if (!schema.positions[role].includes(value[index].kind)) failure('a linked term occupies an invalid statement position');
    return value;
  }
  function graph(root, depth = 0) {
    if (depth > 64) failure('the source graph nesting limit is exceeded');
    if (roots.has(key(root))) return roots.get(key(root));
    if (active.has(key(root))) failure('source graph provenance is cyclic');
    active.add(key(root));
    const value = node(root, 'root', 5);
    if (value.definition !== String(schema.schemaVersion)) failure('the graph schema revision is unsupported');
    model(value.references[0]);
    const statementIds = sequence(value.references[1]);
    const signatures = new Set();
    const triples = statementIds.map(id => {
      const triple = statement(id);
      const signature = triple.map(identity).map(value => value.length + ':' + value).join('');
      if (signatures.has(signature)) failure('the graph statement set contains a duplicate');
      signatures.add(signature); return triple;
    });
    const occurrences = sequence(value.references[2]).map(id => {
      const fields = node(id, 'occurrence', 4).references;
      const statementIndex = statementIds.findIndex(statement => statement.equals(fields[0]));
      if (statementIndex < 0) failure('an occurrence refers outside its graph statement set');
      const sourceIdentifier = scalar(fields[1]);
      const positionText = node(fields[2], 'position', 0).definition;
      if (!/^(?:0|[1-9][0-9]*)$/u.test(positionText ?? '') || !Number.isSafeInteger(Number(positionText))) failure('an occurrence source position is invalid');
      const sourceLanguage = scalar(fields[3]);
      if (!sourceIdentifier.length || sourceLanguage.toLowerCase() !== (triples[statementIndex][2].kind === 'literal' ? triples[statementIndex][2].language : '')) failure('an occurrence source or language provenance is inconsistent');
      return { statementIndex, sourceIdentifier, position: Number(positionText), sourceLanguage };
    });
    const sources = sequence(value.references[3]);
    for (const source of sources) graph(source, depth + 1);
    const ownedSources = new Set();
    const pending = [...sources];
    while (pending.length) {
      const id = pending.pop();
      if (ownedSources.has(key(id))) continue;
      if (ownedSources.size >= nodeLimit) failure('the provenance traversal limit is exceeded');
      const link = network.link(id);
      if (!link) failure('a source provenance reference is dangling');
      ownedSources.add(key(id));
      pending.push(...link.references());
    }
    const targetTerms = new Set(statementIds.flatMap(id => node(id, 'statement', 3).references).map(key));
    for (const witness of sequence(value.references[4])) {
      const fields = node(witness, 'witness', 3).references;
      model(fields[2]);
      if (!ownedSources.has(key(fields[0])) || !targetTerms.has(key(fields[1])) || !same(term(fields[0]), term(fields[1]))) failure('a term equality witness has false or unowned premises');
    }
    active.delete(key(root));
    const result = { model: schema.model, triples, occurrences, statementIds, sourceRoots: sources, termLinks: new Map(terms) };
    roots.set(key(root), result);
    return result;
  }
  return { graph, term, node };
}

/** Decode only graph semantics and source-qualified occurrences; no source replay. */
export function decodeResourceDescriptionGraph(network, root, { nodeLimit = 100000 } = {}) {
  if (!Number.isSafeInteger(nodeLimit) || nodeLimit < 1) failure('a positive structural limit is required');
  const result = reader(network, nodeLimit).graph(LinkId.from(root));
  return { model: result.model, triples: result.triples, occurrences: result.occurrences };
}

/** Merge term-equal statements while retaining source graphs and occurrence data. */
export function mergeResourceDescriptionGraphs(inputs) {
  if (!Array.isArray(inputs) || inputs.length > 100) failure('a bounded source graph list is required');
  const network = new LinkNetwork();
  const output = writer(network);
  for (const input of inputs) {
    const source = reader(input.network);
    const decoded = source.graph(LinkId.from(input.root));
    const copied = new Map();
    const pending = [LinkId.from(input.root)];
    while (pending.length) {
      const id = pending.pop();
      if (copied.has(key(id))) continue;
      if (copied.size >= 100000) failure('the source copy limit is exceeded');
      const link = input.network.link(id);
      if (!link) failure('a source reference is dangling');
      copied.set(key(id), output.append([], link.metadata().clone()));
      pending.push(...link.references());
    }
    for (const [before, after] of copied) network.link(after).setReferences(input.network.link(LinkId.fromU64(before)).references().map(id => copied.get(key(id))));
    output.sources.push(copied.get(key(LinkId.from(input.root))));
    for (const occurrence of decoded.occurrences) output.occurrence(decoded.triples[occurrence.statementIndex], occurrence.sourceIdentifier, occurrence.position, occurrence.sourceLanguage);
    for (const triple of decoded.triples) output.statement(triple);
    const sourceTerms = new Set(decoded.statementIds.flatMap(id => input.network.link(id).references()).map(key));
    for (const before of sourceTerms) {
      const target = output.term(source.term(LinkId.fromU64(before)));
      output.witnesses.push(output.insert('witness', [copied.get(before), target, output.model]));
    }
  }
  const result = output.finish();
  decodeResourceDescriptionGraph(result.network, result.root);
  return result;
}

/** Verify every archived equality witness under the archived primitive model. */
export function verifyResourceDescriptionGraphWitnesses(network, root) {
  decodeResourceDescriptionGraph(network, root);
  return true;
}
