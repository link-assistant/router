// Shared proof decisions, translated into Rust by the global concept generator.
// The host supplies a candidate; this verifier establishes a closed bijection.

/**
 * Verify every rule, meaning and edge of a proposed recursive correspondence.
 * Offsets delimit each rule's edges in the flattened edge array. A shape
 * includes the complete production and operational context with reference
 * positions retained. Equal names and finite membership samples play no role.
 * @param {string[]} shapes
 * @param {string[]} meanings
 * @param {number[]} offsets
 * @param {number[]} edges
 * @param {number[]} first
 * @param {number[]} second
 * @returns {boolean}
 */
export function verifyGlobalConceptCorrespondence(shapes, meanings, offsets, edges, first, second) {
  if (first.length === 0 || first.length !== second.length || shapes.length !== meanings.length || offsets.length !== shapes.length + 1) return false;
  let at = 0;
  while (at < first.length) {
    const left = first[at];
    const right = second[at];
    if (left < 0 || right < 0 || left % 1 !== 0 || right % 1 !== 0 || left >= shapes.length || right >= shapes.length) return false;
    if (shapes[left] !== shapes[right] || meanings[left] !== meanings[right]) return false;
    let other = 0;
    while (other < at) {
      if (first[other] === left || second[other] === right) return false;
      other += 1;
    }
    const leftStart = offsets[left];
    const rightStart = offsets[right];
    const count = offsets[left + 1] - leftStart;
    if (leftStart < 0 || rightStart < 0 || leftStart % 1 !== 0 || rightStart % 1 !== 0 || count < 0 || count % 1 !== 0 || count !== offsets[right + 1] - rightStart || leftStart + count > edges.length || rightStart + count > edges.length) return false;
    let edge = 0;
    while (edge < count) {
      const leftTarget = edges[leftStart + edge];
      const rightTarget = edges[rightStart + edge];
      let pair = 0;
      let found = false;
      while (pair < first.length) {
        if (first[pair] === leftTarget && second[pair] === rightTarget) found = true;
        pair += 1;
      }
      if (!found) return false;
      edge += 1;
    }
    at += 1;
  }
  return true;
}
