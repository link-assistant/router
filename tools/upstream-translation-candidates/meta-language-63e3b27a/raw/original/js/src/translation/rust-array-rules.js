// Pure source array admission decisions, translated through the checked model.

/** @param {string} owner @param {boolean} shadowed @returns {boolean} */
export function acceptRustSourceArrayOwner(owner, shadowed) {
  return !shadowed && (owner === 'Vec' || owner === 'std::vec::Vec');
}

/** @param {string} kind @param {boolean} indirected @returns {boolean} */
export function acceptRustSourceArrayElement(kind, indirected) {
  return !indirected && (kind === 'bool' || kind === 'float' || kind === 'fixed' || kind === 'unit' || kind === 'string');
}

/** @param {string} actual @param {string} expected @param {boolean} borrowed @returns {boolean} */
export function acceptRustSourceArrayCoercion(actual, expected, borrowed) {
  return actual === expected || (borrowed && actual === 'owned vector' && expected === 'immutable slice');
}

/** @param {string} model @returns {boolean} */
export function acceptRustSourceArrayResultModel(model) {
  return model === '' || model === 'immutable fresh scalar vector results 1';
}

/** @param {string} model @param {string} kind @param {boolean} owned @param {boolean} fresh @returns {boolean} */
export function acceptRustSourceArrayResult(model, kind, owned, fresh) {
  return model === 'immutable fresh scalar vector results 1' && owned && fresh && (kind === 'bool' || kind === 'float' || kind === 'fixed' || kind === 'unit');
}

/** @param {string} kind @param {boolean} constructor @param {boolean} children @returns {boolean} */
export function acceptRustFreshArrayResultTail(kind, constructor, children) {
  return (kind === 'array' && constructor) || ((kind === 'let' || kind === 'if') && children);
}
