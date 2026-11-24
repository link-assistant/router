// Each appended record owns an explicit namespace for every data identity and
// reference. The record remains ordinary inspectable LiNo, not a text payload.
import { StreamParser } from 'links-notation';
import { decodeCanonicalStatements } from './lino-serialization.js';
import { Link, LinkId } from './primitives.js';
import { StructuredDataNetwork, decodeStructuredDataLinks } from './structured-data-links.js';
import { structuredDataGraphCost } from './structured-data-graph.js';
import { acceptStructuredDataRecordField, acceptStructuredDataRecordShape } from './structured-data-link-rules.js';

import { namespacePattern, failure } from './structured-data-record-model.js';
export { structuredDataRecordToLino } from './structured-data-records-write.js';
const encoder = new TextEncoder();

function frameValue(frame, namespaces, limits) {
  const namespace = frame.id?.replace(/\/record$/u, '');
  if (!namespacePattern.test(namespace ?? '') || frame.id !== `${namespace}/record` || namespaces.has(namespace)) failure('invalid or duplicate namespace');
  if (namespaces.size >= (limits.nodeLimit ?? 1_000_000)) failure('namespace resource limit exceeded');
  namespaces.add(namespace);
  const localId = identity => {
    if (typeof identity !== 'string' || !identity.startsWith(`${namespace}/`)) failure('foreign reference namespace');
    const text = identity.slice(namespace.length + 1);
    if (!/^[1-9][0-9]*$/u.test(text) || !Number.isSafeInteger(Number(text))) failure('invalid local identity');
    return text;
  };
  const references = frame.values.filter(value => value.values.length === 0);
  const declarations = frame.values.filter(value => value.values.length > 0 && value.id !== 'meta');
  const metadata = frame.values.filter(value => value.id === 'meta');
  if (!acceptStructuredDataRecordShape(String(references.length), String(metadata.length))) failure('invalid frame shape');
  const expected = new Set(['t', 'n', 'term', 'def', 'lang']);
  for (const field of metadata[0].values) {
    if (!expected.has(field.id) || field.values.length !== 1 || field.values[0].values.length !== 0 || !acceptStructuredDataRecordField(field.id, field.values[0].id)) failure('invalid frame metadata');
    expected.delete(field.id);
  }
  if (expected.size) failure('incomplete frame metadata');
  const identities = new Set();
  const local = declarations.map(declaration => {
    const identity = localId(declaration.id);
    if (identities.has(identity)) failure('duplicate local identity');
    identities.add(identity);
    const values = declaration.values.map(value => value.values.length === 0 ? { ...value, id: localId(value.id) } : value);
    const envelopes = values.filter(value => value.values.length > 0);
    if (envelopes.length !== 1 || envelopes[0].id !== 'meta') failure('invalid data metadata envelope');
    const fields = new Set();
    for (const field of envelopes[0].values) {
      if (!['t', 'n', 'term', 'def', 'lang'].includes(field.id) || fields.has(field.id)
        || field.values.length !== 1 || field.values[0].values.length !== 0
        || (field.id === 'n' && field.values[0].id !== '1')) failure('invalid data metadata field');
      fields.add(field.id);
    }
    if (!['t', 'n', 'term', 'lang'].every(field => fields.has(field))) failure('incomplete data metadata');
    return { ...declaration, id: identity, values };
  });
  const nodeLimit = limits.nodeLimit ?? 1_000_000;
  if (local.length > nodeLimit) failure('node resource limit exceeded');
  const network = new StructuredDataNetwork();
  for (const declaration of decodeCanonicalStatements(local)) network._links.set(declaration.id, new Link(declaration.id, declaration.references, declaration.metadata));
  const root = LinkId.from(localId(references[0].id));
  const value = decodeStructuredDataLinks(network, root, limits);
  return { value, cost: structuredDataGraphCost(network, root) };
}

/** A bounded incremental decoder; a callback receives each complete value. */
export function createStructuredDataRecordReader(onRecord, limits = {}) {
  if (typeof onRecord !== 'function') failure('a record callback is required');
  const namespaces = new Set();
  const byteLimit = limits.byteLimit ?? 128 * 1024 * 1024;
  const parser = new StreamParser({ comments: false, collect: false, maxInputSize: byteLimit, maxBufferSize: byteLimit, maxDepth: 10 });
  parser.on('error', error => failure(error.message));
  parser.on('link', frame => { const { value, cost } = frameValue(frame, namespaces, limits); onRecord(value, cost); });
  return { write: chunk => { parser.write(chunk); }, end: () => { parser.end(); } };
}

/** Read a small record document; production consumers use the incremental API. */
export function readStructuredDataRecords(source, limits = {}) {
  if (encoder.encode(source).length > (limits.byteLimit ?? 128 * 1024 * 1024)) failure('document byte resource limit exceeded');
  const records = [];
  let nodes = 0; let bytes = 0;
  const reader = createStructuredDataRecordReader((value, cost) => {
    nodes += cost.nodes; bytes += cost.bytes;
    if (nodes > (limits.nodeLimit ?? 1_000_000) || bytes > (limits.byteLimit ?? 128 * 1024 * 1024)) failure('eager collection resource limit exceeded');
    records.push(value);
  }, limits);
  for (let offset = 0; offset < source.length; offset += 64 * 1024) reader.write(source.slice(offset, offset + 64 * 1024));
  reader.end();
  return records;
}
