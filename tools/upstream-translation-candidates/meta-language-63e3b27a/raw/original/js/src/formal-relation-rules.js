// Admission of the existing labeled relation model, shared with native proofs.
// Namespace or identity changes need another declared operational model.

/**
 * @param {string} labelKind
 * @param {string} labelDefinition
 * @param {boolean} labelHasTerm
 * @param {boolean} labelHasNamespace
 * @param {boolean} labelNamed
 * @param {boolean} labelSelfPoint
 * @returns {boolean}
 */
export function acceptFormalRelationLabelIdentity(labelKind, labelDefinition, labelHasTerm, labelHasNamespace, labelNamed, labelSelfPoint) {
  return labelKind === 'Field'
    && labelDefinition === 'A field label names a relation between links.'
    && labelHasTerm && !labelHasNamespace && labelNamed && labelSelfPoint;
}

/**
 * @param {string} relationKind
 * @param {boolean} relationHasNamespace
 * @param {boolean} relationHasTerm
 * @param {boolean} relationHasDefinition
 * @param {boolean} relationNamed
 * @param {number} relationArity
 * @returns {boolean}
 */
export function acceptFormalRelationEdgeIdentity(relationKind, relationHasNamespace, relationHasTerm, relationHasDefinition, relationNamed, relationArity) {
  return relationKind === 'Field' && !relationHasNamespace && !relationHasTerm
    && !relationHasDefinition && !relationNamed && relationArity === 3;
}

/**
 * @param {boolean} labelAdmitted
 * @param {boolean} relationAdmitted
 * @param {boolean} sameLabelIdentity
 * @returns {boolean}
 */
export function acceptFormalRelationIdentity(labelAdmitted, relationAdmitted, sameLabelIdentity) {
  return labelAdmitted && relationAdmitted && sameLabelIdentity;
}
