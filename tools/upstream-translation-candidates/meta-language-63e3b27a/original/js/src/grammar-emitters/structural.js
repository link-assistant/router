// Mirrors rust/src/grammar/emit/structural.rs: helpers shared by the ANTLR and
// Lark emitters. Both notations impose case conventions on rule names, group
// alternatives and sequences the same way, and are re-imported by importers
// that flatten nested sequences and unordered choices. The helpers keep
// emitted text stable under that normalisation and reproduce the Rust
// standard-library behaviour (`{:?}`, `trim`, char classification) that the
// emitted text and fidelity notes depend on.

import { codePoint, unsupportedError } from './common.js';

/** Largest number of operand copies a counted repetition may expand to. */
export const MAX_REPEAT_COPIES = 256;

/** Binding strength of an emitted expression, weakest first. */
export const Precedence = Object.freeze({
  CHOICE: 0,
  SEQUENCE: 1,
  LABELED: 2,
  POSTFIX: 3,
  PREFIX: 4,
  ATOM: 5,
});

/** Wraps `text` in a group when it binds more weakly than `parent` requires. */
export function wrap([text, precedence], parent) {
  return precedence < parent ? `(${text})` : text;
}

/** Joins sequence items, splicing nested sequences and skipping empty items. */
export function joinSequence(items) {
  const parts = items.filter(([text]) => text !== '');
  if (parts.length === 0) return ['', Precedence.SEQUENCE];
  if (parts.length === 1) return parts[0];
  return [
    parts.map((part) => (part[1] === Precedence.SEQUENCE ? part[0] : wrap(part, Precedence.LABELED)))
      .join(' '),
    Precedence.SEQUENCE,
  ];
}

/** Joins choice alternatives; an all-empty choice renders as the empty expression. */
export function joinChoice(alternatives) {
  if (alternatives.every(([text]) => text === '')) return ['', Precedence.SEQUENCE];
  if (alternatives.length === 1) return alternatives[0];
  let output = '';
  alternatives.forEach(([text], index) => {
    if (index > 0) {
      if (output !== '') output += ' ';
      output += '|';
    }
    if (text !== '') {
      if (output !== '') output += ' ';
      output += text;
    }
  });
  return [output, Precedence.CHOICE];
}

/** Lowers a counted repetition to copies, nested optionals and a trailing one-or-more loop. */
export function lowerRepeat(format, expression, min, max) {
  checkRepeatBounds(format, min, max);
  const copies = max ?? min;
  if (copies > MAX_REPEAT_COPIES) {
    throw unsupportedError(
      format,
      `counted repetition ${repeatBounds(min, max)} expands to ${copies} copies`,
    );
  }
  const items = [];
  if (max === null || max === undefined) {
    if (min === 0) return { kind: 'repeat0', item: expression };
    for (let count = 0; count < min - 1; count += 1) items.push(expression);
    items.push({ kind: 'repeat1', item: expression });
  } else {
    for (let count = 0; count < min; count += 1) items.push(expression);
    let tail = null;
    for (let count = min; count < max; count += 1) {
      tail = { kind: 'optional', item: tail === null ? expression : { kind: 'seq', items: [expression, tail] } };
    }
    if (tail !== null) items.push(tail);
  }
  if (items.length === 0) return { kind: 'empty' };
  if (items.length === 1) return items[0];
  return { kind: 'seq', items };
}

/** Rejects repetitions whose maximum is below their minimum. */
export function checkRepeatBounds(format, min, max) {
  if (max !== null && max !== undefined && max < min) {
    throw unsupportedError(format, `repeat maximum ${max} is below minimum ${min}`);
  }
}

/** Renders repetition bounds as `{min,max}` or `{min,}`. */
export function repeatBounds(min, max) {
  return max === null || max === undefined ? `{${min},}` : `{${min},${max}}`;
}

/** Returns `[negated, items]` of a single-character set, when `expression` can be written as one. */
export function charSetItems(format, expression) {
  switch (expression.kind) {
    case 'charClass': {
      const items = classItems(format, expression);
      return items.length === 0 ? null : [Boolean(expression.negated), items];
    }
    case 'charRange':
      return codePoint(expression.start) <= codePoint(expression.end)
        ? [false, [{ kind: 'range', start: expression.start, end: expression.end }]]
        : null;
    case 'literal': {
      const characters = [...expression.value];
      return characters.length === 1 ? [false, [{ kind: 'char', value: characters[0] }]] : null;
    }
    default:
      return null;
  }
}

/** Returns the complemented set for `!set` followed by any character. */
export function negatedLookaheadSet(format, items, index) {
  if (items[index]?.kind !== 'not' || items[index + 1]?.kind !== 'any') return null;
  const set = charSetItems(format, items[index].item);
  return set === null ? null : [!set[0], set[1]];
}

/** Character class items, rejecting raw (pattern-only) classes like the other emitters. */
export function classItems(format, expression) {
  if (!Array.isArray(expression.items)) throw unsupportedError(format, 'raw CharClass pattern');
  return expression.items;
}

/** Returns the case variants of `character` when it is a cased letter. */
export function caseVariants(character) {
  const lower = [...character.toLowerCase()];
  const upper = [...character.toUpperCase()];
  if (lower.length !== 1 || upper.length !== 1) return null;
  if (lower[0] === upper[0]) return null;
  const variants = [lower[0], upper[0]];
  if (character !== lower[0] && character !== upper[0]) variants.push(character);
  return variants;
}

/** Collects non-terminal references in `expression`, in first-use order. */
export function collectReferences(expression, names = []) {
  switch (expression.kind) {
    case 'ref':
      if (!names.includes(expression.name)) names.push(expression.name);
      break;
    case 'choice':
    case 'seq':
      for (const item of expression.items) collectReferences(item, names);
      break;
    case 'optional': case 'repeat0': case 'repeat1': case 'and': case 'not':
    case 'repeat': case 'capture':
      collectReferences(expression.item, names);
      break;
    default:
      break;
  }
  return names;
}

/** Emitted names for every rule and every undefined non-terminal reference. */
export class NamePlan {
  /**
   * `candidates` holds one conventional name per rule. Rules listed in `fixed`
   * keep their candidate verbatim; other rules whose candidate is their own
   * name are reserved next, and the remaining rules receive `_2`, `_3`, ...
   * suffixes in rule order when their candidate is taken. Undefined
   * references are mapped through `reference` and made unique the same way.
   */
  constructor(grammar, label, candidates, fixed, reference, report) {
    const rules = [...grammar.rules.values()];
    const used = new Set();
    const names = rules.map(() => null);
    for (const index of [...fixed].sort((left, right) => left - right)) {
      used.add(candidates[index]);
      names[index] = candidates[index];
    }
    rules.forEach((rule, index) => {
      if (names[index] === null && candidates[index] === rule.name && !used.has(candidates[index])) {
        used.add(candidates[index]);
        names[index] = candidates[index];
      }
    });
    names.forEach((name, index) => {
      if (name === null) {
        const unique = uniqueName(candidates[index], used);
        used.add(unique);
        names[index] = unique;
      }
    });
    this.ruleNames = names;
    this.bySource = new Map();
    rules.forEach((rule, index) => {
      const emitted = names[index];
      if (rule.name !== emitted) {
        report.lossy.push(`${label} renamed rule ${rustDebugString(rule.name)} to ${rustDebugString(emitted)}`);
      }
      if (!this.bySource.has(rule.name)) this.bySource.set(rule.name, emitted);
    });
    for (const source of undefinedNonterminals(grammar)) {
      const emitted = uniqueName(reference(source), used);
      used.add(emitted);
      if (emitted !== source) {
        report.lossy.push(`${label} renamed non-terminal reference ${rustDebugString(source)} to ${rustDebugString(emitted)}`);
      }
      this.bySource.set(source, emitted);
    }
  }

  /** Returns the emitted name of the rule at `index`. */
  ruleName(index) {
    return this.ruleNames[index];
  }

  /** Returns the emitted name for a source rule or reference name. */
  resolve(name) {
    return this.bySource.get(name) ?? name;
  }
}

function uniqueName(candidate, used) {
  if (!used.has(candidate)) return candidate;
  for (let suffix = 2; ; suffix += 1) {
    const name = `${candidate}_${suffix}`;
    if (!used.has(name)) return name;
  }
}

/** Undefined references in code-point order, like Rust's `BTreeSet<String>`. */
function undefinedNonterminals(grammar) {
  const names = [];
  for (const rule of grammar.rules.values()) collectReferences(rule.expression, names);
  return names.filter((name) => !grammar.rules.has(name)).sort(compareCodePoints);
}

export function compareCodePoints(left, right) {
  const leftPoints = [...left];
  const rightPoints = [...right];
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    const difference = codePoint(leftPoints[index]) - codePoint(rightPoints[index]);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

/** Replaces characters outside `[A-Za-z0-9_]` with `_`. */
export function asciiIdentifier(name) {
  return [...name].map((character) => (/^[A-Za-z0-9_]$/.test(character) ? character : '_')).join('');
}

/** Converts `camelCase` and `PascalCase` names to lower `snake_case`. */
export function snakeCase(name) {
  let output = '';
  let previous = null;
  for (const character of name) {
    if (isAsciiUpper(character)) {
      if (previous !== null && (isAsciiLower(previous) || isAsciiDigit(previous))) output += '_';
      output += character.toLowerCase();
    } else if (/^[A-Za-z0-9_]$/.test(character)) {
      output += character;
    } else {
      output += '_';
    }
    previous = character;
  }
  return output;
}

/** Splits documentation into trimmed lines, skipping blank lines (Rust `lines()` + `trim`). */
export function docLines(text) {
  return text.split('\n').map(rustTrim).filter((line) => line !== '');
}

export function isAsciiUpper(character) {
  return character !== undefined && character >= 'A' && character <= 'Z' && character.length === 1;
}

export function isAsciiLower(character) {
  return character !== undefined && character >= 'a' && character <= 'z' && character.length === 1;
}

export function isAsciiDigit(character) {
  return character !== undefined && character >= '0' && character <= '9' && character.length === 1;
}

export function isAsciiAlphabetic(character) {
  return isAsciiUpper(character) || isAsciiLower(character);
}

/** Rust `str::trim`: strips Unicode `White_Space` (JS `trim` also strips U+FEFF). */
export function rustTrim(value) {
  return value.replace(/^\p{White_Space}+|\p{White_Space}+$/gu, '');
}

/** Rust `char::is_control`. */
export function isControl(character) {
  return /^\p{Cc}$/u.test(character);
}

/** Rust `char::is_whitespace`. */
export function isWhitespace(character) {
  return /^\p{White_Space}$/u.test(character);
}

// Grapheme extenders and the categories Rust's `is_printable` rejects; Rust's
// `{:?}` writes these as `\u{...}` (space excepted).
const RUST_DEBUG_ESCAPED = /^[\p{Grapheme_Extend}\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u;

function rustDebugChar(character, quote) {
  switch (character) {
    case '\0': return '\\0';
    case '\t': return '\\t';
    case '\r': return '\\r';
    case '\n': return '\\n';
    case '\\': return '\\\\';
    default:
      if (character === quote) return `\\${quote}`;
      if (character !== ' ' && RUST_DEBUG_ESCAPED.test(character)) {
        return `\\u{${codePoint(character).toString(16)}}`;
      }
      return character;
  }
}

/** Rust `{:?}` of a `&str`. */
export function rustDebugString(value) {
  let output = '"';
  for (const character of String(value)) output += rustDebugChar(character, '"');
  return `${output}"`;
}

/** Rust `{:?}` of a `char`. */
export function rustDebugCharLiteral(character) {
  return `'${rustDebugChar(character, "'")}'`;
}

/** Rust `{:?}` of an `Option<String>`. */
export function rustDebugOption(value) {
  return value === null || value === undefined ? 'None' : `Some(${rustDebugString(value)})`;
}

/** Normalises JS rule kinds to the four Rust `RuleKind`s. */
export function ruleKind(rule) {
  switch (rule.kind) {
    case 'silent': return 'silent';
    case 'atomic': return 'atomic';
    case 'token': case 'terminal': return 'token';
    default: return 'normal';
  }
}

/** Rule documentation: ANTLR imports keep it on the rule, Lark imports in `grammar.ruleDocs`. */
export function ruleDoc(grammar, rule) {
  return rule.doc ?? grammar.ruleDocs?.get(rule.name) ?? null;
}
