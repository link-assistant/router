// The text layer of the native grammar executor: the input is a byte string
// (UTF-8 for text), every offset is a byte offset, and a code point is decoded
// on demand. A byte that does not start a well-formed UTF-8 sequence is one
// unit of its own with no code point, so byte classes and `any` still see it.

const ENCODER = new TextEncoder();
const STRICT_DECODER = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });

/** The bytes of `source`: a string is encoded as UTF-8, a byte array is kept. */
export function inputBytes(source) {
  if (typeof source === 'string') return ENCODER.encode(source);
  if (source instanceof Uint8Array) return source;
  throw new TypeError('a grammar parser reads a string or a Uint8Array');
}

/** The UTF-8 bytes of a string. */
export function encodeText(text) {
  return ENCODER.encode(text);
}

/**
 * The code point at `position` and its byte length: `{ codePoint, length }`.
 * A malformed or truncated sequence yields `codePoint: -1` and length 1.
 */
export function decodeAt(bytes, position, end = bytes.length) {
  const first = bytes[position];
  if (first < 0x80) return { codePoint: first, length: 1 };
  let length;
  let codePoint;
  let minimum;
  if (first >= 0xc2 && first <= 0xdf) {
    length = 2; codePoint = first & 0x1f; minimum = 0x80;
  } else if (first >= 0xe0 && first <= 0xef) {
    length = 3; codePoint = first & 0x0f; minimum = 0x800;
  } else if (first >= 0xf0 && first <= 0xf4) {
    length = 4; codePoint = first & 0x07; minimum = 0x10000;
  } else {
    return { codePoint: -1, length: 1 };
  }
  if (position + length > end) return { codePoint: -1, length: 1 };
  for (let index = 1; index < length; index += 1) {
    const next = bytes[position + index];
    if ((next & 0xc0) !== 0x80) return { codePoint: -1, length: 1 };
    codePoint = (codePoint << 6) | (next & 0x3f);
  }
  if (codePoint < minimum || codePoint > 0x10ffff || (codePoint >= 0xd800 && codePoint <= 0xdfff)) {
    return { codePoint: -1, length: 1 };
  }
  return { codePoint, length };
}

/** The text of a byte range, or `null` when it is not well-formed UTF-8. */
export function textOf(bytes, start, end) {
  try {
    return STRICT_DECODER.decode(bytes.subarray(start, end));
  } catch {
    return null;
  }
}

/** The lower-case hexadecimal spelling of a byte range. */
export function hexOf(bytes, start, end) {
  return [...bytes.subarray(start, end)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

/** The number of code points (or stray bytes) in a byte range. */
export function unitCount(bytes, start, end) {
  let count = 0;
  for (let position = start; position < end; position += decodeAt(bytes, position, end).length) count += 1;
  return count;
}

/** The 1-based line and column of `offset`, counting columns in code points. */
export function lineAndColumn(bytes, offset, begin = 0) {
  let line = 1;
  let lineStart = begin;
  for (let position = begin; position < offset; position += 1) {
    if (bytes[position] === 0x0a) {
      line += 1;
      lineStart = position + 1;
    }
  }
  return { line, column: unitCount(bytes, lineStart, offset) + 1 };
}

/** The 0-based column of `offset`: the code points since the last line feed (or `begin`). */
export function columnOf(bytes, offset, begin = 0) {
  let lineStart = offset;
  while (lineStart > begin && bytes[lineStart - 1] !== 0x0a) lineStart -= 1;
  return unitCount(bytes, lineStart, offset);
}

const PROPERTY_PATTERNS = new Map();

/**
 * The matcher of a Unicode general category (`Lu`, `L`, `Nd`, ...) or script
 * (`Greek`, `Latin`, ...), or `null` when the name is not one.
 */
export function unicodePropertyMatcher(kind, value) {
  const key = `${kind}:${value}`;
  if (!PROPERTY_PATTERNS.has(key)) {
    const property = kind === 'category' ? 'General_Category' : 'Script';
    let pattern = null;
    if (/^[A-Za-z_]+$/u.test(value)) {
      try {
        pattern = new RegExp(`^\\p{${property}=${value}}$`, 'u');
      } catch {
        pattern = null;
      }
    }
    PROPERTY_PATTERNS.set(key, pattern);
  }
  return PROPERTY_PATTERNS.get(key);
}

/** Folds a text for `literalInsensitive`: the simple lower case of every code point. */
export function foldCase(text) {
  return [...text].map((char) => char.toLowerCase()).join('');
}

/**
 * The UTF-16 view of a byte string for regular expressions: the decoded text
 * (a stray byte becomes U+FFFD) and the maps between byte and UTF-16 offsets
 * at unit boundaries.
 */
export function utf16View(bytes, begin, end) {
  const pieces = [];
  const byteToUnit = new Map();
  const unitToByte = new Map();
  let units = 0;
  for (let position = begin; position < end;) {
    const { codePoint, length } = decodeAt(bytes, position, end);
    byteToUnit.set(position, units);
    unitToByte.set(units, position);
    const char = codePoint < 0 ? '�' : String.fromCodePoint(codePoint);
    pieces.push(char);
    units += char.length;
    position += length;
  }
  byteToUnit.set(end, units);
  unitToByte.set(units, end);
  return { text: pieces.join(''), byteToUnit, unitToByte };
}

/**
 * A JSON string literal with a fixed escaping: `"` and `\`, the short escapes
 * \b \f \n \r \t, every other control character as a lower-case \u00xx, and
 * everything else literal. The Rust port reproduces it byte for byte.
 */
export function quoteText(text) {
  let quoted = '"';
  for (const char of text) {
    const code = char.codePointAt(0);
    if (char === '"') quoted += '\\"';
    else if (char === '\\') quoted += '\\\\';
    else if (char === '\b') quoted += '\\b';
    else if (char === '\f') quoted += '\\f';
    else if (char === '\n') quoted += '\\n';
    else if (char === '\r') quoted += '\\r';
    else if (char === '\t') quoted += '\\t';
    else if (code < 0x20 || code === 0x7f) quoted += `\\u${code.toString(16).padStart(4, '0')}`;
    else quoted += char;
  }
  return `${quoted}"`;
}
