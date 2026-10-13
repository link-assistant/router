// portable-pure-v1: the meta-language form both frontends produce and both
// emitters consume. An item is a pure function or a literal constant; a
// function body is `let` bindings followed by one `return` or one
// two-way `if` whose branches are bodies of the same shape. The IR is
// written as Links Notation (`toLino` / `fromLino`), one item per link, the
// way relative-meta-logic's `portable-natural-v1` network spells its
// fragment (PR #184), so the meta leg is a document either runtime reads.
//
// Item:  { kind: 'function', name, exported, params: [{ name, type }], returns, body }
//        { kind: 'constant', name, exported, type, value }
// Stmt:  { kind: 'let', name, value } | { kind: 'return', value }
//        | { kind: 'if', cond, then: [Stmt], else: [Stmt] | null }
// Expr:  { kind: 'number', text } | { kind: 'string', value } | { kind: 'boolean', value }
//        | { kind: 'variable', name } | { kind: 'binary', op, left, right }
//        | { kind: 'unary', op, operand } | { kind: 'choose', cond, then, else }
//        | { kind: 'call', name, args } | { kind: 'builtin', name, args }
//        | { kind: 'method', name, receiver, args }
// Names are canonical snake_case (UPPER_SNAKE for constants); `type` is a
// type row of the construct map. `check` adds `type` to every expression.

import { constructMap, refuse } from './constructs.mjs';
import { encodeWord, field, parseLinks, textOf, writeLink } from './lino.mjs';
import { constantValue } from './constants.mjs';
import { guardedScope } from './guards.mjs';
import { optionalType, joinReturnTypes, closedReturnType } from './return-types.mjs';
import { validateCharacterClass } from './character-classes.mjs';

export const FRAGMENT = 'portable-router-v1';

// The keyword vocabulary of both languages: a portable name is none of
// these, the rule relative-meta-logic applies across its four languages.
const KEYWORDS = new Set(`
  as async await break case catch class const continue crate debugger default delete do dyn else
  enum export extends extern false finally fn for function if impl import in instanceof let loop
  match mod move mut new null pub ref return self static struct super switch this throw trait true
  try type typeof undefined unsafe use var void where while with yield abstract become box final
  macro override priv typeof unsized virtual gen arguments eval
`.trim().split(/\s+/u));

/**
 * The canonical snake_case of a JavaScript camelCase name, refusing a name
 * whose spelling does not come back.
 * @param {string} name
 * @returns {string}
 */
export function snakeFromCamel(name) {
  if (/^[A-Z][A-Z0-9_]*$/u.test(name) && name.length > 1) return name;
  if (!/^[a-z][A-Za-z0-9]*$/u.test(name)) refuse('name', name);
  const snake = name.replace(/[A-Z]/gu, (letter) => `_${letter.toLowerCase()}`);
  if (KEYWORDS.has(snake) || KEYWORDS.has(name) || camelFromSnake(snake) !== name) refuse('name', name);
  return snake;
}

/**
 * The JavaScript camelCase of a canonical snake_case name.
 * @param {string} name
 * @returns {string}
 */
export function camelFromSnake(name) {
  if (/^[A-Z][A-Z0-9_]*$/u.test(name) && name.length > 1) return name;
  if (!/^[a-z][a-z0-9]*(_[a-z][a-z0-9]*)*$/u.test(name) || KEYWORDS.has(name)) refuse('name', name);
  return name.replace(/_([a-z])/gu, (_, letter) => letter.toUpperCase());
}

/**
 * Check a Rust name is canonical (snake_case or UPPER_SNAKE) and portable.
 * @param {string} name
 * @returns {string}
 */
export function canonicalRustName(name) {
  camelFromSnake(name);
  return name;
}

const terminates = (body) => {
  const last = body[body.length - 1];
  if (!last) return false;
  if (last.kind === 'return') return true;
  return last.kind === 'if' && last.else !== null && terminates(last.then) && terminates(last.else);
};

/**
 * The canonical body: an `if` without `else` whose branch returns takes the
 * statements after it as its `else`, a returned conditional is a two-way
 * `if`, and a two-way branch never tests a negation (its branches are
 * swapped instead, the form clippy's `if_not_else` asks for), so both
 * frontends meet one shape and the Rust it is spelled as stays lint-clean.
 * @param {Array<object>} body
 * @returns {Array<object>}
 */
export function normalizeBody(body) {
  const out = [];
  for (let index = 0; index < body.length; index += 1) {
    const statement = canonicalStatement(body[index]);
    if (statement.kind !== 'if') {
      if (statement.kind === 'return' && index < body.length - 1) refuse('unsupported', 'a statement after return');
      out.push(statement);
      continue;
    }
    const then = normalizeBody(statement.then);
    if (statement.else === null && index < body.length - 1 && terminates(then)) {
      out.push(twoWay(statement.cond, then, normalizeBody(body.slice(index + 1))));
      return out;
    }
    if (index < body.length - 1 || statement.else === null) refuse('missing-return');
    out.push(twoWay(statement.cond, then, normalizeBody(statement.else)));
  }
  if (!terminates(out)) refuse('missing-return');
  return out;
}

function canonicalStatement(statement) {
  if (statement.kind === 'let') return { ...statement, value: canonicalExpr(statement.value) };
  if (statement.kind === 'if') return { ...statement, cond: canonicalExpr(statement.cond) };
  const value = canonicalExpr(statement.value);
  if (value.kind !== 'choose') return { ...statement, value };
  return {
    kind: 'if',
    cond: value.cond,
    then: [{ kind: 'return', value: value.then }],
    else: [{ kind: 'return', value: value.else }],
  };
}

function twoWay(cond, then, otherwise) {
  const positive = negation(cond);
  const elseIf = otherwise.length === 1 && otherwise[0].kind === 'if';
  return positive && !elseIf ? { kind: 'if', cond: positive, then: otherwise, else: then } : { kind: 'if', cond, then, else: otherwise };
}

function negation(cond) {
  if (cond.kind === 'unary' && cond.op === 'not') return cond.operand;
  if (cond.kind === 'binary' && cond.op === 'not-equal') return { ...cond, op: 'equal' };
  return null;
}

function canonicalExpr(expr) {
  switch (expr.kind) {
    case 'binary':
      return { ...expr, left: canonicalExpr(expr.left), right: canonicalExpr(expr.right) };
    case 'unary':
      return { ...expr, operand: canonicalExpr(expr.operand) };
    case 'choose': {
      const cond = canonicalExpr(expr.cond);
      const then = canonicalExpr(expr.then);
      const otherwise = canonicalExpr(expr.else);
      const positive = negation(cond);
      return positive ? { kind: 'choose', cond: positive, then: otherwise, else: then } : { kind: 'choose', cond, then, else: otherwise };
    }
    case 'call':
    case 'builtin':
      return { ...expr, args: expr.args.map(canonicalExpr) };
    case 'method':
      return { ...expr, receiver: canonicalExpr(expr.receiver), args: expr.args.map(canonicalExpr) };
    default:
      return expr;
  }
}

/**
 * The signatures a module's items declare, for calls between them.
 * @param {Array<object>} items
 * @returns {Map<string, object>}
 */
export function signatures(items) {
  const table = new Map();
  for (const item of items) table.set(item.name, item);
  return table;
}

/**
 * Type-check `item` against the module `table`; returns a copy whose
 * expressions carry `type`. Refuses what the construct map does not accept.
 * @param {object} item
 * @param {Map<string, object>} table
 * @returns {object}
 */
export function check(item, table) {
  const map = constructMap();
  canonicalRustName(item.name);
  for (const param of item.params ?? []) canonicalRustName(param.name);
  if (item.params?.some(param => !['number', 'string', 'boolean', 'value'].includes(param.type))) refuse('untyped', 'nullable types are return contracts only');
  for (const type of item.kind === 'function' ? [...item.params.map((param) => param.type), ...(item.returns ? [item.returns] : [])] : [item.type]) {
    if (!map.types.has(type)) refuse('untyped', type);
  }
  if (item.kind === 'constant') {
    const value = expression(item.value, new Map(), table);
    if (typeof constantValue(value) !== item.type || value.type !== item.type) refuse('type', item.name);
    return { ...item, value };
  }
  if (new Set(item.params.map((param) => param.name)).size !== item.params.length) refuse('name', 'duplicate parameter');
  const scope = new Map(item.params.map((param) => [param.name, param.type]));
  let inferredReturn = item.returns;
  const block = (body, names, mutable = new Set()) => body.map((statement) => {
    if (statement.kind === 'let') {
      canonicalRustName(statement.name);
      if (names.has(statement.name)) refuse('name', `shadowed or duplicate binding ${statement.name}`);
      const value = expression(statement.value, names, table);
      names.set(statement.name, value.type);
      if (statement.mutable) mutable.add(statement.name);
      return { ...statement, value };
    }
    if (statement.kind === 'assign') {
      canonicalRustName(statement.name);
      if (!mutable.has(statement.name)) refuse('mutable', statement.name);
      const value = expression(statement.value, names, table);
      if (value.type !== names.get(statement.name)) refuse('type', statement.name);
      return { ...statement, value };
    }
    if (statement.kind === 'return') {
      const value = expression(statement.value, names, table);
      if (!closedReturnType(value.type)) refuse('untyped', 'a dynamic return value without a closed primitive contract');
      const combined = joinReturnTypes(inferredReturn, value.type);
      if (!combined || item.returns && combined !== item.returns) refuse('type', `returns ${value.type}, not ${inferredReturn}`);
      inferredReturn = combined;
      return { ...statement, value };
    }
    const cond = condition(statement.cond, names, table);
    if (statement.kind === 'while') return { ...statement, cond, body: block(statement.body, guardedScope(statement.cond, names, true), new Set(mutable)) };
    return {
      ...statement,
      cond,
      then: block(statement.then, guardedScope(statement.cond, names, true), new Set(mutable)),
      else: statement.else === null ? null : block(statement.else, guardedScope(statement.cond, names, false), new Set(mutable)),
    };
  });
  const body = block(item.body, scope);
  if (!inferredReturn) refuse('missing-return');
  return { ...item, returns: inferredReturn, body };
}

// Observe truthiness only where the source chooses a control-flow edge. A
// returned `&&` or `||` keeps its value-producing semantics and strict checker.
function condition(expr, names, table) {
  if (expr.kind === 'binary' && ['and', 'or'].includes(expr.op)) {
    const left = condition(expr.left, names, table);
    const right = condition(expr.right, guardedScope(expr.left, names, expr.op === 'and'), table);
    return { ...expr, left, right, type: 'boolean' };
  }
  const operand = expression(expr, names, table);
  if (operand.type === 'boolean') return operand;
  if (!['number', 'string', 'null', 'undefined'].includes(operand.type)) refuse('type', 'a condition without a closed primitive truthiness contract');
  return { kind: 'truthy', operand, type: 'boolean' };
}

function expression(expr, names, table) {
  const map = constructMap();
  const typed = (fields, type) => ({ ...expr, ...fields, type });
  switch (expr.kind) {
    case 'number':
      if (!/^(?:0|[1-9]\d*)(?:\.\d+)?$/u.test(expr.text) || !Number.isFinite(Number(expr.text))) refuse('type', 'a malformed decimal literal');
      return typed({}, 'number');
    case 'string':
      if (/\p{Surrogate}/u.test(expr.value)) refuse('type', 'an unpaired UTF-16 surrogate literal');
      return typed({}, 'string');
    case 'boolean':
      return typed({}, 'boolean');
    case 'null': case 'undefined':
      return typed({}, expr.kind);
    case 'variable': {
      canonicalRustName(expr.name);
      if (names.has(expr.name)) {
        const type = names.get(expr.name);
        return type.startsWith('value:') ? typed({ projection: type.slice(6) }, type.slice(6)) : typed({}, type);
      }
      const item = table.get(expr.name);
      if (item && item.kind === 'constant') return typed({}, item.type);
      return refuse('unsupported', `the free name ${expr.name}`);
    }
    case 'binary': {
      const row = map.operators.get(expr.op);
      const left = expression(expr.left, names, table);
      const right = expression(expr.right, expr.op === 'and' ? guardedScope(expr.left, names, true) : expr.op === 'or' ? guardedScope(expr.left, names, false) : names, table);
      if (left.type === 'value' || right.type === 'value') refuse('untyped', 'dynamic values need a proven primitive typeof guard');
      if (expr.op === 'add' && left.type === 'string' && right.type === 'string') return typed({ left, right }, 'string');
      if (row.operands === 'any' ? left.type !== right.type : left.type !== row.operands || right.type !== row.operands) {
        return refuse(left.type === 'string' && expr.op === 'add' ? 'concatenation' : 'type', `${expr.op} of ${left.type} and ${right.type}`);
      }
      return typed({ left, right }, row.yields);
    }
    case 'unary': {
      const row = map.unaries.get(expr.op);
      const operand = expression(expr.operand, names, table);
      if (operand.type !== row.operand) refuse('type', `${expr.op} of ${operand.type}`);
      return typed({ operand }, row.yields);
    }
    case 'typeof': {
      const operand = expression(expr.operand, names, table);
      if (optionalType(operand.type)) refuse('type', 'typeof a nullable return value');
      return typed({ operand }, 'string');
    }
    case 'truthy': {
      const operand = expression(expr.operand, names, table);
      if (!['number', 'string', 'boolean', 'null', 'undefined'].includes(operand.type)) refuse('type', 'truthiness of a dynamic value');
      return typed({ operand }, 'boolean');
    }
    case 'includes': {
      const values = expr.values.map(value => expression(value, names, table));
      for (const value of values) {
        if (!['number', 'boolean', 'string'].includes(value.type) || typeof constantValue(value) !== value.type) refuse('collection', 'non-closed primitive includes elements');
      }
      const argument = expression(expr.argument, names, table);
      if (!['number', 'string', 'boolean', 'value', 'null', 'undefined'].includes(argument.type)) refuse('collection', 'includes of an unsupported nullable argument');
      return typed({ values, argument }, 'boolean');
    }
    case 'choose': {
      const cond = condition(expr.cond, names, table);
      const then = expression(expr.then, guardedScope(expr.cond, names, true), table);
      const otherwise = expression(expr.else, guardedScope(expr.cond, names, false), table);
      const type = joinReturnTypes(then.type, otherwise.type);
      if (!type) refuse('type', 'a conditional expression');
      return typed({ cond, then, else: otherwise }, type);
    }
    case 'call': {
      canonicalRustName(expr.name);
      const callee = table.get(expr.name);
      if (!callee || callee.kind !== 'function') return refuse('unknown-call', expr.name);
      if (!callee.returns) refuse('untyped', `an unresolved inferred return contract for ${expr.name}`);
      const args = expr.args.map((arg) => expression(arg, names, table));
      if (args.length !== callee.params.length || args.some((arg, index) => arg.type !== callee.params[index].type)) {
        refuse('type', `the arguments of ${expr.name}`);
      }
      return typed({ args }, callee.returns);
    }
    case 'builtin': {
      const row = map.builtins.get(expr.name);
      const args = expr.args.map((arg) => expression(arg, names, table));
      if (args.length !== row.arguments.length || args.some((arg, index) => arg.type !== row.arguments[index] && !(arg.type === 'value' && ['safe-integer', 'finite', 'nan'].includes(expr.name)))) refuse('type', expr.name);
      return typed({ args }, row.yields);
    }
    case 'method': {
      const row = map.methods.get(expr.name);
      const receiver = expression(expr.receiver, names, table);
      const args = expr.args.map((arg) => expression(arg, names, table));
      if (receiver.type !== row.receiver || args.length !== row.arguments.length || args.some((arg, index) => arg.type !== row.arguments[index])) {
        refuse('type', expr.name);
      }
      return typed({ receiver, args }, row.yields);
    }
    case 'length': {
      const receiver = expression(expr.receiver, names, table);
      if (receiver.type !== 'string') refuse('type', 'length of a non-string');
      return typed({ receiver }, 'number');
    }
    case 'codepoints': {
      const receiver = expression(expr.receiver, names, table);
      if (receiver.type !== 'string') refuse('type', 'codepoint iteration of a non-string');
      return typed({ receiver }, 'number');
    }
    case 'class-test': {
      validateCharacterClass(expr);
      const receiver = expression(expr.receiver, names, table);
      if (receiver.type !== 'string') refuse('type', 'a regex test requiring coercion of a non-string');
      return typed({ receiver }, 'boolean');
    }
    default:
      return refuse('unsupported', expr.kind);
  }
}

/**
 * The item as one Links Notation link.
 * @param {object} item
 * @returns {string}
 */
export function toLino(item) {
  const flag = item.exported ? [['exported']] : [];
  if (item.kind === 'constant') return writeLink(['constant', item.name, ...flag, ['type', item.type], ['value', linkOf(item.value)]]);
  return writeLink([
    'function',
    item.name,
    ...flag,
    ['parameters', ...item.params.map((param) => [param.name, param.type])],
    ['returns', item.returns],
    ['body', ...item.body.map(statementLink)],
  ]);
}

function statementLink(statement) {
  if (statement.kind === 'let') return [statement.mutable ? 'mutable' : 'let', statement.name, linkOf(statement.value)];
  if (statement.kind === 'assign') return ['assign', statement.name, linkOf(statement.value)];
  if (statement.kind === 'while') return ['while', linkOf(statement.cond), ['body', ...statement.body.map(statementLink)]];
  if (statement.kind === 'return') return ['return', linkOf(statement.value)];
  const link = ['if', linkOf(statement.cond), ['then', ...statement.then.map(statementLink)]];
  if (statement.else !== null) link.push(['else', ...statement.else.map(statementLink)]);
  return link;
}

function linkOf(expr) {
  switch (expr.kind) {
    case 'number':
      return ['number', expr.text];
    case 'string':
      return ['string', encodeWord(expr.value)];
    case 'boolean':
      return ['boolean', String(expr.value)];
    case 'null': case 'undefined':
      return [expr.kind];
    case 'variable':
      return ['variable', expr.name];
    case 'binary':
      return ['binary', expr.op, linkOf(expr.left), linkOf(expr.right)];
    case 'unary':
      return ['unary', expr.op, linkOf(expr.operand)];
    case 'typeof':
      return ['typeof', linkOf(expr.operand)];
    case 'truthy':
      return ['truthy', linkOf(expr.operand)];
    case 'includes':
      return ['includes', ['values', ...expr.values.map(linkOf)], ['argument', linkOf(expr.argument)]];
    case 'choose':
      return ['choose', linkOf(expr.cond), linkOf(expr.then), linkOf(expr.else)];
    case 'method':
      return ['method', expr.name, linkOf(expr.receiver), ...expr.args.map(linkOf)];
    case 'length':
      return ['length', linkOf(expr.receiver)];
    case 'codepoints':
      return ['codepoints', linkOf(expr.receiver)];
    case 'class-test':
      return ['class-test', ['unicode', String(expr.unicode)], ['negated', String(expr.negated)], ['anchored', String(expr.anchored)], ['ranges', ...expr.ranges.map(range=>[String(range.low), String(range.high)])], ['receiver', linkOf(expr.receiver)]];
    default:
      return [expr.kind, expr.name, ...expr.args.map(linkOf)];
  }
}

/**
 * The items of a meta document: every `function` and `constant` link.
 * @param {string} text
 * @returns {Array<object>}
 */
export function fromLino(text) {
  return parseLinks(text).filter((link) => link[0] === 'function' || link[0] === 'constant').map(itemOf);
}

function itemOf(link) {
  const exported = Boolean(field(link, 'exported'));
  if (link[0] === 'constant') {
    return { kind: 'constant', name: link[1], exported, type: field(link, 'type')[1], value: exprOf(field(link, 'value')[1]) };
  }
  return {
    kind: 'function',
    name: link[1],
    exported,
    params: field(link, 'parameters').slice(1).map(([name, type]) => ({ name, type })),
    returns: field(link, 'returns')[1],
    body: field(link, 'body').slice(1).map(statementOf),
  };
}

function statementOf(link) {
  if (link[0] === 'let') return { kind: 'let', name: link[1], value: exprOf(link[2]) };
  if (link[0] === 'mutable') return { kind: 'let', name: link[1], value: exprOf(link[2]), mutable: true };
  if (link[0] === 'assign') return { kind: 'assign', name: link[1], value: exprOf(link[2]) };
  if (link[0] === 'while') return { kind: 'while', cond: exprOf(link[1]), body: field(link, 'body').slice(1).map(statementOf) };
  if (link[0] === 'return') return { kind: 'return', value: exprOf(link[1]) };
  const otherwise = field(link, 'else');
  return {
    kind: 'if',
    cond: exprOf(link[1]),
    then: field(link, 'then').slice(1).map(statementOf),
    else: otherwise ? otherwise.slice(1).map(statementOf) : null,
  };
}

function exprOf(link) {
  const [kind, ...rest] = link;
  switch (kind) {
    case 'number':
      return { kind, text: rest[0] };
    case 'string':
      return { kind, value: textOf(rest[0]) };
    case 'boolean':
      return { kind, value: rest[0] === 'true' };
    case 'null': case 'undefined':
      return { kind };
    case 'variable':
      return { kind, name: rest[0] };
    case 'binary':
      return { kind, op: rest[0], left: exprOf(rest[1]), right: exprOf(rest[2]) };
    case 'unary':
      return { kind, op: rest[0], operand: exprOf(rest[1]) };
    case 'typeof':
      return { kind, operand: exprOf(rest[0]) };
    case 'truthy':
      return { kind, operand: exprOf(rest[0]) };
    case 'includes':
      return { kind, values: rest[0].slice(1).map(exprOf), argument: exprOf(rest[1][1]) };
    case 'choose':
      return { kind, cond: exprOf(rest[0]), then: exprOf(rest[1]), else: exprOf(rest[2]) };
    case 'method':
      return { kind, name: rest[0], receiver: exprOf(rest[1]), args: rest.slice(2).map(exprOf) };
    case 'length':
      return { kind, receiver: exprOf(rest[0]) };
    case 'codepoints':
      return { kind, receiver: exprOf(rest[0]) };
    case 'class-test': {
      const boolean = head => {const value=field(link,head)?.[1];if(!['true','false'].includes(value))throw new Error(`invalid class-test ${head}`);return value==='true';};
      return { kind, unicode:boolean('unicode'), negated:boolean('negated'), anchored:boolean('anchored'), ranges:(field(link,'ranges')??[]).slice(1).map(range=>({low:Number(range[0]),high:Number(range[1])})), receiver:exprOf(field(link,'receiver')[1]) };
    }
    case 'call':
    case 'builtin':
      return { kind, name: rest[0], args: rest.slice(1).map(exprOf) };
    default:
      throw new Error(`unknown meta expression ${kind}`);
  }
}
