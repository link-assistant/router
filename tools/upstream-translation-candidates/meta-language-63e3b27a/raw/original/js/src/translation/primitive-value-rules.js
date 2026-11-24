// Portable primitive-value decisions. Rust is generated from this module;
// host adapters supply checked types and preserve expression evaluation order.

/** @param {string} name @param {boolean} computed @param {boolean} colon @returns {boolean} */
export function acceptObjectPropertyDefinition(name, computed, colon) {
  return name !== '__proto__' || computed || !colon;
}

/**
 * Numeric conversion and array property selection have different null rules.
 * A null key names the non-index property "null", so dense portable arrays
 * retain a missing result rather than selecting element zero.
 * @param {string} operation @param {string} absence @returns {string}
 */
export function readAbsentNumberValue(operation, absence) {
  if (absence !== 'null' && absence !== 'undefined') return '';
  if (operation === 'arithmetic') return absence === 'null' ? 'zero' : 'not-a-number';
  if (operation === 'array-index') return 'not-a-number';
  return '';
}

/** @param {string} target @param {string} operation @param {string} absence @returns {string} */
export function renderAbsentNumberExpression(target, operation, absence) {
  const value = readAbsentNumberValue(operation, absence);
  if (value === '') return '';
  if (target === 'JavaScript') return value === 'zero' ? '0' : 'NaN';
  if (target === 'Rust') return value === 'zero' ? '0f64' : 'f64::NAN';
  if (target === 'Lean') return value === 'zero' ? '(0 : Float)' : '(0 / 0 : Float)';
  if (target === 'Rocq') return value === 'zero' ? '0%float' : 'PrimFloat.nan';
  return '';
}

/** @param {string} language @param {string} kind @returns {string} */
export function readNumberDisplayRefusal(language, kind) {
  if (language === 'Rust' && kind === 'float') return 'Rust formatting retains negative zero, spells infinities inf and expands exponents; it needs its own operational formatter';
  return '';
}

/** @param {string} kind @param {boolean} consoleStyle @returns {string} */
export function readNumberDisplayFunction(kind, consoleStyle) {
  return kind === 'float' ? (consoleStyle ? 'js_console' : 'js_number') : '';
}

/** @param {string} kind @returns {boolean} */
export function acceptLinkedTextConversionKind(kind) {
  return kind === 'bool' || kind === 'float' || kind === 'int' || kind === 'nat'
    || kind === 'fixed' || kind === 'string' || kind === 'record';
}

/** @param {string} expression @returns {string} */
export function readScalarCellOperation(expression) {
  if (expression === 'cellAllocate') return 'allocate-reference-cell';
  if (expression === 'cellRead') return 'read-reference-cell';
  if (expression === 'cellWrite') return 'write-reference-cell';
  return '';
}

/** @param {string} language @param {boolean} explicitFrozen @returns {boolean} */
export function requireDataObjectFreeze(language, explicitFrozen) {
  return explicitFrozen || language !== 'JavaScript';
}

/** @param {string} expression @param {boolean} readonlyLiteral @returns {boolean} */
export function acceptObjectFreezeOperand(expression, readonlyLiteral) {
  return expression === 'ctorObject' || expression === 'array' && readonlyLiteral;
}

/** A scalar or recursive product in the selected immutable Copy value model.
 * @param {string} kind @returns {boolean}
 */
export function acceptImmutableProductKind(kind) {
  return kind === 'bool' || kind === 'float' || kind === 'fixed' || kind === 'unit' || kind === 'tuple';
}

/** @param {number} index @param {number} length @returns {boolean} */
export function acceptTupleIndex(index, length) {
  return index >= 0 && index <= 9007199254740991 && index % 1 === 0 && index < length;
}

/** Natural tuple positions have one zero; floating scalar values retain -0.
 * @param {number} index @returns {number}
 */
export function readTuplePosition(index) {
  return index === 0 ? 0 : index;
}
