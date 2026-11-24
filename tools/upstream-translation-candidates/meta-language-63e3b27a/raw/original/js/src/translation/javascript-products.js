// Project only closed immutable product flows. Types describe positions; the
// independent source facts below prove that every actual caller owns a product.
import { unsupported } from './diagnostics.js';
import { solveProductSourceFacts } from './product-source-rules.js';
import { sameType } from './types.js';

const scalar = type => ['bool', 'float', 'fixed', 'unit'].includes(type?.kind);
const copyTuple = type => type?.kind === 'tuple' && type.elements.length > 0
  && type.elements.every(element => scalar(element) || copyTuple(element));
// Ordinary reference-bearing tuples retain the existing array ABI. The mixed
// scalar Copy domain selects a product obligation, never an ownership proof.
const needsProductOrigin = type => type?.kind === 'tuple' && type.elements.length > 0
  && copyTuple(type)
  && type.elements.some(element => element.kind === 'tuple' || !sameType(element, type.elements[0]));

export function readJavaScriptProductIndex(node) {
  if (node.k === 'num') return Number(node.value) * (node.negative ? -1 : 1);
  if (node.k === 'unary' && node.op === 'neg' && node.arg.k === 'num') return -readJavaScriptProductIndex(node.arg);
  return NaN;
}

export function requiresJavaScriptProductProof(program) {
  const relevant = value => value && typeof value === 'object' && (value.productModel === 'immutable value product' || value.productBinding === true
    || value.k === 'fn' && (needsProductOrigin(value.ret) || value.params.some(param => needsProductOrigin(param.type)))
    || Object.entries(value).some(([key, child]) => key !== 'span' && key !== 'type' && (Array.isArray(child) ? child.some(relevant) : relevant(child))));
  return Boolean(relevant(program));
}

export function validateJavaScriptProducts(program, exportedNames = new Set()) {
  if (!requiresJavaScriptProductProof(program)) return program;
  const types = program.inferredExpressionTypes;
  const functions = new Map();
  const bases = [], conjunctions = [], targets = [], sources = [];
  const potentialBases = [], potentialConjunctions = [], potentialTargets = [], potentialSources = [];
  const entries = [], projections = [], uses = [], functionValues = [];
  const fact = (type, node = null) => {
    const id = bases.length;
    bases.push(scalar(type)); conjunctions.push(true);
    potentialBases.push(false); potentialConjunctions.push(false);
    entries.push({ id, type, node });
    return id;
  };
  const edge = (target, source, potential = true) => {
    targets.push(target); sources.push(source);
    if (potential) { potentialTargets.push(target); potentialSources.push(source); }
  };
  const collect = (items, path = ['crate']) => {
    for (const item of items) {
      if (item.k === 'module') collect(item.items, [...path, item.name]);
      if (item.k === 'fn') functions.set([...path, item.name].join('.'), {
        item, path, result: fact(item.ret, item), params: item.params.map(param => fact(param.type, param)),
        defaults: item.params.map(param => param.default ? fact(param.type, param.default) : null), called: false,
      });
    }
  };
  collect(program.items);
  for (const fn of functions.values()) {
    if (needsProductOrigin(fn.item.ret)) potentialBases[fn.result] = true;
    fn.item.params.forEach((param, index) => { if (needsProductOrigin(param.type)) potentialBases[fn.params[index]] = true; });
  }
  const signature = (path, context) => {
    if (functions.has(path.join('.'))) return functions.get(path.join('.'));
    for (let depth = context.length; depth >= 1; depth -= 1) {
      const name = [...context.slice(0, depth), ...path.slice(1)].join('.');
      if (functions.has(name)) return functions.get(name);
    }
    return null;
  };
  const call = (node, path, args, env, context, id) => {
    const fn = signature(path, context);
    const values = args.map(arg => expression(arg, env, context));
    if (!fn) { uses.push({ node, values, reason: 'a product cannot escape to an unknown or external caller' }); return; }
    fn.called = true;
    fn.params.forEach((param, index) => {
      // Omitted product arguments have no ownership proof. Scalar defaults are
      // handled by the existing callable signature and checker.
      edge(param, values[index] ?? fn.defaults[index] ?? fact(null));
    });
    edge(id, fn.result, entries[id].type?.kind === 'tuple');
  };
  const expression = (node, env, context) => {
    const type = types?.get(node) ?? node.type;
    const id = fact(type, node);
    switch (node.k) {
      case 'tuple':
        if (node.productModel === 'immutable value product') {
          potentialBases[id] = true;
          for (const item of node.items) edge(id, expression(item, env, context), false);
        } else node.items.forEach(item => expression(item, env, context));
        return id;
      case 'name':
        if (node.path.length === 1 && env.has(node.path[0])) edge(id, env.get(node.path[0]));
        else call(node, node.path, [], env, context, id);
        return id;
      case 'app':
        if (node.fn.k === 'name' && !(node.fn.path.length === 1 && env.has(node.fn.path[0]))) call(node, node.fn.path, node.args, env, context, id);
        else {
          const values = [expression(node.fn, env, context), ...node.args.map(arg => expression(arg, env, context))];
          uses.push({ node, values, reason: 'a product needs a statically owned direct caller' });
        }
        return id;
      case 'let': {
        const value = expression(node.value, env, context);
        const scope = new Map(env); scope.set(node.name, value);
        const body = expression(node.body, scope, context);
        edge(id, body, type?.kind === 'tuple');
        return id;
      }
      case 'print': {
        const value = expression(node.expr, env, context);
        uses.push({ node, values: [value], reason: 'whole product display needs its own value-format operation' });
        if (node.body) edge(id, expression(node.body, env, context), type?.kind === 'tuple');
        return id;
      }
      case 'if': {
        const condition = expression(node.condition ?? node.cond, env, context);
        uses.push({ node, values: [condition], reason: 'whole product truthiness needs its own shared value predicate' });
        const yes = expression(node.then, env, context), no = expression(node.else, env, context);
        edge(id, yes, type?.kind === 'tuple'); edge(id, no, type?.kind === 'tuple');
        return id;
      }
      case 'index':
      case 'tupleIndex': {
        const object = expression(node.object, env, context);
        if (node.k === 'index') expression(node.index, env, context);
        projections.push({ node, object });
        edge(id, object, type?.kind === 'tuple');
        return id;
      }
      case 'functionValue':
        functionValues.push({ node, fn: signature(node.path, context) });
        return id;
      default: {
        const values = [];
        const visit = value => {
          if (!value || typeof value !== 'object') return;
          if (Array.isArray(value)) { value.forEach(visit); return; }
          if (value.k) { values.push(expression(value, env, context)); return; }
          for (const [key, child] of Object.entries(value)) if (!['span', 'type', 'element', 'pattern'].includes(key)) visit(child);
        };
        for (const [key, value] of Object.entries(node)) if (!['span', 'type', 'element'].includes(key)) visit(value);
        uses.push({ node, values, reason: 'a product only supports owned bindings, direct calls, and fixed positional reads' });
        return id;
      }
    }
  };
  for (const fn of functions.values()) {
    const defaults = new Map();
    fn.item.params.forEach((param, index) => {
      if (param.default) edge(fn.defaults[index], expression(param.default, defaults, fn.path));
      defaults.set(param.name, fn.params[index]);
    });
  }
  for (const fn of functions.values()) {
    const env = new Map(fn.item.params.map((param, index) => [param.name, fn.params[index]]));
    edge(fn.result, expression(fn.item.body, env, fn.path), fn.item.ret.kind === 'tuple');
  }
  const main = new Map();
  for (const effect of program.main?.effects ?? []) {
    if (effect.k === 'let') main.set(effect.name, expression(effect.value, main, ['crate']));
    else expression(effect.expr ?? effect, main, ['crate']);
  }
  const potential = solveProductSourceFacts(potentialBases, potentialTargets, potentialSources, potentialConjunctions);
  const owned = solveProductSourceFacts(bases, targets, sources, conjunctions);
  for (const entry of entries) if (potential[entry.id] && !owned[entry.id]) {
    throw unsupported('immutable tuple product origin', 'every product position and every actual caller needs a fresh recursively immutable scalar Copy value', entry.node?.span);
  }
  for (const { node, values, reason } of uses) if (values.some(id => potential[id])) throw unsupported('immutable tuple product use', reason, node.span);
  for (const fn of functions.values()) if (potential[fn.result] && !fn.called) {
    throw unsupported('Object.freeze operand', 'a returned immutable product needs a closed set of actual callers', fn.item.body.span);
  }
  for (const { node, fn } of functionValues) if (fn && [fn.result, ...fn.params].some(id => potential[id])) throw unsupported('immutable tuple function escape', 'the function needs a closed set of direct callers', node.span);
  for (const fn of functions.values()) if ([fn.item.name, fn.path[1]].some(name => exportedNames.has(name)) && [fn.result, ...fn.params].some(id => potential[id])) {
    throw unsupported('exported immutable tuple function', 'external callers cannot be proved to use the selected immutable value model', fn.item.span);
  }
  for (const { node, object } of projections) if (potential[object]) {
    const index = node.k === 'tupleIndex' ? node.index : readJavaScriptProductIndex(node.index);
    const type = entries[object].type;
    if (!Number.isSafeInteger(index) || index < 0 || type?.kind !== 'tuple' || index >= type.elements.length) throw unsupported('immutable tuple index', 'a product read needs a fixed in-range positional index', node.span);
    node.k = 'tupleIndex'; node.index = index === 0 ? 0 : index;
    delete node.productBinding;
  }
  for (const { node, object } of projections) if (node.productBinding && !potential[object]) throw unsupported('nested array binding', 'nested destructuring requires a proved immutable product; arbitrary array iterators and accessors need their own evaluation model', node.span);
  return program;
}
