// Generated from data/typed-program-links-schema.json. Do not edit by hand.

/** @param {string} term @returns {string} */
export function readProgramContainerKind(term) {
  if ((term === "program record")) return "record";
  if ((term === "ordered program list")) return "array";
  if ((term === "program mapping")) return "map";
  return "";
}

/** @param {string} kind @param {boolean} hasFields @returns {boolean} */
export function acceptProgramContainerFields(kind, hasFields) {
  if ((kind === "record")) return true;
  if ((kind === "array") || (kind === "map")) return !hasFields;
  return false;
}

/** @param {string} term @returns {string} */
export function readProgramScalarKind(term) {
  if ((term === "string value")) return "string";
  if ((term === "number value")) return "number";
  if ((term === "boolean value")) return "boolean";
  if ((term === "integer value")) return "bigint";
  if ((term === "null value")) return "null";
  if ((term === "undefined value")) return "undefined";
  return "";
}

/** @param {string} term @returns {string} */
export function readProgramReferenceRole(term) {
  if ((term === "binding reference")) return "binding";
  if ((term === "declaration reference")) return "declaration";
  if ((term === "data type declaration reference")) return "datatype";
  if ((term === "constructor declaration reference")) return "constructor";
  if ((term === "datatype declaration reference")) return "datatype";
  return "";
}

/** @param {string} kind @returns {string} */
export function readProgramPatternBindingForm(kind) {
  if ((kind === "wild")) return "none";
  if ((kind === "bind")) return "single";
  if ((kind === "natZero")) return "none";
  if ((kind === "natSucc")) return "single";
  if ((kind === "ctor")) return "fields";
  return "";
}

/** @param {string} kind @returns {string} */
export function readProgramExpressionOperandFields(kind) {
  if ((kind === "call") || (kind === "ctor") || (kind === "math") || (kind === "recur")) return "args";
  if ((kind === "apply")) return "fn args";
  if ((kind === "method")) return "object args";
  if ((kind === "cellAllocate")) return "value";
  if ((kind === "cellRead")) return "cell";
  if ((kind === "cellWrite")) return "cell value body";
  if ((kind === "referenceAllocate")) return "value";
  if ((kind === "referenceRead")) return "reference";
  if ((kind === "recordField") || (kind === "tupleIndex")) return "object";
  if ((kind === "tuple") || (kind === "array")) return "items";
  if ((kind === "some") || (kind === "flattenOption")) return "value";
  if ((kind === "nullishNumber") || (kind === "optionalIndexNumber") || (kind === "truthy")) return "arg";
  if ((kind === "strictEqual")) return "left right";
  if ((kind === "optionalTypeOf") || (kind === "optionalText") || (kind === "unwrapOption") || (kind === "optionalPredicate")) return "arg";
  if ((kind === "coalesce")) return "left right";
  if ((kind === "optionalField") || (kind === "optionalProject")) return "object";
  if ((kind === "optionalIndex")) return "array index";
  if ((kind === "stringPoints")) return "object";
  if ((kind === "set")) return "items";
  if ((kind === "map")) return "entries";
  if ((kind === "collectionSize")) return "object";
  if ((kind === "collectionRead")) return "object key";
  if ((kind === "collectionItems")) return "object";
  if ((kind === "unary")) return "arg";
  if ((kind === "binary")) return "left right";
  if ((kind === "if")) return "cond then else";
  if ((kind === "print")) return "text body";
  if ((kind === "toString")) return "arg";
  if ((kind === "stringMap")) return "string";
  if ((kind === "stringTest")) return "string search";
  if ((kind === "cast")) return "arg";
  if ((kind === "append")) return "left right";
  if ((kind === "index")) return "array index";
  if ((kind === "length")) return "array";
  return "";
}

/** @param {string} label @param {string} constructKind @param {string} typeKind @returns {string} */
export function readProgramReferenceSourceField(label, constructKind, typeKind) {
  if ((label === "binding reference" && constructKind === "var" && typeKind === "")) return "name";
  if ((label === "declaration reference" && constructKind === "call" && typeKind === "") || (label === "declaration reference" && constructKind === "functionRef" && typeKind === "")) return "fn";
  if ((label === "data type declaration reference" && constructKind === "" && typeKind === "data")) return "name";
  if ((label === "data type declaration reference" && constructKind === "ctor" && typeKind === "")) return "data";
  if ((label === "constructor declaration reference" && constructKind === "ctor" && typeKind === "")) return "ctor";
  if ((label === "datatype declaration reference" && constructKind === "" && typeKind === "data")) return "name";
  if ((label === "datatype declaration reference" && constructKind === "ctor" && typeKind === "")) return "data";
  return "";
}

/** @param {string} label @returns {string} */
export function readProgramReferenceTargetField(label) {
  if ((label === "binding reference")) return "name";
  if ((label === "declaration reference") || (label === "data type declaration reference")) return "fullName";
  if ((label === "constructor declaration reference")) return "name";
  if ((label === "datatype declaration reference")) return "fullName";
  return "";
}

/** @param {string} context @param {string} field @returns {string} */
export function readProgramNeutralFieldDefault(context, field) {
  if ((context === "program") && ((field === "imports") || (field === "externals"))) return "empty-array";
  if ((context === "program") && ((field === "outputThreaded") || (field === "abortsThreaded"))) return "false";
  if ((context === "program" && field === "main")) return "null";
  if ((context === "main" && field === "sequentialAsync")) return "false";
  if ((context === "main" && field === "span")) return "null";
  if ((context === "declaration:fn") && ((field === "mutual") || (field === "generated"))) return "false";
  if ((context === "declaration:fn") && ((field === "decreasing") || (field === "span"))) return "null";
  if ((context === "declaration:data") && ((field === "generated") || (field === "output"))) return "false";
  if ((context === "declaration:data" && field === "span")) return "null";
  if (((field === "frozen") && ((context === "expression:ctor") || (context === "expression:tuple"))) || ((context === "expression:toString" && field === "console"))) return "false";
  if ((context === "parameter") && ((field === "guard") || (field === "default"))) return "null";
  if ((context === "effect:let" && field === "constant")) return "false";
  if ((field === "span") && ((context === "effect:let") || (context === "declaration:module") || (context === "effect:print") || (context === "expression:lit") || (context === "expression:unit") || (context === "expression:var") || (context === "expression:call") || (context === "expression:ctor") || (context === "expression:match") || (context === "expression:unary") || (context === "expression:binary") || (context === "expression:if") || (context === "expression:let") || (context === "expression:toString") || (context === "expression:stringMap") || (context === "expression:stringTest") || (context === "expression:cast") || (context === "expression:abort") || (context === "expression:print") || (context === "expression:array") || (context === "expression:append") || (context === "expression:index") || (context === "expression:length") || (context === "expression:math") || (context === "expression:tuple") || (context === "expression:tupleIndex") || (context === "expression:none"))) return "null";
  return "";
}

/** @param {string} kind @param {string} field @returns {boolean} */
export function acceptProgramExpressionField(kind, field) {
  if ((kind === "tuple")) return field === "k" || field === "type" || field === "span" || field === "items" || field === "frozen" || field === "productModel";
  if ((kind === "tupleIndex")) return field === "k" || field === "type" || field === "span" || field === "object" || field === "index";
  return false;
}

/** @param {string} model @param {boolean} frozen @returns {boolean} */
export function acceptProgramTupleProductModel(model, frozen) {
  return (model === "immutable value product") && frozen;
}

/** @param {string} term @returns {string} */
export function readProgramExpressionProjection(term) {
  if ((term === "lit")) return "lit";
  if ((term === "lit:bool")) return "lit:bool";
  if ((term === "lit:string")) return "lit:string";
  if ((term === "lit:nat")) return "lit:nat";
  if ((term === "lit:int")) return "lit:int";
  if ((term === "lit:fixed")) return "lit:fixed";
  if ((term === "lit:float")) return "lit:float";
  if ((term === "unit")) return "unit";
  if ((term === "var")) return "var";
  if ((term === "call")) return "call";
  if ((term === "ctor")) return "ctor";
  if ((term === "ctor:true")) return "ctor:true";
  if ((term === "match")) return "match";
  if ((term === "unary")) return "unary";
  if ((term === "binary")) return "binary";
  if ((term === "if")) return "if";
  if ((term === "let")) return "let";
  if ((term === "toString")) return "toString";
  if ((term === "toString:true")) return "toString:true";
  if ((term === "stringMap")) return "stringMap";
  if ((term === "stringTest")) return "stringTest";
  if ((term === "cast")) return "cast";
  if ((term === "abort")) return "abort";
  if ((term === "print")) return "print";
  if ((term === "array")) return "array";
  if ((term === "append")) return "append";
  if ((term === "index")) return "index";
  if ((term === "length")) return "length";
  if ((term === "length:string")) return "length:string";
  if ((term === "math")) return "math";
  if ((term === "tuple")) return "tuple";
  if ((term === "tupleIndex")) return "tupleIndex";
  if ((term === "none")) return "none";
  return "";
}

/** @param {string} kind @param {string} operation @returns {boolean} */
export function acceptProgramExpressionOperation(kind, operation) {
  if ((kind === "math")) return operation === "abs" || operation === "floor" || operation === "ceil" || operation === "trunc" || operation === "round" || operation === "sign" || operation === "sqrt" || operation === "max" || operation === "min" || operation === "maxOf" || operation === "minOf" || operation === "isInteger" || operation === "isSafeInteger" || operation === "isFinite" || operation === "isNaN";
  if ((kind === "stringMap")) return operation === "toLowerCase" || operation === "toUpperCase" || operation === "trim" || operation === "trimStart" || operation === "trimEnd" || operation === "rustTrim" || operation === "rustTrimStart" || operation === "rustTrimEnd";
  if ((kind === "stringTest")) return operation === "startsWith" || operation === "endsWith" || operation === "includes";
  if ((kind === "method")) return operation === "split" || operation === "slice" || operation === "indexOf" || operation === "lastIndexOf" || operation === "replace" || operation === "replaceAll" || operation === "repeat" || operation === "padStart" || operation === "padEnd" || operation === "codePointAt" || operation === "map" || operation === "filter" || operation === "find" || operation === "findIndex" || operation === "some" || operation === "every" || operation === "flatMap" || operation === "forEach" || operation === "reduce" || operation === "join" || operation === "includes";
  if ((kind === "collectionRead")) return operation === "get" || operation === "has";
  if ((kind === "collectionItems")) return operation === "keys" || operation === "values" || operation === "entries";
  if ((kind === "optionalPredicate")) return operation === "isInteger" || operation === "isSafeInteger" || operation === "isFinite" || operation === "isNaN";
  return false;
}

/** @param {string} label @returns {boolean} */
export function acceptProgramReferenceField(label) {
  return label === "binding reference" || label === "declaration reference" || label === "data type declaration reference" || label === "constructor declaration reference" || label === "datatype declaration reference";
}

/** @param {string} name @returns {boolean} */
export function isUnsafeProgramField(name) {
  return name === "__proto__" || name === "constructor" || name === "prototype";
}

/** @param {string} term @param {string} revision @param {string} arity @returns {boolean} */
export function acceptProgramSchemaRoot(term, revision, arity) {
  return term === "typed program" && revision === "1" && arity === "1";
}

/** @param {string} width @returns {boolean} */
export function acceptProgramMachineIntegerWidth(width) {
  return width === "8" || width === "16" || width === "32" || width === "64" || width === "128";
}

/** @param {string} absence @returns {boolean} */
export function acceptProgramOptionalAbsence(absence) {
  return absence === "null" || absence === "undefined" || absence === "both";
}

/** @param {string} rounding @returns {boolean} */
export function acceptProgramDivisionRounding(rounding) {
  return rounding === "trunc" || rounding === "euclid" || rounding === "floor";
}
