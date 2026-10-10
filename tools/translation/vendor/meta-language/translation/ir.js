// Target-independent passes over the checked portable core: binder renaming
// (every target gets unique, legal local names, so shadowing rules and
// reserved words of the target never change which value a name denotes) and
// small traversal helpers shared by the emitters.

/** A per-declaration name supply: target-legal, unique, deterministic. */
export class Scope {
  constructor(ident, reserved = new Set()) {
    this.ident = ident;
    this.used = new Set(reserved);
  }

  fresh(name) {
    // A suffixed name is legal on its own: `end_2` needs none of the quoting of Lean's `«end»`.
    let candidate = this.ident(name);
    for (let index = 2; this.used.has(candidate); index += 1) candidate = this.ident(`${name}_${index}`);
    this.used.add(candidate);
    return candidate;
  }

  child() {
    const scope = new Scope(this.ident);
    scope.used = new Set(this.used);
    return scope;
  }
}

/** Renames every binder in an expression; `env` maps source names to target names. */
export function renameExpr(expr, env, scope) {
  if (!expr || typeof expr !== 'object') return expr;
  switch (expr.k) {
    case 'var': {
      const name = env.get(expr.name);
      if (!name) throw new Error(`unbound variable ${expr.name}`);
      return { ...expr, name };
    }
    case 'let': {
      const value = renameExpr(expr.value, env, scope);
      const name = scope.fresh(expr.name);
      return { ...expr, name, value, body: renameExpr(expr.body, new Map(env).set(expr.name, name), scope) };
    }
    case 'match':
      return {
        ...expr,
        scrutinee: renameExpr(expr.scrutinee, env, scope),
        cases: expr.cases.map((kase) => {
          const inner = new Map(env);
          const pattern = { ...kase.pattern };
          if (pattern.k === 'natSucc' || pattern.k === 'bind') {
            pattern.name = scope.fresh(pattern.name);
            inner.set(kase.pattern.name, pattern.name);
          } else if (pattern.k === 'ctor') {
            pattern.binds = pattern.binds.map((bind) => {
              if (!bind) return null;
              const name = scope.fresh(bind);
              inner.set(bind, name);
              return name;
            });
          }
          return { pattern, body: renameExpr(kase.body, inner, scope) };
        }),
      };
    default: {
      const copy = { ...expr };
      for (const [key, value] of Object.entries(expr)) {
        if (key === 'type' || key === 'domain' || key === 'from' || key === 'to') continue;
        if (Array.isArray(value)) copy[key] = value.map((item) => renameExpr(item, env, scope));
        else if (value && typeof value === 'object' && value.k) copy[key] = renameExpr(value, env, scope);
      }
      return copy;
    }
  }
}

export function renameProp(prop, env, scope) {
  switch (prop.p) {
    case 'forall': {
      const inner = new Map(env);
      const binders = prop.binders.map((binder) => {
        const name = scope.fresh(binder.name);
        inner.set(binder.name, name);
        return { ...binder, name };
      });
      return { ...prop, binders, body: renameProp(prop.body, inner, scope) };
    }
    case 'and':
    case 'or':
    case 'implies':
      return { ...prop, left: renameProp(prop.left, env, scope), right: renameProp(prop.right, env, scope) };
    case 'not':
      return { ...prop, arg: renameProp(prop.arg, env, scope) };
    case 'bool':
      return { ...prop, expr: renameExpr(prop.expr, env, scope) };
    default:
      return { ...prop, left: renameExpr(prop.left, env, scope), right: renameExpr(prop.right, env, scope) };
  }
}

export function renameFunction(entry, ident, reserved) {
  const scope = new Scope(ident, reserved);
  const env = new Map();
  const params = entry.params.map((param) => {
    const name = scope.fresh(param.name);
    env.set(param.name, name);
    return { ...param, name };
  });
  return { params, body: renameExpr(entry.body, env, scope) };
}

/**
 * The body of a loop the lowering lifted to a function, when every call it
 * makes to itself is in tail position, with those calls as `recur` nodes
 * that an emitter prints as the next iteration of a loop, so a loop of a
 * million iterations needs no million stack frames; null otherwise.
 */
export function tailLoop(entry, body) {
  if (!entry.generated || !entry.recursive) return null;
  const rewrite = (e) => {
    switch (e.k) {
      case 'call':
        return e.fn === entry.fullName ? { k: 'recur', args: e.args, type: e.type } : e;
      case 'if':
        return { ...e, then: rewrite(e.then), else: rewrite(e.else) };
      case 'let':
      case 'print':
        return { ...e, body: rewrite(e.body) };
      case 'match':
        return { ...e, cases: e.cases.map((kase) => ({ ...kase, body: rewrite(kase.body) })) };
      default:
        return e;
    }
  };
  const result = rewrite(body);
  const callsItself = (node) => {
    if (!node || typeof node !== 'object') return false;
    if (Array.isArray(node)) return node.some(callsItself);
    if (node.k === 'call' && node.fn === entry.fullName) return true;
    return Object.entries(node).some(([key, value]) => key !== 'type' && key !== 'span' && callsItself(value));
  };
  return callsItself(result) ? null : result;
}

export function renameTheorem(entry, ident, reserved) {
  const scope = new Scope(ident, reserved);
  const env = new Map();
  const binders = entry.binders.map((binder) => {
    const name = scope.fresh(binder.name);
    env.set(binder.name, name);
    return { ...binder, name };
  });
  const prop = renameProp(entry.prop, env, scope.child());
  const plan = renamePlan(entry.proof.plan, env, scope);
  return { binders, prop, plan };
}

function renamePlan(plan, env, scope) {
  if (plan.k === 'close') {
    return { ...plan, hints: { ...plan.hints, hyps: plan.hints.hyps.map((name) => env.get(name) ?? name) } };
  }
  return {
    ...plan,
    variable: env.get(plan.variable),
    cases: plan.cases.map((kase) => {
      const inner = new Map(env);
      const caseScope = scope.child();
      const fields = kase.fields.map((field) => {
        const name = caseScope.fresh(field);
        inner.set(field, name);
        return name;
      });
      const ihs = kase.ihs.map((ih) => {
        const name = caseScope.fresh(ih);
        inner.set(ih, name);
        return name;
      });
      return { ...kase, fields, ihs, plan: renamePlan(kase.plan, inner, caseScope) };
    }),
  };
}

export function renameMain(main, ident, reserved) {
  const scope = new Scope(ident, reserved);
  const env = new Map();
  const effects = main.effects.map((effect) => {
    if (effect.k === 'let') {
      const value = renameExpr(effect.value, env, scope);
      const name = scope.fresh(effect.name);
      env.set(effect.name, name);
      return { ...effect, name, value };
    }
    if (effect.k === 'unwrap') {
      const pair = renameExpr(effect.pair, env, scope);
      const name = scope.fresh(effect.name);
      env.set(effect.name, name);
      return { ...effect, name, pair };
    }
    if (effect.k === 'print' || effect.k === 'output') return { ...effect, expr: renameExpr(effect.expr, env, scope) };
    return { ...effect, prop: renameProp(effect.prop, env, scope) };
  });
  return { effects };
}

/** Items in declaration order with their module path. */
export function flatItems(items, into = []) {
  for (const item of items) {
    if (item.k === 'module') flatItems(item.items, into);
    else into.push(item);
  }
  return into;
}

/** True when any node of the given kind occurs in the tree. */
export function containsKind(node, kind) {
  let found = false;
  const visit = (value) => {
    if (found || !value || typeof value !== 'object') return;
    if (value.k === kind) {
      found = true;
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      if (key === 'type' || key === 'domain' || key === 'from' || key === 'to') continue;
      if (Array.isArray(child)) child.forEach(visit);
      else visit(child);
    }
  };
  visit(node);
  return found;
}
