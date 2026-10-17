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

import {isDeepStrictEqual} from 'node:util';
import {parseJavaScriptItem} from './frontends.mjs';
import {lex,topLevelItems} from './lexer.mjs';
import {readLexicalEnvironment,reissueLexicalEnvironment,lexicalClosureName} from './lexical-environments.mjs';
import { constructMap, refuse } from './constructs.mjs';
import { encodeWord, field, parseLinks, textOf, writeLink } from './lino.mjs';
import {encodeConstructorProofWord} from './constructor-proof-encoding.mjs';
import { constantValue } from './constants.mjs';
import { guardedScope } from './guards.mjs';
import { optionalType, joinReturnTypes, closedReturnType } from './return-types.mjs';
import { validateCharacterClass } from './character-classes.mjs';
import {validateSequencePattern} from './sequence-patterns.mjs';
import {checkSourceCalls,isOriginalSourceCallCheck,sourceCallItem} from './source-calls.mjs';
import { staticTableType,mapValueType } from './static-tables.mjs';
import { recordType,recordShape,errorType,errorShape,canLiftValue,payloadBoundary } from './aggregates.mjs';
import { checkClosedJson,jsonResponseStatus,closedJsonValue,utf16Link,utf16Of } from './json-responses.mjs';
import {sourceConstructorItem,isOriginalConstructorBodyCheck,checkOriginalConstructorBody} from './constructor-bodies.mjs';
import {reissueImportedErrorConstructor,originalImportedErrorConstructor} from './source-constructors.mjs';

import {isOwnedCoreItem,checkOwnedCoreItem,withOwnedCoreItemChecks} from '../owned-core-operations.mjs';

export const FRAGMENT = 'portable-router-v1';
function callableOf(type){if(typeof type!=='string'||!type.startsWith('callable:'))return null;return JSON.parse(type.slice(9));}

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
  if (last.kind === 'return'||last.kind==='throw') return true;
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
      if (['return','throw'].includes(statement.kind) && index < body.length - 1) refuse('unsupported', 'a statement after '+statement.kind);
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
    then: [{ kind: statement.kind, value: value.then }],
    else: [{ kind: statement.kind, value: value.else }],
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
// Reconstruct the body from privately reissued original source. Environment
// metadata is provenance, never an authority to supply values or narrower types.
export function lowerSourceClosure(handle,name) {
  canonicalRustName(name);
  if(name!==lexicalClosureName(handle))refuse('collection','a foreign closure source identity');
  const environment=readLexicalEnvironment(handle),source=environment.wrapper(camelFromSnake(name));
  const raw=topLevelItems(lex(source,'JavaScript')).filter(item=>!item.comment);
  if(raw.length!==1)refuse('collection','a noncanonical original closure wrapper');
  let parsed=parseJavaScriptItem(raw[0].tokens,'',{source,...(environment.callbackInputs?{callbackInputs:environment.callbackInputs}:{})});
  const collection=environment.proof.schema==='original-lexical-primitive-collection-environment-v1';
  if(collection) {
    // This substitution runs only after private source-symbol/escape issuance.
    // Public metadata never supplies the receiver binding or literal values.
    const captures=new Map(environment.proof.collections.map(value=>[snakeFromCamel(value.name),value]));
    const lower=value=>{
      if(!value||typeof value!=='object')return value;
      if(Array.isArray(value))return value.map(lower);
      const receiver=value.kind==='table-has'?value.name:value.kind==='method'&&value.name==='includes'&&value.receiver?.kind==='variable'?value.receiver.name:null;
      const capture=captures.get(receiver);
      if(capture&&((value.kind==='table-has'&&capture.kind==='set')||(value.kind==='method'&&capture.kind==='array'&&value.args.length===1)))return {kind:'primitive-membership',values:capture.values,argument:lower(value.kind==='table-has'?value.argument:value.args[0])};
      return Object.fromEntries(Object.entries(value).map(([key,child])=>[key,lower(child)]));
    };
    parsed={...parsed,body:lower(parsed.body)};
  }
  const checked=check({...parsed,lossless:true},new Map());
  const count=collection?0:environment.proof.captures.length;
  return {...checked,kind:'closure',captures:checked.params.slice(0,count),params:checked.params.slice(count),environment:environment.proof,...(collection?{conditionalCaptures:true}:{})};
}
export function check(item, table) {
  if(isOwnedCoreItem(item))return checkOwnedCoreItem(item);
  if(sourceConstructorItem(item)&&!isOriginalConstructorBodyCheck(item))return checkOriginalConstructorBody(item);
  if(sourceCallItem(item))return checkSourceCalls(item);
  if(item.conditionalCalls&&!isOriginalSourceCallCheck(item))refuse('collection','a conditional call without privately checked original creation');
  if(!isOriginalSourceCallCheck(item)&&/"kind":"(?:source-create|owned-some)"/u.test(JSON.stringify(item.body)))refuse('collection','a callable creation outside a privately checked original caller');
  if(item.kind==='closure') {
    const expected=lowerSourceClosure(reissueLexicalEnvironment(item.environment),item.name);
    if(!Array.isArray(item.captures)||!isDeepStrictEqual(item.captures,expected.captures)||toLino(item)!==toLino(expected))refuse('collection','a changed source-bound closure body, type or signature');
    return expected;
  }
  if(item.conditionalCaptures)refuse('collection','a conditional capture without private original closure issuance');
  const map = constructMap();
  canonicalRustName(item.name);
  for (const param of item.params ?? []) canonicalRustName(param.name);
  if(item.conditionalInputs&&(!item.lossless||item.exported||item.params?.length!==1||!['utf16-string','entry-value'].includes(item.params[0].type)))refuse('collection','an inconsistent conditional private input capability');
  if(item.exported&&item.params?.some(param=>['utf16-string','entry-value'].includes(param.type)))refuse('collection','an exported UTF16 parameter lacks a closed private call contract');
  if(item.params?.some((param,index)=>param.rest&&(param.type!=='array-value'||index!==item.params.length-1||param.default)))refuse('type','an inconsistent rest parameter contract');
  if (item.params?.some((param,index) => !['number', 'string', 'boolean', 'value','utf16-string','entry-value'].includes(param.type) && !(param.type==='array-value'&&param.rest&&index===item.params.length-1))) refuse('untyped', 'nullable and aggregate types are return contracts only');
  for (const type of item.kind === 'function' ? [...item.params.map((param) => param.type), ...(item.returns ? [item.returns] : [])] : [item.type]) {
    if (!map.types.has(type)&&type!=='array-value'&&!recordShape(type)&&!errorShape(type)) refuse('untyped', type);
  }
  if (item.kind === 'constant') {
    if(['table-set','table-map'].includes(item.value.kind)) {
      if(item.exported)refuse('collection','a table exposed outside the checked module');
      const primitive=value=>{
        const checked=expression(value,new Map(),table);
        if(!['number','string','boolean'].includes(checked.type)||typeof constantValue(checked)!==checked.type)refuse('collection','a non-closed primitive table entry');
        return checked;
      };
      const entries=item.value.kind==='table-set'?item.value.entries.map(primitive):item.value.entries.map(entry=>({key:primitive(entry.key),value:primitive(entry.value)}));
      const type=staticTableType(item.value.kind,entries);
      if(type!==item.type)refuse('type','an inconsistent static table type');
      return {...item,value:{...item.value,entries,type}};
    }
    const value = expression(item.value, new Map(), table);
    if (typeof constantValue(value) !== item.type || value.type !== item.type) refuse('type', item.name);
    return { ...item, value };
  }
  for(const param of item.params){if(param.type==='entry-value'){if(!item.conditionalInputs||!item.lossless||param.rest||param.default||!Array.isArray(param.bindings)||param.bindings.length<1||param.bindings.length>2||param.bindings.some(binding=>binding!==null&&typeof binding!=='string'))refuse('collection','an inconsistent private entry parameter');for(const binding of param.bindings)if(binding!==null)canonicalRustName(binding);}else if(param.bindings)refuse('collection','entry bindings on an inconsistent parameter type');}
  const bindings=item.params.flatMap(param=>[param.name,...(param.bindings??[]).filter(name=>name!==null)]);
  if(new Set(bindings).size!==bindings.length)refuse('name','duplicate parameter or entry binding');
  const params=item.params.map(param=>{
    if(!param.default)return param;
    const value=expression(param.default,new Map(),table);
    if(!['null','undefined'].includes(value.kind))constantValue(value);
    if(param.type==='value'?!canLiftValue(value):param.type==='utf16-string'?value.type!=='string'||value.kind!=='string':value.type!==param.type)refuse('type','an inconsistent closed parameter default');
    return {...param,default:value};
  });
  if(item.lossless&&item.params.some(param=>param.type==='string'))refuse('collection','a scalar string input in a lossless function');
  const scope = new Map(item.params.map((param) => [param.name, param.type]));
  scope.lossless=item.lossless===true;
  for(const param of item.params)if(param.bindings)param.bindings.forEach((name,index)=>{if(name!==null)scope.set(name,index===0?'utf16-string':'value');});
  let inferredReturn = item.returns;
  const block = (body, names, mutable = new Set()) => body.map((statement) => {
    if (statement.kind === 'let') {
      canonicalRustName(statement.name);
      if (names.has(statement.name)) refuse('name', `shadowed or duplicate binding ${statement.name}`);
      const value = expression(statement.value, names, table);
      if(item.lossless&&value.type==='utf16-string'&&!value.borrowed)refuse('collection','an unimplemented owned UTF16 local boundary');
      names.set(statement.name, value.type);
      if (statement.mutable) mutable.add(statement.name);
      return { ...statement, mutable:Boolean(statement.mutable), value };
    }
    if (statement.kind === 'assign') {
      canonicalRustName(statement.name);
      if (!mutable.has(statement.name)) refuse('mutable', statement.name);
      const value = expression(statement.value, names, table);
      if (value.type !== names.get(statement.name)) refuse('type', statement.name);
      if(item.lossless&&value.type==='utf16-string'&&!value.borrowed)refuse('collection','an unimplemented owned UTF16 assignment boundary');
      return { ...statement, value };
    }
    if(statement.kind==='throw') {
      if(!isOriginalConstructorBodyCheck(item)||!item.conditionalConstructors)refuse('collection','an unqualified abrupt constructor completion');
      const value=expression(statement.value,names,table);
      if(value.type!=='source-error')refuse('type','throw without its original imported Error constructor');
      return {...statement,value};
    }
    if (statement.kind === 'return') {
      const value = expression(statement.value, names, table);
      if (!closedReturnType(value.type)) refuse('untyped', 'a dynamic return value without a closed primitive contract');
      const combined = joinReturnTypes(inferredReturn, value.type);
      if (!combined || item.returns && combined !== item.returns) refuse('type', `returns ${value.type}, not ${inferredReturn}`);
      if(combined==='value'&&!canLiftValue(value))refuse('type','a dynamic return borrowing a temporary primitive');
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
  const verifyLifts=statements=>{for(const statement of statements){if(statement.kind==='return'&&inferredReturn==='value'&&!canLiftValue(statement.value))refuse('type','a return borrowing a temporary primitive');if(statement.then)verifyLifts(statement.then);if(statement.else)verifyLifts(statement.else);if(statement.body)verifyLifts(statement.body);}};
  verifyLifts(body);
  const checked={...item,params,returns:inferredReturn,body},payload=payloadBoundary(checked);
  const capabilities=node=>{
    if(!node||typeof node!=='object')return;
    if(node.kind==='call') {
      if(node.callable){for(const arg of node.args)capabilities(arg);return;}
      const callee=table.get(node.name);
      if(callee.conditionalConstructors)refuse('collection','a constructor completion crossing an unimplemented caller boundary');
      if(callee.conditionalInputs&&!item.conditionalInputs)refuse('collection','an unqualified conditional private callback boundary');
      if(callee.conditionalCalls&&!item.conditionalCalls)refuse('collection','an unqualified original Array.some intrinsic boundary');
      const proved=callee.body.every(statement=>statement.value?.type||statement.cond?.type);
      if(proved&&callee.params.some(param=>param.type==='value')&&payloadBoundary(callee)!==payload)refuse('collection','a lossless payload/scalar observer call boundary');
    }
    if(item.lossless&&['table-get','table-has','table-size'].includes(node.kind))refuse('collection','an unimplemented lossless/static-table observer boundary');
    if(payload&&!item.lossless&&(node.projection||['typeof','includes','primitive-membership','table-get','table-has'].includes(node.kind)||node.kind==='builtin'&&node.args?.some(arg=>arg.type==='value')))refuse('collection','an unimplemented observation of a lossless payload');
    for(const child of Object.values(node))if(Array.isArray(child))child.forEach(capabilities);else capabilities(child);
  };
  const jsonProjection=JSON.stringify(body).includes('"type":"json-response"');
  if(jsonProjection&&(item.params.length||payload))refuse('collection','a JSON Response input or payload capability boundary');
  capabilities(body);
  return checked;
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
  if(operand.type==='utf16-string'&&!names.lossless)refuse('collection','an unimplemented scalar UTF16 truthiness boundary');
  if (!['number', 'string','utf16-string', 'null', 'undefined'].includes(operand.type)) refuse('type', 'a condition without a closed primitive truthiness contract');
  return { kind: 'truthy', operand, type: 'boolean' };
}

function expression(expr, names, table) {
  const map = constructMap();
  const typed = (fields, type) => ({ ...expr, ...fields, type });
  switch (expr.kind) {
    case 'source-error': {
      originalImportedErrorConstructor(reissueImportedErrorConstructor(expr.constructor));
      return typed({},'source-error');
    }
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
        return type.startsWith('value:') ? names.lossless&&type==='value:string'?typed({projection:'utf16-string',borrowed:true},'utf16-string'):typed({ projection: type.slice(6) }, type.slice(6)) : typed(type==='utf16-string'&&names.lossless?{borrowed:true}:{}, type);
      }
      const item = table.get(expr.name);
      if (item && item.kind === 'constant') return typed({}, item.type);
      return refuse('unsupported', `the free name ${expr.name}`);
    }
    case 'binary': {
      const row = map.operators.get(expr.op);
      const left = expression(expr.left, names, table);
      const right = expression(expr.right, expr.op === 'and' ? guardedScope(expr.left, names, true) : expr.op === 'or' ? guardedScope(expr.left, names, false) : names, table);
      if(['and','or'].includes(expr.op)&&left.type==='boolean'&&right.type!=='boolean'&&names.lossless&&canLiftValue(right))return typed({kind:'logical',left,right},'value');
      if(left.type==='value'||right.type==='value') {
        if(!['equal','not-equal'].includes(expr.op)||![left,right].some(value=>value.type==='value')||[left,right].some(value=>value.type==='value'?false:!['string','number','boolean','null','undefined'].includes(value.type)||!canLiftValue(value)))refuse('untyped','dynamic values need a proven primitive typeof guard');
        // Reference equality and arbitrary primitive coercion remain outside
        // this fragment: at least one operand must be a primitive observation.
        if(left.type==='value'&&right.type==='value')refuse('untyped','dynamic reference comparisons');
        return typed({left,right,primitiveComparison:true},'boolean');
      }
      if(names.lossless&&['equal','not-equal'].includes(expr.op)&&[left,right].some(value=>value.type==='utf16-string')&&[left,right].every(value=>value.type==='utf16-string'||value.kind==='string'))return typed({left,right,utf16Comparison:true},'boolean');
      if(row.operands==='any'&&!['number','string','boolean','null','undefined'].includes(left.type))refuse('collection','an unimplemented projected reference or UTF16 comparison');
      if (expr.op === 'add' && left.type === 'string' && right.type === 'string') return typed({ left, right }, 'string');
      if (row.operands === 'any' ? left.type !== right.type : left.type !== row.operands || right.type !== row.operands) {
        return refuse(left.type === 'string' && expr.op === 'add' ? 'concatenation' : 'type', `${expr.op} of ${left.type} and ${right.type}`);
      }
      return typed({ left, right }, row.yields);
    }
    case 'unary': {
      const row = map.unaries.get(expr.op);
      const operand = expr.op==='not'?condition(expr.operand,names,table):expression(expr.operand, names, table);
      if (operand.type !== row.operand) refuse('type', `${expr.op} of ${operand.type}`);
      return typed({ operand }, row.yields);
    }
    case 'typeof': {
      const operand = expression(expr.operand, names, table);
      if (optionalType(operand.type)) refuse('type', 'typeof a nullable return value');
      if(operand.type==='utf16-string'&&!names.lossless||['array-value','entry-value','json-response'].includes(operand.type)||recordShape(operand.type)||errorShape(operand.type))refuse('collection','an unimplemented scalar observation of a projected aggregate or UTF16 contract');
      return typed({ operand }, 'string');
    }
    case 'truthy': {
      const operand = expression(expr.operand, names, table);
      if(operand.type==='utf16-string'&&!names.lossless)refuse('collection','an unimplemented scalar UTF16 truthiness boundary');
      if (!['number', 'string','utf16-string', 'boolean', 'null', 'undefined'].includes(operand.type)) refuse('type', 'truthiness of a dynamic value');
      return typed({ operand }, 'boolean');
    }
    case 'primitive-membership':
    case 'includes': {
      if(expr.kind==='primitive-membership'&&(!Array.isArray(expr.values)||expr.values.length>256))refuse('collection','an oversized or malformed primitive membership');
      const values = expr.values.map(value => expression(value, names, table));
      for (const value of values) {
        if (!['number', 'boolean', 'string'].includes(value.type) || typeof constantValue(value) !== value.type) refuse('collection', 'non-closed primitive includes elements');
        if(expr.kind==='primitive-membership'&&value.type==='number'&&!Number.isFinite(constantValue(value)))refuse('collection','nonfinite primitive membership literals');
      }
      const argument = expression(expr.argument, names, table);
      if (!['number', 'string','utf16-string', 'boolean', 'value', 'null', 'undefined'].includes(argument.type)) refuse('collection', 'includes of an unsupported nullable argument');
      if(names.lossless&&argument.type==='string')refuse('collection','an unimplemented scalar string membership in a lossless function');
      return typed({ values, argument }, 'boolean');
    }
    case 'choose': {
      const cond = condition(expr.cond, names, table);
      const then = expression(expr.then, guardedScope(expr.cond, names, true), table);
      const otherwise = expression(expr.else, guardedScope(expr.cond, names, false), table);
      const type = joinReturnTypes(then.type, otherwise.type);
      if (!type) refuse('type', 'a conditional expression');
      if(type==='value'&&![then,otherwise].every(canLiftValue))refuse('type','a conditional borrowing a temporary primitive');
      return typed({ cond, then, else: otherwise }, type);
    }
    case 'array': {
      if(expr.values.length>256)refuse('collection','an oversized fresh array');
      const values=expr.values.map(value=>expression(value,names,table));
      if(!values.every(canLiftValue))refuse('collection','array elements without identity-preserving value lifts');
      return typed({values},'array-value');
    }
    case 'record': {
      if(expr.fields.length>64)refuse('collection','an oversized fresh record');
      const keys=new Set();
      const fields=expr.fields.map(field=>{
        snakeFromCamel(field.name);
        if(keys.has(field.name))refuse('collection','duplicate record fields');keys.add(field.name);
        const value=expression(field.value,names,table);
        if(value.type==='json-response')refuse('collection','a JSON Response embedded payload boundary');
        if(!closedReturnType(value.type))refuse('collection','an unproved record field value');
        if((value.type==='string'&&value.kind!=='string')||/^(?:optional|nullable)-string$/u.test(value.type))refuse('collection','a scalar string field without a lossless payload bridge');
        return {name:field.name,value};
      });
      return typed({fields},recordType(fields));
    }
    case 'json-response': {
      const body=checkClosedJson(expr.body),options=expr.options===null?null:checkClosedJson(expr.options);
      jsonResponseStatus(options);
      if(Buffer.byteLength(JSON.stringify(closedJsonValue(body)),'utf8')>262144)refuse('collection','an oversized JSON Response body');
      return typed({body,options},'json-response');
    }
    case 'error': {
      const message=expression(expr.message,names,table);
      if(!(message.type==='utf16-string'||message.type==='string'&&message.kind==='string'))refuse('collection','Error message coercion without a proved UTF16 string contract');
      const forbidden=new Set(['__proto__','prototype','constructor','message','name','stack','toString','valueOf','toJSON']);
      if(expr.fields.length>64)refuse('collection','oversized Error own fields');
      const keys=new Set(),fields=expr.fields.map(field=>{
        if(forbidden.has(field.name)||keys.has(field.name))refuse('collection','Error fields invoking special or duplicate property behavior');keys.add(field.name);snakeFromCamel(field.name);
        const value=expression(field.value,names,table);
        if(!['value','number','boolean','null','undefined'].includes(value.type)&&!(value.type==='string'&&value.kind==='string'))refuse('collection','an unimplemented Error field observation or scalar bridge');
        return {name:field.name,value};
      });
      return typed({message,fields},errorType(fields));
    }
    case 'logical': {
      const left=expression(expr.left,names,table),right=expression(expr.right,guardedScope(expr.left,names,expr.op==='and'),table);
      if(!names.lossless||!['and','or'].includes(expr.op)||left.type!=='boolean'||!canLiftValue(right))refuse('type','an unproved mixed primitive short circuit');
      return typed({left,right},'value');
    }
    case 'call': {
      canonicalRustName(expr.name);
      const callable=callableOf(names.get(expr.name));
      if(callable){
        const args=expr.args.map(arg=>expression(arg,names,table));
        if(args.length!==callable.params.length||args.some((arg,index)=>callable.params[index].type!=='value'||!canLiftValue(arg)))refuse('collection','an unproved direct lexical callable argument');
        return typed({args,callable},callable.returns);
      }
      const callee = table.get(expr.name);
      if (!callee || callee.kind !== 'function') return refuse('unknown-call', expr.name);
      if(callee.params.some(param=>param.type==='entry-value'))refuse('collection','an unimplemented private entry call boundary');
      if(callee.params.some(param=>param.rest))refuse('collection','an unimplemented source call to a rest function');
      if (!callee.returns) refuse('untyped', `an unresolved inferred return contract for ${expr.name}`);
      const args = expr.args.map((arg) => expression(arg, names, table));
      while(args.length<callee.params.length&&callee.params.slice(args.length).every(param=>param.default))args.push({kind:'undefined',type:'undefined'});
      if (args.length !== callee.params.length || args.some((arg, index) => {
        const param=callee.params[index];
        return arg.type!==param.type&&!(arg.type==='undefined'&&param.default)&&!(param.type==='value'&&payloadBoundary(callee)&&canLiftValue(arg))&&!(param.type==='utf16-string'&&arg.kind==='string');
      })) {
        refuse('type', `the arguments of ${expr.name}`);
      }
      return typed({ args }, callee.returns);
    }
    case 'source-create': {
      const handle=reissueLexicalEnvironment(expr.environment),closure=lowerSourceClosure(handle,lexicalClosureName(handle));
      const captures=expr.captures.map(arg=>expression(arg,names,table));
      if(!expr.environment.sourceCreation||captures.length!==closure.captures.length||captures.some((arg,index)=>arg.kind!=='variable'||arg.name!==closure.captures[index].name||!canLiftValue(arg)))refuse('collection','an unproved original callable capture evaluation');
      return typed({captures,closure},'callable:'+JSON.stringify(closure));
    }
    case 'owned-some': {
      const callback=expression(expr.callback,names,table),closure=callableOf(callback.type);
      const values=expr.values.map(value=>expression(value,names,table));
      if(!closure||closure.params.length!==1||closure.params[0].type!=='value'||closure.returns!=='boolean'||values.length>256||values.some(value=>!['string','number','boolean'].includes(value.type)||value.kind!==value.type||typeof constantValue(value)!==value.type))refuse('collection','owned some requires a boolean callback and dense closed primitive inputs');
      return typed({values,callback},'boolean');
    }
    case 'builtin': {
      const row = map.builtins.get(expr.name);
      const args = expr.args.map((arg) => expression(arg, names, table));
      if(args.some(arg=>arg.type==='utf16-string')&&!names.lossless)refuse('collection','an unimplemented scalar UTF16 builtin boundary');
      if (args.length !== row.arguments.length || args.some((arg, index) => arg.type !== row.arguments[index] && !(arg.type === 'value' && ['safe-integer', 'finite', 'nan'].includes(expr.name))&&!(expr.name==='utf8-length'&&arg.type==='utf16-string'))) refuse('type', expr.name);
      return typed({ args }, row.yields);
    }
    case 'method': {
      const row = map.methods.get(expr.name);
      const receiver = expression(expr.receiver, names, table);
      const args = expr.args.map((arg) => expression(arg, names, table));
      if(receiver.type==='utf16-string') {
        if(!names.lossless)refuse('collection','an unimplemented scalar UTF16 method boundary');
        if(!['trim','starts-with','ends-with','includes'].includes(expr.name)||args.length!==row.arguments.length||args.some(arg=>arg.type!=='utf16-string'&&!(arg.type==='string'&&arg.kind==='string')))refuse('type','an unimplemented lossless string method');
        return typed({receiver,args,...(expr.name==='trim'?{borrowed:receiver.borrowed===true}:{})},expr.name==='trim'?'utf16-string':'boolean');
      }
      if (receiver.type !== row.receiver || args.length !== row.arguments.length || args.some((arg, index) => arg.type !== row.arguments[index])) {
        refuse('type', expr.name);
      }
      return typed({ receiver, args }, row.yields);
    }
    case 'length': {
      const receiver = expression(expr.receiver, names, table);
      if(receiver.type==='utf16-string'&&!names.lossless)refuse('collection','an unimplemented scalar UTF16 observation boundary');
      if (!['string','utf16-string'].includes(receiver.type)) refuse('type', 'length of a non-string');
      return typed({ receiver }, 'number');
    }
    case 'codepoints': {
      const receiver = expression(expr.receiver, names, table);
      if(receiver.type==='utf16-string'&&!names.lossless)refuse('collection','an unimplemented scalar UTF16 observation boundary');
      if (!['string','utf16-string'].includes(receiver.type)) refuse('type', 'codepoint iteration of a non-string');
      return typed({ receiver }, 'number');
    }
    case 'sequence-test':
    case 'class-test': {
      if(expr.kind==='sequence-test')validateSequencePattern(expr);else validateCharacterClass(expr);
      const receiver = expression(expr.receiver, names, table);
      if(receiver.type==='utf16-string'&&!names.lossless)refuse('collection','an unimplemented scalar UTF16 observation boundary');
      if (!['string','utf16-string'].includes(receiver.type)) refuse('type', 'a regex test requiring coercion of a non-string');
      return typed({ receiver }, 'boolean');
    }
    case 'table-get':case 'table-has':case 'table-size': {
      canonicalRustName(expr.name);
      if(names.has(expr.name))refuse('collection','a shadowed table binding');
      const declared=table.get(expr.name);
      if(!declared||declared.kind!=='constant'||!['table-set','table-map'].includes(declared.value.kind))refuse('collection','a read without a source-owned static table');
      const valueType=mapValueType(declared.type);
      if(expr.kind==='table-get'&&!valueType)refuse('collection','get requires a closed Map');
      if(expr.kind==='table-size')return typed({},'number');
      const argument=expression(expr.argument,names,table);
      if(!['number','string','boolean','null','undefined','value'].includes(argument.type))refuse('collection','a table key without a closed observation contract');
      return typed({argument},expr.kind==='table-get'?`optional-${valueType}`:'boolean');
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
  if(isOwnedCoreItem(item))return writeLink(['owned-function',encodeConstructorProofWord(JSON.stringify(checkOwnedCoreItem(item)))]);
  const flag = item.exported ? [['exported']] : [];
  if (item.kind === 'constant') return writeLink(['constant', item.name, ...flag, ['type', item.type], ['value', linkOf(item.value)]]);
  return writeLink([
    item.kind==='closure'?'closure':'function',
    item.name,
    ...(item.sourceCalls?[['source-calls',encodeWord(JSON.stringify(item.sourceCalls))]]:[]),
    ...(item.conditionalCalls?[['conditional-calls']]:[]),
    ...(item.sourceConstructors?[['source-constructors',encodeConstructorProofWord(JSON.stringify(item.sourceConstructors))]]:[]),
    ...(item.conditionalConstructors?[['conditional-constructors']]:[]),
    ...(item.kind==='closure'?[['environment',encodeWord(JSON.stringify(item.environment))],['captures',...item.captures.map(capture=>[capture.name,capture.type])]]:[]),
    ...flag,
    ...(item.lossless?[['lossless']]:[]),
    ...(item.conditionalInputs?[['conditional-inputs']]:[]),
    ...(item.conditionalCaptures?[['conditional-captures']]:[]),
    ['parameters', ...item.params.map((param) => [param.name, param.type,...(param.bindings?[['bindings',...param.bindings.map(name=>name??'_')]]:[]),...(param.rest?[['rest']]:[]),...(param.default?[['default',linkOf(param.default)]]:[])])],
    ['returns', encodeWord(item.returns)],
    ['body', ...item.body.map(statementLink)],
  ]);
}

function statementLink(statement) {
  if (statement.kind === 'let') return [statement.mutable ? 'mutable' : 'let', statement.name, linkOf(statement.value)];
  if (statement.kind === 'assign') return ['assign', statement.name, linkOf(statement.value)];
  if (statement.kind === 'while') return ['while', linkOf(statement.cond), ['body', ...statement.body.map(statementLink)]];
  if (statement.kind === 'return') return ['return', linkOf(statement.value)];
  if (statement.kind === 'throw') return ['throw', linkOf(statement.value)];
  const link = ['if', linkOf(statement.cond), ['then', ...statement.then.map(statementLink)]];
  if (statement.else !== null) link.push(['else', ...statement.else.map(statementLink)]);
  return link;
}

function linkOf(expr) {
  switch (expr.kind) {
    case 'source-error':return ['source-error',encodeConstructorProofWord(JSON.stringify(expr.constructor))];
    case 'source-create':return ['source-create',['environment',encodeWord(JSON.stringify(expr.environment))],['captures',...expr.captures.map(linkOf)]];
    case 'owned-some':return ['owned-some',['values',...expr.values.map(linkOf)],['callback',linkOf(expr.callback)]];
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
    case 'logical':return ['logical',expr.op,linkOf(expr.left),linkOf(expr.right)];
    case 'binary':
      return ['binary', expr.op, linkOf(expr.left), linkOf(expr.right)];
    case 'unary':
      return ['unary', expr.op, linkOf(expr.operand)];
    case 'typeof':
      return ['typeof', linkOf(expr.operand)];
    case 'truthy':
      return ['truthy', linkOf(expr.operand)];
    case 'primitive-membership':
    case 'includes':
      return [expr.kind, ['values', ...expr.values.map(linkOf)], ['argument', linkOf(expr.argument)]];
    case 'choose':
      return ['choose', linkOf(expr.cond), linkOf(expr.then), linkOf(expr.else)];
    case 'method':
      return ['method', expr.name, linkOf(expr.receiver), ...expr.args.map(linkOf)];
    case 'length':
      return ['length', linkOf(expr.receiver)];
    case 'codepoints':
      return ['codepoints', linkOf(expr.receiver)];
    case 'sequence-test':
      return ['sequence-test',['unicode',String(expr.unicode)],['atoms',...expr.atoms.map(atom=>['atom',['negated',String(atom.negated)],['minimum',String(atom.minimum)],['maximum',atom.maximum===null?'unbounded':String(atom.maximum)],['ranges',...atom.ranges.map(range=>[String(range.low),String(range.high)])]])],['receiver',linkOf(expr.receiver)]];
    case 'class-test':
      return ['class-test', ['unicode', String(expr.unicode)], ['negated', String(expr.negated)], ['anchored', String(expr.anchored)], ['ranges', ...expr.ranges.map(range=>[String(range.low), String(range.high)])], ['receiver', linkOf(expr.receiver)]];
    case 'table-set':return ['table-set',...expr.entries.map(linkOf)];
    case 'array':return ['array',...expr.values.map(linkOf)];
    case 'record':return ['record',...expr.fields.map(field=>['field',encodeWord(field.name),linkOf(field.value)])];
    case 'json-response':return ['json-response',['body',linkOf(expr.body)],['options',...(expr.options?[linkOf(expr.options)]:[])]];
    case 'json-string':return ['json-string',utf16Link(expr.value)];
    case 'json-number':return ['json-number',expr.text];
    case 'json-boolean':return ['json-boolean',String(expr.value)];
    case 'json-null':return ['json-null'];
    case 'json-array':return ['json-array',...expr.values.map(linkOf)];
    case 'json-record':return ['json-record',...expr.fields.map(field=>['field',utf16Link(field.name),linkOf(field.value)])];
    case 'error':return ['error',['message',linkOf(expr.message)],...expr.fields.map(field=>['field',encodeWord(field.name),linkOf(field.value)])];
    case 'table-map':return ['table-map',...expr.entries.map(entry=>['entry',linkOf(entry.key),linkOf(entry.value)])];
    case 'table-size':return ['table-size',expr.name];
    case 'table-get':case 'table-has':return [expr.kind,expr.name,linkOf(expr.argument)];
    default:
      return [expr.kind, expr.name, ...expr.args.map(linkOf)];
  }
}

// Complete owned-program encoding keeps row checking/encoding interleaved.
// The standalone toLino contract and all ordinary portable rows stay unchanged.
export function toOwnedCoreLinoProgram(program){
  return withOwnedCoreItemChecks(check=>program.map(item=>writeLink(['owned-function',encodeConstructorProofWord(JSON.stringify(check(item)))])));
}

/**
 * The items of a meta document: every `function` and `constant` link.
 * @param {string} text
 * @returns {Array<object>}
 */
export function fromLino(text) {
  return parseLinks(text).filter((link) => ['function','constant','closure','owned-function'].includes(link[0])).map(itemOf);
}

function itemOf(link) {
  if(link[0]==='owned-function'){if(link.length!==2)throw Error('invalid owned meta fields');const item=JSON.parse(textOf(link[1]));if(!isOwnedCoreItem(item))throw Error('invalid owned meta kind');return item;}
  const exported = Boolean(field(link, 'exported'));
  if (link[0] === 'constant') {
    return { kind: 'constant', name: link[1], exported, type: field(link, 'type')[1], value: exprOf(field(link, 'value')[1]) };
  }
  return {
    kind: link[0],
    ...(field(link,'source-calls')?{sourceCalls:JSON.parse(textOf(field(link,'source-calls')[1]))}:{}),
    ...(field(link,'conditional-calls')?{conditionalCalls:true}:{}),
    ...(field(link,'source-constructors')?{sourceConstructors:JSON.parse(textOf(field(link,'source-constructors')[1]))}:{}),
    ...(field(link,'conditional-constructors')?{conditionalConstructors:true}:{}),
    ...(link[0]==='closure'?{environment:JSON.parse(textOf(field(link,'environment')[1])),captures:field(link,'captures').slice(1).map(([name,type])=>({name,type}))}:{}),
    name: link[1],
    exported,
    ...(link.some(part=>Array.isArray(part)&&part[0]==='lossless')?{lossless:true}:{}),
    ...(link.some(part=>Array.isArray(part)&&part[0]==='conditional-inputs')?{conditionalInputs:true}:{}),
    ...(link.some(part=>Array.isArray(part)&&part[0]==='conditional-captures')?{conditionalCaptures:true}:{}),
    params: field(link, 'parameters').slice(1).map(([name, type,...flags]) => ({ name, type,...(flags.find(flag=>flag[0]==='bindings')?{bindings:flags.find(flag=>flag[0]==='bindings').slice(1).map(name=>name==='_'?null:name)}:{}),...(flags.some(flag=>flag[0]==='rest')?{rest:true}:{}),...(flags.find(flag=>flag[0]==='default')?{default:exprOf(flags.find(flag=>flag[0]==='default')[1])}:{}) })),
    returns: textOf(field(link, 'returns')[1]),
    body: field(link, 'body').slice(1).map(statementOf),
  };
}

function statementOf(link) {
  if (link[0] === 'let') return { kind: 'let', name: link[1], value: exprOf(link[2]) };
  if (link[0] === 'mutable') return { kind: 'let', name: link[1], value: exprOf(link[2]), mutable: true };
  if (link[0] === 'assign') return { kind: 'assign', name: link[1], value: exprOf(link[2]) };
  if (link[0] === 'while') return { kind: 'while', cond: exprOf(link[1]), body: field(link, 'body').slice(1).map(statementOf) };
  if (link[0] === 'return') return { kind: 'return', value: exprOf(link[1]) };
  if (link[0] === 'throw') return { kind: 'throw', value: exprOf(link[1]) };
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
    case 'source-error':return {kind,constructor:JSON.parse(textOf(rest[0]))};
    case 'source-create':return {kind,environment:JSON.parse(textOf(field(link,'environment')[1])),captures:field(link,'captures').slice(1).map(exprOf)};
    case 'owned-some':return {kind,values:field(link,'values').slice(1).map(exprOf),callback:exprOf(field(link,'callback')[1])};
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
    case 'logical':return {kind,op:rest[0],left:exprOf(rest[1]),right:exprOf(rest[2])};
    case 'binary':
      return { kind, op: rest[0], left: exprOf(rest[1]), right: exprOf(rest[2]) };
    case 'unary':
      return { kind, op: rest[0], operand: exprOf(rest[1]) };
    case 'typeof':
      return { kind, operand: exprOf(rest[0]) };
    case 'truthy':
      return { kind, operand: exprOf(rest[0]) };
    case 'primitive-membership':
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
    case 'sequence-test': {
      const unicode=field(link,'unicode')?.[1];if(!['true','false'].includes(unicode))throw Error('invalid sequence Unicode flag');
      const atoms=field(link,'atoms');if(!atoms)throw Error('missing sequence atoms');
      return {kind,unicode:unicode==='true',atoms:atoms.slice(1).map(atom=>{
        if(atom[0]!=='atom')throw Error('invalid sequence atom');
        const negated=field(atom,'negated')?.[1],maximum=field(atom,'maximum')?.[1];
        if(!['true','false'].includes(negated))throw Error('invalid sequence negation');
        return {negated:negated==='true',minimum:Number(field(atom,'minimum')?.[1]),maximum:maximum==='unbounded'?null:Number(maximum),ranges:(field(atom,'ranges')??[]).slice(1).map(range=>({low:Number(range[0]),high:Number(range[1])}))};
      }),receiver:exprOf(field(link,'receiver')[1])};
    }
    case 'class-test': {
      const boolean = head => {const value=field(link,head)?.[1];if(!['true','false'].includes(value))throw new Error(`invalid class-test ${head}`);return value==='true';};
      return { kind, unicode:boolean('unicode'), negated:boolean('negated'), anchored:boolean('anchored'), ranges:(field(link,'ranges')??[]).slice(1).map(range=>({low:Number(range[0]),high:Number(range[1])})), receiver:exprOf(field(link,'receiver')[1]) };
    }
    case 'table-set':return {kind,entries:rest.map(exprOf)};
    case 'array':return {kind,values:rest.map(exprOf)};
    case 'record':return {kind,fields:rest.map(entry=>({name:textOf(entry[1]),value:exprOf(entry[2])}))};
    case 'json-response':return {kind,body:exprOf(field(link,'body')[1]),options:field(link,'options')[1]?exprOf(field(link,'options')[1]):null};
    case 'json-string':return {kind,value:utf16Of(rest[0])};
    case 'json-number':return {kind,text:rest[0]};
    case 'json-boolean':return {kind,value:rest[0]==='true'};
    case 'json-null':return {kind};
    case 'json-array':return {kind,values:rest.map(exprOf)};
    case 'json-record':return {kind,fields:rest.map(entry=>({name:utf16Of(entry[1]),value:exprOf(entry[2])}))};
    case 'error':return {kind,message:exprOf(field(link,'message')[1]),fields:rest.filter(entry=>entry[0]==='field').map(entry=>({name:textOf(entry[1]),value:exprOf(entry[2])}))};
    case 'table-map':return {kind,entries:rest.map(entry=>({key:exprOf(entry[1]),value:exprOf(entry[2])}))};
    case 'table-size':return {kind,name:rest[0]};
    case 'table-get':case 'table-has':return {kind,name:rest[0],argument:exprOf(rest[1])};
    case 'call':
    case 'builtin':
      return { kind, name: rest[0], args: rest.slice(1).map(exprOf) };
    default:
      throw new Error(`unknown meta expression ${kind}`);
  }
}
