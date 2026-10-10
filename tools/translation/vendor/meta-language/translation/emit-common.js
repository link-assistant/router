// State shared by the emitters: target names for every declaration, the
// source-to-target mapping, and the encodings and assumptions a translation
// relies on. Every emitter records what it did here, so the translation
// contract lists exactly the choices that were made for this program.

import { unsupported } from './diagnostics.js';
import { typeKey } from './types.js';

/** Assumption texts are fixed so that contracts compare across runtimes. */
export const ASSUMPTIONS = {
  inBoundsReads: {
    id: 'in-bounds-array-reads',
    statement: 'the translation agrees with the source on executions whose array reads are in bounds; JavaScript reads undefined at an index outside an array, where the target aborts',
  },
};

export class EmitState {
  /**
   * @param {object} program checked portable-core program
   * @param {string} language target language
   * @param {(name: string) => string} ident legal target identifier for a source name
   * @param {Set<string>} reserved names no declaration may take
   * @param {object} options `{ ctorStyle: 'module' | 'data', typeName, valueName, ctorName, moduleSegment, generated, typeSpace, modulesShareTermSpace, modulesShareTypeSpace, rootReserved }`
   */
  constructor(program, language, ident, reserved, options = {}) {
    this.program = program;
    this.language = language;
    this.ident = ident;
    this.reserved = reserved;
    this.options = options;
    this.names = new Map();
    this.ctorNames = new Map();
    this.moduleNames = new Map();
    this.taken = new Map();
    this.claimed = new Set();
    this.mappings = [];
    this.assumptions = new Map();
    this.encodings = new Map();
    this.theorems = [];
    this.assign();
  }

  /** Target names are fixed up front, so references never depend on emission order. */
  assign() {
    const namespace = (key) => {
      // Root declarations may not redeclare the target's prelude (`rootReserved`).
      if (!this.taken.has(key)) {
        const root = key.endsWith(':') ? this.options.rootReserved ?? [] : [];
        this.taken.set(key, new Set([...this.reserved, ...root]));
      }
      return this.taken.get(key);
    };
    const claim = (space, name) => {
      const used = namespace(space);
      let candidate = name;
      for (let index = 2; used.has(candidate) || this.isGenerated(candidate, used); index += 1) candidate = `${name}_${index}`;
      for (const name of [candidate, ...this.generatedFor(candidate)]) {
        used.add(name);
        this.claimed.add(name);
      }
      return candidate;
    };
    const moduleName = this.options.moduleSegment ?? this.ident;
    // JavaScript modules are values; Rust modules share the type namespace.
    let moduleSpace = 'module';
    if (this.options.modulesShareTermSpace) moduleSpace = 'term';
    else if (this.options.modulesShareTypeSpace) moduleSpace = 'type';
    for (const entry of this.program.declarations.values()) {
      const segments = entry.modulePath.map((segment, index) => {
        const key = entry.modulePath.slice(0, index + 1).join('.');
        if (!this.moduleNames.has(key)) {
          const parent = entry.modulePath.slice(0, index).join('.');
          this.moduleNames.set(key, claim(`${moduleSpace}:${parent}`, moduleName(segment)));
        }
        return this.moduleNames.get(key);
      });
      const space = `term:${entry.modulePath.join('.')}`;
      const base = entry.k === 'data'
        ? (this.options.typeName ?? this.ident)(entry.name)
        : (this.options.valueName ?? this.ident)(entry.name);
      const local = claim(entry.k === 'data' && this.options.typeSpace ? `type:${entry.modulePath.join('.')}` : space, base);
      this.names.set(entry.fullName, { local, path: segments });
      if (entry.k === 'data') {
        for (const ctor of entry.ctors) {
          const ctorBase = (this.options.ctorName ?? this.ident)(ctor.name);
          const ctorSpace = this.options.ctorStyle === 'module' ? space : `ctor:${entry.fullName}`;
          this.ctorNames.set(`${entry.fullName}#${ctor.name}`, claim(ctorSpace, ctorBase));
        }
      }
    }
  }

  /**
   * Names a local binder may not take: a local named like a module, a
   * top-level function or a constructor would shadow it in the target.
   */
  localReserved() {
    return new Set([...this.reserved, ...this.claimed]);
  }

  isGenerated(candidate, used) {
    return this.generatedFor(candidate).some((name) => used.has(name));
  }

  /** Names the target itself derives from a declaration (Rocq's `f_equation`, `T_ind`). */
  generatedFor(name) {
    return (this.options.generated ?? (() => []))(name);
  }

  localName(fullName) {
    return this.names.get(fullName).local;
  }

  modulePath(fullName) {
    return this.names.get(fullName).path;
  }

  moduleName(sourcePath) {
    return this.moduleNames.get(sourcePath.join('.'));
  }

  /** Fully qualified reference from the top level. */
  ref(fullName, separator = '.') {
    const { local, path } = this.names.get(fullName);
    return [...path, local].join(separator);
  }

  ctorLocal(dataName, ctor) {
    return this.ctorNames.get(`${dataName}#${ctor}`);
  }

  ctorRef(dataName, ctor, separator = '.') {
    const local = this.ctorLocal(dataName, ctor);
    if (this.options.ctorStyle === 'module') return [...this.modulePath(dataName), local].join(separator);
    return `${this.ref(dataName, separator)}${separator}${local}`;
  }

  map(entry, target) {
    // A generated ml_io pair (output.js) has no source declaration to map.
    if (entry.output) return;
    this.mappings.push({
      kind: entry.k === 'fn' ? 'function' : entry.k,
      source: entry.fullName,
      target: [...this.modulePath(entry.fullName), target].join('.'),
      sourceSpan: entry.span ? { start: entry.span.start, end: entry.span.end } : null,
    });
    if (entry.k === 'data') {
      for (const ctor of entry.ctors) {
        this.mappings.push({
          kind: 'constructor',
          source: `${entry.fullName}.${ctor.name}`,
          target: this.ctorRef(entry.fullName, ctor.name),
          sourceSpan: entry.span ? { start: entry.span.start, end: entry.span.end } : null,
        });
      }
    }
  }

  assume(assumption, detail) {
    if (!this.assumptions.has(assumption.id)) this.assumptions.set(assumption.id, { ...assumption, details: [] });
    const record = this.assumptions.get(assumption.id);
    if (detail && !record.details.includes(detail)) record.details.push(detail);
  }

  /** A machine integer of a pure target: its unbounded representation, with Rust's aborts threaded as values (output.js). */
  machineInteger(type, representation) {
    const key = typeKey(type);
    this.encode(`machine-integer:${key}`, `${key} values are ${representation} values; every ${key} operation tests where Rust panics, overflow or a zero divisor, and aborts there with Rust's panic message, and otherwise computes the in-range result exactly`);
  }

  /** An array read: in bounds it is the element, outside it JavaScript's undefined, which the targets do not model. */
  arrayRead() {
    this.assume(ASSUMPTIONS.inBoundsReads);
  }

  encode(id, statement) {
    if (!this.encodings.has(id)) this.encodings.set(id, { id, statement });
  }

  theorem(entry, name, details = {}) {
    this.theorems.push({ source: entry.fullName, target: [...this.modulePath(entry.fullName), name].join('.'), kind: 'theorem', ...details });
  }

  assertionTheorem(name, effect, details = {}) {
    this.theorems.push({
      source: `main:assert@${effect.span ? effect.span.start : '?'}`,
      target: name,
      kind: 'assertion',
      closedGoal: true,
      ...details,
    });
  }

  assumptionList() {
    return [...this.assumptions.values()];
  }

  encodingList() {
    return [...this.encodings.values()];
  }
}

/** An operation that may abort, which output.js threads as a value before a pure target sees it. */
export function unthreaded(what) {
  return new Error(`${what} reaches a pure target's emitter without its abort threaded`);
}

/** Declarations every declaration refers to (types, functions, constructors, lemmas). */
export function dependencies(entry) {
  const found = new Set();
  const types = (type) => {
    if (type?.kind === 'data') found.add(type.name);
    if (type?.kind === 'array') types(type.element);
  };
  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(visit);
      return;
    }
    if (node.kind === 'data') found.add(node.name);
    if (node.k === 'call') found.add(node.fn);
    if (node.k === 'ctor') found.add(node.data);
    for (const value of Object.values(node)) visit(value);
  };
  if (entry.k === 'data') entry.ctors.forEach((ctor) => ctor.fields.forEach((field) => types(field.type)));
  if (entry.k === 'fn') {
    entry.params.forEach((param) => types(param.type));
    types(entry.ret);
    visit(entry.body);
  }
  if (entry.k === 'theorem') {
    entry.binders.forEach((binder) => types(binder.type));
    visit(entry.prop);
    const lemmas = (plan) => {
      if (plan.k === 'close') {
        plan.hints.lemmas.forEach((name) => found.add(name));
        plan.hints.unfold.forEach((name) => found.add(name));
      } else plan.cases.forEach((kase) => lemmas(kase.plan));
    };
    lemmas(entry.proof.plan);
  }
  found.delete(entry.fullName);
  return found;
}

/**
 * A test for whether a node computes with JavaScript Numbers: it has a
 * Number-typed part, or uses a declaration that does, directly or not.
 */
export function numberDependence(program) {
  const direct = (node) => {
    let found = false;
    const visit = (value) => {
      if (found || !value || typeof value !== 'object') return;
      if (Array.isArray(value)) value.forEach(visit);
      else if (value.kind === 'float') found = true;
      else Object.values(value).forEach(visit);
    };
    visit(node);
    return found;
  };
  return dependence(program, (entry) => entry.k !== 'theorem' && direct(entry), direct);
}

/**
 * True of an expression or proposition that calls, directly or not, a
 * recursive function with no decreasing argument: Lean defines those as
 * partial defs, whose equations the kernel cannot unfold.
 */
export function opaqueDependence(program) {
  return dependence(program, (entry) => entry.k === 'fn' && (Boolean(entry.mutual) || (entry.recursive && entry.decreasing === null)), () => false);
}

function dependence(program, marks, direct) {
  const entries = [...program.declarations.values()];
  const uses = new Map(entries.map((entry) => [entry.fullName, dependencies(entry)]));
  const marked = new Set(entries.filter(marks).map((entry) => entry.fullName));
  let grew = true;
  while (grew) {
    grew = false;
    for (const entry of entries) {
      if (!marked.has(entry.fullName) && [...uses.get(entry.fullName)].some((name) => marked.has(name))) {
        marked.add(entry.fullName);
        grew = true;
      }
    }
  }
  return (node) => direct(node) || [...dependencies({ k: 'fn', params: [], ret: null, body: node })].some((name) => marked.has(name));
}

/**
 * Each function the checker marked mutual, mapped to its group: the
 * functions it calls that call it back, directly or not, itself included,
 * in source order. A function on a cycle of calls is itself mutual, so the
 * cycles run through mutual functions only.
 */
export function mutualGroups(program) {
  const members = [...program.declarations.values()].filter((entry) => entry.k === 'fn' && entry.mutual);
  const calls = new Map(members.map((entry) => [entry.fullName, dependencies(entry)]));
  const reached = (from) => {
    const seen = new Set([from]);
    const stack = [from];
    while (stack.length) {
      for (const name of calls.get(stack.pop()) ?? []) {
        if (calls.has(name) && !seen.has(name)) {
          seen.add(name);
          stack.push(name);
        }
      }
    }
    return seen;
  };
  const reach = new Map(members.map((entry) => [entry.fullName, reached(entry.fullName)]));
  return new Map(members.map((entry) => [entry.fullName, members
    .filter((other) => reach.get(entry.fullName).has(other.fullName) && reach.get(other.fullName).has(entry.fullName))]));
}

/**
 * Declarations in an order where each follows everything it uses. Source
 * order is kept where possible and, among ready declarations, the ones in
 * the module being emitted come first so modules stay contiguous.
 */
export function orderDeclarations(program, { requireContiguousModules = false } = {}) {
  const entries = [...program.declarations.values()];
  const position = new Map(entries.map((entry, index) => [entry.fullName, index]));
  const pending = new Map(entries.map((entry) => [entry.fullName, dependencies(entry)]));
  // A group of mutually recursive functions is ready, and placed, as one.
  const groups = mutualGroups(program);
  const unit = (entry) => groups.get(entry.fullName) ?? [entry];
  const done = new Set();
  const order = [];
  let current = [];
  while (order.length < entries.length) {
    const ready = entries.filter((entry) => !done.has(entry.fullName)
      && unit(entry).every((member) => [...pending.get(member.fullName)]
        .every((name) => done.has(name) || !position.has(name) || groups.get(entry.fullName)?.some((other) => other.fullName === name))));
    if (!ready.length) {
      const stuck = entries.find((entry) => !done.has(entry.fullName));
      throw unsupported('cyclic declarations', `${stuck.fullName} depends on declarations that depend on it, which needs mutual definitions`, stuck.span);
    }
    const shared = (entry) => {
      let common = 0;
      while (common < current.length && common < entry.modulePath.length && current[common] === entry.modulePath[common]) common += 1;
      return common;
    };
    ready.sort((left, right) => (shared(right) - shared(left))
      || (position.get(left.fullName) - position.get(right.fullName)));
    const [next] = ready;
    for (const member of unit(next)) {
      if (member.modulePath.join('.') !== next.modulePath.join('.')) {
        throw unsupported('mutual recursion across modules', `${next.fullName} and ${member.fullName} are mutually recursive in different modules; the target defines them together in one module`, member.span);
      }
      order.push(member);
      done.add(member.fullName);
    }
    current = next.modulePath;
  }
  if (requireContiguousModules) {
    const closed = new Set();
    let open = [];
    for (const entry of order) {
      for (let depth = 0; depth < open.length; depth += 1) {
        if (entry.modulePath[depth] !== open[depth]) {
          for (let index = depth; index < open.length; index += 1) closed.add(open.slice(0, index + 1).join('.'));
          break;
        }
      }
      for (let depth = 1; depth <= entry.modulePath.length; depth += 1) {
        const key = entry.modulePath.slice(0, depth).join('.');
        if (closed.has(key)) {
          throw unsupported('interleaved modules', `module ${key} would have to be reopened after its declarations depend on later ones; the target cannot reopen a module`, entry.span);
        }
      }
      open = entry.modulePath;
    }
  }
  return order;
}

/**
 * `emitted` with its `preludes` (the helper definitions its text starts with)
 * and `definitions` (its translated top-level definitions, without header,
 * preludes and entry point), kept out of its serialised contract.
 */
export function withParts(emitted, preludes, definitions) {
  return Object.defineProperties(emitted, {
    preludes: { value: preludes },
    definitions: { value: definitions },
  });
}
