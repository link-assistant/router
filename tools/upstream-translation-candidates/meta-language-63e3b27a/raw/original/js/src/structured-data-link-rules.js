// The portable decisions of the inspectable structured data representation.
/** @param {string} term @returns {string} */
export function readStructuredDataKind(term) {
  if (term === 'structured data') return 'root';
  if (term === 'object value') return 'object';
  if (term === 'array value') return 'array';
  if (term === 'key value pair') return 'pair';
  if (term === 'string value') return 'string';
  if (term === 'Unicode code unit string') return 'units';
  if (term === 'Unicode code unit') return 'unit';
  if (term === 'number value') return 'number';
  if (term === 'boolean value') return 'boolean';
  if (term === 'null value') return 'null';
  return '';
}

/** @param {string} kind @param {string} arity @param {boolean} hasDefinition @returns {boolean} */
export function acceptStructuredDataShape(kind, arity, hasDefinition) {
  if (kind === 'root') return arity === '1' && hasDefinition;
  if (kind === 'pair') return arity === '2' && !hasDefinition;
  if (kind === 'object' || kind === 'array' || kind === 'units') return !hasDefinition;
  if (kind === 'string') return arity === '0';
  if (kind === 'number' || kind === 'boolean' || kind === 'unit') return arity === '0' && hasDefinition;
  if (kind === 'null') return arity === '0' && !hasDefinition;
  return false;
}

/** @param {string} label @param {string} value @returns {boolean} */
export function acceptStructuredDataRecordField(label, value) {
  if (label === 't') return value === 'semantic';
  if (label === 'n') return value === '1';
  if (label === 'term') return value === 'structured%20data%20record';
  if (label === 'def') return value === '1';
  if (label === 'lang') return value === 'meta-language%20structured%20data';
  return false;
}

/** @param {string} referenceCount @param {string} metadataCount @returns {boolean} */
export function acceptStructuredDataRecordShape(referenceCount, metadataCount) {
  return referenceCount === '1' && metadataCount === '1';
}
