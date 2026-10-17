// A deliberately bounded, stateless regex family: one character class, either
// anywhere or anchored over the complete input. No regexp source is carried.
import { refuse } from './constructs.mjs';

export function parseCharacterClass(text) {
  const end = text.lastIndexOf('/'), flags = text.slice(end + 1);
  if (!['', 'u'].includes(flags)) refuse('unsupported', 'stateful or unsupported character-class flags');
  const unicode = flags === 'u';
  let pattern = text.slice(1, end), anchored = false;
  if (pattern.startsWith('^') && pattern.endsWith('$')) { anchored = true; pattern = pattern.slice(1, -1); }
  if (!pattern.startsWith('[') || !pattern.endsWith(']')) refuse('unsupported', 'a regex outside the bounded character-class grammar');
  let body = pattern.slice(1, -1), negated = false;
  if (body.startsWith('^')) { negated = true; body = body.slice(1); }
  let offset = 0;
  const atom = () => {
    const character = body[offset++];
    if (character !== '\\') {
      if (character === undefined || [']', '['].includes(character)) refuse('unsupported', 'a nested or malformed character class');
      const value = unicode ? body.codePointAt(offset - 1) : character.charCodeAt(0);
      if (unicode && value > 0xffff) offset++;
      return value;
    }
    const escape = body[offset++];
    const simple = { t: 9, n: 10, v: 11, f: 12, r: 13, b: 8 };
    if (Object.hasOwn(simple, escape)) return simple[escape];
    if ('\\/]-^'.includes(escape ?? '\0')) return escape.charCodeAt(0);
    let width = escape === 'x' ? 2 : escape === 'u' ? 4 : 0;
    if (escape === 'u' && body[offset] === '{') {
      if (!unicode) refuse('unsupported', 'a Unicode codepoint escape without the u flag');
      const close = body.indexOf('}', ++offset);
      const hex = body.slice(offset, close);
      if (close < 0 || !/^[0-9a-fA-F]{1,6}$/u.test(hex)) refuse('unsupported', 'a malformed Unicode class escape');
      offset = close + 1;
      const value = parseInt(hex, 16);
      if (value > 0x10ffff) refuse('unsupported', 'an invalid Unicode class codepoint');
      return value;
    }
    if (!width || !new RegExp(`^[0-9a-fA-F]{${width}}$`, 'u').test(body.slice(offset, offset + width))) refuse('unsupported', 'an unsupported character-class escape');
    const value = parseInt(body.slice(offset, offset + width), 16); offset += width;
    if (unicode && escape === 'u' && value >= 0xd800 && value <= 0xdbff) {
      const next = /^\\u([0-9a-fA-F]{4})/u.exec(body.slice(offset));
      const low = next ? parseInt(next[1],16) : -1;
      if (low >= 0xdc00 && low <= 0xdfff) { offset += 6; return 0x10000 + (value - 0xd800) * 1024 + low - 0xdc00; }
    }
    return value;
  };
  const ranges = [];
  while (offset < body.length) {
    const low = atom();
    let high = low;
    if (body[offset] === '-' && offset + 1 < body.length) { offset++; high = atom(); }
    if (low > high) refuse('unsupported', 'a descending character-class range');
    ranges.push({ low, high });
  }
  const model = { unicode, negated, anchored, ranges };
  validateCharacterClass(model);
  return model;
}

export function validateCharacterClass(model) {
  if (['unicode', 'negated', 'anchored'].some(field => typeof model[field] !== 'boolean') || !Array.isArray(model.ranges) || model.ranges.length > 128) refuse('unsupported', 'a malformed or oversized character-class AST');
  const maximum = model.unicode ? 0x10ffff : 0xffff;
  for (const range of model.ranges) if (![range.low, range.high].every(Number.isInteger) || range.low < 0 || range.high < range.low || range.high > maximum) refuse('unsupported', 'a malformed character-class bound');
}

export function classPattern(model) {
  validateCharacterClass(model);
  const escape = value => model.unicode ? `\\u{${value.toString(16)}}` : `\\u${value.toString(16).padStart(4, '0')}`;
  const body = model.ranges.map(({ low, high }) => `${escape(low)}${low === high ? '' : `-${escape(high)}`}`).join('');
  return `${model.anchored ? '^' : ''}[${model.negated ? '^' : ''}${body}]${model.anchored ? '$' : ''}`;
}
