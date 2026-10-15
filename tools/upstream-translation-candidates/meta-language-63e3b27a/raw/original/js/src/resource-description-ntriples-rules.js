// Each invocation reads one token or scalar. Hosts collect its validated result.
// All lexical and escape decisions are shared, checked JavaScript algorithms.
import { resourceDescriptionUnit, resourceDescriptionHexadecimal } from './resource-description-rules.js';
import { resourceDescriptionNTriplesName, resourceDescriptionNTriplesEscape } from './resource-description-ntriples-characters.js';

/** @param {number[]} units @param {number} start @param {number} width @returns {number} */
export function decodeResourceDescriptionScalarEscape(units, start, width) {
  if (width !== 4 && width !== 8 || !Number.isSafeInteger(start) || start < 0) return -1;
  let value = 0;
  for (let index = start; index < start + width; index += 1) {
    let code = resourceDescriptionUnit(units, index);
    if (!resourceDescriptionHexadecimal(code)) return -1;
    if (code >= 97) code -= 32;
    value = value * 16 + (code >= 65 ? code - 55 : code - 48);
  }
  if (value > 1114111 || value >= 55296 && value <= 57343) return -1;
  return value;
}

// Result: consumed UTF-16 units, decoded scalar, diagnostic (zero means valid).
// Kind 0 reads raw scalars; 1 additionally admits IRI UCHAR; 3 literal ECHAR.
/** @param {number[]} units @param {number} index @param {number} kind @returns {number[]} */
export function readResourceDescriptionNTriplesScalar(units, index, kind) {
  const code = resourceDescriptionUnit(units, index);
  if (code < 0 || code > 65535) return [0, -1, 1];
  if (code === 92 && kind !== 0) {
    const escape = resourceDescriptionUnit(units, index + 1);
    if (escape === 117 || escape === 85) {
      const width = escape === 117 ? 4 : 8;
      const scalar = decodeResourceDescriptionScalarEscape(units, index + 2, width);
      return scalar < 0 ? [0, -1, 4] : [width + 2, scalar, 0];
    }
    const scalar = resourceDescriptionNTriplesEscape(escape);
    return kind !== 3 || scalar < 0 ? [0, -1, 5] : [2, scalar, 0];
  }
  if (code >= 55296 && code <= 56319) {
    const low = resourceDescriptionUnit(units, index + 1);
    return low < 56320 || low > 57343 ? [0, -1, 1] : [2, 65536 + (code - 55296) * 1024 + low - 56320, 0];
  }
  if (code >= 56320 && code <= 57343) return [0, -1, 1];
  if (kind === 1 && (code <= 32 || code === 60 || code === 34 || code === 123 || code === 125 || code === 124 || code === 94 || code === 96)
    || kind === 3 && (code === 10 || code === 13)) return [0, -1, 6];
  return [1, code, 0];
}

// Result: token kind, exclusive end position, diagnostic. A zero kind carries
// the exact error position in its second field. No collector mutation occurs.
/** @param {number[]} units @param {number} start @returns {number[]} */
export function readResourceDescriptionNTriplesToken(units, start) {
  let index = start;
  let code = resourceDescriptionUnit(units, index);
  if (code === 32 || code === 9 || code === 10 || code === 13) {
    const kind = code === 32 || code === 9 ? 9 : 7;
    while (index < units.length && (kind === 9 ? resourceDescriptionUnit(units, index) === 32 || resourceDescriptionUnit(units, index) === 9
      : resourceDescriptionUnit(units, index) === 10 || resourceDescriptionUnit(units, index) === 13)) index += 1;
    return [kind, index, 0];
  }
  if (code === 35) {
    while (index < units.length && resourceDescriptionUnit(units, index) !== 10 && resourceDescriptionUnit(units, index) !== 13) {
      const scalar = readResourceDescriptionNTriplesScalar(units, index, 0);
      if (resourceDescriptionUnit(scalar, 2) !== 0) return [0, index, 1];
      index += resourceDescriptionUnit(scalar, 0);
    }
    return [8, index, 0];
  }
  if (code === 46) return [5, index + 1, 0];
  if (code === 94 && resourceDescriptionUnit(units, index + 1) === 94) return [6, index + 2, 0];
  if (code === 64) {
    index += 1;
    while (index < units.length) {
      code = resourceDescriptionUnit(units, index);
      if (!(code >= 65 && code <= 90 || code >= 97 && code <= 122 || code >= 48 && code <= 57 || code === 45)) break;
      index += 1;
    }
    return index === start + 1 ? [0, start, 2] : [4, index, 0];
  }
  if (code === 95 && resourceDescriptionUnit(units, index + 1) === 58) {
    index += 2;
    const beginning = index;
    while (index < units.length) {
      const scalar = readResourceDescriptionNTriplesScalar(units, index, 0);
      if (resourceDescriptionUnit(scalar, 2) !== 0) return [0, index, 1];
      if (!resourceDescriptionNTriplesName(resourceDescriptionUnit(scalar, 1), index === beginning)) break;
      index += resourceDescriptionUnit(scalar, 0);
    }
    while (index > beginning && resourceDescriptionUnit(units, index - 1) === 46) index -= 1;
    return index === beginning ? [0, start, 3] : [2, index, 0];
  }
  if (code === 60 || code === 34) {
    const kind = code === 60 ? 1 : 3;
    const close = code === 60 ? 62 : 34;
    index += 1;
    while (index < units.length) {
      if (resourceDescriptionUnit(units, index) === close) return [kind, index + 1, 0];
      const scalar = readResourceDescriptionNTriplesScalar(units, index, kind);
      if (resourceDescriptionUnit(scalar, 2) !== 0) return [0, index, resourceDescriptionUnit(scalar, 2)];
      index += resourceDescriptionUnit(scalar, 0);
    }
    return [0, start, 7];
  }
  const scalar = readResourceDescriptionNTriplesScalar(units, index, 0);
  return [0, index, resourceDescriptionUnit(scalar, 2) === 0 ? 8 : 1];
}

// Canonical ECHAR suffix, or -1 when the scalar is written verbatim.
/** @param {number} code @returns {number} */
export function readResourceDescriptionNTriplesCanonicalEscape(code) {
  if (code === 34 || code === 92) return code;
  if (code === 10) return 110;
  if (code === 13) return 114;
  return -1;
}
