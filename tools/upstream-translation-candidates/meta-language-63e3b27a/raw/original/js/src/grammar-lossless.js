// The lossless mode of grammar interchange. Importing a source in lossless
// mode keeps, beside the grammar, the layout of the source: the text before
// the first rule, every rule definition's own text with the fingerprint of the
// rule it defines (its native links line) and the text after it up to the next
// definition. Rules the importer adds without a definition in the source (the
// ABNF core rules) are kept as implicit fingerprints. Emitting in lossless
// mode walks the layout: a rule whose fingerprint still matches is written
// with its original text, a changed rule is written where it was defined with
// the text a fresh emission gives it, a new rule follows the rule before it
// in grammar order, and an unchanged implicit rule is left implicit. An
// unchanged grammar therefore reconstructs its source exactly, and an edited
// grammar keeps every untouched definition, comment and blank line. The layout
// has its own links form, so the source is reconstructed from links alone.
// It mirrors rust/src/grammar/interchange/lossless.rs.
import { Parser } from 'links-notation';
import { GrammarImportError } from './grammar-importers.js';
import { grammarEmitter, grammarImporter } from './grammar-interchange.js';
import { percentDecodeLinksText, percentEncodeLinksText, renderRuleLink } from './grammar-links.js';

/** The formats the lossless mode reads and writes. */
export const GRAMMAR_LOSSLESS_FORMATS = Object.freeze([
  'abnf', 'antlr', 'bnf', 'ebnf', 'gbnf', 'lark', 'pest', 'tree-sitter-json',
]);

/** The rule head at the start of a line, capturing the rule name. */
const HEADS = {
  abnf: /^([A-Za-z][A-Za-z0-9-]*)[ \t]*=/u,
  antlr: /^(?:fragment[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*(?::|$)/u,
  bnf: /^<([^<>]*)>[ \t]*::=/u,
  ebnf: /^([A-Za-z_][A-Za-z0-9_-]*)[ \t]*(?:::=|=)/u,
  gbnf: /^([A-Za-z0-9-]+)[ \t]*::=/u,
  lark: /^[?!]?([A-Za-z_][A-Za-z0-9_]*)(?:\.-?[0-9]+)?[ \t]*:/u,
  pest: /^([A-Za-z_][A-Za-z0-9_]*)[ \t]*=/u,
};

/** How a comment line of each line-based format starts. */
const COMMENTS = {
  abnf: [';'],
  antlr: ['//', '/*', '*'],
  bnf: [';'],
  ebnf: ['(*'],
  gbnf: ['#'],
  lark: ['//'],
  pest: ['//'],
};

/** Formats whose importers read the comment lines above a rule as its documentation. */
const DOC_FORMATS = new Set(['antlr', 'gbnf', 'lark']);

function layoutError(detail) {
  return new GrammarImportError('meta-language', 'parse', `layout: ${detail}`);
}

function checkFormat(format) {
  if (!GRAMMAR_LOSSLESS_FORMATS.includes(format)) {
    throw new TypeError(`the lossless mode does not support the format ${format}`);
  }
}

/**
 * Splits `source` into the text before the first rule definition and the
 * definitions of the rules in `names`, each with the text after it.
 */
export function splitGrammarSource(source, format, names) {
  checkFormat(format);
  const spans = format === 'tree-sitter-json'
    ? jsonRuleSpans(source, names)
    : lineRuleSpans(source, format, names);
  if (spans.length === 0) return { prefix: source, members: [] };
  return {
    prefix: source.slice(0, spans[0].start),
    members: spans.map((span, index) => ({
      name: span.name,
      text: source.slice(span.start, span.end),
      gap: source.slice(span.end, index + 1 < spans.length ? spans[index + 1].start : source.length),
    })),
  };
}

function lineRuleSpans(source, format, names) {
  const known = new Map();
  for (const name of names) {
    known.set(name, name);
    if (format === 'abnf' && !known.has(name.toLowerCase())) known.set(name.toLowerCase(), name);
  }
  const lines = [];
  for (let start = 0; start < source.length;) {
    const newline = source.indexOf('\n', start);
    const end = newline < 0 ? source.length : newline;
    lines.push({ start, end, text: source.slice(start, end) });
    start = newline < 0 ? source.length : newline + 1;
  }
  const trivia = (line) => {
    const text = line.text.trim();
    return text.length === 0 || COMMENTS[format].some((prefix) => text.startsWith(prefix));
  };
  const heads = [];
  lines.forEach((line, index) => {
    const match = HEADS[format].exec(line.text);
    if (!match) return;
    const name = known.get(match[1]) ?? (format === 'abnf' ? known.get(match[1].toLowerCase()) : undefined);
    if (name !== undefined) heads.push({ index, name });
  });
  const firsts = heads.map((head, position) => {
    let first = head.index;
    const floor = position === 0 ? 0 : heads[position - 1].index + 1;
    if (DOC_FORMATS.has(format)) {
      while (first > floor && lines[first - 1].text.trim().length > 0 && trivia(lines[first - 1])) first -= 1;
    }
    return first;
  });
  return heads.map((head, position) => {
    const limit = position + 1 < heads.length ? firsts[position + 1] : lines.length;
    let last = limit - 1;
    while (last > head.index && trivia(lines[last])) last -= 1;
    return { name: head.name, start: lines[firsts[position]].start, end: lines[last].end };
  });
}

function skipJsonSpace(source, index) {
  let at = index;
  while (at < source.length && ' \t\r\n'.includes(source[at])) at += 1;
  return at;
}

function jsonStringEnd(source, index) {
  if (source[index] !== '"') throw layoutError(`expected a JSON string at offset ${index}`);
  for (let at = index + 1; at < source.length; at += 1) {
    if (source[at] === '\\') at += 1;
    else if (source[at] === '"') return at + 1;
  }
  throw layoutError('unterminated JSON string');
}

function jsonValueEnd(source, index) {
  if (source[index] === '"') return jsonStringEnd(source, index);
  if (source[index] !== '{' && source[index] !== '[') {
    let at = index;
    while (at < source.length && !',}] \t\r\n'.includes(source[at])) at += 1;
    if (at === index) throw layoutError(`expected a JSON value at offset ${index}`);
    return at;
  }
  let depth = 0;
  for (let at = index; at < source.length; at += 1) {
    const char = source[at];
    if (char === '"') at = jsonStringEnd(source, at) - 1;
    else if (char === '{' || char === '[') depth += 1;
    else if (char === '}' || char === ']') {
      depth -= 1;
      if (depth === 0) return at + 1;
    }
  }
  throw layoutError('unterminated JSON value');
}

/** The members of a JSON object starting at `index`, as key, key start and value end. */
function jsonMembers(source, index) {
  if (source[index] !== '{') throw layoutError(`expected a JSON object at offset ${index}`);
  const members = [];
  let at = skipJsonSpace(source, index + 1);
  while (source[at] !== '}') {
    const keyEnd = jsonStringEnd(source, at);
    const key = JSON.parse(source.slice(at, keyEnd));
    let value = skipJsonSpace(source, keyEnd);
    if (source[value] !== ':') throw layoutError(`expected : at offset ${value}`);
    value = skipJsonSpace(source, value + 1);
    const end = jsonValueEnd(source, value);
    members.push({ key, start: at, value, end });
    at = skipJsonSpace(source, end);
    if (source[at] === ',') at = skipJsonSpace(source, at + 1);
    else if (source[at] !== '}') throw layoutError(`expected , or } at offset ${at}`);
  }
  return members;
}

function jsonRuleSpans(source, names) {
  const known = new Set(names);
  const rules = jsonMembers(source, skipJsonSpace(source, 0)).find((member) => member.key === 'rules');
  if (!rules || source[rules.value] !== '{') return [];
  return jsonMembers(source, rules.value)
    .filter((member) => known.has(member.key))
    .map((member) => ({ name: member.key, start: member.start, end: member.end }));
}

/**
 * The layout of `source` for `grammar`, the grammar imported from it: its
 * definitions with the fingerprints of their rules, and the fingerprints of
 * the rules defined nowhere in the source.
 */
export function captureGrammarLayout(source, format, grammar) {
  const { prefix, members } = splitGrammarSource(source, format, grammar.ruleNames());
  const defined = new Set(members.map((member) => member.name));
  const fingerprint = (name) => renderRuleLink(grammar, grammar.rule(name));
  return {
    format,
    prefix,
    members: members.map((member) => ({ ...member, fingerprint: fingerprint(member.name) })),
    implicit: grammar.ruleNames()
      .filter((name) => !defined.has(name))
      .map((name) => ({ name, fingerprint: fingerprint(name) })),
  };
}

/** Imports `source` of `format` with the layout that reconstructs it. */
export function importGrammarLossless(source, format) {
  checkFormat(format);
  const grammar = grammarImporter(format)(source);
  return { grammar, layout: captureGrammarLayout(source, format, grammar) };
}

/**
 * Emits `grammar` with `layout`, the layout of the source it was imported
 * from: unchanged definitions keep their original text and only changed or
 * new rules are written fresh. The report carries the fresh emission's notes,
 * plus a note when the layout could not place a rule and the whole grammar
 * was emitted fresh instead.
 */
export function emitGrammarLossless(grammar, layout) {
  checkFormat(layout.format);
  const fingerprints = new Map(grammar.ruleNames().map((name) => [name, renderRuleLink(grammar, grammar.rule(name))]));
  const kept = (entry) => fingerprints.get(entry.name) === entry.fingerprint;
  const definedAt = new Map();
  layout.members.forEach((member, index) => {
    if (!definedAt.has(member.name)) definedAt.set(member.name, []);
    definedAt.get(member.name).push(index);
  });
  const implicit = new Set(layout.implicit.filter(kept).map((entry) => entry.name));
  const unchanged = (name) => (definedAt.get(name)?.every((index) => kept(layout.members[index])) ?? false);
  const fresh = new Set(grammar.ruleNames().filter((name) => !unchanged(name) && !implicit.has(name)));

  let emitted = { source: '', report: { lossy: [] } };
  let freshText = new Map();
  if (fresh.size > 0) {
    emitted = grammarEmitter(layout.format)(grammar);
    for (const member of splitGrammarSource(emitted.source, layout.format, grammar.ruleNames()).members) {
      if (!freshText.has(member.name)) freshText.set(member.name, member.text);
    }
    const missing = [...fresh].filter((name) => !freshText.has(name));
    if (missing.length > 0) {
      const report = { lossy: [...emitted.report.lossy, `the layout could not place rule ${missing[0]}, so the whole grammar was emitted fresh`] };
      return { source: emitted.source, report };
    }
  }

  // New rules follow the nearest rule before them in grammar order.
  const following = new Map();
  const leading = [];
  let previous = null;
  for (const name of grammar.ruleNames()) {
    if (implicit.has(name)) continue;
    if (!definedAt.has(name)) {
      if (previous === null) leading.push(name);
      else following.set(previous, [...(following.get(previous) ?? []), name]);
    }
    previous = name;
  }
  const items = [];
  const placeNew = (names) => {
    for (const name of names ?? []) {
      items.push({ text: freshText.get(name), index: null });
      placeNew(following.get(name));
    }
  };
  placeNew(leading);
  layout.members.forEach((member, index) => {
    if (!fingerprints.has(member.name)) return;
    const indices = definedAt.get(member.name);
    if (!fresh.has(member.name)) items.push({ text: member.text, index });
    else if (indices[0] === index) items.push({ text: freshText.get(member.name), index });
    if (indices.at(-1) === index) placeNew(following.get(member.name));
  });

  const last = layout.members.length - 1;
  const fallback = layout.format === 'tree-sitter-json'
    ? (last > 0 ? layout.members[0].gap : ',\n    ')
    : '\n';
  // The text between two definitions stays before the definition it preceded
  // (comments above a rule stay with it); a definition followed by a new rule
  // keeps the text after it when the definition after it is gone. Each text
  // is written once, and the text after the last definition ends the source.
  const placed = new Set(items.map((item) => item.index));
  const used = new Set();
  const separator = (before, after) => {
    let gap = null;
    if (after.index !== null && after.index > 0) gap = after.index - 1;
    else if (after.index === null && before.index !== null && before.index < last && !placed.has(before.index + 1)) gap = before.index;
    if (gap === null || used.has(gap)) return fallback;
    used.add(gap);
    return layout.members[gap].gap;
  };
  let source = layout.prefix;
  items.forEach((item, position) => {
    if (position > 0) source += separator(items[position - 1], item);
    source += item.text;
  });
  if (last >= 0) source += layout.members[last].gap;
  return { source, report: emitted.report };
}

/** Renders the links form of `layout`, one link per line. */
export function renderGrammarLayoutLinks(layout) {
  const text = percentEncodeLinksText;
  const lines = [`(layout ${layout.format} ${text(layout.prefix)})`];
  for (const member of layout.members) {
    lines.push(`(define ${text(member.name)} ${text(member.fingerprint)} ${text(member.text)} ${text(member.gap)})`);
  }
  for (const entry of layout.implicit) lines.push(`(implicit ${text(entry.name)} ${text(entry.fingerprint)})`);
  return lines.map((line) => `${line}\n`).join('');
}

/** Reads the links form written by `renderGrammarLayoutLinks`. */
export function parseGrammarLayoutLinks(source) {
  let statements;
  try {
    statements = new Parser({ comments: false }).parse(source);
  } catch (error) {
    throw layoutError(error.message);
  }
  const words = (statement) => {
    const values = statement.values.length === 0 ? [statement] : statement.values;
    if (statement.values.length !== 0 && statement.id !== null) throw layoutError(`unexpected identified link ${statement.id}`);
    return values.map((value) => {
      if (value.values.length !== 0 || value.id === null) throw layoutError('layout links hold words only');
      return value.id;
    });
  };
  const [header, ...rest] = statements.map(words);
  if (!header || header[0] !== 'layout' || header.length !== 3) throw layoutError('the first link must be (layout FORMAT PREFIX)');
  if (!GRAMMAR_LOSSLESS_FORMATS.includes(header[1])) throw layoutError(`unknown layout format ${header[1]}`);
  const layout = { format: header[1], prefix: percentDecodeLinksText(header[2]), members: [], implicit: [] };
  for (const [head, ...values] of rest) {
    const decoded = values.map(percentDecodeLinksText);
    if (head === 'define' && decoded.length === 4 && layout.implicit.length === 0) {
      const [name, fingerprint, text, gap] = decoded;
      layout.members.push({ name, text, gap, fingerprint });
    } else if (head === 'implicit' && decoded.length === 2) {
      const [name, fingerprint] = decoded;
      layout.implicit.push({ name, fingerprint });
    } else {
      throw layoutError(`unexpected layout link ${head}`);
    }
  }
  return layout;
}
