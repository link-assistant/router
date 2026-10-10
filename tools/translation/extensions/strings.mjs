import { RustParser, Checker, JavaScriptEmitter, emitWith } from './core.mjs';
import { tokenizeRust } from './lexical.mjs';
import { BOOL, STRING, fixed, fixedBounds, typeKey, array } from '../vendor/meta-language/translation/types.js';
import { coerce } from '../vendor/meta-language/translation/check.js';
import { typeError, unsupported } from '../vendor/meta-language/translation/diagnostics.js';

// Unicode White_Space, stable through the pinned Rust 1.99 Unicode tables.
// ECMAScript \s includes BOM and omits NEL, so it cannot encode Rust trim.
const WHITE_SPACE = '\\u0009-\\u000d\\u0020\\u0085\\u00a0\\u1680\\u2000-\\u200a\\u2028\\u2029\\u202f\\u205f\\u3000';
const MAPS = new Set(['trim', 'trim_start', 'trim_end', 'to_ascii_lowercase', 'to_ascii_uppercase']);
const TESTS = new Set(['eq_ignore_ascii_case', 'is_empty', 'is_ascii']);
const USIZE = fixed(64, false);

class StringRustParser extends RustParser {
  constructor(tokens) {
    super(tokens);
    this.genericTypes = new Map();
  }

  file() {
    const surface = super.file();
    surface.items.push(...this.genericTypes.values());
    return surface;
  }

  genericType(kind, types, span) {
    const encode = type => type.kind === 'named' ? type.path.join('_') : typeKey(type);
    const name = `Router${kind}_${types.map(encode).join('_')}`;
    if (!this.genericTypes.has(name)) {
      const ctors = kind === 'Option' ? [{ name: 'None', fields: [] }, { name: 'Some', fields: [{ type: types[0] }] }] : [{ name: 'Ok', fields: [{ type: types[0] }] }, { name: 'Err', fields: [{ type: types[1] }] }];
      this.genericTypes.set(name, { k: 'data', name, ctors, span, generated: 'router-monomorphic-algebraic-type' });
    }
    return { kind: 'named', path: [name], span };
  }

  type() {
    const c = this.cursor;
    const first = c.peek();
    if (c.eat('[')) {
      const element = this.type();
      c.expect(']', 'immutable slice');
      return array(element);
    }
    if (first.value === 'Vec' && c.is('<', 1)) {
      c.next(); c.next();
      const element = this.type();
      c.expect('>', 'Vec');
      return array(element);
    }
    if (['Option', 'Result'].includes(first.value) && c.is('<', 1)) {
      const kind = c.next().value;
      c.expect('<', kind);
      const types = [this.type()];
      if (kind === 'Result') { c.expect(',', kind); types.push(this.type()); }
      c.expect('>', kind);
      return this.genericType(kind, types, { start: first.start, end: c.peek().start });
    }
    return super.type();
  }

  method(receiver, method, args, span) {
    const op = method.value;
    if (['is_some', 'is_none', 'is_ok', 'is_err', 'unwrap_or'].includes(op)) {
      const count = op === 'unwrap_or' ? 1 : 0;
      if (args.length !== count) throw typeError(`${op} expects ${count} arguments`, span);
      return { k: 'routerAlgebraicOperation', op, object: receiver, args, span };
    }
    if (['strip_prefix', 'strip_suffix'].includes(op)) {
      if (args.length !== 1) throw typeError(`${op} expects one string argument`, span);
      return { k: 'routerStrip', op, object: receiver, search: args[0], result: this.genericType('Option', [STRING], span), span };
    }
    if (MAPS.has(op) || TESTS.has(op) || ['len', 'as_bytes', 'chars', 'count'].includes(op)) {
      const count = op === 'eq_ignore_ascii_case' ? 1 : 0;
      if (args.length !== count) throw typeError(`${op} expects ${count} arguments`, span);
      if (op === 'as_bytes' || op === 'chars') return { k: 'routerStringView', op, object: receiver, span };
      if (op === 'count') {
        if (receiver.k !== 'routerStringView' || receiver.op !== 'chars') throw unsupported('count', 'only str.chars().count() is supported', span);
        return { k: 'routerStringOperation', op: 'scalar_length', object: receiver.object, span };
      }
      if (op === 'len' && receiver.k === 'routerStringView') {
        if (receiver.op !== 'as_bytes') throw unsupported('len', 'chars iterators have no len()', span);
        receiver = receiver.object;
      }
      return { k: 'routerStringOperation', op: op === 'len' ? 'byte_length' : op, object: receiver, args, span };
    }
    return super.method(receiver, method, args, span);
  }

  primary(path, options) {
    const c = this.cursor;
    const first = c.peek();
    if (c.is('String') && c.is('::', 1) && c.is('new', 2) && c.is('(', 3) && c.is(')', 4)) {
      for (let at = 0; at < 5; at++) c.next();
      return { k: 'str', value: '', span: { start: first.start, end: c.peek().start } };
    }
    if (c.is('Vec') && c.is('::', 1) && c.is('new', 2) && c.is('(', 3) && c.is(')', 4)) {
      for (let at = 0; at < 5; at++) c.next();
      return { k: 'array', items: [], span: { start: first.start, end: c.peek().start } };
    }
    return super.primary(path, options);
  }

  expressionMacro(token, path) {
    if (token.value !== 'vec') return super.expressionMacro(token, path);
    const c = this.cursor;
    c.expect('[', 'vec!');
    const items = [];
    while (!c.is(']')) {
      items.push({ value: this.expr(path), spread: false });
      if (c.is(';')) throw unsupported('vec! repetition', 'allocation counts require a bounded allocation contract', { start: token.start, end: c.peek().end });
      if (!c.eat(',')) break;
    }
    c.expect(']', 'vec!');
    return { k: 'array', items, span: { start: token.start, end: c.peek().start } };
  }

  block(path) {
    const c = this.cursor;
    const open = c.expect('{', 'block');
    const lets = [];
    let tail = null;
    while (!c.is('}')) {
      const token = c.peek();
      if (c.is('let')) { lets.push(this.letStatement(path)); continue; }
      if (c.eat('return')) {
        tail = this.expr(path);
        c.expect(';', 'tail return');
        if (!c.is('}')) throw unsupported('early return', 'only a final return expression is lowered', { start: token.start, end: c.peek().end });
        continue;
      }
      if (['while', 'loop', 'for'].includes(token.value)) throw unsupported(`${token.value} loop`, 'mutable iteration is outside the pure subset', token);
      const expr = this.expr(path, { statement: true });
      if (c.eat(';')) {
        if (expr.k === 'abort') {
          if (!c.is('}')) throw unsupported('nonterminal abort', 'control flow after an abort remains carried', expr.span);
          tail = expr; continue;
        }
        throw unsupported('expression statement', 'effects are outside the pure subset', expr.span);
      }
      tail = expr;
      if (!c.is('}')) throw unsupported('expression statement', 'a pure block value must be its final expression', expr.span);
    }
    const close = c.expect('}', 'block');
    if (!tail) throw unsupported('block without a value', 'unit bodies are outside the pure value subset', { start: open.start, end: close.end });
    return lets.reduceRight((body, binding) => ({ k: 'let', ...binding, body, span: binding.span }), tail);
  }

  pattern(path, aliases) {
    const token = this.cursor.peek();
    if (token.kind === 'string') {
      this.cursor.next();
      return { k: 'strLit', value: token.value, span: { start: token.start, end: token.end } };
    }
    return super.pattern(path, aliases);
  }
}

class StringChecker extends Checker {
  normalisePattern(pattern, type, span) {
    if (pattern.k === 'ctor' && type.kind === 'data' && /^Router(?:Option|Result)_/u.test(type.name) && pattern.path.length <= 2 && ['Some', 'None', 'Ok', 'Err'].includes(pattern.path.at(-1))) {
      pattern = { ...pattern, path: [type.name, pattern.path.at(-1)] };
    }
    return super.normalisePattern(pattern, type, span);
  }

  expr(node, env, path, expected, allowLiteral = false) {
    if (expected?.kind === 'data' && /^Router(?:Option|Result)_/u.test(expected.name)) {
      const callee = node.k === 'app' ? node.fn : node;
      if (callee.k === 'name' && callee.path.length <= 2 && ['Some', 'None', 'Ok', 'Err'].includes(callee.path.at(-1))) {
        const qualified = { ...callee, path: [expected.name, callee.path.at(-1)] };
        node = node.k === 'app' ? { ...node, fn: qualified } : qualified;
      }
    }
    if (node.k === 'routerAlgebraicOperation') {
      const value = this.expr(node.object, env, path, undefined);
      if (value.type.kind !== 'data' || !/^Router(?:Option|Result)_/u.test(value.type.name)) throw typeError(`${node.op} requires a supported Option or Result`, node.span);
      const option = value.type.name.startsWith('RouterOption_');
      if ((['is_some', 'is_none'].includes(node.op) && !option) || (['is_ok', 'is_err'].includes(node.op) && option)) throw typeError(`${node.op} is not a method of this algebraic type`, node.span);
      const ctor = this.items.get(value.type.name).ctors.find(ctor => ctor.name === (option ? 'Some' : 'Ok'));
      const resultType = node.op === 'unwrap_or' ? ctor.fields[0].type : BOOL;
      const args = node.args.map(arg => coerce(this.expr(arg, env, path, resultType), resultType, this.language, node.span));
      return { k: 'routerAlgebraicOperation', op: node.op, value, args, option, type: resultType, span: node.span };
    }
    if (node.k === 'routerStrip') {
      const string = this.expr(node.object, env, path, STRING);
      const search = this.expr(node.search, env, path, STRING);
      if (string.type.kind !== 'string' || search.type.kind !== 'string') throw typeError(`${node.op} requires strings`, node.span);
      return { k: 'routerStrip', op: node.op, string, search, type: this.resolveType(node.result, path, node.span), span: node.span };
    }
    if (node.k === 'routerStringView') throw unsupported(node.op, 'a borrowed string view is only lowered when immediately measured', node.span);
    if (node.k !== 'routerStringOperation') return super.expr(node, env, path, expected, allowLiteral);
    const string = this.expr(node.object, env, path, STRING);
    if (string.type.kind === 'array' && ['byte_length', 'is_empty'].includes(node.op)) return { k: 'routerArrayMeasure', op: node.op, array: string, type: node.op === 'is_empty' ? BOOL : USIZE, span: node.span };
    if (string.type.kind !== 'string') throw typeError(`${node.op} requires a string receiver`, node.span);
    const args = (node.args ?? []).map(arg => this.expr(arg, env, path, STRING));
    if (args.some(arg => arg.type.kind !== 'string')) throw typeError(`${node.op} requires string arguments`, node.span);
    const type = MAPS.has(node.op) ? STRING : TESTS.has(node.op) ? BOOL : USIZE;
    return { k: 'routerStringOperation', op: node.op, string, args, type, span: node.span };
  }
}

class StringEmitter extends JavaScriptEmitter {
  constructor(program, state) {
    super(program, state);
    this.routerHelpers = new Set();
  }

  file() {
    const emitted = super.file();
    const helpers = {
      strip: `function ml_router_strip(value, search, suffix) {\n  const matches = suffix ? value.endsWith(search) : value.startsWith(search);\n  if (!matches) return Object.freeze({ $: 'None' });\n  const text = suffix ? value.slice(0, value.length - search.length) : value.slice(search.length);\n  return Object.freeze({ $: 'Some', field0: text });\n}`,
      unwrap: `function ml_router_unwrap(value, fallback, option) {\n  return value.$ === (option ? 'Some' : 'Ok') ? value.field0 : fallback;\n}`,
      unexpected: `function ml_router_unexpected(value) {\n  throw new TypeError(\`unexpected constructor \${value.$}\`);\n}`,
    };
    const extra = [...this.routerHelpers].map(name => helpers[name]);
    return { ...emitted, definitions: emitted.definitions, preludes: [...emitted.preludes, ...extra], text: [...extra, emitted.text].join('\n') };
  }
  matchStatements(node) {
    if (node.scrutinee.type.kind !== 'data') return super.matchStatements(node);
    // Keep the upstream checked constructor dispatch. An opaque error helper
    // prevents TypeScript reading .$ from an exhaustively narrowed `never`.
    const lines = [];
    const subject = node.scrutinee.k === 'var' ? node.scrutinee.name : `ml_subject${++this.temporaries}`;
    if (node.scrutinee.k !== 'var') lines.push(`const ${subject} = ${this.expr(node.scrutinee)};`);
    const data = this.program.declarations.get(node.scrutinee.type.name);
    const indent = (text, depth) => text.split('\n').map(line => '  '.repeat(depth) + line).join('\n');
    lines.push(`switch (${subject}.$) {`);
    for (const arm of node.cases.filter(arm => arm.pattern.k === 'ctor')) {
      const ctor = data.ctors.find(ctor => ctor.name === arm.pattern.ctor);
      const bindings = arm.pattern.binds.flatMap((name, index) => name ? [`const ${name} = ${subject}.${ctor.fields[index].name};`] : []);
      lines.push(`  case ${JSON.stringify(ctor.name)}: {`, indent([...bindings, ...this.statements(arm.body)].join('\n'), 2), '  }');
    }
    const fallback = node.cases.find(arm => ['wild', 'bind'].includes(arm.pattern.k));
    lines.push('  default: {');
    if (fallback) lines.push(indent([...(fallback.pattern.k === 'bind' ? [`const ${fallback.pattern.name} = ${subject};`] : []), ...this.statements(fallback.body)].join('\n'), 2));
    else { this.routerHelpers.add('unexpected'); lines.push(`    return ml_router_unexpected(${subject});`); }
    lines.push('  }', '}');
    return lines;
  }
  parameterGuard(param) {
    const guards = super.parameterGuard(param);
    const validate = (type, value, depth = 0) => {
      if (depth > 32) throw unsupported('nested value type', 'validation depth is bounded at 32', param.span);
      if (type.kind === 'string') return `(typeof ${value} === 'string' && !/[\\ud800-\\udbff](?![\\udc00-\\udfff])|(?<![\\ud800-\\udbff])[\\udc00-\\udfff]/u.test(${value}))`;
      if (type.kind === 'bool') return `(typeof ${value} === 'boolean')`;
      if (type.kind === 'fixed') {
        const { min, max } = fixedBounds(type);
        return `(typeof ${value} === 'bigint' && ${value} >= ${min}n && ${value} <= ${max}n)`;
      }
      if (type.kind === 'array') return `(Array.isArray(${value}) && ${value}.every((element${depth}) => ${validate(type.element, `element${depth}`, depth + 1)}))`;
      if (type.kind === 'unit') return `(${value} === null)`;
      if (type.kind === 'data') {
        const data = this.program.declarations.get(type.name);
        const choices = data.ctors.map(ctor => `(${value}.$ === ${JSON.stringify(ctor.name)}${ctor.fields.map(field => ` && ${validate(field.type, `${value}.${field.name}`, depth + 1)}`).join('')})`).join(' || ');
        return `(${value} !== null && typeof ${value} === 'object' && (${choices}))`;
      }
      throw unsupported(`argument ${type.kind}`, 'the Router extension validates only supported Rust value types', param.span);
    };
    this.state.encode('rust-value-domain', 'Rust primitive, array and algebraic arguments are validated recursively; strings contain Unicode scalars, fixed integers are BigInt and in range');
    return [...guards, `if (!${validate(param.type, param.name)}) throw new TypeError('argument outside supported Rust value domain');`];
  }

  expr(node) {
    if (node.k === 'routerArrayMeasure') return node.op === 'is_empty' ? `(${this.expr(node.array)}.length === 0)` : `BigInt(${this.expr(node.array)}.length)`;
    if (node.k === 'array') return `Object.freeze([${node.items.map(item => this.expr(item)).join(', ')}])`;
    if (node.k === 'routerStrip') {
      this.routerHelpers.add('strip');
      this.state.encode('router-option-result', 'monomorphic immutable tagged objects encode Option/Result; strip_prefix/strip_suffix borrow a scalar string represented by its immutable value');
      return `ml_router_strip(${this.expr(node.string)}, ${this.expr(node.search)}, ${node.op === 'strip_suffix'})`;
    }
    if (node.k === 'routerAlgebraicOperation') {
      const value = this.expr(node.value);
      if (node.op === 'unwrap_or') {
        this.routerHelpers.add('unwrap');
        return `ml_router_unwrap(${value}, ${this.expr(node.args[0])}, ${node.option})`;
      }
      const tag = ({ is_some: 'Some', is_none: 'None', is_ok: 'Ok', is_err: 'Err' })[node.op];
      return `(${value}.$ === '${tag}')`;
    }
    if (node.k !== 'routerStringOperation') return super.expr(node);
    const string = this.expr(node.string);
    const argument = node.args[0] && this.expr(node.args[0]);
    this.state.encode('router-rust-string-operations', 'trim uses Unicode White_Space; ASCII folds preserve non-ASCII scalars; len uses UTF-8 bytes and chars().count uses Unicode scalars');
    const asciiLower = value => `(${value}).replace(/[A-Z]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 32))`;
    switch (node.op) {
      case 'trim': return `(${string}).replace(/^[${WHITE_SPACE}]+|[${WHITE_SPACE}]+$/gu, '')`;
      case 'trim_start': return `(${string}).replace(/^[${WHITE_SPACE}]+/gu, '')`;
      case 'trim_end': return `(${string}).replace(/[${WHITE_SPACE}]+$/gu, '')`;
      case 'to_ascii_lowercase': return asciiLower(string);
      case 'to_ascii_uppercase': return `(${string}).replace(/[a-z]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 32))`;
      case 'eq_ignore_ascii_case': return `(${asciiLower(string)} === ${asciiLower(argument)})`;
      case 'is_empty': return `(${string}.length === 0)`;
      case 'is_ascii': return `(!/[^\\x00-\\x7f]/u.test(${string}))`;
      case 'byte_length': return `BigInt(new TextEncoder().encode(${string}).length)`;
      case 'scalar_length': return `BigInt(Array.from(${string}).length)`;
      default: throw new Error(`unhandled checked string operation: ${node.op}`);
    }
  }
}

export function parseRust(source) {
  return new StringRustParser(tokenizeRust(source)).file();
}
export function checkProgram(surface) {
  return new StringChecker(surface.language, surface.externals ?? []).program(surface);
}
export const emitJavaScript = program => emitWith(program, StringEmitter);
