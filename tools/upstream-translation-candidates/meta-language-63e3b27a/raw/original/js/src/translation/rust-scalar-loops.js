// Selected source-loop proof and immutable scalar-state lowering.
import { readRuntimeProjectData } from '../project-data-loader.js';
import { unsupported } from './diagnostics.js';
import { checkRustSourceSignature } from './rust-source-signatures.js';
import {acceptRustScalarLoopModel, acceptScalarLoopDeclarationModel, acceptScalarLoopLanguage, acceptScalarLoopValueKind, acceptScalarLoopPrimitiveOwner, acceptScalarLoopBinaryOperation, acceptScalarLoopUnaryOperation, acceptScalarLoopMathOperation} from './scalar-loop-rules.js';
export {acceptRustScalarLoopModel} from './scalar-loop-rules.js';

export const RUST_SCALAR_LOOP_POLICY = readRuntimeProjectData(new URL('./data/rust-scalar-loops.lino', import.meta.url));
const policy = RUST_SCALAR_LOOP_POLICY;
const fail = (reason, span) => { throw unsupported('Rust scalar loop', reason, span); };
const range = (first, last) => ({start: first.start, end: last.end});


function header(signature, params, ret, language) {
  checkRustSourceSignature(signature, params.map(param => param.type), ret, language);
  if (signature.lifetimeBindings.length) fail('lifetime bindings require a separate state model');
  for (const position of [...signature.parameters, signature.result]) {
    if (position.wrappers.length || position.lifetimes.length || position.owner.kind !== 'primitive'
      || position.owner.path.length !== 1 || position.owner.arguments.length
      || !acceptScalarLoopPrimitiveOwner(position.type.kind, position.owner.path[0])) fail('state and result require direct primitive f64 or Boolean owners');
  }
}

export function checkRustScalarLoopProof(item, language, declaredName = item.fullName ?? item.name) {
  const proof = item.sourceLoop;
  const exact = (value, fields) => value && typeof value === 'object' && !Array.isArray(value)
    && Object.keys(value).length === fields.length && fields.every(field => Object.hasOwn(value, field));
  const declarationDirected = acceptScalarLoopDeclarationModel(proof?.model ?? '');
  const fields = ['model', 'language', 'sourceName', 'lowering', 'state', 'transitions', ...(language === 'JavaScript' ? ['interface'] : []), ...(declarationDirected ? ['continuation'] : [])];
  if (!exact(proof, fields)
    || (!acceptRustScalarLoopModel(proof.model) || !proof.model) || proof.language !== language || !acceptScalarLoopLanguage(language)
    || proof.sourceName !== item.name || proof.lowering !== policy.lowering
    || (item.generated !== undefined && item.generated !== false)
    || !Array.isArray(proof.state) || !Array.isArray(proof.transitions)) fail('the owned loop proof has an inconsistent model, name or layout', item.span);
  if (item.fullName !== undefined && item.fullName !== declaredName
    || item.modulePath !== undefined && (!Array.isArray(item.modulePath) || item.modulePath.some(segment => typeof segment !== 'string')
      || [...item.modulePath, item.name].join('.') !== declaredName)) fail('the loop identity disagrees with its actual declaration scope', item.span);
  if (declarationDirected && (!exact(proof.continuation, ['root', 'path'])
    || proof.continuation.root !== policy.continuationRoot || !Array.isArray(proof.continuation.path)
    || proof.continuation.path.length !== declaredName.split('.').length
    || proof.continuation.path.some((segment, index) => typeof segment !== 'string' || !segment || segment !== declaredName.split('.')[index]))) fail('the continuation target disagrees with its actual root-owned declaration scope', item.span);
  if (language === 'Rust') header(item.sourceSignature, item.params, item.ret, language);
  else {
    const signature = proof.interface;
    if (item.sourceSignature !== undefined || !exact(signature, ['model', 'parameters', 'result'])
      || signature.model !== policy.javaScriptInterfaceModel || !Array.isArray(signature.parameters)
      || signature.parameters.length !== item.params.length) fail('a JavaScript loop needs its distinct Number/Boolean interface', item.span);
    const actual = [...item.params.map(param => param.type), item.ret];
    for (const [index, type] of [...signature.parameters, signature.result].entries()) {
      if (!exact(type, ['kind']) || !acceptScalarLoopValueKind(type.kind) || type.kind !== actual[index]?.kind) fail('a JavaScript loop interface must match actual scalar header types', item.span);
    }
  }
  if (item.params.some(param => param.guard != null || param.default != null || param.optional)) fail('loop state excludes guarded, default and optional parameters', item.span);
  if (proof.state.length !== item.params.length || !proof.state.length) fail('loop state must match every function parameter', item.span);
  const names = new Set();
  for (const [index, slot] of proof.state.entries()) {
    if (!exact(slot, ['name', 'mutable']) || typeof slot.name !== 'string' || !slot.name
      || slot.name !== item.params[index].name || typeof slot.mutable !== 'boolean' || names.has(slot.name)) fail('loop state has inconsistent binding ownership', item.span);
    names.add(slot.name);
  }
  const mutable = new Set(proof.state.filter(slot => slot.mutable).map(slot => slot.name));
  const snapshots = new Set(), usedSnapshots = new Set();
  let calls = 0, visits = 0;
  function expression(node, scope, tail = false) {
    if (++visits > 100000 || !node || typeof node !== 'object') fail('loop proof exceeds its expression resource limit', item.span);
    if (node.k === 'let') {
      if (scope.has(node.name)) fail('loop locals must have distinct scalar binding identities', node.span);
      if (language === 'JavaScript' && /^ml_/u.test(node.name)) {
        if (!new RegExp(policy.snapshotBindingPattern, 'u').test(node.name)) fail('a reserved local must be an exact checked write snapshot', node.span);
        snapshots.add(node.name);
      }
      expression(node.value, scope);
      expression(node.body, new Map(scope).set(node.name, node.value), tail);
    } else if (node.k === 'if') {
      expression(node.cond, scope);
      expression(node.then, scope, tail); expression(node.else, scope, tail);
    } else if (node.k === 'app' || node.k === 'call') {
      const target = node.k === 'call' ? node.fn : node.fn?.path?.join('.');
      const transition = proof.transitions[calls++];
      const ownedTarget = node.k === 'call' ? target === declaredName : declarationDirected
        ? node.fn?.k === 'name' && Array.isArray(node.fn.path)
          && node.fn.path.length === proof.continuation.path.length + 1
          && node.fn.path[0] === proof.continuation.root
          && proof.continuation.path.every((segment, index) => node.fn.path[index + 1] === segment)
        : target === declaredName || target === item.name || target === 'crate.' + declaredName;
      if (!tail || !ownedTarget || !exact(transition, ['writes', 'arguments'])
        || !Array.isArray(transition.writes) || !Array.isArray(transition.arguments)
        || node.args.length !== proof.state.length || transition.arguments.length !== proof.state.length) fail('only an owned tail continuation is admitted', node.span);
      const writes = new Map();
      let order = -1;
      for (const write of transition.writes) {
        if (!exact(write, ['target', 'binding']) || !mutable.has(write.target) || writes.has(write.target)
          || !scope.has(write.binding) || names.has(write.binding)) fail('a continuation must write distinct declared mutable state slots', node.span);
        writes.set(write.target, write.binding);
        usedSnapshots.add(write.binding);
        if (language === 'JavaScript' && !snapshots.has(write.binding)) fail('a JavaScript write must use its exact scalar snapshot binding', node.span);
        const position = [...scope.keys()].indexOf(write.binding);
        if (position <= order) fail('parallel writes must retain their actual evaluation order', node.span);
        order = position;
      }
      const temporaries = new Set(writes.values());
      function priorState(value, active = new Set()) {
        if (!value || typeof value !== 'object') return;
        if (++visits > 100000) fail('loop snapshot proof exceeds its resource limit', node.span);
        const name = value.k === 'var' ? value.name : value.k === 'name' && value.path.length === 1 ? value.path[0] : null;
        if (temporaries.has(name)) fail('every parallel write must read the previous state snapshot', node.span);
        if (name && scope.get(name)) {
          if (active.has(name)) fail('loop bindings have cyclic snapshot dependencies', node.span);
          priorState(scope.get(name), new Set(active).add(name));
        }
        for (const child of Object.values(value)) {
          if (Array.isArray(child)) child.forEach(value => priorState(value, active));
          else if (child && typeof child === 'object') priorState(child, active);
        }
      }
      for (const binding of temporaries) priorState(scope.get(binding));
      for (const [index, argument] of node.args.entries()) {
        const name = writes.get(proof.state[index].name) ?? proof.state[index].name;
        if (transition.arguments[index] !== name || !scope.has(name)
          || (argument.k === 'var' ? argument.name : argument.k === 'name' && argument.path.length === 1 ? argument.path[0] : null) !== name) fail('continuation arguments disagree with the ordered scalar write proof', node.span);
      }
    } else if (node.k === 'name' || node.k === 'var') {
      const name = node.k === 'var' ? node.name : node.path?.length === 1 ? node.path[0] : null;
      if (!scope.has(name)) fail('loop expressions cannot capture undeclared values', node.span);
    } else if (['num', 'bool', 'lit'].includes(node.k)) {
      if (node.k === 'lit' && !acceptScalarLoopValueKind(node.type?.kind ?? '')) fail('only scalar loop literals are admitted', node.span);
      if (node.k === 'num' && node.type && node.type.kind !== 'float') fail('only binary64 numeric literals are admitted', node.span);
    } else if (node.k === 'binary' && acceptScalarLoopBinaryOperation(node.op)) {
      expression(node.left, scope); expression(node.right, scope);
    } else if (node.k === 'unary' && acceptScalarLoopUnaryOperation(node.op)) expression(node.arg, scope);
    else if (node.k === 'math' && acceptScalarLoopMathOperation(node.op)) node.args.forEach(arg => {
      if (arg.k) expression(arg, scope);
      else if (arg.value && !arg.spread) expression(arg.value, scope);
      else fail('a scalar math argument must be one direct value', node.span);
    });
    else fail(`expression ${node.k ?? 'record'} has no closed scalar loop interpretation`, node.span);
    if (node.type && !acceptScalarLoopValueKind(node.type.kind)) fail('a loop expression has a non-scalar value type', node.span);
  }
  expression(item.body, new Map([...names].map(name => [name, null])), true);
  if (!calls || calls !== proof.transitions.length) fail('the loop proof must describe every actual continuation', item.span);
  if ([...snapshots].some(name => !usedSnapshots.has(name))) fail('a reserved snapshot cannot acquire an unrelated local meaning', item.span);
  return proof;
}

export function readRustScalarLoop(parser, path, name, params, ret, signature, mutableNames) {
  header(signature, params, ret, 'Rust');
  const c = parser.cursor, open = c.expect('{', 'scalar loop function');
  c.expect('loop', 'scalar loop');
  const proof = {model: parser.scalarLoopModel, language: policy.language, sourceName: name, lowering: policy.lowering,
    ...(acceptScalarLoopDeclarationModel(parser.scalarLoopModel) ? {continuation: {root: policy.continuationRoot, path: [...path, name]}} : {}),
    state: params.map(param => ({name: param.name, mutable: mutableNames.includes(param.name)})), transitions: []};
  let temporary = 0;
  const state = new Set(params.map(param => param.name));
  function scalarResult(expression) {
    if (!parser.origins.immutableProduct(parser.origins.origin(expression, path))) fail('loop results require direct scalar Copy ownership', expression.span);
    return expression;
  }
  function block(valueAllowed = false) {
    const start = c.expect('{', 'scalar loop block'), previous = parser.origins.enter();
    try {
      const bindings = [];
      while (c.is('let')) {
        const read = parser.letStatement(path);
        if (read.length !== 1 || state.has(read[0].name)) fail('loop bindings require distinct immutable scalar names', read[0]?.span);
        if (!parser.origins.immutableProduct(parser.origins.origin(read[0].value, path))) fail('loop locals require direct scalar Copy values without heap or reference ownership', read[0].span);
        bindings.push(...read);
      }
      let result;
      if (c.eat('return')) result = completion();
      else if (c.is('{')) result = block(valueAllowed);
      else if (c.is('if')) result = conditional(valueAllowed);
      else if (c.is('(') || c.is('continue') || proof.continuation && c.peek().kind === 'identifier' && c.is('=', 1)) result = continuation();
      else if (valueAllowed) result = scalarResult(parser.expr(path));
      else fail('a loop path needs an explicit return or scalar continuation', c.peek());
      c.eat(';');
      if (!c.is('}')) fail('every loop branch must complete its result or continuation', range(start, c.peek()));
      const close = c.expect('}', 'scalar loop block');
      result = bindings.reduceRight((body, binding) => ({k: 'let', ...binding, body, span: binding.span}), result);
      return parser.origins.mark(result, parser.origins.typeOrigin(ret, path));
    } finally { parser.origins.scope = previous; }
  }
  function completion() {
    if (c.is('if')) return conditional(true);
    if (c.is('{')) return block(true);
    return scalarResult(parser.expr(path));
  }
  function conditional(valueAllowed) {
    const start = c.expect('if', 'scalar loop condition');
    const cond = parser.expr(path, {noStruct: true});
    const then = block(valueAllowed);
    c.expect('else', 'scalar loop branches');
    const otherwise = c.is('if') ? conditional(valueAllowed) : block(valueAllowed);
    return {k: 'if', cond, then, else: otherwise, span: range(start, c.peek())};
  }
  function continuation() {
    const start = c.peek(), writes = [], values = [];
    if (c.eat('(')) {
      while (!c.is(')')) {
        const target = c.identifier('scalar state slot').value;
        if (!mutableNames.includes(target) || writes.some(write => write.target === target)) fail('parallel writes require distinct mutable parameter slots', start);
        let binding;
        do { binding = `ml_scalar_write${temporary++}`; } while (parser.reservedNames.has(binding));
        parser.reservedNames.add(binding);
        writes.push({target, binding});
        if (!c.eat(',')) break;
      }
      c.expect(')', 'parallel state writes'); c.expect('=', 'parallel state writes'); c.expect('(', 'parallel state values');
      while (!c.is(')')) { values.push(parser.expr(path)); if (!c.eat(',')) break; }
      c.expect(')', 'parallel state values'); c.expect(';', 'parallel state writes');
      if (!writes.length || writes.length !== values.length) fail('parallel state writes require one scalar value per slot', range(start, c.peek()));
      if (values.some(value => !parser.origins.immutableProduct(parser.origins.origin(value, path)))) fail('parallel state values require direct scalar Copy ownership', range(start, c.peek()));
    }
    else if (proof.continuation && c.peek().kind === 'identifier' && c.is('=', 1)) {
      const target = c.identifier('scalar state slot').value;
      if (!mutableNames.includes(target)) fail('single writes require a mutable parameter slot', start);
      let binding;
      do { binding = `ml_scalar_write${temporary++}`; } while (parser.reservedNames.has(binding));
      parser.reservedNames.add(binding);
      writes.push({target, binding});
      c.expect('=', 'single scalar state write');
      values.push(parser.expr(path));
      c.expect(';', 'single scalar state write');
      if (!parser.origins.immutableProduct(parser.origins.origin(values[0], path))) fail('parallel state values require direct scalar Copy ownership', range(start, c.peek()));
    }
    c.expect('continue', 'scalar state continuation'); c.expect(';', 'scalar state continuation');
    const arguments_ = params.map(param => writes.find(write => write.target === param.name)?.binding ?? param.name);
    proof.transitions.push({writes, arguments: arguments_});
    let result = {k: 'app', fn: {k: 'name', path: proof.continuation ? [proof.continuation.root, ...proof.continuation.path] : [name]}, args: arguments_.map(name => ({k: 'name', path: [name]})), span: range(start, c.peek())};
    for (let index = writes.length - 1; index >= 0; index--) result = {k: 'let', name: writes[index].binding,
      type: params.find(param => param.name === writes[index].target).type, value: values[index], body: result, span: range(start, c.peek())};
    return result;
  }
  const body = block();
  const close = c.expect('}', 'scalar loop function');
  const item = {k: 'fn', name, params, ret, body, sourceSignature: signature, sourceLoop: proof, span: range(open, close)};
  checkRustScalarLoopProof(item, 'Rust');
  return {body, proof};
}
