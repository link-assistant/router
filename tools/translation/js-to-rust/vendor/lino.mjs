// The Links Notation subset self-translation reads and writes: one link per
// line, `(head item item ...)`, where an item is a bare word, a
// double-quoted text or a nested link, and `#` starts a comment line.
//
// Values are percent-encoded the way link-foundation/meta-language's
// decorators encode theirs (docs/decorators.md): every byte outside
// `[A-Za-z0-9._~*/<>=!&|+-]` is written `%XX`, so any text survives as a bare
// word, and the empty text is written `%`. Portable-subset style: plain
// functions and tagged arrays, no classes.

const BARE = /^[A-Za-z0-9._~*/<>=!&|+-]$/u;

/**
 * Percent-encode `text` as one bare Links Notation word.
 * @param {string} text
 * @returns {string}
 */
export function encodeWord(text) {
  if (text === '') return '%';
  let out = '';
  for (const byte of Buffer.from(text, 'utf8')) {
    const char = String.fromCharCode(byte);
    out += byte < 0x80 && BARE.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}

/**
 * Decode a word `encodeWord` wrote.
 * @param {string} word
 * @returns {string}
 */
export function decodeWord(word) {
  if (word === '%') return '';
  const bytes = [];
  for (let index = 0; index < word.length; index += 1) {
    if (word[index] === '%') {
      bytes.push(Number.parseInt(word.slice(index + 1, index + 3), 16));
      index += 2;
    } else {
      bytes.push(word.charCodeAt(index));
    }
  }
  return Buffer.from(bytes).toString('utf8');
}

/**
 * Parse every link of `text`. A link is an array whose items are strings
 * (bare words, still encoded) or nested arrays; a quoted text is an object
 * `{ quoted: string }`.
 * @param {string} text
 * @returns {Array<Array<unknown>>}
 */
export function parseLinks(text) {
  const links = [];
  let index = 0;
  const skip = () => {
    while (index < text.length) {
      if (/\s/u.test(text[index])) {
        index += 1;
      } else if (text[index] === '#') {
        while (index < text.length && text[index] !== '\n') index += 1;
      } else {
        return;
      }
    }
  };
  const read = () => {
    skip();
    const char = text[index];
    if (char === '(') {
      index += 1;
      const items = [];
      for (;;) {
        skip();
        if (index >= text.length) throw new Error('unclosed link');
        if (text[index] === ')') {
          index += 1;
          return items;
        }
        items.push(read());
      }
    }
    if (char === '"') {
      const end = text.indexOf('"', index + 1);
      if (end < 0) throw new Error('unclosed quoted text');
      const quoted = text.slice(index + 1, end);
      index = end + 1;
      return { quoted };
    }
    const start = index;
    while (index < text.length && !/[\s()"]/u.test(text[index])) index += 1;
    if (start === index) throw new Error(`unexpected ${JSON.stringify(char)} at ${index}`);
    return text.slice(start, index);
  };
  for (;;) {
    skip();
    if (index >= text.length) return links;
    const link = read();
    if (!Array.isArray(link)) throw new Error('a top-level item must be a link');
    links.push(link);
  }
}

/**
 * The value of an item: a quoted text as written, a word decoded.
 * @param {unknown} item
 * @returns {string}
 */
export function textOf(item) {
  if (typeof item === 'string') return decodeWord(item);
  if (item && typeof item === 'object' && 'quoted' in item) return item.quoted;
  throw new Error('expected a word or a quoted text');
}

/**
 * The first nested link of `link` whose head is `head`.
 * @param {Array<unknown>} link
 * @param {string} head
 * @returns {Array<unknown> | undefined}
 */
export function field(link, head) {
  return link.find((item) => Array.isArray(item) && item[0] === head);
}

/**
 * Write a link on one line; strings are written as given (already encoded).
 * @param {Array<unknown>} link
 * @returns {string}
 */
export function writeLink(link) {
  return `(${link.map((item) => (Array.isArray(item) ? writeLink(item) : typeof item === 'string' ? item : `"${item.quoted}"`)).join(' ')})`;
}

// Explicit writer-storage siblings. Call the predicate only after independently
// qualifying every native operation it uses; it grants no source authority.
// No receiver or configurable callback is accepted, and BARE never escapes.
export function originalWordPatternCanonical() {
  const descriptor=Object.getOwnPropertyDescriptor,prototype=Object.getPrototypeOf,apply=Reflect.apply;
  const regexpPrototype=prototype(/^[A-Za-z0-9._~*/<>=!&|+-]$/u),names=Reflect.ownKeys(BARE),last=descriptor(BARE,'lastIndex');
  if(prototype(BARE)!==regexpPrototype||names.length!==1||names[0]!=='lastIndex'||!last||!Object.hasOwn(last,'value')||last.value!==0)return false;
  const source=descriptor(regexpPrototype,'source').get;
  if(apply(source,BARE,[])!==apply(source,/^[A-Za-z0-9._~*/<>=!&|+-]$/u,[]))return false;
  const flags=['hasIndices','global','ignoreCase','multiline','dotAll','unicode','unicodeSets','sticky'];
  for(let index=0;index<flags.length;index++)if(apply(descriptor(regexpPrototype,flags[index]).get,BARE,[])!==(flags[index]==='unicode'))return false;
  return true;
}

// Exact legacy byte loop, separated only so a writer that already called
// Buffer.from can preserve that call once and the original regex identity.
export function encodeWordBytes(bytes) {
  let out = '';
  for (const byte of bytes) {
    const char = String.fromCharCode(byte);
    out += byte < 0x80 && BARE.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return out;
}
