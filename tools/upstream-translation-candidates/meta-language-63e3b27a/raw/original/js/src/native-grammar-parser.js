// The default parse of a language whose catalog grammar is a native Links
// Notation grammar (the catalog's `nativeGrammars`): the grammar runs on the
// native executor with automatic error recovery, and its tree is projected as
// the language's tree-sitter oracle (the catalog's `oracleGrammars`) places
// nodes, so the default concrete syntax tree keeps its shape when the native
// grammar replaces the oracle. js/scripts/native-grammar-rows.mjs projects the
// same trees to fixture rows, and rust/src/native_grammar_parser.rs is the
// Rust port.
//
// Whitespace trivia is not a node, named trivia (a comment token) is an extra
// node, leading trivia belongs before the node it precedes, a node spans its
// first to last non-trivia leaf, and the root starts at its first leaf that is
// not whitespace and ends at the end of the input. A catalog entry whose root
// includes leading trivia retains the native tree's input start instead.
// Kinds in `hidden` are
// leaves the oracle drops, such as a byte order mark, and kinds in
// `anonymous` are leaves the oracle keeps inside a node without a node of
// their own; the text of both is the gap text between nodes. Node kinds in
// `extras` are extra nodes, as the oracle marks a comment node it parses as an
// extra. A rule renamed from its tree-sitter name keeps that name as its node
// kind (`oracleKinds`, from the rule's `(source-names (tree-sitter NAME))`).
// A kind `'TEXT`, an imported anonymous alias, is an anonymous node TEXT.
// An ERROR leaf is a named `ERROR` node and a MISSING leaf an empty
// MISSING node, named unless it stands for a literal; a MISSING leaf of no
// kind is a named `MISSING` node.
import { readFileSync } from 'node:fs';

import { compileGrammar } from './grammar.js';
import { parseGrammarLinks } from './grammar-links.js';
import { LANGUAGE_CATALOG } from './language-catalog.js';

const NATIVE_GRAMMARS = LANGUAGE_CATALOG.nativeGrammars ?? {};
const PARSERS = new Map();

/** Whether the grammar id `id` names a native grammar of the catalog. */
export function isNativeGrammar(id) {
  return Object.hasOwn(NATIVE_GRAMMARS, id);
}

/** The Links Notation text of the native grammar `id`. */
export function nativeGrammarText(id) {
  return readFileSync(new URL(`./data/${NATIVE_GRAMMARS[id].file}`, import.meta.url), 'utf8');
}

// Each native grammar is compiled on its first use and kept for the process.
function nativeParser(id) {
  let parser = PARSERS.get(id);
  if (!parser) {
    parser = compileGrammar(parseGrammarLinks(nativeGrammarText(id)));
    PARSERS.set(id, parser);
  }
  return parser;
}

/**
 * Parses `source` with the native grammar `id` and returns the projected
 * root, `{ term, named, start, end, isError, isMissing, isExtra, hasError,
 * children: [{ node, field }] }` with UTF-8 byte offsets. Input the executor
 * cannot finish within its resource limits is one ERROR root.
 */
export function parseNative(id, source) {
  const { hidden, anonymous, extras, oracleKinds, rootIncludesLeadingTrivia = false } = NATIVE_GRAMMARS[id];
  const { tree } = nativeParser(id).parseTree(source, { errorRecovery: true, recovery: 'accept' });
  const length = Buffer.byteLength(source);
  if (!tree || tree.type !== 'node') {
    return { term: 'ERROR', named: true, start: 0, end: length, isError: true, isMissing: false, isExtra: false, hasError: true, children: [] };
  }
  return projectNativeTree(tree, length, { hidden, anonymous, extras, oracleKinds, rootIncludesLeadingTrivia });
}

function projectNativeTree(tree, length, { hidden, anonymous, extras, oracleKinds, rootIncludesLeadingTrivia }) {
  const oracleNames = new Map(Object.entries(oracleKinds));
  const oracleKind = (kind) => oracleNames.get(kind) ?? kind;
  const anonymousAlias = (kind) => typeof kind === 'string' && kind.startsWith("'");
  const term = (kind) => (anonymousAlias(kind) ? kind.slice(1) : oracleKind(kind));
  const hiddenKinds = new Set(hidden);
  const anonymousKinds = new Set(anonymous);
  const extraKinds = new Set(extras);
  const invisible = (node) => node.type === 'token' && ((node.trivia && node.kind === null) || hiddenKinds.has(node.kind));
  const trivia = (node) => invisible(node) || (node.type === 'token' && node.trivia) || (node.type === 'node' && extraKinds.has(node.kind));
  const hoist = (node) => {
    if (node.type !== 'node') return [node];
    const children = node.children.flatMap(hoist);
    let first = 0;
    while (first < children.length && trivia(children[first])) first += 1;
    return [...children.slice(0, first), { ...node, children: children.slice(first) }];
  };
  const span = (node) => {
    if (node.type !== 'node') return [node.start, node.end];
    const inner = node.children.filter((child) => !trivia(child)).map(span);
    return inner.length === 0 ? [node.start, node.start] : [inner[0][0], inner.at(-1)[1]];
  };
  // A MISSING leaf of such a kind is a token tree-sitter hides, so it is no
  // node, though the node it is missing from still has an error.
  const hiddenMissing = (node) => node.type === 'missing' && (hiddenKinds.has(node.kind) || anonymousKinds.has(node.kind));
  const project = (children) => children
    .flatMap(hoist)
    .filter((child) => !invisible(child) && !(child.type === 'token' && anonymousKinds.has(child.kind)) && !hiddenMissing(child))
    .map((child) => ({ node: projectNode(child), field: child.field ?? null }));
  const projectNode = (node) => {
    const [start, end] = span(node);
    if (node.type === 'node') {
      const children = project(node.children);
      return {
        term: term(node.kind), named: !anonymousAlias(node.kind), start, end, isError: false, isMissing: false,
        isExtra: extraKinds.has(node.kind), hasError: children.some(({ node: child }) => child.hasError) || node.children.some(hiddenMissing), children,
      };
    }
    if (node.type === 'error') {
      return { term: 'ERROR', named: true, start, end, isError: true, isMissing: false, isExtra: false, hasError: true, children: [] };
    }
    if (node.type === 'missing') {
      return { term: node.kind ? term(node.kind) : 'MISSING', named: !node.literal && !anonymousAlias(node.kind), start, end, isError: false, isMissing: true, isExtra: false, hasError: true, children: [] };
    }
    return {
      term: node.kind ? term(node.kind) : node.text, named: Boolean(node.kind) && !anonymousAlias(node.kind), start, end, isError: false, isMissing: false,
      isExtra: Boolean(node.trivia), hasError: false, children: [],
    };
  };
  const leaves = [];
  const collect = (node) => (node.type === 'node' ? node.children.forEach(collect) : leaves.push(node));
  collect(tree);
  const first = leaves.find((leaf) => !invisible(leaf));
  const children = project(tree.children);
  return {
    term: oracleKind(tree.kind), named: true, start: rootIncludesLeadingTrivia ? tree.start : first ? first.start : length, end: length, isError: false, isMissing: false,
    isExtra: false, hasError: children.some(({ node }) => node.hasError) || tree.children.some(hiddenMissing), children,
  };
}

/** The adapter `convertGrammarNode` reads a projected native tree through. */
export function nativeAdapter(boundaries) {
  return {
    input: null,
    term: (node) => node.term,
    startOffset: (node) => boundaries.offsetOf(node.start),
    endOffset: (node) => boundaries.offsetOf(node.end),
    isNamed: (node) => node.named,
    isError: (node) => node.isError,
    isMissing: (node) => node.isMissing,
    isExtra: (node) => node.isExtra,
    hasError: (node) => node.hasError,
    children: (node) => node.children,
  };
}
