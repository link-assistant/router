// Generated from linked Rust completion policy. Do not edit by hand.
/** @param {string} model @returns {boolean} */
export function acceptRustCompletionModel(model) {
  return model === "" || model === "closed guarded function returns 1";
}

/** @param {boolean} proven @param {boolean} indirected @returns {boolean} */
export function acceptRustReturnOwnership(proven, indirected) {
  return proven && !indirected;
}

/** @param {string} thenKind @param {string} otherwiseKind @param {boolean} hasElse @param {boolean} continuation @returns {string} */
export function readRustConditionalCompletion(thenKind, otherwiseKind, hasElse, continuation) {
  if ((thenKind === "returned" && otherwiseKind === "" && hasElse === false && continuation === true)) return "guarded continuation";
  if ((thenKind === "returned" && otherwiseKind === "returned" && hasElse === true && continuation === false)) return "returned conditional";
  if ((thenKind === "value" && otherwiseKind === "value" && hasElse === true && continuation === false)) return "conditional value";
  if ((thenKind === "returned" && otherwiseKind === "returned" && hasElse === true && continuation === true)) return "unreachable continuation";
  if ((thenKind === "value" && otherwiseKind === "value" && hasElse === true && continuation === true)) return "discarded conditional value";
  if ((thenKind === "returned" && otherwiseKind === "aborted" && hasElse === true && continuation === false)) return "returned conditional";
  if ((thenKind === "returned" && otherwiseKind === "aborted" && hasElse === true && continuation === true)) return "unreachable continuation";
  if ((thenKind === "aborted" && otherwiseKind === "returned" && hasElse === true && continuation === false)) return "returned conditional";
  if ((thenKind === "aborted" && otherwiseKind === "returned" && hasElse === true && continuation === true)) return "unreachable continuation";
  if ((thenKind === "aborted" && otherwiseKind === "aborted" && hasElse === true && continuation === false)) return "aborted conditional";
  if ((thenKind === "aborted" && otherwiseKind === "aborted" && hasElse === true && continuation === true)) return "unreachable continuation";
  if ((thenKind === "value" && otherwiseKind === "aborted" && hasElse === true && continuation === false)) return "conditional value";
  if ((thenKind === "value" && otherwiseKind === "aborted" && hasElse === true && continuation === true)) return "discarded conditional value";
  if ((thenKind === "aborted" && otherwiseKind === "value" && hasElse === true && continuation === false)) return "conditional value";
  if ((thenKind === "aborted" && otherwiseKind === "value" && hasElse === true && continuation === true)) return "discarded conditional value";
  if ((thenKind === "aborted" && otherwiseKind === "" && hasElse === false && continuation === true)) return "guarded continuation";
  return "unsupported completion";
}

/** @param {string} action @param {string} thenKind @param {string} otherwiseKind @returns {string} */
export function readRustCompletionKind(action, thenKind, otherwiseKind) {
  if ((action === "returned conditional" && thenKind === "returned" && otherwiseKind === "returned")) return "returned";
  if ((action === "conditional value" && thenKind === "value" && otherwiseKind === "value")) return "value";
  if (action === "returned conditional" && ((thenKind === "returned" && otherwiseKind === "aborted") || (thenKind === "aborted" && otherwiseKind === "returned"))) return "returned";
  if ((action === "aborted conditional" && thenKind === "aborted" && otherwiseKind === "aborted")) return "aborted";
  if ((action === "conditional value" && thenKind === "value" && otherwiseKind === "aborted") || (action === "conditional value" && thenKind === "aborted" && otherwiseKind === "value") || (action === "guarded continuation" && thenKind === "returned" && otherwiseKind === "value")) return "value";
  if (action === "guarded continuation" && thenKind === "returned" && ((otherwiseKind === "returned") || (otherwiseKind === "aborted"))) return "returned";
  if ((action === "guarded continuation" && thenKind === "aborted" && otherwiseKind === "value")) return "value";
  if ((action === "guarded continuation" && thenKind === "aborted" && otherwiseKind === "returned")) return "returned";
  if ((action === "guarded continuation" && thenKind === "aborted" && otherwiseKind === "aborted")) return "aborted";
  return "unsupported completion";
}

/** @param {string} model @param {string} macroName @param {string} firstKind @param {string} firstValue @param {string} secondKind @param {string} count @returns {boolean} */
export function acceptRustCompletionPanicArguments(model, macroName, firstKind, firstValue, secondKind, count) {
  return model === "closed guarded function returns 1" && macroName === "panic" && firstKind === "str" && firstValue === "{}" && secondKind === "str" && count === "2";
}
