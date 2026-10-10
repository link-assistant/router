// Types of JavaScript functions written without JSDoc. A parameter or result
// without a declared type gets a type variable; the bodies, the calls and the
// top-level statements constrain the variables by unification, and each
// variable takes the one type every use agrees on. A BigInt literal is a
// `bigint` of any integer type, `+` of a string is concatenation, and a type
// nothing constrains is a Number. Two uses that need different types are a
// type error: the function would need a declared type for each use.

import { typeError } from './diagnostics.js';
import { acceptArgumentCount } from './frontend-rules.js';
import { BOOL, FLOAT, INT, STRING, UNIT } from './types.js';

const ROOT = 'crate';
const LOGICAL = new Set(['and', 'or']);
const ORDER = new Set(['eq', 'ne', 'lt', 'le', 'gt', 'ge']);
const ARITHMETIC = new Set(['add', 'sub', 'mul', 'div', 'rem']);

/** Fills in the missing parameter and result types of the functions of a parsed JavaScript program. */
export function inferJavaScriptTypes(program) {
  const functions = [];
  collectFunctions(program.items, [ROOT], functions);
  const untyped = program.items.some((item) => item.k === 'data' && item.ctors.some((ctor) => ctor.fields.some((field) => !field.type)));
  if (!untyped && functions.every(({ fn }) => fn.ret && fn.params.every((param) => param.type))) return program;
  const inference = new Inference(program.items);
  inference.run(functions, program.main, program.externals ?? []);
  return program;
}

function collectFunctions(items, path, into) {
  for (const item of items) {
    if (item.k === 'fn') into.push({ path: [...path, item.name], fn: item });
    else if (item.k === 'module') collectFunctions(item.items, [...path, item.name], into);
  }
}

class Inference {
  constructor(items) {
    // Constructors of every data type, by tag.
    this.data = new Map();
    for (const item of items) {
      if (item.k === 'data') this.data.set(item.name, item.ctors);
    }
    this.bindings = [];
    this.bigints = new Set();
    this.plus = [];
    this.fields = [];
    this.signatures = new Map();
    // The types of the fields the translator makes up, which are inferred like parameters.
    this.fieldTerms = new Map();
    // Array literals with no element of their own, whose element type the rest of the program fixes.
    this.emptyArrays = new Map();
  }

  fresh(bigint = false) {
    const id = this.bindings.length;
    this.bindings.push(null);
    if (bigint) this.bigints.add(id);
    return { kind: 'var', id };
  }

  resolve(term) {
    let current = term;
    while (current.kind === 'var' && this.bindings[current.id]) current = this.bindings[current.id];
    return current;
  }

  /** The type of a constructor field as a term, one per field even when it is not declared. */
  field(field) {
    if (field.type) return this.declared(field.type);
    if (!this.fieldTerms.has(field)) this.fieldTerms.set(field, this.fresh());
    return this.fieldTerms.get(field);
  }

  /** A declared surface type as a term; the frontend writes `bigint` as `int`. */
  declared(type) {
    if (!type) return this.fresh();
    if (type.kind === 'named') return { kind: 'data', name: type.path.at(-1) };
    if (type.kind === 'nat') return INT;
    if (type.kind === 'array') return { kind: 'array', element: this.declared(type.element) };
    return type;
  }

  unify(left, right, where) {
    const a = this.resolve(left);
    const b = this.resolve(right);
    if (a === b) return;
    // Only a function that finishes without a return value makes undefined, the unit value.
    const other = a.kind === 'unit' ? b : b.kind === 'unit' ? a : null;
    if (other && other.kind !== 'unit' && (other.kind !== 'var' || this.bigints.has(other.id))) {
      throw typeError(`the function returns ${other.kind === 'var' ? 'a bigint' : describe(other)} on one path and finishes without a return value, returning undefined, on another; return a value on every path`, where);
    }
    if (a.kind === 'var' && b.kind === 'var') {
      if (a.id === b.id) return;
      if (this.bigints.has(a.id)) this.bigints.add(b.id);
      this.bindings[a.id] = b;
      return;
    }
    if (a.kind === 'var' || b.kind === 'var') {
      const [variable, type] = a.kind === 'var' ? [a, b] : [b, a];
      if (this.bigints.has(variable.id) && !isInteger(type)) {
        throw typeError(`a BigInt is used as ${describe(type)}; JavaScript does not mix BigInt with other types`, where);
      }
      this.bindings[variable.id] = type;
      return;
    }
    if (isInteger(a) && isInteger(b)) return;
    if (a.kind === 'array' && b.kind === 'array') {
      this.unify(a.element, b.element, where);
      return;
    }
    if (a.kind !== b.kind || (a.kind === 'data' && a.name !== b.name) || (a.kind === 'fixed' && (a.bits !== b.bits || a.signed !== b.signed))) {
      throw typeError(`one value is used as ${describe(a)} and as ${describe(b)}; declare the types of the function with JSDoc`, where);
    }
  }

  run(functions, main, externals) {
    // The other items of the module keep the types their own translation checked.
    for (const external of externals) {
      this.signatures.set(`${ROOT}.${external.name}`, external.k === 'fn'
        ? { params: external.params.map((param) => this.declared(param.type)), defaults: external.params.map(() => false), ret: this.declared(external.ret) }
        : { params: [], defaults: [], ret: this.declared(external.type) });
    }
    for (const { path, fn } of functions) {
      this.signatures.set(path.join('.'), {
        params: fn.params.map((param) => this.declared(param.type)),
        defaults: fn.params.map((param) => Boolean(param.default)),
        ret: this.declared(fn.ret),
      });
    }
    for (const { path, fn } of functions) {
      const signature = this.signatures.get(path.join('.'));
      this.context = path.slice(0, -1);
      fn.params.forEach((param, index) => {
        if (param.default) this.unify(this.expr(param.default, new Map()), signature.params[index], param.span);
      });
    }
    for (const { path, fn } of functions) {
      const signature = this.signatures.get(path.join('.'));
      const env = new Map(fn.params.map((param, index) => [param.name, signature.params[index]]));
      this.context = path.slice(0, -1);
      this.unify(this.expr(fn.body, env), signature.ret, fn.span);
    }
    this.context = [ROOT];
    const env = new Map();
    for (const effect of main?.effects ?? []) {
      if (effect.k === 'print') this.expr(effect.expr, env);
      else if (effect.k === 'let') env.set(effect.name, this.expr(effect.value, env));
      else if (effect.k === 'assert') this.prop(effect.prop, env);
    }
    this.solve();
    for (const { path, fn } of functions) {
      const signature = this.signatures.get(path.join('.'));
      fn.params.forEach((param, index) => {
        if (!param.type) param.type = this.surface(signature.params[index], fn.span);
      });
      if (!fn.ret) fn.ret = this.surface(signature.ret, fn.span);
    }
    for (const [field, term] of this.fieldTerms) field.type = this.surface(term, field.span);
    for (const [node, term] of this.emptyArrays) node.element = this.surface(term, node.span);
  }

  /** Deferred `+` and field constraints, until nothing more is known; then `+` of unknowns adds numbers. */
  solve() {
    for (let progress = true; progress;) {
      progress = false;
      for (const constraint of [...this.plus]) {
        if (this.plusStep(constraint, false)) {
          this.plus.splice(this.plus.indexOf(constraint), 1);
          progress = true;
        }
      }
      for (const constraint of [...this.fields]) {
        if (this.fieldStep(constraint)) {
          this.fields.splice(this.fields.indexOf(constraint), 1);
          progress = true;
        }
      }
      // `.length` of a value nothing else fixes reads an array.
      const length = this.fields.find(({ object, field }) => field === 'length' && this.resolve(object).kind === 'var');
      if (!progress && length) {
        this.unify(length.object, { kind: 'array', element: this.fresh() }, length.where);
        progress = true;
      }
      if (!progress && this.plus.length) {
        this.plusStep(this.plus.shift(), true);
        progress = true;
      }
    }
  }

  plusStep({ left, right, result, where }, force) {
    const a = this.resolve(left);
    const b = this.resolve(right);
    if (a.kind === 'string' || b.kind === 'string') {
      this.unify(result, STRING, where);
      return true;
    }
    if (!force && (a.kind === 'var' || b.kind === 'var')) return false;
    this.unify(left, right, where);
    this.unify(result, left, where);
    return true;
  }

  fieldStep({ object, field, result, where }) {
    const type = this.resolve(object);
    if ((type.kind === 'array' || type.kind === 'string') && field === 'length') {
      this.unify(result, FLOAT, where);
      return true;
    }
    if (type.kind !== 'data') {
      const owners = [...this.data].filter(([, ctors]) => ctors.some((ctor) => ctor.fields.some((candidate) => candidate.name === field)));
      if (type.kind !== 'var' || owners.length !== 1) return false;
      this.unify(object, { kind: 'data', name: owners[0][0] }, where);
      return this.fieldStep({ object, field, result, where });
    }
    const declared = (this.data.get(type.name) ?? []).flatMap((ctor) => ctor.fields).find((candidate) => candidate.name === field);
    if (declared) this.unify(result, this.field(declared), where);
    return true;
  }

  /** The inferred type as a surface type; an unconstrained BigInt is `bigint`, anything else unconstrained a Number. */
  surface(term, where) {
    const type = this.resolve(term);
    if (type.kind === 'var') return this.bigints.has(type.id) ? INT : FLOAT;
    if (type.kind === 'data') return { kind: 'named', path: [ROOT, type.name], span: where };
    if (type.kind === 'array') return { kind: 'array', element: this.surface(type.element, where) };
    return type;
  }

  signature(path) {
    const name = path.join('.');
    if (this.signatures.has(name)) return this.signatures.get(name);
    // A call inside a namespace may name a sibling relative to it.
    for (let depth = this.context.length; depth >= 1; depth -= 1) {
      const candidate = [...this.context.slice(0, depth), ...path.slice(1)].join('.');
      if (this.signatures.has(candidate)) return this.signatures.get(candidate);
    }
    return null;
  }

  expr(node, env) {
    switch (node.k) {
      case 'num':
        // The 1 of `x++` has the type of `x`, a Number or a BigInt.
        if (node.unit) return this.fresh();
        return node.type ? this.declared(node.type) : this.fresh(true);
      case 'bool':
        return BOOL;
      case 'str':
        return STRING;
      case 'unit':
        return UNIT;
      case 'name': {
        if (node.path.length === 1 && env.has(node.path[0])) return env.get(node.path[0]);
        return this.call(node.path, [], env, node.span);
      }
      case 'app':
        return this.call(node.fn.path, node.args, env, node.span);
      case 'field': {
        const result = this.fresh();
        this.fields.push({ object: this.expr(node.object, env), field: node.field, result, where: node.span });
        return result;
      }
      case 'typeOf':
        this.expr(node.arg, env);
        return STRING;
      case 'unary': {
        const arg = this.expr(node.arg, env);
        if (node.op === 'not') {
          this.unify(arg, BOOL, node.span);
          return BOOL;
        }
        return arg;
      }
      case 'binary':
        return this.binary(node, env);
      case 'if': {
        this.unify(this.expr(node.cond, env), BOOL, node.cond.span ?? node.span);
        const then = this.expr(node.then, env);
        this.unify(this.expr(node.else, env), then, node.span);
        return then;
      }
      case 'let': {
        const value = this.expr(node.value, env);
        return this.expr(node.body, new Map(env).set(node.name, value));
      }
      case 'match':
        return this.match(node, env);
      case 'stringMap':
        this.unify(this.expr(node.object, env), STRING, node.span);
        return STRING;
      case 'stringTest':
        this.unify(this.expr(node.object, env), STRING, node.span);
        this.unify(this.expr(node.search, env), STRING, node.span);
        return BOOL;
      case 'toString':
      case 'show':
        this.expr(node.arg, env);
        return STRING;
      case 'abort':
        return this.fresh();
      case 'print':
        this.expr(node.expr, env);
        return this.expr(node.body, env);
      case 'ctorObject':
        return this.ctorObject(node, env);
      case 'array': {
        const element = this.fresh();
        if (node.items.every((item) => item.spread)) this.emptyArrays.set(node, element);
        for (const item of node.items) {
          const value = this.expr(item.value, env);
          this.unify(value, item.spread ? { kind: 'array', element } : element, item.value.span ?? node.span);
        }
        return { kind: 'array', element };
      }
      case 'math':
        // Math takes Numbers: an argument of no known type is one, and the checker refuses any other.
        for (const item of node.args) {
          const type = this.resolve(this.expr(item.value, env));
          const unknown = item.spread ? type.kind === 'var' || (type.kind === 'array' && this.resolve(type.element).kind === 'var') : type.kind === 'var';
          if (unknown) this.unify(type, item.spread ? { kind: 'array', element: FLOAT } : FLOAT, item.value.span ?? node.span);
        }
        return ['isInteger', 'isSafeInteger', 'isFinite', 'isNaN'].includes(node.op) ? BOOL : FLOAT;
      case 'index': {
        const element = this.fresh();
        this.unify(this.expr(node.object, env), { kind: 'array', element }, node.object.span ?? node.span);
        this.expr(node.index, env);
        return element;
      }
      case 'length':
        this.unify(this.expr(node.object, env), { kind: 'array', element: this.fresh() }, node.span);
        return node.integer ? this.fresh(true) : FLOAT;
      default:
        return this.fresh();
    }
  }

  call(path, args, env, where) {
    const argTypes = args.map((arg) => this.expr(arg, env));
    const signature = this.signature(path);
    if (!signature || !acceptArgumentCount(signature.defaults, args.length)) return this.fresh();
    argTypes.forEach((type, index) => this.unify(type, signature.params[index], args[index].span ?? where));
    return signature.ret;
  }

  binary(node, env) {
    const left = this.expr(node.left, env);
    const right = this.expr(node.right, env);
    if (LOGICAL.has(node.op)) {
      this.unify(left, BOOL, node.left.span ?? node.span);
      this.unify(right, BOOL, node.right.span ?? node.span);
      return BOOL;
    }
    if (ORDER.has(node.op)) {
      this.unify(left, right, node.span);
      return BOOL;
    }
    if (ARITHMETIC.has(node.op)) {
      this.unify(left, right, node.span);
      return left;
    }
    if (node.op === 'concat') return STRING;
    const result = this.fresh();
    this.plus.push({ left, right, result, where: node.span });
    return result;
  }

  match(node, env) {
    const scrutinees = node.scrutinees.map((scrutinee) => this.expr(scrutinee, env));
    let result = null;
    for (const row of node.rows) {
      const scope = new Map(env);
      row.patterns.forEach((pattern, index) => this.pattern(pattern, scrutinees[index], scope, row.span ?? node.span));
      const body = this.expr(row.body, scope);
      if (result) this.unify(body, result, row.span ?? node.span);
      else result = body;
    }
    return result ?? this.fresh();
  }

  pattern(pattern, type, scope, where) {
    switch (pattern.k) {
      case 'ctor': {
        const [name, tag] = pattern.path.slice(-2);
        this.unify(type, { kind: 'data', name }, where);
        const ctor = (this.data.get(name) ?? []).find((candidate) => candidate.name === tag);
        pattern.args.forEach((arg, index) => {
          const field = ctor?.fields[index];
          this.pattern(arg, field ? this.field(field) : this.fresh(), scope, where);
        });
        return;
      }
      case 'bind':
      case 'bindOrCtor':
        scope.set(pattern.name, type);
        return;
      case 'numLit':
        this.unify(type, this.fresh(true), where);
        return;
      case 'boolLit':
        this.unify(type, BOOL, where);
        return;
      case 'strLit':
        this.unify(type, STRING, where);
        return;
      default:
    }
  }

  ctorObject(node, env) {
    const owners = [...this.data].filter(([, ctors]) => ctors.some((ctor) => ctor.name === node.tag));
    const fieldTypes = Object.entries(node.fields).map(([name, value]) => [name, this.expr(value, env), value.span]);
    if (owners.length !== 1) return this.fresh();
    const [name, ctors] = owners[0];
    const ctor = ctors.find((candidate) => candidate.name === node.tag);
    for (const [field, type, where] of fieldTypes) {
      const declared = ctor.fields.find((candidate) => candidate.name === field);
      if (declared) this.unify(type, this.field(declared), where ?? node.span);
    }
    return { kind: 'data', name };
  }

  prop(prop, env) {
    switch (prop.p) {
      case 'eq':
      case 'ne':
      case 'lt':
      case 'le':
      case 'gt':
      case 'ge':
        this.unify(this.expr(prop.left, env), this.expr(prop.right, env), prop.span);
        return;
      case 'and':
      case 'or':
        this.prop(prop.left, env);
        this.prop(prop.right, env);
        return;
      case 'not':
        this.prop(prop.arg, env);
        return;
      case 'bool':
        this.unify(this.expr(prop.expr, env), BOOL, prop.span);
        return;
      default:
    }
  }
}

function isInteger(type) {
  return type.kind === 'int' || type.kind === 'nat' || type.kind === 'fixed';
}

function describe(type) {
  switch (type.kind) {
    case 'float':
      return 'a number';
    case 'int':
    case 'nat':
    case 'fixed':
      return 'a bigint';
    case 'bool':
      return 'a boolean';
    case 'string':
      return 'a string';
    case 'data':
      return `a ${type.name}`;
    case 'array':
      return 'an array';
    default:
      return type.kind;
  }
}
