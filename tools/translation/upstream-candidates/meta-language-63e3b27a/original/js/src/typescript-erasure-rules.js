// Pure erasure decisions are translated into Rust; each host adapts CST spans.

/** @param {string} operation @returns {boolean} */
export function retainFirstErasureChild(operation) {
  return operation === 'suffix';
}

/** @param {string} operation @param {boolean} exported @returns {boolean} */
export function eraseExportedDeclaration(operation, exported) {
  return operation === 'declaration' && exported;
}

/** @param {string} term @param {string} parentTerm @returns {boolean} */
export function eraseOptionalParameterMarker(term, parentTerm) {
  return term === '?' && parentTerm === 'optional_parameter';
}

/** @param {boolean} carriageReturn @param {boolean} lineFeed @returns {string} */
export function renderErasedTypeScriptScalar(carriageReturn, lineFeed) {
  if (carriageReturn) return '\r';
  if (lineFeed) return '\n';
  return ' ';
}

/** @param {string} pattern @returns {string} */
export function renderTypeScriptDocumentationPattern(pattern) {
  return pattern.replaceAll('*/', '*\\/');
}
