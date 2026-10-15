// Generated from linked closed Rust runtime-shell decisions. Do not edit.
/** @param {string} model @returns {boolean} */
export function acceptRustRuntimeShellModel(model){return model === "" || model === "closed pure Rust unit runtime shell 1";}
/** @param {string} name @returns {boolean} */
export function acceptRustRuntimeShellReservedName(name){return !(name === "std" || name === "ml_main" || name === "main" || name === "__proto__" || name === "prototype" || name === "constructor");}
/** @param {number} value @returns {boolean} */
export function acceptRustRuntimeShellStackShift(value){return value >= 16 && value <= 28 && value % 1 === 0;}
