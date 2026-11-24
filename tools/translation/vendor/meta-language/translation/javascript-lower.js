// Imperative JavaScript function bodies to one expression. `let` variables,
// assignments, loops, `break` and `continue` have a faithful functional
// reading: an assignment `x = e` binds a new `x` for the statements after
// it; a statement after which control continues at several places (an `if`
// that assigns in both branches, a loop that breaks at two points) is joined
// by a data type whose alternatives carry the variables it assigns, so the
// statements after it are translated once; and a loop is a tail-recursive
// function of the variables it uses, lifted to the top level, whose result
// carries the variables it assigns back to the statements after it, or the
// value the loop returns from the function. Only the variables a later
// statement may read are carried. The variables of a block that shadow a
// variable in scope are renamed, so no later statement sees them.

import { TranslationError, unsupported } from './diagnostics.js';

const ROOT = 'crate';
const IMPERATIVE = new Set(['let', 'assign', 'while', 'doWhile', 'for', 'break', 'continue', 'print', 'expr']);

/** Whether statements use `let`, assignments, loops, `break`, `continue`, print or discard a value. */
export function imperative(statements) {
  return statements.some(function visit(statement) {
    if (IMPERATIVE.has(statement.s)) return true;
    if (statement.s === 'block') return statement.body.some(visit);
    if (statement.s === 'if') return statement.then.some(visit) || Boolean(statement.else?.some(visit));
    if (statement.s === 'switch') return statement.clauses.some((clause) => clause.body.some(visit));
    return false;
  });
}

/**
 * The names statements read or assign (`free`) and assign (`assigned`)
 * without declaring them first, so the ones they share with their context.
 */
export function statementUses(statements, declared = new Set()) {
  const uses = { free: new Set(), assigned: new Set() };
  useList(statements, new Set(declared), uses);
  return uses;
}

function useList(statements, scope, uses) {
  for (const statement of statements) useStatement(statement, scope, uses);
}

function useStatement(statement, scope, uses) {
  const read = (expr) => {
    const names = new Set();
    references(expr, names);
    for (const name of names) if (!scope.has(name)) uses.free.add(name);
  };
  switch (statement.s) {
    case 'const':
    case 'let':
      read(statement.value);
      scope.add(statement.name);
      return;
    case 'assign':
      read(statement.value);
      if (!scope.has(statement.name)) {
        uses.free.add(statement.name);
        uses.assigned.add(statement.name);
      }
      return;
    case 'return':
    case 'expr':
    case 'print':
      read(statement.expr);
      return;
    case 'block':
      useList(statement.body, statement.inline ? scope : new Set(scope), uses);
      return;
    case 'if':
      read(statement.cond);
      useList(statement.then, new Set(scope), uses);
      if (statement.else) useList(statement.else, new Set(scope), uses);
      return;
    case 'switch':
      read(statement.discriminant);
      for (const clause of statement.clauses) useList(clause.body, new Set(scope), uses);
      return;
    case 'while':
    case 'doWhile':
      read(statement.cond);
      useList(statement.body, new Set(scope), uses);
      return;
    case 'for': {
      const inner = new Set(scope);
      useList(statement.init, inner, uses);
      if (statement.cond) {
        const names = new Set();
        references(statement.cond, names);
        for (const name of names) if (!inner.has(name)) uses.free.add(name);
      }
      useList([...statement.update, { s: 'block', body: statement.body }], inner, uses);
      return;
    }
    default:
  }
}

/** Local variables an expression reads. */
function references(node, names) {
  if (!node || typeof node !== 'object') return;
  if (Array.isArray(node)) {
    for (const item of node) references(item, names);
    return;
  }
  if (node.k === 'name' && node.path.length === 1) names.add(node.path[0]);
  for (const [key, value] of Object.entries(node)) {
    if (key !== 'span' && key !== 'type' && key !== 'data') references(value, names);
  }
}

/** Statements of a block, with the declarations of `let a, b` inline and empty statements dropped. */
function flat(statements) {
  return statements.flatMap((statement) => (statement.s === 'block' && statement.inline ? statement.body : [statement]))
    .filter((statement) => statement.s !== 'empty');
}

/** The body of the function `name` of `params` from its statements. */
export function lowerImperative(parser, name, params, statements, where) {
  const lowering = new Lowering(parser, name);
  const ctx = {
    // A function that finishes without returning returns undefined, the unit value.
    fall: () => ({ k: 'unit', span: where }),
    ret: (value) => value,
    brk: () => internal('break outside a loop', where),
    cont: () => internal('continue outside a loop', where),
    ...dead(),
  };
  return lowering.seq(flat(statements), 0, ctx, params.map((param) => ({ source: param.name, ir: param.name })));
}

/**
 * Top-level statements that declare or assign variables, after main has
 * bound `variables`: main effects that bind the top-level variables the
 * statements declare or assign to their values after them. The statements
 * are one expression; when they leave several variables, its value is of a
 * generated data type that carries them all, and each is bound by a match.
 */
export function lowerTopLevel(parser, statements, variables, where) {
  const lowering = new Lowering(parser, 'main');
  const list = flat(statements);
  const declared = new Set(list.filter((statement) => statement.s === 'let').map((statement) => statement.name));
  const { assigned } = statementUses(list);
  const kept = union(declared, assigned);
  let carried = [];
  let data = null;
  const fall = (scope) => {
    carried = visible(scope).filter((entry) => kept.has(entry.source));
    if (carried.length === 1) return named(carried[0].ir, where);
    // Statements that leave no variable still run, for the aborts they may reach.
    if (!carried.length) return { k: 'bool', value: true, span: where };
    // An if or switch at the end falls off it in each branch, each with the same variables.
    data ??= lowering.generatedName('top');
    return { k: 'ctorObject', tag: `${data}_done`, fields: Object.fromEntries(carried.map((entry) => [entry.ir, named(entry.ir, where)])), span: where };
  };
  const ctx = {
    fall,
    ret: () => internal('return at the top level', where),
    brk: () => internal('break outside a loop', where),
    cont: () => internal('continue outside a loop', where),
    ...dead(),
    live: union(variables, kept),
  };
  const value = lowering.seq(list, 0, ctx, variables.map((name) => ({ source: name, ir: name })));
  if (carried.length === 1) return [{ k: 'let', name: carried[0].source, value, span: where }];
  if (!carried.length) return [{ k: 'let', name: lowering.generatedName('top'), value, span: where }];
  const ctor = `${data}_done`;
  parser.generated.push({ k: 'data', name: data, ctors: [{ name: ctor, fields: carried.map((entry) => ({ name: entry.ir, type: null })) }], span: where, generated: true });
  const whole = `${data}_value`;
  const project = (entry) => ({
    k: 'match',
    scrutinees: [named(whole, where)],
    rows: [{ patterns: [{ k: 'ctor', path: [ROOT, data, ctor], args: carried.map((other) => ({ k: 'bind', name: other.ir, span: where })), span: where }], body: named(entry.ir, where), span: where }],
    span: where,
  });
  return [
    { k: 'let', name: whole, value, span: where },
    ...carried.map((entry) => ({ k: 'let', name: entry.source, value: project(entry), span: where })),
  ];
}

/**
 * The source names a context's continuations may read: `live` after
 * falling off the end, `brkLive` after `break`, `contLive` after `continue`.
 */
function dead() {
  return { live: new Set(), brkLive: new Set(), contLive: new Set() };
}

function union(...sets) {
  return new Set(sets.flatMap((set) => [...set]));
}

function internal(message, where) {
  throw new TranslationError('syntax', message, where);
}

function named(name, where) {
  return { k: 'name', path: [name], span: where };
}

/** The variable a source name refers to in a scope: the latest entry for it. */
function lookup(scope, name) {
  return scope.findLast((entry) => entry.source === name);
}

/** The variables of a scope, each once, in the order they were declared. */
function visible(scope) {
  return scope.filter((entry, index) => scope.findLastIndex((other) => other.source === entry.source) === index);
}

class Lowering {
  constructor(parser, fn) {
    this.parser = parser;
    this.fn = fn;
    this.renames = 0;
  }

  /** A copy of a source expression that reads the variables it names in scope. */
  renamed(node, scope) {
    if (!node || typeof node !== 'object') return node;
    if (Array.isArray(node)) return node.map((item) => this.renamed(item, scope));
    if (node.k === 'name' && node.path.length === 1) return { ...node, path: [lookup(scope, node.path[0])?.ir ?? node.path[0]] };
    const copy = {};
    for (const [key, value] of Object.entries(node)) copy[key] = key === 'span' || key === 'type' || key === 'data' ? value : this.renamed(value, scope);
    return copy;
  }

  /** A declaration in scope; one that shadows a variable in scope gets a new name. */
  declare(scope, source) {
    const ir = lookup(scope, source) ? `ml_${source}_${++this.renames}` : source;
    return [...scope, { source, ir }];
  }

  /**
   * The statements from `index` on; `ctx` says what falling off their end,
   * `break`, `continue` and `return` do, and which variables are live there.
   */
  seq(list, index, ctx, scope) {
    if (index === list.length) return ctx.fall(scope);
    const statement = list[index];
    const last = index === list.length - 1;
    const exits = this.exits(statement);
    if (!last && exits.fall === 0) {
      throw unsupported('unreachable statement', 'statements after return, throw, break, continue or a complete if are never executed', list[index + 1].span);
    }
    const rest = () => this.seq(list, index + 1, ctx, scope);
    switch (statement.s) {
      case 'const':
      case 'let': {
        const value = this.renamed(statement.value, scope);
        const inner = this.declare(scope, statement.name);
        return { k: 'let', name: inner.at(-1).ir, value, body: this.seq(list, index + 1, ctx, inner), span: statement.span };
      }
      case 'assign':
        return { k: 'let', name: lookup(scope, statement.name).ir, value: this.renamed(statement.value, scope), body: rest(), span: statement.span };
      case 'return':
        return ctx.ret(this.renamed(statement.expr, scope));
      case 'throw':
        return { k: 'abort', message: statement.message, span: statement.span };
      case 'break':
        return ctx.brk();
      case 'continue':
        return ctx.cont();
      case 'print':
        return { k: 'print', expr: this.renamed(statement.expr, scope), style: statement.style, body: rest(), span: statement.span };
      case 'expr':
        // A statement that discards its value still runs it, for the lines it prints and the aborts it may reach.
        return { k: 'let', name: this.generatedName('ignored'), value: this.renamed(statement.expr, scope), body: rest(), span: statement.span };
      default:
    }
    const lowerWith = (inner) => this.compound(statement, inner, scope);
    if (last) return lowerWith(ctx);
    const live = union(statementUses(list.slice(index + 1)).free, ctx.live);
    if (exits.fall === 1) return lowerWith({ ...ctx, fall: rest, live });
    return this.join(statement, exits, lowerWith, { ...ctx, live }, scope, rest);
  }

  compound(statement, ctx, scope) {
    switch (statement.s) {
      case 'block':
        return this.seq(flat(statement.body), 0, { ...ctx, fall: () => ctx.fall(scope) }, scope);
      case 'if': {
        const cond = this.renamed(statement.cond, scope);
        const block = { ...ctx, fall: () => ctx.fall(scope) };
        const then = this.seq(flat(statement.then), 0, block, scope);
        const otherwise = statement.else ? this.seq(flat(statement.else), 0, block, scope) : ctx.fall(scope);
        const test = this.parser.tagCondition(cond);
        if (test) return this.parser.lowerTagIf(test, then, otherwise, statement.span);
        return { k: 'if', cond, then, else: otherwise, span: statement.span };
      }
      case 'switch':
        return this.lowerSwitch(statement, ctx, scope);
      case 'while':
      case 'doWhile':
        return this.lowerLoop(statement, ctx, scope, new Set());
      case 'for': {
        // The head's variables belong to the loop, not to the statements after it.
        const local = new Set(statement.init.filter((init) => init.s === 'let').map((init) => init.name));
        const live = union(statementUses([{ ...statement, init: [] }]).free, ctx.live);
        return this.seq(flat(statement.init), 0, { ...ctx, fall: (inner) => this.lowerLoop(statement, ctx, inner, local), live }, scope);
      }
      default:
        throw new TranslationError('syntax', `unknown statement ${statement.s}`, statement.span);
    }
  }

  /**
   * How many places control leaves a statement to: falling off its end,
   * `break`, `continue` and `return`.
   */
  exits(statement) {
    const none = { fall: 0, brk: 0, cont: 0, ret: 0 };
    switch (statement.s) {
      case 'return':
        return { ...none, ret: 1 };
      case 'throw':
        return none;
      case 'break':
        return { ...none, brk: 1 };
      case 'continue':
        return { ...none, cont: 1 };
      case 'block':
        return this.listExits(flat(statement.body));
      case 'if': {
        const then = this.listExits(flat(statement.then));
        const otherwise = statement.else ? this.listExits(flat(statement.else)) : { ...none, fall: 1 };
        return sum(then, otherwise);
      }
      case 'switch': {
        const bodies = this.caseBodies(statement);
        let total = { ...none, fall: this.exhaustive(statement) ? 0 : 1 };
        bodies.forEach((body, index) => {
          const exits = this.listExits(body);
          // `break` leaves the switch, as the last case does by falling off its end.
          total = sum(total, { ...exits, brk: 0, fall: exits.brk + (index === bodies.length - 1 ? exits.fall : 0) });
        });
        return total;
      }
      case 'while':
      case 'doWhile':
      case 'for': {
        const body = this.listExits(flat(statement.body));
        return { ...none, fall: infinite(statement) && body.brk === 0 ? 0 : 1, ret: body.ret > 0 ? 1 : 0 };
      }
      default:
        return { ...none, fall: 1 };
    }
  }

  listExits(list) {
    let total = { fall: 1, brk: 0, cont: 0, ret: 0 };
    for (const statement of list) {
      const exits = this.exits(statement);
      total = { ...sum(total, { ...exits, fall: 0 }), fall: exits.fall };
      if (exits.fall === 0) break;
    }
    return total;
  }

  /** The statements each case runs: its own, and the next case's when it falls through. */
  caseBodies(node) {
    const bodies = [];
    for (let index = node.clauses.length - 1; index >= 0; index -= 1) {
      const body = flat(node.clauses[index].body);
      const falls = index < node.clauses.length - 1 && this.listExits(body).fall > 0;
      bodies.unshift(falls ? [...body, ...bodies[0]] : body);
    }
    return bodies;
  }

  exhaustive(node) {
    if (node.clauses.some((clause) => clause.tests.some((test) => test.k === 'default'))) return true;
    if (!node.tagged) return false;
    const tags = new Set(node.clauses.flatMap((clause) => clause.tests.map((test) => test.tag)));
    return node.data.ctors.every((ctor) => tags.has(ctor.name));
  }

  /** A switch is a match whose rows run the cases; `break` in a case continues after the switch. */
  lowerSwitch(node, ctx, scope) {
    const discriminant = this.renamed(node.discriminant, scope);
    const renamed = { ...node, discriminant };
    const inner = { ...ctx, fall: () => ctx.fall(scope), brk: () => ctx.fall(scope), brkLive: ctx.live };
    const bodies = this.caseBodies(node);
    const rows = [];
    let defaults = [];
    node.clauses.forEach((clause, index) => {
      const lowered = this.seq(bodies[index], 0, inner, scope);
      clause.tests.forEach((test, number) => {
        const body = number === 0 ? lowered : structuredClone(lowered);
        if (test.k === 'default') {
          defaults = node.tagged ? this.parser.defaultRows(renamed, body, clause.span) : [{ patterns: [{ k: 'wild', span: test.span }], body, span: clause.span }];
        } else if (test.k === 'tag') {
          rows.push(this.parser.tagRow(renamed, test, body, clause.span));
        } else {
          rows.push({ patterns: [{ k: test.k, value: test.value, ...(test.negative && { negative: true }), span: test.span }], body, span: clause.span });
        }
      });
    });
    rows.push(...defaults);
    if (!this.exhaustive(node)) rows.push({ patterns: [{ k: 'wild', span: node.span }], body: ctx.fall(scope), span: node.span });
    const scrutinee = node.tagged ? discriminant.object : discriminant;
    return { k: 'match', scrutinees: [scrutinee], rows, span: node.span };
  }

  /**
   * A statement that continues at several places, followed by more
   * statements. When it only falls off its end and assigns one live
   * variable, it is that variable's new value; otherwise it is a value of a
   * data type whose alternatives carry the live variables it assigns to
   * where it continues.
   */
  join(statement, exits, lowerWith, ctx, scope, rest) {
    const where = statement.span;
    const { assigned } = statementUses([statement]);
    const live = union(ctx.live, exits.brk ? ctx.brkLive : [], exits.cont ? ctx.contLive : []);
    const carried = visible(scope).filter((entry) => assigned.has(entry.source) && live.has(entry.source));
    if (!exits.brk && !exits.cont && !exits.ret && carried.length === 1) {
      const [variable] = carried;
      const value = lowerWith({ ...ctx, fall: () => named(variable.ir, where) });
      return { k: 'let', name: variable.ir, value, body: rest(), span: where };
    }
    const data = this.generatedName('join');
    const ctors = [];
    const alternative = (kind, variables, body) => {
      const ctor = { name: `${data}_${kind}`, fields: variables.map((variable) => ({ name: variable, type: null })) };
      ctors.push(ctor);
      return {
        make: (values) => ({ k: 'ctorObject', tag: ctor.name, fields: Object.fromEntries(variables.map((variable, index) => [variable, values[index]])), span: where }),
        row: {
          patterns: [{ k: 'ctor', path: [ROOT, data, ctor.name], args: variables.map((variable) => ({ k: 'bind', name: variable, span: where })), span: where }],
          body,
          span: where,
        },
      };
    };
    const names = carried.map((entry) => entry.ir);
    const current = () => names.map((name) => named(name, where));
    const next = alternative('next', names, rest());
    const inner = { ...ctx, fall: () => next.make(current()) };
    const rows = [next.row];
    if (exits.ret) {
      const result = `ml_result${this.parser.generatedCount}`;
      const returned = alternative('return', [result], ctx.ret(named(result, where)));
      inner.ret = (value) => returned.make([value]);
      rows.push(returned.row);
    }
    if (exits.brk) {
      const broken = alternative('break', names, ctx.brk());
      inner.brk = () => broken.make(current());
      rows.push(broken.row);
    }
    if (exits.cont) {
      const continued = alternative('continue', names, ctx.cont());
      inner.cont = () => continued.make(current());
      rows.push(continued.row);
    }
    this.parser.generated.push({ k: 'data', name: data, ctors, span: where, generated: true });
    return { k: 'match', scrutinees: [lowerWith(inner)], rows, span: where };
  }

  generatedName(kind) {
    this.parser.generatedCount += 1;
    return `ml_${this.fn}_${kind}${this.parser.generatedCount}`;
  }

  /**
   * A loop is a tail-recursive function of the variables it uses. It
   * returns the live variables it assigns when it ends, or the function's
   * result when it returns; `local` are the variables of a for loop's head.
   */
  lowerLoop(loop, ctx, scope, local) {
    const where = loop.span;
    const whole = loop.s === 'for' ? { s: 'while', cond: loop.cond ?? { k: 'bool', value: true }, body: [...loop.body, ...loop.update] } : loop;
    const { free, assigned } = statementUses([whole]);
    const params = visible(scope).filter((entry) => free.has(entry.source));
    const results = params.filter((entry) => assigned.has(entry.source) && !local.has(entry.source) && ctx.live.has(entry.source));
    const body = this.listExits(flat(loop.body));
    const returns = body.ret > 0;
    const ends = !infinite(loop) || body.brk > 0;
    const name = this.generatedName('loop');
    const call = () => ({
      k: 'app',
      fn: { k: 'name', path: [ROOT, name], span: where },
      args: params.map((entry) => named(entry.ir, where)),
      span: where,
    });
    const loopScope = params.map((entry) => ({ ...entry }));
    let finish;
    let give;
    let callSite;
    if (!returns && ends && results.length === 1) {
      finish = () => named(results[0].ir, where);
      callSite = () => ({ k: 'let', name: results[0].ir, value: call(), body: ctx.fall(scope), span: where });
    } else if (!ends) {
      // The loop only ends by returning from the function, or never.
      finish = () => internal('a loop without an end ended', where);
      give = (value) => value;
      callSite = () => (returns ? ctx.ret(call()) : call());
    } else {
      const data = `${name}_result`;
      const ctors = [];
      const rows = [];
      const done = { name: `${name}_done`, fields: results.map((entry) => ({ name: entry.ir, type: null })) };
      ctors.push(done);
      finish = () => ({ k: 'ctorObject', tag: done.name, fields: Object.fromEntries(results.map((entry) => [entry.ir, named(entry.ir, where)])), span: where });
      rows.push({
        patterns: [{ k: 'ctor', path: [ROOT, data, done.name], args: results.map((entry) => ({ k: 'bind', name: entry.ir, span: where })), span: where }],
        body: ctx.fall(scope),
        span: where,
      });
      if (returns) {
        const value = `ml_result${this.parser.generatedCount}`;
        const returned = { name: `${name}_return`, fields: [{ name: value, type: null }] };
        ctors.push(returned);
        give = (result) => ({ k: 'ctorObject', tag: returned.name, fields: { [value]: result }, span: where });
        rows.push({
          patterns: [{ k: 'ctor', path: [ROOT, data, returned.name], args: [{ k: 'bind', name: value, span: where }], span: where }],
          body: ctx.ret(named(value, where)),
          span: where,
        });
      }
      this.parser.generated.push({ k: 'data', name: data, ctors, span: where, generated: true });
      callSite = () => ({ k: 'match', scrutinees: [call()], rows, span: where });
    }
    // Every variable the loop uses is live at its next iteration, the live ones it assigns after it.
    const iterating = new Set(params.map((entry) => entry.source));
    const lives = { live: iterating, brkLive: new Set(results.map((entry) => entry.source)), contLive: iterating };
    // The next iteration: a for loop's update, then the call with the variables' current values.
    const again = (inner) => (loop.s === 'for' && loop.update.length
      ? this.seq(loop.update, 0, { fall: call, ret: give, brk: finish, cont: finish, ...lives }, inner)
      : call());
    const test = (inner, then, otherwise) => (loop.cond && !infinite(loop)
      ? { k: 'if', cond: this.renamed(loop.cond, inner), then, else: otherwise(), span: where }
      : then);
    const lowered = new Lowering(this.parser, this.fn);
    lowered.renames = this.renames;
    let fnBody;
    if (loop.s === 'doWhile') {
      const next = () => test(loopScope, call(), finish);
      fnBody = lowered.seq(flat(loop.body), 0, { fall: next, cont: next, brk: finish, ret: give, ...lives }, loopScope);
    } else {
      const next = () => again(loopScope);
      fnBody = test(loopScope, lowered.seq(flat(loop.body), 0, { fall: next, cont: next, brk: finish, ret: give, ...lives }, loopScope), finish);
    }
    this.renames = lowered.renames;
    this.parser.generated.push({
      k: 'fn',
      name,
      params: params.map((entry) => ({ name: entry.ir, type: null, span: where })),
      ret: null,
      body: fnBody,
      span: where,
      generated: true,
    });
    return callSite();
  }
}

function sum(left, right) {
  return { fall: left.fall + right.fall, brk: left.brk + right.brk, cont: left.cont + right.cont, ret: left.ret + right.ret };
}

/** A loop whose condition is always true, which only `break` and `return` leave. */
function infinite(loop) {
  if (loop.s === 'for') return !loop.cond || (loop.cond.k === 'bool' && loop.cond.value);
  return loop.cond.k === 'bool' && loop.cond.value;
}
