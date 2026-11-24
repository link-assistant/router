// Frontend decisions expressed in JavaScript and translated into Rust by
// js/scripts/generate-frontend-rules.mjs. Inputs use code units and token
// records so both host runtimes can use the same decisions.

/** @typedef {{ $: 'scalar', code: number, end: number } | { $: 'malformed' } | { $: 'unsupported', end: number, escapeLength: number }} UnicodeEscape */

/**
 * Read one Unicode or hexadecimal escape from at most twelve UTF-16 code units, starting
 * with its backslash. Offsets in the result are relative to that backslash.
 * @param {number[]} units
 * @param {boolean} allowFixed
 * @returns {UnicodeEscape}
 */
export function decodeUnicodeEscape(units, allowFixed) {
  if (units.length < 2 || units[0] !== 92 || (units[1] !== 117 && units[1] !== 120)) return { $: 'malformed' };
  let fixed = 4;
  if (units[1] === 120) {
    if (!allowFixed) return { $: 'malformed' };
    fixed = 2;
  }
  let index = 2;
  let code = 0;
  let digits = 0;
  let braced = false;
  if (fixed === 4 && units.length > 2 && units[2] === 123) {
    braced = true;
    index = 3;
  } else if (!allowFixed) return { $: 'malformed' };
  while (index < units.length && digits < (braced ? 6 : fixed)) {
    const unit = units[index];
    let digit = -1;
    if (unit >= 48 && unit <= 57) digit = unit - 48;
    else if (unit >= 65 && unit <= 70) digit = unit - 55;
    else if (unit >= 97 && unit <= 102) digit = unit - 87;
    if (digit < 0) break;
    code = code * 16 + digit;
    digits += 1;
    index += 1;
  }
  if (braced) {
    if (digits === 0 || index >= units.length || units[index] !== 125) return { $: 'malformed' };
    index += 1;
  } else if (digits !== fixed) return { $: 'malformed' };
  const escapeLength = index;
  if (!braced && code >= 55296 && code <= 56319 && units.length >= index + 6 && units[index] === 92 && units[index + 1] === 117) {
    let low = 0;
    let offset = 2;
    while (offset < 6) {
      const unit = units[index + offset];
      let digit = -1;
      if (unit >= 48 && unit <= 57) digit = unit - 48;
      else if (unit >= 65 && unit <= 70) digit = unit - 55;
      else if (unit >= 97 && unit <= 102) digit = unit - 87;
      if (digit < 0) break;
      low = low * 16 + digit;
      offset += 1;
    }
    if (offset === 6 && low >= 56320 && low <= 57343) {
      code = 65536 + (code - 55296) * 1024 + low - 56320;
      index += 6;
    }
  }
  if (code > 1114111 || (code >= 55296 && code <= 57343)) return { $: 'unsupported', end: index, escapeLength };
  return { $: 'scalar', code, end: index };
}

/**
 * Whether every omitted argument has a trailing default.
 * @param {boolean[]} defaults
 * @param {number} count
 * @returns {boolean}
 */
export function acceptArgumentCount(defaults, count) {
  if (count > defaults.length) return false;
  let index = count;
  while (index < defaults.length) {
    if (!defaults[index]) return false;
    index += 1;
  }
  return true;
}

/**
 * Find a reference to an earlier parameter in a default expression. Member
 * names after a dot are not references, and nested delimiters keep commas
 * and closing parentheses inside the expression.
 * @param {string[]} kinds
 * @param {string[]} values
 * @param {string[]} parameters
 * @returns {number}
 */
export function findDefaultParameterReference(kinds, values, parameters) {
  let at = 0;
  let depth = 0;
  while (at < values.length && kinds[at] !== 'eof' && (depth > 0 || (values[at] !== ',' && values[at] !== ')'))) {
    const value = values[at];
    if (value === '(' || value === '[' || value === '{') depth += 1;
    if (value === ')' || value === ']' || value === '}') depth -= 1;
    if (kinds[at] === 'identifier' && !(at > 0 && values[at - 1] === '.')) {
      let parameterIndex = 0;
      while (parameterIndex < parameters.length) {
        if (parameters[parameterIndex] === value) return at;
        parameterIndex += 1;
      }
    }
    at += 1;
  }
  return -1;
}

/**
 * Whether a slash follows a token that starts an expression rather than one
 * that ends it. Comments are removed before this decision.
 * @param {string} kind
 * @param {string} value
 * @returns {boolean}
 */
export function startRegularExpression(kind, value) {
  if (kind === '') return true;
  if (kind === 'identifier') {
    return value === 'return' || value === 'throw' || value === 'case'
      || value === 'delete' || value === 'void' || value === 'typeof'
      || value === 'yield' || value === 'await' || value === 'in' || value === 'of'
      || value === 'else' || value === 'do';
  }
  if (kind !== 'punct') return false;
  return value !== ')' && value !== ']' && value !== '}' && value !== '.'
    && value !== '?.' && value !== '++' && value !== '--';
}

/** @param {string} kind @param {string} value @param {boolean} qualified @returns {boolean} */
export function acceptControlParenthesis(kind, value, qualified) {
  if (qualified || kind !== 'identifier') return false;
  return value === 'if' || value === 'while' || value === 'for'
    || value === 'with' || value === 'switch' || value === 'catch';
}

/**
 * Read a complete regular expression literal without interpreting its body
 * as numbers, strings or template literals. Offsets are UTF-16 code units.
 * @param {number[]} units
 * @param {number} start
 * @returns {number}
 */
export function regularExpressionEnd(units, start) {
  let index = start + 1;
  let escaped = false;
  let characterClass = false;
  while (index < units.length) {
    const unit = units[index];
    if (unit === 10 || unit === 13 || unit === 8232 || unit === 8233) return -1;
    if (escaped) escaped = false;
    else if (unit === 92) escaped = true;
    else if (unit === 91) characterClass = true;
    else if (unit === 93) characterClass = false;
    else if (unit === 47 && !characterClass) {
      index += 1;
      while (index < units.length) {
        const flag = units[index];
        if (!((flag >= 65 && flag <= 90) || (flag >= 97 && flag <= 122))) break;
        index += 1;
      }
      return index;
    }
    index += 1;
  }
  return -1;
}

/**
 * Find the end of a contiguous declaration run. Non-item groups supply an
 * empty term, so comments and provenance boundaries cannot be absorbed.
 * @param {string[]} terms
 * @param {number} start
 * @returns {number}
 */
export function findBindingRunEnd(terms, start) {
  let end = start;
  while (end < terms.length) {
    const term = terms[end];
    if (term !== 'function_declaration' && term !== 'lexical_declaration' && term !== 'export_statement') break;
    end += 1;
  }
  return end === start ? start + 1 : end;
}

/**
 * Retry a declaration run only when an isolated item failed type resolution.
 * @param {string[]} statuses
 * @param {string[]} reasons
 * @returns {boolean}
 */
export function acceptBindingScope(statuses, reasons) {
  if (statuses.length < 2) return false;
  for (let index = 0; index < statuses.length; index += 1) {
    if (statuses[index] === 'carried' && reasons[index] === 'type') return true;
  }
  return false;
}

/**
 * Immutable primitive literals have no identity, mutation or initialisation
 * effect, so their value can be read from a sibling function's scope.
 * @param {string} valueKind
 * @param {boolean} constant
 * @param {number} effectCount
 * @param {number} declarationCount
 * @returns {boolean}
 */
export function acceptLiteralBinding(valueKind, constant, effectCount, declarationCount) {
  return constant && effectCount === 1 && declarationCount === 0
    && (valueKind === 'num' || valueKind === 'bool' || valueKind === 'str');
}

/** @param {string} valueKind @param {string} typeKind @returns {string} */
export function constantBindingForm(valueKind, typeKind) {
  if (valueKind === 'lit' && (typeKind === 'float' || typeKind === 'bool' || typeKind === 'fixed')) return 'scalar';
  if (valueKind === 'lit' && typeKind === 'string') return 'string';
  return 'lazy';
}

/** @param {boolean} constant @param {number} effects @param {number} declarations @param {boolean} legalName @returns {boolean} */
export function acceptConstantEmission(constant, effects, declarations, legalName) {
  return constant && effects === 1 && declarations === 0 && legalName;
}

/** @param {string} form @param {string} name @param {string} type @param {string} value @returns {string} */
export function renderConstantBinding(form, name, type, value) {
  if (form === 'lazy') return 'pub static ' + name + ': std::sync::LazyLock<' + type + '> = std::sync::LazyLock::new(|| ' + value + ');';
  return 'pub const ' + name + ': ' + type + ' = ' + value + ';';
}

/**
 * Retry a complete declaration module when isolated groups still carry items.
 * Imports, statements and provenance blocks need other binding mechanisms.
 * @param {string[]} terms
 * @param {boolean} carried
 * @returns {boolean}
 */
export function acceptModuleBindingScope(terms, carried) {
  if (!carried) return false;
  let declarations = 0;
  for (let index = 0; index < terms.length; index += 1) {
    const term = terms[index];
    if (term !== '') {
      if (term !== 'function_declaration' && term !== 'lexical_declaration' && term !== 'export_statement') return false;
      declarations += 1;
    }
  }
  return declarations > 0;
}

/**
 * Locate an ASCII parameter name after JSDoc whitespace and an optional `[`.
 * The documented default is metadata; only the function supplies defaults.
 * @param {number[]} units
 * @returns {number[]}
 */
export function findDocumentationParameterRange(units) {
  let start = 0;
  while (start < units.length && (units[start] === 32 || units[start] === 9)) start += 1;
  let optional = false;
  if (start < units.length && units[start] === 91) {
    optional = true;
    start += 1;
  }
  let end = start;
  while (end < units.length) {
    const code = units[end];
    if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122) || code === 95 || code === 36 || (end > start && code >= 48 && code <= 57)) end += 1;
    else break;
  }
  if (end === start) return [];
  if (optional) {
    let after = end;
    while (after < units.length && (units[after] === 32 || units[after] === 9)) after += 1;
    if (after >= units.length || (units[after] !== 93 && units[after] !== 61)) return [];
  }
  return [start, end];
}

/** @param {string} kind @returns {boolean} */
export function acceptTypeQueryOperand(kind) {
  return kind === 'var' || kind === 'lit' || kind === 'name' || kind === 'num' || kind === 'bool' || kind === 'str';
}

/** @param {string} kind @returns {string} */
export function readTypeQueryResult(kind) {
  if (kind === 'float') return 'number';
  if (kind === 'nat' || kind === 'int') return 'bigint';
  if (kind === 'bool') return 'boolean';
  if (kind === 'string') return 'string';
  if (kind === 'array' || kind === 'data') return 'object';
  return '';
}

/** @param {string} method @returns {string} */
export function readArrayMethodForm(method) {
  if (method === 'concat') return 'concatenate';
  if (method === 'slice') return 'copy';
  if (method === 'Array.from') return 'copy-from';
  if (method === 'Array.of') return 'construct';
  return '';
}

/** @param {string} term @param {boolean} hasChildren @param {boolean} hasContent @returns {boolean} */
export function acceptRootSyntaxItem(term, hasChildren, hasContent) {
  return term === 'ERROR' && !hasChildren && hasContent;
}

/** @param {boolean} sourceMatches @param {boolean} bodyMatches @param {boolean} layoutOnly @returns {boolean} */
export function acceptSourcePrefixRestoration(sourceMatches, bodyMatches, layoutOnly) {
  return sourceMatches && bodyMatches && layoutOnly;
}

/** @param {boolean} constant @param {boolean} literal @returns {boolean} */
export function acceptDeclarationSignature(constant, literal) {
  return !constant || literal;
}

/** @param {string} language @param {string} method @returns {string} */
export function readStringTestOperation(language, method) {
  if (language === 'JavaScript') {
    if (method === 'startsWith' || method === 'endsWith' || method === 'includes') return method;
    return '';
  }
  if (language === 'Rust') {
    if (method === 'starts_with') return 'startsWith';
    if (method === 'ends_with') return 'endsWith';
    if (method === 'contains') return 'includes';
    return '';
  }
  return '';
}

/** @param {string} target @param {string} operation @param {string} object @param {string} search @returns {string} */
export function renderStringTestExpression(target, operation, object, search) {
  if (target === 'JavaScript') return object + '.' + operation + '(' + search + ')';
  if (target === 'Rust') {
    let method = '';
    if (operation === 'startsWith') method = 'starts_with';
    if (operation === 'endsWith') method = 'ends_with';
    if (operation === 'includes') method = 'contains';
    return object + '.' + method + '(' + search + ')';
  }
  if (target === 'Lean') {
    if (operation === 'includes') return '(ml_string_includes ' + object + ' ' + search + ')';
    return '(String.' + operation + ' ' + object + ' ' + search + ')';
  }
  let helper = '';
  if (operation === 'startsWith') helper = 'ml_string_starts_with';
  if (operation === 'endsWith') helper = 'ml_string_ends_with';
  if (operation === 'includes') helper = 'ml_string_includes';
  return '(' + helper + ' ' + object + ' ' + search + ')';
}

/** @param {string} target @param {string} operation @returns {string} */
export function readStringTestHelper(target, operation) {
  if (target === 'Lean') {
    if (operation === 'includes') return 'stringIncludes';
    return '';
  }
  if (target === 'Rocq') {
    if (operation === 'startsWith') return 'stringStartsWith';
    if (operation === 'endsWith') return 'stringEndsWith';
    if (operation === 'includes') return 'stringIncludes';
    return '';
  }
  return '';
}

/** @param {string} target @param {string} operation @returns {string} */
export function readStringTestSupport(target, operation) {
  if (target === "Lean" && operation === "includes") return "/-- String.prototype.includes: the search occurs at some position of the string. -/\ndef ml_string_includes (string search : String) : Bool :=\n  (List.range (string.length + 1)).any fun index => (string.drop index).startsWith search";
  if (target === "Rocq" && operation === "startsWith") return "(* String.prototype.startsWith: the string begins with the search. *)\nDefinition ml_string_starts_with (string search : string) : bool := String.prefix search string.";
  if (target === "Rocq" && operation === "endsWith") return "(* String.prototype.endsWith: the string ends with the search. *)\nDefinition ml_string_ends_with (string search : string) : bool :=\n  Nat.leb (String.length search) (String.length string) &&\n  String.eqb (String.substring (String.length string - String.length search) (String.length search) string) search.";
  if (target === "Rocq" && operation === "includes") return "(* String.prototype.includes: the search occurs at some position of the string. *)\nDefinition ml_string_includes (string search : string) : bool :=\n  match String.index 0 search string with Some _ => true | None => false end.";
  return '';
}

/** @param {string} language @param {string} method @returns {string} */
export function readStringMapOperation(language, method) {
  if (language === 'JavaScript') {
    if (method === 'toLowerCase' || method === 'toUpperCase' || method === 'trim' || method === 'trimStart' || method === 'trimEnd') return method;
    return '';
  }
  if (language === 'Rust') {
    if (method === 'to_lowercase') return 'toLowerCase';
    if (method === 'to_uppercase') return 'toUpperCase';
    return '';
  }
  return '';
}

/** @param {string} target @param {string} operation @param {string} object @returns {string} */
export function renderStringMapExpression(target, operation, object) {
  if (target === 'JavaScript') return object + '.' + operation + '()';
  if (operation === 'toLowerCase') return object + '.to_lowercase()';
  if (operation === 'toUpperCase') return object + '.to_uppercase()';
  let method = '';
  if (operation === 'trim') method = 'trim_matches';
  if (operation === 'trimStart') method = 'trim_start_matches';
  if (operation === 'trimEnd') method = 'trim_end_matches';
  return object + '.' + method + "(|c: char| (c.is_whitespace() && c != '\\u{85}') || c == '\\u{feff}').to_string()";
}

/** @param {string} target @param {string} operation @returns {string} */
export function readStringMapRefusal(target, operation) {
  if (operation === 'trim' || operation === 'trimStart' || operation === 'trimEnd') return 'JavaScript whitespace trimming has no ' + target + ' library counterpart; ' + target + ' trims ASCII whitespace only';
  return 'Unicode case mapping has no ' + target + ' library counterpart; ' + target + ' maps ASCII letters only';
}

/** @param {string} kind @param {boolean} constantReference @returns {boolean} */
export function acceptCheckedTypeQueryOperand(kind, constantReference) {
  return acceptTypeQueryOperand(kind) || (kind === 'call' && constantReference);
}
/**
 * Classifies leaves while looking backwards for a lexed continuation.
 * Virtual scanner tokens retain the last actual token encountered.
 * @param {boolean} widthless
 * @param {boolean} startsAfter
 * @param {boolean} endsAfter
 * @returns {number}
 */
export function readScannerContinuationAction(widthless, startsAfter, endsAfter) {
  if (widthless) return 0;
  if (startsAfter && endsAfter) return 1;
  return -1;
}

/** @param {boolean} sourceMatches @param {boolean} bodyMatches @param {boolean} originalMatches @returns {boolean} */
export function acceptSourceEnvelopeRestoration(sourceMatches, bodyMatches, originalMatches) {
  return sourceMatches && bodyMatches && originalMatches;
}

/** @param {string} form @param {boolean} hasArguments @param {boolean} hasSingleArgument @returns {boolean} */
export function acceptArrayMethodArguments(form, hasArguments, hasSingleArgument) {
  return form === 'concatenate' || form === 'construct' || (form === 'copy' && !hasArguments) || (form === 'copy-from' && hasSingleArgument);
}

/**
 * Count UTF-16 code units rather than UTF-8 bytes or Unicode scalars.
 * Each target expression evaluates its receiver once.
 * @param {string} target @param {string} object @returns {string}
 */
export function renderStringLengthExpression(target, object) {
  if (target === 'JavaScript') return object + '.length';
  if (target === 'Rust') return '(' + object + '.encode_utf16().count() as f64)';
  if (target === 'Lean') return '(Float.ofNat (String.foldl (fun (count : Nat) c => count + (if c.toNat > 65535 then 2 else 1)) 0 ' + object + '))';
  return '(PrimFloat.of_uint63 (Uint63.of_Z (Z.of_nat ((fix ml_utf16_length (s : string) : nat := match s with EmptyString => 0%nat | String c rest => ((if Nat.ltb (Ascii.nat_of_ascii c) 128 then 1 else if Nat.ltb (Ascii.nat_of_ascii c) 192 then 0 else if Nat.ltb (Ascii.nat_of_ascii c) 240 then 1 else 2) + ml_utf16_length rest)%nat end) ' + object + '))))';
}
