// Reference representation is selected from operations and inferred values.
// Scalar equality alone never selects a heap representation.
import { tokenize } from './lexer.js';
import { referenceMethodOperation } from './reference-model.js';

const ASSIGNMENTS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '**=', '<<=', '>>=', '>>>=', '&=', '|=', '^=', '&&=', '||=', '??=']);
const STRUCTURES = new Set(['array', 'record', 'set', 'map', 'data']);

export function requiresReferenceSemantics(source) {
  const { tokens } = tokenize(source, 'JavaScript');
  const closure = tokens.some((token, index) => token.kind === 'punct' && token.value === '=>' || token.kind === 'identifier' && token.value === 'function' && tokens[index + 1]?.value === '(');
  for (let index = 0; index < tokens.length; index += 1) {
    const token = tokens[index];
    if (token.kind === 'identifier' && token.value === 'class' && !['.', '?.'].includes(tokens[index - 1]?.value)) return true;
    if (token.kind === 'identifier' && ['.', '?.'].includes(tokens[index - 1]?.value) && tokens[index + 1]?.value === '(') {
      for (const kind of ['array', 'map', 'set', 'record']) if (referenceMethodOperation(kind, token.value)?.mutates) return true;
    }
    if (token.kind !== 'punct' || (!ASSIGNMENTS.has(token.value) && token.value !== '++' && token.value !== '--')) continue;
    const left = tokens[index - 1];
    const prefix = (token.value === '++' || token.value === '--') && tokens[index + 1]?.kind === 'identifier';
    if (left?.value === ']' || left?.kind === 'identifier' && ['.', '?.'].includes(tokens[index - 2]?.value)) return true;
    if (prefix && (tokens[index + 2]?.value === '.' || tokens[index + 2]?.value === '[')) return true;
    if (closure && (token.value !== '=' || !['const', 'let', 'var'].includes(tokens[index - 2]?.value))) return true;
  }
  return false;
}

function structure(type) {
  if (!type) return false;
  return STRUCTURES.has(type.kind) || type.kind === 'option' && structure(type.element);
}

export function hasStructuralIdentity(program) {
  const signatures = new Map();
  const gather = (items, path = ['crate']) => {
    for (const item of items) {
      if (item.k === 'fn') signatures.set([...path, item.name].join('.'), item);
      if (item.k === 'module') gather(item.items, [...path, item.name]);
    }
  };
  gather(program.items);
  for (const external of program.externals ?? []) signatures.set(`crate.${external.name}`, external);
  let observed = false;
  const expression = (node, scope) => {
    if (!node || typeof node !== 'object') return null;
    if (node.k === 'name') return node.path.length === 1 ? scope.get(node.path[0]) : signatures.get(node.path.join('.'))?.type;
    if (node.k === 'let') {
      const value = expression(node.value, scope);
      return expression(node.body, new Map(scope).set(node.name, value));
    }
    if (node.k === 'binary') {
      const left = expression(node.left, scope);
      const right = expression(node.right, scope);
      if ((node.op === 'eq' || node.op === 'ne') && node.left.k !== 'none' && node.right.k !== 'none' && (structure(left) || structure(right))) observed = true;
      return node.type ?? ((node.op === 'plus' || node.op === 'add') ? left : null);
    }
    if (node.k === 'lambda') {
      const inner = new Map(scope);
      node.params.forEach((param) => inner.set(param.name, param.type));
      expression(node.body, inner);
      return { kind: 'function', params: node.params.map((param) => param.type), ret: node.ret };
    }
    const children = [];
    for (const [key, value] of Object.entries(node)) {
      if (key === 'type' || key === 'span' || key === 'data') continue;
      if (value && typeof value === 'object') children.push(value);
    }
    for (const child of children) {
      if (Array.isArray(child)) child.forEach((entry) => expression(entry, scope));
      else expression(child, scope);
    }
    if (node.type) return node.type;
    if (node.k === 'app' && node.fn.k === 'name') return signatures.get(node.fn.path.join('.'))?.ret;
    if (node.k === 'field') {
      const object = expression(node.object, scope);
      return object?.kind === 'record' ? object.fields.find((field) => field.name === node.field)?.type : null;
    }
    if (node.k === 'index') return expression(node.object, scope)?.element;
    if (node.k === 'if') return expression(node.then, scope) ?? expression(node.else, scope);
    if (node.k === 'num') return { kind: 'int' };
    if (node.k === 'str') return { kind: 'string' };
    if (node.k === 'bool') return { kind: 'bool' };
    if (node.k === 'array') return { kind: 'array' };
    if (node.k === 'record' || node.k === 'set' || node.k === 'map') return { kind: node.k };
    return null;
  };
  const inspect = (items) => {
    for (const item of items) {
      if (item.k === 'fn') expression(item.body, new Map(item.params.map((param) => [param.name, param.type])));
      if (item.k === 'module') inspect(item.items);
    }
  };
  inspect(program.items);
  const scope = new Map();
  for (const effect of program.main?.effects ?? []) {
    if (effect.k === 'let') scope.set(effect.name, expression(effect.value, scope));
    else expression(effect, scope);
  }
  return observed;
}
