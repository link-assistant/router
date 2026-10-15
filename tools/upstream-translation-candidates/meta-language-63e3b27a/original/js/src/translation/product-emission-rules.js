// Portable immutable product emission decisions. The host adapters render
// operands and recursively determine the Copy status of product fields.

/** @param {string[]} items @returns {string} */
function joinProductItems(items) {
  let text = '';
  let index = 0;
  while (index < items.length) {
    if (index > 0) text += ', ';
    text += items[index];
    index += 1;
  }
  return text;
}

/** @param {string} target @param {string[]} items @param {boolean} frozen @returns {string} */
export function renderTupleValue(target, items, frozen) {
  if (target === 'JavaScript') {
    const text = '[' + joinProductItems(items) + ']';
    return frozen ? 'Object.freeze(' + text + ')' : text;
  }
  if (target === 'Rust') return '(' + joinProductItems(items) + (items.length === 1 ? ',' : '') + ')';
  return '';
}

/** @param {string} target @param {string} object @param {string} index @returns {string} */
export function renderTupleProjection(target, object, index) {
  if (target === 'JavaScript') return '(' + object + ')[' + index + ']';
  if (target === 'Rust') return '(' + object + ').' + index;
  return '';
}

/** @param {string} kind @param {boolean[]} fields @returns {boolean} */
export function acceptTupleCopyType(kind, fields) {
  if (kind === 'bool' || kind === 'fixed' || kind === 'float' || kind === 'unit') return true;
  if (kind !== 'tuple') return false;
  let index = 0;
  while (index < fields.length) {
    if (!fields[index]) return false;
    index += 1;
  }
  return true;
}

/** The existing source Unit representation in the JavaScript target.
 * @param {string} language @returns {string}
 */
export function renderJavaScriptUnit(language) {
  return language === 'JavaScript' ? 'undefined' : 'null';
}
