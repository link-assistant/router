import { Parser as WebTreeSitterParser } from 'web-tree-sitter';
import './tree-sitter-runtime.js';

import { isToken } from './builtin-grammar.js';
import { canonicalLanguageName, languageEntry } from './language-catalog.js';
import { parseLinoCst } from './lino-grammar.js';
import { parsePdfCst } from './pdf-grammar.js';
import { parseNaturalLanguageCst, parsePlainTextCst } from './text-grammar.js';
import { treeSitterNodeKind } from './tree-sitter-node-kind.js';
import { ByteRange, LinkFlags, Point, SourceSpan } from './primitives.js';
import { loadGrammarLanguage } from './grammar-tiering.js';
import { isNativeGrammar, nativeAdapter, parseNative } from './native-grammar-parser.js';
import { sourceBoundaries } from './source-boundaries.js';
import { readCompressedGrammarAsset } from './grammar-asset-path.js';
import { readRuntimeProjectData } from './project-data-loader.js';

const encoder = new TextEncoder();
const GRAMMAR_DIRECTORY = new URL('./vendor/grammars/', import.meta.url);

/**
 * The grammar lock records, for every vendored grammar, the exact Rust crate
 * (or pinned upstream revision) its WebAssembly build was compiled from, so the
 * JavaScript and Rust runtimes parse with byte-identical generated parsers.
 */
export const GRAMMAR_LOCK = Object.freeze(
  readRuntimeProjectData(new URL('grammar-lock.json', GRAMMAR_DIRECTORY)),
);

// The runtime is web-tree-sitter's own build patched to read UTF-8 input (see
// vendor/web-tree-sitter/runtime-lock.json). The published build reads UTF-16,
// which doubles tree-sitter's per-byte error-recovery costs, so malformed input
// recovered differently than in the native runtime, which parses UTF-8.
// Each grammar is compiled on its first use and kept for the process: every
// loaded grammar stays in the runtime's WebAssembly memory, so loading all of
// them up front cost every importer the memory of every grammar. See
// grammar-tiering.js for how grammar code is compiled.
const GRAMMARS = new Map();

// The oracle grammars of the languages a native grammar parses are development
// files the package does not ship, so their ids load nothing.
function grammarLanguage(id) {
  if (!Object.hasOwn(GRAMMAR_LOCK.grammars, id) || GRAMMAR_LOCK.grammars[id].oracle) return undefined;
  let language = GRAMMARS.get(id);
  if (!language) {
    const binary = readCompressedGrammarAsset(
      `js/src/vendor/grammars/${id}.wasm.gz`,
      new URL(`${id}.wasm.gz`, GRAMMAR_DIRECTORY),
      GRAMMAR_LOCK.grammars[id].wasmSha256,
    );
    language = loadGrammarLanguage(binary);
    GRAMMARS.set(id, language);
  }
  return language;
}

/** Ids of the grammars this process has loaded so far, in load order. */
export function loadedGrammarIds() {
  return [...GRAMMARS.keys()];
}

/**
 * Returns the node kind and field names of a default grammar by its
 * grammar-lock id (`{ nodeKinds, fields }`, fields from field id 1), or
 * undefined for an unknown id or an oracle grammar. They equal the names the Rust runtime compiles.
 */
export function grammarNames(id) {
  const language = grammarLanguage(id);
  if (!language) return undefined;
  return {
    nodeKinds: Array.from({ length: language.nodeTypeCount }, (_, symbol) => language.nodeTypeForId(symbol) ?? ''),
    fields: Array.from({ length: language.fieldCount }, (_, field) => language.fieldNameForId(field + 1) ?? ''),
  };
}

const LEAN_PUBLIC_ROOT = 'file';
// The patched runtime copies each chunk the input callback returns into a buffer of 5119
// 16-bit units and keeps their low bytes, so the callback returns UTF-8 bytes as a string of
// char codes 0-255, in chunks that end on a UTF-8 character boundary.
const INPUT_CHUNK_BYTES = 4096;
const ROCQ_BUILTIN_TYPES = new Set(['bool', 'nat', 'Prop', 'Set', 'SProp', 'Type', 'Z']);

/** Returns the canonical name for a grammar-backed JavaScript frontend. */
export function canonicalProgrammingLanguage(language) {
  return canonicalLanguageName(language);
}

/**
 * Produces a lossless, recovery-aware grammar CST for a registered language.
 * Registered languages never silently fall back to lexical or character data.
 */
export function parseProgrammingLanguage(text, language) {
  const canonical = canonicalProgrammingLanguage(language);
  if (!canonical) {
    return undefined;
  }

  const parsed = parseGrammarCst(text, canonical);
  if (text.includes('\0')) {
    // NUL is prohibited input: the root reports that it contains an error
    // without relabeling the grammar's own nodes as ERROR.
    parsed.tree.flags = new LinkFlags({ ...parsed.tree.flags, hasError: true });
    const retained = parsed.tokens.map(({ text: token }) => token).join('');
    if (text.startsWith(retained) && retained.length < text.length) {
      const boundaries = sourceBoundaries(text);
      parsed.tokens.push({
        text: text.slice(retained.length),
        kind: 'invalid_source_character',
        named: false,
        span: spanFor(boundaries, retained.length, text.length),
        flags: LinkFlags.clean().withError(),
      });
    }
  }
  return parsed;
}

/** Parses an embedded region and clips any synthetic CSS terminator to its host span. */
export function parseEmbeddedProgrammingLanguage(text, language) {
  const canonical = canonicalProgrammingLanguage(language);
  const needsTerminator = canonical === 'CSS' && cssDeclarationNeedsTerminator(text);
  const parsed = parseProgrammingLanguage(needsTerminator ? `${text};` : text, language);
  if (!parsed || !needsTerminator) return parsed;
  return clipParsedSource(parsed, text);
}

function cssDeclarationNeedsTerminator(text) {
  const trimmed = text.trimEnd();
  return trimmed.length > 0 &&
    !trimmed.endsWith(';') &&
    !trimmed.endsWith('}') &&
    !trimmed.includes('{');
}

function clipParsedSource(parsed, text) {
  const byteEnd = encoder.encode(text).length;
  const endCoordinate = sourceBoundaries(text).get(text.length);
  const tokenIndexes = new Map();
  const tokens = [];
  for (const [index, token] of parsed.tokens.entries()) {
    if (token.span.byteRange.end > byteEnd) continue;
    tokenIndexes.set(index, tokens.length);
    tokens.push(token);
  }
  const clip = (node) => clipTreeNode(node, tokenIndexes, byteEnd, endCoordinate);
  const tree = clip(parsed.tree);
  const leading = (parsed.leading ?? []).map(clip).filter(Boolean);
  const trailing = (parsed.trailing ?? []).map(clip).filter(Boolean);
  return { ...parsed, rootTerm: tree.term, tokens, tree, leading, trailing };
}

function clipTreeNode(node, tokenIndexes, byteEnd, endCoordinate) {
  if (node.span.byteRange.start >= byteEnd && node.span.byteRange.end > byteEnd) return null;
  if (node.tokenIndex !== undefined) {
    const tokenIndex = tokenIndexes.get(node.tokenIndex);
    return tokenIndex === undefined ? null : { ...node, tokenIndex };
  }
  const children = node.children
    .map((child) => clipTreeNode(child, tokenIndexes, byteEnd, endCoordinate))
    .filter(Boolean);
  const span = node.span.byteRange.end <= byteEnd
    ? node.span
    : new SourceSpan(
        new ByteRange(node.span.byteRange.start, byteEnd),
        node.span.start,
        new Point(endCoordinate.row, endCoordinate.column),
      );
  return { ...node, children, span };
}

/**
 * Reads `text` as UTF-8 for the patched runtime, whose node offsets are UTF-8
 * byte offsets; `offsetOf` maps them back to string offsets.
 */
function utf8Input(text, boundaries) {
  const bytes = encoder.encode(text);
  // The bytes as char codes, built once: each Markdown inline parse reads a
  // chunk again, and slicing a string is cheaper than spreading its bytes.
  const pieces = [];
  for (let start = 0; start < bytes.length; start += INPUT_CHUNK_BYTES) {
    pieces.push(String.fromCharCode(...bytes.subarray(start, start + INPUT_CHUNK_BYTES)));
  }
  const byteString = pieces.join('');
  return {
    read: (index) => {
      let end = Math.min(bytes.length, index + INPUT_CHUNK_BYTES);
      while (end < bytes.length && (bytes[end] & 0xc0) === 0x80) end -= 1;
      return byteString.slice(index, end);
    },
    offsetOf: (byte) => boundaries.offsetOf(byte),
  };
}

function parseGrammarCst(text, canonical) {
  const boundaries = sourceBoundaries(text);
  const builtin = { LiNo: parseLinoCst, PDF: parsePdfCst, txt: parsePlainTextCst }[canonical]
    ?? (languageEntry(canonical).family === 'natural' ? parseNaturalLanguageCst : undefined);
  if (builtin) {
    const tokens = [];
    const tree = builtinGrammarNode(builtin(text), text, boundaries, tokens);
    return { canonical, rootTerm: tree.term, tokens, tree };
  }
  const id = languageEntry(canonical).grammars[0]?.id;
  if (id !== undefined && isNativeGrammar(id)) {
    // A native grammar's root, like tree-sitter's, starts after its leading
    // padding, and its projected tree has tree-sitter's shape.
    const root = parseNative(id, text);
    const adapter = nativeAdapter(boundaries);
    const tokens = [];
    const leading = [];
    pushGapNodes(leading, 0, adapter.startOffset(root), text, boundaries, tokens);
    const tree = convertGrammarNode(root, adapter, canonical, text, boundaries, tokens);
    const trailing = [];
    pushGapNodes(trailing, adapter.endOffset(root), text.length, text, boundaries, tokens);
    return publicRoot({ canonical, tokens, tree, leading, trailing }, text, boundaries);
  }
  const grammar = id === undefined ? undefined : grammarLanguage(id);
  if (!grammar) {
    throw new Error(`no tree-sitter grammar is registered for ${canonical}`);
  }
  const parser = new WebTreeSitterParser();
  parser.setLanguage(grammar);
  const input = utf8Input(text, boundaries);
  const parsed = parser.parse(input.read);
  parser.delete();
  if (!parsed) {
    throw new Error(`tree-sitter parser returned no ${canonical} syntax tree`);
  }
  const root = parsed.rootNode;
  const adapter = treeSitterAdapter(input);

  // Tree-sitter starts the root after its leading padding, so the text
  // outside the root is retained as gap nodes beside it.
  const tokens = [];
  const leading = [];
  pushGapNodes(leading, 0, adapter.startOffset(root), text, boundaries, tokens);
  const tree = convertGrammarNode(root, adapter, canonical, text, boundaries, tokens);
  const trailing = [];
  pushGapNodes(trailing, adapter.endOffset(root), text.length, text, boundaries, tokens);
  parsed.delete();
  return publicRoot({ canonical, tokens, tree, leading, trailing }, text, boundaries);
}

// Preserves the original public Lean root while retaining the grammar's
// `module` root immediately below it, whichever grammar parsed the source.
// Consumers can query either layer.
function publicRoot({ canonical, tokens, tree, leading, trailing }, text, boundaries) {
  if (canonical === 'Lean') {
    const file = {
      term: LEAN_PUBLIC_ROOT,
      children: [...leading, tree, ...trailing],
      named: true,
      span: spanFor(boundaries, 0, text.length),
      flags: tree.flags,
    };
    return { canonical, rootTerm: file.term, tokens, tree: file, leading: [], trailing: [] };
  }
  return { canonical, rootTerm: tree.term, tokens, tree, leading, trailing };
}

// Converts a built-in grammar tree of string offsets into CST nodes, adding
// each leaf to `tokens` in source order.
function builtinGrammarNode(node, text, boundaries, tokens) {
  let flags = LinkFlags.clean();
  if (node.isError) flags = flags.withError();
  else if (node.isMissing) flags = LinkFlags.missing();
  else if (node.hasError) flags = LinkFlags.containingError();
  else if (node.extra) flags = flags.withExtra();
  const converted = isToken(node)
    ? grammarTokenNode(node.term, node.start, node.end, node.named, flags, text, boundaries, tokens)
    : {
        term: node.term,
        children: node.children.map((child) => builtinGrammarNode(child, text, boundaries, tokens)),
        named: node.named,
        span: spanFor(boundaries, node.start, node.end),
        flags,
      };
  if (node.field) converted.field = node.field;
  return converted;
}

function convertGrammarNode(node, adapter, canonical, text, boundaries, tokens, injected = []) {
  const start = adapter.startOffset(node);
  const end = adapter.endOffset(node);
  const children = [];
  let coveredUntil = start;
  const inlineTree = canonical === 'Markdown' && MARKDOWN_INLINE_CONTAINERS.has(adapter.term(node))
    ? parseMarkdownInline(node, adapter.input)
    : undefined;
  const ownChildren = inlineTree
    ? adapter.children(inlineTree.rootNode)
    : adapter.children(node);
  const extraChildren = inlineTree
    ? [...injected, ...markdownInlineExcludedChildren(node)]
    : injected;

  for (const { node: child, field, injected: nested } of distributeInjectedChildren(
    ownChildren,
    extraChildren,
    adapter,
  )) {
    const childStart = adapter.startOffset(child);
    pushGapNodes(children, coveredUntil, childStart, text, boundaries, tokens);
    const converted = convertGrammarNode(
      child,
      adapter,
      canonical,
      text,
      boundaries,
      tokens,
      nested,
    );
    converted.field = field;
    children.push(converted);
    coveredUntil = Math.max(coveredUntil, adapter.endOffset(child));
  }
  inlineTree?.delete();

  if (children.length === 0 && start < end) {
    const grammarTerm = adapter.term(node);
    const tokenText = text.slice(start, end);
    const semanticTerm = canonical === 'Rocq' && grammarTerm === 'ident'
      ? ROCQ_BUILTIN_TYPES.has(tokenText) ? 'primitive_type' : 'identifier'
      : grammarTerm;
    const tokenNode = grammarTokenNode(
      semanticTerm,
      start,
      end,
      adapter.isNamed(node),
      grammarFlags(node, adapter),
      text,
      boundaries,
      tokens,
    );
    // Rocq's grammar calls every identifier-like leaf `ident`. Retain that
    // concrete grammar node while exposing the cross-language semantic leaf
    // names used by existing identifier/type queries.
    return semanticTerm === grammarTerm
      ? tokenNode
      : {
          term: grammarTerm,
          children: [tokenNode],
          named: adapter.isNamed(node),
          span: tokenNode.span,
          flags: tokenNode.flags,
        };
  }

  pushGapNodes(children, coveredUntil, end, text, boundaries, tokens);

  // A Markdown inline tree is parsed separately from its block container, so
  // its errors reach the containing block nodes through their children.
  const flags = grammarFlags(node, adapter);
  return {
    term: adapter.term(node),
    children,
    named: adapter.isNamed(node),
    span: spanFor(boundaries, start, end),
    flags: !flags.hasError && children.some((child) => child.flags.hasError)
      ? new LinkFlags({ ...flags, hasError: true })
      : flags,
  };
}

// tree-sitter-markdown parses block structure and inline content with two
// grammars. Like upstream's `MarkdownParser` (bindings/rust/parser.rs in
// tree-sitter-md), every `inline` and `pipe_table_cell` block node is parsed
// again with the inline grammar over the node's range minus its named
// children after the first (block continuations such as a quote's `> `).
// Mirrors `parse_markdown_inline` in rust/src/tree_sitter_adapter.rs.
const MARKDOWN_INLINE_CONTAINERS = new Set(['inline', 'pipe_table_cell']);

function markdownInlineExcludedChildren(node) {
  return node.children.slice(1).filter((child) => child.isNamed);
}

// One inline parser serves every inline region: a parser per region allocated
// and freed parser state for each paragraph, table cell and heading. Each
// region's tree is still deleted once it is converted.
let MARKDOWN_INLINE_PARSER;

function markdownInlineParser() {
  if (!MARKDOWN_INLINE_PARSER) {
    MARKDOWN_INLINE_PARSER = new WebTreeSitterParser();
    MARKDOWN_INLINE_PARSER.setLanguage(grammarLanguage('markdown_inline'));
  }
  return MARKDOWN_INLINE_PARSER;
}

function parseMarkdownInline(node, input) {
  const includedRanges = [];
  let start = { index: node.startIndex, position: node.startPosition };
  for (const child of markdownInlineExcludedChildren(node)) {
    includedRanges.push({
      startIndex: start.index,
      startPosition: start.position,
      endIndex: child.startIndex,
      endPosition: child.startPosition,
    });
    start = { index: child.endIndex, position: child.endPosition };
  }
  includedRanges.push({
    startIndex: start.index,
    startPosition: start.position,
    endIndex: node.endIndex,
    endPosition: node.endPosition,
  });
  const tree = markdownInlineParser().parse(input.read, null, { includedRanges });
  if (!tree) throw new Error('tree-sitter parser returned no Markdown inline syntax tree');
  return tree;
}

// Places nodes from another tree (Markdown block continuations inside inline
// content) under the deepest child whose range contains them, and orders the
// rest among the children by start offset, block nodes first on ties.
function distributeInjectedChildren(children, injected, adapter) {
  const entries = children.map(({ node, field }) => ({ node, field, injected: [] }));
  const top = [];
  for (const node of injected) {
    const owner = entries.find((entry) => containsNode(entry.node, node, adapter));
    if (owner) owner.injected.push(node);
    else top.push({ node, field: null, injected: [] });
  }
  if (top.length === 0) return entries;
  return [...top, ...entries].sort(
    (left, right) => adapter.startOffset(left.node) - adapter.startOffset(right.node),
  );
}

function containsNode(outer, inner, adapter) {
  const outerStart = adapter.startOffset(outer);
  const outerEnd = adapter.endOffset(outer);
  const innerStart = adapter.startOffset(inner);
  const innerEnd = adapter.endOffset(inner);
  return outerStart <= innerStart && innerEnd <= outerEnd
    && (innerStart < innerEnd || (outerStart < innerStart && innerStart < outerEnd));
}

/** Term of source text consumed by hidden grammar rules, such as VB's `Module`. */
export const HIDDEN_TEXT_TERM = 'hidden_text';

// Text between visible tree-sitter children is either lexer extras or text
// matched by hidden grammar rules. Mirrors `insert_gap_token` in
// rust/src/tree_sitter_adapter.rs: leading and trailing whitespace is extra
// trivia, and the text between them is a non-extra hidden-text token.
// Whitespace includes the invisible format characters grammars lex as extras
// (tree-sitter-javascript's U+200B, U+2060 and U+FEFF).
function pushGapNodes(children, start, end, text, boundaries, tokens) {
  if (start >= end) return;
  const gap = text.slice(start, end);
  const leading = /^[\p{White_Space}\u200B\u2060\uFEFF]*/u.exec(gap)[0].length;
  const trailing = leading === gap.length ? 0 : /[\p{White_Space}\u200B\u2060\uFEFF]*$/u.exec(gap)[0].length;
  const pieces = [
    [start, start + leading, 'whitespace', LinkFlags.clean().withExtra()],
    [start + leading, end - trailing, HIDDEN_TEXT_TERM, LinkFlags.clean()],
    [end - trailing, end, 'whitespace', LinkFlags.clean().withExtra()],
  ];
  for (const [pieceStart, pieceEnd, term, flags] of pieces) {
    if (pieceStart < pieceEnd) {
      // A gap is source text, not a grammar node: its token sits directly
      // below the enclosing node, as Rust's Token links do.
      const node = grammarTokenNode(term, pieceStart, pieceEnd, false, flags, text, boundaries, tokens);
      children.push({ ...node, gap: true });
    }
  }
}

function grammarTokenNode(term, start, end, named, flags, text, boundaries, tokens) {
  const tokenIndex = tokens.length;
  const token = {
    text: text.slice(start, end),
    kind: term,
    named,
    span: spanFor(boundaries, start, end),
    flags,
  };
  tokens.push(token);
  return { term, children: [], tokenIndex, named, span: token.span, flags };
}

function grammarFlags(node, adapter) {
  const isError = adapter.isError(node);
  const isMissing = adapter.isMissing(node);
  return new LinkFlags({
    isError,
    isMissing,
    isExtra: adapter.isExtra(node),
    hasError: isError || isMissing || adapter.hasError(node),
  });
}

function propertyOrCall(node, name) {
  const value = node[name];
  return typeof value === 'function' ? value.call(node) : value;
}

const treeSitterAdapter = (input) => Object.freeze({
  input,
  term: treeSitterNodeKind,
  startOffset: (node) => input.offsetOf(node.startIndex),
  endOffset: (node) => input.offsetOf(node.endIndex),
  isNamed: (node) => propertyOrCall(node, 'isNamed'),
  isError: (node) => propertyOrCall(node, 'isError'),
  isMissing: (node) => propertyOrCall(node, 'isMissing'),
  isExtra: (node) => propertyOrCall(node, 'isExtra') ?? false,
  hasError: (node) => propertyOrCall(node, 'hasError'),
  children: (node) => node.children.map((child, index) => ({
    node: child,
    field: node.fieldNameForChild(index),
  })),
});

function spanFor(boundaries, start, end) {
  const from = boundaries.get(start);
  const to = boundaries.get(end);
  return new SourceSpan(
    new ByteRange(from.byte, to.byte),
    new Point(from.row, from.column),
    new Point(to.row, to.column),
  );
}
