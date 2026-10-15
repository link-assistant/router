// Source-only adapters. Queries project to existing value operations, while
// the linked policy proves their primitive owner and immutable source layers.
import { BOOL, FLOAT, STRING } from './types.js';
import { TranslationError, unsupported } from './diagnostics.js';
import { acceptRustReadOnlyQueryOwner, acceptRustInclusiveRangeOperand, acceptRustStringEmptyReceiver } from './rust-read-only-query-rules.js';
import { readRustSourceTypeOwner } from './rust-source-signatures.js';

/** Project the complete `(start..=end).contains(&value)` source query. */
export function readRustInclusiveRangeQuery(parser, start, path, lower) {
  const c = parser.cursor;
  c.next();
  const upper = parser.expr(path);
  c.expect(')', 'inclusive range');
  c.expect('.', 'inclusive range query');
  const method = c.identifier('inclusive range query');
  if (method.value !== 'contains') throw unsupported('inclusive range query', 'only standard primitive f64 contains is portable', method);
  c.expect('(', 'inclusive range query');
  const argument = parser.expr(path);
  const close = c.expect(')', 'inclusive range query');
  const range = { start: start.start, end: close.end };
  for (const [value, borrowed] of [[lower, false], [upper, false], [argument, true]]) {
    const origin = parser.origins.origin(value, path);
    const source = origin.sourceOwner ?? { kind: 'primitive', path: ['f64'] };
    const resolved = parser.resolve(['f64'], origin.path);
    const shadowed = Boolean(parser.origins.lookup(['f64'], origin.path) || parser.origins.lookup(resolved, origin.path));
    const layer = origin.wrappers.length === 0 ? 'value' : origin.wrappers.length === 1 ? origin.wrappers[0] : 'multiple';
    if (!parser.origins.collecting && (!acceptRustReadOnlyQueryOwner('inclusive range', source.kind, source.path.join('::'))
      || !acceptRustInclusiveRangeOperand(origin.type?.kind ?? '', origin.floatSourceModel ?? '', origin.proven, layer, borrowed, shadowed))) {
      throw unsupported('inclusive range query', 'endpoints need direct primitive f64 values and contains needs one immutable f64 reference', value.span ?? range);
    }
  }
  const values = [lower, upper, argument];
  const names = values.map(() => parser.freshProductBinding());
  const read = index => ({ k: 'name', path: [names[index]], span: values[index].span });
  const comparison = (left, right) => ({ k: 'binary', op: 'le', left, right, span: range });
  const test = { k: 'binary', op: 'and', left: comparison(read(0), read(2)), right: comparison(read(2), read(1)), span: range };
  const result = values.reduceRight((body, value, index) => ({ k: 'let', name: names[index], type: FLOAT, value, body, span: range }), test);
  return parser.origins.mark(result, parser.origins.typeOrigin(BOOL, path));
}

/** Return null for collection receivers, preserving their existing model. */
export function readRustStringEmptyQuery(parser, receiver, args, range) {
  const origin = parser.origins.origin(receiver, parser.modulePath);
  if (origin.arraySourceModel) return null;
  if (args.length !== 0) throw new TranslationError('type', `is_empty expects 0 arguments but got ${args.length}`, range);
  const owner = origin.sourceOwner;
  const standard = owner && acceptRustReadOnlyQueryOwner('string empty', owner.kind, owner.path.join('::'));
  if (!parser.origins.collecting && !acceptRustStringEmptyReceiver(origin.type?.kind ?? '', origin.textSourceModel ?? '', origin.proven,
    origin.wrappers.every(layer => layer === 'reference'), Boolean(standard))) {
    throw unsupported('Rust string empty query', 'the receiver needs a proven standard str or String owner with immutable source layers', range);
  }
  const result = { k: 'binary', op: 'eq', left: receiver, right: { k: 'str', value: '', span: range }, span: range };
  return parser.origins.mark(result, parser.origins.typeOrigin(BOOL, parser.modulePath));
}

/** Project only an actually resolved standard String's zero-argument new. */
export function readRustEmptyStringConstructor(parser, segments, args, path, range) {
  if (segments.at(-1) !== 'new' || segments.length < 2) return null;
  const owner = readRustSourceTypeOwner(parser, segments.slice(0, -1), [], STRING);
  if (owner.kind !== 'library' || !acceptRustReadOnlyQueryOwner('string empty', owner.kind, owner.path.join('::'))) return null;
  if (args.length) throw new TranslationError('type', `String::new expects 0 arguments but got ${args.length}`, range);
  return parser.origins.mark({ k: 'str', value: '', span: range }, {
    ...parser.origins.typeOrigin(STRING, path), sourceOwner: owner,
  });
}
