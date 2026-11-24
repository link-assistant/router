// Generated from the linked N-Triples profile. Do not edit by hand.
/** @param {number} code @param {boolean} first @returns {boolean} */
export function resourceDescriptionNTriplesName(code, first) {
  if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || (code >= 192 && code <= 214) || (code >= 216 && code <= 246) || (code >= 248 && code <= 767) || (code >= 880 && code <= 893) || (code >= 895 && code <= 8191) || (code >= 8204 && code <= 8205) || (code >= 8304 && code <= 8591) || (code >= 11264 && code <= 12271) || (code >= 12289 && code <= 55295) || (code >= 63744 && code <= 64975) || (code >= 65008 && code <= 65533) || (code >= 65536 && code <= 983039) || code === 95 || code === 58 || code >= 48 && code <= 57) return true;
  return !first && (code === 45 || code === 46 || code === 183 || code >= 768 && code <= 879 || code >= 8255 && code <= 8256);
}

/** @param {number} code @returns {number} */
export function resourceDescriptionNTriplesEscape(code) {
  if (code === 116) return 9;
  if (code === 98) return 8;
  if (code === 110) return 10;
  if (code === 114) return 13;
  if (code === 102) return 12;
  if (code === 34) return 34;
  if (code === 39) return 39;
  if (code === 92) return 92;
  return -1;
}

/** @param {number} state @param {number} kind @returns {number} */
export function readResourceDescriptionNTriplesTransition(state, kind) {
  if (kind === 9 && (state === 0 || state === 1 || state === 2 || state === 3 || state === 4 || state === 5 || state === 7)) return state;
  if (state === 0 && kind === 1) return 1;
  if (state === 0 && kind === 2) return 1;
  if (state === 1 && kind === 1) return 2;
  if (state === 2 && kind === 1) return 3;
  if (state === 2 && kind === 2) return 3;
  if (state === 2 && kind === 3) return 4;
  if (state === 4 && kind === 4) return 3;
  if (state === 4 && kind === 6) return 5;
  if (state === 5 && kind === 1) return 3;
  if (state === 3 && kind === 5) return 7;
  if (state === 4 && kind === 5) return 7;
  if (state === 0 && kind === 7) return 0;
  if (state === 7 && kind === 7) return 0;
  if (state === 0 && kind === 8) return 0;
  if (state === 7 && kind === 8) return 7;
  return -1;
}

/** @param {number} state @param {number} kind @returns {number} */
export function readResourceDescriptionNTriplesRole(state, kind) {
  if (state === 0 && kind === 1) return 1;
  if (state === 0 && kind === 2) return 1;
  if (state === 1 && kind === 1) return 2;
  if (state === 2 && kind === 1) return 3;
  if (state === 2 && kind === 2) return 3;
  if (state === 2 && kind === 3) return 3;
  if (state === 4 && kind === 4) return 4;
  if (state === 5 && kind === 1) return 5;
  if (state === 3 && kind === 5) return 6;
  if (state === 4 && kind === 5) return 6;
  return 0;
}

/** @param {number} state @returns {boolean} */
export function acceptResourceDescriptionNTriplesFinalState(state) {
  return state === 0 || state === 7;
}
