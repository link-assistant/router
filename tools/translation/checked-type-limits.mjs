// Dependency-free checked-type bounds. checked-types.mjs re-exports these first
// so modules in its import cycles (for example extensions/fixed-arrays.mjs)
// observe initialized bindings during evaluation.
export const FIXED_ARRAY_MAX_LENGTH=4096;
