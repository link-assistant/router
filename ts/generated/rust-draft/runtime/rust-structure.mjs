// Formal AI's pinned item lexer, extended locally for arbitrary Rust source.
import { lex } from './formal-ai-lexer.mjs';
import {topLevelRustItems} from './rust-item-boundaries.mjs';

// Mask only opaque lexical regions; token coordinates remain UTF-16 offsets.
// The original text is always used in the resulting source-bearing IR.
export function rustTokens(source) {
  const replacements = [];
  const quoteEnd = (start, quote) => {
    let end = start + 1;
    while (end < source.length) {
      if (source[end] === '\\') end += 2;
      else if (source[end++] === quote) return end;
      else continue;
    }
    throw new Error(`unterminated literal at ${start}`);
  };
  for (let at = 0; at < source.length;) {
    if (source.startsWith('//', at)) {
      const end = source.indexOf('\n', at);
      at = end < 0 ? source.length : end;
    } else if (source.startsWith('/*', at)) {
      const start = at;
      let depth = 1;
      at += 2;
      while (at < source.length && depth) {
        if (source.startsWith('/*', at)) { depth++; at += 2; }
        else if (source.startsWith('*/', at)) { depth--; at += 2; }
        else at++;
      }
      if (depth) throw new Error(`unterminated nested comment at ${start}`);
      replacements.push([start, at, '/*' + ' '.repeat(at - start - 4) + '*/']);
    } else {
      // Only these exact prefixes can match the original raw-literal regex.
      // Keep its preceding UTF-16 code-unit boundary, including surrogate behavior.
      const prefix = source[at] === 'r' ? at + 1 :
        (source[at] === 'b' || source[at] === 'c') && source[at + 1] === 'r' ? at + 2 : -1;
      const raw = prefix >= 0 && (source[prefix] === '#' || source[prefix] === '"') &&
        (at === 0 || !/[\p{L}\p{N}_]/u.test(source[at - 1])) ?
        /^(?:br|cr|r)(#*)"/u.exec(source.slice(at)) : null;
      if (raw) {
        const terminator = '"' + raw[1];
        const end = source.indexOf(terminator, at + raw[0].length);
        if (end < 0) throw new Error(`unterminated raw literal at ${at}`);
        const stop = end + terminator.length;
        replacements.push([at, stop, '"' + ' '.repeat(stop - at - 2) + '"']);
        at = stop;
      } else if (source[at] === '"') at = quoteEnd(at, '"');
      else if (source[at] === "'") {
        const char = /^'(?:\\u\{[0-9a-fA-F_]+\}|\\x[0-9a-fA-F]{2}|\\.|[^'\\])'/u.exec(source.slice(at));
        if (char) {
          replacements.push([at, at + char[0].length, '"' + ' '.repeat(char[0].length - 2) + '"']);
          at += char[0].length;
        } else at++;
      } else at++;
    }
  }
  // Replacements are ordered and nonoverlapping; assemble the same masked
  // UTF-16 text without repeatedly copying the complete remaining source.
  const pieces = [];
  let end = 0;
  for (const [start, stop, replacement] of replacements) {
    pieces.push(source.slice(end, start), replacement);
    end = stop;
  }
  const masked = replacements.length ? pieces.join('') + source.slice(end) : source;
  return lex(masked, 'Rust').map(token => ({ ...token, text: source.slice(token.start, token.end) }));
}

export function sourceItems(source) {
  const tokens = rustTokens(source);
  return topLevelRustItems(tokens).map(item => {
    const significant = item.tokens.filter(token => token.type !== 'comment');
    let keyword = significant.find(token => ['fn', 'struct', 'union', 'enum', 'impl', 'trait', 'mod', 'use', 'const', 'static', 'type', 'macro', 'macro_rules!'].includes(token.text));
    if (keyword?.text === 'const' && significant[significant.indexOf(keyword) + 1]?.text === 'fn') keyword = significant[significant.indexOf(keyword) + 1];
    const index = significant.indexOf(keyword);
    return { ...item, term: item.comment ? 'comment' : keyword?.text ?? 'opaque', name: keyword ? significant[index + 1]?.text ?? null : null };
  });
}
