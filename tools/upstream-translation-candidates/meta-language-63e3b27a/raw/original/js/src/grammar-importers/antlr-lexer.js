// Tokenizer for the ANTLR v4 importer. The Rust twin lives in
// rust/src/grammar/import/antlr/lexer.rs; both report error offsets in UTF-8
// bytes so parse errors carry the same text in both runtimes.
import { parseError } from './common.js';
import { decodeUnicodeEscape } from '../translation/frontend-rules.js';

export const FORMAT = 'antlr';

// Fixed punctuation tokens, keyed by the character that starts them. Entries
// whose `next` is set only match when that character follows.
const PUNCTUATION = [
  [':', null, 'colon'],
  [';', null, 'semicolon'],
  ['|', null, 'pipe'],
  ['(', null, 'lparen'],
  [')', null, 'rparen'],
  ['?', null, 'question'],
  ['*', null, 'star'],
  ['+', '=', 'plusEqual'],
  ['+', null, 'plus'],
  ['~', null, 'tilde'],
  ['.', '.', 'range'],
  ['.', null, 'dot'],
  ['=', null, 'equal'],
  ['-', '>', 'arrow'],
  [',', null, 'comma'],
  ['#', null, 'hash'],
  ['<', null, 'langle'],
  ['>', null, 'rangle'],
];

const TOKEN_TEXT = {
  colon: ':',
  semicolon: ';',
  pipe: '|',
  lparen: '(',
  rparen: ')',
  question: '?',
  star: '*',
  plus: '+',
  tilde: '~',
  dot: '.',
  equal: '=',
  plusEqual: '+=',
  arrow: '->',
  range: '..',
  comma: ',',
  hash: '#',
  langle: '<',
  rangle: '>',
};

const SIMPLE_ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\u0008', f: '\u000c' };

/** Builds an ANTLR parse error that names the UTF-8 byte offset. */
export function errorAt(offset, message) {
  return parseError(FORMAT, `${message} at byte ${offset}`);
}

/** Tokenizes ANTLR grammar text into `{ kind, value, offset }` tokens. */
export function tokenizeAntlr(text) {
  return new AntlrLexer(text).tokenize();
}

/** Renders a token back to ANTLR source text, as used by lexer commands. */
export function tokenText(token) {
  switch (token.kind) {
    case 'ident': case 'int': case 'comment': return token.value;
    case 'string': return `'${escapeLiteral(token.value)}'`;
    case 'charSet': return `[${token.value}]`;
    case 'action': return `{${token.value}}`;
    default: return TOKEN_TEXT[token.kind];
  }
}

/** Returns true for Unicode White_Space characters, like Rust's `char::is_whitespace`. */
export function isWhitespace(character) {
  return character !== undefined && /^\p{White_Space}$/u.test(character);
}

/** Trims Unicode White_Space from both ends, like Rust's `str::trim`. */
export function trimWhitespace(value) {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

/** Formats a string the way Rust's `{:?}` does. */
export function debugString(value) {
  return `"${[...value].map((character) => escapeDebug(character, '"')).join('')}"`;
}

/** Formats a single character the way Rust's `{:?}` does. */
export function debugChar(character) {
  return `'${escapeDebug(character, "'")}'`;
}

class AntlrLexer {
  constructor(text) {
    this.chars = Array.from(text);
    // Byte offset of every code point, plus the end offset.
    this.bytes = [0];
    for (const character of this.chars) {
      this.bytes.push(this.bytes[this.bytes.length - 1] + utf8Length(character));
    }
    this.cursor = 0;
  }

  tokenize() {
    const tokens = [];
    while (!this.isEnd()) {
      this.skipWhitespace();
      if (this.isEnd()) break;
      const offset = this.byteOffset();
      tokens.push({ ...this.nextToken(), offset });
    }
    return tokens;
  }

  nextToken() {
    if (this.startsWith('//')) return { kind: 'comment', value: this.lineComment() };
    if (this.startsWith('/*')) return { kind: 'comment', value: this.blockComment() };

    const character = this.peekChar();
    if (character === "'") return { kind: 'string', value: this.stringLiteral() };
    if (character === '[') return { kind: 'charSet', value: this.charSet() };
    if (character === '{') return { kind: 'action', value: this.actionBlock() };
    for (const [first, next, kind] of PUNCTUATION) {
      if (character !== first || (next !== null && this.chars[this.cursor + 1] !== next)) continue;
      this.cursor += next === null ? 1 : 2;
      return { kind };
    }
    if (isIdentStart(character)) return { kind: 'ident', value: this.identifier() };
    if (/^[0-9]$/u.test(character)) {
      const start = this.cursor;
      while (/^[0-9]$/u.test(this.peekChar() ?? '')) this.cursor += 1;
      return { kind: 'int', value: this.chars.slice(start, this.cursor).join('') };
    }
    throw errorAt(this.byteOffset(), `unexpected character ${debugChar(character)}`);
  }

  lineComment() {
    const start = this.cursor;
    while (!this.isEnd() && this.peekChar() !== '\n' && this.peekChar() !== '\r') {
      this.cursor += 1;
    }
    return trimWhitespace(this.slice(start, this.cursor));
  }

  blockComment() {
    const start = this.cursor;
    this.cursor += 2;
    while (!this.isEnd()) {
      if (this.startsWith('*/')) {
        this.cursor += 2;
        return trimWhitespace(this.slice(start, this.cursor));
      }
      this.cursor += 1;
    }
    throw errorAt(this.bytes[start], 'unterminated block comment');
  }

  stringLiteral() {
    const start = this.byteOffset();
    this.cursor += 1;
    let value = '';
    while (!this.isEnd()) {
      const character = this.advanceChar();
      if (character === "'") return value;
      value += character === '\\' ? this.escapeSequence(start) : character;
    }
    throw errorAt(start, 'unterminated string literal');
  }

  charSet() {
    const start = this.byteOffset();
    this.cursor += 1;
    const contentStart = this.cursor;
    let escaped = false;
    while (!this.isEnd()) {
      const character = this.advanceChar();
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === ']') return this.slice(contentStart, this.cursor - 1);
    }
    throw errorAt(start, 'unterminated character set');
  }

  actionBlock() {
    const start = this.byteOffset();
    this.cursor += 1;
    const contentStart = this.cursor;
    let depth = 1;
    while (!this.isEnd()) {
      const character = this.advanceChar();
      if (character === "'" || character === '"') {
        this.skipQuotedInAction(character, start);
      } else if (character === '/' && this.startsWith('/')) {
        this.skipLineCommentInAction();
      } else if (character === '/' && this.startsWith('*')) {
        this.skipBlockCommentInAction(start);
      } else if (character === '{') {
        depth += 1;
      } else if (character === '}') {
        depth -= 1;
        if (depth === 0) return this.slice(contentStart, this.cursor - 1);
      }
    }
    throw errorAt(start, 'unterminated action block');
  }

  skipQuotedInAction(quote, actionStart) {
    let escaped = false;
    while (!this.isEnd()) {
      const character = this.advanceChar();
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) return;
    }
    throw errorAt(actionStart, 'unterminated quoted action text');
  }

  skipLineCommentInAction() {
    this.cursor += 1;
    while (!this.isEnd() && this.peekChar() !== '\n' && this.peekChar() !== '\r') {
      this.cursor += 1;
    }
  }

  skipBlockCommentInAction(actionStart) {
    this.cursor += 1;
    while (!this.isEnd()) {
      if (this.startsWith('*/')) {
        this.cursor += 2;
        return;
      }
      this.cursor += 1;
    }
    throw errorAt(actionStart, 'unterminated block comment in action');
  }

  escapeSequence(start) {
    if (this.isEnd()) throw errorAt(start, 'unterminated escape sequence');
    const character = this.advanceChar();
    if (character === 'u') return this.unicodeEscape(start);
    return SIMPLE_ESCAPES[character] ?? character;
  }

  unicodeEscape(start) {
    if (this.peekChar() === '{') {
      const text = '\\u' + this.chars.slice(this.cursor, this.cursor + 10).join('');
      const units = Array.from({ length: Math.min(text.length, 12) }, (_, index) => text.charCodeAt(index));
      const decoded = decodeUnicodeEscape(units, false);
      if (decoded.$ !== 'scalar') throw errorAt(start, 'invalid braced unicode escape');
      this.cursor += decoded.end - 2;
      return String.fromCodePoint(decoded.code);
    }
    let value = 0;
    for (let digit = 0; digit < 4; digit += 1) {
      if (this.isEnd()) throw errorAt(start, 'unterminated unicode escape');
      const character = this.advanceChar();
      if (!/^[0-9A-Fa-f]$/.test(character)) {
        throw errorAt(this.bytes[this.cursor - 1], 'unicode escape requires hexadecimal digits');
      }
      value = value * 16 + Number.parseInt(character, 16);
    }
    // Rust's `char::from_u32` rejects surrogate code points.
    if (value >= 0xd800 && value <= 0xdfff) throw errorAt(start, 'invalid unicode escape');
    return String.fromCodePoint(value);
  }

  identifier() {
    const start = this.cursor;
    this.cursor += 1;
    while (isIdentContinue(this.peekChar())) this.cursor += 1;
    return this.slice(start, this.cursor);
  }

  skipWhitespace() {
    while (isWhitespace(this.peekChar())) this.cursor += 1;
  }

  startsWith(prefix) {
    return [...prefix].every((character, index) => this.chars[this.cursor + index] === character);
  }

  slice(start, end) {
    return this.chars.slice(start, end).join('');
  }

  byteOffset() {
    return this.bytes[this.cursor];
  }

  isEnd() {
    return this.cursor >= this.chars.length;
  }

  peekChar() {
    return this.chars[this.cursor];
  }

  advanceChar() {
    const character = this.chars[this.cursor];
    this.cursor += 1;
    return character;
  }
}

// Mirrors Rust's `char::escape_default` followed by `.replace('\'', "\\'")`.
function escapeLiteral(value) {
  return [...value].map((character) => {
    if (character === '\t') return '\\t';
    if (character === '\r') return '\\r';
    if (character === '\n') return '\\n';
    if (character === '\\' || character === '"') return `\\${character}`;
    if (character === "'") return "\\\\'";
    const code = character.codePointAt(0);
    if (code >= 0x20 && code <= 0x7e) return character;
    return `\\u{${code.toString(16)}}`;
  }).join('');
}

// Mirrors Rust's `Debug` escaping of `str` and `char`: the active quote is
// escaped, and non-printable or grapheme-extending characters use `\u{..}`.
function escapeDebug(character, quote) {
  switch (character) {
    case '\0': return '\\0';
    case '\t': return '\\t';
    case '\r': return '\\r';
    case '\n': return '\\n';
    case '\\': return '\\\\';
    default: break;
  }
  if (character === quote) return `\\${character}`;
  const extended = /^\p{Grapheme_Extend}$/u.test(character);
  const printable = character === ' ' ||
    !/^[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u.test(character);
  if (extended || !printable) return `\\u{${character.codePointAt(0).toString(16)}}`;
  return character;
}

function utf8Length(character) {
  const code = character.codePointAt(0);
  if (code < 0x80) return 1;
  if (code < 0x800) return 2;
  if (code < 0x10000) return 3;
  return 4;
}

function isIdentStart(character) {
  return character !== undefined && /^[A-Za-z_]$/.test(character);
}

function isIdentContinue(character) {
  return character !== undefined && /^[A-Za-z0-9_]$/.test(character);
}
