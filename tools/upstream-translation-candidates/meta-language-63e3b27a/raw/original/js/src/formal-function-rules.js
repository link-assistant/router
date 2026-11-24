// Closed profile for selecting a function from an already checked linked model.
/** @param {string} kind @returns {boolean} */
export function acceptFormalFunctionDeclaration(kind) {
  return kind === 'fn';
}
/** @param {string} kind @returns {boolean} */
export function acceptFormalFunctionDependency(kind) {
  return kind === 'fn' || kind === 'data';
}
/** @param {string} label @returns {boolean} */
export function includeFormalFunctionRelation(label) {
  return label !== 'source span' && label !== 'provenance';
}
