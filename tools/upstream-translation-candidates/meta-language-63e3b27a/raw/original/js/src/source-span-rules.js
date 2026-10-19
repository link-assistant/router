// Generated from the shared source-span offset policy.
/** @param {number} value @param {boolean} negativeZero @returns {boolean} */
export function acceptSourceSpanOffset(value, negativeZero) { return !negativeZero && value >= 0 && value <= 9007199254740991 && value % 1 === 0; }
/** @param {number} start @param {number} end @returns {boolean} */
export function acceptSourceSpanInterval(start, end) { return start <= end; }
