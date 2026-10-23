// The JavaScript and Rust frontends of portable-pure-v1: one top-level item
// (its tokens, with the comments directly before it) to one IR item, or a
// refusal naming the construct map's `carried` row. Both frontends share one
// expression grammar and differ only in the spellings the construct map
// gives each language, which is meta-language's per-language frontend over
// one IR (PR #196, js/src/translation/javascript.js and rust.js).

import { constructMap, idBySpelling, refuse } from './constructs.mjs';
import { camelFromSnake, canonicalRustName, snakeFromCamel } from './ir.mjs';
import { constantValue } from './constants.mjs';
import { parseCharacterClass } from './character-classes.mjs';
import {parseSequencePattern} from './sequence-patterns.mjs';
import { parseClosedJson } from './json-responses.mjs';
import {sourceCallable} from './source-calls.mjs';
import {originalImportedErrorConstructor} from './source-constructors.mjs';

const UNSUPPORTED_BINARY = new Set(['==', '!=', '**', '??', '&', '|', '^', '<<', '>>', '>>>', 'instanceof', 'in', 'as']);
const ASSIGNMENTS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '++', '--', '&&=', '||=', '??=']);
const TRANSPARENT_RUST = new Set(['to_string', 'to_owned', 'as_str', 'clone', 'into']);
const ESCAPES = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', 0: '\0' };

/**
 * A cursor over the non-comment tokens of an item.
 * @param {Array<{type: string, text: string}>} tokens
 */
function cursor(tokens) {
  const list = tokens.filter((token) => token.type !== 'comment');
  let index = 0;
  const self = {
    peek: (ahead = 0) => list[index + ahead] ?? { type: 'end', text: '' },
    next: () => list[index++] ?? { type: 'end', text: '' },
    is: (text, ahead = 0) => self.peek(ahead).text === text && self.peek(ahead).type !== 'string',
    eat: (text) => {
      if (!self.is(text)) return false;
      index += 1;
      return true;
    },
    expect: (text) => {
      if (!self.eat(text)) refuse('unsupported', `${JSON.stringify(self.peek().text)} where ${JSON.stringify(text)} belongs`);
    },
    done: () => index >= list.length,
  };
  return self;
}

/**
 * The term of a top-level item: what it declares, read from its first
 * keywords (`export`, `pub`, attributes and `async` skipped).
 * @param {Array<{type: string, text: string}>} tokens
 * @param {string} language
 * @returns {string}
 */
export function itemTerm(tokens, language) {
  const words = tokens.filter((token) => token.type !== 'comment');
  if (language === 'Rust') {
    if (words[0]?.text === '#') return words[1]?.text === '!' ? 'attribute' : itemTerm(words.slice(attributeEnd(words)), language);
    const rest = words.filter((token, index) => !(index < 4 && ['pub', 'const', 'unsafe', 'async', 'extern'].includes(token.text) && words[index + 1]));
    const head = rest.find((token) => ['fn', 'use', 'struct', 'enum', 'impl', 'trait', 'mod', 'type', 'static', 'macro_rules!'].includes(token.text));
    if (head) return head.text === 'fn' ? 'function' : head.text.replace('!', '');
    return words.some((token) => token.text === 'const') ? 'constant' : 'statement';
  }
  const rest = words[0]?.text === 'export' ? words.slice(1) : words;
  const head = rest[0]?.text === 'async' ? rest[1]?.text : rest[0]?.text;
  if (head === 'function') return 'function';
  if (head === 'import' || words[0]?.text === 'import') return 'import';
  if (head === 'class') return 'class';
  if (head === 'const' && /^[A-Z][A-Z0-9_]+$/u.test(rest[1]?.text ?? '')) return 'constant';
  if (head === 'const' || head === 'let' || head === 'var') return 'binding';
  return words[0]?.text === 'export' ? 'export' : 'statement';
}

function attributeEnd(words) {
  let depth = 0;
  for (let index = 1; index < words.length; index += 1) {
    if (words[index].text === '[') depth += 1;
    if (words[index].text === ']') {
      depth -= 1;
      if (depth === 0) return index + 1;
    }
  }
  return words.length;
}

/**
 * The JSDoc types of `@param {T} name` and `@returns {T}` in `doc`.
 * @param {string} doc
 * @returns {{params: Map<string, string>, returns: string | null}}
 */
function jsdocTypes(doc) {
  const params = new Map();
  for (const match of doc.matchAll(/@param\s+\{([^}]*)\}\s+([A-Za-z_$][\w$]*)/gu)) params.set(match[2], match[1].trim());
  const returns = /@returns?\s+\{([^}]*)\}/u.exec(doc);
  return { params, returns: returns ? returns[1].trim() : null };
}

/**
 * Parse one JavaScript item into portable-pure-v1.
 * @param {Array<object>} tokens the item's tokens
 * @param {string} doc the comments directly before the item
 * @returns {object}
 */
export function parseJavaScriptItem(tokens, doc, { shadowedBuiltins,readOnlyTables,errorContracts,jsonResponses,callbackInputs,source,sourceCalls,sourceConstructors } = {}) {
  const at = cursor(tokens);
  at.source = source;
  at.sourceCalls=sourceCalls===true;
  at.sourceConstructors=sourceConstructors;
  at.shadowedBuiltins = shadowedBuiltins;
  at.errorContracts=errorContracts;
  at.jsonResponses=jsonResponses;
  const term = itemTerm(tokens, 'JavaScript');
  if (term === 'import') refuse('no-definition');
  if (term === 'class') refuse('class');
  if (term === 'statement') refuse('statement');
  const exported = at.eat('export');
  if (at.is('{') || at.is('*') || at.is('default')) refuse('no-definition');
  if (at.is('async')) refuse('async');
  if (at.eat('const')) {
    const name = at.next();
    if (name.type !== 'ident') refuse('unsupported', 'a destructuring binding');
    at.expect('=');
    if(at.is('new')&&['Map','Set'].includes(at.peek(1).text)) {
      const plan=readOnlyTables?.get(name.start);
      if(!plan||plan.reason)refuse('collection',plan?.reason??'a collection without a whole-module read-only ownership proof');
      at.expect('new');const constructor=at.next().text;at.expect('(');at.expect('[');
      const entries=[];
      while(!at.eat(']')) {
        if(constructor==='Map') {
          at.expect('[');const key=expression(at,'JavaScript');at.expect(',');const value=expression(at,'JavaScript');at.eat(',');at.expect(']');entries.push({key,value});
        } else entries.push(expression(at,'JavaScript'));
        if(!at.is(']'))at.expect(',');
      }
      at.expect(')');at.eat(';');if(!at.done())refuse('unsupported',at.peek().text);
      const kind=constructor==='Map'?'table-map':'table-set';
      const types=entries.map(entry=>typeof constantValue(constructor==='Map'?entry.value:entry));
      if(types.some(type=>!['string','number','boolean'].includes(type))||constructor==='Map'&&(!types.length||types.some(type=>type!==types[0])))refuse('collection','a table without uniform closed primitive values');
      return {kind:'constant',name:snakeFromCamel(name.text),exported,type:kind==='table-set'?'table-set':`table-map-${types[0]}`,value:{kind,entries}};
    }
    if (arrowAhead(at)) {
      const types = jsdocTypes(doc);
      const params = [];
      const privatePlan=errorContracts?.bindings.get(name.start);
      const grouped = at.eat('(');
      if (!grouped || !at.eat(')')) {
        do {
          if(at.is('[')&&callbackInputs?.type==='entry-value'&&params.length===0){
            at.expect('[');const bindings=[];while(!at.eat(']')){if(at.eat(',')){bindings.push(null);continue;}const slot=at.next();if(slot.type!=='ident')refuse('collection','a non-identifier private entry binding');bindings.push(snakeFromCamel(slot.text));if(!at.is(']'))at.expect(',');}
            if(JSON.stringify(bindings)!==JSON.stringify(callbackInputs.bindings.map(name=>name===null?null:snakeFromCamel(name))))refuse('collection','private entry binding drift');
            params.push({name:'scoped_entry_at'+callbackInputs.parameter.start,type:'entry-value',bindings});continue;
          }
          const rest=at.eat('...');
          const param = at.next();
          if (param.type !== 'ident') refuse('unsupported', 'a non-identifier arrow parameter');
          if(rest&&(!grouped||!at.is(')')))refuse('unsupported','a non-final rest parameter');
          const fallback=at.eat('=')?closedDefault(at):null;
          const type=callbackInputs?.type==='utf16-string'&&params.length===0?'utf16-string':privatePlan&&!privatePlan.reason&&params.length===privatePlan.message?'utf16-string':rest?'array-value':jsType(types.params.get(param.text));
          params.push({ name: snakeFromCamel(param.text), type, ...(rest?{rest:true}:{}),...(fallback?{default:fallback}:{}) });
        } while (grouped && at.eat(','));
        if (grouped) at.expect(')');
      }
      at.expect('=>');
      const returns=types.returns?jsType(types.returns):null;
      const body = at.is('{') ? completeJavaScriptBody(jsBlock(at),returns) : [{ kind: 'return', value: expression(at, 'JavaScript') }];
      at.eat(';');
      if (!at.done()) refuse('unsupported', at.peek().text);
      return { kind: 'function', name: snakeFromCamel(name.text), exported,...(callbackInputs?{conditionalInputs:true}:{}), params, returns, body };
    }
    // The value is read first, so a computed binding names what it computes.
    const value = expression(at, 'JavaScript');
    at.eat(';');
    if (!at.done()) refuse('unsupported', at.peek().text);
    return { kind: 'constant', name: snakeFromCamel(name.text), exported, type: typeof constantValue(value), value };
  }
  if (at.is('let') || at.is('var')) refuse('mutable');
  at.expect('function');
  if (at.is('*')) refuse('unsupported', 'a generator');
  const jsName = at.next().text;
  const name = snakeFromCamel(jsName);
  const types = jsdocTypes(doc);
  at.expect('(');
  const params = [];
  while (!at.eat(')')) {
    const rest=at.eat('...');
    const param = at.next();
    if (param.type !== 'ident') refuse('unsupported', `the parameter ${param.text}`);
    const fallback=at.eat('=')?closedDefault(at):null;
    if(rest&&!at.is(')'))refuse('unsupported','a non-final rest parameter');
    const type = rest?'array-value':jsType(types.params.get(param.text));
    params.push({ name: snakeFromCamel(param.text), type, ...(rest?{rest:true}:{}),...(fallback?{default:fallback}:{}) });
    if (!at.is(')')) at.expect(',');
  }
  const returns = types.returns ? jsType(types.returns) : null;
  const body = completeJavaScriptBody(jsBlock(at),returns);
  at.eat(';');
  if (!at.done()) refuse('unsupported', at.peek().text);
  return { kind: 'function', name, exported, params, returns, body };
}

function closedDefault(at) {
  const value=expression(at,'JavaScript');
  if(['null','undefined'].includes(value.kind))return value;
  try{constantValue(value);}catch{refuse('unsupported','an effectful or non-closed parameter default');}
  return value;
}

function jsType(written) {
  const id = written === undefined || written === null ? 'value' : idBySpelling(constructMap().types, 'javascript', written);
  if (!id) refuse('untyped', written ?? 'none');
  if(['utf16-string','entry-value'].includes(id))refuse('untyped','UTF16/entry parameter contracts require proved source calls');
  return id;
}

function arrowAhead(at) {
  if (at.peek().type === 'ident' && at.is('=>', 1)) return true;
  if (!at.is('(')) return false;
  let depth = 1, offset = 1;
  while (at.peek(offset).type !== 'end') {
    if (at.is('(', offset)) depth++;
    if (at.is(')', offset) && --depth === 0) return at.is('=>', offset + 1);
    offset++;
  }
  return false;
}

// JavaScript ordinary function completion is undefined. Make it explicit
// before the shared checker; missing/unsupported IR paths remain rejected.
function completeJavaScriptBody(body,declaredReturns) {
  const terminates=statements=>{const last=statements.at(-1);return ['return','throw'].includes(last?.kind)||last?.kind==='if'&&last.else!==null&&terminates(last.then)&&terminates(last.else);};
  if(terminates(body))return body;
  if(declaredReturns!==null&&!['undefined','value'].includes(declaredReturns))refuse('missing-return','normal completion violates the declared nonundefined return contract');
  return [...body,{kind:'return',value:{kind:'undefined'}}];
}

function jsBlock(at) {
  at.expect('{');
  const body = [];
  while (!at.eat('}')) {
    if (at.peek().type === 'end') refuse('unsupported', 'an unclosed block');
    if(at.eat(';'))continue;
    body.push(jsStatement(at));
  }
  return body;
}

function jsStatementBody(at) {
  if(at.is('{'))return jsBlock(at);
  // A lexical declaration is a StatementListItem, not an unbraced Statement.
  if(at.is('const')||at.is('let'))refuse('unsupported','a lexical declaration in an unbraced statement');
  return [jsStatement(at)];
}

function jsStatement(at) {
  const token = at.peek();
  if(at.eat('throw')) {
    if(typeof at.source!=='string'||/[\n\r\u2028\u2029]/u.test(at.source.slice(token.end,at.peek().start)))refuse('unsupported','a line terminator after throw');
    // Preserve legacy unqualified throw diagnostics before an unproved operand
    // can produce a different refusal. A context is never proof by itself.
    if(!at.sourceConstructors)refuse('unsupported','throw without a source-issued constructor capability');
    const value=expression(at,'JavaScript');
    if(value.kind!=='source-error')refuse('collection','throw without a source-issued constructor capability');
    if(!at.eat(';')&&!at.is('}'))at.expect(';');
    return {kind:'throw',value};
  }
  if (at.is('const') || at.is('let')) {
    const mutable = at.next().text === 'let';
    const name = snakeFromCamel(at.next().text);
    at.expect('=');
    const value = expression(at, 'JavaScript');
    at.expect(';');
    return { kind: 'let', name, value, mutable };
  }
  if (at.eat('return')) {
    // Restricted-production ASI observes the original gap, including comments
    // and every ECMAScript line terminator. A following expression statement
    // remains subject to the existing statement/after-return refusals.
    const lineBreak=typeof at.source==='string'&&Number.isSafeInteger(token.end)&&Number.isSafeInteger(at.peek().start)&&/[\n\r\u2028\u2029]/u.test(at.source.slice(token.end,at.peek().start));
    if(at.eat(';')||at.is('}')||lineBreak)return {kind:'return',value:{kind:'undefined'}};
    const value = expression(at, 'JavaScript');
    if(!at.eat(';')&&!at.is('}'))at.expect(';');
    return { kind: 'return', value };
  }
  if (at.eat('if')) {
    at.expect('(');
    const cond = expression(at, 'JavaScript');
    at.expect(')');
    const then = jsStatementBody(at);
    let otherwise = null;
    if (at.eat('else')) otherwise = jsStatementBody(at);
    return { kind: 'if', cond, then, else: otherwise };
  }
  if (at.eat('while')) {
    at.expect('(');
    const cond = expression(at, 'JavaScript');
    at.expect(')');
    return { kind: 'while', cond, body: jsBlock(at) };
  }
  if (token.type === 'ident' && at.is('=', 1)) {
    const name = snakeFromCamel(at.next().text);
    at.expect('=');
    const value = expression(at, 'JavaScript');
    at.expect(';');
    return { kind: 'assign', name, value };
  }
  if (['for', 'do'].includes(token.text)) refuse('loop');
  if (['let', 'var'].includes(token.text) || ASSIGNMENTS.has(at.peek(1).text)) refuse('mutable');
  if (token.text === 'await') refuse('async');
  return refuse('unsupported', `the statement ${token.text}`);
}

/**
 * Parse one Rust item into portable-pure-v1.
 * @param {Array<object>} tokens
 * @returns {object}
 */
export function parseRustItem(tokens) {
  const at = cursor(tokens);
  const term = itemTerm(tokens, 'Rust');
  if (term === 'use') refuse('no-definition');
  if (term !== 'function' && term !== 'constant') refuse('rust-item');
  while (at.is('#')) {
    at.next();
    at.expect('[');
    const attribute = at.next().text;
    if(attribute==='rustfmt'){at.expect('::');at.expect('skip');}
    else if(attribute==='allow'){at.expect('(');at.expect('non_upper_case_globals');at.expect(')');}
    else if (attribute !== 'must_use' && attribute !== 'inline') refuse('rust-item', `#[${attribute}]`);
    at.expect(']');
  }
  const exported = at.eat('pub');
  if (at.eat('const') && !at.is('fn')) {
    const name = at.next().text;
    canonicalRustName(name);
    at.expect(':');
    const type = rustType(at);
    at.expect('=');
    const value = expression(at, 'Rust');
    at.expect(';');
    return { kind: 'constant', name, exported, type, value };
  }
  if (at.is('async')) refuse('async');
  at.expect('fn');
  const name = canonicalRustName(at.next().text);
  if (at.is('<')) refuse('unsupported', 'a generic function');
  at.expect('(');
  const params = [];
  while (!at.eat(')')) {
    if (at.is('mut')) refuse('mutable');
    const param = canonicalRustName(at.next().text);
    at.expect(':');
    params.push({ name: param, type: rustType(at) });
    if (!at.is(')')) at.expect(',');
  }
  if (!at.eat('->')) refuse('untyped', 'no result type');
  const returns = rustType(at);
  const body = rustBlock(at);
  if (!at.done()) refuse('unsupported', at.peek().text);
  return { kind: 'function', name, exported, params, returns, body };
}

function rustType(at) {
  let written = '';
  if (at.eat('&')) {
    written = '&';
    if (at.peek().type === 'char') at.next();
  }
  written += at.next().text;
  const map = constructMap().types;
  const id = idBySpelling(map, 'rust', written) ?? idBySpelling(map, 'rustOwned', written) ?? (written === '&String' ? 'string' : undefined);
  if (!id) refuse('untyped', written);
  return id;
}

function rustBlock(at) {
  at.expect('{');
  const body = [];
  while (!at.eat('}')) {
    if (at.peek().type === 'end') refuse('unsupported', 'an unclosed block');
    if (at.eat('let')) {
      if (at.is('mut')) refuse('mutable');
      const name = canonicalRustName(at.next().text);
      if (at.eat(':')) rustType(at);
      at.expect('=');
      const value = expression(at, 'Rust');
      at.expect(';');
      body.push({ kind: 'let', name, value });
    } else if (at.eat('return')) {
      const value = expression(at, 'Rust');
      at.expect(';');
      body.push({ kind: 'return', value });
    } else if (at.is('if')) {
      body.push(rustIf(at));
    } else if (['for', 'while', 'loop'].includes(at.peek().text)) {
      refuse('loop');
    } else {
      const value = expression(at, 'Rust');
      if (!at.is('}')) refuse(ASSIGNMENTS.has(at.peek().text) ? 'mutable' : 'unsupported', 'an expression statement');
      body.push({ kind: 'return', value });
    }
  }
  return body;
}

function rustIf(at) {
  at.expect('if');
  const cond = expression(at, 'Rust');
  const then = rustBlock(at);
  let otherwise = null;
  if (at.eat('else')) otherwise = at.is('if') ? [rustIf(at)] : rustBlock(at);
  return { kind: 'if', cond, then, else: otherwise };
}

/**
 * One expression of `language`, by precedence climbing over the construct
 * map's operator spellings.
 * @param {ReturnType<typeof cursor>} at
 * @param {string} language
 * @returns {object}
 */
function expression(at, language) {
  if (language === 'Rust' && at.is('if')) {
    at.next();
    const cond = binary(at, language, 0);
    const then = rustValueBlock(at);
    at.expect('else');
    const otherwise = at.is('if') ? expression(at, language) : rustValueBlock(at);
    return { kind: 'choose', cond, then, else: otherwise };
  }
  const cond = binary(at, language, 0);
  if (language === 'JavaScript' && at.eat('?')) {
    const then = expression(at, language);
    at.expect(':');
    return { kind: 'choose', cond, then, else: expression(at, language) };
  }
  return cond;
}

function rustValueBlock(at) {
  at.expect('{');
  const value = expression(at, 'Rust');
  at.expect('}');
  return value;
}

function binary(at, language, minimum) {
  const operators = constructMap().operators;
  const key = language === 'Rust' ? 'rust' : 'javascript';
  let left = unary(at, language);
  for (;;) {
    const token = at.peek();
    if (token.type !== 'punct' && token.type !== 'ident') return left;
    const op = token.type === 'punct' ? idBySpelling(operators, key, token.text) : undefined;
    if (!op) {
      if (UNSUPPORTED_BINARY.has(token.text)) refuse('unsupported', `the operator ${token.text}`);
      return left;
    }
    const { precedence } = operators.get(op);
    if (precedence < minimum) return left;
    at.next();
    const right = binary(at, language, precedence + 1);
    left = { kind: 'binary', op, left, right };
  }
}

function unary(at, language) {
  const key = language === 'Rust' ? 'rust' : 'javascript';
  const token = at.peek();
  if (language === 'Rust' && at.eat('&')) return unary(at, language);
  if (token.type === 'punct') {
    const op = idBySpelling(constructMap().unaries, key, token.text);
    if (op) {
      at.next();
      return { kind: 'unary', op, operand: unary(at, language) };
    }
  }
  if (language === 'JavaScript' && at.eat('typeof')) return { kind: 'typeof', operand: unary(at, language) };
  if(language==='JavaScript'&&at.is('new')&&at.sourceConstructors?.has(token.start)) {
    const capability=at.sourceConstructors.get(token.start),proof=originalImportedErrorConstructor(capability).proof;
    while(at.peek().type!=='end'&&at.peek().start<proof.caller.end)at.next();
    return {kind:'source-error',constructor:proof};
  }
  if(language==='JavaScript'&&at.is('new')&&at.is('Error',1)) {
    if(!at.errorContracts?.owned)refuse('collection',at.errorContracts?.reason??'unproved Error intrinsic ownership');
    at.next();at.next();const args=argumentsOf(at,language);
    if(args.length!==1)refuse('collection','Error construction without a proved message');
    return {kind:'error',message:args[0],fields:[]};
  }
  if (['void', 'delete', 'new'].includes(token.text)) refuse('unsupported', token.text);
  if (token.text === 'await') refuse('async');
  return postfix(at, language);
}

function postfix(at, language) {
  let value = primary(at, language);
  for (;;) {
    if (at.is('[')) refuse('collection');
    if (at.is('?.')) refuse('unsupported', 'optional chaining');
    if (!at.is('.')) return value;
    at.next();
    const name = at.next().text;
    if(language==='JavaScript'&&value.kind==='variable'&&['get','has','size'].includes(name)) {
      if(name==='size'&&!at.is('(')){value={kind:'table-size',name:value.name};continue;}
      const args=argumentsOf(at,language);
      if(args.length!==1)refuse('collection','a table read without exactly one key');
      value={kind:`table-${name}`,name:value.name,argument:args[0]};continue;
    }
    if (language === 'Rust' && TRANSPARENT_RUST.has(name)) {
      at.expect('(');
      at.expect(')');
      continue;
    }
    if (language === 'JavaScript' && name === 'length' && !at.is('(')) {
      value = { kind: 'length', receiver: value };
      continue;
    }
    if (name === 'len') refuse('length');
    if (!at.is('(')) refuse('collection', `the property ${name}`);
    const method = idBySpelling(constructMap().methods, language === 'Rust' ? 'rust' : 'javascript', name);
    if (!method) refuse('unsupported', `the method ${name}`);
    value = { kind: 'method', name: method, receiver: value, args: argumentsOf(at, language) };
  }
}

function argumentsOf(at, language) {
  at.expect('(');
  const args = [];
  while (!at.eat(')')) {
    args.push(expression(at, language));
    if (!at.is(')')) at.expect(',');
  }
  return args;
}

function primary(at, language) {
  const token = at.next();
  if(token.type==='source-callable'&&language==='JavaScript'&&at.sourceCalls)return sourceCallable(token.environment);
  if (token.type === 'number') return { kind: 'number', text: numberText(token.text, language) };
  if (token.type === 'string') return { kind: 'string', value: unquote(token.text) };
  if (token.type === 'template') refuse('template');
  if (token.type === 'regex' && language === 'JavaScript') {
    let model,kind='class-test';
    try {model=parseCharacterClass(token.text);}catch(originalError) {
      try {model=parseSequencePattern(token.text);kind='sequence-test';}catch {throw originalError;}
    }
    at.expect('.'); at.expect('test');
    const args = argumentsOf(at, language);
    if (args.length !== 1) refuse('unsupported', 'a character-class test without exactly one argument');
    return { kind, ...model, receiver: args[0] };
  }
  if (token.type === 'regex' || token.type === 'char') refuse('unsupported', token.text);
  if (token.text === '(') {
    const value = expression(at, language);
    at.expect(')');
    return value;
  }
  if (language === 'JavaScript' && token.text === '[') {
    if (at.eat('...')) {
      const receiver = expression(at, language);
      at.expect(']'); at.expect('.'); at.expect('length');
      return { kind: 'codepoints', receiver };
    }
    const values = [];
    while (!at.eat(']')) {
      values.push(expression(at, language));
      if (!at.is(']')) at.expect(',');
    }
    if(!at.is('.'))return {kind:'array',values};
    at.expect('.');
    if(at.sourceCalls&&at.eat('some')) {
      const args=argumentsOf(at,language);
      if(args.length!==1||args[0].kind!=='source-create')refuse('collection','owned some requires its exact original callback creation');
      return {kind:'owned-some',values,callback:args[0]};
    }
    if(!at.eat('includes'))refuse('collection');
    const args = argumentsOf(at, language);
    if (args.length !== 1) refuse('unsupported', 'array includes with a non-default start index');
    return { kind: 'includes', values, argument: args[0] };
  }
  if(language==='JavaScript'&&token.text==='{') {
    const fields=[];
    while(!at.eat('}')) {
      const key=at.next();
      if(key.type!=='ident')refuse('collection','a non-identifier record key');
      const binding=snakeFromCamel(key.text);
      const value=at.eat(':')?expression(at,language):{kind:'variable',name:binding};
      fields.push({name:key.text,value});if(!at.is('}'))at.expect(',');
    }
    return {kind:'record',fields};
  }
  if (token.text === '[' || token.text === '{') refuse('collection');
  if (token.type !== 'ident') refuse('unsupported', token.text || 'the end of the item');
  if (token.text === 'true' || token.text === 'false') return { kind: 'boolean', value: token.text === 'true' };
  if (language === 'JavaScript' && ['null', 'undefined'].includes(token.text)) {
    if (token.text === 'undefined' && at.shadowedBuiltins?.has(token.text)) refuse('unsupported', 'a shadowed undefined identifier');
    return { kind: token.text };
  }
  if (['this', 'self', 'Self', 'function', 'None', 'Some'].includes(token.text)) refuse('unsupported', token.text);
  if (at.is('=>')) refuse('unsupported', 'an arrow function');
  const builtins = constructMap().builtins;
  if(language==='Rust'&&at.is('(')){const registered=idBySpelling(builtins,'rust',token.text);if(registered)return {kind:'builtin',name:registered,args:argumentsOf(at,language)};}
  if(language==='JavaScript'&&token.text==='Response'&&at.is('.')&&at.is('json',1)) {
    if(!at.jsonResponses?.owned)refuse('collection',at.jsonResponses?.reason??'unproved Response.json ownership');
    at.next();at.next();at.expect('(');const body=parseClosedJson(at);
    const options=at.eat(',')?parseClosedJson(at):null;at.expect(')');
    return {kind:'json-response',body,options};
  }
  if(language==='JavaScript'&&token.text==='Object'&&at.is('.')&&at.is('assign',1)) {
    if(!at.errorContracts?.owned)refuse('collection',at.errorContracts?.reason??'unproved Object intrinsic ownership');
    at.next();at.next();const args=argumentsOf(at,language);
    if(args.length!==2||args[0].kind!=='error'||args[0].fields.length||args[1].kind!=='record')refuse('collection','Object.assign outside fresh closed Error fields');
    return {...args[0],fields:args[1].fields};
  }
  if (language === 'JavaScript' && ['Math', 'Number', 'Buffer'].includes(token.text) && at.eat('.')) {
    if (at.shadowedBuiltins?.has(token.text)) refuse('unsupported', `a shadowed builtin ${token.text}`);
    const callee = `${token.text}.${at.next().text}`;
    if (callee === 'Math.round') refuse('rounding');
    const name = idBySpelling(builtins, 'javascript', callee);
    if (!name) refuse('unsupported', callee);
    return { kind: 'builtin', name, args: argumentsOf(at, language) };
  }
  if (language === 'Rust' && at.is('::')) {
    at.next();
    const callee = `${token.text}::${at.next().text}`;
    if (callee === 'String::from') {
      const [value] = argumentsOf(at, language);
      return value;
    }
    if (callee === 'f64::round') refuse('rounding');
    const name = idBySpelling(builtins, 'rust', callee);
    if (!name) refuse('unsupported', callee);
    return { kind: 'builtin', name, args: argumentsOf(at, language) };
  }
  if (language === 'Rust' && token.text.endsWith('!')) refuse('unsupported', `the macro ${token.text}`);
  const name = language === 'Rust' ? canonicalRustName(token.text) : snakeFromCamel(token.text);
  if (at.is('(')) return { kind: 'call', name, args: argumentsOf(at, language) };
  return { kind: 'variable', name };
}

/**
 * The canonical text of a decimal literal: the JavaScript `String` of its
 * value, so `2`, `2.0` and `2_f64` all read `2`.
 * @param {string} text
 * @param {string} language
 * @returns {string}
 */
function numberText(text, language) {
  const plain = language === 'Rust' ? text.replace(/_?f64$/u, '') : text;
  if (!/^\d(?:_?\d)*(?:\.\d(?:_?\d)*)?$/u.test(plain) || language === 'JavaScript' && /^0[\d_]/u.test(plain)) refuse('unsupported', `the literal ${text}`);
  const canonical = String(Number(plain.replace(/_/gu, '')));
  if (!Number.isFinite(Number(canonical))) refuse('unsupported', `the literal ${text}`);
  if (/e/u.test(canonical)) refuse('unsupported', `the literal ${text}`);
  return canonical;
}

function unquote(text) {
  const body = text.slice(1, -1);
  if (/[\n\r]/u.test(body) || /\\0[0-9]/u.test(body)) refuse('unsupported', 'a nonportable string literal');
  return body.replace(/\\(.)/gu, (_, char) => {
    if (!(char in ESCAPES)) refuse('unsupported', `the escape \\${char}`);
    return ESCAPES[char];
  });
}

/**
 * The JavaScript name of a canonical name.
 * @param {string} name
 * @returns {string}
 */
export function javascriptName(name) {
  return camelFromSnake(name);
}

// Separate source-bound profile; the old parser never receives this context.
export {analyzeOwnedCoreModule as parseOwnedCoreJavaScriptModule} from '../owned-core-operations.mjs';
