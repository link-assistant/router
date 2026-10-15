// Tokenization for Yacc/Bison source import, including balanced C action blocks.
// Host code is never evaluated. Offsets name the original source on refusals.
import { parseError } from './common.js';

export function stripYaccComments(source) {
  let result = '';
  let offset = 0;
  while (offset < source.length) {
    const character = source[offset];
    if (character === '"' || character === "'") {
      const quote = character;
      result += source[offset++];
      while (offset < source.length) {
        const current = source[offset++];
        result += current;
        if (current === '\\' && offset < source.length) result += source[offset++];
        else if (current === quote) break;
      }
    } else if (source.startsWith('/*', offset)) {
      const end = source.indexOf('*/', offset + 2);
      if (end < 0) throw parseError('Yacc', `unterminated comment at offset ${offset}`);
      result += ' ';
      offset = end + 2;
    } else if (source.startsWith('//', offset)) {
      const end = source.indexOf('\n', offset + 2);
      result += ' ';
      offset = end < 0 ? source.length : end;
    } else result += source[offset++];
  }
  return result;
}

export function tokenizeYacc(source) {
  const tokens = [];
  let offset = 0;
  const fail = (message) => { throw parseError('Yacc', `${message} at offset ${offset}`); };
  const comment = () => {
    if (source.startsWith('/*', offset)) {
      const end = source.indexOf('*/', offset + 2);
      if (end < 0) fail('unterminated comment');
      offset = end + 2;
      return true;
    }
    if (source.startsWith('//', offset)) {
      const end = source.indexOf('\n', offset + 2);
      offset = end < 0 ? source.length : end;
      return true;
    }
    return false;
  };
  const quoted = () => {
    const quote = source[offset++];
    let value = '';
    while (offset < source.length) {
      const character = source[offset++];
      if (character === quote) return value;
      if (character !== '\\') { value += character; continue; }
      if (offset === source.length) fail('unterminated string escape');
      const escaped = source[offset++];
      if (escaped === 'x' || escaped === 'u' || escaped === 'U') {
        const digits = escaped === 'x' ? /^[a-f0-9]{1,2}/iu : new RegExp(`^[a-f0-9]{${escaped === 'u' ? 4 : 8}}`, 'iu');
        const match = digits.exec(source.slice(offset));
        if (!match) fail('invalid character escape');
        const code = Number.parseInt(match[0], 16);
        if (code > 0x10ffff || code >= 0xd800 && code <= 0xdfff) fail('invalid Unicode scalar');
        value += String.fromCodePoint(code);
        offset += match[0].length;
      } else if (/[0-7]/u.test(escaped)) {
        const tail = /^[0-7]{0,2}/u.exec(source.slice(offset))[0];
        value += String.fromCodePoint(Number.parseInt(escaped + tail, 8));
        offset += tail.length;
      } else {
        const escapes = { n: '\n', r: '\r', t: '\t', b: '\b', f: '\f', v: '\v', '\\': '\\', '"': '"', "'": "'" };
        if (!Object.hasOwn(escapes, escaped)) fail(`unknown character escape \\${escaped}`);
        value += escapes[escaped];
      }
    }
    fail('unterminated string');
  };
  const block = () => {
    const start = offset++;
    let depth = 1;
    while (offset < source.length) {
      if (comment()) continue;
      if (source[offset] === '"' || source[offset] === "'") { quoted(); continue; }
      if (source[offset] === '{') depth += 1;
      if (source[offset] === '}' && --depth === 0) {
        const value = source.slice(start + 1, offset);
        offset += 1;
        return value;
      }
      offset += 1;
    }
    fail('unterminated action block');
  };
  while (offset < source.length) {
    const start = offset;
    if (source[offset] === '\n') { tokens.push({ kind: 'newline', value: '\n', offset }); offset += 1; continue; }
    if (/\s/u.test(source[offset])) { offset += 1; continue; }
    if (comment()) continue;
    if (source.startsWith('%%', offset)) { tokens.push({ kind: 'section', value: '%%', offset }); offset += 2; continue; }
    if (source.startsWith('%{', offset)) {
      const end = source.indexOf('%}', offset + 2);
      if (end < 0) fail('unterminated prologue');
      tokens.push({ kind: 'prologue', value: source.slice(offset + 2, end), offset });
      offset = end + 2;
      continue;
    }
    if (source[offset] === '"' || source[offset] === "'") {
      const quote = source[offset];
      const value = quoted();
      tokens.push({ kind: 'literal', value, quote, offset: start });
      continue;
    }
    if (source[offset] === '{') { const value = block(); tokens.push({ kind: 'action', value, offset: start }); continue; }
    if (source[offset] === '<') {
      const end = source.indexOf('>', offset + 1);
      if (end < 0) fail('unterminated type tag');
      tokens.push({ kind: 'type', value: source.slice(offset + 1, end), offset });
      offset = end + 1;
      continue;
    }
    const directive = /^%[A-Za-z][A-Za-z0-9_-]*/u.exec(source.slice(offset));
    if (directive) { tokens.push({ kind: 'directive', value: directive[0], offset }); offset += directive[0].length; continue; }
    const identifier = /^[A-Za-z_][A-Za-z0-9_.-]*/u.exec(source.slice(offset));
    if (identifier) { tokens.push({ kind: 'identifier', value: identifier[0], offset }); offset += identifier[0].length; continue; }
    const number = /^[0-9]+/u.exec(source.slice(offset));
    if (number) { tokens.push({ kind: 'number', value: number[0], offset }); offset += number[0].length; continue; }
    if (':;|[]=(),?*+'.includes(source[offset])) { tokens.push({ kind: source[offset], value: source[offset], offset }); offset += 1; continue; }
    fail(`unexpected character ${JSON.stringify(source[offset])}`);
  }
  return tokens;
}
