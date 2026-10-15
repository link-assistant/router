// Generated from the linked resolved Rust type namespace policy.
/** @param {string} model @returns {boolean} */
export function acceptRustTypeNamespaceModel(model) { return model === "" || model === "resolved Rust type namespace 1"; }
/** @param {string} kind @returns {boolean} */
export function acceptRustTypeNamespaceDeclaration(kind) { return kind === "data"; }
/** @param {boolean} invalidFields @returns {boolean} */
export function acceptRustTypeNamespaceFields(invalidFields) { return !invalidFields; }
/** @param {boolean} aboveCrate @returns {boolean} */
export function acceptRustTypeNamespaceAnchor(aboveCrate) { return !aboveCrate; }
/** @param {boolean} selected @param {string} constructorName @returns {boolean} */
export function acceptRustTypeNamespaceBodyConstructor(selected, constructorName) { return !selected || (constructorName !== "String::from" && constructorName !== "i8::from" && constructorName !== "u8::from" && constructorName !== "i16::from" && constructorName !== "u16::from" && constructorName !== "i32::from" && constructorName !== "u32::from" && constructorName !== "i64::from" && constructorName !== "u64::from" && constructorName !== "i128::from" && constructorName !== "u128::from" && constructorName !== "usize::from" && constructorName !== "isize::from"); }
/** @param {boolean} selected @param {string} methodName @param {boolean} ownedUnitClone @returns {boolean} */
export function acceptRustTypeNamespaceBodyMethod(selected, methodName, ownedUnitClone) { return !selected || (methodName === "clone" && ownedUnitClone) || (methodName !== "clone" && methodName !== "to_owned" && methodName !== "to_string" && methodName !== "as_str"); }
/** @param {boolean} discovery @param {string} methodName @returns {boolean} */
export function acceptRustTypeNamespaceMethodDiscovery(discovery, methodName) { return discovery && (methodName === "clone"); }
/** @param {boolean} ownedDerivation @param {boolean} fieldFree @param {boolean} directReceiver @returns {boolean} */
export function acceptRustTypeNamespaceUnitClone(ownedDerivation, fieldFree, directReceiver) { return ownedDerivation && fieldFree && directReceiver; }
/** @param {string} kind @param {boolean} dense @param {boolean} unrepresented @returns {boolean} */
export function acceptRustTypeNamespaceContainer(kind, dense, unrepresented) { return (kind === "array" && dense && !unrepresented) || ((kind === "map" || kind === "record") && !unrepresented); }
/** @param {boolean} booleanRequired @param {boolean} booleanValue @param {boolean} definedValue @returns {boolean} */
export function acceptRustTypeNamespaceRecordValue(booleanRequired, booleanValue, definedValue) { return definedValue && (!booleanRequired || booleanValue); }
/** @param {boolean} discovery @param {string} typeName @returns {boolean} */
export function acceptRustTypeNamespaceDiscoveryType(discovery, typeName) { return discovery && (typeName === "str"); }
/** @param {string} kind @param {boolean} invalidWrappers @param {boolean} borrowedResult @returns {boolean} */
export function acceptRustTypeNamespacePosition(kind, invalidWrappers, borrowedResult) { return (kind === "primitive" || kind === "declaration") && !invalidWrappers && !borrowedResult; }
