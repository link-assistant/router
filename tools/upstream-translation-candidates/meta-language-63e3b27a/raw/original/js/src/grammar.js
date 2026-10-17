import { compactDeclarations, RULE_ATTRIBUTES } from './grammar-feature-forms.js';
import { createGrammarParser } from './grammar-runtime.js';

/**
 * An order-preserving, serializable grammar intermediate representation. The
 * optional `declarations` hold the grammar-level forms of the grammar feature
 * union (matching, imports, modes, extras, conflicts, macros and external
 * scanners); a rule may carry `parameters` and the `channel`, `modes` and
 * `action` attributes. docs/grammar/feature-union.md describes them. A rule
 * may also carry the metadata `concept`, the id of the concept record it
 * means, and `sourceNames`, `[{ source, name }]`, the names it has in the
 * grammars it was merged from (docs/grammar/native-grammars.md). The
 * metadata `kinds`, `[{ name, sourceNames }]`, keeps the source names of the
 * node kinds no rule defines, such as the kind an alias names.
 */
export class Grammar {
  constructor(start, rules, sourceFormat = null, declarations = null) {
    this.start = start ?? null;
    this.sourceFormat = sourceFormat;
    this.declarations = compactDeclarations(declarations);
    this.rules = new Map();
    this.kinds = [];
    for (const [name, rule] of rules ?? []) {
      const entry = { name, kind: rule.kind ?? 'normal', expression: rule.expression };
      if (rule.parameters?.length > 0) entry.parameters = rule.parameters;
      for (const attribute of RULE_ATTRIBUTES) {
        if (rule[attribute] !== undefined && rule[attribute] !== null) entry[attribute] = rule[attribute];
      }
      if (rule.concept !== undefined && rule.concept !== null) entry.concept = rule.concept;
      if (rule.sourceNames?.length > 0) entry.sourceNames = rule.sourceNames.map((sourceName) => ({ ...sourceName }));
      this.rules.set(name, Object.freeze(entry));
    }
  }

  rule(name) {
    return this.rules.get(name);
  }

  ruleNames() {
    return [...this.rules.keys()];
  }

  rule_names() {
    return this.ruleNames();
  }

  startRule() {
    return this.start === null
      ? this.rules.values().next().value
      : this.rule(this.start);
  }

  start_rule() {
    return this.startRule();
  }

  source_format() {
    return this.sourceFormat;
  }

  referencedNonterminals() {
    const names = new Set();
    for (const rule of this.rules.values()) collectReferences(rule.expression, names);
    for (const extra of this.declarations.extras ?? []) collectReferences(extra, names);
    for (const macro of this.declarations.macros ?? []) collectReferences(macro.expression, names);
    return [...names].sort();
  }

  /** The token names the grammar's external scanners produce. */
  externalTokens() {
    return (this.declarations.scanners ?? []).flatMap((scanner) => scanner.tokens);
  }

  referenced_nonterminals() {
    return this.referencedNonterminals();
  }

  undefinedNonterminals(allowed = []) {
    const permitted = new Set([...this.rules.keys(), ...this.externalTokens(), ...allowed]);
    return this.referencedNonterminals().filter((name) => !permitted.has(name));
  }

  undefined_nonterminals(allowed = []) {
    return this.undefinedNonterminals(allowed);
  }

  normalized() {
    const normalized = {
      schemaVersion: 1,
      start: this.start,
      sourceFormat: this.sourceFormat,
      rules: [...this.rules.values()].map((rule) => {
        const entry = { name: rule.name, kind: rule.kind, expression: cloneJson(rule.expression) };
        if (rule.parameters) entry.parameters = [...rule.parameters];
        for (const attribute of RULE_ATTRIBUTES) {
          if (rule[attribute] !== undefined) entry[attribute] = cloneJson(rule[attribute]);
        }
        return entry;
      }),
    };
    if (Object.keys(this.declarations).length > 0) normalized.declarations = cloneJson(this.declarations);
    return normalized;
  }
}

/**
 * Copies the rule documentation of `source` onto the rules of `target` that
 * `rename` maps them to, as a rebuilt grammar would otherwise drop it.
 */
export function carryRuleDocs(target, source, rename = (name) => name) {
  for (const rule of source.rules.values()) {
    const doc = rule.doc ?? source.ruleDocs?.get(rule.name) ?? null;
    const name = rename(rule.name);
    if (doc !== null && target.rules.has(name)) {
      target.rules.set(name, Object.freeze({ ...target.rules.get(name), doc }));
    }
  }
  return target;
}

export class GrammarBuilder {
  constructor(start = null) {
    this.start = start;
    this.sourceFormat = null;
    this.rules = new Map();
  }

  source(format) {
    this.sourceFormat = format;
    return this;
  }

  rule(name, expression, kind = 'normal') {
    this.rules.set(name, { name, kind, expression });
    return this;
  }

  terminal(name, expression) {
    return this.rule(name, expression, 'terminal');
  }

  nonterminal(name, expression) {
    return this.rule(name, expression, 'nonterminal');
  }

  build() {
    return new Grammar(this.start, this.rules, this.sourceFormat);
  }

  static empty() {
    return { kind: 'empty' };
  }

  static literal(value) {
    return { kind: 'literal', value };
  }

  static literalInsensitive(value) {
    return { kind: 'literalInsensitive', value };
  }

  static ref(name) {
    return { kind: 'ref', name };
  }

  static seq(...items) {
    return sequence(items);
  }

  static choice(...items) {
    return choice(items, false);
  }

  static orderedChoice(...items) {
    return choice(items, true);
  }

  static repeat0(item) {
    return { kind: 'repeat0', item };
  }

  static repeat1(item) {
    return { kind: 'repeat1', item };
  }

  static repeat(item, min, max = null) {
    return canonicalRepeat(item, min, max);
  }

  static optional(item) {
    return { kind: 'optional', item };
  }

  static and(item) {
    return { kind: 'and', item };
  }

  static not(item) {
    return { kind: 'not', item };
  }

  static capture(label, item) {
    return { kind: 'capture', label, item };
  }

  static charRange(start, end) {
    return { kind: 'charRange', start, end };
  }

  static charClass(value, negated = false) {
    if (typeof value === 'string') return { kind: 'charClass', value, negated };
    return { kind: 'charClass', items: value, negated };
  }

  static regex(value) {
    return { kind: 'regex', value };
  }

  static any() {
    return { kind: 'any' };
  }
}

export const ExprBuilder = GrammarBuilder;

export function emitPeggy(grammar) {
  const names = namePlan(grammar);
  const start = grammar.start ?? grammar.startRule()?.name;
  if (!start) throw new Error('cannot emit a grammar without a start rule');
  const lines = [`start = ${names.get(start) ?? sanitizeIdentifier(start)}`, ''];
  for (const [name, rule] of grammar.rules) {
    lines.push(`${names.get(name)} = ${emitExpression(rule.expression, names)}`);
  }
  return `${lines.join('\n')}\n`;
}

/**
 * Compiles `grammar` for the native grammar executor (grammar-runtime.js).
 * The parser's `parse(source, options)` returns the lossless syntax tree and
 * throws a `GrammarParseError` when the source is not in the language; its
 * `parseTree(source, options)` reports instead of throwing. `options` takes
 * `resolveGrammar(name)` for imports and embedded languages and the resource
 * limits `maxDepth`, `stepLimit`, `memoLimit` and `memoryLimit`.
 */
export function compileGrammar(grammar, options = {}) {
  return createGrammarParser(grammar, options);
}

export function parseWithGrammar(grammar, source, options = {}) {
  return compileGrammar(grammar, options).parse(source, options);
}

/**
 * Emits an ES module that parses with `grammar` on the native executor: the
 * grammar travels as its serialized form and the module imports the
 * executor from the `meta-language` package.
 */
export function emitJavascriptParser(grammar) {
  const serialized = JSON.stringify(JSON.stringify(grammar.normalized()));
  return [
    "import { compileGrammar, deserializeGrammar } from 'meta-language';",
    '',
    `const GRAMMAR = ${serialized};`,
    'export const parser = compileGrammar(deserializeGrammar(GRAMMAR));',
    'export function parse(source, options = {}) {',
    '  return parser.parse(source, options);',
    '}',
    'export function parseTree(source, options = {}) {',
    '  return parser.parseTree(source, options);',
    '}',
    '',
  ].join('\n');
}

export function serializeGrammar(grammar) {
  return `${JSON.stringify(grammar.normalized(), null, 2)}\n`;
}

export function deserializeGrammar(source) {
  let value;
  try {
    value = typeof source === 'string' ? JSON.parse(source) : source;
  } catch (error) {
    throw new TypeError(`invalid serialized grammar JSON: ${error.message}`, { cause: error });
  }
  if (!value || value.schemaVersion !== 1 || !Array.isArray(value.rules)) {
    throw new TypeError('invalid serialized grammar document');
  }
  const rules = new Map();
  for (const rule of value.rules) {
    if (!rule || typeof rule.name !== 'string' || !rule.expression?.kind) {
      throw new TypeError('invalid serialized grammar rule');
    }
    if (rules.has(rule.name)) throw new TypeError(`duplicate serialized grammar rule ${rule.name}`);
    rules.set(rule.name, rule);
  }
  const grammar = new Grammar(value.start, rules, value.sourceFormat ?? null, value.declarations ?? null);
  if (!grammar.startRule()) throw new TypeError('serialized grammar has no start rule');
  return grammar;
}

export function sequence(items) {
  const flattened = [];
  for (const item of items) {
    if (item.kind === 'empty') continue;
    if (item.kind === 'seq') flattened.push(...item.items);
    else flattened.push(item);
  }
  if (flattened.length === 0) return GrammarBuilder.empty();
  if (flattened.length === 1) return flattened[0];
  return { kind: 'seq', items: flattened };
}

export function choice(items, ordered = false) {
  const flattened = [];
  for (const item of items) {
    if (item.kind === 'choice' && item.ordered === ordered) flattened.push(...item.items);
    else flattened.push(item);
  }
  if (flattened.length === 0) return GrammarBuilder.empty();
  if (flattened.length === 1) return flattened[0];
  return { kind: 'choice', items: flattened, ordered };
}

export function canonicalRepeat(item, min, max = null) {
  if (!Number.isSafeInteger(min) || min < 0 || (max !== null &&
    (!Number.isSafeInteger(max) || max < min))) {
    throw new RangeError(`invalid repetition bounds ${min}..${max ?? ''}`);
  }
  if (min === 0 && max === null) return GrammarBuilder.repeat0(item);
  if (min === 1 && max === null) return GrammarBuilder.repeat1(item);
  if (min === 0 && max === 1) return GrammarBuilder.optional(item);
  return { kind: 'repeat', item, min, max };
}

function emitExpression(expression, names) {
  switch (expression.kind) {
    case 'empty': return '""';
    case 'literal': return JSON.stringify(expression.value);
    case 'literalInsensitive': return `${JSON.stringify(expression.value)}i`;
    case 'ref': return names.get(expression.name) ?? sanitizeIdentifier(expression.name);
    case 'seq': return expression.items.map((item) => parenthesize(item, 'seq', names)).join(' ');
    case 'choice':
      return expression.items.map((item) => parenthesize(item, 'choice', names)).join(' / ');
    case 'repeat0': return `${parenthesize(expression.item, 'suffix', names)}*`;
    case 'repeat1': return `${parenthesize(expression.item, 'suffix', names)}+`;
    case 'optional': return `${parenthesize(expression.item, 'suffix', names)}?`;
    case 'repeat': return emitRepeat(expression, names);
    case 'and': return `&${parenthesize(expression.item, 'prefix', names)}`;
    case 'not': return `!${parenthesize(expression.item, 'prefix', names)}`;
    case 'capture': {
      const label = sanitizeIdentifier(expression.label ?? 'capture');
      return `${label}:${parenthesize(expression.item, 'prefix', names)}`;
    }
    case 'charRange':
      return `[${escapeClassChar(expression.start)}-${escapeClassChar(expression.end)}]`;
    case 'charClass': return emitCharClass(expression);
    case 'regex': return `(${expression.value})`;
    case 'any': return '.';
    default: throw new Error(`unsupported grammar expression kind: ${expression.kind}`);
  }
}

function emitRepeat(expression, names) {
  const item = parenthesize(expression.item, 'suffix', names);
  if (expression.max === expression.min) return `${item}|${expression.min}|`;
  return `${item}|${expression.min}..${expression.max ?? ''}|`;
}

function parenthesize(expression, context, names) {
  const rendered = emitExpression(expression, names);
  const atoms = ['empty', 'literal', 'literalInsensitive', 'ref', 'charRange', 'charClass', 'any'];
  if ((context === 'suffix' || context === 'prefix') && atoms.includes(expression.kind)) {
    return rendered;
  }
  if (context === 'seq' && expression.kind !== 'choice') return rendered;
  if (context === 'choice' && expression.kind !== 'choice') return rendered;
  return `(${rendered})`;
}

function emitCharClass(expression) {
  const prefix = expression.negated ? '^' : '';
  if (typeof expression.value === 'string') return `[${prefix}${expression.value}]`;
  const content = expression.items.map((item) => item.kind === 'range'
    ? `${escapeClassChar(item.start)}-${escapeClassChar(item.end)}`
    : escapeClassChar(item.value)).join('');
  return `[${prefix}${content}]`;
}

function namePlan(grammar) {
  const plan = new Map();
  const used = new Set(['start']);
  for (const name of [...grammar.ruleNames(), ...grammar.referencedNonterminals()]) {
    if (plan.has(name)) continue;
    const base = sanitizeIdentifier(name);
    let candidate = base;
    for (let suffix = 2; used.has(candidate); suffix += 1) candidate = `${base}_${suffix}`;
    used.add(candidate);
    plan.set(name, candidate);
  }
  return plan;
}

function sanitizeIdentifier(name) {
  const normalized = String(name).replace(/[^A-Za-z0-9_]/g, '_');
  return /^[A-Za-z_]/.test(normalized) ? normalized : `_${normalized}`;
}

function collectReferences(expression, names) {
  if (!expression) return;
  if (expression.kind === 'ref') names.add(expression.name);
  for (const item of expression.items ?? []) collectReferences(item, names);
  for (const item of expression.arguments ?? []) collectReferences(item, names);
  if (expression.item) collectReferences(expression.item, names);
  if (expression.synchronize) collectReferences(expression.synchronize, names);
}

function escapeClassChar(value) {
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/]/g, '\\]')
    .replace(/-/g, '\\-')
    .replace(/\^/g, '\\^');
}

function cloneJson(value) {
  return JSON.parse(JSON.stringify(value));
}
