// The public concrete syntax tree of the native grammar executor and its
// compact, stable text rendering (docs/grammar/feature-union.md#syntax-tree).
// Every node keeps its byte span, every token its exact text, and trivia,
// ERROR, MISSING and embedded-language nodes stay in the tree, so the tree
// reproduces the input byte for byte.
import { hexOf, quoteText, textOf } from './text.js';

function withText(target, bytes, start, end) {
  const text = textOf(bytes, start, end);
  target.text = text;
  if (text === null) target.hex = hexOf(bytes, start, end);
  return target;
}

/** Copies an executor tree into the public node shape. */
export function publicTree(node, bytes) {
  switch (node.type) {
    case 'node': {
      const copy = { type: 'node', kind: node.projectionName ?? node.kind };
      if (node.field !== undefined) copy.field = node.field;
      if (node.trivia) copy.trivia = true;
      Object.assign(copy, { start: node.start, end: node.end, children: node.children.map((child) => publicTree(child, bytes)) });
      if (node.attributes) copy.attributes = { ...node.attributes };
      return copy;
    }
    case 'token': {
      const copy = { type: 'token', kind: node.projectionAnonymous ? null : node.projectionName ?? node.kind };
      if (node.field !== undefined) copy.field = node.field;
      if (node.trivia) copy.trivia = true;
      Object.assign(copy, { start: node.start, end: node.end });
      if (node.attributes) copy.attributes = { ...node.attributes };
      return withText(copy, bytes, node.start, node.end);
    }
    case 'error': {
      const copy = withText({ type: 'error', start: node.start, end: node.end }, bytes, node.start, node.end);
      if (node.reason) copy.reason = node.reason;
      return copy;
    }
    case 'missing': {
      const copy = { type: 'missing', kind: node.kind, start: node.start, end: node.end };
      if (node.literal) copy.literal = true;
      return copy;
    }
    case 'embed':
      return { type: 'embed', language: node.language, start: node.start, end: node.end, root: publicTree(node.root, bytes) };
    default: throw new TypeError(`unknown syntax tree node type ${node.type}`);
  }
}

/** The ambiguous nodes of an executor tree, in preorder, outside the declared conflicts. */
export function collectAmbiguities(node, program, found = []) {
  if (node.type === 'node') {
    if (node.ambiguous && !program.conflicts.has(node.rule)) found.push({ rule: node.rule ?? node.kind, start: node.start, end: node.end });
    for (const child of node.children) collectAmbiguities(child, program, found);
  } else if (node.type === 'embed') {
    collectAmbiguities(node.root, node.program, found);
  }
  return found;
}

/** The first ERROR or MISSING node of a public tree, in preorder. */
export function firstRecovery(node) {
  if (node.type === 'error' || node.type === 'missing') return node;
  for (const child of node.children ?? (node.root ? [node.root] : [])) {
    const found = firstRecovery(child);
    if (found) return found;
  }
  return null;
}

function renderName(name) {
  return /^[A-Za-z_][A-Za-z0-9_-]*$/u.test(name) ? name : quoteText(name);
}

function renderText(node) {
  return node.text === null ? `<${node.hex}>` : quoteText(node.text);
}

function renderAttributes(attributes) {
  if (!attributes) return null;
  const entries = Object.keys(attributes).sort().map((name) => {
    const value = attributes[name];
    return `${renderName(name)}=${typeof value === 'string' ? quoteText(value) : String(value)}`;
  });
  return `{${entries.join(',')}}`;
}

/**
 * Renders a public syntax tree: `(kind {attributes} child ...)` for a node,
 * `field:` before a captured child, the quoted text of an anonymous token,
 * `(kind "text")` for a named one, `~` before trivia, and
 * `(ERROR@S..E "text")`, `(MISSING@P kind)` and `(EMBED language@S..E root)`.
 */
export function renderSyntaxTree(node) {
  const prefix = node.field !== undefined ? `${renderName(node.field)}:` : '';
  switch (node.type) {
    case 'node': {
      const parts = [renderName(node.kind)];
      const attributes = renderAttributes(node.attributes);
      if (attributes) parts.push(attributes);
      parts.push(...node.children.map(renderSyntaxTree));
      return `${prefix}${node.trivia ? '~' : ''}(${parts.join(' ')})`;
    }
    case 'token': {
      const trivia = node.trivia ? '~' : '';
      const attributes = renderAttributes(node.attributes);
      if (node.kind === null && !attributes) return `${prefix}${trivia}${renderText(node)}`;
      const parts = [node.kind === null ? '_' : renderName(node.kind)];
      if (attributes) parts.push(attributes);
      parts.push(renderText(node));
      return `${prefix}${trivia}(${parts.join(' ')})`;
    }
    case 'error': return `${prefix}(ERROR@${node.start}..${node.end} ${renderText(node)})`;
    case 'missing': {
      if (node.kind === null) return `${prefix}(MISSING@${node.start})`;
      return `${prefix}(MISSING@${node.start} ${node.literal ? quoteText(node.kind) : renderName(node.kind)})`;
    }
    case 'embed': return `${prefix}(EMBED ${renderName(node.language)}@${node.start}..${node.end} ${renderSyntaxTree(node.root)})`;
    default: throw new TypeError(`unknown syntax tree node type ${node.type}`);
  }
}
