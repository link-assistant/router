// The meaning-aware normalization of grammar expressions that the merge
// compares rules by. It mirrors rust/src/grammar/merge/normalize.rs.
import { FEATURE_EXPRESSION_FORMS } from './grammar-feature-forms.js';
import { renderNativeExpression } from './grammar-interchange.js';
import { mapReferences } from './grammar-rename.js';

/** Raised for malformed merge input and by `assertMergeComplete`. */
export class GrammarMergeError extends Error {
  constructor(message, failures = []) {
    super(message);
    this.name = 'GrammarMergeError';
    this.failures = failures;
  }
}

// Meaning-aware normalization. Each form carries the normalized expression and
// its canonical text; `label` prints a reference, which lets the same pass
// serve source names, external names and bisimulation classes.
export const EMPTY = Object.freeze({ expr: Object.freeze({ kind: 'empty' }), text: 'empty' });

export function normalize(expression, label) {
  switch (expression.kind) {
    case 'empty': return EMPTY;
    case 'literal': return literal(expression.value);
    case 'literalInsensitive':
      return hasCase(expression.value)
        ? { expr: { kind: 'literalInsensitive', value: expression.value }, text: `ilit(${q(expression.value)})` }
        : literal(expression.value);
    case 'charRange': return charRange(expression.start, expression.end);
    case 'charClass': return charClass(expression, label);
    case 'regex': return { expr: { kind: 'regex', value: expression.value }, text: `regex(${q(expression.value)})` };
    case 'any': return { expr: { kind: 'any' }, text: 'any' };
    case 'ref':
      if (expression.arguments?.length > 0) return featureForm(expression, label);
      return { expr: { kind: 'ref', name: expression.name }, text: label(expression.name) };
    case 'seq': return sequenceForm(expression.items.map((item) => normalize(item, label)));
    case 'choice': return choiceForm(expression.items.map((item) => normalize(item, label)), expression.ordered === true);
    case 'repeat0': return repeatForm(normalize(expression.item, label), 0, null);
    case 'repeat1': return repeatForm(normalize(expression.item, label), 1, null);
    case 'optional': return repeatForm(normalize(expression.item, label), 0, 1);
    case 'repeat': return repeatForm(normalize(expression.item, label), expression.min, expression.max ?? null);
    case 'and':
    case 'not': {
      const inner = normalize(expression.item, label);
      return { expr: { kind: expression.kind, item: inner.expr }, text: `${expression.kind}(${inner.text})`, inner };
    }
    case 'capture': {
      const inner = normalize(expression.item, label);
      const name = expression.label ?? null;
      return {
        expr: { kind: 'capture', label: name, item: inner.expr },
        text: `capture(${name === null ? '_' : q(name)},${inner.text})`,
        inner,
      };
    }
    default:
      if (FEATURE_EXPRESSION_FORMS[expression.kind] || expression.kind === 'byteClass') return featureForm(expression, label);
      throw new GrammarMergeError(`unsupported grammar expression kind: ${expression.kind}`);
  }
}

// A feature union expression (precedence, alias, token, a Unicode or byte
// class, a call of a parameterized rule, ...) is equivalent only to the same
// expression over equivalent references: its text is its native listing with
// every reference labelled. References are listed as NUL-delimited indexes,
// which no quoted listing text contains, and then replaced by their labels.
function featureForm(expression, label) {
  const names = [];
  const listed = renderNativeExpression(mapReferences(expression, (name) => `\0${names.push(name) - 1}\0`));
  return { expr: expression, text: `feature(${listed.replace(/\0(\d+)\0/gu, (_, index) => label(names[Number(index)]))})` };
}

function literal(value) {
  return { expr: { kind: 'literal', value }, text: `lit(${q(value)})` };
}

function charRange(start, end) {
  if (start === end) return literal(start);
  return { expr: { kind: 'charRange', start, end }, text: `range(${q(start)},${q(end)})` };
}

function charClass(expression, label) {
  const negated = expression.negated === true;
  if (expression.items?.some(({ kind }) => kind === 'category' || kind === 'script')) return featureForm(expression, label);
  if (typeof expression.value === 'string') {
    return {
      expr: { kind: 'charClass', value: expression.value, negated },
      text: `rawclass(${negated ? '!' : ''}${q(expression.value)})`,
    };
  }
  const items = new Map();
  for (const item of expression.items) {
    const single = item.kind === 'range' && item.start === item.end ? item.start : null;
    if (item.kind === 'range' && single === null) {
      items.set(`${q(item.start)}-${q(item.end)}`, { kind: 'range', start: item.start, end: item.end });
    } else {
      const value = single ?? item.value;
      items.set(q(value), { kind: 'char', value });
    }
  }
  const texts = [...items.keys()].sort(compareText);
  if (!negated && texts.length === 1) {
    const only = items.get(texts[0]);
    return only.kind === 'range' ? charRange(only.start, only.end) : literal(only.value);
  }
  return {
    expr: { kind: 'charClass', items: texts.map((text) => items.get(text)), negated },
    text: `class(${negated ? '!' : ''}[${texts.join(',')}])`,
  };
}

function sequenceForm(forms) {
  const items = [];
  for (const form of forms) {
    for (const part of form.expr.kind === 'seq' ? form.items : [form]) {
      if (part.expr.kind === 'empty') continue;
      const previous = items.at(-1);
      // `x x*` matches exactly what `x+` matches, in PEG and in CFG alike.
      if (previous && part.expr.kind === 'repeat0' && part.inner.text === previous.text) {
        items[items.length - 1] = repeatForm(previous, 1, null);
      } else {
        items.push(part);
      }
    }
  }
  if (items.length === 0) return EMPTY;
  if (items.length === 1) return items[0];
  return {
    expr: { kind: 'seq', items: items.map(({ expr }) => expr) },
    text: `seq(${items.map(({ text }) => text).join(',')})`,
    items,
  };
}

function choiceForm(forms, ordered) {
  const flattened = [];
  for (const form of forms) {
    if (form.expr.kind === 'choice' && form.ordered === ordered) flattened.push(...form.items);
    else flattened.push(form);
  }
  // A repeated alternative adds nothing: in an ordered choice the later copy
  // can never match where the earlier one failed, and union is idempotent.
  const unique = new Map();
  for (const form of flattened) if (!unique.has(form.text)) unique.set(form.text, form);
  const items = [...unique.values()];
  if (items.length === 1) return items[0];
  // The comparison text of an unordered choice is order-free, but the merged
  // expression keeps the source order: a PEG-style parser (the native
  // executor under `matching peg`, or an exported Peggy grammar) commits to
  // the first matching alternative, so `letter | letter word` would stop
  // after one letter.
  const texts = items.map(({ text }) => text);
  if (!ordered) texts.sort(compareText);
  return {
    expr: { kind: 'choice', items: items.map(({ expr }) => expr), ordered },
    text: `${ordered ? 'first' : 'alt'}(${texts.join(',')})`,
    items,
    ordered,
  };
}

function repeatForm(inner, min, max) {
  if (!Number.isSafeInteger(min) || min < 0 || (max !== null && (!Number.isSafeInteger(max) || max < min))) {
    throw new GrammarMergeError(`invalid repetition bounds ${min}..${max ?? ''}`);
  }
  if (inner.expr.kind === 'empty' || max === 0) return EMPTY;
  if (min === 1 && max === 1) return inner;
  if (min === 0 && max === null) return { expr: { kind: 'repeat0', item: inner.expr }, text: `many(${inner.text})`, inner };
  if (min === 1 && max === null) return { expr: { kind: 'repeat1', item: inner.expr }, text: `some(${inner.text})`, inner };
  if (min === 0 && max === 1) return { expr: { kind: 'optional', item: inner.expr }, text: `opt(${inner.text})`, inner };
  return {
    expr: { kind: 'repeat', item: inner.expr, min, max },
    text: `rep(${min},${max ?? '*'},${inner.text})`,
    inner,
  };
}

function hasCase(value) {
  return value.toLowerCase() !== value.toUpperCase();
}

export function q(value) {
  return JSON.stringify(value);
}

// Code point order, which is the byte order of UTF-8 strings in Rust.
export function compareText(left, right) {
  let i = 0;
  let j = 0;
  while (i < left.length && j < right.length) {
    const x = left.codePointAt(i);
    const y = right.codePointAt(j);
    if (x !== y) return x < y ? -1 : 1;
    i += x > 0xffff ? 2 : 1;
    j += y > 0xffff ? 2 : 1;
  }
  if (i < left.length) return 1;
  if (j < right.length) return -1;
  return 0;
}
