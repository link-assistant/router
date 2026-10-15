// Project native TypeScript type annotations into the existing typed JavaScript
// frontend. Erasure alone would lose source types for unconstrained functions.
import { readFileSync } from 'node:fs';
import { Parser } from 'links-notation';
import { parseProgrammingLanguage } from './programming-language-parser.js';
import { eraseTypeScript } from './typescript-erasure.js';
import { TranslationError } from './translation/diagnostics.js';
import { renderTypeScriptDocumentationPattern } from './typescript-erasure-rules.js';

const rules = new Map(new Parser().parse(readFileSync(new URL('./data/typescript-portable-typing.lino', import.meta.url), 'utf8'))
  .map(({ values }) => {
    const [kind, term, operation] = values.map(({ id }) => id);
    if (kind !== 'typing-rule') throw new Error(`unknown TypeScript typing rule ${kind}`);
    return [term, operation];
  }));

export function projectTypeScriptTyping(source) {
  const parsed = parseProgrammingLanguage(source, 'TypeScript');
  const erased = eraseTypeScript(source, parsed);
  const bytes = Buffer.from(source);
  const projections = [];
  const text = (node) => bytes.subarray(node.span.byteRange.start, node.span.byteRange.end).toString();
  const type = (node) => {
    const retained = node.term === 'type_annotation' ? node.children.find((child) => child.named && !child.flags.isExtra) : node;
    if (!retained) throw new TranslationError('unsupported', 'TypeScript annotation has no type expression', node.span.byteRange);
    const value = text(retained).replace(/[\r\n]+/gu, ' ');
    if (value.includes('*/')) throw new TranslationError('unsupported', 'TypeScript type cannot be represented as a portable documentation annotation', retained.span.byteRange);
    return value;
  };
  function visit(node, parent = null) {
    const operation = rules.get(node.term);
    const owner = parent?.term === 'export_statement' ? parent : node;
    const tags = [];
    const parameterPatterns = [];
    if (operation === 'function') {
      const parameters = node.children.find((child) => child.field === 'parameters');
      for (const parameter of parameters?.children ?? []) {
        const annotation = parameter.children.find((child) => child.field === 'type');
        const name = parameter.children.find((child) => child.field === 'pattern' || child.field === 'name');
        if (annotation && name) {
          const annotationType = type(annotation);
          const sourceText = text(name);
          const documentationText = renderTypeScriptDocumentationPattern(sourceText);
          parameterPatterns.push({ sourceText, documentationText, sourceSpan: { ...name.span.byteRange } });
          tags.push(`@param {${annotationType}} ${parameter.term === 'optional_parameter' ? `[${documentationText}]` : documentationText}`);
        }
      }
      const returns = node.children.find((child) => child.field === 'return_type');
      if (returns) tags.push(`@returns {${type(returns)}}`);
    } else if (operation === 'alias') {
      const value = node.children.find((child) => child.field === 'value');
      const name = node.children.find((child) => child.field === 'name');
      if (value && name) tags.push(`@typedef {${type(value)}} ${text(name)}`);
    }
    if (tags.length) projections.push({ offset: owner.span.byteRange.start, term: node.term, parameterPatterns,
      annotation: `/**\n${tags.map((tag) => ` * ${tag}`).join('\n')}\n */\n` });
    for (const child of node.children) visit(child, node);
  }
  visit(parsed.tree);
  const targetOffset = (offset) => offset - erased.erasures.filter(({ end }) => end <= offset).reduce((total, { start, end }) => {
    const masked = bytes.subarray(start, end).toString().replace(/[^\r\n]/gu, ' ');
    return total + end - start - Buffer.byteLength(masked);
  }, 0);
  const target = Buffer.from(erased.code);
  const output = [];
  let cursor = 0;
  for (const projection of projections.sort((left, right) => left.offset - right.offset)) {
    const offset = targetOffset(projection.offset);
    output.push(target.subarray(cursor, offset), Buffer.from(projection.annotation));
    cursor = offset;
  }
  output.push(target.subarray(cursor));
  return { code: Buffer.concat(output).toString(), projections, erasures: erased.erasures };
}
