// Shared finite source-provenance constraints for immutable product admission.
// False roots cannot acquire evidence from a closed cycle alone.

/** @param {boolean[]} bases @param {number[]} targets @param {number[]} sources @param {boolean[]} conjunctions @returns {boolean[]} */
export function solveProductSourceFacts(bases, targets, sources, conjunctions) {
  if (bases.length !== conjunctions.length || targets.length !== sources.length) return [];
  if (!targets.every(index => Number.isSafeInteger(index) && index >= 0 && index < bases.length)) return [];
  if (!sources.every(index => Number.isSafeInteger(index) && index >= 0 && index < bases.length)) return [];
  let flags = bases;
  for (let round = 0; round < bases.length; round += 1) {
    const previous = flags;
    flags = previous.map((known, index) => {
      if (known) return true;
      let found = false;
      let any = false;
      let all = true;
      for (let edge = 0; edge < targets.length; edge += 1) {
        if (targets[edge] === index) {
          found = true;
          if (previous[sources[edge]] === true) any = true;
          else all = false;
        }
      }
      return conjunctions[index] ? found && all : any;
    });
  }
  return flags;
}
