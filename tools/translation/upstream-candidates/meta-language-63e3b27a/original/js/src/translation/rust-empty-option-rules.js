// Generated from linked empty primitive Rust option policy. Do not edit.
/** @param {string} model @returns {boolean} */
export function acceptRustEmptyOptionSourceModel(model){return model === "" || model === "closed empty primitive Rust option 1";}
/** @param {string} path @param {boolean} shadowed @returns {boolean} */
export function acceptRustEmptyOptionResultOwner(path,shadowed){return !shadowed && (path === "Option" || path === "std::option::Option" || path === "core::option::Option");}
/** @param {string} path @param {boolean} shadowed @returns {boolean} */
export function acceptRustEmptyOptionConstructorOwner(path,shadowed){return !shadowed && (path === "None" || path === "Option::None" || path === "std::option::Option::None" || path === "core::option::Option::None");}
/** @param {string} kind @param {string} owner @param {boolean} indirect @returns {boolean} */
export function acceptRustEmptyOptionElement(kind,owner,indirect){return kind === "float" && owner === "f64" && !indirect;}
/** @param {string} language @param {boolean} forbidden @returns {boolean} */
export function acceptRustEmptyOptionContext(language,forbidden){return language === "Rust" && !forbidden;}
/** @param {string} kind @param {boolean} invalid @returns {boolean} */
export function acceptRustEmptyOptionFunction(kind,invalid){return kind === "fn" && !invalid;}
/** @param {string} kind @param {string} absence @returns {boolean} */
export function acceptRustEmptyOptionExpression(kind,absence){return kind === "none" && absence === "undefined";}
