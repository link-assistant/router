// Read-only scalar binding evidence, translated through the checked model.

/** @param {string} kind @param {boolean} directCopy @param {boolean} shadowed @param {boolean} closed @param {boolean} possibleWrite @returns {boolean} */
export function acceptRustUnwrittenScalarParameter(kind, directCopy, shadowed, closed, possibleWrite) {
  return directCopy && !shadowed && closed && !possibleWrite && (kind === 'bool' || kind === 'float' || kind === 'fixed');
}

/** @param {string} kind @param {string} text @returns {boolean} */
export function detectRustSourceAssignmentToken(kind, text) {
  return kind === 'punct' && (text === '=' || text === '+=' || text === '-=' || text === '*=' || text === '/=' || text === '%=' || text === '&=' || text === '|=' || text === '^=' || text === '<<=' || text === '>>=');
}
