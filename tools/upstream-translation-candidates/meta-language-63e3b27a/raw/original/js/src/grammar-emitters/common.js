import { decoratorSet } from '../decorators.js';

export const BNF_RULE_TEMPLATE = '<{name}> ::= {body}';
export const EBNF_RULE_TEMPLATE = '{name} = {body} ;';
export const ABNF_RULE_TEMPLATE = '{name} = {body}';
export const PEST_RULE_TEMPLATE = '{name} = {modifier}{{ {body} }}';

/** Error raised when a target notation cannot represent a grammar construct. */
export class GrammarEmitError extends Error {
  constructor(format, construct) {
    super(`${format} emit unsupported construct: ${construct}`);
    this.name = 'GrammarEmitError';
    this.format = format;
    this.kind = 'unsupported';
    this.construct = construct;
  }
}

export function unsupportedError(format, construct) {
  return new GrammarEmitError(format, construct);
}

/** Non-fatal fidelity notes, mirroring the Rust `EmitReport`. */
export function emitReport() {
  return { lossy: [] };
}

export function reportCaptureLoss(report, format, label) {
  report.lossy.push(label === null || label === undefined
    ? `${format} dropped anonymous capture`
    : `${format} dropped capture label ${debugString(label)}`);
}

export function renderRuleLine(template, name, body, modifier = '') {
  return template
    .replace(/\{\{|\}\}|\{\s*(name|modifier|body)\s*\}/g, (match, placeholder) => {
      if (match === '{{') return '{';
      if (match === '}}') return '}';
      return { name, modifier, body }[placeholder];
    });
}

export function finishLines(lines) {
  return lines.length === 0 ? '' : `${lines.join('\n')}\n`;
}

/** Start rule first, then the remaining rules in declaration order. */
export function orderedRules(grammar) {
  const rules = [...grammar.rules.values()];
  const startIndex = rules.findIndex((rule) => rule.name === grammar.start);
  if (grammar.start === null || startIndex < 0) return rules;
  return [rules[startIndex], ...rules.slice(0, startIndex), ...rules.slice(startIndex + 1)];
}

export function pegChoiceAlternatives(ordered, alternatives) {
  const indexed = alternatives.map((alternative, index) => ({ alternative, index }));
  if (!ordered && hasLiteralPrefixConflict(alternatives)) {
    indexed.sort((left, right) => requiredWidth(right.alternative) -
      requiredWidth(left.alternative) || left.index - right.index);
  }
  return indexed.map(({ alternative }) => alternative);
}

export function expandedChars(format, construct, start, end, maxChars) {
  const first = codePoint(start);
  const last = codePoint(end);
  if (first > last) {
    throw unsupportedError(
      format,
      `${construct} has descending bounds U+${hex4(first)}..=U+${hex4(last)}`,
    );
  }
  const span = last - first + 1;
  if (span > maxChars) throw unsupportedError(format, `${construct} expands to ${span} characters`);
  const characters = [];
  for (let value = first; value <= last; value += 1) {
    if (value < 0xd800 || value > 0xdfff) characters.push(String.fromCodePoint(value));
  }
  return characters;
}

/** Deterministic helper-production names shared by the BNF and EBNF emitters. */
export class HelperRules {
  constructor(grammar) {
    this.usedNames = new Set(grammar.ruleNames());
    this.namesByKey = new Map();
    this.entries = [];
    this.nextId = 0;
  }

  reserve(kind, key) {
    const qualified = `${kind}:${key}`;
    const existing = this.namesByKey.get(qualified);
    if (existing !== undefined) return [existing, false];
    let name;
    do {
      name = `ml${kind}${this.nextId}`;
      this.nextId += 1;
    } while (this.usedNames.has(name));
    this.usedNames.add(name);
    this.namesByKey.set(qualified, name);
    return [name, true];
  }

  push(name, body) {
    this.entries.push({ name, body });
  }
}

export function charClassItems(format, expression) {
  if (!Array.isArray(expression.items)) {
    throw unsupportedError(format, 'raw CharClass pattern');
  }
  return expression.items;
}

export function codePoint(value) {
  const point = String(value).codePointAt(0);
  if (point === undefined) throw new TypeError('grammar character must not be empty');
  return point;
}

export function hex4(value) {
  return value.toString(16).toUpperCase().padStart(4, '0');
}

/** Rust `{:?}` rendering of a string, used so fidelity notes match across runtimes. */
export function debugString(value) {
  let output = '"';
  for (const character of String(value)) {
    const point = codePoint(character);
    if (character === '"') output += '\\"';
    else if (character === '\\') output += '\\\\';
    else if (character === '\n') output += '\\n';
    else if (character === '\r') output += '\\r';
    else if (character === '\t') output += '\\t';
    else if (character === '\0') output += '\\0';
    else if (/\p{Cc}/u.test(character)) output += `\\u{${point.toString(16)}}`;
    else output += character;
  }
  return `${output}"`;
}

function requiredWidth(expression) {
  switch (expression.kind) {
    case 'empty': case 'and': case 'not': case 'optional': case 'repeat0': return 0;
    case 'literal': case 'literalInsensitive': return utf8Length(expression.value);
    case 'charRange': case 'charClass': case 'any': case 'ref': case 'regex': return 1;
    case 'choice': return Math.max(0, ...expression.items.map(requiredWidth));
    case 'seq': return expression.items.reduce((total, item) => total + requiredWidth(item), 0);
    case 'repeat1': case 'capture': return requiredWidth(expression.item);
    case 'repeat': return requiredWidth(expression.item) * expression.min;
    default: return 0;
  }
}

function hasLiteralPrefixConflict(alternatives) {
  const yields = alternatives.map(literalYield).filter((value) => value !== null);
  return yields.some((left, index) => yields.slice(index + 1).some((right) =>
    left !== '' && right !== '' && left !== right &&
    (left.startsWith(right) || right.startsWith(left))));
}

function literalYield(expression) {
  switch (expression.kind) {
    case 'empty': return '';
    case 'literal': case 'literalInsensitive': return expression.value;
    case 'seq': {
      let output = '';
      for (const item of expression.items) {
        const value = literalYield(item);
        if (value === null) return null;
        output += value;
      }
      return output;
    }
    case 'capture': return literalYield(expression.item);
    default: return null;
  }
}

function utf8Length(value) {
  return new TextEncoder().encode(value).length;
}

/**
 * The emitted grammar `{ source, report }` after the `emitter` decorators of
 * `decorators`, which see each line of the source as `{ format, number, line }`
 * (`number` counts from 1): setting `line` rewrites it and `drop` removes it.
 * The report is kept as it is.
 */
export function decorateEmitted(format, emitted, decorators) {
  const set = decoratorSet(decorators);
  if (!set.has('emitter')) return emitted;
  const ending = emitted.source.endsWith('\n') ? '\n' : '';
  const lines = (ending ? emitted.source.slice(0, -1) : emitted.source).split('\n');
  const kept = lines.flatMap((line, index) => {
    const decorated = set.decorate('emitter', { format, number: String(index + 1), line });
    return decorated === null ? [] : [decorated.line];
  });
  return { ...emitted, source: kept.length === 0 ? '' : `${kept.join('\n')}${ending}` };
}
