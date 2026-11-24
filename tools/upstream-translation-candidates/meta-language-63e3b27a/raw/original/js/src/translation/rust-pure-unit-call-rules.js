// Generated from linked pure Rust Unit-call policy. Do not edit.
/** @param {string} model @returns {boolean} */
export function acceptRustPureUnitCallModel(model){return model === "" || model === "closed pure Rust unit calls 1" || model === "closed public pure Rust unit calls 1";}
/** @param {number} code @param {boolean} first @returns {boolean} */
export function acceptRustPureUnitNameCharacter(code,first){return code >= 95 && code <= 95 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || !first && code >= 48 && code <= 57;}
/** @param {string} name @returns {boolean} */
export function acceptRustPureUnitName(name){return name !== "" && name !== "_" && !name.startsWith("ml_") && !(name === "main" || name === "as" || name === "async" || name === "await" || name === "break" || name === "const" || name === "continue" || name === "crate" || name === "dyn" || name === "else" || name === "enum" || name === "extern" || name === "false" || name === "fn" || name === "for" || name === "if" || name === "impl" || name === "in" || name === "let" || name === "loop" || name === "match" || name === "mod" || name === "move" || name === "mut" || name === "pub" || name === "ref" || name === "return" || name === "self" || name === "Self" || name === "static" || name === "struct" || name === "super" || name === "trait" || name === "true" || name === "type" || name === "unsafe" || name === "use" || name === "where" || name === "while" || name === "abstract" || name === "become" || name === "box" || name === "do" || name === "final" || name === "gen" || name === "macro" || name === "override" || name === "priv" || name === "try" || name === "typeof" || name === "unsized" || name === "virtual" || name === "yield");}
/** @param {string} form @returns {boolean} */
export function acceptRustPureUnitHeaderForm(form){return form === "implicit unit" || form === "explicit unit";}
/** @param {string} form @returns {boolean} */
export function acceptRustPureUnitBodyForm(form){return form === "empty block" || form === "unit expression";}
/** @param {string} form @returns {boolean} */
export function acceptRustPureUnitPathForm(form){return form === "unqualified name" || form === "absolute crate path";}
/** @param {string} language @param {boolean} forbidden @returns {boolean} */
export function acceptRustPureUnitContext(language,forbidden){return language === "Rust" && !forbidden;}
/** @param {string} model @param {string} form @returns {boolean} */
export function acceptRustPureUnitVisibility(model,form){return model === "closed pure Rust unit calls 1" && form === "private" || model === "closed public pure Rust unit calls 1" && form === "public";}
/** @param {string} kind @param {boolean} dense @param {boolean} unrepresented @returns {boolean} */
export function acceptRustPureUnitContainer(kind,dense,unrepresented){return !unrepresented && (kind === "array" && dense || kind === "map");}
/** @param {number} value @param {boolean} negativeZero @returns {boolean} */
export function acceptRustPureUnitSourceOffset(value,negativeZero){return !negativeZero && value >= 0 && value <= 9007199254740991 && value % 1 === 0;}
