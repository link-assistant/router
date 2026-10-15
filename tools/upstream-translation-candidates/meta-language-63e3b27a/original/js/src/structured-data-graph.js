// The shared closed typed graph validator, independent of textual parsing.
import { LinkType } from './primitives.js';
import { acceptStructuredDataShape, readStructuredDataKind } from './structured-data-link-rules.js';
import { language, terms, encoder, fail, key, limitsOf, wellFormedString } from './structured-data-model.js';

/** Decode a closed typed data graph; cycles, duplicate fields and foreign roles fail. */
export function decodeStructuredDataLinks(network, root, options = {}) {
  const limits = limitsOf(options);
  const links = network.links();
  if (links.length > limits.nodeLimit) fail('node resource limit exceeded');
  const active = new Set();
  const reached = new Set();
  const memo = new Map();
  const costs = new Map();
  let bytes = 0;
  let visits = 0;
  function inspect(id, depth) {
    const initialVisits = visits;
    const initialBytes = bytes;
    if (depth > limits.depthLimit || ++visits > limits.nodeLimit) fail('traversal resource limit exceeded');
    const identity = key(id);
    if (!Number.isSafeInteger(identity)) fail('invalid link identity');
    if (active.has(identity)) fail('structural cycle');
    const link = network.link(id);
    if (!link) fail('dangling reference');
    if (memo.has(identity)) {
      const cost = costs.get(identity);
      if (depth + cost.height > limits.depthLimit) fail('depth resource limit exceeded');
      visits += cost.nodes - 1;
      bytes += cost.bytes;
      if (visits > limits.nodeLimit || bytes > limits.byteLimit) fail('expanded data resource limit exceeded');
      return memo.get(identity);
    }
    const data = link.metadata();
    const references = link.references();
    const kind = readStructuredDataKind(data.term ?? '');
    if (data.linkType !== LinkType.Semantic || data.language !== language || !data.named || data.span
      || Object.values(data.flags ?? {}).some(Boolean) || !acceptStructuredDataShape(kind, String(references.length), data.definition !== undefined)) fail('invalid typed link');
    if (data.definition !== undefined) bytes += encoder.encode(data.definition).length;
    if (bytes > limits.byteLimit) fail('byte resource limit exceeded');
    reached.add(identity);
    active.add(identity);
    const child = reference => inspect(reference, depth + 1);
    let value;
    if (kind === 'root') {
      if (identity !== key(root) || data.definition !== '1') fail('invalid schema root');
      value = child(references[0]);
    } else if (kind === 'array') value = references.map(child);
    else if (kind === 'object') {
      const target = {};
      const names = [];
      const seen = new Set();
      for (const reference of references) {
        const pairLink = network.link(reference);
        if (pairLink?.metadata().term !== terms.pair) fail('object entry is not a key value pair');
        const pair = child(reference);
        if (typeof pair[0] !== 'string' || seen.has(pair[0])) fail('invalid or duplicate object key');
        seen.add(pair[0]); names.push(pair[0]);
        Object.defineProperty(target, pair[0], { value: pair[1], enumerable: true, configurable: true, writable: true });
      }
      // Ordinary JSON objects stay ordinary and remain structuredClone-compatible.
      // Only an explicitly edited order that JavaScript objects cannot express
      // needs the ordered view (for example integer-looking keys 2 before 1).
      value = Object.keys(target).every((name, index) => name === names[index]) ? target
        : new Proxy(target, { ownKeys: object => [...names.filter(name => Object.hasOwn(object, name)), ...Reflect.ownKeys(object).filter(name => !seen.has(name))] });
    } else if (kind === 'pair') value = references.map(child);
    else if (kind === 'string') {
      value = data.definition ?? '';
      if (!wellFormedString(value)) fail('a UTF-8 string contains an unpaired code unit');
    } else if (kind === 'units') {
      const units = references.map(reference => {
        if (network.link(reference)?.metadata().term !== terms.unit) fail('a code unit string contains a foreign role');
        return child(reference);
      });
      value = units.map(unit => String.fromCharCode(unit)).join('');
    } else if (kind === 'unit') {
      if (!/^(0|[1-9][0-9]*)$/u.test(data.definition)) fail('invalid Unicode code unit');
      value = Number(data.definition);
      if (!Number.isInteger(value) || value > 65535) fail('invalid Unicode code unit');
    } else if (kind === 'number') {
      if (!/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?$/u.test(data.definition)) fail('invalid number');
      value = Number(data.definition);
      if (!Number.isFinite(value) || (Object.is(value, -0) ? '-0' : String(value)) !== data.definition) fail('number is not canonical finite binary64');
    } else if (kind === 'boolean') {
      if (!['true', 'false'].includes(data.definition)) fail('invalid boolean');
      value = data.definition === 'true';
    } else if (kind === 'null') value = null;
    else fail('unknown structured data kind');
    active.delete(identity);
    memo.set(identity, value);
    costs.set(identity, { nodes: visits - initialVisits, bytes: bytes - initialBytes,
      height: references.reduce((height, reference) => Math.max(height, 1 + costs.get(key(reference)).height), 0) });
    return value;
  }
  if (network.link(root)?.metadata().term !== terms.root) fail('missing schema root');
  const value = inspect(root, 0);
  if (reached.size !== links.length) fail('unreachable data links');
  // Entry and code-unit records can occur only in their owning typed collections.
  for (const link of links) {
    const role = readStructuredDataKind(link.metadata().term ?? '');
    for (const reference of link.references()) {
      const childRole = readStructuredDataKind(network.link(reference)?.metadata().term ?? '');
      if ((childRole === 'pair' && role !== 'object') || (childRole === 'unit' && role !== 'units')) fail('misplaced structural role');
    }
  }
  return value;
}


/** Expanded traversal cost of an already validated typed graph. */
export function structuredDataGraphCost(network, root) {
  const costs = new Map();
  const costOf = id => {
    const identity = key(id);
    if (costs.has(identity)) return costs.get(identity);
    const link = network.link(id);
    const cost = { nodes: 1, bytes: encoder.encode(link.metadata().definition ?? '').length };
    for (const reference of link.references()) {
      const child = costOf(reference); cost.nodes += child.nodes; cost.bytes += child.bytes;
    }
    costs.set(identity, cost);
    return cost;
  };
  return costOf(root);
}
