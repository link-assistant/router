import { rustTokens } from '../rust-structure.mjs';
import { tokenize } from '../vendor/meta-language/translation/lexer.js';
import { TranslationError } from '../vendor/meta-language/translation/diagnostics.js';
import {decodeRustCharacter} from './rust-character.mjs';
import {decodeRustInteger} from './rust-number.mjs';

// Adapt written integer, character and string payloads to the pinned token
// vocabulary. Every token is mapped back to original source coordinates;
// the structural meta IR preserves the original source text.
export function tokenizeRust(source) {
  const replacements = [],characters=new Map(),numbers=new Map();
  for (const token of rustTokens(source)) {
    if(token.type==='number'){
      numbers.set(token.start,{...decodeRustInteger(token.text,{start:token.start,end:token.end}),end:token.end});
      replacements.push({start:token.start,end:token.end,text:'0'});continue;
    }
    if (token.type !== 'string') continue;
    if(token.text.startsWith("'")){const value=decodeRustCharacter(token.text,{start:token.start,end:token.end});characters.set(token.start,{value,raw:token.text,end:token.end});replacements.push({start:token.start,end:token.end,text:'"\\u{'+value.codePointAt(0).toString(16)+'}"'});continue;}
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
  // Preserve source qualification, including const fn. Eligibility is checked
  // by the semantic frontend rather than erased during lexical normalization.
  return parsed.tokens.map(token => {
    const start=starts[token.start]??source.length,end=ends[token.end-1]??source.length,character=characters.get(start),number=numbers.get(start);
    if(number&&number.end===end)return {...token,...number,start,end};
    return character&&character.end===end?{...token,kind:'rustChar',value:character.value,raw:character.raw,start,end}:{...token,start,end};
  });
}
