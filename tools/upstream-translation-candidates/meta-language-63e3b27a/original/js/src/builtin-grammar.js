/**
 * Tree nodes shared by the built-in grammars (`lino-grammar.js`,
 * `pdf-grammar.js`) and mirrored by `rust/src/builtin_grammar.rs`.
 *
 * A node is `{ term, named, start, end, children }` over string indices,
 * optionally with a `field` name and `isError`, `isMissing`, `hasError` and
 * `extra` flags. A token is a node without children that covers text; a
 * missing node is zero-width and has no token.
 */
export function node(term, start, end, children = []) {
  return { term, named: true, start, end, children };
}

export function anonymous(term, start, end) {
  return { term, named: false, start, end, children: [] };
}

export function extra(term, named, start, end) {
  return { term, named, extra: true, start, end, children: [] };
}

export function missing(term, named, at) {
  return { term, named, isMissing: true, start: at, end: at, children: [] };
}

export function errorNode(start, end, children) {
  const error = node('ERROR', start, end, children);
  error.isError = true;
  return error;
}

/** A named node spanning its first to its last child. */
export function spanning(term, children) {
  return node(term, children[0]?.start ?? 0, children.at(-1)?.end ?? 0, children);
}

export function withField(child, field) {
  child.field = field;
  return child;
}

export function isToken(tree) {
  return tree.children.length === 0 && tree.start < tree.end;
}

/**
 * Gives `root` and every node below it the text between (and, for the root,
 * around) its children as extras, which `lexGap(start, end)` returns as nodes
 * covering exactly that range, so each extra is owned by the smallest node
 * that spans it, as tree-sitter places extras.
 */
export function fillExtras(root, lexGap) {
  const fill = (parent) => {
    if (parent !== root && parent.children.length === 0) return;
    const children = [];
    let covered = parent.start;
    const gap = (end) => {
      if (end > covered) children.push(...lexGap(covered, end));
    };
    for (const child of parent.children) {
      gap(child.start);
      fill(child);
      children.push(child);
      covered = Math.max(covered, child.end);
    }
    gap(parent.end);
    parent.children = children;
  };
  fill(root);
  return root;
}

/** Sets `hasError` on every node that is, or contains, an error or missing node. */
export function propagateErrors(tree) {
  let hasError = Boolean(tree.isError || tree.isMissing);
  for (const child of tree.children) hasError = propagateErrors(child) || hasError;
  if (hasError) tree.hasError = true;
  return hasError;
}
