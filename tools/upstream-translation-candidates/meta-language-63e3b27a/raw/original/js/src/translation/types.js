// Portable-core types. Numeric types keep their source semantics apart:
// `nat` and `int` are unbounded, `fixed` is a Rust machine integer whose
// arithmetic aborts on overflow, `float` is a JavaScript Number (an IEEE-754
// binary64). Data types are named by their qualified path.
import { acceptTypeIdentity, mergeOptionalAbsence, renderPortableTypeIdentity, wrapPortableReferenceIdentity } from './structured-type-rules.js';
import { acceptImmutableProductKind } from './primitive-value-rules.js';

export const NAT = Object.freeze({ kind: 'nat' });
export const INT = Object.freeze({ kind: 'int' });
export const BOOL = Object.freeze({ kind: 'bool' });
export const STRING = Object.freeze({ kind: 'string' });
export const UNIT = Object.freeze({ kind: 'unit' });
export const FLOAT = Object.freeze({ kind: 'float' });
// The lines a program has printed, newest first: only the targets whose
// programs are pure carry them, as a value (see output.js).
export const OUTPUT = Object.freeze({ kind: 'output' });

export function fixed(bits, signed) {
  return Object.freeze({ kind: 'fixed', bits, signed });
}

export function data(name) {
  return Object.freeze({ kind: 'data', name });
}

/** A JavaScript array whose checked type can retain a shared reference identity. */
export function array(element, reference = false) {
  return Object.freeze({ kind: 'array', element, ...(reference && { reference: true }) });
}

/** A mutable binding keeps its identity separately from its current value. */
export function cell(element) {
  return Object.freeze({ kind: 'cell', element });
}

/** Absence keeps the distinction between JavaScript null and undefined. */
export function option(element, absence = 'both') {
  if (element.kind === 'option') {
    return option(element.element, mergeOptionalAbsence(element.absence ?? 'both', absence));
  }
  return Object.freeze({ kind: 'option', element, absence });
}

export function tuple(elements) {
  return Object.freeze({ kind: 'tuple', elements: Object.freeze([...elements]) });
}

/** Whether a type belongs to the admitted immutable Copy product model. */
export function immutableProductType(type) {
  return Boolean(type && acceptImmutableProductKind(type.kind))
    && (type.kind !== 'tuple' || type.elements.every(immutableProductType));
}

/** Fields are named; their declaration order is not part of a record's shape. */
export function record(fields, open = false, reference = false) {
  return Object.freeze({ kind: 'record', fields: Object.freeze(fields.map((field) => Object.freeze({ ...field }))), ...(open && { open }), ...(reference && { reference: true }) });
}

export function map(key, value, reference = false) {
  return Object.freeze({ kind: 'map', key, value, ...(reference && { reference: true }) });
}

export function set(element, reference = false) {
  return Object.freeze({ kind: 'set', element, ...(reference && { reference: true }) });
}

export function callable(params, ret) {
  return Object.freeze({ kind: 'function', params: Object.freeze([...params]), ret });
}

export function typeKey(type) {
  return wrapPortableReferenceIdentity(ordinaryTypeKey(type), Boolean(type.reference) && ['array', 'record', 'map', 'set'].includes(type.kind));
}

function ordinaryTypeKey(type) {
  switch (type.kind) {
    case 'var':
      return renderPortableTypeIdentity(type.kind, String(type.id), []);
    case 'fixed':
      return renderPortableTypeIdentity(type.kind, `${type.signed ? 'i' : 'u'}${type.bits}`, []);
    case 'data':
      return renderPortableTypeIdentity(type.kind, type.name, []);
    case 'array':
    case 'cell':
      return renderPortableTypeIdentity(type.kind, '', [typeKey(type.element)]);
    case 'option': {
      const normalized = option(type.element, type.absence ?? 'both');
      return renderPortableTypeIdentity(type.kind, normalized.absence, [typeKey(normalized.element)]);
    }
    case 'tuple':
      return renderPortableTypeIdentity(type.kind, '', type.elements.map(typeKey));
    case 'record':
      return renderPortableTypeIdentity(type.kind, type.open ? 'open:' : '', [...type.fields].sort((a, b) => a.name < b.name ? -1 : a.name > b.name ? 1 : 0).map(({ name, type: fieldType }) => JSON.stringify([name, typeKey(fieldType)])));
    case 'map':
      return renderPortableTypeIdentity(type.kind, '', [typeKey(type.key), typeKey(type.value)]);
    case 'set':
      return renderPortableTypeIdentity(type.kind, '', [typeKey(type.element)]);
    case 'function':
      return renderPortableTypeIdentity(type.kind, typeKey(type.ret), type.params.map(typeKey));
    default:
      return renderPortableTypeIdentity(type.kind, '', []);
  }
}

export function sameType(left, right) {
  return acceptTypeIdentity(typeKey(left), typeKey(right));
}

export function isNumeric(type) {
  return type.kind === 'nat' || type.kind === 'int' || type.kind === 'fixed';
}

export function isFloat(type) {
  return type.kind === 'float';
}

/** True when every value of the type is a non-negative integer. */
export function isNatural(type) {
  return type.kind === 'nat' || (type.kind === 'fixed' && !type.signed);
}

export function fixedBounds(type) {
  const bits = BigInt(type.bits);
  return type.signed
    ? { min: -(1n << (bits - 1n)), max: (1n << (bits - 1n)) - 1n }
    : { min: 0n, max: (1n << bits) - 1n };
}

const RUST_FIXED = /^(u|i)(8|16|32|64|128|size)$/u;

export function rustFixedType(name) {
  const match = RUST_FIXED.exec(name);
  if (!match) return undefined;
  return fixed(match[2] === 'size' ? 64 : Number(match[2]), match[1] === 'i');
}
