import { parseError } from './common.js';

// Lexer and character helpers for the Lark importer. The Rust twin lives in
// rust/src/grammar/import/lark.rs; error offsets are UTF-8 byte offsets so the
// messages match the Rust importer exactly.

export const FORMAT = 'lark';

const U64_MAX = 18446744073709551615n;

const PUNCTUATION = {
  '%': 'percent',
  ':': 'colon',
  '|': 'pipe',
  '(': 'lparen',
  ')': 'rparen',
  '[': 'lbracket',
  ']': 'rbracket',
  '?': 'question',
  '*': 'star',
  '+': 'plus',
  '~': 'tilde',
  '.': 'dot',
};

const SIMPLE_ESCAPES = { n: '\n', r: '\r', t: '\t', b: '\u0008', f: '\u000c' };
const HEX_ESCAPE_DIGITS = { x: 2, u: 4, U: 8 };

/** Builds a Lark parse error that reports a UTF-8 byte offset. */
export function errorAt(offset, message) {
  return parseError(FORMAT, `${message} at byte ${offset}`);
}

/**
 * A code-point cursor over text that also knows the UTF-8 byte offset of
 * every position, mirroring Rust's `&str` indexing.
 */
export class CharStream {
  constructor(text) {
    this.chars = Array.from(text);
    this.bytes = [0];
    for (const character of this.chars) {
      this.bytes.push(this.bytes[this.bytes.length - 1] + utf8Length(character));
    }
    this.cursor = 0;
  }

  get offset() {
    return this.bytes[this.cursor];
  }

  isEnd() {
    return this.cursor >= this.chars.length;
  }

  peekChar(ahead = 0) {
    return this.chars[this.cursor + ahead];
  }

  advanceChar() {
    const character = this.chars[this.cursor];
    if (character !== undefined) this.cursor += 1;
    return character;
  }

  startsWith(prefix) {
    const expected = Array.from(prefix);
    return expected.every((character, index) => this.chars[this.cursor + index] === character);
  }

  slice(start, end) {
    return this.chars.slice(start, end).join('');
  }
}

/**
 * Splits Lark source into tokens `{ kind, value, offset }`. Horizontal
 * whitespace is skipped; newlines and `//` comments are kept as tokens because
 * the parser uses them to delimit rules.
 */
export function tokenizeLark(text) {
  const stream = new CharStream(text);
  const tokens = [];
  while (!stream.isEnd()) {
    skipHorizontalWhitespace(stream);
    if (stream.isEnd()) break;
    const offset = stream.offset;
    tokens.push({ ...nextToken(stream), offset });
  }
  return tokens;
}

function nextToken(stream) {
  if (stream.startsWith('//')) return { kind: 'comment', value: lineComment(stream) };
  if (stream.startsWith('..')) {
    stream.cursor += 2;
    return { kind: 'range' };
  }

  const character = stream.peekChar();
  if (character === '\n') {
    stream.advanceChar();
    return { kind: 'newline' };
  }
  if (character === '\r') {
    stream.advanceChar();
    if (stream.peekChar() === '\n') stream.advanceChar();
    return { kind: 'newline' };
  }
  if (character === '"' || character === "'") {
    return { kind: 'string', value: stringLiteral(stream, character) };
  }
  if (character === '/') return { kind: 'regex', value: regexLiteral(stream) };
  if (Object.hasOwn(PUNCTUATION, character)) {
    stream.advanceChar();
    return { kind: PUNCTUATION[character] };
  }
  if (/^[0-9]$/.test(character)) return { kind: 'number', value: number(stream) };
  if (/^[A-Za-z_]$/.test(character)) return { kind: 'ident', value: identifier(stream) };
  throw errorAt(stream.offset, `unexpected character ${rustCharDebug(character)}`);
}

function lineComment(stream) {
  const start = stream.cursor;
  while (stream.peekChar() !== undefined) {
    const character = stream.peekChar();
    if (character === '\n' || character === '\r') break;
    stream.advanceChar();
  }
  return trimWhiteSpace(stream.slice(start, stream.cursor));
}

function stringLiteral(stream, quote) {
  const start = stream.offset;
  stream.advanceChar();
  let value = '';
  for (let character = stream.advanceChar(); character !== undefined;
    character = stream.advanceChar()) {
    if (character === quote) return value;
    value += character === '\\'
      ? readEscape(stream, start, 'unterminated escape sequence')
      : character;
  }
  throw errorAt(start, 'unterminated string literal');
}

function regexLiteral(stream) {
  const start = stream.offset;
  stream.advanceChar();
  const contentStart = stream.cursor;
  let escaped = false;
  for (let character = stream.advanceChar(); character !== undefined;
    character = stream.advanceChar()) {
    if (escaped) {
      escaped = false;
    } else if (character === '\\') {
      escaped = true;
    } else if (character === '/') {
      return stream.slice(contentStart, stream.cursor - 1);
    } else if (character === '\n' || character === '\r') {
      throw errorAt(start, 'unterminated regex literal');
    }
  }
  throw errorAt(start, 'unterminated regex literal');
}

/**
 * Decodes the escape after a consumed backslash. `anchor` is the offset
 * reported for truncated or invalid escapes; `digitBase` is added to the
 * stream offset of a non-hexadecimal digit (character classes are scanned from
 * a sub-stream positioned relative to their regex token).
 */
export function readEscape(stream, anchor, unterminated, digitBase = 0) {
  const character = stream.advanceChar();
  if (character === undefined) throw errorAt(anchor, unterminated);
  if (Object.hasOwn(SIMPLE_ESCAPES, character)) return SIMPLE_ESCAPES[character];
  if (Object.hasOwn(HEX_ESCAPE_DIGITS, character)) {
    return hexEscape(stream, anchor, HEX_ESCAPE_DIGITS[character], digitBase);
  }
  // Quotes, slashes, brackets, `-`, `^` and unknown escapes keep the character.
  return character;
}

function hexEscape(stream, anchor, digits, digitBase) {
  let value = 0;
  for (let index = 0; index < digits; index += 1) {
    const position = stream.offset;
    const character = stream.advanceChar();
    if (character === undefined) throw errorAt(anchor, 'unterminated hexadecimal escape');
    if (!/^[0-9A-Fa-f]$/.test(character)) {
      throw errorAt(digitBase + position, 'hexadecimal escape requires hexadecimal digits');
    }
    value = value * 16 + Number.parseInt(character, 16);
  }
  if (value > 0x10ffff || (value >= 0xd800 && value <= 0xdfff)) {
    throw errorAt(anchor, 'invalid hexadecimal escape');
  }
  return String.fromCodePoint(value);
}

// Counts are read exactly as unsigned 64-bit integers, like Rust's `usize`.
function number(stream) {
  const start = stream.offset;
  let value = 0n;
  while (/^[0-9]$/.test(stream.peekChar() ?? '')) {
    value = value * 10n + BigInt(stream.advanceChar());
    if (value > U64_MAX) throw errorAt(start, 'number exceeds usize');
  }
  return value;
}

function identifier(stream) {
  const start = stream.cursor;
  stream.advanceChar();
  while (/^[A-Za-z0-9_]$/.test(stream.peekChar() ?? '')) stream.advanceChar();
  return stream.slice(start, stream.cursor);
}

function skipHorizontalWhitespace(stream) {
  while (true) {
    const character = stream.peekChar();
    if (character === undefined || character === '\n' || character === '\r' ||
      !/^\p{White_Space}$/u.test(character)) return;
    stream.advanceChar();
  }
}

function utf8Length(character) {
  const codePoint = character.codePointAt(0);
  if (codePoint < 0x80) return 1;
  if (codePoint < 0x800) return 2;
  if (codePoint < 0x10000) return 3;
  return 4;
}

// Rust's `str::trim` strips Unicode White_Space, which differs from
// `String.prototype.trim` for U+0085 and U+FEFF.
function trimWhiteSpace(text) {
  return text.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

const DEBUG_ESCAPES = {
  '\0': '\\0',
  '\t': '\\t',
  '\r': '\\r',
  '\n': '\\n',
  '\\': '\\\\',
  "'": "\\'",
};

// Formats a character like Rust's `{:?}` for `char`: grapheme extenders and
// non-printable characters become `\u{...}` escapes.
function rustCharDebug(character) {
  if (Object.hasOwn(DEBUG_ESCAPES, character)) return `'${DEBUG_ESCAPES[character]}'`;
  const unprintable = character !== ' ' &&
    /^[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u.test(character);
  if (unprintable || /^\p{Grapheme_Extend}$/u.test(character)) {
    return `'\\u{${character.codePointAt(0).toString(16)}}'`;
  }
  return `'${character}'`;
}
