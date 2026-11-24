// General Links Notation reading over the shared structured graph model.
import { Link, LinkId } from './primitives.js';
import { StreamParser } from 'links-notation';
import { decodeCanonicalStatements } from './lino-serialization.js';
import { StructuredDataNetwork } from './structured-data-encode.js';
import { decodeStructuredDataLinks } from './structured-data-graph.js';
import { terms, encoder, fail, limitsOf } from './structured-data-model.js';
export { StructuredDataNetwork, encodeStructuredDataLinks, structuredDataToLino } from './structured-data-encode.js';
export { decodeStructuredDataLinks } from './structured-data-graph.js';

/** Read inspectable data without initializing any programming language runtime. */
export function readStructuredDataLino(source, options = {}) {
  const limits = limitsOf(options);
  if (encoder.encode(source).length > limits.byteLimit) fail('byte resource limit exceeded');
  const ids = new Set();
  const network = new StructuredDataNetwork();
  const roots = [];
  const parser = new StreamParser({ comments: false, collect: false, maxInputSize: limits.byteLimit, maxBufferSize: limits.byteLimit, maxDepth: 8 });
  parser.on('error', error => fail(`Links Notation parse error: ${error.message}`));
  parser.on('link', statement => {
    if (ids.size >= limits.nodeLimit) fail('node resource limit exceeded');
    if (!/^[1-9][0-9]*$/u.test(statement.id ?? '') || !Number.isSafeInteger(Number(statement.id)) || ids.has(statement.id)) fail('invalid or duplicate link identity');
    ids.add(statement.id);
    const sublinks = statement.values.filter(value => value.values.length > 0);
    if (sublinks.length !== 1 || sublinks[0].id !== 'meta') fail('invalid metadata envelope');
    const fields = new Set();
    for (const field of sublinks[0].values) {
      if (!['t', 'n', 'term', 'def', 'lang'].includes(field.id) || fields.has(field.id)) fail('unknown or duplicate metadata field');
      fields.add(field.id);
      if (field.values.length !== 1 || field.values[0].values.length !== 0) fail('invalid metadata scalar');
      if (field.id === 'n' && field.values[0].id !== '1') fail('invalid named flag');
    }
    if (!['t', 'n', 'term', 'lang'].every(field => fields.has(field))) fail('missing metadata field');
    for (const reference of statement.values.filter(value => value.values.length === 0)) {
      if (!/^[1-9][0-9]*$/u.test(reference.id ?? '') || !Number.isSafeInteger(Number(reference.id))) fail('invalid reference identity');
    }
    const [record] = decodeCanonicalStatements([statement]);
    network._links.set(record.id, new Link(record.id, record.references, record.metadata));
    network._nextId = Math.max(network._nextId, record.id + 1);
    if (record.metadata.term === terms.root) roots.push(record.id);
  });
  for (let offset = 0; offset < source.length; offset += 64 * 1024) parser.write(source.slice(offset, offset + 64 * 1024));
  parser.end();
  if (roots.length !== 1) fail('exactly one schema root is required');
  return decodeStructuredDataLinks(network, LinkId.from(roots[0]), limits);
}
