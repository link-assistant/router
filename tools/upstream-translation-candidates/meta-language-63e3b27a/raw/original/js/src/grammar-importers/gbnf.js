import { Grammar, GrammarBuilder } from '../grammar.js';
import { parseError } from './common.js';
import { decorateGrammar } from '../grammar-decorators.js';

const FORMAT = 'gbnf';
const START = 'root';
const UINT64_MAX = (1n << 64n) - 1n;
const SIMPLE_ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\u0008', f: '\u000c' };
const HEX_ESCAPE_DIGITS = { x: 2, u: 4, U: 8 };

/**
 * Imports llama.cpp GBNF grammar text into the shared grammar representation.
 *
 * A clean-room recursive-descent parser for the structural GBNF subset the IR
 * represents: rules, unordered alternation, grouping, postfix and counted
 * repetition, string literals, and character classes. Counted repetition is
 * kept verbatim (`{1,}` stays a `repeat`), comments before a rule become its
 * `doc`, and the grammar must define the `root` start rule. Error messages and
 * their UTF-8 byte offsets match the Rust `import_gbnf`.
 */
export function importGbnf(source, options = {}) {
  return decorateGrammar(readGbnf(source), options.decorators, 'importer');
}

function readGbnf(source) {
  const tokens = new Lexer(String(source)).tokenize();
  return new Parser(tokens).parseGrammar();
}

class Parser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
    this.pendingComments = [];
  }

  parseGrammar() {
    const rules = [];
    while (!this.isEnd()) {
      this.collectCommentsAndNewlines();
      if (this.isEnd()) break;
      rules.push(this.parseRule());
    }
    if (!rules.some((candidate) => candidate.name === START)) {
      throw parseError(FORMAT, 'GBNF grammar does not contain root rule');
    }
    return buildGrammar(rules);
  }

  parseRule() {
    const comments = this.pendingComments;
    this.pendingComments = [];
    const name = this.expectIdent('rule name');
    this.expectKind('define', "'::='");
    const expression = this.parseChoice();
    this.consumeRuleEnd();
    const parsed = { name, kind: 'normal', expression };
    if (comments.length > 0) parsed.doc = comments.join('\n');
    return parsed;
  }

  parseChoice() {
    const alternatives = [];
    pushChoiceAlternative(alternatives, this.parseSequence());
    while (this.tryConsumePipe()) pushChoiceAlternative(alternatives, this.parseSequence());
    return finishChoice(alternatives);
  }

  parseSequence() {
    const items = [];
    while (!this.isSequenceEnd()) pushSequenceItem(items, this.parsePostfix());
    return finishSequence(items);
  }

  parsePostfix() {
    let expression = this.parseAtom();
    while (true) {
      switch (this.peek()?.kind) {
        case 'question': this.cursor += 1; expression = GrammarBuilder.optional(expression); break;
        case 'star': this.cursor += 1; expression = GrammarBuilder.repeat0(expression); break;
        case 'plus': this.cursor += 1; expression = GrammarBuilder.repeat1(expression); break;
        case 'lbrace': expression = this.parseCountedRepeat(expression); break;
        default: return expression;
      }
    }
  }

  parseCountedRepeat(item) {
    this.expectKind('lbrace', "'{'");
    const min = this.expectNumber('minimum repeat count');
    let max = min;
    if (this.peek()?.kind === 'comma') {
      this.cursor += 1;
      max = this.peek()?.kind === 'number' ? this.expectNumber('maximum repeat count') : null;
    }
    this.expectKind('rbrace', "'}'");
    if (max !== null && min > max) throw this.error('repeat minimum exceeds maximum');
    // Counted repetition stays verbatim, like Rust `GrammarExpr::repeat`.
    return { kind: 'repeat', item, min: Number(min), max: max === null ? null : Number(max) };
  }

  parseAtom() {
    const token = this.peek();
    switch (token?.kind) {
      case 'ident': this.cursor += 1; return GrammarBuilder.ref(token.value);
      case 'string': this.cursor += 1; return GrammarBuilder.literal(token.value);
      case 'charSet': this.cursor += 1; return lowerCharSet(token.value, token.offset);
      case 'dot': this.cursor += 1; return GrammarBuilder.any();
      case 'lparen': {
        this.cursor += 1;
        const expression = this.parseChoice();
        this.expectKind('rparen', "')'");
        return expression;
      }
      default: throw this.expected('expression element');
    }
  }

  collectCommentsAndNewlines() {
    while (true) {
      const token = this.peek();
      if (token?.kind === 'comment') this.pendingComments.push(token.value);
      else if (token?.kind !== 'newline') return;
      this.cursor += 1;
    }
  }

  consumeRuleEnd() {
    if (this.peek()?.kind === 'comment') this.cursor += 1;
    if (this.peek()?.kind === 'newline') this.cursor += 1;
  }

  expectIdent(role) {
    const token = this.peek();
    if (token?.kind !== 'ident') throw this.expected(role);
    this.cursor += 1;
    return token.value;
  }

  expectNumber(role) {
    const token = this.peek();
    if (token?.kind !== 'number') throw this.expected(role);
    this.cursor += 1;
    return token.value;
  }

  expectKind(kind, description) {
    if (this.peek()?.kind !== kind) throw this.expected(description);
    this.cursor += 1;
  }

  // A `|` may continue the rule on a following line; comments and newlines
  // before it are skipped, and the cursor is restored when none follows.
  tryConsumePipe() {
    const start = this.cursor;
    while (['newline', 'comment'].includes(this.peek()?.kind)) this.cursor += 1;
    if (this.peek()?.kind === 'pipe') {
      this.cursor += 1;
      return true;
    }
    this.cursor = start;
    return false;
  }

  isSequenceEnd() {
    return this.isEnd() || ['newline', 'comment', 'pipe', 'rparen'].includes(this.peek().kind);
  }

  expected(description) {
    return this.error(`expected ${description}`);
  }

  // Parser errors point at the current token, or byte 0 at end of input.
  error(message) {
    return errorAt(this.peek()?.offset ?? 0, message);
  }

  isEnd() {
    return this.cursor >= this.tokens.length;
  }

  peek() {
    return this.tokens[this.cursor];
  }
}

/**
 * Walks the source by Unicode scalar value while tracking both the UTF-16
 * index used for slicing and the UTF-8 byte offset reported in errors.
 */
class CharScanner {
  constructor(text, baseOffset = 0) {
    this.text = text;
    this.index = 0;
    this.byte = 0;
    this.baseOffset = baseOffset;
  }

  isEnd() {
    return this.index >= this.text.length;
  }

  peekChar() {
    const point = this.text.codePointAt(this.index);
    return point === undefined ? null : String.fromCodePoint(point);
  }

  advanceChar() {
    const character = this.peekChar();
    if (character === null) return null;
    this.index += character.length;
    this.byte += utf8Length(character);
    return character;
  }

  startsWith(prefix) {
    return this.text.startsWith(prefix, this.index);
  }
}

class Lexer extends CharScanner {
  tokenize() {
    const tokens = [];
    while (!this.isEnd()) {
      this.skipHorizontalWhitespace();
      if (this.isEnd()) break;
      const offset = this.byte;
      tokens.push({ ...this.nextToken(), offset });
    }
    return tokens;
  }

  nextToken() {
    if (this.startsWith('::=')) {
      this.index += 3;
      this.byte += 3;
      return { kind: 'define' };
    }
    const character = this.peekChar();
    const punctuation = PUNCTUATION[character];
    if (punctuation) {
      this.advanceChar();
      return { kind: punctuation };
    }
    switch (character) {
      case '\n':
        this.advanceChar();
        return { kind: 'newline' };
      case '\r':
        this.advanceChar();
        if (this.peekChar() === '\n') this.advanceChar();
        return { kind: 'newline' };
      case '#': return { kind: 'comment', value: this.lineComment() };
      case '"': return { kind: 'string', value: this.stringLiteral() };
      case '[': return { kind: 'charSet', value: this.charSet() };
      default:
        if (isAsciiDigit(character)) return { kind: 'number', value: this.number() };
        if (isIdentStart(character)) return { kind: 'ident', value: this.identifier() };
        throw errorAt(this.byte, `unexpected character ${rustCharDebug(character)}`);
    }
  }

  lineComment() {
    const start = this.index;
    while (!this.isEnd() && this.peekChar() !== '\n' && this.peekChar() !== '\r') {
      this.advanceChar();
    }
    return rustTrim(this.text.slice(start, this.index));
  }

  stringLiteral() {
    const start = this.byte;
    this.advanceChar();
    let value = '';
    for (let character = this.advanceChar(); character !== null; character = this.advanceChar()) {
      if (character === '"') return value;
      value += character === '\\' ? this.escapeSequence(start) : character;
    }
    throw errorAt(start, 'unterminated string literal');
  }

  // Returns the raw class content; escapes are decoded by `lowerCharSet`.
  charSet() {
    const start = this.byte;
    this.advanceChar();
    const contentStart = this.index;
    let escaped = false;
    for (let character = this.advanceChar(); character !== null; character = this.advanceChar()) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === ']') return this.text.slice(contentStart, this.index - 1);
    }
    throw errorAt(start, 'unterminated character class');
  }

  escapeSequence(start) {
    const character = this.advanceChar();
    if (character === null) throw errorAt(start, 'unterminated escape sequence');
    return decodeEscape(this, character, {
      unterminated: () => errorAt(start, 'unterminated hexadecimal escape'),
      nonHex: (digit) => errorAt(
        this.byte - utf8Length(digit),
        'hexadecimal escape requires hexadecimal digits',
      ),
      invalid: () => errorAt(start, 'invalid hexadecimal escape'),
    });
  }

  number() {
    const start = this.byte;
    let value = 0n;
    while (isAsciiDigit(this.peekChar())) {
      value = value * 10n + BigInt(this.advanceChar());
      if (value > UINT64_MAX) throw errorAt(start, 'number exceeds usize');
    }
    return value;
  }

  identifier() {
    const start = this.index;
    this.advanceChar();
    while (isIdentContinue(this.peekChar())) this.advanceChar();
    return this.text.slice(start, this.index);
  }

  skipHorizontalWhitespace() {
    while (true) {
      const character = this.peekChar();
      if (character === null || character === '\n' || character === '\r' ||
        !isRustWhitespace(character)) return;
      this.advanceChar();
    }
  }
}

const PUNCTUATION = {
  '|': 'pipe',
  '(': 'lparen',
  ')': 'rparen',
  '?': 'question',
  '*': 'star',
  '+': 'plus',
  '{': 'lbrace',
  '}': 'rbrace',
  ',': 'comma',
  '.': 'dot',
};

// Shared by string literals and character classes: the escape letter has
// already been consumed; `errors` supplies each context's error offsets.
function decodeEscape(scanner, character, errors) {
  if (Object.hasOwn(SIMPLE_ESCAPES, character)) return SIMPLE_ESCAPES[character];
  const digits = HEX_ESCAPE_DIGITS[character];
  if (digits === undefined) return character;
  let value = 0;
  for (let index = 0; index < digits; index += 1) {
    const digit = scanner.advanceChar();
    if (digit === null) throw errors.unterminated();
    if (!/^[0-9A-Fa-f]$/.test(digit)) throw errors.nonHex(digit);
    value = value * 16 + Number.parseInt(digit, 16);
  }
  if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) throw errors.invalid();
  return String.fromCodePoint(value);
}

function lowerCharSet(content, offset) {
  const scanner = new CharScanner(content, offset);
  const negated = scanner.peekChar() === '^';
  if (negated) scanner.advanceChar();
  const items = [];
  while (!scanner.isEnd()) {
    const start = readClassChar(scanner);
    if (scanner.peekChar() === '-' && hasCharAfterCurrent(scanner)) {
      scanner.advanceChar();
      const end = readClassChar(scanner);
      if (start.codePointAt(0) > end.codePointAt(0)) {
        throw errorAt(offset, 'character class range start exceeds end');
      }
      items.push({ kind: 'range', start, end });
    } else {
      items.push({ kind: 'char', value: start });
    }
  }
  if (items.length === 0) throw errorAt(offset, 'character class must not be empty');
  return GrammarBuilder.charClass(items, negated);
}

// Class errors are reported at the `[` offset; a bad hexadecimal digit is
// reported at that offset plus the digit's byte index within the content.
function readClassChar(scanner) {
  const offset = scanner.baseOffset;
  const character = scanner.advanceChar();
  if (character === null) throw errorAt(offset, 'unexpected end of character class');
  if (character !== '\\') return character;
  const escaped = scanner.advanceChar();
  if (escaped === null) throw errorAt(offset, 'unterminated character class escape');
  return decodeEscape(scanner, escaped, {
    unterminated: () => errorAt(offset, 'unterminated hexadecimal escape'),
    nonHex: (digit) => errorAt(
      offset + Math.max(0, scanner.byte - utf8Length(digit)),
      'hexadecimal escape requires hexadecimal digits',
    ),
    invalid: () => errorAt(offset, 'invalid hexadecimal escape'),
  });
}

function hasCharAfterCurrent(scanner) {
  const current = scanner.peekChar();
  return current !== null && scanner.index + current.length < scanner.text.length;
}

function buildGrammar(rules) {
  // The Rust IR is a rule list; the JS IR is keyed by name, so the first
  // definition of a repeated name wins, as Rust's `Grammar::rule` lookup does.
  const mapped = new Map();
  for (const parsed of rules) if (!mapped.has(parsed.name)) mapped.set(parsed.name, parsed);
  const grammar = new Grammar(START, mapped, FORMAT);
  for (const { name, doc } of mapped.values()) {
    if (doc !== undefined) grammar.rules.set(name, Object.freeze({ ...grammar.rule(name), doc }));
  }
  return grammar;
}

function finishSequence(items) {
  if (items.length === 0) return GrammarBuilder.empty();
  if (items.length === 1) return items[0];
  return { kind: 'seq', items };
}

function pushSequenceItem(items, item) {
  if (item.kind === 'empty') return;
  if (item.kind === 'seq') for (const nested of item.items) pushSequenceItem(items, nested);
  else items.push(item);
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

function errorAt(offset, message) {
  return parseError(FORMAT, `${message} at byte ${offset}`);
}

function isAsciiDigit(character) {
  return character !== null && /^[0-9]$/.test(character);
}

function isIdentStart(character) {
  return character !== null && /^[A-Za-z_]$/.test(character);
}

function isIdentContinue(character) {
  return character !== null && /^[A-Za-z0-9_-]$/.test(character);
}

// Rust `char::is_whitespace` is the Unicode White_Space property, which
// differs from JavaScript `\s` (U+0085 is included, U+FEFF is not).
function isRustWhitespace(character) {
  return /^\p{White_Space}$/u.test(character);
}

function rustTrim(value) {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

/** Rust `{:?}` rendering of a `char`, used in the unexpected-character error. */
function rustCharDebug(character) {
  switch (character) {
    case '\0': return "'\\0'";
    case '\t': return "'\\t'";
    case '\r': return "'\\r'";
    case '\n': return "'\\n'";
    case '\\': return "'\\\\'";
    case "'": return "'\\''";
    default:
      // Grapheme extenders and Rust's non-printable categories use `\u{…}`.
      return character !== ' ' && RUST_DEBUG_ESCAPED.test(character)
        ? `'\\u{${character.codePointAt(0).toString(16)}}'`
        : `'${character}'`;
  }
}

const RUST_DEBUG_ESCAPED =
  /^[\p{Grapheme_Extend}\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u;

function utf8Length(character) {
  const point = character.codePointAt(0);
  if (point < 0x80) return 1;
  if (point < 0x800) return 2;
  return point < 0x10000 ? 3 : 4;
}
