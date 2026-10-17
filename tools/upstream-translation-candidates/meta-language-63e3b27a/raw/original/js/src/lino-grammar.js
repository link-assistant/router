import { anonymous, errorNode, extra, fillExtras, node, propagateErrors, spanning, withField } from './builtin-grammar.js';

/**
 * How deep LiNo links may nest: every parenthesized group and every
 * indentation level is one level. The official parsers of every runtime
 * refuse deeper links with the same limit (`DEFAULT_MAX_DEPTH`).
 */
export const LINO_MAX_DEPTH = 64;

/**
 * The built-in LiNo grammar CST, shared with `rust/src/lino_grammar.rs`.
 *
 * The recursive descent below mirrors, rule for rule and with the same
 * ordered choices, backtracking, indentation side effects and depth limit, the
 * official links-notation 0.22 PEG grammar (`links-notation/src/grammar.pegjs`)
 * as the official `Parser` reads a document: comments are blanked first
 * (`links-notation/src/comments.js`) and quoted references follow
 * `links-notation/src/quotes.js`. Every document the official parser accepts
 * yields a clean CST whose `link` nodes carry the official `id`, `values` and
 * `children` as `id`, `value` and `child` fields, and whose `group` nodes
 * carry the links of a parenthesized group as `link` fields.
 *
 * - `lino_document` is the root; a link is a named `link` node and a
 *   parenthesized group, which opens a nested context read like the root, is
 *   a named `group` node.
 * - References are named `reference` or `quoted_reference` leaves; `(`, `)`
 *   and `:` are anonymous leaves.
 * - LiNo whitespace (space, tab, CR, LF) is an anonymous `whitespace` extra
 *   and a comment a named `comment` extra, each owned by the smallest node
 *   that spans it, as tree-sitter places extras.
 * - Where the official grammar rejects the source, or links nest deeper than
 *   `LINO_MAX_DEPTH`, an `ERROR` node spans the rest of that line (with its
 *   `(`, `)`, `:` and `reference` tokens) and parsing restarts on the next
 *   line as a new document.
 *
 * Offsets are string indices; every delimiter is ASCII, so the Rust port
 * computes the same tree over UTF-8 byte offsets.
 */
export function parseLinoCst(text) {
  const comments = commentRanges(text);
  const blanked = blankRanges(text, comments);
  const references = new DelimitedReferences(blanked);
  const children = [];
  let position = 0;
  while (position < blanked.length) {
    const parser = new LinoGrammarParser(blanked, position, references);
    const document = parser.document();
    children.push(...document.links);
    if (document.complete) break;
    const errorEnd = lineEnd(blanked, document.errorStart);
    children.push(lineErrorNode(blanked, document.errorStart, errorEnd));
    position = errorEnd;
  }
  const root = node('lino_document', 0, text.length, children);
  propagateErrors(root);
  const commentEnds = new Map(comments);
  return fillExtras(root, (start, end) => {
    const extras = [];
    let position = start;
    while (position < end) {
      const commentEnd = commentEnds.get(position);
      if (commentEnd !== undefined) {
        extras.push(extra('comment', true, position, commentEnd));
        position = commentEnd;
        continue;
      }
      const whitespaceStart = position;
      while (position < end && !commentEnds.has(position)) {
        if (!isLinoWhitespace(text[position])) {
          throw new Error(`LiNo grammar left ${JSON.stringify(text.slice(start, end))} outside its CST`);
        }
        position += 1;
      }
      extras.push(extra('whitespace', false, whitespaceStart, position));
    }
    return extras;
  });
}

/** Thrown where links nest deeper than `LINO_MAX_DEPTH`. */
class NestingTooDeep extends Error {}

class LinoGrammarParser {
  constructor(text, position, references) {
    this.text = text;
    this.position = position;
    this.references = references;
    this.indentationStack = [0];
    this.baseIndentation = null;
    // The indentation contexts of the groups around the line being read.
    this.contextStack = [];
    this.contextDepth = 0;
    // Lines already found unreadable, keyed by where they start and whether
    // they are inside a group, since reading a line depends on nothing else.
    this.unreadableLines = new Set();
    this.rootLinks = [];
    this.rootLineStart = position;
  }

  // document = skipEmptyLines links _ eof / _ eof
  // Where neither alternative reaches the end, the links parsed so far are
  // kept and the error starts after the whitespace that follows them; where
  // links nest too deeply, it starts at the root line holding them.
  document() {
    this.skipEmptyLines();
    try {
      this.links(this.rootLinks);
    } catch (error) {
      if (!(error instanceof NestingTooDeep)) throw error;
      return { complete: false, links: this.rootLinks, errorStart: this.rootLineStart };
    }
    this.whitespace();
    return this.atEnd()
      ? { complete: true, links: this.rootLinks }
      : { complete: false, links: this.rootLinks, errorStart: this.position };
  }

  // skipEmptyLines = ([ \t]* [\r\n])*
  skipEmptyLines() {
    for (;;) {
      const start = this.position;
      this.inlineWhitespace();
      if (!this.newlineCharacter()) {
        this.position = start;
        return;
      }
    }
  }

  // links = firstLine line*   (pops the indentation pushed for it)
  links(links = []) {
    const atRoot = links === this.rootLinks;
    const first = this.firstLine(atRoot);
    if (!first) return null;
    links.push(first);
    for (let line = this.line(atRoot); line; line = this.line(atRoot)) links.push(line);
    if (this.indentationStack.length > 1) this.indentationStack.pop();
    return links;
  }

  // firstLine = SET_BASE_INDENTATION element
  firstLine(atRoot) {
    const start = this.position;
    const spaces = this.spaces();
    if (this.baseIndentation === null) this.baseIndentation = spaces;
    if (atRoot) this.rootLineStart = this.position;
    const element = this.element();
    if (!element) this.position = start;
    return element;
  }

  // line = CHECK_INDENTATION element
  line(atRoot) {
    const start = this.position;
    const spaces = this.spaces();
    if (this.normalizeIndentation(spaces) < this.currentIndentation()) {
      this.position = start;
      return null;
    }
    if (atRoot) this.rootLineStart = this.position;
    const element = this.element();
    if (!element) this.position = start;
    return element;
  }

  // element = anyLink CHECK_DEPTH (PUSH_INDENTATION links)?
  // A line is read once whether or not indented children follow it, and a
  // line that cannot be read is remembered as unreadable.
  element() {
    const start = this.position;
    const key = this.contextStack.length > 0 ? -1 - start : start;
    const link = this.unreadableLines.has(key) ? null : this.anyLink();
    if (!link) {
      this.unreadableLines.add(key);
      this.position = start;
      return null;
    }
    this.checkDepth(this.depth(), start);
    const saved = this.indentationStack.slice();
    const afterLink = this.position;
    const spaces = this.spaces();
    if (this.normalizeIndentation(spaces) > this.currentIndentation()) {
      this.indentationStack.push(this.normalizeIndentation(spaces));
      const children = this.links();
      if (children) {
        link.children.push(...children.map((child) => withField(child, 'child')));
        link.end = children.at(-1).end;
        return link;
      }
    }
    this.indentationStack = saved;
    this.position = afterLink;
    return link;
  }

  // anyLink = &"(" groupLink / !"(" (indentedIdLink / singleLineAnyLink)
  anyLink() {
    if (this.text[this.position] === '(') return this.groupLink();
    return this.indentedIdLink() ?? this.singleLineAnyLink();
  }

  // groupLink = nestedGroup (eol / singleLineValueAndWhitespace* eol)
  // A group that ends its line is the whole link; values after it make it the
  // first value of a value link.
  groupLink() {
    const start = this.position;
    const group = this.nestedGroup();
    if (!group) return null;
    if (this.eol()) return group;
    const values = [withField(group, 'value'), ...this.valuesWhileAny()];
    if (this.eol()) return spanning('link', values);
    return this.fail(start);
  }

  // nestedGroup = "(" CHECK_DEPTH ENTER_NESTED_CONTEXT nestedGroupBody
  nestedGroup() {
    const start = this.position;
    const open = this.literal('(');
    if (!open) return null;
    this.checkDepth(this.depth() + 1, start);
    this.enterNestedContext();
    const body = this.nestedGroupBody();
    this.exitNestedContext();
    if (!body) return this.fail(start);
    return node('group', start, this.position, [open, ...body]);
  }

  // nestedGroupBody = skipEmptyLines links _ ")" / _ ")"
  nestedGroupBody() {
    const start = this.position;
    this.skipEmptyLines();
    const links = this.links();
    if (links) {
      this.whitespace();
      const close = this.literal(')');
      if (close) return [...links.map((link) => withField(link, 'link')), close];
    }
    this.position = start;
    this.whitespace();
    const close = this.literal(')');
    return close ? [close] : null;
  }

  // singleLineAnyLink = singleLineLink eol / singleLineValueLink eol
  singleLineAnyLink() {
    const start = this.position;
    const named = this.singleLineLink();
    if (named && this.eol()) return named;
    this.position = start;
    const values = this.singleLineValues();
    if (values && this.eol()) return spanning('link', values);
    return this.fail(start);
  }

  // singleLineLink = __ reference __ ":" singleLineValues
  singleLineLink() {
    const start = this.position;
    this.inlineWhitespace();
    const id = this.reference();
    if (!id) return this.fail(start);
    this.inlineWhitespace();
    const colon = this.literal(':');
    if (!colon) return this.fail(start);
    const values = this.singleLineValues();
    if (!values) return this.fail(start);
    return spanning('link', [withField(id, 'id'), colon, ...values]);
  }

  // singleLineValues = (__ referenceOrLink)+
  singleLineValues() {
    const values = this.valuesWhileAny();
    return values.length > 0 ? values : null;
  }

  // (__ referenceOrLink)*
  valuesWhileAny() {
    const values = [];
    for (;;) {
      const start = this.position;
      this.inlineWhitespace();
      const value = this.referenceOrLink();
      if (!value) {
        this.position = start;
        return values;
      }
      values.push(withField(value, 'value'));
    }
  }

  // referenceOrLink = nestedGroup / reference
  referenceOrLink() {
    return this.nestedGroup() ?? this.reference();
  }

  // indentedIdLink = reference __ ":" eol
  indentedIdLink() {
    const start = this.position;
    const id = this.reference();
    if (!id) return null;
    this.inlineWhitespace();
    const colon = this.literal(':');
    if (!colon || !this.eol()) return this.fail(start);
    return spanning('link', [withField(id, 'id'), colon]);
  }

  // reference = quotedReference / simpleReference
  reference() {
    return this.quotedReference() ?? this.simpleReference();
  }

  // A reference between delimiters, read as `links-notation/src/quotes.js`
  // reads it.
  quotedReference() {
    const start = this.position;
    if (!QUOTES.includes(this.text[start])) return null;
    const reading = this.references.readAt(start);
    if (reading === null) return null;
    this.position = start + reading.length;
    return node('quoted_reference', start, this.position);
  }

  // simpleReference = [^ \t\n\r(:)]+
  simpleReference() {
    const start = this.position;
    while (this.position < this.text.length && isReferenceCharacter(this.text[this.position])) {
      this.position += 1;
    }
    return this.position > start ? node('reference', start, this.position) : null;
  }

  // eol = __ (lineBreaks / eof / nestedGroupEnd)
  // lineBreaks = [\r\n]+ ([ \t]+ [\r\n]+)*
  // nestedGroupEnd = inside a group, before ")"
  eol() {
    const start = this.position;
    this.inlineWhitespace();
    if (this.atEnd()) return true;
    if (this.newlineCharacter()) {
      while (this.newlineCharacter());
      for (;;) {
        const blankLine = this.position;
        const indented = this.inlineWhitespace();
        if (indented === 0 || !this.newlineCharacter()) {
          this.position = blankLine;
          return true;
        }
        while (this.newlineCharacter());
      }
    }
    if (this.contextStack.length > 0 && this.text[this.position] === ')') return true;
    this.position = start;
    return false;
  }

  literal(character) {
    if (this.text[this.position] !== character) return null;
    this.position += 1;
    return anonymous(character, this.position - 1, this.position);
  }

  newlineCharacter() {
    const character = this.text[this.position];
    if (character !== '\n' && character !== '\r') return false;
    this.position += 1;
    return true;
  }

  // " "*
  spaces() {
    const start = this.position;
    while (this.text[this.position] === ' ') this.position += 1;
    return this.position - start;
  }

  // __ = [ \t]*
  inlineWhitespace() {
    const start = this.position;
    while (this.text[this.position] === ' ' || this.text[this.position] === '\t') this.position += 1;
    return this.position - start;
  }

  // _ = [ \t\n\r]*
  whitespace() {
    while (isLinoWhitespace(this.text[this.position])) this.position += 1;
  }

  atEnd() {
    return this.position >= this.text.length;
  }

  fail(start) {
    this.position = start;
    return null;
  }

  normalizeIndentation(spaces) {
    return this.baseIndentation === null ? spaces : Math.max(0, spaces - this.baseIndentation);
  }

  currentIndentation() {
    return this.indentationStack.at(-1);
  }

  // Every enclosing group and every indentation level is one level of depth.
  depth() {
    return this.contextDepth + this.indentationStack.length - 1;
  }

  checkDepth(levels, where) {
    if (levels > LINO_MAX_DEPTH) {
      throw new NestingTooDeep(`nesting depth exceeds the maximum of ${LINO_MAX_DEPTH} at ${where}`);
    }
  }

  // A group opens a context that starts fresh at indentation level zero.
  enterNestedContext() {
    this.contextStack.push({
      indentationStack: this.indentationStack,
      baseIndentation: this.baseIndentation,
      contextDepth: this.contextDepth,
    });
    this.contextDepth = this.depth() + 1;
    this.indentationStack = [0];
    this.baseIndentation = null;
  }

  exitNestedContext() {
    ({
      indentationStack: this.indentationStack,
      baseIndentation: this.baseIndentation,
      contextDepth: this.contextDepth,
    } = this.contextStack.pop());
  }
}

// ---- Comments, as `links-notation/src/comments.js` finds them ---------------

const COMMENT = '#';
const QUOTES = ['"', "'", '`'];
const BEFORE_REFERENCE = [' ', '\t', '\n', '\r', '(', ':'];
const BEFORE_COMMENT = [' ', '\t', '\n', '\r'];

/**
 * The [start, end] ranges of the comments of `text`: a `#` that opens a token
 * starts a comment that runs to the end of its line, and a `#` inside a token
 * or a quoted reference is an ordinary character.
 */
export function commentRanges(text) {
  const ranges = [];
  const references = new DelimitedReferences(text);
  let position = 0;
  while (position < text.length) {
    const character = text[position];
    if (QUOTES.includes(character) && follows(text, position, BEFORE_REFERENCE)) {
      const reading = references.readAt(position);
      position = reading === null ? position + 1 : position + reading.length;
    } else if (character === COMMENT && follows(text, position, BEFORE_COMMENT)) {
      const start = position;
      while (position < text.length && text[position] !== '\n' && text[position] !== '\r') position += 1;
      ranges.push([start, position]);
    } else {
      position += 1;
    }
  }
  return ranges;
}

function follows(text, position, allowed) {
  return position === 0 || allowed.includes(text[position - 1]);
}

/** `text` with every character of the given ranges replaced by a space. */
export function blankRanges(text, ranges) {
  let blanked = '';
  let position = 0;
  for (const [start, end] of ranges) {
    blanked += text.slice(position, start) + ' '.repeat(end - start);
    position = end;
  }
  return blanked + text.slice(position);
}

// ---- Quoted references, as `links-notation/src/quotes.js` reads them --------

/**
 * Every quoted reference of one document, read on demand. A reference opened
 * by a run of N delimiters closes at the next run whose length R has an odd
 * `Math.floor(R / N)`; inside it a run of 2N is an escaped N. An even opening
 * run that encloses nothing substantive is the empty reference.
 */
export class DelimitedReferences {
  constructor(text) {
    this.text = text;
    this.runsByQuote = new Map();
    this.readings = new Map();
  }

  /** `{ value, length }` of the reference opened at `start`, or null. */
  readAt(start) {
    if (!this.readings.has(start)) this.readings.set(start, this.read(start));
    return this.readings.get(start);
  }

  read(start) {
    const quote = this.text[start];
    if (!QUOTES.includes(quote)) return null;
    if (!this.runsByQuote.has(quote)) this.runsByQuote.set(quote, new DelimiterRuns(this.text, quote));
    const runs = this.runsByQuote.get(quote);
    const opening = runs.indexOf(start);
    const count = runs.end(opening) - start;
    let closing = opening + 1;
    while (closing < runs.count) {
      const length = runs.lengths[closing];
      if (length < count) {
        closing = runs.nextLonger[closing];
      } else if (Math.floor(length / count) % 2 === 1) {
        break;
      } else {
        closing += 1;
      }
    }
    const end = closing < runs.count ? runs.end(closing) : null;
    return readQuoted(this.text, start, quote, count, end);
  }
}

/** The reference opened by `count` delimiters at `start`, closed at `end`. */
function readQuoted(text, start, quote, count, end) {
  const emptyReference = count % 2 === 0 ? { value: '', length: count } : null;
  if (end === null) return emptyReference;
  const parts = [];
  let position = start + count;
  let run = text.indexOf(quote, position);
  while (run !== -1 && run < end) {
    const length = runLength(text, run, quote);
    const escaped = Math.floor(length / (2 * count)) * count;
    const closes = run + length === end ? count : 0;
    parts.push(text.slice(position, run), quote.repeat(length - escaped - closes));
    position = run + length;
    run = text.indexOf(quote, position);
  }
  const value = parts.join('');
  if (emptyReference !== null && !isSubstantiveBody(value)) return emptyReference;
  return { value, length: end - start };
}

function runLength(text, start, quote) {
  let end = start;
  while (end < text.length && text[end] === quote) end += 1;
  return end - start;
}

/** The maximal runs of one delimiter, each linked to the next longer run. */
class DelimiterRuns {
  constructor(text, quote) {
    this.starts = [];
    this.lengths = [];
    for (let position = text.indexOf(quote); position !== -1;) {
      const length = runLength(text, position, quote);
      this.starts.push(position);
      this.lengths.push(length);
      position = text.indexOf(quote, position + length);
    }
    this.count = this.starts.length;
    this.nextLonger = new Array(this.count);
    const longer = [];
    for (let run = this.count - 1; run >= 0; run -= 1) {
      while (longer.length > 0 && this.lengths[longer.at(-1)] <= this.lengths[run]) longer.pop();
      this.nextLonger[run] = longer.length > 0 ? longer.at(-1) : this.count;
      longer.push(run);
    }
  }

  end(run) {
    return this.starts[run] + this.lengths[run];
  }

  /** The run that holds the delimiter at `position`. */
  indexOf(position) {
    let low = 0;
    let high = this.count - 1;
    while (low < high) {
      const middle = (low + high + 1) >> 1;
      if (this.starts[middle] <= position) low = middle;
      else high = middle - 1;
    }
    return low;
  }
}

/** Whether a body holds a visible character and no parenthesis it straddles. */
function isSubstantiveBody(content) {
  let depth = 0;
  let hasVisible = false;
  for (const character of content) {
    if (character === '(') {
      depth += 1;
    } else if (character === ')') {
      depth -= 1;
      if (depth < 0) return false;
    }
    if (!isLinoWhitespace(character)) hasVisible = true;
  }
  return hasVisible && depth === 0;
}

function lineErrorNode(text, start, end) {
  const children = [];
  let position = start;
  while (position < end) {
    const character = text[position];
    if (isLinoWhitespace(character)) {
      position += 1;
    } else if (character === '(' || character === ')' || character === ':') {
      children.push(anonymous(character, position, position + 1));
      position += 1;
    } else {
      const referenceStart = position;
      while (position < end && isReferenceCharacter(text[position])) position += 1;
      children.push(node('reference', referenceStart, position));
    }
  }
  return errorNode(start, end, children);
}

// The rest of the line after `start`, without its line terminator.
function lineEnd(text, start) {
  let end = start;
  while (end < text.length && text[end] !== '\n' && text[end] !== '\r') end += 1;
  return end;
}

function isLinoWhitespace(character) {
  return character === ' ' || character === '\t' || character === '\n' || character === '\r';
}

function isReferenceCharacter(character) {
  return !isLinoWhitespace(character) && character !== '(' && character !== ':' && character !== ')';
}
