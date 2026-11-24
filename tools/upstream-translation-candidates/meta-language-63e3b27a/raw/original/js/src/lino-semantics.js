import { DelimitedReferences, blankRanges, commentRanges, parseLinoCst } from './lino-grammar.js';
import { ByteRange, LinkMetadata, LinkType, Point, SourceSpan } from './primitives.js';

/**
 * Inserts the links-notation semantics of `text` into `network` and returns
 * the ids of its top-level links in document order.
 *
 * The links are read from the built-in lossless LiNo CST (`parseLinoCst`)
 * with the transformation the official links-notation 0.22 `Parser` applies
 * to its raw parse (`links-notation/src/Parser.js`): an indented id takes the
 * lines below it as its values, a line with values and indented lines is
 * combined with each of them, and a parenthesized group holding one link is
 * that link. Every link becomes a Relation spanning its source, named for
 * `name:`; every reference becomes the link carrying that name, so a name
 * resolves to its definition wherever it appears (shared, recursive and
 * forward references), or else to one Concept point per name. A path element
 * the official parser repeats in several combined links is one shared link.
 * Mirrors `rust/src/lino_parser.rs`.
 */
export function insertLinoSemantics(network, text, language) {
  return new LinoSemantics(network, text, language).insertDocument();
}

/**
 * The links-notation reading of the link `id` that `insertLinoSemantics`
 * inserted: a reference is its name and a link is `[id or null, ...values]`,
 * the form of `parity/fixtures/lino-compatibility-matrix.json`. A named link
 * appearing as a value outside its own source (a reference to it) reads as
 * its name.
 */
export function linoReading(network, id) {
  const link = network.link(id);
  const metadata = link.metadata();
  if (metadata.linkType !== LinkType.Relation) return metadata.term;
  return [
    metadata.named ? metadata.term : null,
    ...link.references().map((value) => {
      const valueMetadata = network.link(value).metadata();
      const isReference = valueMetadata.linkType === LinkType.Relation && valueMetadata.named &&
        (value.asU64() === id.asU64() || !within(valueMetadata.span, metadata.span));
      return isReference ? valueMetadata.term : linoReading(network, value);
    }),
  ];
}

/**
 * The links-notation text of `readings` (as `linoReading` returns them), one
 * top-level link per line, which the official parser reads back as the same
 * readings: a link is parenthesized, a top-level reference is `name:`, and a
 * name that is not a plain reference is quoted.
 */
export function formatLinoReadings(readings) {
  // A quoted reference opened by N delimiters closes at the next run R with an
  // odd R / N anywhere after it, so the empty reference is written as an even
  // run of `"` longer than every `"` run of the document, which nothing closes.
  const names = new Set();
  const collect = (reading) => {
    if (typeof reading === 'string') names.add(reading);
    else if (reading[0] !== null) names.add(reading[0]);
    if (typeof reading !== 'string') reading.slice(1).forEach(collect);
  };
  readings.forEach(collect);
  const longest = Math.max(0, ...[...names].map((name) => longestRun(quoteName(name), '"')));
  const nameText = (name) => (name === '' ? '"'.repeat(longest + 2 - (longest % 2)) : quoteName(name));
  return readings
    .map((reading) => (typeof reading === 'string' ? `${nameText(reading)}:` : formatLink(reading, nameText)))
    .map((line) => `${line}\n`).join('');
}

function formatLink([name, ...values], nameText) {
  const items = values.map((value) => (typeof value === 'string' ? nameText(value) : formatLink(value, nameText)));
  if (name !== null) items.unshift(`${nameText(name)}:`);
  return `(${items.join(' ')})`;
}

const QUOTES = ['"', "'", '`'];

// A plain reference is `[^ \t\n\r(:)]+` without delimiters that opens no
// comment. Otherwise the name is quoted with a delimiter it does not start
// with, preferring one it does not contain, and a delimiter inside is doubled.
function quoteName(name) {
  if (name === '') return '""';
  if (!/[ \t\n\r():"'`]/u.test(name) && name[0] !== '#') return name;
  const quote = QUOTES.find((candidate) => !name.includes(candidate)) ??
    QUOTES.find((candidate) => name[0] !== candidate);
  return `${quote}${name.replaceAll(quote, quote + quote)}${quote}`;
}

function longestRun(text, character) {
  let longest = 0;
  let run = 0;
  for (const current of text) {
    run = current === character ? run + 1 : 0;
    longest = Math.max(longest, run);
  }
  return longest;
}

function within(inner, outer) {
  return inner !== undefined && outer !== undefined &&
    outer.byteRange.start <= inner.byteRange.start && inner.byteRange.end <= outer.byteRange.end;
}

// A link as the official parser builds it: `values` empty and `id` set is a
// reference. `start` and `end` are string offsets of the source it spans.
const official = (id, values, start, end) => ({ id, values, start, end });

class LinoSemantics {
  constructor(network, text, language) {
    this.network = network;
    this.text = text;
    this.language = language;
    this.quoted = new DelimitedReferences(blankRanges(text, commentRanges(text)));
    // The UTF-8 byte offset and the row of every string offset.
    this.byteOffsets = new Uint32Array(text.length + 1);
    this.lineStarts = [0];
    let byte = 0;
    for (let index = 0; index < text.length; index += 1) {
      this.byteOffsets[index] = byte;
      const code = text.charCodeAt(index);
      if (code >= 0xd800 && code <= 0xdbff && index + 1 < text.length) {
        byte += 4;
        index += 1;
        this.byteOffsets[index] = byte;
        continue;
      }
      byte += code < 0x80 ? 1 : code < 0x800 ? 2 : 3;
      if (code === 0x0a) this.lineStarts.push(byte);
    }
    this.byteOffsets[text.length] = byte;
  }

  insertDocument() {
    const document = parseLinoCst(this.text);
    const links = [];
    for (const child of document.children) {
      if (child.term === 'link' || child.term === 'group') this.collectLinks(this.rawItem(child), [], links);
    }
    const ids = new Map();
    for (const link of links) this.allocate(link, ids);
    for (const link of links) this.connect(link, ids, new Set());
    return links.map((link) => this.idFor(link, ids));
  }

  // ---- The raw parse, as the official PEG grammar returns it ---------------

  rawItem(node) {
    if (node.term === 'reference') return { id: this.text.slice(node.start, node.end), start: node.start, end: node.end };
    if (node.term === 'quoted_reference') {
      return { id: this.quoted.readAt(node.start).value, start: node.start, end: node.end };
    }
    const fields = (field) => node.children.filter((child) => child.field === field).map((child) => this.rawItem(child));
    if (node.term === 'group') return { nested: fields('link'), start: node.start, end: node.end };
    const [id] = fields('id');
    return { id: id?.id, values: fields('value'), children: fields('child'), start: node.start, end: node.end };
  }

  // ---- The official transformation (`links-notation/src/Parser.js`) --------

  collectLinks(item, parentPath, result) {
    const children = item.children ?? [];
    if (children.length > 0 && item.id !== undefined && item.values.length === 0) {
      const values = children.map((child) => this.transformIndentedValue(child));
      result.push(this.combinePathElements(parentPath, official(item.id, values, item.start, item.end)));
      return;
    }
    const current = this.transformLink(item);
    result.push(this.combinePathElements(parentPath, current));
    if (children.length === 0) return;
    const path = [...parentPath, current];
    for (const child of children) this.collectLinks(child, path, result);
  }

  transformIndentedValue(item) {
    const children = item.children ?? [];
    if (children.length > 0 && item.id !== undefined && item.values.length === 0) {
      return official(item.id, children.map((child) => this.transformIndentedValue(child)), item.start, item.end);
    }
    const current = this.transformLink(item);
    if (children.length > 0) {
      return official(current.id, [...current.values, ...children.map((child) => this.transformIndentedValue(child))],
        item.start, item.end);
    }
    if (item.id === undefined && item.nested === undefined && current.values.length === 1) return current.values[0];
    return current;
  }

  combinePathElements(path, current) {
    if (path.length === 0) return current;
    const parent = path.length === 1 ? path[0] : this.combinePathElements(path.slice(0, -1), path.at(-1));
    return official(null, [parent, current], Math.min(parent.start, current.start), Math.max(parent.end, current.end));
  }

  transformNested(item) {
    const links = [];
    for (const nested of item.nested) this.collectLinks(nested, [], links);
    const wrapsSingleGroup = item.nested.length === 1 && item.nested[0].nested !== undefined;
    if (links.length === 1 && !wrapsSingleGroup) return links[0];
    return official(null, links, item.start, item.end);
  }

  transformLink(item) {
    if (item.nested !== undefined) return this.transformNested(item);
    if (item.values === undefined) return official(item.id, [], item.start, item.end);
    return official(item.id ?? null, item.values.map((value) => this.transformLink(value)), item.start, item.end);
  }

  // ---- Links into the network ----------------------------------------------

  static isReference(link) {
    return link.values.length === 0 && link.id !== null;
  }

  // Every link becomes a Relation and every name is registered before any
  // value is resolved, so a name used before its definition, or inside it,
  // still resolves to it.
  allocate(link, ids) {
    if (LinoSemantics.isReference(link) || ids.has(link)) return;
    let metadata = LinkMetadata.new()
      .withLinkType(LinkType.Relation)
      .withNamed(link.id !== null)
      .withLanguage(this.language)
      .withSpan(this.span(link.start, link.end));
    if (link.id !== null) metadata = metadata.withTerm(link.id);
    const id = this.network.insertLink([], metadata);
    ids.set(link, id);
    if (link.id !== null) this.network._terms.set(link.id, id);
    for (const value of link.values) this.allocate(value, ids);
  }

  connect(link, ids, connected) {
    if (LinoSemantics.isReference(link) || connected.has(link)) return;
    connected.add(link);
    for (const value of link.values) this.connect(value, ids, connected);
    this.network.link(ids.get(link)).setReferences(link.values.map((value) => this.idFor(value, ids)));
  }

  idFor(link, ids) {
    if (!LinoSemantics.isReference(link)) return ids.get(link);
    return this.network.findTerm(link.id) ?? this.network.insertTypedPoint(LinkType.Concept, link.id);
  }

  span(start, end) {
    return new SourceSpan(new ByteRange(this.byteOffsets[start], this.byteOffsets[end]),
      this.point(this.byteOffsets[start]), this.point(this.byteOffsets[end]));
  }

  point(byte) {
    // The last line starting at or before `byte`, found by binary search.
    let row = 0;
    let high = this.lineStarts.length - 1;
    while (row < high) {
      const middle = (row + high + 1) >> 1;
      if (this.lineStarts[middle] <= byte) row = middle;
      else high = middle - 1;
    }
    return new Point(row, byte - this.lineStarts[row]);
  }
}
