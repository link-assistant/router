// Generated from linked scalar loop source policy.
/** @param {string} model @returns {boolean} */
export function acceptRustScalarLoopModel(model) {return model === "" || model === "closed primitive scalar loop 1" || model === "closed declaration scalar loop 1";}
/** @param {string} model @returns {boolean} */
export function acceptScalarLoopDeclarationModel(model) {return model === "closed declaration scalar loop 1";}
/** @param {string} language @returns {boolean} */
export function acceptScalarLoopLanguage(language) {return language === "Rust" || language === "JavaScript";}
/** @param {string} kind @returns {boolean} */
export function acceptScalarLoopValueKind(kind) {return kind === "float" || kind === "bool";}
/** @param {string} operation @returns {boolean} */
export function acceptScalarLoopBinaryOperation(operation) {return operation === "add" || operation === "sub" || operation === "mul" || operation === "div" || operation === "rem" || operation === "eq" || operation === "ne" || operation === "lt" || operation === "le" || operation === "gt" || operation === "ge" || operation === "and" || operation === "or" || operation === "plus";}
/** @param {string} operation @returns {boolean} */
export function acceptScalarLoopUnaryOperation(operation) {return operation === "neg" || operation === "not";}
/** @param {string} operation @returns {boolean} */
export function acceptScalarLoopMathOperation(operation) {return operation === "abs" || operation === "floor" || operation === "ceil" || operation === "trunc" || operation === "isNaN" || operation === "isFinite";}
/** @param {string} kind @param {string} owner @returns {boolean} */
export function acceptScalarLoopPrimitiveOwner(kind,owner) {return kind === "float" && owner === "f64" || kind === "bool" && owner === "bool";}
