// Pure Rust source product admissions, automatically translated into Rust.

/** @param {string} kind @param {boolean} childrenAccepted @param {boolean} indirected @returns {boolean} */
export function acceptRustImmutableProductType(kind, childrenAccepted, indirected) {
  return !indirected && (kind === 'bool' || kind === 'float' || kind === 'fixed' || kind === 'unit' || (kind === 'tuple' && childrenAccepted));
}

/** @param {string} text @returns {boolean} */
export function acceptRustTupleIndexSpelling(text) {
  if (text.length === 0 || (text.length > 1 && text.startsWith('0'))) return false;
  return text.replaceAll('0', '').replaceAll('1', '').replaceAll('2', '').replaceAll('3', '').replaceAll('4', '').replaceAll('5', '').replaceAll('6', '').replaceAll('7', '').replaceAll('8', '').replaceAll('9', '') === '';
}
