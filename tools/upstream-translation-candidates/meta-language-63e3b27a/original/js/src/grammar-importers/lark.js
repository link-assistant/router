import { Grammar, GrammarBuilder } from '../grammar.js';
import { parseError, unsupportedError } from './common.js';
import {
  CharStream,
  FORMAT,
  errorAt,
  readEscape,
  tokenizeLark,
} from './lark-lexer.js';
import { decorateGrammar } from '../grammar-decorators.js';

const SEQUENCE_ENDS = new Set(['newline', 'comment', 'pipe', 'rparen', 'rbracket']);

/**
 * Imports Lark `.lark` grammar text into the shared grammar representation.
 *
 * A clean-room recursive-descent parser for Lark's structural EBNF surface:
 * rules, terminals, unordered alternation, grouping, optional groups, postfix
 * repetition, counted `~` repetition, string literals, and regex terminals.
 * It mirrors rust/src/grammar/import/lark.rs. Rule documentation (leading
 * comments, `inline`, `priority N`, `%ignore`) is exposed through the
 * returned grammar's `ruleDocs` map because the IR rules carry no doc field.
 *
 * Throws GrammarImportError when the source is not the supported Lark subset
 * or uses an unsupported directive such as `%import`.
 */
export function importLark(source, options = {}) {
  return decorateGrammar(readLark(source), options.decorators, 'importer');
}

function readLark(source) {
  return new LarkParser(tokenizeLark(String(source))).parseGrammar();
}

class LarkParser {
  constructor(tokens) {
    this.tokens = tokens;
    this.cursor = 0;
    this.pendingComments = [];
    this.ignored = [];
    this.firstRule = null;
  }

  parseGrammar() {
    const rules = [];
    while (!this.isEnd()) {
      this.collectCommentsAndNewlines();
      if (this.isEnd()) break;
      if (this.tryConsume('percent')) {
        this.parseDirective();
      } else {
        const parsed = this.parseRule();
        this.firstRule ??= parsed.name;
        rules.push(parsed);
      }
    }

    this.ignored.forEach((expression, index) => rules.push({
      name: index === 0 ? '_ignore' : `_ignore_${index + 1}`,
      kind: 'silent',
      expression,
      doc: '%ignore',
    }));
    this.ignored = [];

    let start;
    if (rules.some((candidate) => candidate.name === 'start')) start = 'start';
    else if (this.firstRule !== null) start = this.firstRule;
    else throw parseError(FORMAT, 'Lark grammar does not contain rules');
    return buildGrammar(rules, start);
  }

  parseRule() {
    const comments = this.pendingComments;
    this.pendingComments = [];
    const inline = this.tryConsume('question');
    const name = this.expectIdent('rule name');
    const notes = [];
    if (this.tryConsume('dot')) {
      notes.push(`priority ${this.expectNumber('rule priority')}`);
    }
    this.expectKind('colon', "':'");

    const expression = this.parseChoice();
    this.consumeRuleEnd();

    let kind = 'normal';
    if (inline) {
      notes.unshift('inline');
      kind = 'silent';
    } else if (/^[A-Z]/.test(name)) {
      kind = 'token';
    }
    return { name, kind, expression, doc: ruleDoc(comments, notes) };
  }

  parseDirective() {
    const directive = this.expectIdent('directive name');
    if (directive === 'ignore') {
      this.ignored.push(this.parseChoice());
      this.consumeRuleEnd();
    } else if (directive === 'declare') {
      this.skipUntilNewline();
    } else {
      throw unsupportedError(FORMAT, `%${directive}`);
    }
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
      const kind = this.peek()?.kind;
      if (kind === 'question') {
        this.advance();
        expression = GrammarBuilder.optional(expression);
      } else if (kind === 'star') {
        this.advance();
        expression = GrammarBuilder.repeat0(expression);
      } else if (kind === 'plus') {
        this.advance();
        expression = GrammarBuilder.repeat1(expression);
      } else if (kind === 'tilde') {
        this.advance();
        expression = this.parseTildeRepeat(expression);
      } else {
        return expression;
      }
    }
  }

  // Lark's `item ~ n` and `item ~ n..m`. Like Rust, the counted repetition is
  // kept as written instead of being canonicalized to optional/repeat forms.
  parseTildeRepeat(item) {
    const min = this.expectNumber('minimum repeat count');
    const max = this.tryConsume('range') ? this.expectNumber('maximum repeat count') : min;
    if (min > max) throw this.error('repeat minimum exceeds maximum');
    return { kind: 'repeat', item, min: count(min), max: count(max) };
  }

  parseAtom() {
    const token = this.peek();
    if (!token) throw this.expected('expression element');
    switch (token.kind) {
      case 'ident':
        this.advance();
        return GrammarBuilder.ref(token.value);
      case 'string':
        this.advance();
        return GrammarBuilder.literal(token.value);
      case 'regex':
        this.advance();
        return lowerRegex(token.value, token.offset);
      case 'dot':
        this.advance();
        return GrammarBuilder.any();
      case 'lparen': {
        this.advance();
        const expression = this.parseChoice();
        this.expectKind('rparen', "')'");
        return expression;
      }
      case 'lbracket': {
        this.advance();
        const expression = this.parseChoice();
        this.expectKind('rbracket', "']'");
        return GrammarBuilder.optional(expression);
      }
      default:
        throw this.expected('expression element');
    }
  }

  collectCommentsAndNewlines() {
    while (true) {
      const token = this.peek();
      if (token?.kind === 'comment') {
        this.pendingComments.push(token.value);
        this.advance();
      } else if (token?.kind === 'newline') {
        this.advance();
      } else {
        return;
      }
    }
  }

  consumeRuleEnd() {
    if (this.peek()?.kind === 'comment') this.advance();
    if (this.peek()?.kind === 'newline') this.advance();
  }

  skipUntilNewline() {
    while (!this.isEnd() && this.peek().kind !== 'newline') this.advance();
    this.consumeRuleEnd();
  }

  expectIdent(role) {
    const token = this.peek();
    if (token?.kind !== 'ident') throw this.expected(role);
    this.advance();
    return token.value;
  }

  expectNumber(role) {
    const token = this.peek();
    if (token?.kind !== 'number') throw this.expected(role);
    this.advance();
    return token.value;
  }

  expectKind(kind, label) {
    if (this.peek()?.kind !== kind) throw this.expected(label);
    this.advance();
  }

  tryConsume(kind) {
    if (this.peek()?.kind !== kind) return false;
    this.advance();
    return true;
  }

  // Alternatives may continue on following lines (`| b`), across comments.
  tryConsumePipe() {
    const start = this.cursor;
    while (['newline', 'comment'].includes(this.peek()?.kind)) this.advance();
    if (this.peek()?.kind === 'pipe') {
      this.advance();
      return true;
    }
    this.cursor = start;
    return false;
  }

  isSequenceEnd() {
    return this.isEnd() || SEQUENCE_ENDS.has(this.peek().kind);
  }

  expected(expected) {
    return this.error(`expected ${expected}`);
  }

  // Like Rust, errors past the last token report byte 0.
  error(message) {
    return errorAt(this.peek()?.offset ?? 0, message);
  }

  isEnd() {
    return this.cursor >= this.tokens.length;
  }

  peek() {
    return this.tokens[this.cursor];
  }

  advance() {
    const token = this.tokens[this.cursor];
    this.cursor += 1;
    return token;
  }
}

// Repeat counts are exact 64-bit values; they stay BigInt only when they do
// not fit a safe JavaScript integer.
function count(value) {
  return value <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(value) : value;
}

function lowerRegex(value, offset) {
  const content = trivialRegexCharClass(value);
  if (content === null) {
    return GrammarBuilder.capture('regex', GrammarBuilder.literal(value));
  }
  return lowerCharSet(content, offset);
}

// A regex that is exactly one bracket expression lowers to a character class.
function trivialRegexCharClass(value) {
  if (!value.startsWith('[') || !value.endsWith(']') ||
    hasUnescapedInnerClosingBracket(value)) return null;
  return value.slice(1, -1);
}

function hasUnescapedInnerClosingBracket(value) {
  const characters = Array.from(value);
  let escaped = false;
  for (let index = 1; index < characters.length; index += 1) {
    if (index === characters.length - 1) return false;
    const character = characters[index];
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === ']') return true;
  }
  return false;
}

function lowerCharSet(content, offset) {
  const scanner = new CharStream(content);
  const negated = scanner.peekChar() === '^';
  if (negated) scanner.advanceChar();
  const items = [];
  while (!scanner.isEnd()) {
    const start = readClassChar(scanner, offset);
    if (scanner.peekChar() === '-' && scanner.peekChar(1) !== undefined) {
      scanner.advanceChar();
      const end = readClassChar(scanner, offset);
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

function readClassChar(scanner, offset) {
  const character = scanner.advanceChar();
  if (character === undefined) throw errorAt(offset, 'unexpected end of character class');
  if (character !== '\\') return character;
  return readEscape(scanner, offset, 'unterminated character class escape', offset);
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
  if (alternative.kind === 'choice' && alternative.ordered === false) {
    alternatives.push(...alternative.items);
  } else {
    alternatives.push(alternative);
  }
}

function ruleDoc(comments, notes) {
  const parts = [...comments.filter((comment) => comment !== ''), ...notes];
  return parts.length === 0 ? null : parts.join('; ');
}

// Rust keeps rules in a list and `rule(name)` finds the first match; the JS
// grammar is keyed by name, so a repeated name keeps its first definition.
function buildGrammar(rules, start) {
  const mapped = new Map();
  const ruleDocs = new Map();
  for (const { name, kind, expression, doc } of rules) {
    if (mapped.has(name)) continue;
    mapped.set(name, { name, kind, expression });
    if (doc !== null) ruleDocs.set(name, doc);
  }
  const grammar = new Grammar(start, mapped, FORMAT);
  grammar.ruleDocs = ruleDocs;
  return grammar;
}
