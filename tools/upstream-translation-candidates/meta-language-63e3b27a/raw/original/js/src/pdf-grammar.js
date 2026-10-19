import {
  anonymous,
  errorNode,
  extra,
  fillExtras,
  missing,
  node,
  propagateErrors,
  spanning,
  withField,
} from './builtin-grammar.js';

/**
 * The built-in PDF grammar CST, shared with `rust/src/pdf_grammar.rs`.
 *
 * The grammar follows the COS syntax of ISO 32000-2 section 7 (lexical
 * conventions, objects and file structure):
 *
 * - `pdf_file` holds the `header` (`%PDF-x.y`), `indirect_object`,
 *   `cross_reference_table`, `trailer`, `start_cross_reference` and
 *   `end_of_file` (`%%EOF`) items of the body and every incremental update.
 * - Objects are `dictionary` (with `dictionary_entry` key/value pairs),
 *   `array`, `indirect_reference`, and the `integer`, `real`, `boolean`,
 *   `null`, `name`, `literal_string` and `hex_string` tokens.
 * - A `stream` joins its `dictionary` to its `data`: a `content_stream` of
 *   `operation` and `inline_image` nodes when an unfiltered page, form or
 *   pattern stream parses cleanly as content, and a `stream_data` token
 *   otherwise. The stream extent comes from a direct `/Length` that lands on
 *   `endstream`, or else from the next `endstream` keyword.
 * - Comments are named `comment` extras and PDF whitespace (NUL, TAB, LF,
 *   FF, CR, SP) anonymous `whitespace` extras.
 * - Malformed input is kept in `ERROR` nodes, and absent delimiters,
 *   keywords, the header and the `%%EOF` marker as zero-width missing nodes.
 *
 * Offsets are string indices; every delimiter is ASCII, and a `/Length` is
 * counted in UTF-8 bytes, so the Rust port computes the same tree over UTF-8
 * byte offsets.
 */
export function parsePdfCst(text) {
  return new PdfGrammarParser(text).file();
}

// Keywords of the COS file structure, kept as anonymous tokens.
const COS_KEYWORDS = new Set([
  'obj', 'endobj', 'stream', 'endstream', 'R', 'xref', 'trailer', 'startxref', 'n', 'f',
]);

const VALUE_TOKENS = new Set([
  'integer', 'real', 'boolean', 'null', 'name', 'literal_string', 'hex_string',
]);

// Dictionary keys of the page content, form XObject and pattern streams whose
// data is parsed as a content stream.
const CONTENT_STREAM_KEYS = new Set([
  '/Length', '/Type', '/Subtype', '/FormType', '/BBox', '/Matrix', '/Resources', '/Group',
  '/Ref', '/Metadata', '/PieceInfo', '/LastModified', '/StructParent', '/StructParents',
  '/OPI', '/OC', '/Name', '/PatternType', '/PaintType', '/TilingType', '/XStep', '/YStep',
]);

const HEADER = /^%PDF-[0-9]+\.[0-9]+$/u;

class PdfGrammarParser {
  constructor(text) {
    this.text = text;
    this.position = 0;
    this.limit = text.length;
    this.content = false;
  }

  // pdf_file = header (item | end_of_file)*
  file() {
    const children = [];
    while (isWhite(this.char(this.position))) this.position += 1;
    const headerEnd = this.char(this.position) === '%' ? this.commentEnd(this.position) : -1;
    if (headerEnd >= 0 && HEADER.test(this.text.slice(this.position, headerEnd))) {
      children.push(node('header', this.position, headerEnd));
      this.position = headerEnd;
    } else {
      children.push(missing('header', true, 0));
    }
    for (;;) {
      this.skipTrivia();
      if (this.position >= this.limit) break;
      if (this.atEndOfFileMarker()) {
        children.push(node('end_of_file', this.position, this.position + 5));
        this.position += 5;
        continue;
      }
      const item = this.indirectObject()
        ?? this.crossReferenceTable()
        ?? this.trailer()
        ?? this.startCrossReference();
      children.push(item ?? this.errorUntil(() => this.atSync()));
    }
    const last = children.at(-1);
    if (last.term !== 'end_of_file') children.push(missing('end_of_file', true, last.end));
    const root = node('pdf_file', 0, this.text.length, children);
    propagateErrors(root);
    return fillExtras(root, (start, end) => this.lexGap(start, end));
  }

  // indirect_object = integer integer "obj" (object | stream)? "endobj"
  indirectObject() {
    const [number, generation, keyword] = this.peekTokens(3);
    if (!isUnsigned(number) || !isUnsigned(generation) || !isKeyword(keyword, 'obj')) return null;
    const children = [
      withField(leafFor(number), 'object_number'),
      withField(leafFor(generation), 'generation'),
      anonymous('obj', keyword.start, keyword.end),
    ];
    this.position = keyword.end;
    this.skipTrivia();
    let value = this.object();
    if (value) {
      this.skipTrivia();
      if (value.term === 'dictionary' && this.atKeyword('stream')) value = this.stream(value);
    }
    children.push(withField(value ?? missing('null', true, keyword.end), 'value'));
    for (;;) {
      this.skipTrivia();
      if (this.atKeyword('endobj')) {
        children.push(anonymous('endobj', this.position, this.position + 6));
        this.position += 6;
        break;
      }
      if (this.position >= this.limit || this.atSync()) {
        children.push(missing('endobj', false, children.at(-1).end));
        break;
      }
      pushError(children, this.errorUntil(() => this.atKeyword('endobj') || this.atSync()));
    }
    return spanning('indirect_object', children);
  }

  // stream = dictionary "stream" EOL data? EOL? "endstream"
  stream(dictionary) {
    const keywordEnd = this.position + 6;
    const children = [
      withField(dictionary, 'dictionary'),
      anonymous('stream', this.position, keywordEnd),
    ];
    let dataStart = keywordEnd;
    if (this.text.startsWith('\r\n', dataStart)) dataStart += 2;
    else if (this.char(dataStart) === '\n' || this.char(dataStart) === '\r') dataStart += 1;
    const [dataEnd, endstream] = this.streamExtent(dictionary, dataStart);
    if (dataEnd > dataStart) {
      children.push(withField(this.streamData(dictionary, dataStart, dataEnd), 'data'));
    }
    if (endstream >= 0) {
      children.push(anonymous('endstream', endstream, endstream + 9));
      this.position = endstream + 9;
    } else {
      children.push(missing('endstream', false, dataEnd));
      this.position = dataEnd;
    }
    return spanning('stream', children);
  }

  // The end of the stream data and the start of `endstream` (-1 when absent).
  streamExtent(dictionary, dataStart) {
    const length = directLength(dictionary, this.text);
    if (length !== null) {
      const end = advanceUtf8(this.text, dataStart, length);
      if (end >= 0) {
        let keyword = end;
        while (isWhite(this.char(keyword))) keyword += 1;
        if (this.atKeywordAt(keyword, 'endstream')) return [end, keyword];
      }
    }
    let keyword = this.text.indexOf('endstream', dataStart);
    while (keyword >= 0 && isRegular(this.char(keyword + 9))) {
      keyword = this.text.indexOf('endstream', keyword + 1);
    }
    if (keyword < 0) return [this.text.length, -1];
    let end = keyword;
    if (this.char(end - 1) === '\n') end -= 1;
    if (this.char(end - 1) === '\r') end -= 1;
    return [Math.max(end, dataStart), keyword];
  }

  streamData(dictionary, start, end) {
    return (isContentStreamDictionary(dictionary, this.text) && this.contentStream(start, end))
      || node('stream_data', start, end);
  }

  // content_stream = (operation | inline_image)*, or null unless the whole
  // range parses cleanly.
  contentStream(start, end) {
    const saved = { position: this.position, limit: this.limit, content: this.content };
    Object.assign(this, { position: start, limit: end, content: true });
    const children = [];
    let operands = [];
    let clean = true;
    for (;;) {
      this.skipTrivia();
      if (this.position >= this.limit) break;
      const token = this.lex(this.position);
      if (token.kind === 'keyword' && token.text === 'BI' && operands.length === 0) {
        const image = this.inlineImage(token);
        if (!image) {
          clean = false;
          break;
        }
        children.push(image);
      } else if (token.kind === 'keyword') {
        children.push(spanning('operation', [
          ...operands.map((operand) => withField(operand, 'operand')),
          withField(node('operator', token.start, token.end), 'operator'),
        ]));
        operands = [];
        this.position = token.end;
      } else {
        const operand = this.object();
        if (!operand || propagateErrors(operand)) {
          clean = false;
          break;
        }
        operands.push(operand);
      }
    }
    Object.assign(this, saved);
    return clean && operands.length === 0 ? node('content_stream', start, end, children) : null;
  }

  // inline_image = "BI" dictionary_entry* "ID" WHITE image_data? WHITE "EI"
  inlineImage(begin) {
    const children = [anonymous('BI', begin.start, begin.end)];
    this.position = begin.end;
    for (;;) {
      this.skipTrivia();
      if (this.position >= this.limit) return null;
      const token = this.lex(this.position);
      if (isKeyword(token, 'ID')) {
        children.push(anonymous('ID', token.start, token.end));
        this.position = token.end;
        break;
      }
      if (token.kind !== 'name') return null;
      this.position = token.end;
      this.skipTrivia();
      const value = this.object();
      if (!value || propagateErrors(value)) return null;
      children.push(spanning('dictionary_entry', [
        withField(leafFor(token), 'key'),
        withField(value, 'value'),
      ]));
    }
    if (!isWhite(this.char(this.position))) return null;
    const dataStart = this.position + 1;
    let end = this.text.indexOf('EI', dataStart);
    while (end >= 0 && end + 2 <= this.limit
      && !(isWhite(this.char(end - 1)) && (end + 2 === this.limit || isWhite(this.char(end + 2))))) {
      end = this.text.indexOf('EI', end + 1);
    }
    if (end < 0 || end + 2 > this.limit) return null;
    if (end - 1 > dataStart) children.push(withField(node('image_data', dataStart, end - 1), 'data'));
    children.push(anonymous('EI', end, end + 2));
    this.position = end + 2;
    return spanning('inline_image', children);
  }

  // cross_reference_table = "xref" cross_reference_subsection*
  crossReferenceTable() {
    if (!this.atKeyword('xref')) return null;
    const children = [anonymous('xref', this.position, this.position + 4)];
    this.position += 4;
    for (;;) {
      const [first, count, next] = this.peekTokens(3);
      if (!isUnsigned(first) || !isUnsigned(count)
        || ['obj', 'R', 'n', 'f'].some((keyword) => isKeyword(next, keyword))) {
        break;
      }
      const subsection = [
        withField(leafFor(first), 'first_object'),
        withField(leafFor(count), 'count'),
      ];
      this.position = count.end;
      for (;;) {
        const [offset, generation, type] = this.peekTokens(3);
        if (!isUnsigned(offset) || !isUnsigned(generation)
          || !(isKeyword(type, 'n') || isKeyword(type, 'f'))) {
          break;
        }
        subsection.push(spanning('cross_reference_entry', [
          withField(leafFor(offset), 'offset'),
          withField(leafFor(generation), 'generation'),
          withField(anonymous(type.text, type.start, type.end), 'type'),
        ]));
        this.position = type.end;
      }
      children.push(spanning('cross_reference_subsection', subsection));
    }
    return spanning('cross_reference_table', children);
  }

  // trailer = "trailer" dictionary
  trailer() {
    if (!this.atKeyword('trailer')) return null;
    const children = [anonymous('trailer', this.position, this.position + 7)];
    this.position += 7;
    this.skipTrivia();
    const dictionary = this.text.startsWith('<<', this.position) && !this.atEndOfFileMarker()
      ? this.dictionary()
      : missing('dictionary', true, children[0].end);
    children.push(withField(dictionary, 'dictionary'));
    return spanning('trailer', children);
  }

  // start_cross_reference = "startxref" integer
  startCrossReference() {
    if (!this.atKeyword('startxref')) return null;
    const children = [anonymous('startxref', this.position, this.position + 9)];
    this.position += 9;
    const [offset] = this.peekTokens(1);
    if (isUnsigned(offset)) {
      children.push(withField(leafFor(offset), 'offset'));
      this.position = offset.end;
    } else {
      children.push(withField(missing('integer', true, children[0].end), 'offset'));
    }
    return spanning('start_cross_reference', children);
  }

  // object = dictionary | array | indirect_reference | value token, or null
  // (consuming nothing) where no object starts.
  object() {
    if (this.position >= this.limit || this.atEndOfFileMarker()) return null;
    const token = this.lex(this.position);
    if (token.kind === '<<') return this.dictionary();
    if (token.kind === '[') return this.array();
    if (isUnsigned(token) && !this.content) {
      const [, generation, keyword] = this.peekTokens(3);
      if (isUnsigned(generation) && isKeyword(keyword, 'R')) {
        this.position = keyword.end;
        return spanning('indirect_reference', [
          withField(leafFor(token), 'object_number'),
          withField(leafFor(generation), 'generation'),
          anonymous('R', keyword.start, keyword.end),
        ]);
      }
    }
    if (!VALUE_TOKENS.has(token.kind)) return null;
    this.position = token.end;
    return leafFor(token);
  }

  // dictionary = "<<" dictionary_entry* ">>"
  dictionary() {
    const children = [anonymous('<<', this.position, this.position + 2)];
    this.position += 2;
    for (;;) {
      this.skipTrivia();
      if (this.atDelimiter('>>')) {
        children.push(anonymous('>>', this.position, this.position + 2));
        this.position += 2;
        break;
      }
      if (this.atTerminator() || this.char(this.position) === ']') {
        children.push(missing('>>', false, children.at(-1).end));
        break;
      }
      const token = this.lex(this.position);
      if (token.kind !== 'name') {
        pushError(children, this.errorItem());
        continue;
      }
      this.position = token.end;
      this.skipTrivia();
      const key = withField(leafFor(token), 'key');
      const atEnd = () => this.atDelimiter('>>') || this.char(this.position) === ']' || this.atTerminator();
      const value = atEnd() ? null : this.object();
      if (value) {
        children.push(spanning('dictionary_entry', [key, withField(value, 'value')]));
      } else {
        delete key.field;
        pushError(children, key);
        if (!atEnd()) pushError(children, this.errorItem());
      }
    }
    return spanning('dictionary', children);
  }

  // array = "[" object* "]"
  array() {
    const children = [anonymous('[', this.position, this.position + 1)];
    this.position += 1;
    for (;;) {
      this.skipTrivia();
      if (this.char(this.position) === ']') {
        children.push(anonymous(']', this.position, this.position + 1));
        this.position += 1;
        break;
      }
      if (this.atTerminator() || this.atDelimiter('>>')) {
        children.push(missing(']', false, children.at(-1).end));
        break;
      }
      pushError(children, this.object() ?? this.errorToken(), true);
    }
    return spanning('array', children);
  }

  // An object, or a single token where no object starts.
  errorItem() {
    return this.object() ?? this.errorToken();
  }

  errorToken() {
    const token = this.lex(this.position);
    this.position = token.end;
    return leafFor(token);
  }

  // Tokens up to where `stop()` holds, the next `%%EOF` or the end, as one
  // ERROR node (at least one token).
  errorUntil(stop) {
    const tokens = [];
    do {
      tokens.push(this.errorToken());
      this.skipTrivia();
    } while (this.position < this.limit && !this.atEndOfFileMarker() && !stop());
    return errorNode(tokens[0].start, tokens.at(-1).end, tokens);
  }

  // Where a file-level item starts: `N G obj`, `xref`, `trailer`,
  // `startxref`, `%%EOF` or the end of the text.
  atSync() {
    if (this.content) return false;
    if (this.position >= this.limit || this.atEndOfFileMarker()) return true;
    if (['xref', 'trailer', 'startxref'].some((keyword) => this.atKeyword(keyword))) return true;
    const [number, generation, keyword] = this.peekTokens(3);
    return isUnsigned(number) && isUnsigned(generation) && isKeyword(keyword, 'obj');
  }

  // Where an unclosed dictionary or array ends.
  atTerminator() {
    if (this.position >= this.limit) return true;
    if (this.content) return false;
    return ['endobj', 'stream', 'endstream'].some((keyword) => this.atKeyword(keyword))
      || this.atSync();
  }

  // Up to `count` tokens ahead, skipping trivia, without consuming them.
  peekTokens(count) {
    const saved = this.position;
    const tokens = [];
    while (tokens.length < count) {
      this.skipTrivia();
      if (this.position >= this.limit || this.atEndOfFileMarker()) break;
      const token = this.lex(this.position);
      tokens.push(token);
      this.position = token.end;
    }
    this.position = saved;
    return tokens;
  }

  // Skips whitespace and comments; outside content streams it stops at a
  // `%%EOF` marker, which is a file-level item.
  skipTrivia() {
    for (;;) {
      while (isWhite(this.char(this.position))) this.position += 1;
      if (this.char(this.position) !== '%' || this.atEndOfFileMarker()) return;
      this.position = this.commentEnd(this.position);
    }
  }

  atEndOfFileMarker() {
    return !this.content
      && this.text.startsWith('%%EOF', this.position)
      && this.commentEnd(this.position) === this.position + 5;
  }

  atKeyword(keyword) {
    return this.atKeywordAt(this.position, keyword);
  }

  atKeywordAt(position, keyword) {
    return position + keyword.length <= this.limit
      && this.text.startsWith(keyword, position)
      && !isRegular(this.char(position + keyword.length));
  }

  atDelimiter(delimiter) {
    return this.position + delimiter.length <= this.limit
      && this.text.startsWith(delimiter, this.position);
  }

  // The character at `position`, or undefined outside the current limit.
  char(position) {
    return position >= 0 && position < this.limit ? this.text[position] : undefined;
  }

  // A comment runs to the end of its line, without trailing whitespace.
  commentEnd(start, bound = this.limit) {
    let end = start + 1;
    while (end < bound && this.text[end] !== '\n' && this.text[end] !== '\r') end += 1;
    while (end > start + 1 && isWhite(this.text[end - 1])) end -= 1;
    return end;
  }

  // The token at `start`, which is neither whitespace nor a comment.
  lex(start) {
    const character = this.char(start);
    const token = (kind, end) => ({ kind, start, end, text: this.text.slice(start, end) });
    if (character === '(') {
      let depth = 0;
      for (let position = start; position < this.limit; position += 1) {
        const current = this.text[position];
        if (current === '\\') position += 1;
        else if (current === '(') depth += 1;
        else if (current === ')' && --depth === 0) return token('literal_string', position + 1);
      }
      return token('(', start + 1);
    }
    if (character === '<') {
      if (this.char(start + 1) === '<') return token('<<', start + 2);
      let end = start + 1;
      while (isHexDigit(this.char(end)) || isWhite(this.char(end))) end += 1;
      return this.char(end) === '>' ? token('hex_string', end + 1) : token('<', start + 1);
    }
    if (character === '>') {
      return this.char(start + 1) === '>' ? token('>>', start + 2) : token('>', start + 1);
    }
    if ('()[]{}'.includes(character)) return token(character, start + 1);
    let end = start + 1;
    while (isRegular(this.char(end))) end += 1;
    if (character === '/') return token('name', end);
    const text = this.text.slice(start, end);
    if (/^[+-]?[0-9]+$/u.test(text)) return token('integer', end);
    if (/^[+-]?([0-9]+\.[0-9]*|\.[0-9]+)$/u.test(text)) return token('real', end);
    if (text === 'true' || text === 'false') return token('boolean', end);
    if (text === 'null') return token('null', end);
    return token('keyword', end);
  }

  // The whitespace and comment extras covering a gap between CST nodes.
  lexGap(start, end) {
    const extras = [];
    let position = start;
    while (position < end) {
      if (this.text[position] === '%') {
        const commentEnd = this.commentEnd(position, end);
        extras.push(extra('comment', true, position, commentEnd));
        position = commentEnd;
      } else if (isWhite(this.text[position])) {
        const whitespaceStart = position;
        while (position < end && isWhite(this.text[position])) position += 1;
        extras.push(extra('whitespace', false, whitespaceStart, position));
      } else {
        throw new Error(`PDF grammar left ${JSON.stringify(this.text.slice(position, end))} outside its CST`);
      }
    }
    return extras;
  }
}

// Appends `error` to `children`, extending a preceding ERROR node; with
// `keepObjects`, well-formed objects are appended as they are.
function pushError(children, error, keepObjects = false) {
  if (keepObjects && !error.isError && error.named && error.term !== 'keyword') {
    children.push(error);
    return;
  }
  const last = children.at(-1);
  const nodes = error.isError ? error.children : [error];
  if (last?.isError) {
    last.children.push(...nodes);
    last.end = error.end;
  } else {
    children.push(errorNode(error.start, error.end, nodes));
  }
}

function leafFor(token) {
  if (VALUE_TOKENS.has(token.kind)) return node(token.kind, token.start, token.end);
  if (token.kind === 'keyword') {
    return COS_KEYWORDS.has(token.text)
      ? anonymous(token.text, token.start, token.end)
      : node('keyword', token.start, token.end);
  }
  return anonymous(token.kind, token.start, token.end);
}

// Object, generation, cross-reference and offset numbers are unsigned digits.
function isUnsigned(token) {
  return token?.kind === 'integer' && /^[0-9]+$/u.test(token.text);
}

function isKeyword(token, keyword) {
  return token?.kind === 'keyword' && token.text === keyword;
}

function dictionaryEntries(dictionary) {
  return dictionary.children.filter((child) => child.term === 'dictionary_entry');
}

function entryKey(entry, text) {
  return text.slice(entry.children[0].start, entry.children[0].end);
}

// The value of a direct, non-negative integer `/Length`, or null.
function directLength(dictionary, text) {
  const entry = dictionaryEntries(dictionary).find((candidate) => entryKey(candidate, text) === '/Length');
  const value = entry?.children[1];
  if (value?.term !== 'integer') return null;
  const length = Number(text.slice(value.start, value.end));
  return Number.isSafeInteger(length) && length >= 0 ? length : null;
}

function isContentStreamDictionary(dictionary, text) {
  if (dictionary.children.some((child) => child.isError || child.isMissing)) return false;
  return dictionaryEntries(dictionary).every((entry) => {
    const key = entryKey(entry, text);
    const value = entry.children[1];
    const name = value.term === 'name' ? text.slice(value.start, value.end) : null;
    if (!CONTENT_STREAM_KEYS.has(key)) return false;
    if (key === '/Type') return name === '/XObject' || name === '/Pattern';
    if (key === '/Subtype') return name === '/Form';
    return true;
  });
}

// The string index `bytes` UTF-8 bytes after `start`, or -1 when that falls
// inside a character or past the end.
function advanceUtf8(text, start, bytes) {
  let position = start;
  let counted = 0;
  while (counted < bytes && position < text.length) {
    const codePoint = text.codePointAt(position);
    counted += codePoint < 0x80 ? 1 : codePoint < 0x800 ? 2 : codePoint < 0x10000 ? 3 : 4;
    position += codePoint > 0xffff ? 2 : 1;
  }
  return counted === bytes ? position : -1;
}

function isWhite(character) {
  return character === ' ' || character === '\n' || character === '\r' || character === '\t'
    || character === '\f' || character === '\0';
}

function isDelimiter(character) {
  return '()<>[]{}/%'.includes(character);
}

function isRegular(character) {
  return character !== undefined && !isWhite(character) && !isDelimiter(character);
}

function isHexDigit(character) {
  return character !== undefined && /^[0-9A-Fa-f]$/u.test(character);
}
