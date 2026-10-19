// Tokenizer shared by the portable-core translation frontends. Every token
// keeps its UTF-16 offsets so diagnostics and source mappings can point at
// the original bytes; comments are retained separately because JSDoc types are
// part of the JavaScript frontend's input.

import { TranslationError } from './diagnostics.js';
import { acceptControlParenthesis, decodeUnicodeEscape, regularExpressionEnd, startRegularExpression } from './frontend-rules.js';

const OPERATORS = {
  JavaScript: [
    '>>>=', '===', '!==', '...', '**=', '<<=', '>>=', '>>>', '&&=', '||=', '??=',
    '**', '&&', '||', '==', '!=', '<=', '>=', '=>', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '++', '--', '??', '?.', '<<', '>>',
  ],
  Rust: ['..=', '::', '->', '=>', '==', '!=', '<=', '>=', '&&', '||', '+=', '-=', '*=', '/=', '%=', '..'],
  Lean: [':=', '++', '->', '=>', '==', '!=', '<=', '>=', '&&', '||', '<;>', '<|', '|>', '::', '..', '←', '→', '∀', '∧', '≤', '≥', '≠', '×'],
  Rocq: [':=', '=>', '->', '<->', '<=?', '<?', '=?', '<=', '>=', '<>', '/\\', '\\/', '&&', '||', '++', '::', '%'],
};

const COMMENTS = {
  JavaScript: { line: '//', block: ['/*', '*/'], nested: false },
  Rust: { line: '//', block: ['/*', '*/'], nested: true },
  Lean: { line: '--', block: ['/-', '-/'], nested: true },
  Rocq: { line: null, block: ['(*', '*)'], nested: true },
};

export function tokenize(source, language) {
  return tokenizeRegion(source, language, 0, false, { units: null });
}

// Reuse the ordinary lexical decisions when finding a template substitution.
// Opaque string, comment, regex and nested-template tokens cannot close it.
function tokenizeRegion(source, language, startIndex, braced, encoding) {
  const operators = [...OPERATORS[language]].sort((left, right) => right.length - left.length);
  const comments = COMMENTS[language];
  const tokens = [];
  const commentList = [];
  // Encode once, on the first regular expression. Copying each remaining
  // suffix makes a module with many literals take quadratic time and space.
  const scopes = [];
  let closed = false;
  let depth = 0;
  let index = startIndex;
  while (index < source.length) {
    const char = source[index];
    if (braced && char === '}' && depth === 0) break;
    if (/\s/u.test(char)) {
      index += 1;
      continue;
    }
    if (comments.line && source.startsWith(comments.line, index)) {
      const end = source.indexOf('\n', index);
      const stop = end === -1 ? source.length : end;
      commentList.push({ text: source.slice(index, stop), start: index, end: stop });
      index = stop;
      continue;
    }
    if (source.startsWith(comments.block[0], index)) {
      const stop = blockCommentEnd(source, index, comments);
      commentList.push({ text: source.slice(index, stop), start: index, end: stop });
      index = stop;
      continue;
    }
    const start = index;
    if (language === 'JavaScript' && char === '/' && (closed || startRegularExpression(['.', '?.'].includes(tokens.at(-2)?.value) ? 'member' : tokens.at(-1)?.kind ?? '', tokens.at(-1)?.value ?? ''))) {
      encoding.units ??= Array.from({ length: source.length }, (_, offset) => source.charCodeAt(offset));
      const end = regularExpressionEnd(encoding.units, index);
      if (end < 0) throw new TranslationError('syntax', 'unterminated regular expression literal', { start, end: source.length });
      tokens.push({ kind: 'regex', value: '/', raw: source.slice(index, end), start, end });
      index = end;
      closed = false;
      continue;
    }
    closed = false;
    if (language === 'JavaScript' && char === '`') {
      tokens.push(templateToken(source, index, encoding));
      index = tokens.at(-1).end;
      continue;
    }
    if (char === '"' || (language === 'JavaScript' && char === "'")) {
      const token = stringToken(source, index, language);
      tokens.push(token);
      index = token.end;
      continue;
    }
    if (language === 'Lean' && source.startsWith('s!"', index)) {
      const token = stringToken(source, index + 2, language);
      tokens.push({ ...token, kind: 'interpolation', start, raw: source.slice(start, token.end) });
      index = token.end;
      continue;
    }
    if (language === 'JavaScript' && (/[0-9]/u.test(char) || (char === '.' && /[0-9]/u.test(source[index + 1] ?? '')))) {
      const token = javascriptNumber(source, index);
      tokens.push(token);
      index = token.end;
      continue;
    }
    if (/[0-9]/u.test(char)) {
      const match = /^[0-9][0-9_]*(?:[a-z][a-z0-9]*)?/u.exec(source.slice(index));
      const raw = match[0];
      const digits = /^[0-9_]*/u.exec(raw)[0];
      if (digits.endsWith('_')) throw new TranslationError('syntax', `malformed number ${raw}`, { start, end: start + raw.length });
      tokens.push({
        kind: 'number',
        value: digits.replaceAll('_', ''),
        suffix: raw.slice(digits.length),
        raw,
        start,
        end: start + raw.length,
      });
      index += raw.length;
      continue;
    }
    if (isIdentifierStart(char, language)) {
      let stop = index + char.length;
      for (;;) {
        while (stop < source.length && isIdentifierPart(source[stop], language)) stop += 1;
        // Lean and Rocq qualified names (`Tree.node`, `Nat.add`) are single tokens.
        const qualified = (language === 'Lean' || language === 'Rocq')
          && source[stop] === '.' && stop + 1 < source.length && isIdentifierStart(source[stop + 1], language);
        if (!qualified) break;
        stop += 2;
      }
      if (language === 'Rust' && source[stop] === '!' && source[stop + 1] !== '=') {
        tokens.push({ kind: 'macro', value: source.slice(index, stop), start, end: stop + 1, raw: source.slice(index, stop + 1) });
        index = stop + 1;
        continue;
      }
      tokens.push({ kind: 'identifier', value: source.slice(index, stop), start, end: stop, raw: source.slice(index, stop) });
      index = stop;
      continue;
    }
    const operator = operators.find((candidate) => source.startsWith(candidate, index));
    const text = operator ?? String.fromCodePoint(source.codePointAt(index));
    if (braced && text === '{') depth += 1;
    if (braced && text === '}') depth -= 1;
    if (language === 'JavaScript') {
      if (text === '(') scopes.push(acceptControlParenthesis(tokens.at(-1)?.kind ?? '', tokens.at(-1)?.value ?? '', ['.', '?.'].includes(tokens.at(-2)?.value)));
      if (text === ')') closed = scopes.pop() ?? false;
    }
    tokens.push({ kind: 'punct', value: text, start, end: start + text.length, raw: text });
    index += text.length;
  }
  tokens.push({ kind: 'eof', value: '', start: index, end: index, raw: '' });
  return { tokens, comments: commentList };
}

const DIGITS = { 16: '[0-9a-fA-F]', 8: '[0-7]', 2: '[01]', 10: '[0-9]' };
const run = (digit) => `${digit}(?:_?${digit})*`;
const JS_NUMBER = new RegExp(
  `^(?:0[xX]${run(DIGITS[16])}|0[oO]${run(DIGITS[8])}|0[bB]${run(DIGITS[2])}`
  + `|(?:(?:0|[1-9](?:_?${run(DIGITS[10])})?)(?:\\.(?:${run(DIGITS[10])})?)?|\\.${run(DIGITS[10])})`
  + `(?:[eE][+-]?${run(DIGITS[10])})?)n?`,
  'u',
);

/**
 * An ECMAScript numeric literal. A BigInt (`5n`, `0x1fn`) keeps its decimal
 * digits as `value` with suffix `n`; a Number keeps `String(Number(raw))`, the
 * value JavaScript prints, with an empty suffix.
 */
function javascriptNumber(source, index) {
  const match = JS_NUMBER.exec(source.slice(index));
  const raw = match?.[0] ?? source[index];
  const end = index + raw.length;
  const next = source[end] ?? '';
  const malformed = () => new TranslationError('syntax', `malformed number ${source.slice(index, end + next.length)}`, { start: index, end: end + next.length });
  // `08`, `1_`, `3in` and `1.5n` are SyntaxErrors in JavaScript.
  if (!match || /[0-9A-Za-z_$]/u.test(next)) throw malformed();
  const text = raw.replaceAll('_', '');
  if (text.endsWith('n')) {
    if (/[.eE]/u.test(text) && !/^0[xX]/u.test(text)) throw malformed();
    return { kind: 'number', value: BigInt(text.slice(0, -1)).toString(), suffix: 'n', raw, start: index, end };
  }
  return { kind: 'number', value: String(Number(text)), suffix: '', raw, start: index, end };
}

function blockCommentEnd(source, index, comments) {
  const [open, close] = comments.block;
  let depth = 0;
  let cursor = index;
  while (cursor < source.length) {
    if (source.startsWith(open, cursor)) {
      depth += 1;
      cursor += open.length;
      if (!comments.nested && depth > 1) depth = 1;
      continue;
    }
    if (source.startsWith(close, cursor)) {
      depth -= 1;
      cursor += close.length;
      if (depth === 0) return cursor;
      continue;
    }
    cursor += 1;
  }
  throw new TranslationError('syntax', 'unterminated block comment', { start: index, end: source.length });
}

// A \u escape at `at`: \u{X..} in JavaScript and Rust, and \uXXXX in
// JavaScript, where a surrogate pair of two such escapes is one code point.
// A lone surrogate is refused, because Rust strings cannot hold it.
function unicodeEscape(source, at, language) {
  const units = [];
  for (let index = at; index < Math.min(source.length, at + 12); index += 1) units.push(source.charCodeAt(index));
  const escape = decodeUnicodeEscape(units, language === 'JavaScript');
  if (escape.$ === 'malformed') throw new TranslationError('syntax', 'malformed unicode escape', { start: at, end: at + 2 });
  if (escape.$ === 'unsupported') {
    throw new TranslationError('unsupported', `unicode escape ${source.slice(at, at + escape.escapeLength)} is not a scalar value; Rust strings hold scalar values only`, { start: at, end: at + escape.end });
  }
  return { text: String.fromCodePoint(escape.code), end: at + escape.end };
}

function stringToken(source, index, language) {
  const quote = source[index];
  let cursor = index + 1;
  let value = '';
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === quote) {
      if (language === 'Rocq' && source[cursor + 1] === '"') {
        value += '"';
        cursor += 2;
        continue;
      }
      return { kind: 'string', value, start: index, end: cursor + 1, raw: source.slice(index, cursor + 1) };
    }
    if (char === '\\' && language !== 'Rocq') {
      const escaped = source[cursor + 1];
      if (language === 'JavaScript' && (/[1-9]/u.test(escaped ?? '') || (escaped === '0' && /[0-9]/u.test(source[cursor + 2] ?? '')))) {
        throw new TranslationError('syntax', 'legacy octal string escape', { start: cursor, end: cursor + 2 });
      }
      if (language === 'JavaScript' && ['\n', '\r', '\u2028', '\u2029'].includes(escaped)) {
        cursor += escaped === '\r' && source[cursor + 2] === '\n' ? 3 : 2;
        continue;
      }
      const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', "'": "'", 0: '\0', '{': language === 'JavaScript' ? '{' : '\\{' };
      if (escaped === 'u' || (language === 'JavaScript' && escaped === 'x')) {
        const escape = unicodeEscape(source, cursor, language);
        value += escape.text;
        cursor = escape.end;
        continue;
      }
      if (!(escaped in simple) && (language !== 'JavaScript' || escaped === undefined)) {
        throw new TranslationError('syntax', `unsupported string escape \\${escaped}`, { start: cursor, end: cursor + 2 });
      }
      value += simple[escaped] ?? escaped;
      cursor += 2;
      continue;
    }
    if ((char === '\n' || char === '\r') && language === 'JavaScript') break;
    value += char;
    cursor += 1;
  }
  throw new TranslationError('syntax', 'unterminated string literal', { start: index, end: source.length });
}

function templateToken(source, index, encoding) {
  const parts = [];
  let cursor = index + 1;
  let text = '';
  while (cursor < source.length) {
    const char = source[cursor];
    if (char === '`') {
      parts.push({ text });
      return { kind: 'template', parts, start: index, end: cursor + 1, raw: source.slice(index, cursor + 1) };
    }
    if (char === '\\') {
      const escaped = source[cursor + 1];
      if (['\n', '\r', '\u2028', '\u2029'].includes(escaped)) {
        cursor += escaped === '\r' && source[cursor + 2] === '\n' ? 3 : 2;
        continue;
      }
      const simple = { n: '\n', t: '\t', r: '\r', b: '\b', f: '\f', v: '\v', 0: '\0', '\\': '\\', '`': '`', $: '$' };
      if (escaped === 'u' || escaped === 'x') {
        const escape = unicodeEscape(source, cursor, 'JavaScript');
        text += escape.text;
        cursor = escape.end;
        continue;
      }
      if (/[1-9]/u.test(escaped ?? '') || (escaped === '0' && /[0-9]/u.test(source[cursor + 2] ?? ''))) {
        throw new TranslationError('syntax', 'legacy octal template escape', { start: cursor, end: cursor + 3 });
      }
      if (escaped === undefined) {
        throw new TranslationError('syntax', `unsupported template escape \\${escaped}`, { start: cursor, end: cursor + 2 });
      }
      text += simple[escaped] ?? escaped;
      cursor += 2;
      continue;
    }
    if (char === '\r') {
      text += '\n';
      cursor += source[cursor + 1] === '\n' ? 2 : 1;
      continue;
    }
    if (source.startsWith('${', cursor)) {
      const close = matchingBrace(source, cursor + 1, encoding);
      parts.push({ text, expression: { source: source.slice(cursor + 2, close), offset: cursor + 2 } });
      text = '';
      cursor = close + 1;
      continue;
    }
    text += char;
    cursor += 1;
  }
  throw new TranslationError('syntax', 'unterminated template literal', { start: index, end: source.length });
}

export function matchingBrace(source, open, encoding = { units: null }) {
  const close = tokenizeRegion(source, 'JavaScript', open + 1, true, encoding).tokens.at(-1).end;
  if (close < source.length) return close;
  throw new TranslationError('syntax', 'unbalanced braces', { start: open, end: source.length });
}

function isIdentifierStart(char, language) {
  if (/[A-Za-z_]/u.test(char)) return true;
  if (language === 'JavaScript' && char === '$') return true;
  return (language === 'Lean' || language === 'Rocq') && /[\p{L}]/u.test(char) && !'∀→∧≤≥≠λ×'.includes(char);
}

function isIdentifierPart(char, language) {
  if (/[A-Za-z0-9_]/u.test(char)) return true;
  if (language === 'JavaScript' && char === '$') return true;
  if (language === 'Rocq' && char === "'") return true;
  if (language === 'Lean' && (char === "'" || char === '!' || char === '?')) return true;
  return (language === 'Lean' || language === 'Rocq') && /[\p{L}\p{N}]/u.test(char) && !'∀→∧≤≥≠λ×'.includes(char);
}

/** Cursor over a token list with the helpers every frontend needs. */
export class TokenCursor {
  constructor(tokens, language) {
    this.tokens = tokens;
    this.language = language;
    this.index = 0;
  }

  peek(offset = 0) {
    return this.tokens[Math.min(this.index + offset, this.tokens.length - 1)];
  }

  next() {
    const token = this.peek();
    if (token.kind !== 'eof') this.index += 1;
    return token;
  }

  is(value, offset = 0) {
    const token = this.peek(offset);
    return (token.kind === 'punct' || token.kind === 'identifier') && token.value === value;
  }

  isKind(kind, offset = 0) {
    return this.peek(offset).kind === kind;
  }

  eat(value) {
    if (this.is(value)) return this.next();
    return undefined;
  }

  expect(value, context) {
    const token = this.peek();
    if (this.is(value)) return this.next();
    throw new TranslationError(
      'syntax',
      `expected ${value}${context ? ` in ${context}` : ''} but found ${describe(token)}`,
      token,
    );
  }

  identifier(context) {
    const token = this.peek();
    if (token.kind !== 'identifier') {
      throw new TranslationError('syntax', `expected identifier${context ? ` in ${context}` : ''} but found ${describe(token)}`, token);
    }
    return this.next();
  }

  atEnd() {
    return this.peek().kind === 'eof';
  }
}

export function describe(token) {
  return token.kind === 'eof' ? 'end of input' : `${JSON.stringify(token.raw ?? token.value)}`;
}
