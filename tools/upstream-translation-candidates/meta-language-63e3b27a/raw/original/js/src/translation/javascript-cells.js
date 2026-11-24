// Captured mutable bindings keep one shared cell through assignments, branches
// and lifted loops. The source binding's value may change; its cell identity
// remains the one every closure captured.

export function mutableClosureCells(statements) {
  const captured = new Set();
  const assigned = new Set();
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      for (const child of node) visit(child);
      return;
    }
    if (node.s === 'assign') assigned.add(node.name);
    if (node.k === 'lambda') {
      for (const name of node.captures ?? []) captured.add(name);
      for (const name of node.assignedCaptures ?? []) assigned.add(name);
    }
    for (const [key, value] of Object.entries(node)) {
      if (!['span', 'type', 'data', 'captures', 'assignedCaptures'].includes(key)) visit(value);
    }
  }
  visit(statements);
  return new Set([...captured].filter((name) => assigned.has(name)));
}

/** Representation selection applies to declarations and inferred nested types alike. */
export function markSharedReferenceTypes(program) {
  if (!program.referenceSemantics) return program;
  const copies = new WeakMap();
  const inferredTypes = program.inferredExpressionTypes;
  const copiedTypes = inferredTypes ? new WeakMap() : null;
  function visit(node) {
    if (!node || typeof node !== 'object') return node;
    if (copies.has(node)) return copies.get(node);
    if (Array.isArray(node)) {
      const copy = [];
      copies.set(node, copy);
      for (const value of node) copy.push(visit(value));
      return copy;
    }
    if (Object.getPrototypeOf(node) !== Object.prototype && Object.getPrototypeOf(node) !== null) return node;
    const copy = {};
    copies.set(node, copy);
    for (const [key, value] of Object.entries(node)) copy[key] = visit(value);
    if (['array', 'record', 'map', 'set'].includes(node.kind)) copy.reference = true;
    if (inferredTypes?.has(node)) copiedTypes.set(copy, visit(inferredTypes.get(node)));
    return copy;
  }
  const result = visit(program);
  if (copiedTypes) Object.defineProperty(result, 'inferredExpressionTypes', { value: copiedTypes });
  return result;
}
