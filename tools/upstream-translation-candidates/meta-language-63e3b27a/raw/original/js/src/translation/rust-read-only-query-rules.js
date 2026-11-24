// Generated from the linked Rust readonly query policy. Do not edit.
/** @param {string} query @param {string} kind @param {string} path @returns {boolean} */
export function acceptRustReadOnlyQueryOwner(query, kind, path) {
  if (query === "inclusive range") return (kind === "primitive" && path === "f64");
  if (query === "string empty") return (kind === "primitive" && path === "str") || (kind === "library" && path === "std::string::String");
  return false;
}
/** @param {string} kind @param {string} model @param {boolean} proven @param {string} layer @param {boolean} borrowed @param {boolean} shadowed @returns {boolean} */
export function acceptRustInclusiveRangeOperand(kind, model, proven, layer, borrowed, shadowed) {
  return proven && !shadowed && kind === "float" && model === "binary64 scalar" && ((!borrowed && layer === "value") || (borrowed && layer === "reference"));
}
/** @param {string} kind @param {string} model @param {boolean} proven @param {boolean} immutable @param {boolean} owner @returns {boolean} */
export function acceptRustStringEmptyReceiver(kind, model, proven, immutable, owner) {
  return proven && immutable && owner && kind === "string" && (model === "owned string" || model === "string slice");
}
