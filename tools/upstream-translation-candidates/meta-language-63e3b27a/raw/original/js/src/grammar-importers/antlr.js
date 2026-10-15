// ANTLR v4 importer. The Rust twin lives in rust/src/grammar/import/antlr.rs;
// both lower the same structural `.g4` subset to the same grammar IR.
import { Grammar, GrammarBuilder } from '../grammar.js';
import {
  FORMAT,
  debugString,
  errorAt,
  tokenText,
  tokenizeAntlr,
} from './antlr-lexer.js';
import { parseError, unsupportedError } from './common.js';
import { decorateGrammar } from '../grammar-decorators.js';

const SEQUENCE_END = new Set(['pipe', 'semicolon', 'arrow', 'rparen', 'hash']);
const SUFFIXES = {
  question: GrammarBuilder.optional,
  star: GrammarBuilder.repeat0,
  plus: GrammarBuilder.repeat1,
};

/**
 * Imports ANTLR v4 `.g4` grammar text into the shared grammar representation.
 *
 * Alternatives lower to unordered choices. Lexer rules (uppercase names) become
 * token rules and `fragment` rules become silent rules. Lexer commands, dropped
 * actions and predicates, and comments before a rule or its `:` are kept in
 * the rule's `doc`; `-> skip` and `-> channel(NAME)` also put the rule on that
 * channel, which makes it trivia, and `-> type(NAME)` lets the rule match
 * where NAME does. `EOF` is the end of the input, and character
 * sets read `\uXXXX`, `\u{X...}` and `\p{NAME}` for a general category or
 * script. `options`, `tokens`, `channels`, `import` and `mode` declarations are
 * skipped, and references to undefined rules stay visible on the grammar.
 */
export function importAntlr(source, options = {}) {
  return decorateGrammar(readAntlr(source), options.decorators, 'importer');
}

function readAntlr(source) {
  return new AntlrParser(tokenizeAntlr(String(source))).parseGrammar();
}

class AntlrParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
    this.pendingComments = [];
    // `options { caseInsensitive = true; }` of the current grammar, and of
    // the current rule, which may override it.
    this.caseInsensitive = false;
    this.ruleCaseInsensitive = false;
  }

  parseGrammar() {
    const rules = [];
    while (!this.isEnd()) {
      this.collectComments();
      if (this.isEnd()) break;
      if (this.parseHeader() || this.parseSkippedDirective()) continue;
      rules.push(this.parseRule());
    }
    applyRetypes(rules);

    const startRule = rules.find((rule) => rule.kind === 'normal') ?? rules[0];
    if (!startRule) throw parseError(FORMAT, 'ANTLR grammar does not contain rules');
    return buildGrammar(startRule.name, rules);
  }

  parseHeader() {
    if (this.checkKeyword('grammar')) {
      this.advance();
    } else if ((this.checkKeyword('lexer') || this.checkKeyword('parser')) &&
      this.checkNextKeyword('grammar')) {
      this.advance();
      this.advance();
    } else {
      return false;
    }
    this.expectIdent('grammar name');
    this.expectKind('semicolon', "';'");
    this.pendingComments = [];
    this.caseInsensitive = false;
    return true;
  }

  parseSkippedDirective() {
    if (this.checkAnyKeyword(['options', 'tokens', 'channels'])) {
      const keyword = this.advance().value;
      if (this.peekKind() === 'action') {
        const options = this.advance().value;
        if (keyword === 'options') {
          this.caseInsensitive = parseOptions(options).get('caseInsensitive') === 'true';
        }
        this.tryConsume('semicolon');
      } else {
        this.skipUntilSemicolon();
      }
      this.pendingComments = [];
      return true;
    }
    if (this.checkAnyKeyword(['import', 'mode'])) {
      this.advance();
      this.skipUntilSemicolon();
      this.pendingComments = [];
      return true;
    }
    return false;
  }

  parseRule() {
    const comments = this.pendingComments;
    this.pendingComments = [];
    const fragment = this.tryConsumeKeyword('fragment');
    const name = this.expectIdent('rule name');
    // A comment between the name and its ':' documents the rule too.
    this.collectComments();
    comments.push(...this.pendingComments);
    this.pendingComments = [];
    const notes = [];
    this.parseRulePrelude(notes);
    this.expectKind('colon', "':'");

    const expression = precedenceClimbing(name, this.parseAlternatives(notes));
    const command = this.tryConsume('arrow') ? this.parseLexerCommand() : null;
    this.expectKind('semicolon', "';'");

    let kind = 'normal';
    if (fragment) kind = 'silent';
    else if (/^[A-Z]/.test(name)) kind = 'token';
    const channel = commandChannel(command);
    const retype = channel === null ? commandType(command) : null;
    return { name, kind, expression, doc: ruleDoc(comments, notes, command), channel, retype };
  }

  // `returns [...]`, `throws ...` and `locals [...]` declare target-language
  // values, which join the rule's doc like actions. `options {...}` may set
  // `caseInsensitive` for the rule; other options join the doc.
  parseRulePrelude(notes) {
    this.ruleCaseInsensitive = this.caseInsensitive;
    if (this.peekKind() === 'charSet') throw unsupportedError(FORMAT, 'rule arguments');
    while (this.peekKind() !== 'colon') {
      if ((this.checkKeyword('returns') || this.checkKeyword('locals')) && this.peekNextKind() === 'charSet') {
        const keyword = this.advance().value;
        notes.push(`dropped ${keyword} [${this.advance().value}]`);
      } else if (this.checkKeyword('throws')) {
        this.advance();
        const names = [this.expectIdent('exception name')];
        while (this.tryConsume('comma')) names.push(this.expectIdent('exception name'));
        notes.push(`dropped throws ${names.join(', ')}`);
      } else if (this.checkKeyword('options') && this.peekNextKind() === 'action') {
        this.advance();
        for (const [key, value] of parseOptions(this.advance().value)) {
          if (key === 'caseInsensitive') this.ruleCaseInsensitive = value === 'true';
          else notes.push(`rule option ${key}=${value}`);
        }
      } else {
        throw this.expected("':' before rule body");
      }
      this.skipInlineComments();
    }
  }

  parseChoice(notes) {
    const alternatives = [];
    for (const { expression } of this.parseAlternatives(notes)) pushChoiceAlternative(alternatives, expression);
    return finishChoice(alternatives);
  }

  parseAlternatives(notes) {
    const alternatives = [this.parseAlternative(notes)];
    while (this.tryConsume('pipe')) alternatives.push(this.parseAlternative(notes));
    return alternatives;
  }

  // An alternative with its `<key = value, ...>` options and its `# Label`,
  // which names the context class ANTLR generates for it, not syntax: the
  // label joins the rule's doc. `assoc` is kept for the precedence of a
  // left-recursive rule; any other option joins the doc.
  parseAlternative(notes) {
    this.skipInlineComments();
    const options = this.tryConsume('langle') ? this.parseElementOptions() : new Map();
    for (const [key, value] of options) {
      if (key !== 'assoc') notes.push(`alternative option ${key}=${value}`);
    }
    const expression = this.parseSequence(notes);
    if (this.tryConsume('hash')) {
      notes.push(`alternative ${this.expectIdent('alternative label')}`);
      this.skipInlineComments();
    }
    const assoc = options.get('assoc');
    if (assoc !== undefined && assoc !== 'left' && assoc !== 'right') {
      throw unsupportedError(FORMAT, `associativity ${assoc}`);
    }
    return { expression, associativity: assoc ?? 'left' };
  }

  parseElementOptions() {
    const options = new Map();
    do {
      const key = this.expectIdent('element option');
      let value = 'true';
      if (this.tryConsume('equal')) {
        const token = this.peek();
        if (token?.kind !== 'ident' && token?.kind !== 'string') throw this.expected('element option value');
        value = this.advance().value;
      }
      options.set(key, value);
    } while (this.tryConsume('comma'));
    this.expectKind('rangle', "'>'");
    return options;
  }

  parseSequence(notes) {
    const items = [];
    while (true) {
      this.skipInlineComments();
      if (this.isEnd() || SEQUENCE_END.has(this.peekKind())) break;
      pushSequenceItem(items, this.parseElement(notes));
    }
    return finishSequence(items);
  }

  parseElement(notes) {
    this.skipInlineComments();
    if (this.peekKind() === 'action') return this.parseAction(notes);

    const label = this.labelAhead();
    if (label !== null) {
      this.advance();
      this.advance();
      return GrammarBuilder.capture(label, this.parsePrefixed(notes));
    }
    return this.parsePrefixed(notes);
  }

  parsePrefixed(notes) {
    this.skipInlineComments();
    const expression = this.tryConsume('tilde')
      ? negateExpression(this.parseAtom(notes))
      : this.parseAtom(notes);
    return this.parseSuffixes(expression);
  }

  parseAtom(notes) {
    this.skipInlineComments();
    const token = this.peek();
    if (!token) throw this.expected('expression element');

    switch (token.kind) {
      case 'ident':
        this.advance();
        // ANTLR reserves EOF for the end of the input.
        if (token.value === 'EOF') return GrammarBuilder.not(GrammarBuilder.any());
        return GrammarBuilder.ref(token.value);
      case 'string': {
        this.advance();
        if (!this.tryConsume('range')) {
          return this.ruleCaseInsensitive && hasCase(token.value)
            ? GrammarBuilder.literalInsensitive(token.value)
            : GrammarBuilder.literal(token.value);
        }
        const endText = this.expectString('range end');
        const start = singleChar(token.value, 'range start', token.offset);
        const end = singleChar(endText, 'range end', token.offset);
        if (start.codePointAt(0) > end.codePointAt(0)) {
          throw errorAt(token.offset, 'literal range start exceeds end');
        }
        if (this.ruleCaseInsensitive) {
          const items = withCaseVariants([{ kind: 'range', start, end }]);
          if (items.length > 1) return GrammarBuilder.charClass(items);
        }
        return GrammarBuilder.charRange(start, end);
      }
      case 'charSet':
        this.advance();
        return lowerCharSet(token.value, token.offset, this.ruleCaseInsensitive);
      case 'dot':
        this.advance();
        return GrammarBuilder.any();
      case 'lparen': {
        this.advance();
        const expression = this.parseChoice(notes);
        this.expectKind('rparen', "')'");
        return expression;
      }
      case 'action':
        return this.parseAction(notes);
      default:
        throw this.expected('expression element');
    }
  }

  parseAction(notes) {
    this.advance();
    notes.push(this.tryConsume('question') ? 'dropped predicate' : 'dropped action');
    return GrammarBuilder.empty();
  }

  parseSuffixes(initial) {
    let expression = initial;
    while (Object.hasOwn(SUFFIXES, this.peekKind())) {
      expression = SUFFIXES[this.advance().kind](expression);
      if (this.tryConsume('question')) expression = GrammarBuilder.capture('non_greedy', expression);
    }
    return expression;
  }

  parseLexerCommand() {
    const tokens = [];
    while (!this.isEnd() && this.peekKind() !== 'semicolon') {
      const token = this.advance();
      if (token.kind !== 'comment') tokens.push(token);
    }
    if (tokens.length === 0) throw this.expected('lexer command');
    return formatCommand(tokens);
  }

  skipUntilSemicolon() {
    while (!this.isEnd()) {
      if (this.tryConsume('semicolon')) return;
      this.advance();
    }
    throw this.expected("';' after directive");
  }

  collectComments() {
    while (this.peekKind() === 'comment') this.pendingComments.push(this.advance().value);
  }

  skipInlineComments() {
    while (this.peekKind() === 'comment') this.advance();
  }

  labelAhead() {
    if (this.peekKind() !== 'ident') return null;
    const next = this.tokens[this.cursor + 1]?.kind;
    return next === 'equal' || next === 'plusEqual' ? this.peek().value : null;
  }

  expectIdent(role) {
    if (this.peekKind() !== 'ident') throw this.expected(role);
    return this.advance().value;
  }

  expectString(role) {
    if (this.peekKind() !== 'string') throw this.expected(role);
    return this.advance().value;
  }

  expectKind(kind, role) {
    if (this.peekKind() !== kind) throw this.expected(role);
    this.advance();
  }

  expected(expected) {
    return errorAt(this.peek()?.offset ?? 0, `expected ${expected}`);
  }

  tryConsumeKeyword(keyword) {
    if (!this.checkKeyword(keyword)) return false;
    this.advance();
    return true;
  }

  tryConsume(kind) {
    if (this.peekKind() !== kind) return false;
    this.advance();
    return true;
  }

  checkKeyword(keyword) {
    return isKeyword(this.peek(), keyword);
  }

  checkNextKeyword(keyword) {
    return isKeyword(this.tokens[this.cursor + 1], keyword);
  }

  checkAnyKeyword(keywords) {
    return keywords.some((keyword) => this.checkKeyword(keyword));
  }

  isEnd() {
    return this.cursor >= this.tokens.length;
  }

  peek() {
    return this.tokens[this.cursor];
  }

  peekKind() {
    return this.tokens[this.cursor]?.kind;
  }

  peekNextKind() {
    return this.tokens[this.cursor + 1]?.kind;
  }

  advance() {
    const token = this.tokens[this.cursor];
    this.cursor += 1;
    return token;
  }
}

// Rust keeps rules in a list and resolves names to the first match; the
// JavaScript grammar is keyed by name, so a repeated rule keeps its first body.
function buildGrammar(start, rules) {
  const mapped = new Map();
  for (const rule of rules) if (!mapped.has(rule.name)) mapped.set(rule.name, rule);
  const grammar = new Grammar(start, mapped, FORMAT);
  for (const rule of mapped.values()) {
    if (rule.doc === null) continue;
    grammar.rules.set(rule.name, Object.freeze({ ...grammar.rules.get(rule.name), doc: rule.doc }));
  }
  return grammar;
}

function isKeyword(token, keyword) {
  return token?.kind === 'ident' && token.value === keyword;
}

function lowerCharSet(content, offset, caseInsensitive) {
  const scanner = new ClassScanner(content, offset);
  const negated = scanner.tryConsume('^');
  const items = [];
  let read = false;
  while (!scanner.isEnd()) {
    const property = scanner.tryReadProperty();
    if (property !== null) {
      items.push(property);
      read = true;
      continue;
    }
    const start = scanner.readChar();
    const end = scanner.tryConsumeRangeSeparator() ? scanner.readChar() : start;
    if (start > end) throw errorAt(offset, 'character class range start exceeds end');
    pushScalarRange(items, start, end);
    read = true;
  }
  if (!read) throw errorAt(offset, 'character class must not be empty');
  return GrammarBuilder.charClass(caseInsensitive ? withCaseVariants(items) : items, negated);
}

// The `key = value;` pairs of an `options {...}` block.
function parseOptions(text) {
  const options = new Map();
  for (const [, key, value] of text.matchAll(/([A-Za-z_][A-Za-z_0-9]*)\s*=\s*([^;]*?)\s*;/gu)) {
    options.set(key, value);
  }
  return options;
}

function hasCase(text) {
  return text.toLowerCase() !== text.toUpperCase();
}

// Under `caseInsensitive`, ANTLR matches each character in either case. The
// items gain the other case of each character, and of the ASCII letters in
// each range.
function withCaseVariants(items) {
  const result = [...items];
  const key = (item) => JSON.stringify(item);
  const seen = new Set(result.map(key));
  const add = (item) => {
    if (!seen.has(key(item))) {
      seen.add(key(item));
      result.push(item);
    }
  };
  const swap = (from, to, low, high, shift) => {
    const start = Math.max(from, low);
    const end = Math.min(to, high);
    if (start > end) return;
    const item = start === end
      ? { kind: 'char', value: String.fromCodePoint(start + shift) }
      : { kind: 'range', start: String.fromCodePoint(start + shift), end: String.fromCodePoint(end + shift) };
    add(item);
  };
  for (const item of items) {
    if (item.kind === 'char') {
      for (const variant of [item.value.toLowerCase(), item.value.toUpperCase()]) {
        if (variant !== item.value && Array.from(variant).length === 1) add({ kind: 'char', value: variant });
      }
    } else if (item.kind === 'range') {
      const from = item.start.codePointAt(0);
      const to = item.end.codePointAt(0);
      swap(from, to, 0x61, 0x7a, -0x20);
      swap(from, to, 0x41, 0x5a, 0x20);
    }
  }
  return result;
}

// ANTLR reads `\uD800`-`\uDFFF` in a set as UTF-16 surrogates, which Java
// grammars name to match the halves of a pair. Text here is code points, so
// no surrogate is ever matched and a set keeps the scalars it names.
function pushScalarRange(items, start, end) {
  const push = (from, to) => items.push(from === to
    ? { kind: 'char', value: String.fromCodePoint(from) }
    : { kind: 'range', start: String.fromCodePoint(from), end: String.fromCodePoint(to) });
  if (start < 0xd800) push(start, Math.min(end, 0xd7ff));
  if (end > 0xdfff) push(Math.max(start, 0xe000), end);
}

// Reads the raw text between `[` and `]`: `\uXXXX` and `\u{X...}` escape a
// code point, `\p{NAME}` names a Unicode general category or script, and any
// other unknown escape stands for the escaped character.
class ClassScanner {
  constructor(text, offset) {
    this.chars = Array.from(text);
    this.cursor = 0;
    this.offset = offset;
  }

  // The code point of the next item, which may be a surrogate.
  readChar() {
    if (this.isEnd()) throw errorAt(this.offset, 'unexpected end of character class');
    const character = this.advanceChar();
    return character === '\\' ? this.readEscape() : character.codePointAt(0);
  }

  readEscape() {
    if (this.isEnd()) throw errorAt(this.offset, 'unterminated character class escape');
    const character = this.advanceChar();
    if (character === 'u') return this.readCodePoint();
    const escaped = ({ n: '\n', r: '\r', t: '\t', b: '\u0008', f: '\u000c' })[character] ?? character;
    return escaped.codePointAt(0);
  }

  // The code point of `\uXXXX` or `\u{X...}`, after the `u`.
  readCodePoint() {
    let digits = '';
    if (this.tryConsume('{')) {
      while (!this.isEnd() && this.chars[this.cursor] !== '}') digits += this.advanceChar();
      if (!this.tryConsume('}')) throw errorAt(this.offset, 'unterminated unicode escape');
    } else {
      for (let count = 0; count < 4 && !this.isEnd(); count += 1) digits += this.advanceChar();
    }
    const value = /^[0-9A-Fa-f]{1,6}$/u.test(digits) ? Number.parseInt(digits, 16) : -1;
    if (value < 0 || value > 0x10ffff) throw errorAt(this.offset, 'invalid unicode escape');
    return value;
  }

  // A `\p{NAME}` item at the cursor, or null.
  tryReadProperty() {
    const [backslash, letter, open] = this.chars.slice(this.cursor, this.cursor + 3);
    if (backslash !== '\\' || (letter !== 'p' && letter !== 'P')) return null;
    if (letter === 'P') throw unsupportedError(FORMAT, 'negated Unicode property in character set');
    if (open !== '{') throw errorAt(this.offset, 'Unicode property needs a {NAME}');
    const close = this.chars.indexOf('}', this.cursor);
    if (close < 0) throw errorAt(this.offset, 'unterminated Unicode property');
    const name = this.chars.slice(this.cursor + 3, close).join('');
    this.cursor = close + 1;
    return unicodePropertyItem(name);
  }

  tryConsume(expected) {
    if (this.chars[this.cursor] !== expected) return false;
    this.cursor += 1;
    return true;
  }

  tryConsumeRangeSeparator() {
    if (this.chars[this.cursor] !== '-' || this.cursor + 1 >= this.chars.length) return false;
    this.cursor += 1;
    return true;
  }

  isEnd() {
    return this.cursor >= this.chars.length;
  }

  advanceChar() {
    const character = this.chars[this.cursor];
    this.cursor += 1;
    return character;
  }
}

// `~` complements a set (a character class, a one-character literal, a range,
// or an alternation of those) and matches one character outside it. Any
// other operand stays a negative lookahead.
function negateExpression(expression) {
  const items = setItems(expression);
  return items ? GrammarBuilder.charClass(items, true) : GrammarBuilder.not(expression);
}

function setItems(expression) {
  switch (expression.kind) {
    case 'charClass':
      return expression.negated ? null : expression.items;
    case 'literal':
      return [...expression.value].length === 1 ? [{ kind: 'char', value: expression.value }] : null;
    case 'charRange':
      return [{ kind: 'range', start: expression.start, end: expression.end }];
    case 'choice': {
      const parts = expression.items.map(setItems);
      return parts.every(Boolean) ? parts.flat() : null;
    }
    default:
      return null;
  }
}

// ANTLR rewrites a rule with an alternative that starts with the rule
// itself into precedence climbing: an earlier alternative binds tighter, and
// a binary alternative groups to the left unless it is `<assoc = right>`.
// Every alternative with the rule at an edge gets that precedence.
function precedenceClimbing(name, alternatives) {
  const leftRecursive = alternatives.some(({ expression }) => edgeRef(expression, 'left') === name);
  const expressions = alternatives.map(({ expression, associativity }, index) => (
    leftRecursive && (edgeRef(expression, 'left') === name || edgeRef(expression, 'right') === name)
      ? { kind: 'precedence', level: alternatives.length - index, associativity, item: expression }
      : expression));
  const choice = [];
  for (const expression of expressions) pushChoiceAlternative(choice, expression);
  return finishChoice(choice);
}

function edgeRef(expression, side) {
  switch (expression.kind) {
    case 'ref': return expression.name;
    case 'capture': return edgeRef(expression.item, side);
    case 'seq': return edgeRef(expression.items[side === 'left' ? 0 : expression.items.length - 1], side);
    default: return null;
  }
}

function finishSequence(items) {
  if (items.length === 0) return GrammarBuilder.empty();
  if (items.length === 1) return items[0];
  return { kind: 'seq', items };
}

function pushSequenceItem(items, item) {
  if (item.kind === 'empty') return;
  if (item.kind === 'seq') {
    for (const nested of item.items) pushSequenceItem(items, nested);
  } else {
    items.push(item);
  }
}

function finishChoice(alternatives) {
  if (alternatives.every((alternative) => alternative.kind === 'empty')) {
    return GrammarBuilder.empty();
  }
  if (alternatives.length === 1) return alternatives[0];
  return { kind: 'choice', items: alternatives, ordered: false };
}

function pushChoiceAlternative(alternatives, alternative) {
  if (alternative.kind === 'choice' && !alternative.ordered) alternatives.push(...alternative.items);
  else alternatives.push(alternative);
}

function singleChar(value, role, offset) {
  const characters = [...value];
  if (characters.length === 0) throw errorAt(offset, `${role} must contain one character`);
  if (characters.length > 1) {
    throw errorAt(offset, `${role} ${debugString(value)} must contain one character`);
  }
  return characters[0];
}

function ruleDoc(comments, notes, command) {
  const parts = [...comments.filter((comment) => comment !== ''), ...notes];
  if (command !== null) parts.push(command);
  return parts.length === 0 ? null : parts.join('; ');
}

// The channel a lexer command puts its token on: `skip` and `channel(NAME)`
// make the token trivia, which the runtime skips between tokens.
function commandChannel(command) {
  if (command === null) return null;
  const parts = command.slice('->'.length).split(',').map((part) => part.trim());
  for (const part of parts) {
    const channel = /^channel\(([A-Za-z_][A-Za-z_0-9]*|[1-9][0-9]*)\)$/u.exec(part);
    if (channel !== null) return channel[1];
  }
  return parts.includes('skip') ? 'skip' : null;
}

// The token type `-> type(NAME)` gives a rule's tokens, or null.
function commandType(command) {
  if (command === null) return null;
  for (const part of command.slice('->'.length).split(',')) {
    const type = /^type\(([A-Za-z_][A-Za-z_0-9]*)\)$/u.exec(part.trim());
    if (type !== null) return type[1];
  }
  return null;
}

// A rule whose `-> type(X)` command retypes its tokens matches where X does:
// X gains a reference to it. An X that only `tokens {...}` declares becomes a
// token rule of the rules that retype to it. An X that already has that
// alternative, as an exported grammar re-imports, keeps it once.
function applyRetypes(rules) {
  for (const rule of [...rules]) {
    if (rule.retype === null || rule.retype === undefined || rule.retype === rule.name) continue;
    let target = rules.find(({ name }) => name === rule.retype);
    if (target === undefined) {
      target = { name: rule.retype, kind: 'token', expression: null, doc: null, channel: null, retype: null };
      rules.push(target);
    }
    const reference = GrammarBuilder.ref(rule.name);
    if (!hasAlternative(target.expression, reference)) {
      target.expression = target.expression === null ? reference : GrammarBuilder.choice(target.expression, reference);
    }
    const note = `also ${rule.name}, which -> type(${target.name}) retypes`;
    if (target.doc === null) target.doc = note;
    else if (!target.doc.split('; ').includes(note)) target.doc = `${target.doc}; ${note}`;
  }
}

// Whether `expression` is `reference` or an unordered choice with it as an alternative.
function hasAlternative(expression, reference) {
  if (expression === null) return false;
  const alternatives = expression.kind === 'choice' && !expression.ordered ? expression.items : [expression];
  return alternatives.some((item) => item.kind === 'ref' && item.name === reference.name);
}

const UNICODE_SCRIPTS = new Set([
  'Arabic', 'Armenian', 'Bengali', 'Cyrillic', 'Devanagari', 'Georgian', 'Greek', 'Han', 'Hangul', 'Hebrew', 'Hiragana',
  'Katakana', 'Latin', 'Thai',
]);

// The character class item `\p{NAME}` names: a general category such as `L` or
// `Nd`, or a script such as `Greek` or `Script=Greek`.
function unicodePropertyItem(name) {
  const property = name.replace(/^(?:General_Category|gc)=/u, '');
  if (/^[LMNPSZC][a-z]?$/u.test(property)) return { kind: 'category', value: property };
  const script = property.replace(/^(?:Script|sc)=/u, '');
  if (UNICODE_SCRIPTS.has(script)) return { kind: 'script', value: script };
  throw unsupportedError(FORMAT, `Unicode property ${name}`);
}

function formatCommand(tokens) {
  let output = '->';
  for (const token of tokens) {
    if (token.kind === 'lparen') {
      output += '(';
    } else if (token.kind === 'rparen') {
      output += ')';
    } else if (token.kind === 'comma') {
      output += ', ';
    } else {
      if (output === '->' || (!output.endsWith('(') && !output.endsWith(', '))) output += ' ';
      output += tokenText(token);
    }
  }
  return output;
}
