// Generated from linked standard primitive Rust owner policy. Do not edit.
/** @param {string} model @returns {boolean} */
export function acceptRustPrimitiveOwnerModel(model){return model === "" || model === "standard primitive Rust binary64 owner 1";}
/** @param {string} path @param {boolean} declared @param {boolean} shadowed @returns {boolean} */
export function acceptRustStandardPrimitiveOwner(path,declared,shadowed){return !declared && !shadowed && (path === "std::primitive::f64" || path === "core::primitive::f64");}
/** @param {string} kind @returns {boolean} */
export function acceptRustPrimitiveOwnerValueType(kind){return kind === "float" || kind === "bool";}
/** @param {string} kind @returns {boolean} */
export function acceptRustPrimitiveOwnerExpression(kind){return kind === "lit" || kind === "var" || kind === "let" || kind === "if" || kind === "unary" || kind === "binary" || kind === "math";}
/** @param {string} name @returns {string} */
export function readRustPrimitiveOwnerConstantValue(name){if(name === "NAN")return "NaN";if(name === "INFINITY")return "Infinity";if(name === "NEG_INFINITY")return "-Infinity";return "";}
