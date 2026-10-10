// Rocq frontend for the portable core. It reads the vernacular subset the
// core can represent faithfully: modules, inductive types, `Definition`,
// `Fixpoint` and measure-based `Function` declarations over `nat`, `N`, `Z`,
// `bool` and `string`, theorems with their tactic structure, and a program
// `Definition main : list string` whose elements are the lines the program
// prints. Everything else is rejected with a precise obligation.

import { TranslationError, unsupported } from './diagnostics.js';
import { TokenCursor, describe, tokenize } from './lexer.js';
import { BOOL, INT, NAT, STRING, UNIT } from './types.js';

const BUILTIN_TYPES = { nat: NAT, N: NAT, Z: INT, bool: BOOL, string: STRING, unit: UNIT };
const THEOREM_KEYWORDS = new Set(['Theorem', 'Lemma', 'Example', 'Fact', 'Remark', 'Corollary', 'Proposition']);
const UNSUPPORTED_COMMANDS = new Set([
  'Section', 'Variable', 'Variables', 'Hypothesis', 'Context', 'Record', 'Structure', 'Class', 'Instance',
  'CoInductive', 'CoFixpoint', 'Axiom', 'Parameter', 'Notation', 'Infix', 'Ltac', 'Program', 'Let',
  'Arguments', 'Hint', 'Set', 'Unset', 'Global', 'Local', 'Module Type', 'Include', 'Export', 'Canonical',
  'Coercion', 'Scheme', 'Equations', 'Declare',
]);
const EXPRESSION_STOP = new Set(['then', 'else', 'with', 'end', 'in', 'as', 'return']);

// Library functions of the portable core, by Rocq name. Rounding follows
// the Stdlib definition: `Z.div`/`Z.modulo` floor, `Z.quot`/`Z.rem` truncate,
// and the natural-number divisions are total with `x / 0 = 0`.
const BINARY_FUNCTIONS = {
  'N.add': { op: 'add' }, 'Z.add': { op: 'add' }, 'Nat.add': { op: 'add' }, plus: { op: 'add' },
  'N.sub': { op: 'sub' }, 'Z.sub': { op: 'sub' }, 'Nat.sub': { op: 'sub' }, minus: { op: 'sub' },
  'N.mul': { op: 'mul' }, 'Z.mul': { op: 'mul' }, 'Nat.mul': { op: 'mul' }, mult: { op: 'mul' },
  'N.div': { op: 'div' }, 'Nat.div': { op: 'div' }, 'Z.div': { op: 'div', rounding: 'floor' },
  'N.modulo': { op: 'rem' }, 'Nat.modulo': { op: 'rem' }, 'Z.modulo': { op: 'rem', rounding: 'floor' },
  'Z.quot': { op: 'div', rounding: 'trunc' }, 'Z.rem': { op: 'rem', rounding: 'trunc' },
  'N.eqb': { op: 'eq' }, 'Z.eqb': { op: 'eq' }, 'Nat.eqb': { op: 'eq' }, 'String.eqb': { op: 'eq' }, 'Bool.eqb': { op: 'eq' }, eqb: { op: 'eq' },
  'N.ltb': { op: 'lt' }, 'Z.ltb': { op: 'lt' }, 'Nat.ltb': { op: 'lt' },
  'N.leb': { op: 'le' }, 'Z.leb': { op: 'le' }, 'Nat.leb': { op: 'le' },
  'Z.gtb': { op: 'gt' }, 'Z.geb': { op: 'ge' },
  andb: { op: 'and' }, orb: { op: 'or' },
  'String.append': { op: 'concat' },
};
const NAT_TO_INT = new Set(['Z.of_N', 'Z.of_nat']);
const INT_TO_NAT = new Set(['Z.to_N', 'Z.to_nat']);
const NAT_IDENTITY = new Set(['N.of_nat', 'N.to_nat', 'Nat.of_N']);
const PREDECESSOR = new Set(['N.pred', 'Nat.pred', 'pred', 'Z.pred']);
const SUCCESSOR = new Set(['N.succ', 'Nat.succ', 'S', 'Z.succ']);
// `NilEmpty.string_of_uint (N.to_uint n)` and `NilZero.string_of_int
// (Z.to_int z)` are the Stdlib's decimal renderings, the same text as the
// other languages' number printing.
const DECIMAL_STRINGS = {
  'NilEmpty.string_of_uint': new Set(['N.to_uint', 'Nat.to_uint']),
  'DecimalString.NilEmpty.string_of_uint': new Set(['N.to_uint', 'Nat.to_uint']),
  'NilZero.string_of_int': new Set(['Z.to_int']),
  'DecimalString.NilZero.string_of_int': new Set(['Z.to_int']),
};
const OUTSIDE_CORE = /^(?:N|Z|Nat|String|Pos|List|Bool|Ascii)\./u;

const NOTATION = [
  { ops: ['||'], level: 50, op: 'or' },
  { ops: ['+'], level: 50, op: 'add' },
  { ops: ['-'], level: 50, op: 'sub' },
  { ops: ['&&'], level: 40, op: 'and' },
  { ops: ['*'], level: 40, op: 'mul' },
  { ops: ['/'], level: 40, op: 'div' },
  { ops: ['mod'], level: 40, op: 'rem' },
];
const BOOLEAN_RELATIONS = { '=?': 'eq', '<?': 'lt', '<=?': 'le' };
const PROP_RELATIONS = { '=': 'eq', '<>': 'ne', '<': 'lt', '<=': 'le', '>': 'gt', '>=': 'ge' };
const SCOPES = { N: NAT, nat: NAT, Z: INT };

export function parseRocq(source) {
  const { tokens } = tokenize(source, 'Rocq');
  return new RocqParser(tokens, source).file();
}

class RocqParser {
  constructor(tokens, source) {
    this.cursor = new TokenCursor(tokens, 'Rocq');
    this.source = source;
  }

  fail(message, token = this.cursor.peek()) {
    return new TranslationError('syntax', `${message} but found ${describe(token)}`, token);
  }

  /** The `.` that ends a sentence. */
  endSentence(context) {
    this.cursor.expect('.', context);
  }

  file() {
    const root = { items: [], main: null };
    this.items(root, root.items, []);
    return { language: 'Rocq', items: root.items, main: root.main };
  }

  items(root, items, path) {
    const c = this.cursor;
    while (!c.atEnd()) {
      const token = c.peek();
      if (c.is('End')) {
        if (!path.length) throw this.fail('unmatched End');
        c.next();
        const name = c.identifier('End').value;
        if (name !== path.at(-1)) throw new TranslationError('syntax', `End ${name} closes module ${path.at(-1)}`, token);
        this.endSentence('End');
        return;
      }
      if (c.is('Module')) {
        c.next();
        if (c.is('Type') || c.is('Import') || c.is('Export')) {
          throw unsupported(`Rocq Module ${c.peek().value}`, 'module types and functors are outside the portable core', span(token, c.peek()));
        }
        const name = c.identifier('Module').value;
        if (name.includes('.')) throw unsupported('qualified module name', 'declare one module per level', span(token, token));
        if (!c.is('.')) throw unsupported('module signature or functor', 'only plain modules are portable', span(token, c.peek()));
        this.endSentence('Module');
        const module = { k: 'module', name, items: [], span: span(token, c.peek()) };
        items.push(module);
        this.items(root, module.items, [...path, name]);
        continue;
      }
      if (this.ignoredCommand()) continue;
      if (c.is('Inductive')) {
        items.push(this.inductive());
        continue;
      }
      if (c.is('Definition') || c.is('Fixpoint') || c.is('Function')) {
        const item = this.definition(path);
        if (item.k === 'main') {
          if (path.length) throw unsupported('main inside a module', 'main must be declared at the top level', item.span);
          if (root.main) throw new TranslationError('type', 'duplicate main', item.span);
          root.main = item.main;
        } else {
          items.push(item);
        }
        continue;
      }
      if (token.kind === 'identifier' && THEOREM_KEYWORDS.has(token.value)) {
        items.push(this.theorem());
        continue;
      }
      if (c.is('Eval') || c.is('Compute')) {
        this.evaluation(root);
        continue;
      }
      if (token.kind === 'identifier' && (UNSUPPORTED_COMMANDS.has(token.value) || /^[A-Z]/u.test(token.value))) {
        throw unsupported(`Rocq ${token.value} command`, 'outside the portable core', span(token, token));
      }
      throw this.fail('expected a Rocq command');
    }
    if (path.length) throw new TranslationError('syntax', `module ${path.at(-1)} is not closed`, c.peek());
  }

  /**
   * Library loading and notation scopes do not change the program's meaning
   * in the portable core: operators are resolved by their operand types.
   */
  ignoredCommand() {
    const c = this.cursor;
    const token = c.peek();
    const skip = () => {
      while (!c.atEnd() && !c.is('.')) c.next();
      this.endSentence(token.value);
      return true;
    };
    if (c.is('From')) {
      c.next();
      c.identifier('From');
      c.expect('Require', 'From');
      return skip();
    }
    if (c.is('Require')) return skip();
    if (c.is('Import') && c.is('ListNotations', 1)) return skip();
    if (c.is('Open') && c.is('Scope', 1)) return skip();
    if (c.is('Local') && c.is('Open', 1) && c.is('Scope', 2)) return skip();
    return false;
  }

  /** `Eval <strategy> in main.` or `Compute main.` displays the program output. */
  evaluation(root) {
    const c = this.cursor;
    const token = c.next();
    if (token.value === 'Eval') {
      const strategy = c.identifier('Eval').value;
      if (!['vm_compute', 'compute', 'cbv', 'lazy', 'native_compute', 'cbn', 'simpl'].includes(strategy)) {
        throw unsupported(`Eval ${strategy}`, 'unknown reduction strategy', span(token, c.peek()));
      }
      c.expect('in', 'Eval');
    }
    const target = c.peek();
    if (!c.is('main')) throw unsupported('evaluation command', 'only the evaluation of main is part of the program output', span(token, target));
    c.next();
    this.endSentence(token.value);
    root.displayed = true;
  }

  inductive() {
    const c = this.cursor;
    const start = c.next();
    const name = c.identifier('Inductive').value;
    if (name.includes('.')) throw unsupported('qualified inductive name', 'declare inductives inside their module', span(start, start));
    if (c.is('(') || c.is('{')) throw unsupported('parameterised inductive', 'type parameters are outside the portable core', span(start, c.peek()));
    if (c.eat(':')) {
      const sort = c.identifier('Inductive sort');
      if (!['Type', 'Set'].includes(sort.value)) throw unsupported(`inductive in ${sort.value}`, 'only data types are portable', span(start, sort));
    }
    c.expect(':=', 'Inductive');
    const ctors = [];
    c.eat('|');
    do {
      const ctorStart = c.peek();
      const ctorName = c.identifier('constructor').value;
      const fields = [];
      while (c.is('(')) fields.push(...this.binderGroup());
      if (c.eat(':')) {
        const types = this.arrowType();
        const result = types.pop();
        if (result.kind !== 'named' || result.path.join('.') !== name) {
          throw unsupported('indexed constructor', `${ctorName} must construct ${name}`, span(ctorStart, c.peek()));
        }
        fields.push(...types.map((type) => ({ type })));
      }
      ctors.push({ name: ctorName, fields });
    } while (c.eat('|'));
    if (c.is('with')) throw unsupported('mutual inductive', 'mutually inductive types are outside the portable core', span(start, c.peek()));
    this.endSentence('Inductive');
    return { k: 'data', name, ctors, span: span(start, c.peek()) };
  }

  binderGroup() {
    const c = this.cursor;
    const open = c.expect('(', 'binder');
    const names = [];
    while (c.isKind('identifier')) names.push(c.next().value);
    if (!names.length) throw this.fail('expected binder names');
    c.expect(':', 'binder');
    const rocqType = c.peek().value;
    const type = this.type();
    c.expect(')', 'binder');
    return names.map((name) => ({ name, type, rocqType, span: span(open, c.peek()) }));
  }

  binders() {
    const result = [];
    while (this.cursor.is('(')) result.push(...this.binderGroup());
    if (this.cursor.is('{') && !this.cursor.is('struct', 1) && !this.cursor.is('measure', 1)) {
      throw unsupported('implicit binder', 'implicit binders are outside the portable core', span(this.cursor.peek(), this.cursor.peek()));
    }
    if (this.cursor.is('`')) throw unsupported('generalised binder', 'outside the portable core', span(this.cursor.peek(), this.cursor.peek()));
    return result;
  }

  arrowType() {
    const types = [this.type()];
    while (this.cursor.eat('->')) types.push(this.type());
    return types;
  }

  type() {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('(')) {
      const types = this.arrowType();
      if (c.is('*')) throw unsupported('product type', 'tuples are outside the portable core', span(token, c.peek()));
      c.expect(')', 'type');
      if (types.length !== 1) throw unsupported('function type', 'higher-order values are outside the portable core', span(token, token));
      return types[0];
    }
    const name = c.identifier('type').value;
    if (Object.hasOwn(BUILTIN_TYPES, name)) {
      if (c.is('*')) throw unsupported('product type', 'tuples are outside the portable core', span(token, c.peek()));
      return BUILTIN_TYPES[name];
    }
    if (/^(?:list|option|prod|sum|positive|ascii|Type|Set|Prop|sig|sigT|Q|R|vector|int|uint|float|PrimInt63\.int|Uint63\.int)$/u.test(name)) {
      throw unsupported(`Rocq type ${name}`, 'outside the portable core', span(token, token));
    }
    const next = c.peek();
    if (next.kind === 'identifier' && !['with', 'end', 'in', 'then', 'else'].includes(next.value)) {
      throw unsupported('type application', `${name} ${next.value} is outside the portable core`, span(token, next));
    }
    if (c.is('*')) throw unsupported('product type', 'tuples are outside the portable core', span(token, c.peek()));
    return { kind: 'named', path: name.split('.'), span: span(token, token) };
  }

  definition(path) {
    const c = this.cursor;
    const start = c.next();
    const keyword = start.value;
    const nameToken = c.identifier(keyword);
    const name = nameToken.value;
    if (name.includes('.')) throw unsupported('qualified definition name', 'declare definitions inside their module', span(nameToken, nameToken));
    const params = this.binders();
    const annotation = this.recursionAnnotation(keyword, params, start);
    if (!c.is(':')) throw unsupported('definition without a result type', `${name} needs an explicit result type`, span(start, c.peek()));
    c.next();
    if (name === 'main' && path.length === 0 && keyword === 'Definition' && c.is('list') && c.is('string', 1)) {
      return this.main(start);
    }
    const ret = this.type();
    c.expect(':=', keyword);
    const body = this.expr();
    this.checkPortable(body);
    if (c.is('with')) throw unsupported('mutual fixpoint', 'mutually recursive definitions are outside the portable core', span(start, c.peek()));
    this.endSentence(keyword);
    if (keyword === 'Function') this.skipObligations(start, annotation);
    return { k: 'fn', name, params, ret, body, span: span(start, c.peek()) };
  }

  /**
   * `{struct x}` names the structural argument and `{measure N.to_nat x}`
   * justifies a `Function`; the portable core finds its own decreasing
   * argument and every target re-establishes termination.
   */
  recursionAnnotation(keyword, params, start) {
    const c = this.cursor;
    if (!c.is('{')) {
      if (keyword === 'Function') throw unsupported('Function without a measure', 'Function needs {measure …} or {struct …}', span(start, c.peek()));
      return null;
    }
    const open = c.next();
    const kind = c.identifier('recursion annotation').value;
    if (kind === 'struct') {
      if (keyword === 'Definition') throw this.fail('struct annotation on a Definition', open);
      const arg = c.identifier('struct').value;
      if (!params.some((param) => param.name === arg)) throw new TranslationError('type', `struct argument ${arg} is not a parameter`, open);
      c.expect('}', 'struct');
      return { kind, arg };
    }
    if (kind === 'measure' && keyword === 'Function') {
      const measureFn = c.identifier('measure').value;
      if (!['N.to_nat', 'Z.to_nat'].includes(measureFn) && !(measureFn in {})) {
        if (!params.some((param) => param.name === measureFn)) {
          throw unsupported(`measure ${measureFn}`, 'only N.to_nat x, Z.to_nat x or a nat argument are portable measures', span(open, c.peek()));
        }
        c.expect('}', 'measure');
        return { kind, arg: measureFn };
      }
      const arg = c.identifier('measure').value;
      if (!params.some((param) => param.name === arg)) throw new TranslationError('type', `measure argument ${arg} is not a parameter`, open);
      c.expect('}', 'measure');
      return { kind, arg, via: measureFn };
    }
    throw unsupported(`{${kind} …}`, 'only struct and measure annotations are portable', span(open, c.peek()));
  }

  /** The termination obligations of a `Function` are the target's to discharge again. */
  skipObligations(start, annotation) {
    const c = this.cursor;
    if (annotation?.kind !== 'measure') return;
    if (!c.is('Proof')) throw unsupported('Function without its obligation proof', 'the measure obligations must be proved', span(start, c.peek()));
    c.next();
    this.endSentence('Proof');
    while (!c.atEnd() && !((c.is('Defined') || c.is('Qed')) && c.is('.', 1))) {
      if (c.is('Admitted') || c.is('admit')) throw unsupported('admitted obligation', 'incomplete proofs cannot be translated', span(c.peek(), c.peek()));
      c.next();
    }
    if (c.atEnd()) throw this.fail('expected Defined');
    c.next();
    this.endSentence('Defined');
  }

  /** Lists only appear as the program output. */
  checkPortable(node) {
    const visit = (value) => {
      if (!value || typeof value !== 'object') return;
      if (Array.isArray(value)) {
        value.forEach(visit);
        return;
      }
      if (value.k === 'cons' || value.k === 'nil' || value.k === 'list') {
        throw unsupported('list value', 'lists are outside the portable core except as the program output', value.span);
      }
      for (const [key, inner] of Object.entries(value)) if (key !== 'span' && key !== 'type') visit(inner);
    };
    visit(node);
  }

  main(start) {
    const c = this.cursor;
    c.expect('list', 'main');
    c.expect('string', 'main');
    c.expect(':=', 'main');
    const body = this.expr();
    this.endSentence('main');
    const effects = [];
    const walk = (node) => {
      switch (node.k) {
        case 'nil':
          return;
        case 'list':
          for (const item of node.items) effects.push(this.printEffect(item));
          return;
        case 'cons':
          effects.push(this.printEffect(node.head));
          walk(node.tail);
          return;
        case 'let':
          this.checkPortable(node.value);
          effects.push({ k: 'let', name: node.name, type: node.type, value: node.value, span: node.span });
          walk(node.body);
          return;
        default:
          throw unsupported('program output', 'main must be a list of lines built with ::, [ ; ] and let', node.span);
      }
    };
    walk(body);
    return { k: 'main', main: { effects, span: span(start, c.peek()) }, span: span(start, c.peek()) };
  }

  printEffect(expr) {
    this.checkPortable(expr);
    return { k: 'print', expr, style: 'rocq', span: expr.span };
  }

  theorem() {
    const c = this.cursor;
    const start = c.next();
    const name = c.identifier(start.value).value;
    const binders = this.binders();
    c.expect(':', start.value);
    const prop = this.prop();
    this.endSentence(start.value);
    const proofStart = c.peek();
    if (!c.eat('Proof')) throw unsupported('proof term', 'only tactic proofs are reconstructed', span(proofStart, proofStart));
    this.endSentence('Proof');
    const bodyStart = c.peek();
    const types = new Map(binders.map((binder) => [binder.name, binder.rocqType]));
    collectForallTypes(prop, types);
    const steps = this.proofBlock(types, () => c.is('Qed') || c.is('Defined') || c.is('Admitted') || c.is('Abort'));
    const end = c.peek();
    if (c.is('Admitted') || c.is('Abort')) throw unsupported(`Rocq ${end.value}`, 'incomplete proofs cannot be translated', span(end, end));
    c.next();
    this.endSentence(end.value);
    const proof = {
      steps,
      source: this.source.slice(bodyStart.start, end.start).trim(),
      sourceLanguage: 'Rocq',
    };
    return { k: 'theorem', name, binders, prop, proof, span: span(start, c.peek()) };
  }

  /**
   * A tactic script: sentences, where a sentence that splits a goal is
   * followed either by `;` tactics for every subgoal or by one bullet or
   * brace block per subgoal.
   */
  proofBlock(types, done) {
    const c = this.cursor;
    const steps = [];
    while (!c.atEnd() && !done()) {
      const sentence = this.tacticChain(types);
      this.endSentence('tactic');
      const split = sentence.findIndex((step) => step.t === 'induction' || step.t === 'cases');
      if (split < 0) {
        steps.push(...sentence);
        continue;
      }
      steps.push(...sentence);
      const step = sentence[split];
      if (split === sentence.length - 1 && !done()) {
        // One block per subgoal, in constructor order.
        const blocks = this.subgoalBlocks(types, done);
        step.cases = step.cases.map((kase, index) => ({ ...kase, steps: blocks[index] ?? [] }));
        if (blocks.length > step.cases.length) {
          for (let index = step.cases.length; index < blocks.length; index += 1) step.cases.push({ index, binds: [], steps: blocks[index] });
        }
        step.blocks = blocks.length;
      }
      if (!done()) throw unsupported('tactics after a case split', 'every subgoal must be closed inside its bullet or brace block', span(c.peek(), c.peek()));
    }
    return steps;
  }

  subgoalBlocks(types, done) {
    const c = this.cursor;
    const blocks = [];
    const bullet = this.bullet();
    if (bullet) {
      while (this.bullet()?.text === bullet.text) {
        this.consumeBullet();
        blocks.push(this.proofBlock(types, () => done() || c.is('}') || this.bullet()?.text === bullet.text || (this.bullet() && this.bullet().depth < bullet.depth)));
      }
      return blocks;
    }
    if (c.is('{')) {
      while (c.eat('{')) {
        blocks.push(this.proofBlock(types, () => c.is('}')));
        c.expect('}', 'subgoal block');
      }
      return blocks;
    }
    throw unsupported('unstructured subgoals', 'close each subgoal of a case split inside a bullet or brace block, or with ;', span(c.peek(), c.peek()));
  }

  /** A bullet is a run of adjacent `-`, `+` or `*` at the start of a sentence. */
  bullet() {
    const c = this.cursor;
    const first = c.peek();
    if (first.kind !== 'punct' || !['-', '+', '*'].includes(first.value)) return null;
    let text = first.value;
    let offset = 1;
    while (c.peek(offset).kind === 'punct' && c.peek(offset).value === first.value && c.peek(offset).start === c.peek(offset - 1).end) {
      text += first.value;
      offset += 1;
    }
    return { text, length: offset, depth: text.length };
  }

  consumeBullet() {
    const { length } = this.bullet();
    for (let index = 0; index < length; index += 1) this.cursor.next();
  }

  tacticChain(types) {
    const steps = [...this.tactic(types)];
    while (this.cursor.eat(';')) steps.push(...this.tactic(types));
    return steps;
  }

  tactic(types) {
    const c = this.cursor;
    const token = c.peek();
    if (token.kind !== 'identifier') throw this.fail('expected a tactic');
    c.next();
    const value = token.value;
    const noTarget = () => {
      if (c.is('in') || c.is('at')) throw unsupported(`${value} ${c.peek().value}`, 'hypothesis rewriting is outside the portable proof model', span(token, c.peek()));
    };
    switch (value) {
      case 'reflexivity':
      case 'vm_compute':
      case 'native_compute':
      case 'compute':
      case 'cbv':
      case 'lazy':
      case 'trivial':
      case 'easy':
      case 'auto':
      case 'congruence':
      case 'discriminate':
        noTarget();
        return [{ t: 'compute', tactic: value }];
      case 'lia':
      case 'nia':
      case 'omega':
      case 'ring':
        return [{ t: 'arith', tactic: value }];
      case 'intro':
      case 'intros': {
        const names = [];
        while (c.isKind('identifier')) names.push(c.next().value);
        return [{ t: 'intro', names }];
      }
      case 'simpl':
      case 'cbn': {
        const names = [];
        if (c.eat('[')) {
          while (!c.is(']')) names.push(c.identifier(value).value);
          c.expect(']', value);
        } else {
          while (c.isKind('identifier') && !c.is('in') && !c.is('at')) names.push(c.next().value);
        }
        noTarget();
        if (!names.length) return [{ t: 'simp', rules: [], only: false, tactic: value }];
        return [{ t: 'unfold', names, tactic: value }];
      }
      case 'unfold': {
        const names = [c.identifier('unfold').value];
        while (c.eat(',')) names.push(c.identifier('unfold').value);
        noTarget();
        return [{ t: 'unfold', names }];
      }
      case 'rewrite': {
        const rules = [];
        do {
          const reverse = Boolean(c.eat('<-'));
          c.eat('?');
          c.eat('!');
          rules.push({ name: c.identifier('rewrite rule').value, reverse });
        } while (c.eat(','));
        noTarget();
        return [{ t: 'rewrite', rules, tactic: value }];
      }
      case 'now': {
        const inner = this.tactic(types);
        return [...inner, { t: 'compute', tactic: 'easy' }];
      }
      case 'induction':
      case 'destruct': {
        const variable = c.identifier(value).value;
        let names = null;
        let using = null;
        for (;;) {
          if (c.eat('as')) {
            names = this.introPattern();
            continue;
          }
          if (c.eat('using')) {
            using = c.identifier('using').value;
            continue;
          }
          break;
        }
        const rocqType = types.get(variable);
        if (rocqType === 'N' && value === 'induction' && using !== 'N.peano_ind') {
          throw unsupported('binary induction on N', 'N is split as zero and successor only with `using N.peano_ind`', span(token, c.peek()));
        }
        if (rocqType === 'N' && value === 'destruct') {
          throw unsupported('binary case analysis on N', 'destructing N yields N0 and Npos, which have no portable counterpart', span(token, c.peek()));
        }
        if (rocqType === 'Z') throw unsupported(`${value} on Z`, 'integers are not split in the portable proof model', span(token, c.peek()));
        if (using && using !== 'N.peano_ind') throw unsupported(`induction using ${using}`, 'custom induction principles are outside the portable proof model', span(token, c.peek()));
        const cases = (names ?? []).map((binds, index) => ({ index, binds, steps: [] }));
        return [{ t: value === 'induction' ? 'induction' : 'cases', variable, cases, positional: true }];
      }
      default:
        throw unsupported(`Rocq tactic ${value}`, 'outside the portable proof model', span(token, token));
    }
  }

  /** `[ | k ih ]`: one list of names per constructor, in declaration order. */
  introPattern() {
    const c = this.cursor;
    c.expect('[', 'intro pattern');
    const alternatives = [[]];
    while (!c.is(']')) {
      if (c.eat('|')) {
        alternatives.push([]);
        continue;
      }
      if (c.eat('_')) {
        alternatives.at(-1).push('_');
        continue;
      }
      const token = c.peek();
      if (token.kind !== 'identifier') throw unsupported('intro pattern', `${describe(token)} is outside the portable proof model`, span(token, token));
      alternatives.at(-1).push(c.next().value);
    }
    c.expect(']', 'intro pattern');
    return alternatives;
  }

  prop() {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('forall')) {
      const binders = [];
      if (c.is('(')) {
        while (c.is('(')) binders.push(...this.binderGroup());
      } else {
        const names = [];
        while (c.isKind('identifier') && !c.is(':')) names.push(c.next().value);
        c.expect(':', 'forall');
        const rocqType = c.peek().value;
        const type = this.type();
        binders.push(...names.map((name) => ({ name, type, rocqType })));
      }
      c.expect(',', 'forall');
      return { p: 'forall', binders, body: this.prop(), span: span(token, c.peek()) };
    }
    if (c.is('exists')) throw unsupported('existential', 'existential statements are outside the portable proof model', span(token, token));
    const left = this.propOr();
    if (c.eat('->')) return { p: 'implies', left, right: this.prop() };
    if (c.is('<->')) throw unsupported('logical equivalence', 'state both implications separately', span(c.peek(), c.peek()));
    return left;
  }

  propOr() {
    const left = this.propAnd();
    if (this.cursor.eat('\\/')) return { p: 'or', left, right: this.propOr() };
    return left;
  }

  propAnd() {
    const left = this.propUnary();
    if (this.cursor.eat('/\\')) return { p: 'and', left, right: this.propAnd() };
    return left;
  }

  propUnary() {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('~')) return { p: 'not', arg: this.propUnary() };
    if (c.is('forall')) return this.prop();
    if (c.is('(') && this.propParenthesised()) {
      c.next();
      const inner = this.prop();
      c.expect(')', 'proposition');
      return this.propScope(inner);
    }
    if (c.is('True') || c.is('False')) throw unsupported(`${token.value}`, 'propositional constants are outside the portable proof model', span(token, token));
    const left = this.expr(69);
    const relation = c.peek();
    if (relation.kind === 'punct' && PROP_RELATIONS[relation.value]) {
      c.next();
      const right = this.expr(69);
      return { p: PROP_RELATIONS[relation.value], left, right, span: span(token, c.peek()) };
    }
    return { p: 'bool', expr: { k: 'binary', op: 'eq', left, right: { k: 'bool', value: true }, span: left.span }, span: span(token, c.peek()) };
  }

  /** `(P)%Z` delimits the literals of a whole proposition. */
  propScope(inner) {
    const scope = this.scopeDelimiter();
    if (!scope) return inner;
    const visit = (prop) => {
      if (prop.p === 'forall') return { ...prop, body: visit(prop.body) };
      if (prop.p === 'not') return { ...prop, arg: visit(prop.arg) };
      if (prop.p === 'bool') return prop;
      if (prop.left && prop.left.p) return { ...prop, left: visit(prop.left), right: visit(prop.right) };
      return { ...prop, left: withScope(prop.left, scope), right: withScope(prop.right, scope) };
    };
    return visit(inner);
  }

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
      if (depth === 1 && ['/\\', '\\/', '->', '~', 'forall', '=', '<>', '<', '<=', '>', '>='].includes(token.value)) return true;
    }
  }

  /**
   * Terms, by Rocq notation level: `let`, `if` and `match` at 200, the
   * boolean relations at 70, `::` and `++` at 60, `+ - ||` at 50, `* / mod
   * &&` at 40, unary minus at 35, and application.
   */
  expr(level = 200) {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('if')) {
      c.next();
      const cond = this.expr();
      c.expect('then', 'if');
      const then = this.expr();
      c.expect('else', 'if');
      const otherwise = this.expr();
      return { k: 'if', cond, then, else: otherwise, span: span(token, c.peek()) };
    }
    if (c.is('let')) {
      c.next();
      if (c.is('(') || c.is('\'')) throw unsupported('destructuring let', 'tuples are outside the portable core', span(token, c.peek()));
      const name = c.identifier('let').value;
      if (c.is('(')) throw unsupported('local function', 'let-bound functions are outside the portable core', span(token, c.peek()));
      const type = c.eat(':') ? this.type() : undefined;
      c.expect(':=', 'let');
      const value = this.expr();
      c.expect('in', 'let');
      const body = this.expr();
      return { k: 'let', name, type, value, body, span: span(token, c.peek()) };
    }
    if (c.is('fun')) throw unsupported('lambda', 'higher-order values are outside the portable core', span(token, token));
    if (c.is('fix')) throw unsupported('local fixpoint', 'local recursive functions are outside the portable core', span(token, token));
    return this.relation(level);
  }

  relation(level) {
    const c = this.cursor;
    const left = this.infix(60);
    const token = c.peek();
    if (level >= 70 && token.kind === 'punct' && BOOLEAN_RELATIONS[token.value]) {
      c.next();
      const right = this.infix(60);
      return { k: 'binary', op: BOOLEAN_RELATIONS[token.value], left, right, span: joined(left, right, token) };
    }
    return left;
  }

  /** Levels 60 and below: `::`, `++` (right), `+ - ||` and `* / mod &&` (left). */
  infix(level) {
    const c = this.cursor;
    if (level === 60) {
      const left = this.infix(50);
      const token = c.peek();
      if (c.is('::')) {
        c.next();
        const tail = this.cons();
        return { k: 'cons', head: left, tail, span: joined(left, tail, token) };
      }
      if (c.is('++')) {
        c.next();
        const right = this.infix(60);
        return { k: 'binary', op: 'concat', left, right, span: joined(left, right, token) };
      }
      return left;
    }
    let left = level === 50 ? this.infix(40) : this.prefix();
    for (;;) {
      const token = c.peek();
      const entry = NOTATION.find((candidate) => candidate.level === level && candidate.ops.includes(token.value)
        && (token.kind === 'punct' || token.value === 'mod'));
      if (!entry) return left;
      c.next();
      const right = level === 50 ? this.infix(40) : this.prefix();
      left = { k: 'binary', op: entry.op, left, right, span: joined(left, right, token) };
    }
  }

  /** The tail of `::` may itself be a `let` of the program output. */
  cons() {
    if (this.cursor.is('let') || this.cursor.is('if') || this.cursor.is('match')) return this.expr();
    return this.infix(60);
  }

  prefix() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('-')) {
      c.next();
      const arg = this.prefix();
      return { k: 'unary', op: 'neg', arg, span: span(token, c.peek()) };
    }
    return this.application();
  }

  argumentStart() {
    const token = this.cursor.peek();
    if (token.kind === 'identifier') return !EXPRESSION_STOP.has(token.value) && token.value !== 'mod' && !['if', 'let', 'match', 'fun', 'fix'].includes(token.value);
    return ['number', 'string'].includes(token.kind) || ['(', '['].includes(token.value);
  }

  application() {
    const c = this.cursor;
    const token = c.peek();
    if (c.is('match')) return this.match();
    const head = this.atom();
    const args = [];
    while (this.argumentStart()) args.push(this.atom());
    return this.applyHead(head, args, token);
  }

  applyHead(head, args, token) {
    const range = span(token, this.cursor.peek());
    if (head.k === 'name' && head.path.length >= 1) {
      const name = head.path.join('.');
      const arity = (count) => {
        if (args.length !== count) {
          if (args.length < count) throw unsupported('partial application', `${name} expects ${count} arguments`, range);
          throw new TranslationError('type', `${name} expects ${count} arguments but got ${args.length}`, range);
        }
      };
      if (Object.hasOwn(BINARY_FUNCTIONS, name)) {
        arity(2);
        const { op, rounding } = BINARY_FUNCTIONS[name];
        const node = { k: 'binary', op, left: args[0], right: args[1], span: range };
        if (rounding) node.rounding = rounding;
        return node;
      }
      if (name === 'negb') {
        arity(1);
        return { k: 'unary', op: 'not', arg: args[0], span: range };
      }
      if (name === 'Z.opp') {
        arity(1);
        return { k: 'unary', op: 'neg', arg: args[0], span: range };
      }
      if (NAT_TO_INT.has(name)) {
        arity(1);
        return { k: 'cast', arg: args[0], to: INT, from: NAT, flavor: 'exact', span: range };
      }
      if (INT_TO_NAT.has(name)) {
        arity(1);
        return { k: 'cast', arg: args[0], to: NAT, from: INT, flavor: 'clamp', span: range };
      }
      if (NAT_IDENTITY.has(name)) {
        arity(1);
        return { k: 'cast', arg: args[0], to: NAT, from: NAT, flavor: 'exact', span: range };
      }
      if (PREDECESSOR.has(name) || SUCCESSOR.has(name)) {
        arity(1);
        const op = PREDECESSOR.has(name) ? 'sub' : 'add';
        const one = { k: 'num', value: '1', span: range };
        if (name.startsWith('Z.')) one.type = INT;
        return { k: 'binary', op, left: args[0], right: one, span: range };
      }
      if (Object.hasOwn(DECIMAL_STRINGS, name)) {
        arity(1);
        const [inner] = args;
        const accepted = DECIMAL_STRINGS[name];
        if (inner.k === 'app' && inner.fn.k === 'name' && accepted.has(inner.fn.path.join('.')) && inner.args.length === 1) {
          return { k: 'toString', arg: inner.args[0], span: range };
        }
        throw unsupported(`${name}`, `only ${name} (${[...accepted].join(' | ')} x) renders a number`, range);
      }
      if (name === 'tt' && !args.length) return { k: 'unit', span: range };
      if (name === 'true' || name === 'false') {
        if (args.length) throw new TranslationError('type', `${name} is not a function`, range);
        return { k: 'bool', value: name === 'true', span: range };
      }
      if (OUTSIDE_CORE.test(name) && ![...Object.keys(DECIMAL_STRINGS)].some((key) => key.includes(name))) {
        if (args.length && /^(?:N|Z|Nat)\.to_u?int$/u.test(name)) return { k: 'app', fn: head, args, span: range };
        throw unsupported(`Rocq library function ${name}`, 'outside the portable core', range);
      }
      if (name === 'nil' && !args.length) return { k: 'nil', span: range };
    }
    if (!args.length) return head;
    if (head.k !== 'name') throw unsupported('higher-order application', 'only named functions can be applied', range);
    return { k: 'app', fn: head, args, span: range };
  }

  match() {
    const c = this.cursor;
    const token = c.next();
    const scrutinees = [this.expr()];
    while (c.eat(',')) scrutinees.push(this.expr());
    if (c.is('as') || c.is('in') || c.is('return')) throw unsupported('dependent match', 'return clauses are outside the portable core', span(token, c.peek()));
    c.expect('with', 'match');
    const rows = [];
    c.eat('|');
    if (!c.is('end')) {
      do {
        const bar = c.peek();
        const aliases = [];
        const patterns = [this.pattern(aliases)];
        while (c.eat(',')) patterns.push(this.pattern(aliases));
        if (patterns.length !== scrutinees.length) {
          throw new TranslationError('syntax', `alternative has ${patterns.length} patterns, expected ${scrutinees.length}`, bar);
        }
        c.expect('=>', 'alternative');
        let body = this.expr();
        for (const alias of aliases.reverse()) {
          body = { k: 'let', name: alias.name, value: alias.value, body, span: body.span };
        }
        rows.push({ patterns, body, span: span(bar, c.peek()) });
      } while (c.eat('|'));
    }
    c.expect('end', 'match');
    if (!rows.length) throw this.fail('expected match alternatives');
    return this.scoped({ k: 'match', scrutinees, rows, span: span(token, c.peek()) });
  }

  /**
   * Patterns: constructors (`O`, `S k`, `node l v r`), numerals, `_`,
   * variables, parentheses and `p as x`. An alias becomes a `let` of the
   * value the pattern matched, rebuilt from its fields.
   */
  pattern(aliases) {
    const c = this.cursor;
    const token = c.peek();
    let pattern;
    if (token.kind === 'identifier' && !['_'].includes(token.value)) {
      const path = c.next().value.split('.');
      const args = [];
      while (this.patternArgumentStart()) args.push(this.patternAtom(aliases));
      pattern = !args.length && path.length === 1
        ? { k: 'bindOrCtor', name: path[0], span: span(token, token) }
        : { k: 'ctor', path, args, span: span(token, c.peek()) };
    } else {
      pattern = this.patternAtom(aliases);
    }
    while (c.eat('as')) {
      const name = c.identifier('as').value;
      aliases.push({ name, value: patternValue(pattern, span(token, c.peek())) });
    }
    if (c.is('|') && c.peek(1).kind !== 'identifier' && c.peek(1).value !== '_' && c.peek(1).kind !== 'number' && c.peek(1).value !== '(') {
      return pattern;
    }
    return pattern;
  }

  patternArgumentStart() {
    const token = this.cursor.peek();
    return (token.kind === 'identifier' && !['as', 'with', 'end'].includes(token.value)) || token.kind === 'number' || this.cursor.is('(') || this.cursor.is('_');
  }

  patternAtom(aliases) {
    const c = this.cursor;
    const token = c.peek();
    if (c.eat('_')) return { k: 'wild' };
    if (token.kind === 'number') {
      c.next();
      if (c.is('%')) throw unsupported('scoped numeral pattern', 'numeral patterns on N or Z match binary constructors, which have no portable counterpart', span(token, c.peek()));
      return { k: 'numLit', value: token.value, span: span(token, token) };
    }
    if (c.eat('(')) {
      const inner = this.pattern(aliases);
      if (c.is('|')) throw unsupported('or-pattern', 'disjunctive patterns are outside the portable core', span(token, c.peek()));
      c.expect(')', 'pattern');
      return inner;
    }
    if (token.kind === 'identifier') {
      c.next();
      const path = token.value.split('.');
      if (path.length === 1) {
        if (token.value === 'true' || token.value === 'false') return { k: 'boolLit', value: token.value === 'true', span: span(token, token) };
        return { k: 'bindOrCtor', name: path[0], span: span(token, token) };
      }
      return { k: 'ctor', path, args: [], span: span(token, token) };
    }
    if (token.kind === 'string') throw unsupported('string pattern', 'string patterns are outside the portable core in Rocq', span(token, token));
    throw unsupported('pattern', `${describe(token)} is outside the portable pattern language`, span(token, token));
  }

  atom() {
    const c = this.cursor;
    const token = c.peek();
    if (token.kind === 'number') {
      c.next();
      return this.scoped({ k: 'num', value: token.value, span: span(token, token) });
    }
    if (token.kind === 'string') {
      c.next();
      return this.scoped({ k: 'str', value: token.value, span: span(token, token) });
    }
    if (c.eat('[')) {
      const items = [];
      while (!c.is(']')) {
        items.push(this.expr());
        if (!c.eat(';')) break;
      }
      c.expect(']', 'list');
      return { k: 'list', items, span: span(token, c.peek()) };
    }
    if (c.eat('(')) {
      if (c.eat(')')) return { k: 'unit', span: span(token, token) };
      const inner = this.expr();
      if (c.eat(':')) {
        const type = this.type();
        c.expect(')', 'type ascription');
        if (inner.k === 'num') return this.scoped({ ...inner, type, span: span(token, c.peek()) });
        return this.scoped({ k: 'cast', arg: inner, to: type, flavor: 'exact', span: span(token, c.peek()) });
      }
      if (c.is(',')) throw unsupported('tuple', 'product values are outside the portable core', span(token, c.peek()));
      c.expect(')', 'parenthesised expression');
      return this.scoped(inner);
    }
    if (token.kind === 'identifier') {
      if (c.is('match')) return this.match();
      c.next();
      if (token.value === '_') throw unsupported('implicit argument hole', 'outside the portable core', span(token, token));
      return this.scoped({ k: 'name', path: token.value.split('.'), span: span(token, token) });
    }
    throw this.fail('expected an expression');
  }

  scopeDelimiter() {
    const c = this.cursor;
    if (!c.is('%')) return null;
    c.next();
    const scope = c.identifier('scope');
    if (!['N', 'nat', 'Z', 'string', 'bool', 'list', 'type'].includes(scope.value)) {
      throw unsupported(`%${scope.value} scope`, 'outside the portable core', span(scope, scope));
    }
    return scope.value;
  }

  /** `e%N`, `(e)%Z`: the delimiting scope decides the type of notation numerals. */
  scoped(node) {
    const scope = this.scopeDelimiter();
    if (!scope) return node;
    return withScope(node, scope);
  }
}

/**
 * Numerals in notation positions take the delimited scope; arguments of
 * applications keep the scope of their parameter type, which the checker
 * infers from the signature, exactly as Rocq's argument scopes do.
 */
function withScope(node, scope) {
  const type = SCOPES[scope];
  if (!type) return node;
  const visit = (value) => {
    if (!value || typeof value !== 'object') return value;
    switch (value.k) {
      case 'num':
        return value.type ? value : { ...value, type };
      case 'unary':
        return { ...value, arg: visit(value.arg) };
      case 'binary':
        if (['eq', 'lt', 'le', 'gt', 'ge', 'ne', 'add', 'sub', 'mul', 'div', 'rem'].includes(value.op)) {
          return { ...value, left: visit(value.left), right: visit(value.right) };
        }
        return value;
      case 'if':
        return { ...value, then: visit(value.then), else: visit(value.else) };
      case 'let':
        return { ...value, body: visit(value.body) };
      case 'match':
        return { ...value, rows: value.rows.map((row) => ({ ...row, body: visit(row.body) })) };
      default:
        return value;
    }
  };
  return visit(node);
}

/** The value a fully bound pattern matched, for `p as x`. */
function patternValue(pattern, range) {
  switch (pattern.k) {
    case 'bindOrCtor':
      return { k: 'name', path: [pattern.name], span: range };
    case 'numLit':
      return { k: 'num', value: pattern.value, span: range };
    case 'ctor': {
      const name = pattern.path.join('.');
      if ((name === 'S' || name === 'Nat.succ') && pattern.args.length === 1) {
        return { k: 'binary', op: 'add', left: patternValue(pattern.args[0], range), right: { k: 'num', value: '1', span: range }, span: range };
      }
      return { k: 'app', fn: { k: 'name', path: pattern.path, span: range }, args: pattern.args.map((arg) => patternValue(arg, range)), span: range };
    }
    default:
      throw unsupported('as-pattern', 'an aliased pattern must bind every field', range);
  }
}

function collectForallTypes(prop, types) {
  if (prop.p === 'forall') {
    for (const binder of prop.binders) types.set(binder.name, binder.rocqType);
    collectForallTypes(prop.body, types);
  }
}

function joined(left, right, token) {
  return { start: left.span?.start ?? token.start, end: right.span?.end ?? token.end };
}

export function span(from, to) {
  return { start: from.start, end: Math.max(from.end, to && to.kind !== 'eof' ? to.start : from.end) };
}
