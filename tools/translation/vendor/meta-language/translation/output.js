// Output and aborts as values, for the targets whose programs are pure. Rust
// and JavaScript print where the source prints and abort where it aborts; in
// Lean and Rocq a function that prints or may abort, directly or through a
// function it calls, takes the lines printed before it and returns them, with
// the lines it prints added in front, paired with its value, or, when it
// aborts, with the source's abort message instead of a value; main prints the
// lines each of its steps adds and stops with the message of the first abort.
// The rewriting is target-independent: it yields a portable-core program
// without `print` and `abort` nodes, machine-integer arithmetic or checked
// conversions, whose pairs are generated data types.

import { castMessage, overflowMessage, zeroDivisorMessage } from './aborts.js';
import { unsupported } from './diagnostics.js';
import { BOOL, INT, NAT, OUTPUT, STRING, data, fixedBounds, typeKey } from './types.js';

const SKIP = new Set(['type', 'domain', 'from', 'to', 'span']);

/** The unbounded type a machine integer is represented by in Lean and Rocq. */
function representation(type) {
  return type.kind === 'fixed' ? (type.signed ? INT : NAT) : type;
}

function integerLiteral(node) {
  if (node.k !== 'lit' || !/^-?\d+$/u.test(String(node.value))) return null;
  return BigInt(node.value);
}

/** True when the node itself, apart from its operands, may abort. */
export function aborts(node) {
  switch (node.k) {
    case 'abort':
      return true;
    case 'cast': {
      if (node.flavor !== 'checked') return false;
      const value = integerLiteral(node.arg);
      return value === null || value < 0n;
    }
    case 'unary': {
      if (node.semantics !== 'checked') return false;
      const value = integerLiteral(node.arg);
      return value === null || value === fixedBounds(node.type).min;
    }
    case 'binary': {
      const division = node.op === 'div' || node.op === 'rem';
      if (!division) return node.semantics === 'checked';
      if (node.byZero !== 'abort') return false;
      // A literal divisor aborts only when it is zero, or -1 of a signed machine integer (MIN / -1 overflows).
      const divisor = integerLiteral(node.right);
      if (divisor === null || divisor === 0n) return true;
      return node.type.kind === 'fixed' && node.type.signed && divisor === -1n;
    }
    default:
      return false;
  }
}

/**
 * A machine-integer operation or a checked conversion that cannot abort,
 * computed on its representation. The result keeps its source type, whose
 * Lean and Rocq representation is the same.
 */
function total(node) {
  if (node.k === 'cast') return { ...node, flavor: 'clamp' };
  if (node.k === 'unary') return { ...node, type: representation(node.type), semantics: 'exact' };
  const type = representation(node.type);
  const division = node.op === 'div' || node.op === 'rem';
  let semantics = 'exact';
  if (node.op === 'sub' && type.kind === 'nat') semantics = 'truncated';
  return { ...node, type, domain: type, semantics, ...(division ? { byZero: 'total' } : {}) };
}

/** True when the node is an operation `total` rewrites. */
function partial(node) {
  if (node.k === 'cast') return node.flavor === 'checked';
  if (node.k === 'unary') return node.semantics === 'checked';
  if (node.k === 'binary') return node.semantics === 'checked' || node.byZero === 'abort';
  return false;
}

/** Every operation that may abort but cannot here, as a total one; nodes that do not change are kept. */
function settle(node) {
  if (!node || typeof node !== 'object') return node;
  if (Array.isArray(node)) {
    const items = node.map(settle);
    return items.some((item, index) => item !== node[index]) ? items : node;
  }
  let copy = node;
  for (const [key, value] of Object.entries(node)) {
    if (SKIP.has(key) || !value || typeof value !== 'object') continue;
    const settled = settle(value);
    if (settled !== value) {
      if (copy === node) copy = { ...node };
      copy[key] = settled;
    }
  }
  return node.k && partial(copy) && !aborts(copy) ? total(copy) : copy;
}

/** The checked program with its output and aborts threaded through, or the program itself when nothing below main prints or aborts. */
export function threadOutput(source) {
  const program = settleProgram(source);
  const functions = [...program.declarations.values()].filter((entry) => entry.k === 'fn');
  const effectful = new Set();
  const effects = (node) => {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some(effects);
    if (node.k === 'print' || (node.k === 'call' && effectful.has(node.fn)) || aborts(node)) return true;
    return Object.entries(node).some(([key, value]) => !SKIP.has(key) && effects(value));
  };
  for (let grew = true; grew;) {
    grew = false;
    for (const entry of functions) {
      if (!effectful.has(entry.fullName) && effects(entry.body)) {
        effectful.add(entry.fullName);
        grew = true;
      }
    }
  }
  // A step of main is a `print` effect itself; what threads is a value that prints or may abort.
  const operand = (effect) => (effect.k === 'let' ? effect.value : effect.k === 'assert' ? effect.prop : effect.expr);
  if (!effectful.size && !(program.main?.effects ?? []).some((effect) => effects(operand(effect)))) return program;
  const aborting = (node) => {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some(aborting);
    if (aborts(node)) return true;
    return Object.entries(node).some(([key, value]) => !SKIP.has(key) && aborting(value));
  };
  const canAbort = [...program.declarations.values()].some((entry) => aborting(entry.k === 'fn' ? entry.body : entry.k === 'theorem' ? entry.prop : null))
    || (program.main?.effects ?? []).some((effect) => aborting(operand(effect)));
  return new Threader(program, effectful, effects, canAbort).program();
}

function settleProgram(program) {
  const declarations = new Map();
  let changed = false;
  for (const [name, entry] of program.declarations) {
    let next = entry;
    if (entry.k === 'fn') {
      const body = settle(entry.body);
      if (body !== entry.body) next = { ...entry, body };
    } else if (entry.k === 'theorem') {
      const prop = settle(entry.prop);
      if (prop !== entry.prop) next = { ...entry, prop };
    }
    changed ||= next !== entry;
    declarations.set(name, next);
  }
  const effects = program.main && settle(program.main.effects);
  if (effects && effects !== program.main.effects) return { ...program, declarations, main: { ...program.main, effects } };
  return changed ? { ...program, declarations } : program;
}

function variable(name, type) {
  return { k: 'var', name, type };
}

function literal(type, value) {
  return { k: 'lit', type, value: String(value) };
}

function compare(op, left, right) {
  const domain = representation(left.type);
  return { k: 'binary', op, left, right, type: BOOL, domain };
}

class Threader {
  constructor(source, effectful, effects, canAbort) {
    this.source = source;
    this.effectful = effectful;
    this.effects = effects;
    this.canAbort = canAbort;
    this.pairs = new Map();
    this.byName = new Map();
    this.count = 0;
  }

  program() {
    const declarations = new Map();
    for (const [name, entry] of this.source.declarations) {
      if (entry.k === 'fn' && this.effectful.has(name)) {
        const out = 'ml_out';
        declarations.set(name, {
          ...entry,
          params: [...entry.params, { name: out, type: OUTPUT, guard: null }],
          ret: this.pairType(entry.ret),
          body: this.io(entry.body, variable(out, OUTPUT)),
        });
      } else if (entry.k === 'theorem' && this.effects(entry.prop)) {
        declarations.set(name, { ...entry, prop: this.pureProp(entry.prop) });
      } else declarations.set(name, entry);
    }
    const main = this.source.main && { ...this.source.main, effects: this.source.main.effects.flatMap((effect) => this.effect(effect)) };
    // The pairs come first; a pair of a data type follows it in the emitted order.
    return {
      ...this.source,
      declarations: new Map([...[...this.pairs.values()].map((entry) => [entry.fullName, entry]), ...declarations]),
      main,
      outputThreaded: true,
      abortsThreaded: this.canAbort,
    };
  }

  fresh(prefix) {
    this.count += 1;
    return `ml_${prefix}${this.count}`;
  }

  /**
   * The generated data type pairing the lines printed so far with a value of
   * `type`, or, when the program may abort, with the message it aborted with.
   * A machine integer pairs as its representation, which its value is.
   */
  pair(source) {
    const type = representation(source);
    const key = typeKey(type);
    if (!this.pairs.has(key)) {
      const name = `ml_io${this.pairs.size + 1}`;
      const ctors = [{ name: `${name}_mk`, fields: [{ name: 'output', type: OUTPUT }, { name: 'value', type }] }];
      if (this.canAbort) ctors.push({ name: `${name}_abort`, fields: [{ name: 'output', type: OUTPUT }, { name: 'message', type: STRING }] });
      const entry = { k: 'data', name, fullName: name, modulePath: [], ctors, generated: true, output: true };
      this.pairs.set(key, entry);
      this.byName.set(name, entry);
    }
    return this.pairs.get(key);
  }

  pairType(type) {
    return data(this.pair(type).fullName);
  }

  /** The value paired with the lines `out`; `type` is the value's source type when its node computes on the representation. */
  make(out, value, type = value.type) {
    const entry = this.pair(type);
    return { k: 'ctor', data: entry.fullName, ctor: entry.ctors[0].name, args: [out, value], type: data(entry.fullName) };
  }

  /** The abort with `message` after the lines `out`, as a pair of a `type` value. */
  fail(out, message, type) {
    const entry = this.pair(type);
    return { k: 'ctor', data: entry.fullName, ctor: entry.ctors[1].name, args: [out, message], type: data(entry.fullName) };
  }

  /**
   * `match pair with mk o v => body(o, v) | abort o m => failure(o, m)`; an
   * abort passes on as the abort of the pair `body` builds unless `failure`
   * says otherwise.
   */
  open(pair, type, body, failure = undefined) {
    const entry = this.pair(type);
    const out = this.fresh('o');
    const value = this.fresh('v');
    const inner = body(variable(out, OUTPUT), variable(value, type));
    const cases = [{ pattern: { k: 'ctor', data: entry.fullName, ctor: entry.ctors[0].name, binds: [out, value] }, body: inner }];
    if (this.canAbort) {
      const lines = this.fresh('o');
      const message = this.fresh('m');
      const handled = failure
        ? failure(variable(lines, OUTPUT), variable(message, STRING))
        : this.reraise(variable(lines, OUTPUT), variable(message, STRING), inner.type);
      cases.push({ pattern: { k: 'ctor', data: entry.fullName, ctor: entry.ctors[1].name, binds: [lines, message] }, body: handled });
    }
    return { k: 'match', scrutinee: pair, cases, type: inner.type };
  }

  reraise(out, message, pairType) {
    const entry = pairType.kind === 'data' && this.byName.get(pairType.name);
    if (!entry) throw new Error('an abort passes on only as a pair');
    return { k: 'ctor', data: entry.fullName, ctor: entry.ctors[1].name, args: [out, message], type: pairType };
  }

  /** `e` run after the lines `out`, a variable: its value paired with the lines printed by then, or its abort. */
  io(e, out) {
    if (!this.effects(e)) return this.make(out, e);
    const type = this.pairType(e.type);
    switch (e.k) {
      case 'print':
        return this.bind(e.text, out, (before, text) => {
          const after = this.fresh('o');
          return {
            k: 'let',
            name: after,
            value: { k: 'outCons', head: text, tail: before, type: OUTPUT },
            body: this.io(e.body, variable(after, OUTPUT)),
            type,
          };
        });
      case 'abort':
        return this.fail(out, literal(STRING, e.message), e.type);
      case 'call':
        return this.bindAll(e.args, out, (after, args) => (this.effectful.has(e.fn)
          ? { ...e, args: [...args, after], type }
          : this.make(after, { ...e, args })));
      case 'if':
        return this.bind(e.cond, out, (after, cond) => ({ ...e, cond, then: this.io(e.then, after), else: this.io(e.else, after), type }));
      case 'let':
        return this.bind(e.value, out, (after, value) => ({ ...e, value, body: this.io(e.body, after), type }));
      case 'match':
        return this.bind(e.scrutinee, out, (after, scrutinee) => ({
          ...e,
          scrutinee,
          cases: e.cases.map((kase) => ({ ...kase, body: this.io(kase.body, after) })),
          type,
        }));
      case 'binary':
        // The right operand of `&&` and `||` runs only when the left one does not decide.
        if (e.op === 'and' || e.op === 'or') {
          const decided = { k: 'lit', type: BOOL, value: e.op === 'or' };
          const test = e.op === 'and'
            ? { k: 'if', cond: e.left, then: e.right, else: decided, type: BOOL }
            : { k: 'if', cond: e.left, then: decided, else: e.right, type: BOOL };
          return this.io(test, out);
        }
        break;
      default:
    }
    // Every other node runs its operands in order, then computes from their values.
    const keys = Object.keys(e).filter((key) => !SKIP.has(key) && (Array.isArray(e[key]) || (e[key] && typeof e[key] === 'object' && e[key].k)));
    const operands = keys.flatMap((key) => (Array.isArray(e[key]) ? e[key] : [e[key]]));
    return this.bindAll(operands, out, (after, values) => {
      const copy = { ...e };
      let at = 0;
      for (const key of keys) {
        if (Array.isArray(e[key])) {
          copy[key] = values.slice(at, at + e[key].length);
          at += e[key].length;
        } else {
          copy[key] = values[at];
          at += 1;
        }
      }
      return this.complete(after, copy);
    });
  }

  /**
   * A node whose operands are values, after the lines `out`: when it may
   * abort, the test of the source's abort condition, its abort message, and
   * otherwise its value computed on the representation, where it cannot abort.
   */
  complete(out, e) {
    if (!aborts(e)) return this.make(out, e);
    const operands = [];
    const name = (value) => {
      if (value.k === 'var' || value.k === 'lit') return value;
      const bound = this.fresh('a');
      operands.push({ name: bound, value });
      return variable(bound, value.type);
    };
    const failing = (message) => this.fail(out, literal(STRING, message), e.type);
    const guard = (cond, message, rest) => ({ k: 'if', cond, then: failing(message), else: rest, type: rest.type });
    let result;
    if (e.k === 'cast') {
      const arg = name(e.arg);
      result = guard(compare('lt', arg, literal(representation(arg.type), 0)), castMessage(e), this.make(out, total({ ...e, arg }), e.type));
    } else if (e.k === 'unary') {
      const arg = name(e.arg);
      const { min } = fixedBounds(e.type);
      result = guard(compare('eq', arg, literal(INT, min)), overflowMessage('neg'), this.make(out, total({ ...e, arg }), e.type));
    } else {
      const left = name(e.left);
      const right = name(e.right);
      const node = total({ ...e, left, right });
      const rep = representation(e.type);
      if (e.op === 'div' || e.op === 'rem') {
        let rest = this.make(out, node, e.type);
        if (e.type.kind === 'fixed' && e.type.signed) {
          const overflow = {
            k: 'binary',
            op: 'and',
            left: compare('eq', left, literal(rep, fixedBounds(e.type).min)),
            right: compare('eq', right, literal(rep, -1)),
            type: BOOL,
          };
          rest = guard(overflow, overflowMessage(e.op), rest);
        }
        result = guard(compare('eq', right, literal(rep, 0)), zeroDivisorMessage(e.op, e.type), rest);
      } else if (e.op === 'sub' && rep.kind === 'nat') {
        result = guard(compare('lt', left, right), overflowMessage('sub'), this.make(out, node, e.type));
      } else {
        // The exact result, range-checked before it is the machine integer's value.
        const wide = this.fresh('w');
        const { min, max } = fixedBounds(e.type);
        const value = variable(wide, rep);
        const outside = rep.kind === 'nat'
          ? compare('gt', value, literal(rep, max))
          : { k: 'binary', op: 'or', left: compare('lt', value, literal(rep, min)), right: compare('gt', value, literal(rep, max)), type: BOOL };
        result = {
          k: 'let',
          name: wide,
          value: node,
          body: guard(outside, overflowMessage(e.op), this.make(out, value, e.type)),
          type: this.pairType(e.type),
        };
      }
    }
    return operands.reduceRight((body, { name: bound, value }) => ({ k: 'let', name: bound, value, body, type: body.type }), result);
  }

  /** `k` of the lines after `e` and the value of `e`; a value that neither prints nor aborts is used as it is. */
  bind(e, out, k) {
    if (!this.effects(e)) return k(out, e);
    return this.open(this.io(e, out), e.type, k);
  }

  bindAll(list, out, k, done = []) {
    if (done.length === list.length) return k(out, done);
    return this.bind(list[done.length], out, (after, value) => this.bindAll(list, after, k, [...done, value]));
  }

  /** The value of `e` alone, for a theorem, which states facts of values. */
  value(e, where) {
    if (this.canAbort) throw unsupported('a theorem over a computation that may abort', 'a theorem states a fact of a value, which an abort does not have', where);
    const pair = this.io(e, { k: 'outNil', type: OUTPUT });
    return this.open(pair, e.type, (_, value) => value);
  }

  pureProp(prop) {
    const map = (node) => (this.effects(node) ? this.value(node, prop.span) : node);
    switch (prop.p) {
      case 'forall':
        return { ...prop, body: this.pureProp(prop.body) };
      case 'and':
      case 'or':
      case 'implies':
        return { ...prop, left: this.pureProp(prop.left), right: this.pureProp(prop.right) };
      case 'not':
        return { ...prop, arg: this.pureProp(prop.arg) };
      case 'bool':
        return { ...prop, expr: map(prop.expr) };
      default:
        return { ...prop, left: map(prop.left), right: map(prop.right) };
    }
  }

  /**
   * A main step whose value prints or may abort: the pair of its value and
   * the lines it prints, a step printing those lines, a step that stops main
   * with the message of an abort, and the step itself on the value.
   */
  effect(effect) {
    if (effect.k === 'let' && this.effects(effect.value)) {
      const [steps, value] = this.run(effect.value);
      return [...steps, { ...effect, value }];
    }
    if (effect.k === 'print' && this.effects(effect.expr)) {
      const [steps, expr] = this.run(effect.expr);
      return [...steps, { ...effect, expr }];
    }
    if (effect.k === 'assert' && this.effects(effect.prop)) {
      const steps = [];
      const prop = this.hoist(effect.prop, steps, effect.span);
      return [...steps, { ...effect, prop }];
    }
    return [effect];
  }

  run(e) {
    const name = this.fresh('run');
    const pair = variable(name, this.pairType(e.type));
    const steps = [
      { k: 'let', name, value: this.io(e, { k: 'outNil', type: OUTPUT }), span: e.span },
      { k: 'output', expr: this.open(pair, e.type, (out) => out, (out) => out), span: e.span },
    ];
    if (!this.canAbort) return [steps, this.open(pair, e.type, (_, value) => value)];
    // `unwrap` binds the value of a pair, or stops main with its abort message.
    const value = this.fresh('val');
    const entry = this.pair(e.type);
    steps.push({ k: 'unwrap', name: value, pair, data: entry.fullName, ctors: entry.ctors.map((ctor) => ctor.name), type: e.type, span: e.span });
    return [steps, variable(value, e.type)];
  }

  /** An assertion's operands that print or may abort run before it, in order, as steps of main. */
  hoist(prop, steps, where) {
    const lift = (node) => {
      if (!this.effects(node)) return node;
      const [run, value] = this.run(node);
      steps.push(...run);
      return value;
    };
    switch (prop.p) {
      case 'bool':
        return { ...prop, expr: lift(prop.expr) };
      case 'not':
        return { ...prop, arg: this.hoist(prop.arg, steps, where) };
      case 'and':
      case 'or':
        // The left operand always runs, first; the right one only when the left does not decide the assertion.
        if (!this.effects(prop.right)) return { ...prop, left: this.hoist(prop.left, steps, where) };
        throw unsupported(
          'output or an abort in a compound assertion',
          'an operand that prints or aborts after the first runs only when the assertion evaluates it; assert on a value computed before',
          where,
        );
      case 'implies':
      case 'forall':
        throw unsupported('output or an abort in a compound assertion', 'an operand that prints or aborts runs only when the assertion evaluates it; assert on a value computed before', where);
      default:
        return { ...prop, left: lift(prop.left), right: lift(prop.right) };
    }
  }
}
