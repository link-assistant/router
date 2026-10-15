// Binding forms share one evaluation order: read the value once, then bind
// its selected fields or elements from left to right.
import { unsupported, typeError } from './diagnostics.js';
import { imperative, lowerImperative, statementUses } from './javascript-lower.js';

export function readClosure(parser, method = false) {
  const c = parser.cursor;
  const start = c.peek();
  const expression = method || Boolean(c.eat('function'));
  if (expression && c.isKind('identifier')) throw unsupported('named function expression', 'the function name needs a recursive local binding', c.peek());
  if (c.is('*')) throw unsupported('generator function', 'generators require a suspended execution state', c.peek());
  const tokens = c.eat('(') ? parser.parameters('closure') : [c.identifier('closure parameter')];
  if (!expression) c.expect('=>', 'closure');
  const names = tokens.map((token) => token.value);
  if (new Set(names).size !== names.length) throw typeError('duplicate closure parameter', start);
  if (tokens.some((token) => token.defaultValue)) throw unsupported('closure parameter default', 'a function value needs a callable default-argument signature', start);
  const params = tokens.map((token) => ({ name: token.value, type: null, span: { start: token.start, end: token.end } }));
  const outer = parser.scope;
  const outerJumps = parser.jumps;
  const outerTop = parser.topLevel;
  const outerAsync = parser.inAsync;
  parser.scope = { locals: new Set([...outer.locals, ...names]), tdz: new Set([...outer.tdz].filter((name) => !names.includes(name))), mutable: new Set([...outer.mutable, ...names]) };
  parser.jumps = { loops: 0, switches: 0 };
  parser.topLevel = false;
  parser.inAsync = false;
  try {
    const statements = c.is('{') ? parser.blockStatements() : [{ s: 'return', expr: parser.expr(), span: start }];
    const where = { start: start.start, end: c.peek().start };
    const { assigned, free } = statementUses(statements, new Set(names));
    const assignedCaptures = [...assigned].filter((name) => outer.locals.has(name));
    if (assignedCaptures.length && !parser.referenceSemantics) throw unsupported('mutable closure capture', 'captured assignments require a shared cell across calls', where);
    const captures = [...free].filter((name) => outer.locals.has(name));
    const body = imperative(statements) ? lowerImperative(parser, `closure${++parser.generatedCount}`, params, statements, where, new Set(assignedCaptures), new Set(captures)) : parser.lower(statements, where);
    return { k: 'lambda', params, ret: null, captures, ...(assignedCaptures.length ? { assignedCaptures } : {}), body, span: where };
  } finally {
    parser.scope = outer;
    parser.jumps = outerJumps;
    parser.topLevel = outerTop;
    parser.inAsync = outerAsync;
  }
}

export function validateClosureCaptures(statements, references = false) {
  const assigned = new Set();
  const closures = [];
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (node.k === 'lambda') { closures.push(node); return; }
    if (node.s === 'assign') assigned.add(node.name);
    for (const [key, value] of Object.entries(node)) if (key !== 'span' && key !== 'type') visit(value);
  };
  visit(statements);
  for (const closure of closures) {
    const capture = closure.captures.find((name) => assigned.has(name));
    if (capture && !references) throw unsupported(`mutable closure capture ${capture}`, 'captured assignments require a shared cell across calls', closure.span);
  }
}

export function readArrayBinding(parser, path = []) {
  const c = parser.cursor;
  c.expect('[', 'array binding');
  const bindings = [];
  let index = 0;
  while (!c.is(']')) {
    if (c.eat(',')) { index += 1; continue; }
    if (c.is('...')) throw unsupported('array rest binding', 'rest binding needs an array suffix operation', c.peek());
    if (c.is('[')) {
      bindings.push(...readArrayBinding(parser, [...path, index]));
      index += 1;
      if (!c.eat(',')) break;
      continue;
    }
    const token = c.identifier('array binding');
    if (token.value.startsWith('ml_')) throw unsupported('reserved identifier', `${token.value} uses the translator's reserved ml_ prefix`, token);
    if (c.is('=')) throw unsupported('array binding default', 'a missing element needs an undefined-aware default', token);
    bindings.push({ name: token.value, index, ...(path.length ? { path: [...path, index] } : {}), span: { start: token.start, end: token.end } });
    index += 1;
    if (!c.eat(',')) break;
  }
  c.expect(']', 'array binding');
  return bindings;
}

export function bindArrayElements(bindings, object, binding, where) {
  return bindings.map((entry) => ({
    s: binding, name: entry.name,
    value: (entry.path ?? [entry.index]).reduce((value, index) => ({ k: 'index', object: value, index: { k: 'num', value: String(index), span: entry.span }, ...(entry.path && { productBinding: true }), span: entry.span }), object),
    span: where,
  }));
}

// Split type syntax at its outer level, retaining commas and bars inside
// records, tuples, generic arguments and parentheses.
export function splitType(text, separator) {
  let depth = 0;
  let start = 0;
  const parts = [];
  for (let at = 0; at < text.length; at += 1) {
    if ('{[<('.includes(text[at])) depth += 1;
    if ('}]>)'.includes(text[at]) && !(text[at] === '>' && text[at - 1] === '=')) depth -= 1;
    if (!depth && text[at] === separator) { parts.push(text.slice(start, at).trim()); start = at + 1; }
  }
  parts.push(text.slice(start).trim());
  return parts;
}

export function readCompositeType(parser, name, range) {
  if (name.startsWith('(')) {
    let depth = 0;
    let close = -1;
    for (let at = 0; at < name.length; at += 1) {
      if (name[at] === '(') depth += 1;
      if (name[at] === ')' && --depth === 0) { close = at; break; }
    }
    if (close >= 0 && name.slice(close + 1).trimStart().startsWith('=>')) {
      const result = name.slice(close + 1).trimStart().slice(2).trim();
      if (!result) throw unsupported(`JSDoc type {${name}}`, 'a function type needs a return type', range);
      const params = splitType(name.slice(1, close), ',').filter(Boolean).map((part) => {
        const pieces = splitType(part, ':');
        return parser.type(pieces.length > 1 ? pieces.slice(1).join(':') : part, range);
      });
      return { kind: 'function', params, ret: parser.type(result, range) };
    }
  }
  const callable = /^function\s*\(([\s\S]*)\)\s*:\s*([\s\S]+)$/u.exec(name);
  if (callable) return { kind: 'function', params: splitType(callable[1], ',').filter(Boolean).map((part) => parser.type(part, range)), ret: parser.type(callable[2], range) };
  if (name.startsWith('(') && name.endsWith(')')) return parser.type(name.slice(1, -1), range);
  const alternatives = splitType(name, '|');
  if (alternatives.length > 1) {
    const missing = alternatives.filter((part) => part === 'null' || part === 'undefined');
    const values = alternatives.filter((part) => part !== 'null' && part !== 'undefined');
    if (missing.length && values.length === 1) return { kind: 'option', element: parser.type(values[0], range), absence: missing.length > 1 ? 'both' : missing[0] };
    return { kind: 'union', alternatives: alternatives.map((part) => parser.type(part, range)) };
  }
  if (name === 'null' || name === 'undefined') return { kind: 'absence', absence: name };
  if (name.startsWith('?')) return { kind: 'option', element: parser.type(name.slice(1), range), absence: 'null' };
  if (name.startsWith('[') && name.endsWith(']')) return { kind: 'tuple', elements: splitType(name.slice(1, -1), ',').filter(Boolean).map((part) => parser.type(part, range)) };
  if (name.startsWith('{') && name.endsWith('}')) {
    const fields = splitType(name.slice(1, -1), ',').filter(Boolean).map((part) => {
      const index = part.indexOf(':');
      if (index < 0) throw unsupported(`record type {${name}}`, 'every field has a name and a type', range);
      const field = part.slice(0, index).trim();
      const optional = field.endsWith('?');
      const type = parser.type(part.slice(index + 1), range);
      return { name: optional ? field.slice(0, -1) : field, type: optional ? { kind: 'option', element: type, absence: 'undefined' } : type };
    });
    return { kind: 'record', fields };
  }
  const generic = /^(Set|Map)<([\s\S]+)>$/u.exec(name);
  if (generic) {
    const arguments_ = splitType(generic[2], ',');
    if (generic[1] === 'Set' && arguments_.length === 1) return { kind: 'set', element: parser.type(arguments_[0], range) };
    if (generic[1] === 'Map' && arguments_.length === 2) return { kind: 'map', key: parser.type(arguments_[0], range), value: parser.type(arguments_[1], range) };
    throw unsupported(`JSDoc type {${name}}`, 'Set has one type argument and Map has two', range);
  }
  return null;
}

export function isLiteralBinding(value) {
  if (['num', 'bool', 'str', 'none'].includes(value.k)) return true;
  return value.k === 'record' && value.entries.every((entry) => !entry.spread && isLiteralBinding(entry.value));
}
