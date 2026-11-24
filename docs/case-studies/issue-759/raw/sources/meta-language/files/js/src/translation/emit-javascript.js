import { renderStringMapExpression, renderStringTestExpression } from './frontend-rules.js';
// JavaScript emitter. Every portable integer is a BigInt, so naturals and
// integers stay unbounded and machine integers are range-checked exactly as
// Rust checks them; a Number stays a Number. Data values are plain objects whose `$` property names
// the constructor. Modules become object literals referenced by qualified
// names. Theorems cannot be proved in JavaScript: each becomes an executable
// property, checked over a bounded domain by `--ml-check-theorems`, while the
// proof obligation stays discharged by the source language's kernel.

import { castMessage, overflowMessage, zeroDivisorMessage } from './aborts.js';
import { unsupported } from './diagnostics.js';
import { fixedBounds, typeKey } from './types.js';
import { renameFunction, renameMain, renameTheorem, tailLoop } from './ir.js';
import { EmitState, withParts } from './emit-common.js';

const KEYWORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default', 'delete', 'do', 'else', 'enum',
  'export', 'extends', 'false', 'finally', 'for', 'function', 'if', 'import', 'in', 'instanceof', 'new', 'null',
  'return', 'super', 'switch', 'this', 'throw', 'true', 'try', 'typeof', 'var', 'void', 'while', 'with', 'yield',
  'await', 'let', 'static', 'implements', 'interface', 'package', 'private', 'protected', 'public', 'arguments',
  'eval', 'undefined', 'NaN', 'Infinity', 'globalThis', 'console', 'process', 'BigInt', 'String', 'Object', 'Error',
  'RangeError', 'Math', 'Number', 'Array', 'JSON', 'Symbol', 'main', '__proto__', 'constructor', 'prototype', 'of',
  'async', 'get', 'set',
]);

const HELPERS = {
  natSub: `function ml_natSub(a, b) {
  return a > b ? a - b : 0n;
}`,
  fixed: `function ml_fixed(value, min, max, message) {
  if (value < min || value > max) throw new RangeError(message);
  return value;
}`,
  divide: `// Integer division with the source's rounding; by zero it aborts with the message \`zero\`
// or, when that is null, is total (x / 0 = 0, x % 0 = x); a machine-integer quotient
// out of [min, max] aborts with \`overflow\`, the remainder too.
function ml_divide(a, b, rounding, zero, remainder, bounds) {
  if (b === 0n) {
    if (zero !== null) throw new RangeError(zero);
    return remainder ? a : 0n;
  }
  let q = a / b;
  const r = a - q * b;
  if (r !== 0n) {
    if (rounding === 'floor' && (r < 0n) !== (b < 0n)) q -= 1n;
    if (rounding === 'euclid' && r < 0n) q = b > 0n ? q - 1n : q + 1n;
  }
  if (bounds && (q < bounds[0] || q > bounds[1])) throw new RangeError(bounds[2]);
  return remainder ? a - q * b : q;
}`,
  toNatChecked: `function ml_toNatChecked(value, message) {
  if (value < 0n) throw new RangeError(message);
  return value;
}`,
  abort: `function ml_abort(message) {
  throw new Error(message);
}`,
  assert: `function ml_assert(holds, statement) {
  if (!holds) throw new Error(\`assertion failed: \${statement}\`);
}`,
  equal: `function ml_equal(left, right) {
  if (typeof left !== 'object' || left === null) return left === right;
  const keys = Object.keys(left);
  return keys.length === Object.keys(right).length && keys.every((key) => ml_equal(left[key], right[key]));
}`,
  showNumber: `// console.log prints -0 as -0, where String(-0) is "0".
function ml_showNumber(value) {
  return Object.is(value, -0) ? '-0' : String(value);
}`,
  at: `// An element of an array; a read outside it, undefined in JavaScript, aborts.
function ml_at(values, index) {
  const at = Number(index);
  if (!Number.isInteger(at) || at < 0 || at >= values.length) throw new RangeError(\`array index \${index} out of range\`);
  return values[at];
}`,
  forall: `function ml_forall(values, property) {
  return values.every(property);
}`,
  domains: `// Bounded domains for executable theorem checks.
const ml_nat = [0n, 1n, 2n, 3n, 4n, 5n, 6n];
const ml_int = [-4n, -3n, -2n, -1n, 0n, 1n, 2n, 3n, 4n];
const ml_small_nat = [0n, 1n, 2n];
const ml_small_int = [-1n, 0n, 1n];
function ml_product(lists) {
  return lists.reduce((rows, list) => rows.flatMap((row) => list.map((value) => [...row, value])), [[]]);
}`,
};

function ident(name) {
  let result = name.replace(/[^A-Za-z0-9_]/gu, '_');
  if (/^[0-9]/u.test(result)) result = `x${result}`;
  if (KEYWORDS.has(result)) result = `${result}_`;
  return result;
}

export function emitJavaScript(program) {
  const state = new EmitState(program, 'JavaScript', ident, KEYWORDS, { modulesShareTermSpace: true, typeSpace: true });
  return new JavaScriptEmitter(program, state).file();
}

class JavaScriptEmitter {
  constructor(program, state) {
    this.program = program;
    this.state = state;
    this.helpers = new Set();
    this.temporaries = 0;
    this.theoremChecks = [];
  }

  file() {
    const tree = { items: [], modules: new Map() };
    for (const entry of this.program.declarations.values()) {
      let node = tree;
      for (const segment of entry.modulePath) {
        if (!node.modules.has(segment)) node.modules.set(segment, { items: [], modules: new Map() });
        node = node.modules.get(segment);
      }
      node.items.push(entry);
    }
    const blocks = [];
    for (const entry of tree.items) {
      const text = this.declaration(entry);
      if (text) blocks.push(text.replace(/^([A-Za-z0-9_$]+)\(/u, 'function $1('));
    }
    for (const [segment, node] of tree.modules) {
      blocks.push(`const ${this.state.moduleName([segment])} = ${this.moduleObject(node, [segment])};`);
    }
    const main = this.program.main ? this.main(this.program.main) : null;
    if (this.theoremChecks.length) this.helpers.add('domains').add('forall');
    const helperOrder = ['natSub', 'fixed', 'divide', 'toNatChecked', 'abort', 'assert', 'equal', 'showNumber', 'at', 'forall', 'domains'];
    const entry = [
      this.theoremChecks.length ? this.theoremRunner() : null,
      main,
      this.theoremChecks.length
        ? "if (process.argv.includes('--ml-check-theorems')) ml_checkTheorems();\nelse main();"
        : (main ? 'main();' : null),
    ].filter(Boolean);
    const text = [
      `// Translated from ${this.program.sourceLanguage} by meta-language: portable core, JavaScript target.`,
      "'use strict';",
      '',
      ...helperOrder.filter((name) => this.helpers.has(name)).flatMap((name) => [HELPERS[name], '']),
      ...blocks.flatMap((block) => [block, '']),
      ...entry.flatMap((block) => [block, '']),
    ].join('\n');
    this.state.encode('numbers', 'every natural, integer and machine integer is a BigInt; machine-integer results are range-checked and throw RangeError where Rust would panic');
    if (this.usesFloat) this.state.encode('floats', 'a Number is a JavaScript Number, an IEEE-754 double, with its own arithmetic, comparisons and String conversion');
    return withParts({
      language: 'JavaScript',
      text,
      mappings: this.state.mappings,
      assumptions: this.state.assumptionList(),
      encodings: this.state.encodingList(),
      theorems: this.state.theorems,
      entry: main ? 'main' : null,
    }, helperOrder.filter((name) => this.helpers.has(name)).map((name) => HELPERS[name]), blocks);
  }

  moduleObject(node, path) {
    const members = [];
    for (const entry of node.items) {
      const text = this.declaration(entry);
      if (text) members.push(indent(`${text},`, 1));
    }
    for (const [segment, child] of node.modules) {
      members.push(indent(`${this.state.moduleName([...path, segment])}: ${this.moduleObject(child, [...path, segment])},`, 1));
    }
    return `{\n${members.join('\n')}\n}`;
  }

  declaration(entry) {
    if (entry.k === 'data') {
      this.state.map(entry, this.state.localName(entry.fullName));
      this.state.encode('data', 'a data value is a frozen object whose $ property names its constructor and whose other properties are its fields');
      return null;
    }
    if (entry.k === 'fn') return this.fn(entry);
    return this.theorem(entry);
  }

  fn(entry) {
    const { params, body } = renameFunction(entry, ident, this.state.localReserved());
    if (params.some((param) => param.type.kind === 'float') || entry.ret.kind === 'float') this.usesFloat = true;
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    const guards = params.flatMap((param) => this.parameterGuard(param));
    const loop = tailLoop(entry, body);
    // A lifted loop runs as a loop: each iteration assigns the parameters their next values.
    this.loopParams = loop && params.map((param) => param.name);
    const lines = [...guards, ...(loop ? ['for (;;) {', indent(this.statements(loop).join('\n'), 1), '}'] : this.statements(body))];
    this.loopParams = null;
    return `${name}(${params.map((param) => param.name).join(', ')}) {\n${indent(lines.join('\n'), 1)}\n}`;
  }

  /** Machine-integer parameters are range-checked, as the Rust type guarantees. */
  parameterGuard(param) {
    if (param.type.kind !== 'fixed') return [];
    this.helpers.add('fixed');
    const { min, max } = fixedBounds(param.type);
    return [`ml_fixed(${param.name}, ${min}n, ${max}n, ${JSON.stringify(`${typeKey(param.type)} argument ${param.name} out of range`)});`];
  }

  theorem(entry) {
    const { binders, prop } = renameTheorem(entry, ident, this.state.localReserved());
    const name = this.state.localName(entry.fullName);
    this.state.map(entry, name);
    this.state.theorem(entry, name, { closedGoal: binders.length === 0, discharge: 'source-kernel', check: 'bounded' });
    this.theoremChecks.push({ ref: this.state.ref(entry.fullName), binders, source: entry.fullName });
    return `${name}(${binders.map((binder) => binder.name).join(', ')}) {\n  return ${this.prop(prop)};\n}`;
  }

  theoremRunner() {
    this.state.encode('theorem-properties', 'each theorem is an executable property; --ml-check-theorems evaluates it on every input of a bounded domain, and its proof remains checked by the source kernel');
    const checks = this.theoremChecks.map(({ ref, binders, source }) => {
      const domains = binders.map((binder) => this.domain(binder.type, 3));
      const call = binders.length
        ? `ml_product([${domains.join(', ')}]).every((args) => ${ref}(...args))`
        : `${ref}()`;
      return `  if (!(${call})) throw new Error('theorem ${source} fails on a bounded input');\n  console.log('theorem ${source}: holds on the bounded domain');`;
    });
    return `function ml_checkTheorems() {\n${checks.join('\n')}\n}`;
  }

  /** Values of a type up to a constructor depth, as JavaScript source. */
  domain(type, depth) {
    this.helpers.add('domains');
    switch (type.kind) {
      case 'nat':
        return depth >= 3 ? 'ml_nat' : 'ml_small_nat';
      case 'int':
        return depth >= 3 ? 'ml_int' : 'ml_small_int';
      case 'fixed':
        return type.signed ? 'ml_small_int' : 'ml_small_nat';
      case 'bool':
        return '[false, true]';
      case 'string':
        return "['', 'a', 'ab']";
      case 'unit':
        return '[null]';
      case 'data': {
        const entry = this.program.declarations.get(type.name);
        const values = entry.ctors.flatMap((ctor) => {
          const recursive = ctor.fields.some((field) => field.type.kind === 'data');
          if (recursive && depth <= 1) return [];
          const fields = ctor.fields.map((field) => this.domain(field.type, field.type.kind === 'data' ? depth - 1 : 1));
          const object = (args) => this.ctorObject(entry, ctor, args);
          if (!fields.length) return [`[${object([])}]`];
          return [`ml_product([${fields.join(', ')}]).map((args) => ${object(ctor.fields.map((_, index) => `args[${index}]`))})`];
        });
        return values.length ? `[${values.map((value) => `...${value}`).join(', ')}]` : '[]';
      }
      default:
        throw new Error(`no JavaScript domain for ${type.kind}`);
    }
  }

  ctorObject(entry, ctor, args) {
    const fields = ctor.fields.map((field, index) => `${fieldKey(field.name)}: ${args[index]}`);
    return `Object.freeze({ $: '${ctor.name.replace(/'/gu, "\\'")}'${fields.length ? `, ${fields.join(', ')}` : ''} })`;
  }

  prop(prop) {
    switch (prop.p) {
      case 'forall': {
        const body = this.prop(prop.body);
        return prop.binders.reduceRight(
          (inner, binder) => `ml_forall(${this.domain(binder.type, 3)}, (${binder.name}) => ${inner})`,
          body,
        );
      }
      case 'and':
        return `(${this.prop(prop.left)} && ${this.prop(prop.right)})`;
      case 'or':
        return `(${this.prop(prop.left)} || ${this.prop(prop.right)})`;
      case 'implies':
        return `(!${this.prop(prop.left)} || ${this.prop(prop.right)})`;
      case 'not':
        return `!${this.prop(prop.arg)}`;
      case 'bool':
        return this.expr(prop.expr);
      case 'eq':
      case 'ne': {
        const [left, right] = [this.expr(prop.left), this.expr(prop.right)];
        const structured = prop.left.type.kind === 'data' || prop.left.type.kind === 'unit';
        if (structured) this.helpers.add('equal');
        const same = prop.sameValue ? `Object.is(${left}, ${right})` : `(${left} === ${right})`;
        const equal = structured ? `ml_equal(${left}, ${right})` : same;
        return prop.p === 'eq' ? equal : `!${equal}`;
      }
      default: {
        const operator = { lt: '<', le: '<=', gt: '>', ge: '>=' }[prop.p];
        return `(${this.expr(prop.left)} ${operator} ${this.expr(prop.right)})`;
      }
    }
  }

  /** A function body as statements that return its value. */
  statements(e) {
    switch (e.k) {
      case 'let':
        return [`const ${e.name} = ${this.expr(e.value)};`, ...this.statements(e.body)];
      case 'print':
        return [`console.log(${this.expr(e.text)});`, ...this.statements(e.body)];
      case 'if':
        return [
          `if (${this.expr(e.cond)}) {`,
          indent(this.statements(e.then).join('\n'), 1),
          '} else {',
          indent(this.statements(e.else).join('\n'), 1),
          '}',
        ];
      case 'match':
        return this.matchStatements(e);
      case 'abort':
        this.helpers.add('abort');
        return [`return ml_abort(${JSON.stringify(e.message)});`];
      case 'recur': {
        const args = e.args.map((arg) => this.expr(arg));
        const names = this.loopParams;
        if (names.length === 1) return [`${names[0]} = ${args[0]};`, 'continue;'];
        return [...(names.length ? [`[${names.join(', ')}] = [${args.join(', ')}];`] : []), 'continue;'];
      }
      default:
        return [`return ${this.expr(e)};`];
    }
  }

  matchStatements(e) {
    const lines = [];
    let subject;
    if (e.scrutinee.k === 'var') subject = e.scrutinee.name;
    else {
      this.temporaries += 1;
      subject = `ml_subject${this.temporaries}`;
      lines.push(`const ${subject} = ${this.expr(e.scrutinee)};`);
    }
    const fallback = e.cases.find((kase) => kase.pattern.k === 'wild' || kase.pattern.k === 'bind');
    const fallbackBody = (kase) => [
      ...(kase.pattern.k === 'bind' ? [`const ${kase.pattern.name} = ${subject};`] : []),
      ...this.statements(kase.body),
    ];
    if (e.scrutinee.type.kind !== 'data') {
      const zero = e.cases.find((kase) => kase.pattern.k === 'natZero');
      const succ = e.cases.find((kase) => kase.pattern.k === 'natSucc');
      const zeroLines = zero ? this.statements(zero.body) : fallbackBody(fallback);
      const succLines = succ
        ? [`const ${succ.pattern.name} = ${subject} - 1n;`, ...this.statements(succ.body)]
        : fallbackBody(fallback);
      return [...lines, `if (${subject} === 0n) {`, indent(zeroLines.join('\n'), 1), '} else {', indent(succLines.join('\n'), 1), '}'];
    }
    const entry = this.program.declarations.get(e.scrutinee.type.name);
    lines.push(`switch (${subject}.$) {`);
    for (const kase of e.cases) {
      if (kase.pattern.k !== 'ctor') continue;
      const ctor = entry.ctors.find((candidate) => candidate.name === kase.pattern.ctor);
      const binds = kase.pattern.binds
        .map((bind, index) => (bind ? `const ${bind} = ${subject}.${fieldKey(ctor.fields[index].name)};` : null))
        .filter(Boolean);
      lines.push(`  case '${ctor.name.replace(/'/gu, "\\'")}': {`);
      lines.push(indent([...binds, ...this.statements(kase.body)].join('\n'), 2));
      lines.push('  }');
    }
    lines.push('  default: {');
    if (fallback) lines.push(indent(fallbackBody(fallback).join('\n'), 2));
    else lines.push(`    throw new TypeError(\`unexpected constructor \${${subject}.$}\`);`);
    lines.push('  }');
    lines.push('}');
    return lines;
  }

  expr(e) {
    if (e.type?.kind === 'float') this.usesFloat = true;
    switch (e.k) {
      case 'lit':
        return this.literal(e);
      case 'unit':
        return 'null';
      case 'var':
        return e.name;
      case 'call':
        return `${this.state.ref(e.fn)}(${e.args.map((arg) => this.expr(arg)).join(', ')})`;
      case 'ctor': {
        const entry = this.program.declarations.get(e.data);
        const ctor = entry.ctors.find((candidate) => candidate.name === e.ctor);
        return this.ctorObject(entry, ctor, e.args.map((arg) => this.expr(arg)));
      }
      case 'unary':
        if (e.op === 'not') return `!${this.expr(e.arg)}`;
        return this.checked(negate(this.expr(e.arg)), e.type, 'neg');
      case 'binary':
        return this.binary(e);
      case 'if':
        return `(${this.expr(e.cond)} ? ${this.expr(e.then)} : ${this.expr(e.else)})`;
      case 'print':
        return `(console.log(${this.expr(e.text)}), ${this.expr(e.body)})`;
      case 'let':
      case 'match':
        return `(() => {\n${indent(this.statements(e).join('\n'), 1)}\n})()`;
      case 'toString':
        if (e.console && e.arg.type.kind === 'float') {
          this.helpers.add('showNumber');
          return `ml_showNumber(${this.expr(e.arg)})`;
        }
        return e.arg.type.kind === 'string' ? this.expr(e.arg) : this.toText(e.arg);
      case 'stringMap': {
        const string = e.string.k === 'var' || e.string.k === 'lit' ? this.expr(e.string) : `(${this.expr(e.string)})`;
        return renderStringMapExpression('JavaScript', e.op, string);
      }
      case 'stringTest': {
        const string = e.string.k === 'var' || e.string.k === 'lit' ? this.expr(e.string) : `(${this.expr(e.string)})`;
        return renderStringTestExpression('JavaScript', e.op, string, this.expr(e.search));
      }
      case 'cast':
        return this.cast(e);
      case 'abort':
        this.helpers.add('abort');
        return `ml_abort(${JSON.stringify(e.message)})`;
      case 'array':
        this.arrays();
        return `[${e.items.map((item) => this.expr(item)).join(', ')}]`;
      case 'append':
        return `[...${this.expr(e.left)}, ...${this.expr(e.right)}]`;
      case 'index':
        this.arrays();
        this.helpers.add('at');
        this.state.arrayRead();
        return `ml_at(${this.expr(e.array)}, ${this.expr(e.index)})`;
      case 'length':
        return e.type.kind === 'float' ? `${this.expr(e.array)}.length` : `BigInt(${this.expr(e.array)}.length)`;
      case 'math': {
        const args = e.args.map((arg) => this.expr(arg));
        if (e.op === 'maxOf' || e.op === 'minOf') return `Math.${e.op.slice(0, 3)}(...${args[0]})`;
        return `${e.type.kind === 'bool' ? 'Number' : 'Math'}.${e.op}(${args.join(', ')})`;
      }
      default:
        throw new Error(`no JavaScript expression for ${e.k}`);
    }
  }

  arrays() {
    this.state.encode('arrays', 'a JavaScript array stays an array, which the portable core never mutates; a read outside it throws RangeError where JavaScript reads undefined');
  }

  literal(e) {
    switch (e.type.kind) {
      case 'nat':
      case 'int':
      case 'fixed':
        return e.value.startsWith('-') ? `(${e.value}n)` : `${e.value}n`;
      case 'float':
        return e.value.startsWith('-') ? `(${e.value})` : e.value;
      case 'bool':
        return String(e.value);
      case 'string':
        return JSON.stringify(String(e.value));
      default:
        throw new Error(`no JavaScript literal for ${e.type.kind}`);
    }
  }

  toText(arg) {
    if (arg.type.kind === 'data' || arg.type.kind === 'unit') {
      throw unsupported('output of structured values', `a ${arg.type.kind} value has no portable textual form`, arg.span);
    }
    return `String(${this.expr(arg)})`;
  }

  /** A machine-integer result out of range panics as Rust does. */
  checked(text, type, op) {
    if (type.kind !== 'fixed') return text;
    this.helpers.add('fixed');
    const { min, max } = fixedBounds(type);
    return `ml_fixed(${text}, ${min}n, ${max}n, ${JSON.stringify(overflowMessage(op))})`;
  }

  binary(e) {
    const left = this.expr(e.left);
    const right = this.expr(e.right);
    switch (e.op) {
      case 'and':
        return `(${left} && ${right})`;
      case 'or':
        return `(${left} || ${right})`;
      case 'concat':
        return `(${left} + ${right})`;
      case 'eq':
        return `(${left} === ${right})`;
      case 'ne':
        return `(${left} !== ${right})`;
      case 'lt':
        return `(${left} < ${right})`;
      case 'le':
        return `(${left} <= ${right})`;
      case 'gt':
        return `(${left} > ${right})`;
      case 'ge':
        return `(${left} >= ${right})`;
      case 'add':
        return this.checked(`(${left} + ${right})`, e.type, 'add');
      case 'mul':
        return this.checked(`(${left} * ${right})`, e.type, 'mul');
      case 'sub':
        if (e.semantics === 'truncated') {
          this.helpers.add('natSub');
          return `ml_natSub(${left}, ${right})`;
        }
        return this.checked(`(${left} - ${right})`, e.type, 'sub');
      case 'div':
      case 'rem': {
        if (e.semantics === 'ieee') return `(${left} ${e.op === 'div' ? '/' : '%'} ${right})`;
        this.helpers.add('divide');
        const zero = e.byZero === 'abort' ? JSON.stringify(zeroDivisorMessage(e.op, e.type)) : 'null';
        if (e.type.kind !== 'fixed') return `ml_divide(${left}, ${right}, '${e.rounding}', ${zero}, ${e.op === 'rem'})`;
        const { min, max } = fixedBounds(e.type);
        return `ml_divide(${left}, ${right}, '${e.rounding}', ${zero}, ${e.op === 'rem'}, [${min}n, ${max}n, ${JSON.stringify(overflowMessage(e.op))}])`;
      }
      default:
        throw new Error(`no JavaScript operator ${e.op}`);
    }
  }

  cast(e) {
    const arg = this.expr(e.arg);
    if (e.flavor === 'exact') return arg;
    if (e.flavor === 'clamp') return `((value) => (value < 0n ? 0n : value))(${arg})`;
    this.helpers.add('toNatChecked');
    return `ml_toNatChecked(${arg}, ${JSON.stringify(castMessage(e))})`;
  }

  main(main) {
    const { effects } = renameMain(main, ident, this.state.localReserved());
    const lines = [];
    let assertion = 0;
    for (const effect of effects) {
      if (effect.k === 'print') lines.push(`console.log(${this.expr(effect.expr)});`);
      else if (effect.k === 'let') lines.push(`const ${effect.name} = ${this.expr(effect.value)};`);
      else {
        assertion += 1;
        this.helpers.add('assert');
        lines.push(`ml_assert(${this.prop(effect.prop)}, ${JSON.stringify(`assertion ${assertion}`)});`);
        this.state.assertionTheorem(`assertion ${assertion}`, effect);
      }
    }
    if (main.sequentialAsync) this.state.encode('sequential-async', 'an async function is the function its body computes and await is its call: every call of one is awaited where it is made, so nothing runs concurrently and the output is the same, in the same order');
    this.state.encode('program-output', 'main prints the lines the source program prints, in order, with console.log');
    return `function main() {\n${indent(lines.join('\n'), 1)}\n}`;
  }
}

/** `-x`, parenthesised so that `-(-x)` does not read as a decrement. */
function negate(text) {
  return text.startsWith('-') ? `-(${text})` : `-${text}`;
}

function fieldKey(name) {
  return ident(name);
}

function indent(text, depth) {
  const pad = '  '.repeat(depth);
  return text.split('\n').map((line) => (line ? `${pad}${line}` : line)).join('\n');
}

