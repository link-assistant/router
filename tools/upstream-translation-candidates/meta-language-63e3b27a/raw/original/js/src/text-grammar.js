/**
 * Built-in text CST adapters. Sentence/line boundaries, Unicode lexical
 * decisions and validation run on shared generated Links Notation rules.
 * This module only projects native byte spans into the built-in tree shape.
 */
import { readFileSync } from 'node:fs';
import { readRuntimeProjectData } from './project-data-loader.js';
import { errorNode, extra, node, propagateErrors } from './builtin-grammar.js';
import { compileGrammar } from './grammar.js';
import { parseGrammarLinks } from './grammar-links.js';
import { sourceBoundaries } from './source-boundaries.js';

const metadata = readRuntimeProjectData(new URL('./data/native-text-metadata.lino', import.meta.url));
let parser;

function textParser() {
  parser ??= compileGrammar(parseGrammarLinks(readFileSync(new URL('./data/native-text-grammar.lino', import.meta.url), 'utf8')));
  return parser;
}

function parseTextCst(text, mode) {
  const startRule = metadata.starts[mode];
  const rootTerm = metadata.projection[startRule].term;
  const boundaries = sourceBoundaries(text);
  const parsed = textParser().parseTree(text, { startRule });
  if (!parsed.ok || parsed.tree?.type !== 'node') {
    const root = node(rootTerm, 0, text.length, [errorNode(0, text.length, [])]);
    propagateErrors(root);
    return root;
  }
  const regions = parsed.tree.children.map((region) => {
    const start = boundaries.offsetOf(region.start);
    const end = boundaries.offsetOf(region.end);
    return node(metadata.projection[region.kind].term, start, end, lexicalNodes(text.slice(start, end), start));
  });
  const root = node(rootTerm, 0, text.length, regions);
  if (metadata.validation[mode].some((rule) => !textParser().parseTree(text, { startRule: rule }).ok)) root.isError = true;
  propagateErrors(root);
  return root;
}

function lexicalNodes(text, offset) {
  const boundaries = sourceBoundaries(text);
  const parsed = textParser().parseTree(text, { startRule: metadata.starts.lexical });
  if (!parsed.ok || parsed.tree?.type !== 'node') return [errorNode(offset, offset + text.length, [])];
  return parsed.tree.children.map((token) => {
    const projection = metadata.projection[token.kind];
    const start = offset + boundaries.offsetOf(token.start);
    const end = offset + boundaries.offsetOf(token.end);
    if (projection.error) return errorNode(start, end, []);
    if (projection.extra) return extra(projection.term, projection.named ?? true, start, end);
    return node(projection.term, start, end);
  });
}

/** Native line grammar with inclusive LF spans and parenthesis validation. */
export function parsePlainTextCst(text) {
  return parseTextCst(text, 'plain');
}

/** Native sentence grammar retaining every lexeme, source byte and control error. */
export function parseNaturalLanguageCst(text) {
  return parseTextCst(text, 'natural');
}
