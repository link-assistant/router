// Checked control flow extending the pinned portable Rust frontend. Original
// vendor files are unchanged. No source body is evaluated or substituted.
import { StringRustParser, StringChecker, StringEmitter } from './strings.mjs';
import { emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { BOOL, UNIT, fixed, sameType } from '../vendor/meta-language/translation/types.js';
import { coerce } from '../vendor/meta-language/translation/check.js';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';

const MUTABLE = Symbol('mutable scalar locals');
const RETURN = Symbol('function return type');
const LOOP = Symbol('loop depth');
const compound = { '+=': 'add', '-=': 'sub', '*=': 'mul', '/=': 'div', '%=': 'rem' };
const range = (start, end) => ({ start: start.start, end: end.end });
const scalar = type => ['fixed', 'bool', 'string', 'unit'].includes(type.kind);

function containsControl(node) {
  if (!node || typeof node !== 'object') return false;
  if (['routerReturn', 'routerBreak', 'routerContinue'].includes(node.k)) return true;
  return Object.entries(node).some(([key, value]) => key !== 'type' && (Array.isArray(value) ? value.some(containsControl) : containsControl(value)));
}

export class ControlRustParser extends StringRustParser {
  fn(path) {
    const c = this.cursor;
    const start = c.expect('fn', 'function');
    const name = c.identifier('function').value;
    if (c.is('<')) throw unsupported('generic function', 'generic signatures require monomorphization', range(start, c.peek()));
    c.expect('(', 'function');
    const params = [];
    while (!c.is(')')) {
      const parameter = c.peek();
      const mutable = Boolean(c.eat('mut'));
      if (c.is('self') || c.is('&')) throw unsupported('method receiver', 'methods require resolved implementation type layouts', range(parameter, c.peek()));
      const name = c.identifier('parameter').value;
      c.expect(':', 'parameter');
      params.push({ name, mutable, type: this.type(), span: range(parameter, c.peek()) });
      if (!c.eat(',')) break;
    }
    c.expect(')', 'function');
    const ret = c.eat('->') ? this.type() : UNIT;
    if (c.is('where')) throw unsupported('where clause', 'trait bounds require resolved trait implementations', range(start, c.peek()));
    const body = this.block(path);
    return { k: 'fn', name, params, ret, body, span: range(start, c.peek()) };
  }

  letStatement(path) {
    const c = this.cursor;
    const start = c.expect('let', 'binding');
    const mutable = Boolean(c.eat('mut'));
    if (c.is('(')) throw unsupported('destructuring let', 'tuple patterns require typed product lowering', range(start, c.peek()));
    const name = c.identifier('binding').value;
    const type = c.eat(':') ? this.type() : undefined;
    c.expect('=', 'initialized binding');
    const value = this.expr(path);
    if (c.is('else')) throw unsupported('let-else', 'refutable binding needs pattern control flow', range(start, c.peek()));
    c.expect(';', 'binding');
    return { name, type, value, mutable, span: range(start, c.peek()) };
  }

  forStatement() {
    throw unsupported('for loop', 'iterator borrowing and range lowering require a typed iterator contract', this.cursor.peek());
  }

  block(path, statement = false) {
    const c = this.cursor;
    const open = c.expect('{', 'block');
    const statements = [];
    let tail;
    while (!c.is('}')) {
      const start = c.peek();
      if (c.is('let')) { statements.push({ k: 'let', ...this.letStatement(path) }); continue; }
      if (c.eat('return')) {
        const value = c.is(';') ? { k: 'unit', span: range(start, start) } : this.expr(path);
        c.expect(';', 'return');
        statements.push({ k: 'routerReturn', value, span: range(start, c.peek()) });
        continue;
      }
      if (c.is('break') || c.is('continue')) {
        const kind = c.next().value;
        if (!c.is(';')) throw unsupported(`${kind} value or label`, 'only unlabelled unit loop control is lowered', range(start, c.peek()));
        c.next(); statements.push({ k: kind === 'break' ? 'routerBreak' : 'routerContinue', span: range(start, c.peek()) }); continue;
      }
      if (c.is('while') || c.is('loop')) {
        const kind = c.next().value;
        const cond = kind === 'loop' ? { k: 'bool', value: true, span: range(start, start) } : this.expr(path, { noStruct: true });
        const loopBody = this.block(path, true);
        statements.push({ k: 'routerWhile', cond, loopBody, span: range(start, c.peek()) });
        continue;
      }
      if (c.is('for')) { statements.push(this.forStatement(path)); continue; }
      const expr = c.is('if') ? this.controlIf(path) : this.expr(path, { statement: true });
      if (c.is('=') || compound[c.peek().value]) {
        if (expr.k !== 'name' || expr.path.length !== 1) throw unsupported('assignment target', 'only scalar local bindings are assignable', expr.span);
        const op = c.next().value;
        const right = this.expr(path);
        const value = op === '=' ? right : { k: 'binary', op: compound[op], left: expr, right, span: range(start, c.peek()) };
        c.expect(';', 'assignment');
        statements.push({ k: 'routerSet', target: expr, value, span: range(start, c.peek()) });
        continue;
      }
      if (c.eat(';')) {
        statements.push(expr.k === 'if' ? { ...expr, k: 'routerIf' } : { k: 'routerDiscard', value: expr, span: expr.span });
        continue;
      }
      if (c.is('}')) { tail = expr; break; }
      if (expr.k === 'if') { statements.push({ ...expr, k: 'routerIf' }); continue; }
      throw this.fail('expected semicolon or final block value');
    }
    const close = c.expect('}', 'block');
    tail ??= { k: 'unit', span: range(open, close), statementUnit: statement };
    return statements.reduceRight((body, entry) => ({ ...entry, body }), tail);
  }

  controlIf(path) {
    const c = this.cursor;
    const start = c.expect('if', 'conditional');
    if (c.is('let')) throw unsupported('if let', 'use an exhaustive match for supported algebraic values', range(start, c.peek()));
    const cond = this.expr(path, { noStruct: true });
    const then = this.block(path, true);
    const otherwise = c.eat('else') ? c.is('if') ? this.controlIf(path) : this.block(path, true) : { k: 'unit', span: range(start, c.peek()) };
    return { k: 'if', cond, then, else: otherwise, span: range(start, c.peek()) };
  }

  postfix(path, options) {
    const c = this.cursor;
    let value = this.primary(path, options);
    for (;;) {
      const start = c.peek();
      if (c.eat('[')) {
        const index = this.expr(path);
        c.expect(']', 'index');
        value = { k: 'routerIndex', object: value, index, span: range(start, c.peek()) }; continue;
      }
      if (c.eat('.')) {
        const method = c.identifier('method');
        if (!c.eat('(')) throw unsupported('field access', 'struct layouts require separate type lowering', range(start, method));
        const args = [];
        while (!c.is(')')) { args.push(this.expr(path)); if (!c.eat(',')) break; }
        c.expect(')', 'method');
        value = this.method(value, method, args, range(start, c.peek())); continue;
      }
      if (c.is('?')) throw unsupported('? operator', 'early error propagation requires return-constructor conversion semantics', start);
      return value;
    }
  }
}

export class ControlChecker extends StringChecker {
  program(surface) {
    this.mutableParameters = new WeakMap();
    const visit = items => {
      for (const item of items) {
        if (item.k === 'module') visit(item.items);
        if (item.k === 'fn') this.mutableParameters.set(item.body, item.params.filter(param => param.mutable).map(param => param.name));
      }
    };
    visit(surface.items);
    return super.program(surface);
  }

  contextEnvironment(node, env, expected) {
    // The first expression visited for each signature carries the return type.
    // Descendant lexical scopes inherit it, even inside unit statement blocks.
    if (!env.has(RETURN) && expected) {
      const mutable = this.mutableParameters.get(node) ?? [];
      if (mutable.some(name => !scalar(env.get(name)))) throw unsupported('mutable aggregate parameter', 'aggregate ownership and aliases require a separate runtime contract', node.span);
      env = new Map(env).set(RETURN, expected).set(MUTABLE, new Set(mutable));
    }
    return env;
  }

  loopEnvironment(env) { return new Map(env).set(LOOP, (env.get(LOOP) ?? 0) + 1); }
  bindingEnvironment(env, name, type, mutable = false) {
    const names = new Set(env.get(MUTABLE) ?? []);
    if (mutable) names.add(name); else names.delete(name);
    return new Map(env).set(name, type).set(MUTABLE, names);
  }

  expr(node, env, path, expected, allowLiteral = false) {
    env = this.contextEnvironment(node, env, expected);
    const checkValue = (value, type) => {
      if (containsControl(value)) throw unsupported('control in value expression', 'nonlocal exits cannot be lowered through a value IIFE', value.span);
      return this.expr(value, env, path, type);
    };
    const checkNext = (next, inner = env) => this.expr(next, inner, path, expected, allowLiteral);
    if (node.k === 'let') {
      const declared = node.type ? this.resolveType(node.type, path, node.span) : undefined;
      let value = checkValue(node.value, declared);
      if (declared) value = coerce(value, declared, this.language, node.span);
      if (node.mutable && !scalar(value.type)) throw unsupported('mutable aggregate', 'mutable aggregate ownership and aliases need a separate runtime contract', node.span);
      const mutable = new Set(env.get(MUTABLE) ?? []);
      if (node.mutable) mutable.add(node.name); else mutable.delete(node.name);
      const inner = new Map(env).set(node.name, value.type).set(MUTABLE, mutable);
      const body = checkNext(node.body, inner);
      return { k: 'let', name: node.name, value, body, mutable: node.mutable ?? false, type: body.type, span: node.span };
    }
    if (node.k === 'routerSet') {
      const name = node.target.path[0];
      if (!env.get(MUTABLE)?.has(name)) throw typeError(`assignment to immutable or unknown local ${name}`, node.span);
      const target = this.expr(node.target, env, path);
      const value = coerce(checkValue(node.value, target.type), target.type, this.language, node.span);
      const body = checkNext(node.body);
      return { k: node.k, target, value, body, type: body.type, span: node.span };
    }
    if (node.k === 'routerReturn') {
      const returns = env.get(RETURN);
      if (!returns) throw typeError('return needs a known function result', node.span);
      const value = coerce(checkValue(node.value, returns), returns, this.language, node.span);
      // Still check unreachable continuation; it must not conceal a refusal.
      const body = checkNext(node.body);
      return { k: node.k, value, body, type: expected ?? returns, span: node.span };
    }
    if (node.k === 'routerBreak' || node.k === 'routerContinue') {
      if (!env.get(LOOP)) throw typeError('loop control outside a loop', node.span);
      const body = checkNext(node.body);
      return { k: node.k, body, type: body.type, span: node.span };
    }
    if (node.k === 'routerWhile') {
      const cond = coerce(checkValue(node.cond, BOOL), BOOL, this.language, node.span);
      const loopBody = this.expr(node.loopBody, new Map(env).set(LOOP, (env.get(LOOP) ?? 0) + 1), path, UNIT);
      if (!sameType(loopBody.type, UNIT)) throw typeError('loop body must evaluate to unit', node.span);
      const body = checkNext(node.body);
      return { k: node.k, cond, loopBody, body, type: body.type, span: node.span };
    }
    if (node.k === 'routerIf') {
      const cond = coerce(checkValue(node.cond, BOOL), BOOL, this.language, node.span);
      const then = this.expr(node.then, new Map(env), path, UNIT);
      const otherwise = this.expr(node.else, new Map(env), path, UNIT);
      if (!sameType(then.type, UNIT) || !sameType(otherwise.type, UNIT)) throw typeError('statement if branches must evaluate to unit', node.span);
      const body = checkNext(node.body);
      return { k: node.k, cond, then, else: otherwise, body, type: body.type, span: node.span };
    }
    if (node.k === 'routerDiscard') {
      // Calls are pure only after their entire dependency closure is checked.
      const value = checkValue(node.value);
      const body = checkNext(node.body);
      return { k: node.k, value, body, type: body.type, span: node.span };
    }
    if (node.k === 'routerIndex') {
      const object = checkValue(node.object);
      if (object.type.kind !== 'array') throw unsupported('index receiver', 'only immutable typed arrays can be indexed', node.span);
      const index = coerce(checkValue(node.index, fixed(64, false)), fixed(64, false), this.language, node.span);
      return { k: 'index', array: object, index, type: object.type.element, span: node.span };
    }
    // Never permit an exit buried in operands, call arguments or match values.
    // Top-level conditional branches and lexical continuations are statements.
    if (!['if', 'match', 'match1'].includes(node.k) && containsControl(node)) throw unsupported('control in expression', 'nonlocal exit requires statement lowering', node.span);
    const result = super.expr(node, env, path, expected, allowLiteral);
    if (node.k === 'if' && node.then?.k === 'unit' && node.else?.k === 'unit' && expected && !sameType(expected, UNIT)) throw typeError('function path ends without a result', node.span);
    return result;
  }
}

const indent = lines => lines.map(line => '  ' + line);
export class ControlEmitter extends StringEmitter {
  statements(node, unit = false) {
    if (node.k === 'unit') return unit ? [] : ['return null;'];
    if (node.k === 'let') return [`${node.mutable ? 'let' : 'const'} ${node.name} = ${this.expr(node.value)};`, ...this.statements(node.body, unit)];
    if (node.k === 'routerSet') return [`${this.expr(node.target)} = ${this.expr(node.value)};`, ...this.statements(node.body, unit)];
    if (node.k === 'routerReturn') return [`return ${this.expr(node.value)};`];
    if (node.k === 'routerBreak') return ['break;'];
    if (node.k === 'routerContinue') return ['continue;'];
    if (node.k === 'routerDiscard') return [`${this.expr(node.value)};`, ...this.statements(node.body, unit)];
    if (node.k === 'routerWhile') return [`while (${this.expr(node.cond)}) {`, ...indent(this.statements(node.loopBody, true)), '}', ...this.statements(node.body, unit)];
    if (node.k === 'routerIf') return [`if (${this.expr(node.cond)}) {`, ...indent(this.statements(node.then, true)), '} else {', ...indent(this.statements(node.else, true)), '}', ...this.statements(node.body, unit)];
    if (node.k === 'if') return [`if (${this.expr(node.cond)}) {`, ...indent(this.statements(node.then, unit)), '} else {', ...indent(this.statements(node.else, unit)), '}'];
    if (unit) return [`${this.expr(node)};`];
    return super.statements(node);
  }

  expr(node) {
    if (['routerSet', 'routerWhile', 'routerIf', 'routerDiscard'].includes(node.k)) return `(() => {\n${indent(this.statements(node)).join('\n')}\n})()`;
    if (['routerReturn', 'routerBreak', 'routerContinue'].includes(node.k)) throw unsupported('nonlocal control emission', 'control cannot appear as a value', node.span);
    return super.expr(node);
  }
}

export const parseRust = source => new ControlRustParser(tokenizeRust(source)).file();
export const checkProgram = surface => new ControlChecker(surface.language, surface.externals ?? []).program(surface);
export const emitJavaScript = program => emitWith(program, ControlEmitter);
