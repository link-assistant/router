// Admission for one explicitly declared, effect-free value model.
/** @param {string} kind @returns {boolean} */
export function acceptSharedNumericType(kind) { return kind === 'float' || kind === 'bool'; }
/** @param {string} kind @returns {boolean} */
export function acceptSharedNumericExpression(kind) {
  return kind === 'lit' || kind === 'var' || kind === 'let' || kind === 'if'
    || kind === 'call' || kind === 'unary' || kind === 'binary';
}
/** @param {string} operation @param {string} kind @param {string} semantics @returns {boolean} */
export function acceptSharedNumericUnary(operation, kind, semantics) {
  return operation === 'neg' && kind === 'float' && semantics === 'ieee'
    || operation === 'not' && kind === 'bool' && semantics === '';
}
/** @param {string} operation @param {string} domain @param {string} semantics @returns {boolean} */
export function acceptSharedNumericBinary(operation, domain, semantics) {
  if (operation === 'add' || operation === 'sub' || operation === 'mul' || operation === 'div' || operation === 'rem') return domain === 'float' && semantics === 'ieee';
  if (operation === 'eq' || operation === 'ne') return (domain === 'float' || domain === 'bool') && semantics === '';
  if (operation === 'lt' || operation === 'le' || operation === 'gt' || operation === 'ge') return domain === 'float' && semantics === '';
  return false;
}
/** @param {string} kind @param {boolean} singleField @returns {boolean} */
export function acceptSharedNumericTypeShape(kind, singleField) { return acceptSharedNumericType(kind) && singleField; }
/** @param {string} language @param {boolean} unsupportedContext @returns {boolean} */
export function acceptSharedNumericContext(language, unsupportedContext) { return (language === 'JavaScript' || language === 'Rust') && !unsupportedContext; }
/** @param {string} kind @param {boolean} qualified @returns {boolean} */
export function acceptSharedNumericDeclaration(kind, qualified) { return kind === 'fn' && !qualified; }
/** @param {boolean} guarded @param {boolean} defaulted @returns {boolean} */
export function acceptSharedNumericParameter(guarded, defaulted) { return !guarded && !defaulted; }
/** @param {boolean} generated @param {string} kind @param {boolean} owned @returns {boolean} */
export function acceptSharedNumericEntry(generated, kind, owned) { return generated && kind === 'call' && owned; }
/** @param {string} kind @param {boolean} qualified @returns {boolean} */
export function acceptSharedNumericExpressionShape(kind, qualified) { return acceptSharedNumericExpression(kind) && !qualified; }
/** @param {string} kind @param {boolean} booleanValue @param {boolean} decimalValue @param {boolean} finiteValue @param {boolean} canonicalValue @param {boolean} requireCanonical @returns {boolean} */
export function acceptSharedNumericLiteral(kind, booleanValue, decimalValue, finiteValue, canonicalValue, requireCanonical) {
  if (kind === 'bool') return booleanValue;
  return kind === 'float' && decimalValue && finiteValue && (!requireCanonical || canonicalValue);
}
/** @param {boolean} present @param {boolean} booleanScalar @param {boolean} falseValue @returns {boolean} */
export function acceptSharedNumericContextFlag(present, booleanScalar, falseValue) {
  return !present || booleanScalar && falseValue;
}
/** @param {string} model @param {string} language @param {boolean} matchingLayout @param {boolean} qualified @returns {boolean} */
export function acceptSharedNumericSourceSignature(model, language, matchingLayout, qualified) {
  return model === 'Rust source function signature 1' && language === 'Rust' && matchingLayout && !qualified;
}
/** @param {string} kind @param {string} ownerKind @param {string} ownerPath @param {boolean} qualified @returns {boolean} */
export function acceptSharedNumericSourceType(kind, ownerKind, ownerPath, qualified) {
  return ownerKind === 'primitive' && !qualified && (kind === 'float' && ownerPath === 'f64' || kind === 'bool' && ownerPath === 'bool');
}
