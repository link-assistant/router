// Pure source-layer admissions translated into Rust by the checked translator.

/** @param {string} layer @returns {boolean} */
export function acceptRustImmutableIndirectionLayer(layer) {
  return layer === 'reference' || layer === 'box';
}

/** @param {string} owner @param {boolean} shadowed @returns {boolean} */
export function acceptRustSourceBoxOwner(owner, shadowed) {
  return !shadowed && (owner === 'Box' || owner === 'std::boxed::Box' || owner === 'alloc::boxed::Box');
}

/** @param {boolean} indirected @param {boolean} exact @param {boolean} borrowed @param {boolean} coerced @returns {boolean} */
export function acceptRustSourceIndirectionArgument(indirected, exact, borrowed, coerced) {
  return !indirected || exact || (borrowed && coerced);
}

/** @param {string} layer @param {boolean} initial @returns {boolean} */
export function acceptRustSourceBoxCoercionLayer(layer, initial) {
  return initial && layer === 'box';
}

/** @param {string} kind @param {string} operation @returns {string} */
export function readRustSourceExpressionOrigin(kind, operation) {
  if (kind === 'abort') return 'diverging';
  if (kind === 'toString' && operation === 'from') return 'unboxed-conversion';
  if (kind === 'cast') return 'numeric-cast';
  if (kind === 'unary') return 'primitive-operation';
  if (kind === 'binary') {
    if (operation === 'eq' || operation === 'ne' || operation === 'lt' || operation === 'le' || operation === 'gt' || operation === 'ge') return 'comparison';
    if (operation === 'and' || operation === 'or') return 'boolean-operation';
    return 'primitive-operation';
  }
  if (kind === 'num' || kind === 'bool' || kind === 'unit' || kind === 'str') return 'value';
  if (kind === 'toString' || kind === 'show' || kind === 'stringMap' || kind === 'stringTest') return 'derived-value';
  return 'unknown';
}

/** @param {string} owner @param {boolean} declared @returns {boolean} */
export function acceptRustSourceBoxAvailability(owner, declared) {
  return owner !== 'alloc::boxed::Box' || declared;
}

/** @param {string} operation @param {boolean} leftDirectString @param {boolean} rightDirectString @param {boolean} leftBorrowedSlice @param {boolean} rightBorrowedSlice @returns {boolean} */
export function acceptRustSourceTextEquality(operation, leftDirectString, rightDirectString, leftBorrowedSlice, rightBorrowedSlice) {
  return (operation === 'eq' || operation === 'ne') && ((leftDirectString && rightBorrowedSlice) || (rightDirectString && leftBorrowedSlice));
}

/** @param {string} name @param {boolean} duplicate @param {boolean} bounded @returns {boolean} */
export function acceptRustSourceLifetimeBinding(name, duplicate, bounded) {
  return !duplicate && !bounded && name !== 'static' && name !== '_'
    && name !== 'as' && name !== 'break' && name !== 'const' && name !== 'continue'
    && name !== 'crate' && name !== 'else' && name !== 'enum' && name !== 'extern'
    && name !== 'false' && name !== 'fn' && name !== 'for' && name !== 'if'
    && name !== 'impl' && name !== 'in' && name !== 'let' && name !== 'loop'
    && name !== 'match' && name !== 'mod' && name !== 'move' && name !== 'mut'
    && name !== 'pub' && name !== 'ref' && name !== 'return' && name !== 'self'
    && name !== 'Self' && name !== 'struct' && name !== 'super' && name !== 'trait'
    && name !== 'true' && name !== 'type' && name !== 'unsafe' && name !== 'use'
    && name !== 'where' && name !== 'while' && name !== 'async' && name !== 'await'
    && name !== 'dyn' && name !== 'abstract' && name !== 'become' && name !== 'box'
    && name !== 'do' && name !== 'final' && name !== 'macro' && name !== 'override'
    && name !== 'priv' && name !== 'typeof' && name !== 'unsized' && name !== 'virtual'
    && name !== 'yield' && name !== 'try' && name !== 'gen';
}

/** @param {string} name @param {boolean} declared @returns {boolean} */
export function acceptRustSourceLifetimeReference(name, declared) {
  return name === 'static' || name === '_' || declared;
}

/** @param {boolean} namedBindings @param {boolean} referenceResult @returns {boolean} */
export function acceptRustSourceLifetimeResult(namedBindings, referenceResult) {
  return !namedBindings || !referenceResult;
}
