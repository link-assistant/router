import {
  charClassItems,
  codePoint,
  decorateEmitted,
  emitReport,
  finishLines,
  hex4,
  renderRuleLine,
  unsupportedError,
} from './common.js';
import { ruleDoc } from './structural.js';

const FORMAT = 'gbnf';
const GBNF_RULE_TEMPLATE = '{name} ::= {body}';
const ANY_CHAR_CLASS = String.raw`[\x00-\U0010FFFF]`;
const CHOICE = 0;
const SEQUENCE = 1;
const POSTFIX = 2;
const ATOM = 3;

/**
 * Emits GGML BNF text for grammar-constrained LLM decoding.
 *
 * The output is deterministic, starts with the mandatory GBNF `root` rule, and
 * uses GBNF's native alternation, grouping, character classes, and counted
 * repetition. `any` is emitted as the full Unicode scalar class
 * `[\x00-\U0010FFFF]`, and `!class any` / `!"c" any` fold into a negated
 * class. Rule and reference names are sanitized to GBNF identifiers, with
 * renames recorded in the report. Throws `GrammarEmitError` for lookahead
 * predicates, empty choices or classes, descending ranges, invalid repeat
 * bounds, or a configured start rule that is not in the grammar. Rule
 * documentation is written as `#` comment lines above the rule, as
 * `importGbnf` reads it, with a note when it would not read back verbatim.
 */
export function emitGbnf(grammar, options = {}) {
  return decorateEmitted('gbnf', writeGbnf(grammar), options.decorators);
}

function writeGbnf(grammar) {
  const report = emitReport();
  const rules = [...grammar.rules.values()];
  if (rules.length === 0) return { source: '', report };

  const startIndex = grammar.start === null
    ? 0
    : rules.findIndex((rule) => rule.name === grammar.start);
  if (startIndex < 0) {
    throw unsupportedError(FORMAT, 'configured start rule is not present in the grammar');
  }

  const emitter = new GbnfEmitter(report, namePlan(grammar, rules[startIndex].name, report));
  const lines = [
    ...docComments(grammar, rules[startIndex], report),
    renderRuleLine(
      GBNF_RULE_TEMPLATE,
      'root',
      emitter.emitExpression(rules[startIndex].expression, CHOICE),
    ),
  ];
  rules.forEach((rule, index) => {
    if (index === startIndex) return;
    lines.push(...docComments(grammar, rule, report));
    lines.push(renderRuleLine(
      GBNF_RULE_TEMPLATE,
      emitter.nameFor(rule.name),
      emitter.emitExpression(rule.expression, CHOICE),
    ));
  });
  return { source: finishLines(lines), report };
}

/**
 * The `#` comment lines that `importGbnf` reads back as the rule's
 * documentation: each documentation line, prefixed with `# ` unless it
 * already is a comment.
 */
function docComments(grammar, rule, report) {
  const doc = ruleDoc(grammar, rule);
  if (doc === null) return [];
  const lines = doc.split('\n').map((line) => (line.startsWith('#') ? line : `# ${line}`));
  const reimported = lines.map((line) => line.trim()).join('\n');
  if (lines.some((line) => /[\r\n]/u.test(line)) || reimported !== doc) {
    report.lossy.push(`GBNF re-imports the documentation of rule ${rustStringDebug(rule.name)} as ${rustStringDebug(reimported)}`);
  }
  return lines;
}

class GbnfEmitter {
  constructor(report, names) {
    this.report = report;
    this.names = names;
  }

  nameFor(source) {
    return this.names.get(source) ?? source;
  }

  emitExpression(expression, parent) {
    let text;
    let precedence = ATOM;
    switch (expression.kind) {
      case 'empty': text = quoteTerminal(''); break;
      case 'literal': text = quoteTerminal(expression.value); break;
      case 'literalInsensitive':
        this.report.lossy.push(`GBNF expands case-insensitive terminal ${rustStringDebug(expression.value)} to character classes`);
        text = emitCaseInsensitiveTerminal(expression.value);
        precedence = SEQUENCE;
        break;
      case 'charRange': text = emitCharRange(expression.start, expression.end); break;
      case 'charClass': text = emitCharClass(expression.negated, charClassItems(FORMAT, expression)); break;
      case 'any': text = ANY_CHAR_CLASS; break;
      case 'ref': text = this.nameFor(expression.name); break;
      case 'choice': text = this.emitChoice(expression.ordered, expression.items); precedence = CHOICE; break;
      case 'seq': text = this.emitSequence(expression.items); precedence = SEQUENCE; break;
      case 'optional': text = `(${this.emitExpression(expression.item, CHOICE)})?`; precedence = POSTFIX; break;
      case 'repeat0': text = `(${this.emitExpression(expression.item, CHOICE)})*`; precedence = POSTFIX; break;
      case 'repeat1': text = `(${this.emitExpression(expression.item, CHOICE)})+`; precedence = POSTFIX; break;
      case 'repeat': text = this.emitRepeat(expression); precedence = POSTFIX; break;
      case 'and': throw unsupportedError(FORMAT, 'positive-predicate');
      case 'not': throw unsupportedError(FORMAT, 'negative-predicate');
      case 'capture':
        this.report.lossy.push(expression.label === null || expression.label === undefined
          ? 'GBNF dropped anonymous capture'
          : `GBNF dropped capture label ${rustStringDebug(expression.label)}`);
        // Captures are transparent: the inner expression keeps the parent context.
        return this.emitExpression(expression.item, parent);
      default: throw unsupportedError(FORMAT, expression.kind);
    }
    return precedence < parent ? `(${text})` : text;
  }

  emitChoice(ordered, alternatives) {
    if (alternatives.length === 0) throw unsupportedError(FORMAT, 'empty Choice');
    if (ordered) this.report.lossy.push('GBNF treats ordered choice as unordered choice');
    return alternatives.map((alternative) => this.emitExpression(alternative, CHOICE)).join(' | ');
  }

  emitSequence(items) {
    const emitted = [];
    for (let index = 0; index < items.length; index += 1) {
      const classItems = negatedClassPeephole(items, index);
      if (classItems !== null) {
        emitted.push(emitCharClass(true, classItems));
        index += 1;
        continue;
      }
      const text = this.emitExpression(items[index], SEQUENCE);
      if (text !== '') emitted.push(text);
    }
    return emitted.length === 0 ? quoteTerminal('') : emitted.join(' ');
  }

  emitRepeat({ item, min, max }) {
    if (max !== null && max !== undefined && max < min) {
      throw unsupportedError(FORMAT, `Repeat with min ${min} greater than max Some(${max})`);
    }
    const inner = this.emitExpression(item, CHOICE);
    if (max === null || max === undefined) return `(${inner}){${min},}`;
    return min === max ? `(${inner}){${min}}` : `(${inner}){${min},${max}}`;
  }
}

/**
 * Maps every rule and referenced name to a unique GBNF identifier: the start
 * rule becomes `root`, and every other name is sanitized and de-duplicated in
 * rule order, then sorted reference order, recording each rename as lossy.
 */
function namePlan(grammar, startName, report) {
  const defined = new Set(grammar.ruleNames());
  const references = [...new Set(collectReferences(grammar))].sort(compareCodePoints);
  const symbols = [...new Set([...grammar.ruleNames(), ...references])];
  const used = new Set(['root']);
  const names = new Map([[startName, 'root']]);
  for (const symbol of symbols) {
    if (symbol === startName) continue;
    const emitted = uniqueIdentifier(sanitizeIdentifier(symbol), used);
    if (emitted !== symbol) {
      const kind = defined.has(symbol) ? 'rule' : 'non-terminal reference';
      report.lossy.push(`GBNF renamed ${kind} ${rustStringDebug(symbol)} to ${rustStringDebug(emitted)}`);
    }
    names.set(symbol, emitted);
  }
  return names;
}

function collectReferences(grammar) {
  const names = [];
  const visit = (expression) => {
    if (expression.kind === 'ref') names.push(expression.name);
    if (expression.kind === 'seq' || expression.kind === 'choice') expression.items.forEach(visit);
    if (expression.item) visit(expression.item);
  };
  for (const rule of grammar.rules.values()) visit(rule.expression);
  return names;
}

function uniqueIdentifier(base, used) {
  let candidate = base;
  for (let suffix = 1; used.has(candidate); suffix += 1) candidate = `${base}-${suffix}`;
  used.add(candidate);
  return candidate;
}

function sanitizeIdentifier(source) {
  let output = '';
  for (const character of source) {
    const sanitized = /^[A-Za-z0-9]$/.test(character) ? character : '-';
    if (sanitized !== '-' || !output.endsWith('-')) output += sanitized;
  }
  output = output.replace(/^-+|-+$/g, '');
  if (output === '') output = 'ml';
  return /^[A-Za-z]/.test(output) ? output : `ml-${output}`;
}

// `!class any` and `!"c" any` are the PEG spelling of a negated class.
function negatedClassPeephole(items, index) {
  if (items[index]?.kind !== 'not' || items[index + 1]?.kind !== 'any') return null;
  const inner = items[index].item;
  if (inner.kind === 'charClass' && !inner.negated && Array.isArray(inner.items)) {
    return inner.items;
  }
  if (inner.kind === 'literal' && [...inner.value].length === 1) {
    return [{ kind: 'char', value: inner.value }];
  }
  return null;
}

function emitCaseInsensitiveTerminal(value) {
  if (value === '') return quoteTerminal('');
  return [...value].map((character) => (/^[A-Za-z]$/.test(character)
    ? `[${character.toUpperCase()}${character.toLowerCase()}]`
    : quoteTerminal(character))).join('');
}

function emitCharRange(start, end) {
  validateRange('CharRange', start, end);
  return `[${escapeClassChar(start)}-${escapeClassChar(end)}]`;
}

function emitCharClass(negated, items) {
  if (items.length === 0) throw unsupportedError(FORMAT, 'empty CharClass');
  const content = items.map((item) => {
    if (item.kind !== 'range') return escapeClassChar(item.value);
    validateRange('CharClass range', item.start, item.end);
    return `${escapeClassChar(item.start)}-${escapeClassChar(item.end)}`;
  }).join('');
  return `[${negated ? '^' : ''}${content}]`;
}

function validateRange(construct, start, end) {
  const first = codePoint(start);
  const last = codePoint(end);
  if (first > last) {
    throw unsupportedError(
      FORMAT,
      `${construct} has descending bounds U+${hex4(first)}..=U+${hex4(last)}`,
    );
  }
}

function quoteTerminal(value) {
  return `"${[...value].map(escapeStringChar).join('')}"`;
}

const COMMON_ESCAPES = { '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t', '\b': '\\b', '\f': '\\f' };
const STRING_ESCAPES = { ...COMMON_ESCAPES, '"': '\\"' };
const CLASS_ESCAPES = { ...COMMON_ESCAPES, '[': '\\[', ']': '\\]', '-': '\\-', '^': '\\^' };

function escapeStringChar(character) {
  return STRING_ESCAPES[character] ?? escapeControl(character);
}

function escapeClassChar(value) {
  const character = String(value);
  return CLASS_ESCAPES[character] ?? escapeControl(character);
}

function escapeControl(character) {
  if (!/^\p{Cc}$/u.test(character)) return character;
  const point = codePoint(character);
  const hex = point.toString(16).toUpperCase();
  if (point <= 0xff) return `\\x${hex.padStart(2, '0')}`;
  return point <= 0xffff ? `\\u${hex.padStart(4, '0')}` : `\\U${hex.padStart(8, '0')}`;
}

// Rust sorts `BTreeSet<String>` by UTF-8 bytes, which is code point order.
function compareCodePoints(left, right) {
  const leftPoints = [...left];
  const rightPoints = [...right];
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    const difference = codePoint(leftPoints[index]) - codePoint(rightPoints[index]);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

/** Rust `{:?}` rendering of a string, so report notes match across runtimes. */
function rustStringDebug(value) {
  let output = '"';
  for (const character of String(value)) {
    const escape = DEBUG_ESCAPES[character];
    if (escape !== undefined) output += escape;
    else if (character !== ' ' && RUST_DEBUG_ESCAPED.test(character)) {
      output += `\\u{${codePoint(character).toString(16)}}`;
    } else {
      output += character;
    }
  }
  return `${output}"`;
}

const DEBUG_ESCAPES = { '\0': '\\0', '\t': '\\t', '\r': '\\r', '\n': '\\n', '\\': '\\\\', '"': '\\"' };

// Grapheme extenders and the categories Rust's `is_printable` rejects.
const RUST_DEBUG_ESCAPED =
  /^[\p{Grapheme_Extend}\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}]$/u;
