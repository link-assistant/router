// TypeScript erasure is driven by linked rules over the native concrete tree.
// Unsupported runtime constructs remain translation obligations; they are never
// removed by treating their spelling as an annotation.
import { readFileSync } from 'node:fs';
import { Parser } from 'links-notation';
import { parseProgrammingLanguage } from './programming-language-parser.js';
import { TranslationError } from './translation/diagnostics.js';
import { eraseExportedDeclaration, eraseOptionalParameterMarker, retainFirstErasureChild, renderErasedTypeScriptScalar } from './typescript-erasure-rules.js';

const definitions = new Parser().parse(readFileSync(new URL('./data/typescript-erasure.lino', import.meta.url), 'utf8'));
const operations = new Map();
const refusals = new Set();
for (const definition of definitions) {
  const [kind, term, operation] = definition.values.map((value) => value.id);
  if (kind === 'erasure-rule') operations.set(term, operation);
  else if (kind === 'refusal-rule') refusals.add(term);
  else throw new Error(`unknown TypeScript erasure rule ${kind}`);
}

export function requiresTypeScriptErasure(parsed) {
  function visit(node, parent = null) {
    if (operations.has(node.term) || refusals.has(node.term) ||
      (node.term === '?' && parent?.term === 'optional_parameter') ||
      (node.term === 'type' && ['import_statement', 'import_specifier'].includes(parent?.term))) return true;
    return node.children.some((child) => visit(child, node));
  }
  return visit(parsed.tree);
}

export function eraseTypeScript(source, parsed = parseProgrammingLanguage(source, 'TypeScript')) {
  const bytes = Buffer.from(source);
  const erasures = [];
  const unsupported = (node, detail) => {
    throw new TranslationError('unsupported', `TypeScript ${node.term}: ${detail}`, node.span.byteRange,
      { construct: `TypeScript ${node.term}` });
  };
  const erase = (start, end, term) => erasures.push({ start, end, term });
  function visit(node, parent = null) {
    if (node.flags.isError || node.flags.isMissing || node.term === 'ERROR') unsupported(node, 'the native syntax tree contains an error');
    if (refusals.has(node.term)) unsupported(node, 'this runtime construct needs explicit translation');
    const operation = operations.get(node.term);
    const range = node.span.byteRange;
    if (operation === 'span' || operation === 'declaration') {
      const owner = eraseExportedDeclaration(operation, parent?.term === 'export_statement') ? parent : node;
      erase(owner.span.byteRange.start, owner.span.byteRange.end, node.term);
      return;
    }
    if (operation === 'suffix' || operation === 'prefix') {
      const children = node.children.filter((child) => child.named && !child.flags.isExtra);
      const retained = retainFirstErasureChild(operation) ? children[0] : children.at(-1);
      if (!retained) unsupported(node, 'the erasure has no retained expression');
      if (operation === 'suffix') erase(retained.span.byteRange.end, range.end, node.term);
      else erase(range.start, retained.span.byteRange.start, node.term);
      visit(retained, node);
      return;
    }
    // A question mark belongs to the optional-parameter form; a conditional
    // expression's question mark is a runtime operator and is retained.
    if (eraseOptionalParameterMarker(node.term, parent?.term ?? '')) erase(range.start, range.end, parent.term);
    else if (node.term === 'import_statement' && node.children.some((child) => child.term === 'type')) {
      erase(range.start, range.end, 'type_import');
      return;
    } else if (node.term === 'import_specifier' && node.children.some((child) => child.term === 'type')) {
      unsupported(node, 'mixed type imports need a linked separator reconstruction rule');
    }
    for (const child of node.children) visit(child, node);
  }
  visit(parsed.tree);
  erasures.sort((left, right) => left.start - right.start || right.end - left.end);
  const disjoint = [];
  for (const erasure of erasures) {
    const previous = disjoint.at(-1);
    if (previous && erasure.start < previous.end) {
      if (erasure.end > previous.end) throw new Error('TypeScript erasure ranges overlap without containment');
      continue;
    }
    disjoint.push(erasure);
  }
  const output = [];
  let cursor = 0;
  for (const erasure of disjoint) {
    output.push(bytes.subarray(cursor, erasure.start));
    // Retain line boundaries so erasing a type never changes automatic
    // semicolon insertion or joins adjacent runtime tokens.
    output.push(Buffer.from([...bytes.subarray(erasure.start, erasure.end).toString()]
      .map((scalar) => renderErasedTypeScriptScalar(scalar === '\r', scalar === '\n')).join('')));
    cursor = erasure.end;
  }
  output.push(bytes.subarray(cursor));
  const code = Buffer.concat(output).toString();
  const target = parseProgrammingLanguage(code, 'JavaScript');
  if (target.tree.flags.hasError) unsupported(parsed.tree, 'erased source is not valid JavaScript');
  return { code, erasures: disjoint };
}
