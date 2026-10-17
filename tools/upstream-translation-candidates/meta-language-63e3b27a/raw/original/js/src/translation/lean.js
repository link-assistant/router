// Lean 4 frontend for the portable core. It reads the layout-sensitive
// subset that the core can represent faithfully: namespaces, inductive types,
// definitions (including equation-compiler style), `match`, `if`, `let`,
// theorems with their tactic structure, and a `main : IO Unit` of
// `IO.println` effects. Everything else is rejected with a precise obligation.

import { TranslationError, unsupported } from './diagnostics.js';
import { TokenCursor, describe, tokenize } from './lexer.js';
import { BOOL, INT, NAT, STRING, UNIT } from './types.js';

const ITEM_KEYWORDS = new Set([
  'namespace', 'end', 'inductive', 'def', 'theorem', 'lemma', 'structure', 'class', 'instance', 'abbrev',
  'open', 'section', 'variable', 'universe', 'import', 'mutual', 'partial', 'private', 'protected',
  'noncomputable', 'set_option', 'example', 'axiom', 'opaque', 'macro', 'syntax', 'notation', 'attribute',
]);
const BUILTIN_TYPES = { Nat: NAT, Int: INT, Bool: BOOL, String: STRING, Unit: UNIT };
const BINARY = [
  { ops: ['||'], prec: 30, op: 'or' },
  { ops: ['&&'], prec: 35, op: 'and' },
  { ops: ['==', '!=', '=', '≠', '<', '<=', '≤', '>', '>=', '≥'], prec: 50 },
  { ops: ['++'], prec: 65, op: 'concat', right: true },
  { ops: ['+', '-'], prec: 65 },
  { ops: ['*', '/', '%'], prec: 70 },
];
const OPERATOR_NAMES = {
  '==': 'eq', '!=': 'ne', '=': 'eq', '≠': 'ne', '<': 'lt', '<=': 'le', '≤': 'le', '>': 'gt', '>=': 'ge', '≥': 'ge',
  '+': 'add', '-': 'sub', '*': 'mul', '/': 'div', '%': 'rem',
};
const PROP_RELATIONS = { '=': 'eq', '≠': 'ne', '<': 'lt', '≤': 'le', '<=': 'le', '>': 'gt', '≥': 'ge', '>=': 'ge' };

export function parseLean(source) {
  const { tokens } = tokenize(source, 'Lean');
  annotateLayout(tokens, source);
  return new LeanParser(tokens, source).file();
}

export function annotateLayout(tokens, source) {
  let line = 0;
  let lineStart = 0;
  let cursor = 0;
  let previousLine = -1;
  for (const token of tokens) {
    while (cursor < token.start) {
      if (source[cursor] === '\n') {
        line += 1;
        lineStart = cursor + 1;
      }
      cursor += 1;
    }
    token.line = line;
    token.col = token.start - lineStart;
    token.first = line !== previousLine;
    previousLine = line;
  }
}

class LeanParser {
  constructor(tokens, source) {
    this.cursor = new TokenCursor(tokens, 'Lean');
    this.source = source;
    this.bounds = [-1];
    this.namespaces = [];
  }

  get bound() {
    return this.bounds.at(-1);
  }

  withBound(column, parse) {
    this.bounds.push(column);
    try {
      return parse();
    } finally {
      this.bounds.pop();
    }
  }

  /** True when the next token closes the current layout block. */
  blocked(token = this.cursor.peek()) {
    if (token.kind === 'eof') return true;
    if (token.col === 0 && token.first && token.kind === 'identifier' && ITEM_KEYWORDS.has(token.value)) return true;
    return token.first && token.col <= this.bound;
  }

  /** Alternatives may sit at the column of the construct that opens them. */
  outdented(column, token = this.cursor.peek()) {
    return token.kind === 'eof' || (token.first && token.col < column);
  }

  fail(message, token = this.cursor.peek()) {
    return new TranslationError('syntax', `${message} but found ${describe(token)}`, token);
  }

  file() {
    const root = { items: [], main: null };
    this.items(root, root.items, []);
    return { language: 'Lean', items: root.items, main: root.main };
  }

  items(root, items, path) {
    const c = this.cursor;
    while (!c.atEnd()) {
      const token = c.peek();
      if (c.is('end')) {
        if (path.length === 0) throw this.fail('unmatched end');
        c.next();
        const name = this.qualifiedName().join('.');
        if (name !== path.at(-1)) throw new TranslationError('syntax', `end ${name} closes namespace ${path.at(-1)}`, token);
        return;
      }
      if (c.is('namespace')) {
        c.next();
        const segments = this.qualifiedName();
        let list = items;
        const opened = [];
        for (const segment of segments) {
          const module = { k: 'module', name: segment, items: [], span: span(token, c.peek()) };
          list.push(module);
          list = module.items;
          opened.push(segment);
        }
        if (segments.length !== 1) throw unsupported('dotted namespace', 'use one namespace per level', span(token, token));
        this.items(root, list, [...path, ...opened]);
        continue;
      }
      if (c.is('inductive')) {
        items.push(this.inductive());
        continue;
      }
      if (c.is('def')) {
        const item = this.definition(path);
        if (item.k === 'main') {
          if (path.length) throw unsupported('namespaced main', 'main must be declared at the top level', item.span);
          if (root.main) throw new TranslationError('type', 'duplicate main', item.span);
          root.main = item.main;
        } else {
          items.push(item);
        }
        continue;
      }
      if (c.is('theorem')) {
        items.push(this.theorem());
        continue;
      }
      if (token.kind === 'identifier' && ITEM_KEYWORDS.has(token.value)) {
        throw unsupported(`Lean ${token.value} declaration`, 'outside the portable core', span(token, token));
      }
      throw this.fail('expected a declaration');
    }
    if (path.length) throw new TranslationError('syntax', `namespace ${path.at(-1)} is not closed`, c.peek());
  }

  qualifiedName() {
    const token = this.cursor.identifier('name');
    return token.value.split('.');
  }

  inductive() {
    const c = this.cursor;
    const start = c.next();
    const name = c.identifier('inductive').value;
    if (name.includes('.')) throw unsupported('qualified inductive name', 'declare inductives inside their namespace', span(start, start));
    if (!c.is('where')) {
      if (c.is('(') || c.is('{')) throw unsupported('parameterised inductive', 'type parameters are outside the portable core', span(start, c.peek()));
      c.expect('where', 'inductive');
    }
    c.next();
    const ctors = [];
    while (c.is('|')) {
      const bar = c.next();
      const ctorName = c.identifier('constructor').value;
      const fields = [];
      while (c.is('(')) fields.push(...this.binderGroup());
      if (c.eat(':')) {
        const types = this.arrowType();
        const result = types.pop();
        if (result.kind !== 'named' || result.path.join('.') !== name) {
          throw unsupported('indexed constructor', `${ctorName} must construct ${name}`, span(bar, c.peek()));
        }
        fields.push(...types.map((type) => ({ type })));
      }
      ctors.push({ name: ctorName, fields });
    }
    if (c.is('deriving')) {
      c.next();
      c.identifier('deriving');
      while (c.eat(',')) c.identifier('deriving');
    }
    return { k: 'data', name, ctors, span: span(start, c.peek()) };
  }

  binderGroup() {
    const c = this.cursor;
    const open = c.expect('(', 'binder');
    const names = [];
    while (c.isKind('identifier')) names.push(c.next().value);
    if (!names.length) throw this.fail('expected binder names');
    c.expect(':', 'binder');
    const type = this.type();
    c.expect(')', 'binder');
    if (c.is('{') || c.is('[')) throw unsupported('implicit binder', 'implicit and instance binders are outside the portable core', span(open, c.peek()));
    return names.map((name) => ({ name, type }));
  }

  binders() {
    const c = this.cursor;
    const result = [];
    while (c.is('(') || c.is('{') || c.is('[')) {
      if (!c.is('(')) throw unsupported('implicit binder', 'implicit and instance binders are outside the portable core', span(c.peek(), c.peek()));
      result.push(...this.binderGroup());
    }
    return result;
  }

  arrowType() {
    const types = [this.type()];
    while (this.cursor.eat('→') || this.cursor.eat('->')) types.push(this.type());
    return types;
  }

  type() {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('(')) {
      const types = this.arrowType();
      c.expect(')', 'type');
      if (types.length !== 1) throw unsupported('function type', 'higher-order values are outside the portable core', span(token, token));
      return types[0];
    }
    const name = c.identifier('type').value;
    if (BUILTIN_TYPES[name]) return BUILTIN_TYPES[name];
    if (/^(?:U?Int(?:8|16|32|64)|USize|Float|Char|List|Array|Option|Prop|Type|Sort)$/u.test(name)) {
      throw unsupported(`Lean type ${name}`, 'outside the portable core', span(token, token));
    }
    const next = c.peek();
    if (!this.blocked(next) && (next.kind === 'identifier' && !['where', ':=', 'with', 'deriving'].includes(next.value))) {
      throw unsupported('type application', `${name} ${next.value} is outside the portable core`, span(token, next));
    }
    return { kind: 'named', path: name.split('.'), span: span(token, token) };
  }

  definition(path) {
    const c = this.cursor;
    const start = c.next();
    const nameToken = c.identifier('def');
    const name = nameToken.value;
    if (name.includes('.')) throw unsupported('qualified definition name', 'declare definitions inside their namespace', span(nameToken, nameToken));
    const params = this.binders();
    c.expect(':', 'def');
    if (name === 'main' && path.length === 0 && c.is('IO')) return this.main(start);
    const types = this.arrowType();
    const ret = types.pop();
    const extra = types.map((type, index) => ({ name: `ml_arg${index}`, type }));
    if (c.eat(':=')) {
      if (extra.length) throw unsupported('function-valued definition body', 'use binders or equations for arrow types', span(start, c.peek()));
      const body = this.withBound(0, () => this.expr());
      this.endDecl(start, 'termination_by');
      return { k: 'fn', name, params, ret, body, span: span(start, c.peek()) };
    }
    if (!c.is('|')) throw this.fail('expected := or equations');
    if (!extra.length) throw unsupported('equations without arrow arguments', 'use match', span(start, c.peek()));
    const rows = this.alternatives(extra.length);
    const body = {
      k: 'match',
      scrutinees: extra.map((param) => ({ k: 'name', path: [param.name] })),
      rows,
      span: span(start, c.peek()),
    };
    this.endDecl(start, 'termination_by');
    return { k: 'fn', name, params: [...params, ...extra], ret, body, span: span(start, c.peek()) };
  }

  endDecl(start, keyword) {
    const c = this.cursor;
    if (c.is(keyword) || c.is('decreasing_by')) {
      throw unsupported(`Lean ${c.peek().value}`, 'explicit termination arguments are outside the portable core', span(start, c.peek()));
    }
    if (!this.blocked()) throw this.fail('expected the end of the declaration');
  }

  main(start) {
    const c = this.cursor;
    c.expect('IO', 'main');
    c.expect('Unit', 'main');
    c.expect(':=', 'main');
    c.expect('do', 'main');
    const effects = [];
    const first = c.peek();
    const column = first.first ? first.col : -1;
    if (column <= 0) throw unsupported('inline do block', 'write one effect per line', span(first, first));
    while (!c.atEnd() && c.peek().col === column && c.peek().first) {
      const token = c.peek();
      effects.push(this.withBound(column, () => this.effect()));
      if (c.peek() === token) throw this.fail('expected an effect');
    }
    this.endDecl(start, 'where');
    return { k: 'main', main: { effects, span: span(start, c.peek()) }, span: span(start, c.peek()) };
  }

  effect() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('IO.println')) {
      c.next();
      const expr = this.atom();
      return { k: 'print', expr, style: 'lean', span: span(token, c.peek()) };
    }
    if (c.is('let')) {
      c.next();
      const name = c.identifier('let').value;
      const type = c.eat(':') ? this.type() : undefined;
      c.expect(':=', 'let');
      const value = this.expr();
      return { k: 'let', name, type, value, span: span(token, c.peek()) };
    }
    throw unsupported('Lean do element', `${describe(token)} is outside the portable effect model`, span(token, token));
  }

  theorem() {
    const c = this.cursor;
    const start = c.next();
    const name = c.identifier('theorem').value;
    const binders = this.binders();
    c.expect(':', 'theorem');
    const prop = this.withBound(0, () => this.prop());
    c.expect(':=', 'theorem');
    const proofStart = c.peek();
    let proof;
    if (c.eat('by')) {
      proof = this.tactics(proofStart);
    } else if (c.is('rfl')) {
      c.next();
      proof = { steps: [{ t: 'compute' }] };
    } else {
      throw unsupported('proof term', 'only tactic proofs are reconstructed', span(proofStart, proofStart));
    }
    proof.source = this.source.slice(proofStart.start, c.peek().kind === 'eof' ? this.source.length : c.peek().start).trim();
    proof.sourceLanguage = 'Lean';
    this.endDecl(start, 'termination_by');
    return { k: 'theorem', name, binders, prop, proof, span: span(start, c.peek()) };
  }

  // Tactic blocks keep their structure: intro, induction with per-case
  // steps, and closing steps. The emitters rebuild each case for the target
  // kernel, which then re-checks the proof.
  tactics(byToken) {
    const c = this.cursor;
    const first = c.peek();
    const column = first.first ? first.col : -1;
    const steps = [];
    const block = () => {
      for (;;) {
        steps.push(...this.tactic());
        if (c.eat(';') || c.eat('<;>')) continue;
        break;
      }
    };
    if (column < 0) {
      this.withBound(byToken.col, block);
      return { steps };
    }
    while (!c.atEnd() && c.peek().first && c.peek().col === column) {
      this.withBound(column, block);
    }
    return { steps };
  }

  tactic() {
    const c = this.cursor;
    const token = c.peek();
    const value = token.value;
    if (token.kind !== 'identifier') throw this.fail('expected a tactic');
    c.next();
    switch (value) {
      case 'rfl':
      case 'decide':
      case 'trivial':
        return [{ t: 'compute', tactic: value }];
      case 'omega':
        return [{ t: 'arith', tactic: value }];
      case 'intro':
      case 'intros': {
        const names = [];
        while (c.isKind('identifier') && !this.blocked()) names.push(c.next().value);
        return [{ t: 'intro', names }];
      }
      case 'unfold': {
        const names = [];
        while (c.isKind('identifier') && !this.blocked()) names.push(c.next().value);
        return [{ t: 'unfold', names }];
      }
      case 'rw':
      case 'simp':
      case 'simp_all': {
        const only = value !== 'rw' && Boolean(c.eat('only'));
        const rules = [];
        if (c.eat('[')) {
          while (!c.is(']')) {
            const reverse = Boolean(c.eat('←') || c.eat('<-'));
            rules.push({ name: c.identifier('rewrite rule').value, reverse });
            if (!c.eat(',')) break;
          }
          c.expect(']', value);
        }
        if (c.is('at')) throw unsupported(`${value} at`, 'hypothesis rewriting is outside the portable proof model', span(token, c.peek()));
        return [{ t: value === 'rw' ? 'rewrite' : 'simp', rules, only, tactic: value }];
      }
      case 'induction':
      case 'cases': {
        const variable = c.identifier(value).value;
        c.expect('with', value);
        const cases = [];
        while (c.is('|') && !this.outdented(token.col)) {
          const bar = c.next();
          const ctor = c.identifier('case').value.replace(/^\./u, '');
          const binds = [];
          while (c.isKind('identifier') && !c.is('=>')) binds.push(c.next().value);
          c.expect('=>', 'case');
          const caseSteps = this.caseTactics(bar);
          cases.push({ ctor, binds, steps: caseSteps });
        }
        return [{ t: value, variable, cases }];
      }
      case 'exact':
      case 'apply':
      case 'constructor':
      case 'exists':
      case 'calc':
      case 'have':
      case 'show':
      case 'sorry':
      case 'admit':
      case 'native_decide':
      case 'grind':
      case 'aesop':
        throw unsupported(`Lean tactic ${value}`, 'outside the portable proof model', span(token, token));
      default:
        throw unsupported(`Lean tactic ${value}`, 'outside the portable proof model', span(token, token));
    }
  }

  caseTactics(bar) {
    const c = this.cursor;
    const steps = [];
    const first = c.peek();
    if (!first.first) {
      this.withBound(bar.col, () => {
        for (;;) {
          steps.push(...this.tactic());
          if (!(c.eat(';') || c.eat('<;>'))) break;
        }
      });
      return steps;
    }
    const column = first.col;
    while (!c.atEnd() && c.peek().first && c.peek().col === column && column > bar.col) {
      this.withBound(column, () => {
        for (;;) {
          steps.push(...this.tactic());
          if (!(c.eat(';') || c.eat('<;>'))) break;
        }
      });
    }
    return steps;
  }

  prop() {
    return this.propImplies();
  }

  propImplies() {
    const left = this.propOr();
    if (this.cursor.eat('→') || this.cursor.eat('->')) {
      return { p: 'implies', left, right: this.propImplies() };
    }
    return left;
  }

  propOr() {
    let left = this.propAnd();
    while (this.cursor.eat('∨')) left = { p: 'or', left, right: this.propAnd() };
    return left;
  }

  propAnd() {
    let left = this.propUnary();
    while (this.cursor.eat('∧')) left = { p: 'and', left, right: this.propUnary() };
    return left;
  }

  propUnary() {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('¬')) return { p: 'not', arg: this.propUnary() };
    if (c.eat('∀')) {
      const binders = [];
      while (c.is('(')) binders.push(...this.binderGroup());
      if (!binders.length) {
        const names = [];
        while (c.isKind('identifier')) names.push(c.next().value);
        c.expect(':', '∀');
        const type = this.type();
        binders.push(...names.map((name) => ({ name, type })));
      }
      c.expect(',', '∀');
      return { p: 'forall', binders, body: this.prop(), span: span(token, c.peek()) };
    }
    if (c.is('(') && this.propParenthesised()) {
      c.next();
      const inner = this.prop();
      c.expect(')', 'proposition');
      return inner;
    }
    const left = this.binary(55);
    const relation = c.peek();
    if (relation.kind === 'punct' && PROP_RELATIONS[relation.value] && !this.blocked(relation)) {
      c.next();
      const right = this.binary(55);
      return { p: PROP_RELATIONS[relation.value], left, right, span: span(token, c.peek()) };
    }
    return { p: 'bool', expr: left, span: span(token, c.peek()) };
  }

  /** A parenthesis opens a proposition when it contains a logical connective at depth one. */
  propParenthesised() {
    let depth = 0;
    for (let offset = 0; ; offset += 1) {
      const token = this.cursor.peek(offset);
      if (token.kind === 'eof') return false;
      if (token.value === '(') depth += 1;
      if (token.value === ')') {
        depth -= 1;
        if (depth === 0) return false;
      }
      if (depth === 1 && ['∧', '∨', '→', '¬', '∀', '=', '≠', '↔'].includes(token.value)) return true;
    }
  }

  expr() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('if')) {
      c.next();
      if (c.isKind('identifier') && c.is(':', 1)) throw unsupported('dependent if', 'if h : … is outside the portable core', span(token, token));
      const cond = this.expr();
      c.expect('then', 'if');
      const then = this.expr();
      c.expect('else', 'if');
      const otherwise = this.expr();
      return { k: 'if', cond, then, else: otherwise, span: span(token, c.peek()) };
    }
    if (c.is('let')) {
      c.next();
      const name = c.identifier('let').value;
      const type = c.eat(':') ? this.type() : undefined;
      c.expect(':=', 'let');
      const value = this.withBound(token.col, () => this.expr());
      c.eat(';');
      const body = this.expr();
      return { k: 'let', name, type, value, body, span: span(token, c.peek()) };
    }
    if (c.is('match')) {
      c.next();
      const scrutinees = [this.expr()];
      while (c.eat(',')) scrutinees.push(this.expr());
      c.expect('with', 'match');
      const rows = this.alternatives(scrutinees.length);
      return { k: 'match', scrutinees, rows, span: span(token, c.peek()) };
    }
    if (c.is('fun') || c.is('λ')) throw unsupported('lambda', 'higher-order values are outside the portable core', span(token, token));
    if (c.is('do')) throw unsupported('do block', 'monadic code outside main is outside the portable core', span(token, token));
    return this.binary(0);
  }

  alternatives(arity) {
    const c = this.cursor;
    const rows = [];
    while (c.is('|') && !this.outdented(this.bound)) {
      const bar = c.next();
      const patterns = [this.pattern()];
      while (c.eat(',')) patterns.push(this.pattern());
      if (patterns.length !== arity) throw new TranslationError('syntax', `alternative has ${patterns.length} patterns, expected ${arity}`, bar);
      c.expect('=>', 'alternative');
      const body = this.expr();
      rows.push({ patterns, body, span: span(bar, c.peek()) });
    }
    if (!rows.length) throw this.fail('expected match alternatives');
    return rows;
  }

  pattern() {
    const c = this.cursor;
    const token = c.peek();
    let pattern = this.patternApp();
    while (c.is('+')) {
      c.next();
      const amount = c.next();
      if (amount.kind !== 'number' || amount.suffix) throw this.fail('expected a numeral in an n + k pattern', amount);
      pattern = { k: 'natAdd', inner: pattern, add: amount.value, span: span(token, c.peek()) };
    }
    return pattern;
  }

  patternApp() {
    const c = this.cursor;
    const token = c.peek();
    if (token.kind === 'identifier' || c.is('.')) {
      const path = this.patternHead();
      const args = [];
      while (this.patternArgumentStart()) args.push(this.patternAtom());
      if (!args.length && path.length === 1 && !path.dot) return { k: 'bindOrCtor', name: path[0], span: span(token, token) };
      return this.ctorPattern(path, args, token);
    }
    return this.patternAtom();
  }

  patternArgumentStart() {
    const token = this.cursor.peek();
    if (this.blocked(token)) return false;
    return token.kind === 'identifier' || token.kind === 'number' || this.cursor.is('(') || this.cursor.is('_') || this.cursor.is('.');
  }

  patternHead() {
    const c = this.cursor;
    const dot = Boolean(c.eat('.'));
    const path = c.identifier('pattern').value.split('.');
    path.dot = dot;
    return path;
  }

  ctorPattern(path, args, token) {
    const name = path.at(-1);
    if ((path.join('.') === 'Nat.succ' || (path.dot && name === 'succ')) && args.length === 1) {
      return { k: 'natAdd', inner: args[0], add: '1', span: span(token, this.cursor.peek()) };
    }
    if ((path.join('.') === 'Nat.zero' || (path.dot && name === 'zero')) && args.length === 0) {
      return { k: 'numLit', value: '0', span: span(token, token) };
    }
    return { k: 'ctor', path: [...path], args, span: span(token, this.cursor.peek()) };
  }

  patternAtom() {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('_')) return { k: 'wild' };
    if (token.kind === 'number') {
      c.next();
      return { k: 'numLit', value: token.value, span: span(token, token) };
    }
    if (c.eat('(')) {
      const inner = this.pattern();
      c.expect(')', 'pattern');
      return inner;
    }
    if (token.kind === 'identifier' || c.is('.')) {
      const path = this.patternHead();
      if (path.length === 1 && !path.dot) return { k: 'bindOrCtor', name: path[0], span: span(token, token) };
      return this.ctorPattern(path, [], token);
    }
    throw unsupported('pattern', `${describe(token)} is outside the portable pattern language`, span(token, token));
  }

  binary(minPrec) {
    let left = this.unary();
    for (;;) {
      const token = this.cursor.peek();
      if (this.blocked(token) || token.kind !== 'punct') return left;
      const level = BINARY.find((entry) => entry.ops.includes(token.value));
      if (!level || level.prec < minPrec) return left;
      this.cursor.next();
      const right = this.binary(level.right ? level.prec : level.prec + 1);
      left = {
        k: 'binary',
        op: level.op ?? OPERATOR_NAMES[token.value],
        left,
        right,
        span: { start: left.span?.start ?? token.start, end: right.span?.end ?? token.end },
      };
    }
  }

  unary() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('-')) {
      c.next();
      const arg = this.unary();
      return { k: 'unary', op: 'neg', arg, span: span(token, c.peek()) };
    }
    if (c.is('!') || c.is('not')) {
      c.next();
      const arg = this.unary();
      return { k: 'unary', op: 'not', arg, span: span(token, c.peek()) };
    }
    return this.application();
  }

  argumentStart() {
    const token = this.cursor.peek();
    if (this.blocked(token)) return false;
    if (token.kind === 'identifier') return !['then', 'else', 'with', 'do', 'at', 'if', 'let', 'match', 'fun', 'by', 'from'].includes(token.value) && !ITEM_KEYWORDS.has(token.value);
    return ['number', 'string', 'interpolation'].includes(token.kind) || ['(', '.', '↑'].includes(token.value);
  }

  application() {
    const c = this.cursor;
    const token = c.peek();
    const head = this.atom();
    const args = [];
    while (this.argumentStart()) args.push(this.atom());
    return this.applyHead(head, args, token);
  }

  applyHead(head, args, token) {
    const range = span(token, this.cursor.peek());
    if (head.k === 'name') {
      const name = head.path.join('.');
      const one = (build) => {
        if (args.length !== 1) throw new TranslationError('type', `${name} expects one argument`, range);
        return build(args[0]);
      };
      switch (name) {
        case 'toString':
          return one((arg) => ({ k: 'toString', arg, span: range }));
        case 'Int.toNat':
          return one((arg) => ({ k: 'cast', arg, to: NAT, from: INT, flavor: 'clamp', span: range }));
        case 'Int.ofNat':
          return one((arg) => ({ k: 'cast', arg, to: INT, from: NAT, flavor: 'exact', span: range }));
        case 'Nat.succ':
          return one((arg) => ({ k: 'binary', op: 'add', left: arg, right: { k: 'num', value: '1' }, span: range }));
        case 'Nat.zero':
          if (args.length) throw new TranslationError('type', 'Nat.zero takes no arguments', range);
          return { k: 'num', value: '0', type: NAT, span: range };
        default:
          break;
      }
      if (/^(?:Nat|Int|String|Bool)\./u.test(name)) {
        throw unsupported(`Lean library function ${name}`, 'outside the portable core', range);
      }
    }
    if (!args.length) return head;
    if (head.k !== 'name' && head.k !== 'dotCtor') throw unsupported('higher-order application', 'only named functions can be applied', range);
    return { k: 'app', fn: head, args, span: range };
  }

  atom() {
    const c = this.cursor;
    const token = c.peek();
    if (token.kind === 'number') {
      c.next();
      if (token.suffix) throw unsupported('numeric literal suffix', token.raw, span(token, token));
      return { k: 'num', value: token.value, span: span(token, token) };
    }
    if (token.kind === 'string') {
      c.next();
      return { k: 'str', value: token.value, span: span(token, token) };
    }
    if (token.kind === 'interpolation') {
      c.next();
      return this.interpolation(token);
    }
    if (c.eat('↑')) {
      const arg = this.atom();
      return { k: 'cast', arg, to: INT, from: NAT, flavor: 'exact', span: span(token, c.peek()) };
    }
    if (c.eat('.')) {
      const name = c.identifier('constructor').value;
      return { k: 'dotCtor', name, span: span(token, token) };
    }
    if (c.eat('(')) {
      if (c.eat(')')) return { k: 'unit', span: span(token, token) };
      const inner = this.withBound(-1, () => this.expr());
      if (c.eat(':')) {
        const type = this.type();
        c.expect(')', 'type ascription');
        if (inner.k === 'num') return { ...inner, type, span: span(token, c.peek()) };
        if (inner.k === 'unary' && inner.op === 'neg' && inner.arg.k === 'num') {
          return { ...inner.arg, negative: true, type, span: span(token, c.peek()) };
        }
        return { k: 'cast', arg: inner, to: type, flavor: 'exact', span: span(token, c.peek()) };
      }
      if (c.is(',')) throw unsupported('tuple', 'product values are outside the portable core', span(token, c.peek()));
      c.expect(')', 'parenthesised expression');
      return inner;
    }
    if (token.kind === 'identifier') {
      c.next();
      if (token.value === 'true' || token.value === 'false') return { k: 'bool', value: token.value === 'true', span: span(token, token) };
      if (token.value === 'sorry') throw unsupported('sorry', 'incomplete definitions cannot be translated', span(token, token));
      if (c.peek().value === '.' && c.peek().start === token.end) {
        throw unsupported('method call', `${token.value}.${c.peek(1).value} is outside the portable core`, span(token, c.peek(1)));
      }
      return { k: 'name', path: token.value.split('.'), span: span(token, token) };
    }
    throw this.fail('expected an expression');
  }

  interpolation(token) {
    const raw = token.raw.slice(3, -1);
    const parts = [];
    let text = '';
    let index = 0;
    const offset = token.start + 3;
    while (index < raw.length) {
      if (raw[index] === '\\') {
        const escaped = raw[index + 1];
        const simple = { n: '\n', t: '\t', '\\': '\\', '"': '"', '{': '{' };
        if (!(escaped in simple)) throw new TranslationError('syntax', `unsupported escape \\${escaped}`, token);
        text += simple[escaped];
        index += 2;
        continue;
      }
      if (raw[index] === '{') {
        const close = raw.indexOf('}', index);
        if (close < 0) throw new TranslationError('syntax', 'unterminated interpolation', token);
        if (text) parts.push({ k: 'str', value: text });
        text = '';
        const inner = raw.slice(index + 1, close);
        const { tokens } = tokenize(inner, 'Lean');
        for (const innerToken of tokens) {
          innerToken.start += offset + index + 1;
          innerToken.end += offset + index + 1;
        }
        annotateLayout(tokens, ' '.repeat(offset + index + 1) + inner);
        const parser = new LeanParser(tokens, this.source);
        parser.bounds = [-1];
        const expr = parser.expr();
        if (!parser.cursor.atEnd()) throw parser.fail('unexpected token in interpolation');
        parts.push({ k: 'show', arg: expr, style: 'lean' });
        index = close + 1;
        continue;
      }
      text += raw[index];
      index += 1;
    }
    if (text || !parts.length) parts.push({ k: 'str', value: text });
    return parts.reduce((left, right) => ({ k: 'binary', op: 'concat', left, right, span: span(token, token) }));
  }
}

export function span(from, to) {
  return { start: from.start, end: Math.max(from.end, to && to.kind !== 'eof' ? to.start : from.end) };
}
