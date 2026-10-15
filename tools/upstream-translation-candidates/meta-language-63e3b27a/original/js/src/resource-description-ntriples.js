// Selected RDF 1.1 N-Triples syntax, using the automatically translated token
// and grammar kernel. Canonical output is reconstructed from linked terms.
import { LinkNetwork } from './network.js';
import { LinkId, LinkMetadata, LinkType } from './primitives.js';
import { readRuntimeProjectData } from './project-data-loader.js';
import { RESOURCE_DESCRIPTION_SCHEMA, importResourceDescriptionGraph, decodeResourceDescriptionGraph } from './resource-description-graphs.js';
import { acceptResourceDescriptionIdentifier, acceptResourceDescriptionLanguage } from './resource-description-rules.js';
import { readResourceDescriptionNTriplesToken, readResourceDescriptionNTriplesScalar, readResourceDescriptionNTriplesCanonicalEscape } from './resource-description-ntriples-rules.js';
import { readResourceDescriptionNTriplesTransition, readResourceDescriptionNTriplesRole, acceptResourceDescriptionNTriplesFinalState } from './resource-description-ntriples-characters.js';

export const RESOURCE_DESCRIPTION_NTRIPLES_PROFILE = Object.freeze(readRuntimeProjectData(new URL('./data/resource-description-ntriples-profile.lino', import.meta.url)));
const profile = RESOURCE_DESCRIPTION_NTRIPLES_PROFILE;
const units = source => Array.from({ length: source.length }, (_, index) => source.charCodeAt(index));
const key = id => LinkId.from(id).asU64();
const termIdentity = term => JSON.stringify(term.kind === 'blank' ? [term.kind, term.sourceIdentifier, term.value]
  : term.kind === 'literal' ? [term.kind, term.value, term.datatype, term.language] : [term.kind, term.value]);

/** A malformed input and an unsupported valid identifier remain distinct. */
export class ResourceDescriptionNTriplesError extends TypeError {
  constructor(kind, offset, message) {
    super('resource description N-Triples: ' + message + ' at UTF-16 position ' + offset);
    this.kind = kind;
    this.offset = offset;
  }
}
const fail = (kind, offset, message) => { throw new ResourceDescriptionNTriplesError(kind, offset, message); };
const lexicalErrors = { 1: 'invalid Unicode scalar', 2: 'empty language tag', 3: 'invalid blank node label', 4: 'invalid Unicode scalar escape',
  5: 'unknown character escape', 6: 'illegal unescaped character', 7: 'unterminated term', 8: 'unexpected syntax character' };
function identifier(value, offset) {
  if (value.includes('[') || value.includes(']')) fail('unsupported', offset, 'bracketed identifiers require an address grammar outside this profile');
  if (!acceptResourceDescriptionIdentifier(units(value))) fail('malformed', offset, 'an absolute identifier is required');
  return { kind: 'identifier', value };
}
function tokenValue(source, input, start, end, kind) {
  if (kind === 2 || kind === 4) return source.slice(start + (kind === 2 ? 2 : 1), end);
  if (kind !== 1 && kind !== 3) return '';
  let result = '';
  for (let index = start + 1; index < end - 1;) {
    const [width, scalar, error] = readResourceDescriptionNTriplesScalar(input, index, kind);
    if (error || width < 1) fail('malformed', index, lexicalErrors[error] ?? 'invalid scalar');
    result += String.fromCodePoint(scalar);
    index += width;
  }
  return result;
}
function parse(source, sourceIdentifier, blankMapping) {
  if (typeof source !== 'string' || source.length > 262144) fail('resourceLimit', 0, 'a source of at most 262144 UTF-16 units is required');
  const input = units(source);
  const tokens = [];
  const statements = [];
  const triples = [];
  let state = 0;
  let current = null;
  for (let start = 0; start < input.length;) {
    if (tokens.length >= 10000) fail('resourceLimit', start, 'the token limit is exceeded');
    const [kind, end, diagnostic] = readResourceDescriptionNTriplesToken(input, start);
    if (!kind) fail('malformed', end, lexicalErrors[diagnostic] ?? 'invalid token');
    const next = readResourceDescriptionNTriplesTransition(state, kind);
    if (next < 0) fail('malformed', start, 'a token cannot occupy this statement position');
    const token = { kind, start, end, value: tokenValue(source, input, start, end, kind), raw: source.slice(start, end) };
    if (token.value.length > 65536) fail('resourceLimit', start, 'a term exceeds 65536 UTF-16 units');
    const tokenIndex = tokens.length;
    tokens.push(token);
    const role = readResourceDescriptionNTriplesRole(state, kind);
    if (role >= 1 && role <= 3) {
      if (role === 1) current = { triple: [], tokens: [], qualifiers: [] };
      const term = kind === 1 ? identifier(token.value, start) : kind === 2 ? blankMapping.get(token.value)
        ?? { kind: 'blank', value: token.value, sourceIdentifier } : { kind: 'literal', value: token.value };
      current.triple[role - 1] = term;
      current.tokens[role - 1] = tokenIndex;
    } else if (role === 4) {
      if (!acceptResourceDescriptionLanguage(units(token.value), RESOURCE_DESCRIPTION_SCHEMA.grandfatheredLanguages.includes(token.value.toLowerCase()))) fail('malformed', start, 'invalid language tag');
      current.triple[2].language = token.value;
      current.qualifiers.push(tokenIndex);
    } else if (role === 5) {
      current.triple[2].datatype = identifier(token.value, start).value;
      current.qualifiers.push(tokenIndex);
    } else if (role === 6) {
      if (current.triple[2].datatype === RESOURCE_DESCRIPTION_SCHEMA.languageDatatype && !current.triple[2].language) fail('malformed', start, 'a language string requires a language tag');
      triples.push(current.triple);
      statements.push({ tokens: current.tokens, qualifiers: current.qualifiers, period: tokenIndex });
      current = null;
    } else if (kind === 6) current.qualifiers.push(tokenIndex);
    state = next;
    start = end;
  }
  if (!acceptResourceDescriptionNTriplesFinalState(state)) fail('malformed', source.length, 'an incomplete statement remains at the end of input');
  return { triples, tokens, statements };
}
function metadata(kind, definition) {
  return LinkMetadata.new().withLinkType(LinkType.Semantic).withNamed(true).withLanguage(profile.language)
    .withTerm(profile.terms[kind]).withDefinition(definition);
}
function writer(network) {
  let count = network.links().length;
  const insert = (kind, references = [], definition) => {
    if (count >= 100000) fail('resourceLimit', 0, 'the syntax structural node limit is exceeded');
    count += 1;
    return network.insertLink(references, metadata(kind, definition));
  };
  const text = value => insert('text', [], value);
  const position = value => insert('position', [], String(value));
  const sequence = values => insert('sequence', values);
  const premise = () => insert('profile', [text(profile.specification)], profile.profile);
  return { insert, text, position, sequence, premise };
}
function reader(network) {
  const visited = new Set();
  const fields = new Set(network.fieldRelations().map(row => key(row.parent)));
  const node = (id, kind, arity) => {
    const link = network.link(id);
    if (!link) fail('malformed', 0, 'a syntax reference is dangling');
    visited.add(key(id));
    if (visited.size > 100000) fail('resourceLimit', 0, 'the syntax structural node limit is exceeded');
    const data = link.metadata();
    if (data.linkType !== LinkType.Semantic || !data.named || data.language !== profile.language || data.term !== profile.terms[kind]
      || data.span !== undefined || Object.values(data.flags).some(Boolean) || fields.has(key(id))) fail('malformed', 0, 'a syntax node has a foreign role or concealed fields');
    const refs = link.references();
    if (arity !== null && refs.length !== arity) fail('malformed', 0, 'a syntax node has the wrong arity');
    if (!['text', 'position', 'profile', 'token'].includes(kind) && data.definition !== undefined) fail('malformed', 0, 'a syntax node has unexpected scalar data');
    return { refs, definition: data.definition };
  };
  const text = id => {
    const value = node(id, 'text', 0).definition;
    if (typeof value !== 'string' || value.length > 262144) fail('malformed', 0, 'a syntax text value is invalid');
    return value;
  };
  const premise = id => {
    const value = node(id, 'profile', 1);
    if (value.definition !== profile.profile || text(value.refs[0]) !== profile.specification) fail('unsupported', 0, 'the syntax profile is not supported');
  };
  return { node, text, premise };
}
function correspondence(input) {
  if (!input) return new Map();
  const { network, root } = input;
  const read = reader(network);
  const refs = read.node(root, 'correspondenceRoot', 3).refs;
  read.premise(refs[2]);
  decodeResourceDescriptionGraph(network, refs[0]);
  const graphRefs = network.link(refs[0]).references();
  const owned = new Set(network.link(graphRefs[1]).references().flatMap(id => network.link(id).references()).map(key));
  const mapping = new Map();
  const targets = new Set();
  for (const id of read.node(refs[1], 'sequence', null).refs) {
    const pair = read.node(id, 'correspondence', 2).refs;
    const label = read.text(pair[1]);
    const term = network.link(pair[0]);
    if (!owned.has(key(pair[0])) || term?.metadata().term !== RESOURCE_DESCRIPTION_SCHEMA.terms.blank) fail('malformed', 0, 'a blank correspondence is not owned by its graph');
    const termRefs = term.references();
    const value = { kind: 'blank', sourceIdentifier: network.link(termRefs[0]).metadata().definition, value: network.link(termRefs[1]).metadata().definition };
    const lexical = '_:' + label;
    const token = readResourceDescriptionNTriplesToken(units(lexical), 0);
    if (token[0] !== 2 || token[1] !== lexical.length || mapping.has(label) || targets.has(termIdentity(value))) fail('malformed', 0, 'blank correspondences must be valid and one to one');
    mapping.set(label, value);
    targets.add(termIdentity(value));
  }
  return mapping;
}

/** Parse the selected profile into RDF links and a separate lossless syntax root. */
export function importResourceDescriptionNTriples(source, { sourceIdentifier, network = new LinkNetwork(), correspondence: identities } = {}) {
  const parsed = parse(source, sourceIdentifier, correspondence(identities));
  const graph = importResourceDescriptionGraph(parsed.triples, { sourceIdentifier, network });
  const out = writer(network);
  const tokens = parsed.tokens.map(token => out.insert('token', [out.text(token.raw), out.position(token.start), out.position(token.end)], String(token.kind)));
  const occurrenceIds = network.link(network.link(graph.root).references()[2]).references();
  const statements = parsed.statements.map((statement, index) => out.insert('statement', [occurrenceIds[index], ...statement.tokens.map(id => tokens[id]),
    out.sequence(statement.qualifiers.map(id => tokens[id])), tokens[statement.period]]));
  return { ...graph, syntaxRoot: out.insert('syntaxRoot', [graph.root, out.text(sourceIdentifier), out.sequence(tokens), out.sequence(statements), out.premise()]) };
}

/** Read raw syntax provenance; canonical conversion uses the RDF root instead. */
export function readResourceDescriptionNTriplesSource(network, syntaxRoot) {
  const read = reader(network);
  const refs = read.node(syntaxRoot, 'syntaxRoot', 5).refs;
  read.premise(refs[4]);
  const graph = decodeResourceDescriptionGraph(network, refs[0]);
  const sourceIdentifier = read.text(refs[1]);
  let source = '';
  const tokens = read.node(refs[2], 'sequence', null).refs;
  for (const id of tokens) {
    const token = read.node(id, 'token', 3);
    const start = read.node(token.refs[1], 'position', 0).definition;
    const end = read.node(token.refs[2], 'position', 0).definition;
    const raw = read.text(token.refs[0]);
    if (start !== String(source.length) || end !== String(source.length + raw.length)) fail('malformed', source.length, 'syntax token positions are not contiguous');
    const scanned = readResourceDescriptionNTriplesToken(units(raw), 0);
    if (!scanned[0] || token.definition !== String(scanned[0]) || scanned[1] !== raw.length) fail('malformed', source.length, 'a syntax token does not match its lexical role');
    source += raw;
    if (source.length > 262144) fail('resourceLimit', source.length, 'the syntax source limit is exceeded');
  }
  const parsed = parse(source, sourceIdentifier, new Map());
  const statementIds = read.node(refs[3], 'sequence', null).refs;
  const occurrenceIds = network.link(network.link(refs[0]).references()[2]).references();
  if (statementIds.length !== parsed.statements.length || graph.occurrences.length !== statementIds.length) fail('malformed', 0, 'syntax statements and occurrences differ');
  for (const [index, id] of statementIds.entries()) {
    const fields = read.node(id, 'statement', 6).refs;
    const statement = parsed.statements[index];
    const expected = [occurrenceIds[index], ...statement.tokens.map(id => tokens[id]), refs[0], tokens[statement.period]];
    if (fields.some((field, slot) => slot !== 4 && !field.equals(expected[slot]))) fail('malformed', 0, 'a syntax statement references a foreign occurrence or token');
    const qualifiers = read.node(fields[4], 'sequence', null).refs;
    if (qualifiers.length !== statement.qualifiers.length || qualifiers.some((field, slot) => !field.equals(tokens[statement.qualifiers[slot]]))) fail('malformed', 0, 'a syntax qualifier references a foreign token');
  }
  return source;
}
function cloneReachable(source, root, target) {
  const mapped = new Map();
  const active = new Set();
  const copy = id => {
    if (mapped.has(key(id))) return mapped.get(key(id));
    if (mapped.size >= 100000 || active.size > 64) fail('resourceLimit', 0, 'the correspondence graph limit is exceeded');
    if (active.has(key(id))) fail('malformed', 0, 'a correspondence graph has a structural cycle');
    active.add(key(id));
    const link = source.link(id);
    const children = link.references().map(copy);
    if (mapped.size >= 100000) fail('resourceLimit', 0, 'the correspondence graph limit is exceeded');
    const result = target.insertLink(children, link.metadata());
    mapped.set(key(id), result);
    active.delete(key(id));
    return result;
  };
  return { root: copy(root), mapped };
}
function canonicalLiteral(value) {
  let output = '';
  for (const char of value) {
    const escape = readResourceDescriptionNTriplesCanonicalEscape(char.codePointAt(0));
    output += escape < 0 ? char : '\\' + String.fromCodePoint(escape);
  }
  return '"' + output + '"';
}

/** Export linked terms, with explicit scoped blank identities in a LiNo graph. */
export function emitResourceDescriptionNTriples(network, root) {
  const graph = decodeResourceDescriptionGraph(network, root);
  const blankTerms = new Map();
  for (const triple of graph.triples) for (const term of triple) if (term.kind === 'blank') blankTerms.set(termIdentity(term), term);
  const labels = new Map([...blankTerms.keys()].sort().map((identity, index) => [identity, 'b' + index]));
  const term = value => value.kind === 'identifier' ? '<' + value.value + '>' : value.kind === 'blank' ? '_:' + labels.get(termIdentity(value))
    : canonicalLiteral(value.value) + (value.language ? '@' + value.language : value.datatype === RESOURCE_DESCRIPTION_SCHEMA.stringDatatype ? '' : '^^<' + value.datatype + '>');
  const source = graph.triples.map(triple => triple.map(term).join(' ') + ' .\n').sort().join('');
  const output = new LinkNetwork();
  const cloned = cloneReachable(network, LinkId.from(root), output);
  const out = writer(output);
  const rootRefs = network.link(root).references();
  const ids = network.link(rootRefs[1]).references().flatMap(id => network.link(id).references());
  const owned = new Map();
  for (const id of ids) if (network.link(id).metadata().term === RESOURCE_DESCRIPTION_SCHEMA.terms.blank) {
    const refs = network.link(id).references();
    owned.set(termIdentity({ kind: 'blank', sourceIdentifier: network.link(refs[0]).metadata().definition, value: network.link(refs[1]).metadata().definition }), id);
  }
  const pairs = [...labels].map(([identity, label]) => out.insert('correspondence', [cloned.mapped.get(key(owned.get(identity))), out.text(label)]));
  return { source, correspondence: { network: output, root: out.insert('correspondenceRoot', [cloned.root, out.sequence(pairs), out.premise()]) } };
}
