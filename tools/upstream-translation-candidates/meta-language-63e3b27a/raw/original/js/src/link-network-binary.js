// Complete network-state archives. UTF-8 and graph objects are host boundaries;
// every byte/framing/profile decision comes from the generated shared rules.
import { LinkNetwork } from './network.js';
import { LinkId, LinkMetadata, LinkFlags, LinkType, ByteRange, Point, SourceSpan } from './primitives.js';
import { readRuntimeProjectData } from './project-data-loader.js';
import { acceptLinkNetworkBinaryInteger, acceptLinkNetworkBinaryUnicode, transcodeLinkNetworkBinary } from './link-network-binary-rules.js';

const schema = readRuntimeProjectData(new URL('./data/link-network-binary-schema.lino', import.meta.url));
const encoder = new TextEncoder();
const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const types = [undefined, LinkType.Dynamic, LinkType.Reference, LinkType.Relation, LinkType.Language,
  LinkType.Grammar, LinkType.Type, LinkType.Concept, LinkType.Syntax, LinkType.Field,
  LinkType.Trivia, LinkType.SourceToken, LinkType.Document, LinkType.Semantic, LinkType.Region, LinkType.Object];

export class BinaryLinksError extends TypeError {
  constructor(message) { super(`binary links snapshot: ${message}`); this.name = 'BinaryLinksError'; }
}

function limits(options) {
  const recordLimit = options.recordLimit ?? schema.recordLimit;
  const byteLimit = options.byteLimit ?? schema.byteLimit;
  if (!acceptLinkNetworkBinaryInteger(recordLimit) || recordLimit < 1 || !acceptLinkNetworkBinaryInteger(byteLimit) || byteLimit < 16) throw new BinaryLinksError('invalid resource limits');
  return { recordLimit, byteLimit };
}

function textBytes(value) {
  if (typeof value !== 'string') throw new BinaryLinksError('metadata and cache strings must be strings');
  const units = Array.from({ length: value.length }, (_, index) => value.charCodeAt(index));
  if (!acceptLinkNetworkBinaryUnicode(units)) throw new BinaryLinksError('isolated surrogate in metadata or cache string is outside the interoperable UTF-8 profile');
  return Array.from(encoder.encode(value));
}

function appendText(fields, value, optional = false) {
  if (optional) { fields.push(value === undefined ? 0 : 1); if (value === undefined) return; }
  const bytes = textBytes(value);
  fields.push(bytes.length);
  for (const byte of bytes) fields.push(byte);
}

function compareBytes(first, second) {
  for (let index = 0; index < Math.min(first.length, second.length); index += 1) {
    if (first[index] !== second[index]) return first[index] - second[index];
  }
  return first.length - second.length;
}

function outcome(input, binary, options) {
  const bounds = limits(options);
  const result = transcodeLinkNetworkBinary(input, binary, bounds.recordLimit, bounds.byteLimit);
  if (result.startsWith('-')) {
    const [code, offset] = result.split(',');
    throw new BinaryLinksError(`${schema.errors[String(-Number(code))]} at ${binary ? 'byte' : 'field'} ${offset}`);
  }
  if (binary) return result.slice(0, -1).split(',').map(Number);
  return Array.from({ length: result.length / 2 }, (_, index) => Number.parseInt(result.slice(index * 2, index * 2 + 2), 16));
}

/** Encode every graph link, exact term cache, selected syntax and next ID.
 * The selected profile uses positive safe-integer IDs and scalar Unicode.
 * This version is a meta-language network archive, not an upstream binary standard.
 */
export function encodeLinkNetworkBinary(network, options = {}) {
  if (!(network instanceof LinkNetwork)) throw new BinaryLinksError('expected a LinkNetwork');
  const bounds = limits(options);
  const links = network.links();
  if (links.length > bounds.recordLimit) throw new BinaryLinksError('record resource limit exceeded');
  const fields = [2, network._nextId, links.length];
  for (const link of links) {
    const value = link.metadata();
    if (value.named !== true && value.named !== false) throw new BinaryLinksError('named metadata flag must be boolean');
    const type = types.indexOf(value.linkType);
    if (type < 0) throw new BinaryLinksError('unknown link type in the interoperable profile');
    const flags = value.flags;
    for (const flag of ['isError', 'hasError', 'isMissing', 'isExtra']) if (flags[flag] !== true && flags[flag] !== false) throw new BinaryLinksError('parse flags must be boolean');
    const references = link.references();
    fields.push(link.id().asU64(), references.length);
    for (const reference of references) fields.push(reference.asU64());
    fields.push(1, type, Number(value.named), Number(flags.isError) + Number(flags.hasError) * 2 + Number(flags.isMissing) * 4 + Number(flags.isExtra) * 8,
      Number(Boolean(value.term !== undefined && network.findTerm(value.term)?.equals(link.id()))), 0);
    appendText(fields, value.term, true);
    appendText(fields, value.definition, true);
    appendText(fields, value.language, true);
    fields.push(value.span === undefined ? 0 : 1);
    if (value.span !== undefined) {
      const { byteRange, start, end } = value.span;
      fields.push(byteRange.start, byteRange.end, start.row, start.column, end.row, end.column);
    }
    if (fields.length > bounds.byteLimit) throw new BinaryLinksError('byte resource limit exceeded');
  }
  const terms = [...network._terms].map(([text, identity]) => ({ text, bytes: textBytes(text), identity: LinkId.from(identity).asU64() }));
  terms.sort((first, second) => compareBytes(first.bytes, second.bytes));
  fields.push(terms.length);
  for (const entry of terms) { appendText(fields, entry.text); fields.push(entry.identity); }
  const syntax = [...network._conceptSyntax].map(([key, value]) => {
    const boundary = key.indexOf('\0');
    if (boundary < 0 || key.indexOf('\0', boundary + 1) !== -1) throw new BinaryLinksError('ambiguous concept-syntax cache key is outside the interoperable profile');
    const concept = key.slice(0, boundary);
    const language = key.slice(boundary + 1);
    return { concept, language, value, conceptBytes: textBytes(concept), languageBytes: textBytes(language) };
  });
  syntax.sort((first, second) => compareBytes(first.conceptBytes, second.conceptBytes) || compareBytes(first.languageBytes, second.languageBytes));
  fields.push(syntax.length);
  for (const entry of syntax) { appendText(fields, entry.concept); appendText(fields, entry.language); appendText(fields, entry.value); }
  return Uint8Array.from(outcome(fields, false, options));
}

/** Reload exact network state without source parsing or token reconstruction.
 * Legacy MLDSNP01 restores its recorded graph and term registrations; it has no
 * exact allocator or selected-syntax sections to restore.
 */
export function decodeLinkNetworkBinary(bytes, options = {}) {
  if (!(bytes instanceof Uint8Array) && !Array.isArray(bytes)) throw new BinaryLinksError('expected a byte array');
  const bounds = limits(options);
  if (bytes.length > bounds.byteLimit) throw new BinaryLinksError('byte resource limit exceeded');
  const fields = outcome(Array.from(bytes), true, options);
  let cursor = 0;
  const number = () => fields[cursor++];
  const text = (optional = false) => {
    if (optional && number() === 0) return undefined;
    const length = number();
    const encoded = Uint8Array.from(fields.slice(cursor, cursor + length));
    cursor += length;
    try { return decoder.decode(encoded); } catch { throw new BinaryLinksError('metadata or cache string is not valid UTF-8'); }
  };
  const network = new LinkNetwork();
  const version = number();
  const nextIdentity = version === 2 ? number() : 1;
  const count = number();
  for (let index = 0; index < count; index += 1) {
    const identity = number();
    const arity = number();
    const references = fields.slice(cursor, cursor + arity);
    cursor += arity;
    number(); // The shared scanner already checked the metadata version.
    const type = types[number()];
    const named = number() === 1;
    const flags = number();
    const registered = number() === 1;
    number(); // The shared scanner rejected tombstones.
    const term = text(true);
    const definition = text(true);
    const language = text(true);
    let span;
    if (number() === 1) span = new SourceSpan(new ByteRange(number(), number()), new Point(number(), number()), new Point(number(), number()));
    const metadata = new LinkMetadata({ linkType: type, named, term, definition, language, span,
      flags: new LinkFlags({ isError: flags % 2 === 1, hasError: Math.floor(flags / 2) % 2 === 1,
        isMissing: Math.floor(flags / 4) % 2 === 1, isExtra: Math.floor(flags / 8) % 2 === 1 }) });
    const id = network.insertLinkWithOptionalId(identity, references, metadata);
    if (version === 1 && registered && term !== undefined) network._terms.set(term, id);
  }
  if (version === 2) {
    const terms = number();
    for (let index = 0; index < terms; index += 1) {
      const key = text();
      const identity = LinkId.from(number());
      if (network._terms.has(key)) throw new BinaryLinksError('duplicate term-cache key');
      network._terms.set(key, identity);
    }
    const syntax = number();
    for (let index = 0; index < syntax; index += 1) {
      const concept = text();
      const language = text();
      const value = text();
      if (concept.includes('\0') || language.includes('\0')) throw new BinaryLinksError('ambiguous concept-syntax cache key is outside the interoperable profile');
      const key = `${concept}\0${language}`;
      if (network._conceptSyntax.has(key)) throw new BinaryLinksError('duplicate selected-syntax key');
      network._conceptSyntax.set(key, value);
    }
    network._nextId = nextIdentity;
  }
  return network;
}
