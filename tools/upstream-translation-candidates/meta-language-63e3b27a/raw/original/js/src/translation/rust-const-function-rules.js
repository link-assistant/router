// Generated from the linked const predicate policy. Do not edit.
/** @param {string} model @returns {boolean} */
export function acceptRustConstFunctionModel(model){return model === "" || model === "closed pure Rust const predicates 1";}
/** @param {string} kind @returns {boolean} */
export function acceptRustConstFunctionType(kind){return kind === "bool" || kind === "float";}
/** @param {string} kind @param {string} operation @returns {boolean} */
export function acceptRustConstFunctionBinary(kind,operation){return kind === "bool" && (operation === "and" || operation === "or" || operation === "eq" || operation === "ne") || kind === "float" && (operation === "eq" || operation === "ne" || operation === "lt" || operation === "le" || operation === "gt" || operation === "ge");}
/** @param {string} kind @param {boolean} dense @param {boolean} unrepresented @returns {boolean} */
export function acceptRustConstFunctionContainer(kind,dense,unrepresented){return !unrepresented && (kind === "record" || kind === "map" || (kind === "array" && dense));}
/** @param {number} value @param {boolean} negativeZero @returns {boolean} */
export function acceptRustConstFunctionOffset(value,negativeZero){return value >= 0 && value <= 9007199254740991 && value % 1 === 0 && !negativeZero;}
/** @param {number} start @param {number} end @param {boolean} nonempty @returns {boolean} */
export function acceptRustConstFunctionInterval(start,end,nonempty){return start <= end && (!nonempty || start < end);}
/** @param {number} code @param {boolean} first @returns {boolean} */
export function acceptRustConstFunctionNameCharacter(code,first){return code >= 95 && code <= 95 || code >= 65 && code <= 90 || code >= 97 && code <= 122 || !first && code >= 48 && code <= 57;}
/** @param {string} name @returns {boolean} */
export function acceptRustConstFunctionName(name){return name !== "" && name !== "_" && !(name === "as" || name === "async" || name === "await" || name === "break" || name === "const" || name === "continue" || name === "crate" || name === "dyn" || name === "else" || name === "enum" || name === "extern" || name === "false" || name === "fn" || name === "for" || name === "if" || name === "impl" || name === "in" || name === "let" || name === "loop" || name === "match" || name === "mod" || name === "move" || name === "mut" || name === "pub" || name === "ref" || name === "return" || name === "self" || name === "Self" || name === "static" || name === "struct" || name === "super" || name === "trait" || name === "true" || name === "type" || name === "unsafe" || name === "use" || name === "where" || name === "while" || name === "abstract" || name === "become" || name === "box" || name === "do" || name === "final" || name === "gen" || name === "macro" || name === "override" || name === "priv" || name === "try" || name === "typeof" || name === "unsized" || name === "virtual" || name === "yield");}
/** @param {number} value @returns {boolean} */
export function acceptRustConstFunctionFiniteLiteral(value){return Number.isFinite(value);}
