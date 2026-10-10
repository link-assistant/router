import { rustTokens } from '../rust-structure.mjs';
import { tokenize } from '../vendor/meta-language/translation/lexer.js';
import { TranslationError } from '../vendor/meta-language/translation/diagnostics.js';

// Normalize raw strings and Rust's ASCII whitespace line continuations into
// the upstream string token vocabulary. Every token is mapped back to source
// coordinates; original text remains exclusively in the structural meta IR.
export function tokenizeRust(source) {
  const replacements = [];
  for (const token of rustTokens(source)) {
    if (token.type !== 'string') continue;
    const raw = /^r(#{0,})"([\s\S]*)"\1$/u.exec(token.text);
    let replacement;
    if (raw) {
      if (/\r(?!\n)/u.test(raw[2])) throw new TranslationError('syntax', 'bare carriage return in Rust raw string', { start: token.start, end: token.end });
      replacement = JSON.stringify(raw[2].replace(/\r\n/gu, '\n'));
    }
    else if (token.text.startsWith('"')) {
      replacement = '"';
      for (let at = 1; at < token.text.length - 1; at++) {
        const char = token.text[at];
        if (char === '\r') {
          if (token.text[at + 1] !== '\n') throw new TranslationError('syntax', 'bare carriage return in Rust string', { start: token.start + at, end: token.start + at + 1 });
          replacement += '\n'; at++; continue;
        }
        if (char !== '\\') { replacement += char; continue; }
        const next = token.text[++at];
        if (next === '\n' || (next === '\r' && token.text[at + 1] === '\n')) {
          while (/[ \t\r\n]/u.test(token.text[at + 1] ?? '')) at++;
        } else if (next === 'x' && /^[0-7][0-9a-fA-F]$/u.test(token.text.slice(at + 1, at + 3))) {
          replacement += `\\u{${token.text.slice(at + 1, at + 3)}}`;
          at += 2;
        } else replacement += '\\' + next;
      }
      replacement += '"';
    }
    if (replacement !== undefined && replacement !== token.text) replacements.push({ start: token.start, end: token.end, text: replacement });
  }
  const starts = [], ends = [];
  let normalized = '';
  let offset = 0;
  const appendPlain = stop => {
    for (; offset < stop; offset++) { normalized += source[offset]; starts.push(offset); ends.push(offset + 1); }
  };
  for (const replacement of replacements) {
    appendPlain(replacement.start);
    normalized += replacement.text;
    for (let index = 0; index < replacement.text.length; index++) { starts.push(replacement.start); ends.push(replacement.end); }
    offset = replacement.end;
  }
  appendPlain(source.length);
  let parsed;
  try { parsed = tokenize(normalized, 'Rust'); }
  catch (error) {
    if (!(error instanceof TranslationError) || !error.span) throw error;
    throw new TranslationError(error.kind, error.reason, { start: starts[error.span.start] ?? source.length, end: ends[error.span.end - 1] ?? source.length }, error.details);
  }
  // const fn has the same pure runtime body; compile-time evaluability remains
  // outside the draft contract. Keep all original token spans.
  return parsed.tokens.filter((token, index) => !(token.value === 'const' && parsed.tokens[index + 1]?.value === 'fn')).map(token => ({ ...token, start: starts[token.start] ?? source.length, end: ends[token.end - 1] ?? source.length }));
}
