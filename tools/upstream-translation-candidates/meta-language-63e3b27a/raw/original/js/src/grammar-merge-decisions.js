// Shared decisions translated into Rust; host code only adapts grammar data.

/** @param {boolean} proven @param {boolean} multipleProductions @returns {boolean} */
export function preserveSourceAlternatives(proven, multipleProductions) {
  return !proven && multipleProductions;
}

/** @param {boolean} multipleSources @param {boolean} unambiguous @param {boolean} compatibleConcepts @returns {boolean} */
export function acceptRuleCorrespondence(multipleSources, unambiguous, compatibleConcepts) {
  return multipleSources && unambiguous && compatibleConcepts;
}

/** @param {boolean} sourceToken @param {boolean} canonicalToken @returns {boolean} */
export function wrapLexicalProduction(sourceToken, canonicalToken) {
  return sourceToken && !canonicalToken;
}
