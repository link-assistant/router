// Portable structural type decisions, shared by both runtime host adapters.
// The generator translates this module; adapters supply already rendered child
// identities and JSON record entries rather than reimplementing the decisions.

/** @param {string[]} children @param {string} separator @returns {string} */
function joinTypeNames(children, separator) {
  let text = '';
  let at = 0;
  while (at < children.length) {
    if (at > 0) text += separator;
    text += children[at];
    at += 1;
  }
  return text;
}

/** @param {string} inner @param {string} outer @returns {string} */
export function mergeOptionalAbsence(inner, outer) {
  return inner === outer ? inner : 'both';
}

/** @param {string} left @param {string} right @returns {boolean} */
export function acceptTypeIdentity(left, right) {
  return left === right;
}

/** @param {string} expected @param {string} actual @returns {boolean} */
export function acceptOptionalAbsence(expected, actual) {
  return expected === 'both' || expected === actual;
}

/**
 * Record children are canonical JSON pairs of field name and child identity;
 * host adapters perform JSON quoting and UTF-16 field-name ordering.
 * @param {string} kind @param {string} detail @param {string[]} children
 * @returns {string}
 */
export function renderPortableTypeIdentity(kind, detail, children) {
  if (kind === 'var') return 'var:' + detail;
  if (kind === 'fixed') return detail;
  if (kind === 'data') return 'data:' + detail;
  if (kind === 'array' || kind === 'set' || kind === 'cell') return kind + ':' + children[0];
  if (kind === 'option') return 'option:' + detail + ':' + children[0];
  if (kind === 'tuple') return 'tuple:[' + joinTypeNames(children, ',') + ']';
  if (kind === 'record') return 'record:' + detail + '[' + joinTypeNames(children, ',') + ']';
  if (kind === 'map') return 'map:' + children[0] + ':' + children[1];
  if (kind === 'function') return 'function:(' + joinTypeNames(children, ',') + '):' + detail;
  return kind;
}

/**
 * Compound Rust target types. Child types are rendered by the ordinary host
 * emitter, retaining its data name resolution and required runtime modules.
 * @param {string} kind @param {string} detail @param {string[]} children
 * @returns {string}
 */
export function renderRustCompoundType(kind, detail, children) {
  if (kind === 'cell') return 'std::rc::Rc<std::cell::RefCell<' + children[0] + '>>';
  if (kind === 'array' || kind === 'set') return 'Vec<' + children[0] + '>';
  if (kind === 'option') return (detail === 'both' ? 'crate::MlOptional<' : 'Option<') + children[0] + '>';
  if (kind === 'tuple' || kind === 'record') return '(' + joinTypeNames(children, ', ') + (children.length === 1 ? ',' : '') + ')';
  if (kind === 'map') return 'Vec<(' + children[0] + ', ' + children[1] + ')>';
  if (kind === 'function') return 'std::rc::Rc<dyn Fn(' + joinTypeNames(children, ', ') + ') -> ' + detail + '>';
  return '';
}

/** @returns {string} */
export function readRustOptionalPrelude() {
  return '/// A nullable value retains the distinct JavaScript null and undefined cases.\n#[derive(Clone, Debug, PartialEq, Eq)]\npub enum MlOptional<T> { Value(T), Null, Undefined }';
}

/** @param {string} identity @param {boolean} reference @returns {string} */
export function wrapPortableReferenceIdentity(identity, reference) {
  return reference ? 'reference:' + identity : identity;
}

/** @param {string} type @param {boolean} reference @returns {string} */
export function renderRustReferenceType(type, reference) {
  return reference ? 'std::rc::Rc<std::cell::RefCell<' + type + '>>' : type;
}
