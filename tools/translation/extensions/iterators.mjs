// Lazy, typed scalar iterators. Eager JavaScript Array.map/filter would change
// panic timing and short circuiting, so iterator adapters use generators.
import { DataRustParser, DataChecker, DataEmitter } from './data.mjs';
import { emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { BOOL, UNIT, array, fixed, isNumeric, sameType } from '../vendor/meta-language/translation/types.js';
import { coerce } from '../vendor/meta-language/translation/check.js';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';

const USIZE = fixed(64, false);
const operations = new Set(['iter', 'into_iter', 'map', 'filter', 'take', 'collect', 'count', 'any', 'all', 'fold', 'sum', 'copied', 'cloned']);
const span = (start, end) => ({ start: start.start, end: end.end });
const containsExit = node => node && typeof node === 'object' && (['routerReturn', 'routerBreak', 'routerContinue'].includes(node.k) || Object.entries(node).some(([key, value]) => key !== 'type' && (Array.isArray(value) ? value.some(containsExit) : containsExit(value))));

export class IteratorRustParser extends DataRustParser {
  expr(path, options = {}) {
    const start = super.expr(path, options);
    const c = this.cursor;
    if (!c.is('..') && !c.is('..=')) return start;
    const inclusive = c.next().value === '..=';
    const end = super.expr(path, options);
    return { k: 'routerRange', start, end, inclusive, span: { start: start.span.start, end: end.span.end } };
  }

  forStatement(path) {
    const c = this.cursor;
    const start = c.expect('for', 'iteration');
    const borrowed = Boolean(c.eat('&'));
    if (borrowed && c.is('mut')) throw unsupported('mutable iteration reference', 'aggregate reference ownership is not lowered', c.peek());
    const mutable = Boolean(c.eat('mut'));
    const name = c.identifier('iteration binding').value;
    c.expect('in', 'iteration');
    const object = this.expr(path, { noStruct: true });
    const loopBody = this.block(path, true);
    return { k: 'routerFor', name, mutable, object, loopBody, span: span(start, c.peek()) };
  }

  primary(path, options) {
    const c = this.cursor;
    if (c.is('move')) throw unsupported('move closure', 'capture snapshots need a separate ownership lowering', c.peek());
    if (!c.is('|') && !c.is('||')) return super.primary(path, options);
    const start = c.next();
    const params = [];
    if (start.value === '|') {
      while (!c.is('|')) {
        c.eat('&');
        if (c.is('mut')) throw unsupported('mutable closure parameter', 'only immutable scalar callback arguments are lowered', c.peek());
        const token = c.identifier('closure parameter');
        const type = c.eat(':') ? this.type() : null;
        if (params.some(param => param.name === token.value)) throw typeError('duplicate closure parameter', token);
        params.push({ name: token.value, type, span: span(token, c.peek()) });
        if (!c.eat(',')) break;
      }
      c.expect('|', 'closure');
    }
    if (c.is('->')) throw unsupported('closure return annotation', 'callback result types are inferred from checked bodies', c.peek());
    return { k: 'routerLambda', params, body: this.expr(path), span: span(start, c.peek()) };
  }

  postfix(path, options) {
    const c = this.cursor;
    let value = this.primary(path, options);
    for (;;) {
      const start = c.peek();
      if (c.eat('[')) { const index = this.expr(path); c.expect(']', 'index'); value = { k: 'routerIndex', object: value, index, span: span(start, c.peek()) }; continue; }
      if (c.eat('.')) {
        const name = c.identifier('field or method');
        let explicit = null;
        if (c.eat('::')) {
          if (!['collect', 'sum'].includes(name.value)) throw unsupported('method turbofish', 'only collect/sum result annotations are checked', span(start, c.peek()));
          c.expect('<', 'method type'); explicit = this.type(); c.expect('>', 'method type');
        }
        if (!c.eat('(')) {
          if (explicit) throw typeError('type annotation on field', span(start, name));
          value = { k: 'routerField', object: value, field: name.value, span: span(start, name) }; continue;
        }
        const args = [];
        while (!c.is(')')) { args.push(this.expr(path)); if (!c.eat(',')) break; }
        c.expect(')', 'method');
        value = operations.has(name.value) && !(name.value === 'count' && value.k === 'routerStringView') ? { k: 'routerIteratorOperation', op: name.value, object: value, args, explicit, span: span(start, c.peek()) } : this.method(value, name, args, span(start, c.peek()));
        continue;
      }
      if (c.is('?')) throw unsupported('? operator', 'error propagation requires constructor conversion semantics', start);
      return value;
    }
  }
}

export class IteratorChecker extends DataChecker {
  lambda(node, argumentTypes, env, path, expected) {
    if (node.k !== 'routerLambda' || node.params.length !== argumentTypes.length) throw typeError(`iterator callback needs ${argumentTypes.length} scalar parameters`, node.span);
    if (containsExit(node.body)) throw unsupported('closure exit', 'callback bodies must use tail values', node.span);
    let inner = new Map(env);
    node.params.forEach((param, index) => {
      if (param.type && !sameType(this.resolveType(param.type, path, param.span), argumentTypes[index])) throw typeError('callback parameter type differs from iterator element', param.span);
      inner = this.bindingEnvironment(inner, param.name, argumentTypes[index]);
    });
    let body = this.expr(node.body, inner, path, expected);
    if (expected) body = coerce(body, expected, this.language, node.span);
    const result = body.type;
    // Bindings use the standard checked let vocabulary so upstream capture-
    // avoiding renaming also handles callback shadowing and reserved names.
    for (let index = node.params.length - 1; index >= 0; index--) body = { k: 'let', name: node.params[index].name, value: { k: 'routerLambdaInput', position: index, type: argumentTypes[index] }, body, type: result };
    return { k: 'routerLambda', binding: body, arity: argumentTypes.length, type: { kind: 'routerCallback', result }, span: node.span };
  }

  expr(node, env, path, expected, allowLiteral = false) {
    env = this.contextEnvironment(node, env, expected);
    if (node.k === 'let' && this.expr(node.value, env, path, node.type ? this.resolveType(node.type, path, node.span) : undefined).type.kind === 'routerIterator') throw unsupported('stored iterator', 'consumption and escaping captures need an ownership contract', node.span);
    if (node.k === 'routerRange') {
      const [start, end] = this.operands(node.start, node.end, env, path, node.span);
      if (start.type.kind !== 'fixed') throw unsupported('range domain', 'only bounded primitive integer ranges are lowered', node.span);
      return { k: 'routerRange', start, end, inclusive: node.inclusive, type: { kind: 'routerIterator', element: start.type }, span: node.span };
    }
    if (node.k === 'routerFor') {
      let object = this.expr(node.object, env, path);
      if (object.type.kind === 'array') object = this.expr({ k: 'routerIteratorOperation', op: 'iter', object: node.object, args: [], span: node.span }, env, path);
      if (object.type.kind !== 'routerIterator') throw typeError('for needs a supported scalar iterator', node.span);
      const inner = this.bindingEnvironment(this.loopEnvironment(env), node.name, object.type.element, node.mutable);
      const loopBody = this.expr(node.loopBody, inner, path, UNIT);
      if (!sameType(loopBody.type, UNIT)) throw typeError('for body must evaluate to unit', node.span);
      const binding = { k: 'let', name: node.name, mutable: node.mutable, value: { k: 'routerLoopInput', type: object.type.element }, body: loopBody, type: UNIT };
      const body = this.expr(node.body, env, path, expected, allowLiteral);
      return { k: 'routerFor', object, loopBody: binding, body, type: body.type, span: node.span };
    }
    if (node.k === 'routerLambda') throw unsupported('standalone closure', 'closures need a typed iterator callback context', node.span);
    if (node.k !== 'routerIteratorOperation') return super.expr(node, env, path, expected, allowLiteral);
    const op = node.op;
    const count = { map: 1, filter: 1, take: 1, any: 1, all: 1, fold: 2 }[op] ?? 0;
    if (node.args.length !== count) throw typeError(`${op} expects ${count} arguments`, node.span);
    const wanted = node.explicit ? this.resolveType(node.explicit, path, node.span) : expected;
    const itemExpected = op === 'collect' && wanted?.kind === 'array' ? { kind: 'routerIterator', element: wanted.element } : expected?.kind === 'routerIterator' ? expected : undefined;
    const object = this.expr(node.object, env, path, itemExpected);
    if (op === 'iter' || op === 'into_iter') {
      if (object.type.kind !== 'array') throw unsupported('iterator receiver', 'only immutable typed scalar arrays have an iterator adapter', node.span);
      if (!['fixed', 'bool', 'string'].includes(object.type.element.kind)) throw unsupported('iterator element', 'aggregate borrowing and ownership need separate adapters', node.span);
      return { k: 'routerIteratorOperation', op: 'iter', object, args: [], type: { kind: 'routerIterator', element: object.type.element }, span: node.span };
    }
    if (object.type.kind !== 'routerIterator') throw typeError(`${op} requires a supported iterator`, node.span);
    const element = object.type.element;
    if (['copied', 'cloned'].includes(op)) return object;
    if (op === 'map' || op === 'filter') {
      const callback = this.lambda(node.args[0], [element], env, path, op === 'filter' ? BOOL : itemExpected?.element);
      const result = op === 'map' ? callback.type.result : element;
      if (!['fixed', 'bool', 'string'].includes(result.kind)) throw unsupported('mapped iterator result', 'only scalar iterator values have a checked contract', node.span);
      return { k: 'routerIteratorOperation', op, object, args: [callback], type: { kind: 'routerIterator', element: result }, span: node.span };
    }
    if (op === 'take') {
      const limit = coerce(this.expr(node.args[0], env, path, USIZE), USIZE, this.language, node.span);
      return { k: 'routerIteratorOperation', op, object, args: [limit], type: object.type, span: node.span };
    }
    if (op === 'collect') {
      const type = array(element);
      if (wanted && !sameType(type, wanted)) throw typeError('collect element does not match its expected array type', node.span);
      return { k: 'routerIteratorOperation', op, object, args: [], type, span: node.span };
    }
    if (op === 'count') return { k: 'routerIteratorOperation', op, object, args: [], type: USIZE, span: node.span };
    if (op === 'any' || op === 'all') return { k: 'routerIteratorOperation', op, object, args: [this.lambda(node.args[0], [element], env, path, BOOL)], type: BOOL, span: node.span };
    if (op === 'fold') {
      let initial = this.expr(node.args[0], env, path, wanted);
      if (wanted) initial = coerce(initial, wanted, this.language, node.span);
      if (!['fixed', 'bool', 'string'].includes(initial.type.kind)) throw unsupported('fold accumulator', 'only scalar accumulators have a checked contract', node.span);
      const callback = this.lambda(node.args[1], [initial.type, element], env, path, initial.type);
      return { k: 'routerIteratorOperation', op, object, args: [initial, callback], type: initial.type, span: node.span };
    }
    if (op === 'sum') {
      if (!isNumeric(element) || wanted && !sameType(element, wanted)) throw typeError('sum requires a matching checked integer element type', node.span);
      return { k: 'routerIteratorOperation', op, object, args: [], type: element, span: node.span };
    }
    throw unsupported(`iterator ${op}`, 'no checked operation', node.span);
  }
}

const HELPERS = {
  range: 'function* ml_router_range(start, end, inclusive) { for (let value = start; value < end || inclusive && value === end;) { yield value; if (value === end) return; value += 1n; } }',
  iter: 'function ml_router_iter(values) { return Array.prototype.values.call(values); }',
  map: 'function* ml_router_map(values, transform) { for (const value of values) yield transform(value); }',
  filter: 'function* ml_router_filter(values, predicate) { for (const value of values) if (predicate(value)) yield value; }',
  take: 'function* ml_router_take(values, limit) { while (limit > 0n) { const next = values.next(); if (next.done) return; limit -= 1n; yield next.value; } }',
  collect: 'function ml_router_collect(values) { return Object.freeze(Array.from(values)); }',
  count: 'function ml_router_count(values) { let count = 0n; for (const value of values) { void value; count += 1n; } return count; }',
  any: 'function ml_router_any(values, predicate) { for (const value of values) if (predicate(value)) return true; return false; }',
  all: 'function ml_router_all(values, predicate) { for (const value of values) if (!predicate(value)) return false; return true; }',
  fold: 'function ml_router_fold(values, initial, combine) { let result = initial; for (const value of values) result = combine(result, value); return result; }',
};

export class IteratorEmitter extends DataEmitter {
  constructor(program, state) { super(program, state); this.iteratorHelpers = new Set(); }
  file() {
    const result = super.file();
    const helpers = [...this.iteratorHelpers].map(name => HELPERS[name]);
    return { ...result, preludes: [...result.preludes, ...helpers], text: [...helpers, result.text].join('\n') };
  }
  statements(node, unit = false) {
    if (node.k === 'routerFor') {
      const binding = node.loopBody;
      return [`for (${binding.mutable ? 'let' : 'const'} ${binding.name} of ${this.expr(node.object)}) {`, ...this.statements(binding.body, true).map(line => '  ' + line), '}', ...this.statements(node.body, unit)];
    }
    return super.statements(node, unit);
  }
  expr(node) {
    if (node.k === 'routerRange') { this.iteratorHelpers.add('range'); return `ml_router_range(${this.expr(node.start)}, ${this.expr(node.end)}, ${node.inclusive})`; }
    if (node.k === 'routerFor') return `(() => {\n${this.statements(node).join('\n')}\n})()`;
    if (node.k === 'routerLambda') {
      const params = [];
      let body = node.binding;
      for (let index = 0; index < node.arity; index++) { params.push(body.name); body = body.body; }
      return `(${params.join(', ')}) => { ${this.statements(body).join('\n')} }`;
    }
    if (node.k !== 'routerIteratorOperation') return super.expr(node);
    const object = this.expr(node.object);
    this.state.encode('rust-lazy-scalar-iterators', 'immutable scalar slice adapters preserve lazy map/filter evaluation and short-circuit any/all/take; aggregate ownership and consuming an iterator twice are not established');
    if (node.op === 'sum') {
      this.iteratorHelpers.add('fold');
      const addition = this.checked('(left + right)', node.type, 'add');
      return `ml_router_fold(${object}, 0n, (left, right) => ${addition})`;
    }
    this.iteratorHelpers.add(node.op);
    return `ml_router_${node.op}(${[object, ...node.args.map(arg => this.expr(arg))].join(', ')})`;
  }
}

export const parseRust = source => new IteratorRustParser(tokenizeRust(source)).file();
export const checkProgram = surface => new IteratorChecker(surface.language, surface.externals ?? []).program(surface);
export const emitJavaScript = program => emitWith(program, IteratorEmitter);
