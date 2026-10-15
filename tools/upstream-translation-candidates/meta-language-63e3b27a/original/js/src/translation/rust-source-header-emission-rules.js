// Generated from linked primitive borrowed Rust header emission policy.
/** @param {string} model @returns {boolean} */
export function acceptRustSourceHeaderEmissionModel(model) { return model === "primitive borrowed Rust function header 1"; }
/** @param {string} language @param {boolean} forbidden @returns {boolean} */
export function acceptRustSourceHeaderEmissionContext(language, forbidden) { return language === "Rust" && !forbidden; }
/** @param {string} kind @param {boolean} nonFlat @param {boolean} generated @returns {boolean} */
export function acceptRustSourceHeaderEmissionDeclaration(kind, nonFlat, generated) { return kind === "fn" && !nonFlat && !generated; }
/** @param {boolean} unrepresented @returns {boolean} */
export function acceptRustSourceHeaderEmissionDeclarationFields(unrepresented) { return !unrepresented; }
/** @param {string} kind @param {string} ownerKind @param {string} ownerPath @param {boolean} invalidArguments @param {boolean} invalidWrappers @param {boolean} borrowedResult @returns {boolean} */
export function acceptRustSourceHeaderEmissionPosition(kind, ownerKind, ownerPath, invalidArguments, invalidWrappers, borrowedResult) { return !invalidArguments && !invalidWrappers && !borrowedResult && ownerKind === "primitive" && ((kind === "float" && ownerPath === "f64") || (kind === "bool" && ownerPath === "bool")); }
/** @param {string} kind @returns {boolean} */
export function acceptRustSourceHeaderEmissionExpression(kind) { return kind === "lit" || kind === "var" || kind === "let" || kind === "if" || kind === "unary" || kind === "binary"; }
/** @param {string} kind @param {string} field @returns {boolean} */
export function acceptRustSourceHeaderEmissionExpressionField(kind, field) { if (kind === "lit") return field === "k" || field === "type" || field === "span" || field === "value"; if (kind === "var") return field === "k" || field === "type" || field === "span" || field === "name"; if (kind === "unary") return field === "k" || field === "type" || field === "span" || field === "op" || field === "arg" || field === "semantics"; if (kind === "binary") return field === "k" || field === "type" || field === "span" || field === "op" || field === "left" || field === "right" || field === "domain" || field === "semantics"; if (kind === "let") return field === "k" || field === "type" || field === "span" || field === "name" || field === "value" || field === "body"; if (kind === "if") return field === "k" || field === "type" || field === "span" || field === "cond" || field === "then" || field === "else"; return false; }
/** @param {string} semantics @returns {boolean} */
export function acceptRustSourceHeaderEmissionSemantics(semantics) { return semantics === "exact" || semantics === "checked" || semantics === "truncated" || semantics === "ieee"; }
/** @param {boolean} guarded @param {boolean} defaulted @param {boolean} unrepresented @returns {boolean} */
export function acceptRustSourceHeaderEmissionParameter(guarded, defaulted, unrepresented) { return !guarded && !defaulted && !unrepresented; }
/** @param {number} character @param {boolean} first @returns {boolean} */
export function acceptRustSourceHeaderLifetimeCharacter(character, first) { return (character >= 95 && character <= 95) || (character >= 65 && character <= 90) || (character >= 97 && character <= 122) || (!first && (character >= 48 && character <= 57)); }
/** @param {string} kind @returns {string} */
export function readRustSourceHeaderPrimitive(kind) { if (kind === "float") return "f64"; if (kind === "bool") return "bool"; return ""; }
/** @param {string} lifetime @param {string} inner @returns {string} */
export function renderRustSourceHeaderReference(lifetime, inner) { return lifetime === "" ? "&" + inner : "&'" + lifetime + " " + inner; }
/** @param {string} name @param {string} type @returns {string} */
export function renderRustSourceHeaderParameter(name, type) { return name + ": " + type; }
/** @param {string} name @returns {string} */
export function renderRustSourceHeaderLifetime(name) { return "'" + name; }
/** @param {string} inner @returns {string} */
export function renderRustSourceHeaderDereference(inner) { return "*" + inner; }
/** @param {string} name @param {string} dereferenced @returns {string} */
export function renderRustSourceHeaderCopy(name, dereferenced) { return "let " + name + " = " + dereferenced + ";"; }
/** @param {string} name @param {string} lifetimes @param {string} parameters @param {string} result @param {string} body @returns {string} */
export function renderRustSourceHeaderFunction(name, lifetimes, parameters, result, body) { return "pub fn " + name + (lifetimes === "" ? "" : "<" + lifetimes + ">") + "(" + parameters + ") -> " + result + " {\n" + body + "\n}"; }
