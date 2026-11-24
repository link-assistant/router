// JavaScript frontend for the portable core. It reads the subset of modern
// JavaScript the core can represent faithfully: Number and BigInt arithmetic,
// strings and booleans; top-level functions and object-literal namespaces of methods
// whose types come from JSDoc (`@param`, `@returns`, and `@typedef` unions of
// `{ $: 'tag', … }` object types for data types) or, where JSDoc is silent,
// are inferred from how the program uses them; bodies made of `const`,
// `if`, `return`, `throw` and `switch` statements; and a top level of
// `console.log`, `const` and `node:assert` statements, which are the
// program's effects. A function whose leading statements throw on a negative
// argument takes a natural number. Everything else is rejected with a precise
// obligation.

import { TranslationError, typeError, unsupported } from './diagnostics.js';
import { findDocumentationParameterRange, findDefaultParameterReference, readArrayMethodForm, acceptArrayMethodArguments, readStringTestOperation, readStringMapOperation } from './frontend-rules.js';
import { inferJavaScriptTypes } from './javascript-infer.js';
import { imperative, lowerImperative, lowerTopLevel, statementUses } from './javascript-lower.js';
import { TokenCursor, describe, tokenize } from './lexer.js';
import { BOOL, FLOAT, INT, NAT, STRING, array } from './types.js';

// The string predicates of the portable core: each reads the whole string,
// so it means the same over UTF-16, UTF-8 and code points.
// String-to-string maps: the Unicode case mappings, which Rust's
// to_lowercase/to_uppercase also follow, and trimming of the JavaScript
// whitespace set.
const ROOT = 'crate';
const EQUALITY = { '===': 'eq', '!==': 'ne' };
const RELATIONAL = { '<': 'lt', '<=': 'le', '>': 'gt', '>=': 'ge' };
const MULTIPLICATIVE = { '*': 'mul', '/': 'div', '%': 'rem' };
const ASSIGNMENTS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);
// `x op= e` is `x = x op e`; `+=` adds numbers or concatenates strings like `+`.
const COMPOUND = { '+=': 'plus', '-=': 'sub', '*=': 'mul', '/=': 'div', '%=': 'rem', '&&=': 'and', '||=': 'or' };
const ERRORS = new Set(['Error', 'RangeError', 'TypeError']);
const GLOBALS = new Set([
  'Math', 'Number', 'BigInt', 'parseInt', 'parseFloat', 'JSON', 'Array', 'Object', 'Symbol', 'Date', 'Promise', 'Reflect',
  'Proxy', 'Map', 'Set', 'WeakMap', 'WeakSet', 'globalThis', 'process', 'require', 'console', 'setTimeout', 'isNaN', 'isFinite',
]);
// The exactly specified part of Math and Number: each is exact or correctly
// rounded, so every target computes the same binary64 value.
const MATH = {
  'Math.abs': 'abs', 'Math.floor': 'floor', 'Math.ceil': 'ceil', 'Math.trunc': 'trunc', 'Math.round': 'round',
  'Math.sign': 'sign', 'Math.sqrt': 'sqrt', 'Math.max': 'max', 'Math.min': 'min',
  'Number.isInteger': 'isInteger', 'Number.isSafeInteger': 'isSafeInteger', 'Number.isFinite': 'isFinite', 'Number.isNaN': 'isNaN',
  isFinite: 'isFinite', isNaN: 'isNaN',
};
// Their constants, as the source text of the Number each one is.
const CONSTANTS = {
  'Math.PI': '3.141592653589793', 'Math.E': '2.718281828459045', 'Math.LN2': '0.6931471805599453', 'Math.LN10': '2.302585092994046',
  'Math.LOG2E': '1.4426950408889634', 'Math.LOG10E': '0.4342944819032518', 'Math.SQRT2': '1.4142135623730951', 'Math.SQRT1_2': '0.7071067811865476',
  'Number.MAX_SAFE_INTEGER': '9007199254740991', 'Number.MIN_SAFE_INTEGER': '-9007199254740991', 'Number.EPSILON': '2.220446049250313e-16',
  'Number.MAX_VALUE': '1.7976931348623157e+308', 'Number.MIN_VALUE': '5e-324', 'Number.POSITIVE_INFINITY': 'Infinity',
  'Number.NEGATIVE_INFINITY': '-Infinity', 'Number.NaN': 'NaN',
};
const ASSERTION_MODULES = new Set(['node:assert', 'node:assert/strict', 'assert', 'assert/strict']);
const NAMESPACE_IMPORT = 'import the items of a module by name, as in import { f } from \'./m.mjs\', or the assertion module as a whole, as in import assert from \'node:assert/strict\'';
const STRICT_ASSERTIONS = { equal: 'eq', notEqual: 'ne', deepEqual: 'deep', notDeepEqual: 'notDeep' };
const ASSERTIONS = { strictEqual: 'eq', notStrictEqual: 'ne', deepStrictEqual: 'deep', notDeepStrictEqual: 'notDeep' };

/**
 * Reads `source` as a portable-core program. Self-translation reads one
 * top-level item of a module at a time and passes its `context`:
 * `externals`, the signatures of the module's other items and of the items
 * it imports, which the item may call and read, and `moduleDirectory`, the
 * module's directory inside its crate as path segments, which makes relative
 * imports items of the crate.
 */
export function parseJavaScript(source, context = {}) {
  const { tokens, comments } = tokenize(source, 'JavaScript');
  return new JavaScriptParser(source, tokens, comments, context).file();
}

class JavaScriptParser {
  constructor(source, tokens, comments, { externals = [], moduleDirectory = null, literalBindings = new Map() } = {}) {
    this.source = source;
    // The other items of the module an item may call and read, by name.
    this.externals = new Map(externals.map((external) => [external.name, external]));
    this.moduleDirectory = moduleDirectory;
    this.imports = [];
    this.cursor = new TokenCursor(tokens, 'JavaScript');
    this.literalBindings = literalBindings;
    this.docs = comments.filter((comment) => comment.text.startsWith('/**') && comment.text !== '/**/');
    // Tags of every @typedef data type, for `switch (x.$)`.
    this.dataTypes = new Map();
    // Locals in scope, the ones `let` or a parameter makes assignable, and
    // names of the current block still in their temporal dead zone.
    this.scope = { locals: new Set(), tdz: new Set(), mutable: new Set() };
    // Enclosing loops and switches, for `break` and `continue`.
    this.jumps = { loops: 0, switches: 0 };
    // Whether a top-level statement is being read, where `return` is a syntax error.
    this.topLevel = false;
    // Functions and data types that loops and joins of statements lower to, and their count.
    this.generated = [];
    this.generatedCount = 0;
    this.assertion = null;
    // Async functions run sequentially: each call of one is awaited where it is
    // made, so nothing else runs until its result is back. `await` is allowed at
    // the top level of the module and in async functions.
    this.asyncNames = new Set();
    this.inAsync = true;
    this.unawaited = [];
    this.sequentialAsync = false;
  }

  fail(message, token = this.cursor.peek()) {
    return new TranslationError('syntax', `${message} but found ${describe(token)}`, token);
  }

  file() {
    const c = this.cursor;
    const items = this.typedefs();
    const effects = [];
    if (c.isKind('string') && c.peek().value === 'use strict') {
      c.next();
      c.eat(';');
    }
    this.scope = { locals: new Set(), tdz: this.blockDeclarations(c.index, () => c.atEnd()), mutable: new Set() };
    this.asyncNames = this.asyncDeclarations(c.index);
    // Top-level statements that declare or assign variables, lowered together
    // before the next statement that prints, binds a constant or asserts.
    let pending = [];
    const flush = () => {
      if (pending.length) effects.push(...this.lowerTopLevel(pending, effects));
      pending = [];
    };
    while (!c.atEnd()) {
      const start = c.peek();
      if (c.is('import')) {
        this.importDeclaration();
        continue;
      }
      if (c.eat('export')) {
        if (!c.is('function') && !c.is('const') && !(c.is('async') && c.is('function', 1))) {
          throw unsupported(`export ${describe(c.peek())}`, 'only function and const declarations are exported', span(start, c.peek()));
        }
      }
      if (c.is('async') && c.is('function', 1)) {
        c.next();
        items.push(this.functionDeclaration(start, true));
        continue;
      }
      if (c.is('async')) throw unsupported('async function', 'only async functions declared by name or bound to a top-level constant are portable', span(start, c.peek()));
      if (c.is('function')) {
        items.push(this.functionDeclaration(start));
        continue;
      }
      if (c.is('const') && c.peek(1).kind === 'identifier' && c.is('=', 2) && this.startsFunction(c.index + 3)) {
        if (effects.length || pending.length) {
          throw unsupported(
            'function after a top-level statement',
            `the statements before const ${c.peek(1).value} could call it before it is initialised; declare every function first`,
            span(start, c.peek(1)),
          );
        }
        items.push(this.constFunction(start));
        continue;
      }
      if (c.is('const') && c.peek(1).kind === 'identifier' && c.is('=', 2) && c.is('{', 3) && !(c.is('$', 4) && c.is(':', 5))) {
        if (effects.length || pending.length) {
          throw unsupported(
            'namespace after a top-level statement',
            `the statements before const ${c.peek(1).value} would run before it is initialised; declare every namespace first`,
            span(start, c.peek(1)),
          );
        }
        items.push(this.namespace(start));
        continue;
      }
      if (this.startsTopLevelImperative()) {
        pending.push(this.topLevelStatement());
        continue;
      }
      flush();
      effects.push(this.mainStatement());
    }
    flush();
    if (this.unawaited.length) {
      const [call] = this.unawaited;
      throw unsupported(`call of async function ${call.name} without await`, 'the Promise it returns is outside the portable core; await it where it is called', call.span);
    }
    items.push(...this.generated);
    const main = { effects, span: { start: 0, end: this.source.length } };
    if (this.sequentialAsync) main.sequentialAsync = true;
    const program = { language: 'JavaScript', items, main };
    if (this.imports.length) program.imports = this.imports;
    if (this.externals.size) program.externals = [...this.externals.values()];
    return inferJavaScriptTypes(program);
  }

  /** Names of the top-level async functions, which every call must await. */
  asyncDeclarations(index) {
    const tokens = this.cursor.tokens;
    const names = new Set();
    let depth = 0;
    for (let at = index; at < tokens.length; at += 1) {
      const token = tokens[at];
      if (token.kind === 'punct' && ['(', '[', '{'].includes(token.value)) depth += 1;
      if (token.kind === 'punct' && [')', ']', '}'].includes(token.value)) depth -= 1;
      if (depth !== 0 || token.kind !== 'identifier') continue;
      const next = tokens[at + 1];
      if (token.value === 'async' && next?.value === 'function' && tokens[at + 2]?.kind === 'identifier') names.add(tokens[at + 2].value);
      if (token.value === 'const' && next?.kind === 'identifier' && tokens[at + 2]?.value === '=' && tokens[at + 3]?.value === 'async' &&
        tokens[at + 4]?.value !== '=>' && this.startsFunction(at + 3)) {
        names.add(next.value);
      }
    }
    return names;
  }

  /** Whether the tokens from `index` are a function expression or an arrow function, either maybe async. */
  startsFunction(index) {
    const tokens = this.cursor.tokens;
    let token = tokens[index];
    if (!token) return false;
    if (token.kind === 'identifier' && token.value === 'async' && tokens[index + 1]?.value !== '=>') {
      index += 1;
      token = tokens[index];
      if (!token) return false;
    }
    if (token.kind === 'identifier' && token.value === 'function') return true;
    if (token.kind === 'identifier' && tokens[index + 1]?.value === '=>') return true;
    return token.kind === 'punct' && token.value === '(' && tokens[this.matching(index) + 1]?.value === '=>';
  }

  /**
   * `import assert from 'node:assert/strict'` binds the assertion module. In a
   * module of a crate, which self-translation reads, `import { a, b as c } from
   * './m.mjs'` imports items of another module of the crate. Every other import
   * is outside the portable core.
   */
  importDeclaration() {
    const c = this.cursor;
    const start = c.next();
    if (c.is('*')) throw unsupported('namespace import', NAMESPACE_IMPORT, span(start, c.peek()));
    let local = null;
    let braced = false;
    const names = [];
    if (c.eat('{')) {
      braced = true;
      while (!c.is('}')) {
        const imported = c.identifier('import');
        // A refused named import of node:assert ends at the token after its name.
        const after = c.peek();
        const alias = c.eat('as') ? c.identifier('import') : null;
        names.push({ imported: imported.value, local: (alias ?? imported).value, aliased: alias !== null, after });
        if (!c.eat(',')) break;
      }
      c.expect('}', 'import');
    } else {
      local = c.identifier('import');
    }
    c.expect('from', 'import');
    const module = c.next();
    if (module.kind !== 'string') throw this.fail('expected a module name', module);
    c.eat(';');
    const specifier = module.value;
    if (braced && !names.length) throw unsupported(`import {} from '${specifier}'`, 'an import names the items it imports', span(start, module));
    if (ASSERTION_MODULES.has(specifier)) {
      const refused = names.find((name, index) => index > 0 || name.imported !== 'strict' || !name.aliased);
      if (refused) {
        throw unsupported(`import { ${refused.imported} }`, 'import the assertion module as a whole, e.g. import assert from \'node:assert/strict\'', span(start, refused.after));
      }
      if (this.assertion) throw unsupported('second assertion import', 'import node:assert once', span(start, module));
      const name = names.length ? names[0].local : local.value;
      this.assertion = { name, strict: names.length > 0 || specifier.endsWith('/strict') };
      this.scope.tdz.delete(name);
      return;
    }
    if (!/^\.\.?\//u.test(specifier)) {
      const reason = specifier.startsWith('node:')
        ? 'Node.js built-in modules are outside the portable core'
        : 'packages are outside the portable core; a module imports the items of the other modules of its crate by relative path, as in import { f } from \'./m.mjs\'';
      throw unsupported(`import from '${specifier}'`, reason, span(start, module));
    }
    if (!names.length) throw unsupported(`default import from '${specifier}'`, 'a translated module has no default export; import its items by name, as in import { f } from \'./m.mjs\'', span(start, module));
    if (!this.moduleDirectory) {
      throw unsupported(`import from '${specifier}'`, 'a relative import names another module of a crate, and self-translation translates a crate module by module', span(start, module));
    }
    const path = cratePath(specifier, this.moduleDirectory);
    if (!path) throw unsupported(`import from '${specifier}'`, 'the specifier names no module file inside the crate', span(start, module));
    this.imports.push({ module: path, names: names.map(({ imported, local: name }) => ({ imported, local: name })), span: span(start, module) });
  }

  /**
   * `@typedef {{ $: 'leaf' } | { $: 'node', left: Tree, value: bigint }} Tree`
   * declares a data type: each alternative is a constructor named by its
   * `$` tag, and its other properties are the constructor's fields.
   */
  typedefs() {
    const items = [];
    for (const comment of this.docs) {
      for (const tag of jsdocTags(comment)) {
        if (tag.tag !== 'typedef') continue;
        const range = { start: comment.start, end: comment.end };
        if (!tag.type || !tag.name) throw new TranslationError('syntax', '@typedef needs a type and a name', range);
        const { tokens } = tokenize(tag.type, 'JavaScript');
        const c = new TokenCursor(tokens, 'JavaScript');
        const ctors = [];
        do {
          if (!c.is('{')) {
            throw unsupported(`@typedef ${tag.name}`, 'a portable data type is a union of { $: \'tag\', … } object types', range);
          }
          c.next();
          let name = null;
          const fields = [];
          while (!c.is('}')) {
            const key = c.identifier('object type');
            c.expect(':', 'object type');
            if (key.value === '$') {
              const value = c.next();
              if (value.kind !== 'string') throw unsupported(`@typedef ${tag.name}`, 'the $ tag must be a string literal type', range);
              name = value.value;
            } else {
              let type = c.identifier('field type').value;
              if (c.is('<')) {
                // Array<T>, whose closing brackets may be read as one >> token.
                let depth = 0;
                do {
                  const token = c.next();
                  type += token.value;
                  for (const char of token.value) depth += char === '<' ? 1 : char === '>' ? -1 : 0;
                } while (depth > 0 && !c.atEnd());
              }
              while (c.is('[')) {
                c.next();
                c.expect(']', 'field type');
                type += '[]';
              }
              if (!c.is(',') && !c.is(';') && !c.is('}')) {
                throw unsupported(`field type of ${key.value}`, 'field types are number, bigint, boolean, string, a @typedef name or an array T[] of one', range);
              }
              fields.push({ name: key.value, type: this.type(type, range) });
            }
            if (!c.eat(',') && !c.eat(';')) break;
          }
          c.expect('}', 'object type');
          if (name === null) throw unsupported(`@typedef ${tag.name}`, 'every alternative needs a $ tag', range);
          if (ctors.some((ctor) => ctor.name === name)) throw typeError(`duplicate tag ${name} in ${tag.name}`, range);
          ctors.push({ name, fields });
        } while (c.eat('|'));
        if (!c.atEnd()) throw unsupported(`@typedef ${tag.name}`, 'a portable data type is a union of object types', range);
        if (this.dataTypes.has(tag.name)) throw typeError(`duplicate @typedef ${tag.name}`, range);
        this.dataTypes.set(tag.name, ctors);
        items.push({ k: 'data', name: tag.name, ctors, span: range });
      }
    }
    return items;
  }

  type(text, range) {
    const name = text.trim();
    if (name === 'bigint') return INT;
    if (name === 'boolean') return BOOL;
    if (name === 'string') return STRING;
    if (name === 'number') return FLOAT;
    if (name.endsWith('[]')) return array(this.type(name.slice(0, -2), range));
    const generic = /^(?:Array|ReadonlyArray)<(.+)>$/u.exec(name);
    if (generic) return array(this.type(generic[1], range));
    if (!/^[A-Za-z_$][\w$]*$/u.test(name) || ['object', 'any', 'unknown', 'void', 'undefined', 'null', 'Object', 'Function', 'Array', 'symbol'].includes(name)) {
      throw unsupported(`JSDoc type {${name}}`, 'portable types are number, bigint, boolean, string, arrays T[] of them and @typedef data types', range);
    }
    return { kind: 'named', path: [ROOT, name], span: range };
  }

  /** The JSDoc block directly before a declaration. */
  jsdocFor(token) {
    const doc = this.docs.findLast((comment) => comment.end <= token.start && this.source.slice(comment.end, token.start).trim() === '');
    if (!doc) return null;
    const params = new Map();
    let returns = null;
    for (const tag of jsdocTags(doc)) {
      if (tag.tag === 'param') {
        if (!tag.type || !tag.name) throw new TranslationError('syntax', '@param needs a type and a name', doc);
        if (params.has(tag.name)) throw typeError(`duplicate @param ${tag.name}`, doc);
        params.set(tag.name, tag.type);
      } else if (tag.tag === 'returns' || tag.tag === 'return') {
        returns = tag.type;
      }
    }
    return { params, returns, range: { start: doc.start, end: doc.end } };
  }

  functionDeclaration(start, isAsync = false) {
    const c = this.cursor;
    c.expect('function', 'function declaration');
    if (c.is('*')) throw unsupported('generator function', 'generators are outside the portable core', span(start, c.peek()));
    const name = c.identifier('function');
    global(name);
    return this.functionRest(start, name, isAsync);
  }

  /** Parameters and body of a function or method; `docToken` is where its JSDoc ends. */
  functionRest(docToken, nameToken, isAsync = false) {
    const c = this.cursor;
    const doc = this.jsdocFor(docToken);
    c.expect('(', nameToken.value);
    const tokens = this.parameters(nameToken.value);
    return this.functionBody(docToken, nameToken, doc, tokens, () => this.blockStatements(), isAsync);
  }

  /**
   * `const name = (…) => …` or `const name = function (…) { … }` before any
   * top-level statement: a function, as nothing can call it before it is
   * initialised. An arrow's expression body is the value it returns.
   */
  constFunction(start) {
    const c = this.cursor;
    const doc = this.jsdocFor(start);
    c.expect('const', 'function');
    const nameToken = c.identifier('function');
    global(nameToken);
    c.expect('=', 'function');
    this.scope.tdz.delete(nameToken.value);
    const isAsync = c.is('async') && !c.is('=>', 1);
    if (isAsync) c.next();
    let fn;
    if (c.eat('function')) {
      if (c.is('*')) throw unsupported('generator function', 'generators are outside the portable core', span(start, c.peek()));
      if (c.isKind('identifier') && c.peek().value !== nameToken.value) {
        const inner = c.peek();
        throw unsupported(`function expression ${inner.value}`, `its own name is visible only inside it; call it ${nameToken.value}`, span(inner, inner));
      }
      if (c.isKind('identifier')) c.next();
      c.expect('(', nameToken.value);
      const tokens = this.parameters(nameToken.value);
      fn = this.functionBody(start, nameToken, doc, tokens, () => this.blockStatements(), isAsync);
    } else {
      let tokens;
      if (c.eat('(')) tokens = this.parameters(nameToken.value);
      else tokens = [c.identifier('parameter')];
      c.expect('=>', nameToken.value);
      fn = this.functionBody(start, nameToken, doc, tokens, () => {
        if (c.is('{')) return this.blockStatements();
        const token = c.peek();
        const expr = isAsync ? this.awaited(() => this.expr()) : this.expr();
        return [{ s: 'return', expr, span: span(token, c.peek()) }];
      }, isAsync);
    }
    c.eat(';');
    return fn;
  }

  /** A parameter list after its `(`, through its `)`. */
  parameters(name) {
    const c = this.cursor;
    const tokens = [];
    while (!c.is(')')) {
      const token = c.peek();
      if (c.is('...')) throw unsupported('rest parameter', 'functions take a fixed number of arguments', span(token, token));
      if (c.is('{') || c.is('[')) throw unsupported('destructured parameter', 'name each parameter', span(token, token));
      const param = c.identifier('parameter');
      // A default is filled in where a call leaves the argument out; it reads no parameter.
      if (c.eat('=')) {
        const remaining = c.tokens.slice(c.index);
        const reference = findDefaultParameterReference(remaining.map((token) => token.kind), remaining.map((token) => token.value), tokens.map((token) => token.value));
        if (reference >= 0) {
          const token = c.peek(reference);
          throw unsupported(`default reading parameter ${token.value}`, 'a call fills in a default where it leaves the argument out, so a default reads no parameter', span(token, token));
        }
        tokens.push({ ...param, defaultValue: this.expr() });
      }
      else if (tokens.at(-1)?.defaultValue) throw unsupported(`parameter ${param.value} after a default`, 'a call fills in trailing defaults only; give it a default too', span(param, param));
      else tokens.push(param);
      if (!c.eat(',')) break;
    }
    c.expect(')', name);
    return tokens;
  }

  /**
   * A function from its parameters; `statementsOf` reads its body in the
   * parameters' scope. An async function is the function its body computes,
   * and its JSDoc may declare the result as `Promise<T>`.
   */
  functionBody(docToken, nameToken, doc, tokens, statementsOf, isAsync = false) {
    const c = this.cursor;
    const name = nameToken.value;
    if (isAsync) this.sequentialAsync = true;
    // A type JSDoc does not declare is inferred once the whole program is read.
    const params = tokens.map((token) => {
      reserved(token);
      const text = doc?.params.get(token.value);
      return {
        name: token.value,
        type: text ? this.type(text, doc.range) : null,
        ...(token.defaultValue ? { default: token.defaultValue } : {}),
        span: span(token, token),
      };
    });
    for (const documented of doc?.params.keys() ?? []) {
      if (!params.some((param) => param.name === documented)) throw typeError(`@param ${documented} is not a parameter of ${name}`, doc.range);
    }
    const promised = isAsync ? /^\s*Promise\s*<([\s\S]*)>\s*$/u.exec(doc?.returns ?? '') : null;
    const returns = promised ? promised[1] : doc?.returns;
    const ret = returns ? this.type(returns, doc.range) : null;
    const outer = this.scope;
    const outerAsync = this.inAsync;
    const outerJumps = this.jumps;
    const outerTopLevel = this.topLevel;
    this.inAsync = isAsync;
    this.jumps = { loops: 0, switches: 0 };
    this.topLevel = false;
    const names = params.map((param) => param.name);
    this.scope = { locals: new Set(names), tdz: new Set(), mutable: new Set(names) };
    const statements = statementsOf();
    this.scope = outer;
    this.inAsync = outerAsync;
    this.jumps = outerJumps;
    this.topLevel = outerTopLevel;
    // `if (n < 0n) throw …` as a leading statement makes `n` a natural number,
    // unless the body assigns it another value.
    const { assigned } = statementUses(statements);
    let index = 0;
    for (; index < statements.length; index += 1) {
      const param = guardedParameter(statements[index], params);
      if (!param || assigned.has(param.name)) break;
      param.type = NAT;
      // A negative argument aborts with the guard's message, the guards in their order.
      const [thrown] = statements[index].then.filter((inner) => inner.s !== 'empty');
      param.guard = { message: thrown.message, order: index };
    }
    const where = span(nameToken, c.peek());
    const rest = statements.slice(index);
    const body = imperative(rest) ? lowerImperative(this, name, params, rest, where) : this.lower(rest, where);
    return { k: 'fn', name, params, ret, body, span: span(docToken, c.peek()) };
  }

  /** `const Name = { method(…) { … }, Nested: { … } };` is a module. */
  namespace(start) {
    const c = this.cursor;
    c.expect('const', 'namespace');
    const name = c.identifier('namespace');
    global(name);
    c.expect('=', 'namespace');
    this.scope.tdz.delete(name.value);
    const module = this.namespaceBody(name.value, start);
    c.eat(';');
    return module;
  }

  namespaceBody(name, start) {
    const c = this.cursor;
    c.expect('{', 'namespace');
    const items = [];
    while (!c.is('}')) {
      const member = c.peek();
      if (member.kind !== 'identifier') {
        throw unsupported(`namespace member ${describe(member)}`, 'members are methods or nested namespaces with identifier names', span(member, member));
      }
      if (['get', 'set', 'async', 'static'].includes(member.value) && c.peek(1).kind === 'identifier') {
        throw unsupported(`${member.value} member`, 'accessors and asynchronous methods are outside the portable core', span(member, c.peek(1)));
      }
      c.next();
      if (c.is('(')) {
        items.push(this.functionRest(member, member));
      } else if (c.eat(':')) {
        if (c.is('{')) {
          items.push(this.namespaceBody(member.value, member));
        } else {
          throw unsupported(`namespace property ${member.value}`, 'namespaces hold methods, name(…) { … }, and nested namespaces only', span(member, c.peek()));
        }
      } else {
        throw this.fail(`expected ( or : after ${member.value}`);
      }
      if (!c.eat(',')) break;
    }
    c.expect('}', 'namespace');
    return { k: 'module', name, items, span: span(start, c.peek()) };
  }

  /** Names a block declares with `const`, which are in their temporal dead zone until declared. */
  blockDeclarations(from, done) {
    const c = this.cursor;
    const names = new Set();
    const saved = c.index;
    c.index = from;
    let depth = 0;
    while (!c.atEnd() && !(depth === 0 && done())) {
      const token = c.next();
      if (['{', '(', '['].includes(token.value) && token.kind === 'punct') depth += 1;
      else if (['}', ')', ']'].includes(token.value) && token.kind === 'punct') depth -= 1;
      else if (depth === 0 && token.kind === 'identifier' && (token.value === 'const' || token.value === 'let')) {
        if (c.peek().kind === 'identifier') names.add(c.peek().value);
        else if (c.is('{')) {
          for (let offset = 1; !c.is('}', offset) && !c.isKind('eof', offset); offset += 1) {
            if (c.peek(offset).kind === 'identifier' && (c.is(',', offset + 1) || c.is('}', offset + 1))) names.add(c.peek(offset).value);
          }
        }
      }
    }
    c.index = saved;
    return names;
  }

  withBlockScope(parse) {
    const c = this.cursor;
    const outer = this.scope;
    const tdz = new Set(outer.tdz);
    for (const name of this.blockDeclarations(c.index, () => c.is('}'))) tdz.add(name);
    this.scope = { locals: new Set(outer.locals), tdz, mutable: new Set(outer.mutable) };
    try {
      return parse();
    } finally {
      this.scope = outer;
    }
  }

  declareLocal(name, mutable = false) {
    this.scope.locals.add(name);
    this.scope.tdz.delete(name);
    if (mutable) this.scope.mutable.add(name);
    else this.scope.mutable.delete(name);
  }

  blockStatements() {
    const c = this.cursor;
    c.expect('{', 'block');
    return this.withBlockScope(() => {
      const statements = [];
      while (!c.is('}')) {
        if (c.atEnd()) throw this.fail('expected }');
        statements.push(this.statement());
      }
      c.expect('}', 'block');
      return statements;
    });
  }

  statement() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('const')) return this.constStatement();
    if (c.is('let')) {
      const statements = this.letDeclarations();
      c.eat(';');
      return statements.length === 1 ? statements[0] : { s: 'block', body: statements, inline: true, span: span(token, c.peek()) };
    }
    if (c.is('var')) {
      throw unsupported('var declaration', 'var bindings are hoisted to the function and shared by its blocks; use let or const', span(token, token));
    }
    if (c.is('return')) {
      if (this.topLevel) throw unsupported('top-level return statement', 'return leaves a function, and a module has none to leave', span(token, token));
      c.next();
      // `return;` returns undefined, the unit value.
      if (c.is(';') || c.is('}') || this.source.slice(token.end, c.peek().start).includes('\n')) {
        c.eat(';');
        return { s: 'return', expr: { k: 'unit', span: span(token, token) }, span: span(token, c.peek()) };
      }
      // An async function returning a call of another adopts the Promise it
      // returns, which awaits it.
      const expr = this.inAsync ? this.awaited(() => this.expr()) : this.expr();
      c.eat(';');
      return { s: 'return', expr, span: span(token, c.peek()) };
    }
    if (c.is('throw')) return this.throwStatement();
    if (c.is('if')) return this.ifStatement();
    if (c.is('switch')) return this.switchStatement();
    if (c.is('{')) return { s: 'block', body: this.blockStatements(), span: span(token, c.peek()) };
    if (c.eat(';')) return { s: 'empty', span: span(token, token) };
    if (c.is('while')) return this.whileStatement();
    if (c.is('do')) return this.doStatement();
    if (c.is('for')) return this.forStatement();
    if (c.is('break') || c.is('continue')) return this.jumpStatement();
    if (c.is('console') && c.is('.', 1)) {
      const { expr, style, span: where } = this.consoleStatement();
      return { s: 'print', expr, style, span: where };
    }
    if (['try', 'function', 'class', 'with', 'debugger'].includes(token.value) && token.kind === 'identifier') {
      throw unsupported(`${token.value} statement`, 'outside the portable core', span(token, token));
    }
    if (token.kind === 'identifier' && c.peek(1).kind === 'punct' && c.peek(1).value === ':') {
      throw unsupported(`label ${token.value}`, 'labels are outside the portable core; a break or continue applies to the innermost loop', span(token, c.peek(1)));
    }
    if (this.startsAssignment()) {
      const statement = this.assignment();
      c.eat(';');
      return statement;
    }
    const expr = this.expr();
    c.eat(';');
    return { s: 'expr', expr, span: span(token, c.peek()) };
  }

  constStatement() {
    const c = this.cursor;
    const start = c.next();
    if (c.is('{')) return this.destructuring(start);
    if (c.is('[')) throw unsupported('array destructuring', 'bind each element by its index, const a = xs[0]', span(start, c.peek()));
    const name = c.identifier('const');
    reserved(name);
    if (!c.eat('=')) throw this.fail('expected = in const');
    const value = this.expr();
    if (c.is(',')) throw unsupported('several declarators', 'declare one binding per const', span(start, c.peek()));
    c.eat(';');
    this.declareLocal(name.value);
    return { s: 'const', name: name.value, value, span: span(start, c.peek()) };
  }

  /** `const { left, value: v } = t;` binds fields of a switch subject. */
  destructuring(start) {
    const c = this.cursor;
    c.expect('{', 'destructuring');
    const pairs = [];
    while (!c.is('}')) {
      if (c.is('...')) throw unsupported('rest property', 'name every field', span(c.peek(), c.peek()));
      const key = c.identifier('destructuring');
      const local = c.eat(':') ? c.identifier('destructuring') : key;
      reserved(local);
      if (c.is('=')) throw unsupported('default value', 'every field has a value', span(key, c.peek()));
      pairs.push({ field: key.value, name: local.value, span: span(key, local) });
      if (!c.eat(',')) break;
    }
    c.expect('}', 'destructuring');
    c.expect('=', 'destructuring');
    const object = this.expr();
    c.eat(';');
    const statements = pairs.map((pair) => ({
      s: 'const',
      name: pair.name,
      value: { k: 'field', object, field: pair.field, span: pair.span },
      span: span(start, c.peek()),
    }));
    for (const pair of pairs) this.declareLocal(pair.name);
    return { s: 'block', body: statements, inline: true, span: span(start, c.peek()) };
  }

  /** `let a = 1n, b = a;` declares assignable locals; each needs a value, since undefined is not portable. */
  letDeclarations() {
    const c = this.cursor;
    const start = c.next();
    if (c.is('{') || c.is('[')) throw unsupported('let destructuring', 'declare each binding with its own let', span(start, c.peek()));
    const statements = [];
    do {
      const name = c.identifier('let');
      reserved(name);
      // The binding is in its temporal dead zone in its own initialiser.
      this.scope.tdz.add(name.value);
      if (!c.eat('=')) {
        throw unsupported(`let ${name.value} without a value`, 'an uninitialised let holds undefined, which is not a portable value; give it an initial value', span(start, name));
      }
      const value = this.expr();
      this.declareLocal(name.value, true);
      statements.push({ s: 'let', name: name.value, value, span: span(start, c.peek()) });
    } while (c.eat(','));
    return statements;
  }

  /** Whether the statement is `x = e`, `x op= e`, `x++`, `x--`, `++x` or `--x`. */
  startsAssignment() {
    const c = this.cursor;
    if ((c.is('++') || c.is('--')) && c.isKind('identifier', 1)) return true;
    if (!c.isKind('identifier')) return false;
    const next = c.peek(1);
    return next.kind === 'punct' && (ASSIGNMENTS.has(next.value) || next.value === '++' || next.value === '--');
  }

  /** An assignment of a local: `x op= e` is `x = x op e`, and `x++` is `x = x + 1`. */
  assignment() {
    const c = this.cursor;
    const start = c.peek();
    const prefix = c.is('++') || c.is('--') ? c.next() : null;
    const target = c.identifier('assignment');
    const op = prefix ? prefix.value : c.next().value;
    const where = span(start, c.peek());
    if (this.scope.tdz.has(target.value)) {
      throw unsupported(`assignment of ${target.value} before its declaration`, 'the binding is in its temporal dead zone, where assigning it throws a ReferenceError', where);
    }
    if (!this.scope.locals.has(target.value)) {
      throw unsupported(`assignment of ${target.value}`, 'only local variables declared with let, and parameters, are assignable', where);
    }
    if (!this.scope.mutable.has(target.value)) {
      throw unsupported(`assignment of constant ${target.value}`, 'assigning a const binding throws a TypeError; declare it with let', where);
    }
    const read = { k: 'name', path: [target.value], span: span(target, target) };
    let value;
    if (op === '++' || op === '--') {
      // One of the variable's own type: a Number or a BigInt.
      const one = { k: 'num', value: '1', unit: true, span: where };
      value = { k: 'binary', op: op === '++' ? 'add' : 'sub', left: read, right: one, span: where };
    } else if (op === '=') {
      value = this.expr();
    } else if (COMPOUND[op]) {
      const right = this.expr();
      value = { k: 'binary', op: COMPOUND[op], left: read, right, span: joined(read, right, start) };
    } else {
      throw unsupported(`${op} assignment`, 'the portable compound assignments are +=, -=, *=, /=, %=, &&= and ||=', where);
    }
    return { s: 'assign', name: target.value, value, span: span(start, c.peek()) };
  }

  /** The body of a loop, where `break` and `continue` apply to it. */
  loopBody() {
    this.jumps.loops += 1;
    try {
      return this.branch();
    } finally {
      this.jumps.loops -= 1;
    }
  }

  whileStatement() {
    const c = this.cursor;
    const start = c.next();
    c.expect('(', 'while');
    const cond = this.expr();
    c.expect(')', 'while');
    const body = this.loopBody();
    return { s: 'while', cond, body, span: span(start, c.peek()) };
  }

  doStatement() {
    const c = this.cursor;
    const start = c.next();
    const body = this.loopBody();
    c.expect('while', 'do');
    c.expect('(', 'do');
    const cond = this.expr();
    c.expect(')', 'do');
    c.eat(';');
    return { s: 'doWhile', body, cond, span: span(start, c.peek()) };
  }

  /** `for (let i = 0n; i < n; i++) …`: the variables of its head belong to the loop. */
  forStatement() {
    const c = this.cursor;
    const start = c.next();
    if (c.is('await')) throw unsupported('for await', 'asynchronous iteration is outside the portable core', span(start, c.peek()));
    c.expect('(', 'for');
    const declared = c.is('let') || c.is('const') || c.is('var');
    if (c.isKind('identifier', declared ? 1 : 0) && (c.is('of', declared ? 2 : 1) || c.is('in', declared ? 2 : 1))) {
      const kind = c.peek(declared ? 2 : 1).value;
      if (kind === 'in') throw unsupported('for…in loop', 'iteration over the keys of objects is outside the portable core; count with for (let i = …; …; …)', span(start, c.peek()));
      if (!declared || c.is('var')) throw unsupported('for…of without const or let', 'declare the loop variable with const or let, so each iteration has its own', span(start, c.peek()));
      return this.forOf(start);
    }
    const outer = this.scope;
    this.scope = { locals: new Set(outer.locals), tdz: new Set(outer.tdz), mutable: new Set(outer.mutable) };
    try {
      const init = [];
      if (c.is('let')) {
        init.push(...this.letDeclarations());
      } else if (c.is('const') || c.is('var')) {
        throw unsupported(`for with ${c.peek().value}`, 'declare the loop variables with let', span(c.peek(), c.peek()));
      } else {
        while (!c.is(';')) {
          if (!this.startsAssignment()) throw this.fail('expected an assignment in the for initialiser');
          init.push(this.assignment());
          if (!c.eat(',')) break;
        }
      }
      c.expect(';', 'for');
      const cond = c.is(';') ? null : this.expr();
      c.expect(';', 'for');
      const update = [];
      while (!c.is(')')) {
        if (!this.startsAssignment()) throw unsupported('for update', 'the update of a for loop is a list of assignments', span(c.peek(), c.peek()));
        update.push(this.assignment());
        if (!c.eat(',')) break;
      }
      c.expect(')', 'for');
      const body = this.loopBody();
      return { s: 'for', init, cond, update, body, span: span(start, c.peek()) };
    } finally {
      this.scope = outer;
    }
  }

  /**
   * `for (const x of xs) body` reads the elements of an array in order: it
   * is a loop over the indices of the array, whose body first binds `x` to
   * the element at the index. The array is evaluated once, before the loop.
   */
  forOf(start) {
    const c = this.cursor;
    const binding = c.next().value;
    const name = c.identifier('for…of');
    reserved(name);
    c.next();
    const iterable = this.expr();
    c.expect(')', 'for');
    this.generatedCount += 1;
    const values = `ml_values${this.generatedCount}`;
    const index = `ml_index${this.generatedCount}`;
    const outer = this.scope;
    this.scope = { locals: new Set(outer.locals), tdz: new Set(outer.tdz), mutable: new Set(outer.mutable) };
    let body;
    try {
      this.declareLocal(name.value, binding === 'let');
      body = this.loopBody();
    } finally {
      this.scope = outer;
    }
    const where = span(start, c.peek());
    const read = (local) => ({ k: 'name', path: [local], span: where });
    const element = { k: 'index', object: read(values), index: read(index), span: where };
    return {
      s: 'block',
      body: [
        { s: 'const', name: values, value: iterable, span: where },
        {
          s: 'for',
          init: [{ s: 'let', name: index, value: { k: 'num', value: '0', span: where }, span: where }],
          cond: { k: 'binary', op: 'lt', left: read(index), right: { k: 'length', object: read(values), integer: true, span: where }, span: where },
          update: [{ s: 'assign', name: index, value: { k: 'binary', op: 'add', left: read(index), right: { k: 'num', value: '1', span: where }, span: where }, span: where }],
          body: [{ s: binding, name: name.value, value: element, span: where }, { s: 'block', body, span: where }],
          span: where,
        },
      ],
      span: where,
    };
  }

  jumpStatement() {
    const c = this.cursor;
    const token = c.next();
    const where = span(token, token);
    if (c.isKind('identifier') && !c.is('case') && !c.is('default') && !this.source.slice(token.end, c.peek().start).includes('\n')) {
      throw unsupported(`labelled ${token.value}`, 'labels are outside the portable core; a break or continue applies to the innermost loop', span(token, c.peek()));
    }
    if (token.value === 'continue' && !this.jumps.loops) throw new TranslationError('syntax', 'continue outside a loop', where);
    if (token.value === 'break' && !this.jumps.loops && !this.jumps.switches) throw new TranslationError('syntax', 'break outside a loop or switch', where);
    c.eat(';');
    return { s: token.value, span: where };
  }

  throwStatement() {
    const c = this.cursor;
    const start = c.next();
    if (!c.eat('new')) throw unsupported('throw of a non-error value', 'throw new Error(\'…\'), which aborts the program', span(start, c.peek()));
    const kind = c.identifier('throw');
    if (!ERRORS.has(kind.value)) throw unsupported(`throw new ${kind.value}`, 'throw an Error, RangeError or TypeError', span(kind, kind));
    c.expect('(', 'throw');
    let message = '';
    if (!c.is(')')) {
      const token = c.next();
      if (token.kind !== 'string') throw unsupported('computed error message', 'the message of an abort is a string literal', span(token, token));
      message = token.value;
    }
    c.expect(')', 'throw');
    c.eat(';');
    return { s: 'throw', message, span: span(start, c.peek()) };
  }

  ifStatement() {
    const c = this.cursor;
    const start = c.next();
    c.expect('(', 'if');
    const cond = this.expr();
    c.expect(')', 'if');
    const then = this.branch();
    const otherwise = c.eat('else') ? this.branch() : null;
    return { s: 'if', cond, then, else: otherwise, span: span(start, c.peek()) };
  }

  branch() {
    const c = this.cursor;
    if (c.is('{')) return this.blockStatements();
    if (c.is('const') || c.is('let') || c.is('function')) throw this.fail('expected a statement');
    return [this.statement()];
  }

  /**
   * `switch (x.$) { case 'tag': … }` matches the constructors of a data
   * type; `switch (n) { case 0n: … default: … }` matches literals.
   */
  switchStatement() {
    const c = this.cursor;
    const start = c.next();
    c.expect('(', 'switch');
    const discriminant = this.expr();
    c.expect(')', 'switch');
    c.expect('{', 'switch');
    const tagged = discriminant.k === 'field' && discriminant.field === '$';
    if (tagged && !(discriminant.object.k === 'name' && discriminant.object.path.length === 1)) {
      throw unsupported('switch on the tag of an expression', 'bind the value with const and switch on its tag', discriminant.span);
    }
    const clauses = [];
    let tests = [];
    while (!c.is('}')) {
      const clauseStart = c.peek();
      if (c.eat('default')) {
        tests.push({ k: 'default', span: span(clauseStart, clauseStart) });
      } else {
        c.expect('case', 'switch');
        tests.push(this.caseTest(tagged));
      }
      c.expect(':', 'case');
      if (c.is('case') || c.is('default')) continue;
      const body = [];
      this.jumps.switches += 1;
      while (!c.is('case') && !c.is('default') && !c.is('}')) {
        if (c.is('const') || c.is('let')) {
          throw unsupported('declaration in a case clause', 'case clauses share one scope; wrap the case body in braces', span(c.peek(), c.peek()));
        }
        body.push(this.statement());
      }
      this.jumps.switches -= 1;
      clauses.push({ tests, body, span: span(clauseStart, c.peek()) });
      tests = [];
    }
    if (tests.length) clauses.push({ tests, body: [], span: span(start, c.peek()) });
    c.expect('}', 'switch');
    const node = { s: 'switch', discriminant, tagged, clauses, span: span(start, c.peek()) };
    if (tagged) node.data = this.switchData(node);
    return node;
  }

  caseTest(tagged) {
    const c = this.cursor;
    const token = c.peek();
    if (tagged) {
      if (!c.isKind('string')) throw unsupported('case test', 'the cases of a tag switch are string literal tags', span(token, token));
      c.next();
      return { k: 'tag', tag: token.value, span: span(token, token) };
    }
    const negative = Boolean(c.eat('-'));
    const value = c.peek();
    if (value.kind === 'number') {
      c.next();
      if (value.suffix !== 'n') {
        throw unsupported('case test on a Number', 'a value switch compares BigInt or boolean literals; compare Numbers with if and ===', span(token, value));
      }
      return { k: 'numLit', value: value.value, ...(negative && { negative }), span: span(token, value) };
    }
    if (!negative && (c.is('true') || c.is('false'))) {
      c.next();
      return { k: 'boolLit', value: token.value === 'true', span: span(token, token) };
    }
    throw unsupported('case test', 'the cases of a value switch are BigInt or boolean literals', span(token, value));
  }

  /** The @typedef whose tags a tag switch names. */
  switchData(node) {
    const tags = node.clauses.flatMap((clause) => clause.tests.filter((test) => test.k === 'tag').map((test) => test.tag));
    const candidates = [...this.dataTypes].filter(([, ctors]) => tags.every((tag) => ctors.some((ctor) => ctor.name === tag)));
    if (candidates.length !== 1) {
      throw typeError(candidates.length ? `tags ${tags.join(', ')} are ambiguous between data types` : `no @typedef has tags ${tags.join(', ')}`, node.span);
    }
    const [name, ctors] = candidates[0];
    return { name, ctors };
  }

  /** Whether the next top-level statement declares or assigns variables, or is a block, if or loop. */
  startsTopLevelImperative() {
    const c = this.cursor;
    if (['let', 'var', 'if', 'for', 'while', 'do'].some((word) => c.is(word)) && c.peek().kind === 'identifier') return true;
    return c.is('{') || this.startsAssignment();
  }

  /** A top-level statement read as a function body's, where `return` has no function to leave. */
  topLevelStatement() {
    this.topLevel = true;
    try {
      return this.statement();
    } finally {
      this.topLevel = false;
    }
  }

  /**
   * Top-level statements that declare or assign variables are one
   * expression, whose value carries the top-level variables they declare
   * or assign; main binds each of them for the statements after it.
   */
  lowerTopLevel(statements, effects) {
    const variables = effects.filter((effect) => effect.k === 'let' && !effect.name.startsWith('ml_')).map((effect) => effect.name);
    const where = { start: statements[0].span.start, end: statements.at(-1).span.end };
    return lowerTopLevel(this, statements, variables, where);
  }

  mainStatement() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('const')) {
      if (c.is('{', 1)) throw unsupported('top-level destructuring', 'bind each value with const', span(token, c.peek(1)));
      const binding = this.constStatement();
      return { k: 'let', name: binding.name, value: binding.value, constant: true, span: binding.span };
    }
    if (c.is('console') && c.is('.', 1)) return this.consoleStatement();
    if (this.assertion && c.is(this.assertion.name)) return this.assertStatement();
    if (token.kind === 'identifier' && ['switch', 'try', 'throw', 'class', 'return'].includes(token.value)) {
      throw unsupported(`top-level ${token.value} statement`, 'the top level prints with console.log, binds with const or let, assigns, branches with if, loops and asserts', span(token, token));
    }
    // A statement that discards its value still runs it, for the lines it prints and the aborts it may reach.
    const expr = this.expr();
    c.eat(';');
    this.generatedCount += 1;
    return { k: 'let', name: `ml_main_ignored${this.generatedCount}`, value: expr, span: span(token, c.peek()) };
  }

  consoleStatement() {
    const c = this.cursor;
    const start = c.next();
    c.expect('.', 'console');
    const method = c.identifier('console');
    if (method.value !== 'log') {
      throw unsupported(`console.${method.value}`, 'console.log, which writes a line to standard output, is the portable output', span(start, method));
    }
    const args = this.arguments('console.log');
    c.eat(';');
    const where = span(start, c.peek());
    const expr = args.length > 1 ? consoleFormat(args) : (args[0] ?? { k: 'str', value: '', span: where });
    return { k: 'print', expr, style: 'js-console', span: where };
  }

  assertStatement() {
    const c = this.cursor;
    const start = c.next();
    let method = null;
    if (c.eat('.')) method = c.identifier('assertion').value;
    const args = this.arguments('assertion');
    c.eat(';');
    const where = span(start, c.peek());
    const name = method ? `${this.assertion.name}.${method}` : this.assertion.name;
    if (method === null || method === 'ok') {
      if (args.length !== 1) throw unsupported(`${name} message`, 'custom assertion messages are not kept', where);
      return { k: 'assert', prop: { ...propOf(args[0]), span: where }, span: where };
    }
    const kind = ASSERTIONS[method] ?? (this.assertion.strict ? STRICT_ASSERTIONS[method] : undefined);
    if (!kind) throw unsupported(name, 'the portable assertions are assert, ok, strictEqual, notStrictEqual and deepStrictEqual', where);
    if (args.length !== 2) throw unsupported(`${name} message`, 'custom assertion messages are not kept', where);
    const [left, right] = args;
    // These assertions compare primitives with Object.is (SameValue): NaN equals NaN, and 0 differs from -0.
    if (kind === 'eq' || kind === 'ne') return { k: 'assert', prop: { p: kind, left, right, reference: true, sameValue: true, span: where }, span: where };
    return { k: 'assert', prop: { p: kind === 'deep' ? 'eq' : 'ne', left, right, sameValue: true, span: where }, span: where };
  }

  arguments(context) {
    const c = this.cursor;
    c.expect('(', context);
    const args = [];
    while (!c.is(')')) {
      if (c.is('...')) throw unsupported('spread argument', 'pass each argument', span(c.peek(), c.peek()));
      args.push(this.expr());
      if (!c.eat(',')) break;
    }
    c.expect(')', context);
    return args;
  }

  /** Arguments that may spread arrays, `(a, ...xs)`, as array items. */
  spreadArguments(context) {
    const c = this.cursor;
    c.expect('(', context);
    const args = [];
    while (!c.is(')')) {
      const spread = c.is('...');
      if (spread) c.next();
      args.push({ spread, value: this.expr() });
      if (!c.eat(',')) break;
    }
    c.expect(')', context);
    return args;
  }

  /**
   * Statements to one expression: `const` is `let`, `if` with a returning
   * branch selects between the branch and the rest, and every path must end
   * in `return` or `throw`.
   */
  lower(statements, where) {
    const list = statements.flatMap((statement) => (statement.s === 'block' && statement.inline ? statement.body : [statement]))
      .filter((statement) => statement.s !== 'empty');
    const unreachable = (index) => {
      if (index < list.length - 1) {
        throw unsupported('unreachable statement', 'statements after return, throw or a complete if are never executed', list[index + 1].span);
      }
    };
    const at = (index) => {
      // A function that finishes without returning returns undefined, the unit value.
      if (index === list.length) return { k: 'unit', span: where };
      const statement = list[index];
      switch (statement.s) {
        case 'const':
          return { k: 'let', name: statement.name, value: statement.value, body: at(index + 1), span: statement.span };
        case 'return':
          unreachable(index);
          return statement.expr;
        case 'throw':
          unreachable(index);
          return { k: 'abort', message: statement.message, span: statement.span };
        case 'block':
          if (!this.terminates(statement.body)) throw unsupported('block without a result', 'the block must end in return or throw', statement.span);
          unreachable(index);
          return this.lower(statement.body, statement.span);
        case 'if': {
          if (!this.terminates(statement.then) || (statement.else && !this.terminates(statement.else))) {
            throw unsupported('if branch without a result', 'every branch must end in return or throw; statements without effects are outside the portable core', statement.span);
          }
          const then = this.lower(statement.then, statement.span);
          const test = this.tagCondition(statement.cond);
          if (test) {
            if (statement.else) unreachable(index);
            const otherwise = statement.else ? this.lower(statement.else, statement.span) : at(index + 1);
            return this.lowerTagIf(test, then, otherwise, statement.span);
          }
          if (statement.else) {
            unreachable(index);
            return { k: 'if', cond: statement.cond, then, else: this.lower(statement.else, statement.span), span: statement.span };
          }
          return { k: 'if', cond: statement.cond, then, else: at(index + 1), span: statement.span };
        }
        case 'switch':
          return this.lowerSwitch(statement, index === list.length - 1 ? null : () => at(index + 1), () => unreachable(index));
        case 'expr':
          throw unsupported('expression statement', 'statements with effects are outside the portable core in function bodies', statement.span);
        default:
          throw new TranslationError('syntax', `unknown statement ${statement.s}`, statement.span);
      }
    };
    return at(0);
  }

  terminates(statements) {
    const list = statements.filter((statement) => statement.s !== 'empty' && !(statement.s === 'block' && statement.inline));
    const last = list.at(-1);
    if (!last) return false;
    if (last.s === 'return' || last.s === 'throw') return true;
    if (last.s === 'block') return this.terminates(last.body);
    if (last.s === 'if') return Boolean(last.else) && this.terminates(last.then) && this.terminates(last.else);
    if (last.s === 'switch') return this.switchTerminates(last);
    return false;
  }

  switchTerminates(node) {
    if (!node.clauses.every((clause) => this.terminates(clause.body))) return false;
    if (node.clauses.some((clause) => clause.tests.some((test) => test.k === 'default'))) return true;
    if (!node.tagged) return false;
    const tags = new Set(node.clauses.flatMap((clause) => clause.tests.map((test) => test.tag)));
    return node.data.ctors.every((ctor) => tags.has(ctor.name));
  }

  /**
   * A switch is a match. In a tag switch, `x.field` of the subject in a case
   * is a pattern variable of that case's constructor; the variables get
   * names that nothing in the case body uses, so no reference is captured.
   */
  lowerSwitch(node, rest, unreachable) {
    for (const clause of node.clauses) {
      if (!this.terminates(clause.body)) {
        throw unsupported('case without a result', 'every case must end in return or throw; falling through is outside the portable core', clause.span);
      }
    }
    const rows = [];
    // `default` applies only when no case matches, wherever it stands.
    let defaults = [];
    let hasDefault = false;
    for (const clause of node.clauses) {
      for (const test of clause.tests) {
        const body = this.lower(clause.body, clause.span);
        if (test.k === 'default') {
          hasDefault = true;
          defaults = node.tagged ? this.defaultRows(node, body, clause.span) : [{ patterns: [{ k: 'wild', span: test.span }], body, span: clause.span }];
        } else if (test.k === 'tag') {
          rows.push(this.tagRow(node, test, body, clause.span));
        } else {
          rows.push({ patterns: [{ k: test.k, value: test.value, ...(test.negative && { negative: true }), span: test.span }], body, span: clause.span });
        }
      }
    }
    rows.push(...defaults);
    if (this.switchTerminates(node)) {
      unreachable();
    } else if (rest && !hasDefault) {
      rows.push({ patterns: [{ k: 'wild', span: node.span }], body: rest(), span: node.span });
    } else if (hasDefault) {
      unreachable();
    }
    const scrutinee = node.tagged ? node.discriminant.object : node.discriminant;
    return { k: 'match', scrutinees: [scrutinee], rows, span: node.span };
  }

  /**
   * The `default` of a tag switch covers the remaining alternatives; when it
   * reads fields of the subject, it is one row per remaining alternative.
   */
  defaultRows(node, body, where) {
    const subject = node.discriminant.object.path[0];
    const covered = new Set(node.clauses.flatMap((clause) => clause.tests.filter((test) => test.k === 'tag').map((test) => test.tag)));
    if (!readsFields(body, subject)) return [{ patterns: [{ k: 'wild', span: where }], body, span: where }];
    return node.data.ctors.filter((ctor) => !covered.has(ctor.name)).map((ctor) => this.tagRow(node, { k: 'tag', tag: ctor.name, span: where }, body, where));
  }

  /** `x.$ === 'tag'` on a local `x`: the data type and the tag, when it narrows `x`. */
  tagCondition(cond) {
    const test = cond.tagTest;
    if (!test || test.object.k !== 'name' || test.object.path.length !== 1) return null;
    return test;
  }

  /** `if (x.$ === 'tag') A else B` is a match in which `A` reads the fields of `tag`. */
  lowerTagIf(test, then, otherwise, where) {
    const node = { discriminant: { k: 'field', object: test.object, field: '$' }, data: test.data, clauses: [{ tests: [{ k: 'tag', tag: test.tag }] }] };
    const [matching, other] = test.negated ? [otherwise, then] : [then, otherwise];
    const rows = [this.tagRow(node, { k: 'tag', tag: test.tag, span: where }, matching, where), ...this.defaultRows(node, other, where)];
    return { k: 'match', scrutinees: [test.object], rows, span: where };
  }

  tagRow(node, test, caseBody, where) {
    let body = caseBody;
    const subject = node.discriminant.object.path[0];
    const ctor = node.data.ctors.find((candidate) => candidate.name === test.tag);
    if (!ctor) throw typeError(`${node.data.name} has no tag ${test.tag}`, test.span);
    const binders = new Map();
    // `const { left, value } = t;` at the start of the case names the pattern variables itself.
    let rest = body;
    const direct = [];
    while (rest.k === 'let' && rest.value.k === 'field' && rest.value.object.k === 'name' && rest.value.object.path.length === 1
      && rest.value.object.path[0] === subject && ctor.fields.some((field) => field.name === rest.value.field)
      && !binders.has(rest.value.field) && rest.name !== subject && !direct.includes(rest.name)) {
      binders.set(rest.value.field, rest.name);
      direct.push(rest.name);
      rest = rest.body;
    }
    const rebound = new Set();
    collectBinders(rest, rebound);
    if (direct.some((name) => rebound.has(name))) {
      binders.clear();
      rest = body;
    }
    body = rest;
    const used = new Set();
    collectNames(body, used);
    for (const name of binders.values()) used.add(name);
    const binderFor = (field) => {
      if (!ctor.fields.some((candidate) => candidate.name === field)) {
        throw typeError(`the ${test.tag} alternative of ${node.data.name} has no field ${field}`, where);
      }
      if (!binders.has(field)) {
        let name = used.has(field) || field === subject ? `${subject}_${field}` : field;
        for (let index = 2; used.has(name); index += 1) name = `${subject}_${field}${index}`;
        used.add(name);
        binders.set(field, name);
      }
      return binders.get(field);
    };
    const substituted = substituteFields(body, subject, binderFor);
    const args = ctor.fields.map((field) => (binders.has(field.name)
      ? { k: 'bindOrCtor', name: binders.get(field.name), span: test.span }
      : { k: 'wild', span: test.span }));
    return { patterns: [{ k: 'ctor', path: [ROOT, node.data.name, test.tag], args, span: test.span }], body: substituted, span: where };
  }

  /** Expressions, by JavaScript precedence. */
  expr() {
    const c = this.cursor;
    const start = c.peek();
    if (start.kind === 'identifier' && c.is('=>', 1)) throw unsupported('arrow function', 'functions as values are outside the portable core', span(start, c.peek(1)));
    const cond = this.or();
    if (ASSIGNMENTS.has(c.peek().value) && c.peek().kind === 'punct') {
      throw unsupported('assignment', 'mutation is outside the portable core', span(start, c.peek()));
    }
    if (!c.eat('?')) return cond;
    const then = this.expr();
    c.expect(':', 'conditional expression');
    const otherwise = this.expr();
    return { k: 'if', cond, then, else: otherwise, span: joined(cond, otherwise, start) };
  }

  or() {
    const c = this.cursor;
    let left = this.and();
    for (;;) {
      const token = c.peek();
      if (c.is('??')) throw unsupported('nullish coalescing', 'null and undefined are outside the portable core', span(token, token));
      if (!c.eat('||')) return left;
      const right = this.and();
      left = { k: 'binary', op: 'or', left, right, span: joined(left, right, token) };
    }
  }

  and() {
    const c = this.cursor;
    let left = this.bitwise();
    while (c.is('&&')) {
      const token = c.next();
      const right = this.bitwise();
      left = { k: 'binary', op: 'and', left, right, span: joined(left, right, token) };
    }
    return left;
  }

  bitwise() {
    const c = this.cursor;
    const left = this.equality();
    const token = c.peek();
    if (token.kind === 'punct' && ['|', '^', '&'].includes(token.value)) {
      throw unsupported(`bitwise ${token.value}`, 'bitwise operators are outside the portable core', span(token, token));
    }
    return left;
  }

  equality() {
    const c = this.cursor;
    let left = this.relational();
    for (;;) {
      const token = c.peek();
      if (c.is('==') || c.is('!=')) throw unsupported(`loose equality ${token.value}`, 'use === or !==', span(token, token));
      const op = token.kind === 'punct' ? EQUALITY[token.value] : undefined;
      if (!op) return left;
      c.next();
      const right = this.relational();
      left = this.tagTest(op, left, right, joined(left, right, token)) ?? { k: 'binary', op, left, right, span: joined(left, right, token) };
    }
  }

  /** `x.$ === 'tag'` tests the alternative of a data value. */
  tagTest(op, left, right, where) {
    const [field, tag] = left.k === 'field' && left.field === '$' ? [left, right] : [right, left];
    if (field.k !== 'field' || field.field !== '$') return null;
    if (tag.k !== 'str') throw unsupported('computed tag test', 'compare the $ tag with a string literal', where);
    const candidates = [...this.dataTypes].filter(([, ctors]) => ctors.some((ctor) => ctor.name === tag.value));
    if (candidates.length !== 1) throw typeError(candidates.length ? `tag ${tag.value} is ambiguous between data types` : `no @typedef has tag ${tag.value}`, where);
    const [name, ctors] = candidates[0];
    const ctor = ctors.find((candidate) => candidate.name === tag.value);
    const pattern = { k: 'ctor', path: [ROOT, name, tag.value], args: ctor.fields.map(() => ({ k: 'wild', span: where })), span: where };
    return {
      k: 'match',
      scrutinees: [field.object],
      rows: [
        { patterns: [pattern], body: { k: 'bool', value: op === 'eq', span: where }, span: where },
        { patterns: [{ k: 'wild', span: where }], body: { k: 'bool', value: op !== 'eq', span: where }, span: where },
      ],
      tagTest: { object: field.object, tag: tag.value, data: { name, ctors }, negated: op === 'ne' },
      span: where,
    };
  }

  relational() {
    const c = this.cursor;
    let left = this.shift();
    for (;;) {
      const token = c.peek();
      if (c.is('in') || c.is('instanceof')) throw unsupported(`${token.value} operator`, 'objects are outside the portable core', span(token, token));
      const op = token.kind === 'punct' ? RELATIONAL[token.value] : undefined;
      if (!op) return left;
      c.next();
      const right = this.shift();
      left = { k: 'binary', op, left, right, span: joined(left, right, token) };
    }
  }

  shift() {
    const c = this.cursor;
    const left = this.additive();
    const token = c.peek();
    if (c.is('<<') || c.is('>>') || c.is('>>>')) throw unsupported(`shift ${token.value}`, 'bit shifts are outside the portable core', span(token, token));
    return left;
  }

  /** `+` adds numbers and concatenates strings; the checker decides which by the operand types. */
  additive() {
    const c = this.cursor;
    let left = this.multiplicative();
    for (;;) {
      const token = c.peek();
      if (!c.is('+') && !c.is('-')) return left;
      c.next();
      const right = this.multiplicative();
      left = { k: 'binary', op: token.value === '+' ? 'plus' : 'sub', left, right, span: joined(left, right, token) };
    }
  }

  multiplicative() {
    const c = this.cursor;
    let left = this.exponent();
    for (;;) {
      const token = c.peek();
      const op = token.kind === 'punct' ? MULTIPLICATIVE[token.value] : undefined;
      if (!op) return left;
      c.next();
      const right = this.exponent();
      left = { k: 'binary', op, left, right, span: joined(left, right, token) };
    }
  }

  exponent() {
    const c = this.cursor;
    const left = this.unary();
    if (c.is('**')) throw unsupported('exponentiation', 'powers are outside the portable core; use recursion', span(c.peek(), c.peek()));
    return left;
  }

  unary() {
    const c = this.cursor;
    const token = c.peek();
    if (token.kind === 'identifier' && c.eat('typeof')) {
      const arg = this.unary();
      return { k: 'typeOf', arg, span: joined(token, arg, token) };
    }
    if (c.eat('!')) {
      const arg = this.unary();
      return { k: 'unary', op: 'not', arg, span: joined(token, arg, token) };
    }
    if (c.eat('-')) {
      const arg = this.unary();
      return { k: 'unary', op: 'neg', arg, span: joined(token, arg, token) };
    }
    if (c.is('+')) throw unsupported('unary +', 'unary plus throws a TypeError on BigInt values', span(token, token));
    if (c.is('~')) throw unsupported('bitwise ~', 'bitwise operators are outside the portable core', span(token, token));
    if (c.is('++') || c.is('--')) throw unsupported(`${token.value} operator`, 'mutation is outside the portable core', span(token, token));
    if (token.kind === 'identifier' && token.value === 'await') {
      if (!this.inAsync) {
        throw unsupported('await outside an async function', 'await is only valid in async functions and at the top level of a module', span(token, token));
      }
      c.next();
      this.sequentialAsync = true;
      return this.awaited(() => this.unary());
    }
    if (token.kind === 'identifier' && ['typeof', 'void', 'delete', 'await', 'yield'].includes(token.value)) {
      throw unsupported(`${token.value} operator`, 'outside the portable core', span(token, token));
    }
    return this.postfix();
  }

  postfix() {
    const c = this.cursor;
    let expr = this.primary();
    for (;;) {
      const token = c.peek();
      if (c.is('.') && c.peek(1).kind === 'identifier') {
        c.next();
        const field = c.next();
        const arrayForm = readArrayMethodForm(field.value);
        if (c.is('(') && arrayForm !== '') {
          const args = this.arguments(field.value);
          if (!acceptArrayMethodArguments(arrayForm, args.length > 0, args.length === 1)) throw unsupported(`.${field.value}() with arguments`, 'array copying takes no index arguments until their bounds are modeled', span(token, c.peek()));
          expr = { k: 'array', items: [expr, ...args].map((value) => ({ spread: true, value })), span: joined(expr, { span: span(token, c.peek()) }, token) };
          continue;
        }
        if (c.is('(') && readStringTestOperation('JavaScript', field.value) !== '') {
          const args = this.arguments(field.value);
          if (args.length !== 1) throw unsupported(`.${field.value}() with ${args.length} arguments`, 'search the whole string, with one argument', span(token, c.peek()));
          expr = { k: 'stringTest', op: field.value, object: expr, search: args[0], span: joined(expr, { span: span(token, c.peek()) }, token) };
          continue;
        }
        if (c.is('(') && readStringMapOperation('JavaScript', field.value) !== '') {
          const args = this.arguments(field.value);
          if (args.length !== 0) throw unsupported(`.${field.value}() with ${args.length} arguments`, 'string maps take no arguments', span(token, c.peek()));
          expr = { k: 'stringMap', op: field.value, object: expr, span: joined(expr, { span: span(token, c.peek()) }, token) };
          continue;
        }
        if (c.is('(')) {
          if (field.value !== 'toString') throw unsupported(`method call .${field.value}()`, 'methods of values are outside the portable core', span(token, c.peek()));
          const args = this.arguments('toString');
          if (args.length) throw unsupported('toString with a radix', 'only decimal text is portable', span(token, c.peek()));
          expr = { k: 'toString', arg: expr, span: joined(expr, { span: span(token, c.peek()) }, token) };
          continue;
        }
        expr = { k: 'field', object: expr, field: field.value, span: joined(expr, { span: span(field, field) }, token) };
        continue;
      }
      if (c.is('?.')) throw unsupported('optional chaining', 'null and undefined are outside the portable core', span(token, token));
      if (c.is('[')) {
        c.next();
        const index = this.expr();
        const close = c.expect(']', 'index');
        expr = { k: 'index', object: expr, index, span: joined(expr, close, token) };
        if (c.peek().kind === 'punct' && (ASSIGNMENTS.has(c.peek().value) || c.is('++') || c.is('--'))) {
          throw unsupported('assignment of an array element', 'the portable core reads arrays and does not mutate them; build a new array with [...xs, value]', expr.span);
        }
        continue;
      }
      if (c.is('(')) throw unsupported('call of a computed function', 'only named functions can be called', span(token, token));
      if (c.isKind('template')) throw unsupported('tagged template', 'template tags are functions as values', span(token, token));
      if (c.is('++') || c.is('--')) throw unsupported(`${token.value} operator`, 'mutation is outside the portable core', span(token, token));
      return expr;
    }
  }

  primary() {
    const c = this.cursor;
    const token = c.peek();
    switch (token.kind) {
      case 'number':
        c.next();
        return this.numberLiteral(token);
      case 'string':
        c.next();
        return { k: 'str', value: token.value, span: span(token, token) };
      case 'template':
        c.next();
        return this.template(token);
      case 'identifier':
        return this.identifier();
      default:
        break;
    }
    if (c.is('(')) {
      const close = this.matching(c.index);
      if (this.cursor.tokens[close + 1]?.value === '=>') {
        throw unsupported('arrow function', 'functions as values are outside the portable core', span(token, token));
      }
      c.next();
      const inner = this.expr();
      c.expect(')', 'parenthesised expression');
      return { ...inner, span: span(token, c.peek()) };
    }
    if (c.is('{')) return this.objectLiteral();
    if (c.is('[')) return this.arrayLiteral();
    if (token.kind === 'regex' || c.is('/')) throw unsupported('regular expression', 'outside the portable core', span(token, token));
    throw this.fail('expected an expression');
  }

  /** `[a, ...xs, b]`: the elements in order, with the elements of each spread array in place. */
  arrayLiteral() {
    const c = this.cursor;
    const start = c.next();
    const items = [];
    while (!c.is(']')) {
      if (c.is(',')) throw unsupported('array hole', 'a hole is an element that reads undefined, which is not a portable value', span(c.peek(), c.peek()));
      const spread = c.is('...');
      if (spread) c.next();
      items.push({ spread, value: this.expr() });
      if (!c.eat(',')) break;
    }
    c.expect(']', 'array literal');
    return { k: 'array', items, span: span(start, c.peek()) };
  }

  matching(index) {
    const tokens = this.cursor.tokens;
    let depth = 0;
    for (let at = index; at < tokens.length; at += 1) {
      if (tokens[at].kind !== 'punct') continue;
      if (['(', '[', '{'].includes(tokens[at].value)) depth += 1;
      if ([')', ']', '}'].includes(tokens[at].value)) {
        depth -= 1;
        if (depth === 0) return at;
      }
    }
    return tokens.length - 1;
  }

  /**
   * `5n` and `0x1fn` are BigInt literals, which the lexer keeps as decimal
   * digits; `42`, `1.5` and `1e21` are Numbers, IEEE-754 doubles, which the
   * lexer keeps as `String(value)`.
   */
  numberLiteral(token) {
    if (token.suffix === 'n') return { k: 'num', value: token.value, span: span(token, token) };
    return { k: 'num', value: token.value, type: FLOAT, span: span(token, token) };
  }

  /** Template literals concatenate their text with `String(value)` of each substitution. */
  template(token) {
    const pieces = [];
    for (const part of token.parts) {
      if (part.text) pieces.push({ k: 'str', value: part.text, span: span(token, token) });
      if (part.expression) {
        const value = this.subexpression(part.expression);
        pieces.push({ k: 'show', arg: value, style: 'js-template', span: value.span });
      }
    }
    if (!pieces.length) return { k: 'str', value: '', span: span(token, token) };
    return pieces.reduce((left, right) => ({ k: 'binary', op: 'concat', left, right, span: span(token, token) }));
  }

  subexpression({ source, offset }) {
    const { tokens } = tokenize(source, 'JavaScript');
    const shifted = tokens.map((token) => ({ ...token, start: token.start + offset, end: token.end + offset }));
    const outer = this.cursor;
    this.cursor = new TokenCursor(shifted, 'JavaScript');
    try {
      const expr = this.expr();
      if (!this.cursor.atEnd()) throw this.fail('expected } after the template substitution');
      return expr;
    } finally {
      this.cursor = outer;
    }
  }

  /** `{ $: 'node', left, value: v }` constructs the `node` alternative of a data type. */
  objectLiteral() {
    const c = this.cursor;
    const start = c.next();
    let tag = null;
    const fields = {};
    while (!c.is('}')) {
      const key = c.peek();
      if (c.is('...')) throw unsupported('object spread', 'name every field', span(key, key));
      if (key.kind !== 'identifier') throw unsupported(`object key ${describe(key)}`, 'keys are identifiers', span(key, key));
      c.next();
      if (key.value === '$') {
        c.expect(':', 'object');
        const value = c.next();
        if (value.kind !== 'string') throw unsupported('computed tag', 'the $ tag is a string literal', span(value, value));
        tag = value.value;
      } else {
        if (Object.hasOwn(fields, key.value)) throw typeError(`duplicate field ${key.value}`, span(key, key));
        if (c.is('(')) throw unsupported('method in an object value', 'functions as values are outside the portable core', span(key, key));
        fields[key.value] = c.eat(':') ? this.expr() : this.reference(key);
      }
      if (!c.eat(',')) break;
    }
    c.expect('}', 'object');
    if (tag === null) throw unsupported('object without a $ tag', 'a portable object is an alternative of a @typedef data type', span(start, c.peek()));
    return { k: 'ctorObject', tag, fields, span: span(start, c.peek()) };
  }

  /**
   * An expression whose value is awaited: when it is a call of an async
   * function, that call is awaited where it is made, which is its ordinary
   * call. Any other value is awaited as itself.
   */
  awaited(read) {
    const before = this.unawaited.length;
    const expr = read();
    const call = this.unawaited[this.unawaited.length - 1];
    const path = expr.k === 'app' ? expr.fn.path : expr.path;
    if (this.unawaited.length > before && ['app', 'name'].includes(expr.k) && path?.[0] === ROOT && path.slice(1).join('.') === call.name) {
      this.unawaited.pop();
    }
    return expr;
  }

  identifier() {
    const c = this.cursor;
    const token = c.peek();
    if (token.value === 'true' || token.value === 'false') {
      c.next();
      return { k: 'bool', value: token.value === 'true', span: span(token, token) };
    }
    if (token.value === 'NaN' || token.value === 'Infinity') {
      c.next();
      return { k: 'num', value: token.value, type: FLOAT, span: span(token, token) };
    }
    if (['null', 'undefined'].includes(token.value)) {
      throw unsupported(token.value, 'outside the portable core', span(token, token));
    }
    if (['this', 'super', 'new', 'function', 'class', 'import', 'arguments'].includes(token.value)) {
      throw unsupported(`${token.value} expression`, 'outside the portable core', span(token, token));
    }
    c.next();
    if (this.scope.locals.has(token.value) || this.scope.tdz.has(token.value)) return this.reference(token);
    if (this.literalBindings.has(token.value)) return { ...this.literalBindings.get(token.value), span: span(token, token) };
    if (this.assertion?.name === token.value) throw unsupported('assertion in an expression', 'assertions are top-level statements', span(token, token));
    // A constant of another item of the module is read by name.
    if (this.externals.get(token.value)?.k === 'const' && !c.is('(')) return { k: 'name', path: [ROOT, token.value], span: span(token, token) };
    // A global: a function, or a namespace path to a method, which must be called.
    const segments = [token.value];
    while (c.is('.') && c.peek(1).kind === 'identifier') {
      c.next();
      segments.push(c.next().value);
    }
    const name = segments.join('.');
    const where = span(token, c.peek());
    if (Object.hasOwn(CONSTANTS, name) && !c.is('(')) {
      const value = CONSTANTS[name];
      return { k: 'num', value: value.replace(/^-/u, ''), ...(value.startsWith('-') && { negative: true }), type: FLOAT, span: where };
    }
    if (Object.hasOwn(MATH, name) && c.is('(')) {
      const args = this.spreadArguments(name);
      return { k: 'math', op: MATH[name], name, args, span: span(token, c.peek()) };
    }
    if (!c.is('(')) {
      throw unsupported(`function value ${name}`, 'functions and namespaces are only portable when a function is called', where);
    }
    const args = this.arguments(name);
    const called = span(token, c.peek());
    const arrayForm = readArrayMethodForm(name);
    if (arrayForm === 'copy-from' || arrayForm === 'construct') {
      if (!acceptArrayMethodArguments(arrayForm, args.length > 0, args.length === 1)) throw unsupported(`${name}() with ${args.length} arguments`, 'array copying takes one array and no mapping function', called);
      return { k: 'array', items: args.map(value => ({ spread: arrayForm === 'copy-from', value })), span: called };
    }
    if (name === 'String' && args.length === 1) return { k: 'toString', arg: args[0], span: called };
    if (name === 'Object.freeze' && args.length === 1) return { ...args[0], span: called };
    if (GLOBALS.has(segments[0]) || name === 'String') {
      throw unsupported(name, 'the JavaScript standard library is outside the portable core', called);
    }
    if (segments.length === 1 && this.asyncNames.has(name)) this.unawaited.push({ name, span: called });
    if (!args.length) return { k: 'name', path: [ROOT, ...segments], span: called };
    return { k: 'app', fn: { k: 'name', path: [ROOT, ...segments], span: where }, args, span: called };
  }

  /** A local variable; reading one before its declaration throws in JavaScript. */
  reference(token) {
    if (this.scope.tdz.has(token.value)) {
      throw unsupported(`use of ${token.value} before its declaration`, 'the binding is in its temporal dead zone, where reading it throws a ReferenceError', span(token, token));
    }
    if (!this.scope.locals.has(token.value)) {
      throw unsupported(`function value ${token.value}`, 'functions are only portable when called', span(token, token));
    }
    return { k: 'name', path: [token.value], span: span(token, token) };
  }
}

/** Local names with the translator's `ml_` prefix could meet the names it makes up. */
const FORMAT_STYLES = { s: 'js-console', d: 'js-format-number', i: 'js-format-integer' };

/**
 * `console.log(a, b, …)` prints `util.format(a, b, …)`: a literal first
 * string reads its `%s`, `%d`, `%i`, `%c` and `%%` directives, each taking
 * the next argument, and the arguments left over follow, each after a space,
 * strings as they are and other values as the console shows them. A first
 * argument that is not a literal string is shown like the rest, and the
 * checker refuses it when it is a string, whose directives only the run
 * reads.
 */
function consoleFormat([first, ...values]) {
  const pieces = [];
  let next = 0;
  if (first.k === 'str') {
    const source = first.value;
    let text = '';
    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      const directive = source[index + 1];
      if (char !== '%' || directive === undefined) {
        text += char;
        continue;
      }
      if (directive === '%') {
        text += '%';
        index += 1;
        continue;
      }
      // A directive with no argument left, or an unknown one, stays as it is written.
      if (next === values.length || !'sdifjoOc'.includes(directive)) {
        text += char;
        continue;
      }
      const value = values[next];
      next += 1;
      index += 1;
      if (directive === 'c') {
        if (value.k !== 'str') throw unsupported('%c with a computed style', 'console.log discards the CSS a %c directive takes; pass it as a string literal', value.span);
        continue;
      }
      if (!FORMAT_STYLES[directive]) {
        throw unsupported(`console.log %${directive} directive`, 'the portable directives are %s, %d, %i, %c and %%', first.span);
      }
      if (text) pieces.push({ k: 'str', value: text, span: first.span });
      text = '';
      pieces.push({ k: 'show', arg: value, style: FORMAT_STYLES[directive], span: value.span });
    }
    if (text || !pieces.length) pieces.push({ k: 'str', value: text, span: first.span });
  } else {
    pieces.push({ k: 'show', arg: first, style: 'js-format-first', span: first.span });
  }
  for (const value of values.slice(next)) {
    pieces.push({ k: 'str', value: ' ', span: value.span }, { k: 'show', arg: value, style: 'js-console', span: value.span });
  }
  return pieces.reduce((left, right) => ({ k: 'binary', op: 'concat', left, right, span: first.span }));
}

function reserved(token) {
  if (/^ml_/u.test(token.value)) {
    throw unsupported('reserved identifier', `${token.value} uses the translator's reserved ml_ prefix`, span(token, token));
  }
}

/** A top-level declaration may not shadow a global the translation reads as the built-in. */
function global(token) {
  if (GLOBALS.has(token.value) || token.value === 'String') {
    throw unsupported(`declaration of ${token.value}`, `it shadows the JavaScript global ${token.value}, which the translation reads as the built-in; rename it`, span(token, token));
  }
}

/** The parameter a leading `if (n < 0n) throw …` restricts to the naturals. */
function guardedParameter(statement, params) {
  if (statement.s !== 'if' || statement.else) return null;
  const then = statement.then.filter((inner) => inner.s !== 'empty');
  if (then.length !== 1 || then[0].s !== 'throw') return null;
  const { cond } = statement;
  if (cond.k !== 'binary') return null;
  const isZero = (node) => node.k === 'num' && node.value === '0';
  let variable = null;
  if (cond.op === 'lt' && isZero(cond.right)) variable = cond.left;
  if (cond.op === 'gt' && isZero(cond.left)) variable = cond.right;
  if (variable?.k !== 'name' || variable.path.length !== 1) return null;
  const param = params.find((candidate) => candidate.name === variable.path[0]);
  // An undeclared parameter compared with the BigInt 0n is a bigint.
  const zero = cond.op === 'lt' ? cond.right : cond.left;
  return param && (param.type === INT || (param.type === null && !zero.type)) ? param : null;
}

/**
 * JSDoc tags of a comment: `@tag {type} name`. Leading `*` of each line is
 * decoration.
 */
function jsdocTags(comment) {
  const text = comment.text.slice(3, -2).split('\n').map((line) => line.replace(/^\s*\*?/u, '')).join('\n');
  const tags = [];
  const pattern = /@([A-Za-z]+)/gu;
  let match = pattern.exec(text);
  while (match) {
    let index = match.index + match[0].length;
    while (text[index] === ' ' || text[index] === '\t') index += 1;
    let type = null;
    if (text[index] === '{') {
      let depth = 0;
      let end = index;
      for (; end < text.length; end += 1) {
        if (text[end] === '{') depth += 1;
        if (text[end] === '}') {
          depth -= 1;
          if (depth === 0) break;
        }
      }
      if (depth !== 0) throw new TranslationError('syntax', `unbalanced braces in the JSDoc type of @${match[1]}`, comment);
      type = text.slice(index + 1, end).replaceAll('\n', ' ');
      index = end + 1;
    }
    const tail = text.slice(index);
    const range = findDocumentationParameterRange(Array.from({ length: tail.length }, (_, offset) => tail.charCodeAt(offset)));
    const name = range.length ? tail.slice(range[0], range[1]) : null;
    tags.push({ tag: match[1], type, name });
    pattern.lastIndex = index;
    match = pattern.exec(text);
  }
  return tags;
}

/** Every name a surface expression binds or mentions. */
function collectNames(node, names) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectNames(item, names);
    return;
  }
  if (node.k === 'name' && node.path.length === 1) names.add(node.path[0]);
  if (node.k === 'let' || node.k === 'bind' || node.k === 'bindOrCtor') names.add(node.name);
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'span' && key !== 'type') collectNames(value, names);
  }
}

/** Whether an expression reads a field of `subject`. */
function readsFields(node, subject) {
  if (!node || typeof node !== 'object') return false;
  if (Array.isArray(node)) return node.some((item) => readsFields(item, subject));
  if (node.k === 'field' && node.object.k === 'name' && node.object.path.length === 1 && node.object.path[0] === subject) return true;
  return Object.entries(node).some(([key, value]) => key !== 'span' && key !== 'type' && value && typeof value === 'object' && readsFields(value, subject));
}

/** Every name a surface expression binds. */
function collectBinders(node, names) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) collectBinders(item, names);
    return;
  }
  if (node.k === 'let' || node.k === 'bind' || node.k === 'bindOrCtor') names.add(node.name);
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'span' && key !== 'type') collectBinders(value, names);
  }
}

/** Replaces `subject.field` by the case's pattern variables, up to a rebinding of `subject`. */
function substituteFields(node, subject, binderFor) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) return node.map((item) => substituteFields(item, subject, binderFor));
  if (node.k === 'field' && node.object.k === 'name' && node.object.path.length === 1 && node.object.path[0] === subject) {
    return { k: 'name', path: [binderFor(node.field)], span: node.span };
  }
  if (node.k === 'let') {
    const value = substituteFields(node.value, subject, binderFor);
    return { ...node, value, body: node.name === subject ? node.body : substituteFields(node.body, subject, binderFor) };
  }
  if (node.k === 'match') {
    const scrutinees = substituteFields(node.scrutinees, subject, binderFor);
    const rows = node.rows.map((row) => {
      const bound = new Set();
      collectNames(row.patterns, bound);
      return bound.has(subject) ? row : { ...row, body: substituteFields(row.body, subject, binderFor) };
    });
    return { ...node, scrutinees, rows };
  }
  const copy = { ...node };
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'span' && key !== 'type' && value && typeof value === 'object') copy[key] = substituteFields(value, subject, binderFor);
  }
  return copy;
}

/** A proposition from an asserted condition; `===` on objects compares identities. */
function propOf(expr) {
  if (expr.k === 'binary' && (expr.op === 'eq' || expr.op === 'ne')) return { p: expr.op, left: expr.left, right: expr.right, reference: true };
  if (expr.k === 'binary' && ['lt', 'le', 'gt', 'ge'].includes(expr.op)) return { p: expr.op, left: expr.left, right: expr.right };
  if (expr.k === 'binary' && (expr.op === 'and' || expr.op === 'or')) return { p: expr.op, left: propOf(expr.left), right: propOf(expr.right) };
  if (expr.k === 'unary' && expr.op === 'not') return { p: 'not', arg: propOf(expr.arg) };
  return { p: 'bool', expr };
}

/**
 * The path inside the crate of the module a relative `specifier` names from
 * the module directory `directory`, or null when it climbs above the crate
 * root or names no file.
 */
function cratePath(specifier, directory) {
  const parts = specifier.split('/');
  const file = parts.pop().replace(/\.[cm]?[jt]s$/u, '');
  const path = [...directory];
  for (const part of parts) {
    if (part === '..') {
      if (!path.length) return null;
      path.pop();
    } else if (part !== '.') {
      if (!part) return null;
      path.push(part);
    }
  }
  return file && file !== '.' && file !== '..' ? [...path, file] : null;
}

function joined(left, right, token) {
  return { start: left.span?.start ?? left.start ?? token.start, end: right.span?.end ?? right.end ?? token.end };
}

function span(from, to) {
  return { start: from.start, end: Math.max(from.end, to && to.kind !== 'eof' ? to.start : from.end) };
}
