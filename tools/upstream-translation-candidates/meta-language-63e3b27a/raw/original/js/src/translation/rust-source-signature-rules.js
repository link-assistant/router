// Generated from linked Rust source signature policy.
/** @param {string} model @returns {boolean} */
export function acceptRustSourceSignatureModel(model) { return model === "" || model === "Rust source function signature 1"; }
/** @param {string} wrapper @returns {boolean} */
export function acceptRustSourceSignatureWrapper(wrapper) {return wrapper === "reference" || wrapper === "box";}
/** @param {string} kind @returns {boolean} */
export function acceptRustSourceSignatureOwnerKind(kind) {return kind === "primitive" || kind === "declaration" || kind === "library" || kind === "tuple" || kind === "unit" || kind === "slice";}
/** @param {string} kind @returns {boolean} */
export function acceptRustSourceSignatureCatalogOwner(kind) {return kind === "data" || kind === "module" || kind === "externalCrate" || kind === "ctor";}
/** @param {string} kind @param {string} path @param {string} bits @param {boolean} signed @returns {boolean} */
export function acceptRustSourceSignaturePrimitive(kind, path, bits, signed) {
  if (path === "f64") return kind === "float";
  if (path === "bool") return kind === "bool";
  if (path === "str") return kind === "string";
  if (path === "i8") return kind === "fixed" && bits === "8" && signed === true;
  if (path === "u8") return kind === "fixed" && bits === "8" && signed === false;
  if (path === "i16") return kind === "fixed" && bits === "16" && signed === true;
  if (path === "u16") return kind === "fixed" && bits === "16" && signed === false;
  if (path === "i32") return kind === "fixed" && bits === "32" && signed === true;
  if (path === "u32") return kind === "fixed" && bits === "32" && signed === false;
  if (path === "i64") return kind === "fixed" && bits === "64" && signed === true;
  if (path === "u64") return kind === "fixed" && bits === "64" && signed === false;
  if (path === "i128") return kind === "fixed" && bits === "128" && signed === true;
  if (path === "u128") return kind === "fixed" && bits === "128" && signed === false;
  if (path === "usize") return kind === "fixed" && bits === "64" && signed === false;
  if (path === "isize") return kind === "fixed" && bits === "64" && signed === true;
  return false;
}
