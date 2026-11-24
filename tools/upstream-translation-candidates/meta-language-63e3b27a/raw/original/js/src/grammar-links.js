// The native links form of a grammar: Links Notation that both runtimes write
// byte for byte the same and read back without the source the grammar came
// from. A `(grammar (format TAG) (start NAME))` link is followed by one
// `(rule NAME KIND EXPRESSION)` link per rule in grammar order, with an
// optional trailing `(doc TEXT)`. Expressions are nested links headed by the
// native listing's words: `empty`, `any`, `(literal TEXT)`,
// `(literalInsensitive TEXT)`, `(range FROM TO)`, `(class plain|negated
// ITEM...)` with `(char C)` and `(range FROM TO)` items, `(ref NAME)`,
// `(choice ordered|unordered ITEM...)`, `(seq ITEM...)`, `(optional ITEM)`,
// `(repeat0 ITEM)`, `(repeat1 ITEM)`, `(repeat MIN MAX|unbounded ITEM)`,
// `(and ITEM)`, `(not ITEM)` and `(capture labeled LABEL ITEM)` or
// `(capture unlabeled ITEM)`. Names, texts and characters are percent-encoded
// as `LinkNetwork` LiNo terms are (ASCII letters, digits and `-_.` kept, every
// other UTF-8 byte as `%XX`, the empty text as `%`). It mirrors
// rust/src/grammar/interchange/links.rs.
//
// The grammar feature union (docs/grammar/feature-union.md#links-form) adds,
// only where a grammar uses them: `(matching peg|generalized|longest)` in the grammar
// link; `(import NAME)`, `(mode NAME)`, `(extra EXPRESSION)`, `(conflict
// NAME...)`, `(macro NAME (parameters P...) EXPRESSION)` and `(scanner NAME
// (tokens T...) (operations OPERATION...))` links between the grammar link
// and the rules; the rule fields `(parameters P...)`, `(channel NAME)`,
// `(modes MODE...)` and `(action OPERATION...)` before `(doc TEXT)`;
// the rule metadata `(concept ID)`, the canonical concept record the rule
// means (parity/naming/canonical-concepts.json), and `(source-names (SOURCE
// NAME)...)`, the names the rule has in the grammars it was merged from, for
// reverse conversion, between the action and the doc; the metadata `(kind
// NAME (source-names (SOURCE NAME)...))` links after the declarations, the
// source names of the node kinds no rule defines, such as the kind an alias
// names;
// `(category V)` and `(script V)` class items; `(ref NAME ARGUMENT...)`; and
// the feature expressions and operations of grammar-feature-forms.js.
import { Parser } from 'links-notation';
import { Grammar } from './grammar.js';
import {
  grammarDeclarations,
  linksCodec,
  MATCHING_MODES,
  readLinksFeatureExpression,
  readLinksOperation,
  renderFeatureExpression,
  renderOperation,
  settlingProblem,
} from './grammar-feature-forms.js';
import { ruleDoc } from './grammar-emitters/structural.js';
import { GrammarImportError } from './grammar-importers.js';

const RULE_KINDS = new Set(['normal', 'atomic', 'silent', 'token']);
const SOURCE_FORMATS = new Set(['meta-language', 'bnf', 'ebnf', 'abnf', 'peg', 'antlr', 'lark', 'gbnf', 'tree-sitter', 'inferred']);
const UNARY = new Set(['optional', 'repeat0', 'repeat1', 'and', 'not']);
const MAX_BOUND_DIGITS = 9;

function linksError(detail) {
  return new GrammarImportError('meta-language', 'parse', `links: ${detail}`);
}

/** Percent-encodes `value` as `LinkNetwork.toLino` terms are in the Rust runtime. */
export function percentEncodeLinksText(value) {
  if (value.length === 0) return '%';
  let encoded = '';
  for (const byte of new TextEncoder().encode(value)) {
    const char = String.fromCharCode(byte);
    encoded += /[A-Za-z0-9._-]/u.test(char) ? char : `%${byte.toString(16).toUpperCase().padStart(2, '0')}`;
  }
  return encoded;
}

/** Reverses `percentEncodeLinksText`, throwing a `GrammarImportError` on a malformed text. */
export function percentDecodeLinksText(value) {
  if (value === '%') return '';
  const bytes = [];
  for (let index = 0; index < value.length; index += 1) {
    const char = value[index];
    if (char === '%') {
      const hex = value.slice(index + 1, index + 3);
      if (!/^[0-9A-F]{2}$/u.test(hex)) throw linksError(`invalid percent escape in ${value}`);
      bytes.push(Number.parseInt(hex, 16));
      index += 2;
    } else if (/[A-Za-z0-9._-]/u.test(char)) {
      bytes.push(char.charCodeAt(0));
    } else {
      throw linksError(`unescaped character in ${value}`);
    }
  }
  try {
    return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(new Uint8Array(bytes));
  } catch {
    throw linksError(`${value} is not UTF-8`);
  }
}

/** Renders the native links form of `grammar`, one link per line. */
export function renderGrammarLinks(grammar) {
  const header = ['grammar'];
  if (grammar.sourceFormat) header.push(`(format ${grammar.sourceFormat})`);
  const start = grammar.startRule();
  if (start) header.push(`(start ${percentEncodeLinksText(start.name)})`);
  const declarations = grammarDeclarations(grammar);
  if (declarations.matching) header.push(`(matching ${declarations.matching})`);
  if (declarations.settling) header.push(`(settling ${declarations.settling.join(' ')})`);
  const lines = [`(${header.join(' ')})`];
  lines.push(...renderDeclarationLinks(declarations));
  for (const kind of grammar.kinds ?? []) {
    lines.push(`(kind ${percentEncodeLinksText(kind.name)} ${renderSourceNames(kind.sourceNames)})`);
  }
  for (const rule of grammar.rules.values()) lines.push(renderRuleLink(grammar, rule));
  return lines.map((line) => `${line}\n`).join('');
}

const LINKS_CODEC = linksCodec((expression) => renderLinksExpression(expression), percentEncodeLinksText);

function renderOperations(operations) {
  return operations.map((operation) => renderOperation(operation, LINKS_CODEC));
}

// Renders `(source-names (SOURCE NAME)...)`.
function renderSourceNames(sourceNames) {
  const names = sourceNames.map(({ source, name }) => `(${percentEncodeLinksText(source)} ${percentEncodeLinksText(name)})`);
  return `(${['source-names', ...names].join(' ')})`;
}

function renderNames(head, names) {
  return `(${[head, ...names.map(percentEncodeLinksText)].join(' ')})`;
}

/**
 * Renders the declaration links of the grammar feature union (the
 * `grammarDeclarations` shape), in the order the native listing writes them.
 */
export function renderDeclarationLinks(declarations) {
  const lines = [];
  for (const name of declarations.imports) lines.push(`(import ${percentEncodeLinksText(name)})`);
  for (const name of declarations.modes) lines.push(`(mode ${percentEncodeLinksText(name)})`);
  for (const extra of declarations.extras) lines.push(`(extra ${renderLinksExpression(extra)})`);
  for (const group of declarations.conflicts) lines.push(renderNames('conflict', group));
  for (const order of declarations.precedences ?? []) {
    lines.push(`(${['precedences', ...order.map((entry) => `(${entry.kind} ${percentEncodeLinksText(entry.value)})`)].join(' ')})`);
  }
  for (const macro of declarations.macros) {
    lines.push(`(macro ${percentEncodeLinksText(macro.name)} ${renderNames('parameters', macro.parameters ?? [])} ${renderLinksExpression(macro.expression)})`);
  }
  for (const scanner of declarations.scanners) {
    lines.push(`(scanner ${percentEncodeLinksText(scanner.name)} ${renderNames('tokens', scanner.tokens)} `
      + `(${['operations', ...renderOperations(scanner.operations)].join(' ')}))`);
  }
  return lines;
}

/** Renders the `(rule NAME KIND EXPRESSION [(doc TEXT)])` link of one rule of `grammar`. */
export function renderRuleLink(grammar, rule) {
  const parts = ['rule', percentEncodeLinksText(rule.name), rule.kind, renderLinksExpression(rule.expression)];
  parts.push(...renderRuleFieldLinks(rule));
  if (rule.concept !== undefined) parts.push(`(concept ${percentEncodeLinksText(rule.concept)})`);
  if (rule.sourceNames?.length > 0) parts.push(renderSourceNames(rule.sourceNames));
  const doc = ruleDoc(grammar, rule);
  if (doc !== null) parts.push(`(doc ${percentEncodeLinksText(doc)})`);
  return `(${parts.join(' ')})`;
}

/**
 * Renders the feature-union fields of one rule (parameters, channel, modes and
 * action) as the links `renderRuleLink` writes between the expression and the doc.
 */
export function renderRuleFieldLinks(rule) {
  const parts = [];
  if (rule.parameters?.length > 0) parts.push(renderNames('parameters', rule.parameters));
  if (rule.channel !== undefined) parts.push(`(channel ${percentEncodeLinksText(rule.channel)})`);
  if (rule.modes !== undefined) parts.push(renderNames('modes', rule.modes));
  if (rule.action !== undefined) parts.push(`(${['action', ...renderOperations(rule.action)].join(' ')})`);
  return parts;
}

/** Renders one expression of the native links form. */
export function renderLinksExpression(expression) {
  const text = percentEncodeLinksText;
  const link = (...parts) => `(${parts.join(' ')})`;
  const items = (list) => list.map(renderLinksExpression);
  switch (expression.kind) {
    case 'empty': case 'any': return expression.kind;
    case 'literal': case 'literalInsensitive': return link(expression.kind, text(expression.value));
    case 'charRange': return link('range', text(expression.start), text(expression.end));
    case 'charClass':
      return link('class', expression.negated ? 'negated' : 'plain', ...expression.items.map((item) => {
        if (item.kind === 'range') return link('range', text(item.start), text(item.end));
        if (item.kind === 'category' || item.kind === 'script') return link(item.kind, text(item.value));
        return link('char', text(item.value));
      }));
    case 'ref': return link('ref', text(expression.name), ...items(expression.arguments ?? []));
    case 'choice': return link('choice', expression.ordered ? 'ordered' : 'unordered', ...items(expression.items));
    case 'seq': return link('seq', ...items(expression.items));
    case 'optional': case 'repeat0': case 'repeat1': case 'and': case 'not':
      return link(expression.kind, renderLinksExpression(expression.item));
    case 'repeat':
      return link('repeat', String(expression.min), expression.max === null || expression.max === undefined ? 'unbounded' : String(expression.max), renderLinksExpression(expression.item));
    case 'capture':
      return expression.label === null || expression.label === undefined
        ? link('capture', 'unlabeled', renderLinksExpression(expression.item))
        : link('capture', 'labeled', text(expression.label), renderLinksExpression(expression.item));
    default: {
      const rendered = renderFeatureExpression(expression, LINKS_CODEC);
      if (rendered === null) throw new TypeError(`unknown grammar expression kind ${expression.kind}`);
      return rendered;
    }
  }
}

/** A parsed value as `[head, arguments]`: a bare reference is a head without arguments. */
function parts(value) {
  if (value.values.length === 0) {
    if (value.id === null) throw linksError('empty link');
    return [value.id, []];
  }
  if (value.id !== null) throw linksError(`unexpected identified link ${value.id}`);
  const [head, ...rest] = value.values;
  if (head.values.length !== 0 || head.id === null) throw linksError('a link must start with a word');
  return [head.id, rest];
}

function word(value, what) {
  if (value === undefined || value.values.length !== 0 || value.id === null) throw linksError(`expected ${what}`);
  return value.id;
}

function decodedWord(value, what) {
  return percentDecodeLinksText(word(value, what));
}

function character(value, what) {
  const decoded = decodedWord(value, what);
  if ([...decoded].length !== 1) throw linksError(`${what} must be one code point`);
  return decoded;
}

function arity(head, args, count) {
  if (args.length !== count) throw linksError(`${head} takes ${count} value(s), not ${args.length}`);
}

function bound(value, allowUnbounded) {
  const text = word(value, 'a repetition bound');
  if (allowUnbounded && text === 'unbounded') return null;
  if (!/^[0-9]+$/u.test(text)) throw linksError(`invalid repetition bound ${text}`);
  if (text.length > MAX_BOUND_DIGITS) throw linksError(`repetition bound ${text} is too large`);
  return Number(text);
}

function flag(value, yes, no) {
  const text = word(value, `${yes} or ${no}`);
  if (text !== yes && text !== no) throw linksError(`expected ${yes} or ${no}, not ${text}`);
  return text === yes;
}

/** Reads one expression of the native links form. */
export function parseLinksExpression(value) {
  const [head, args] = parts(value);
  switch (head) {
    case 'empty': case 'any':
      arity(head, args, 0);
      return { kind: head };
    case 'literal': case 'literalInsensitive':
      arity(head, args, 1);
      return { kind: head, value: decodedWord(args[0], 'a text') };
    case 'range':
      arity(head, args, 2);
      return { kind: 'charRange', start: character(args[0], 'a range start'), end: character(args[1], 'a range end') };
    case 'class': {
      if (args.length === 0) throw linksError('class needs plain or negated');
      const negated = flag(args[0], 'negated', 'plain');
      const items = args.slice(1).map((item) => {
        const [itemHead, itemArgs] = parts(item);
        if (itemHead === 'char') {
          arity(itemHead, itemArgs, 1);
          return { kind: 'char', value: character(itemArgs[0], 'a class character') };
        }
        if (itemHead === 'range') {
          arity(itemHead, itemArgs, 2);
          return { kind: 'range', start: character(itemArgs[0], 'a range start'), end: character(itemArgs[1], 'a range end') };
        }
        if (itemHead === 'category' || itemHead === 'script') {
          arity(itemHead, itemArgs, 1);
          return { kind: itemHead, value: decodedWord(itemArgs[0], `a Unicode ${itemHead}`) };
        }
        throw linksError(`unknown class item ${itemHead}`);
      });
      return { kind: 'charClass', negated, items };
    }
    case 'ref': {
      if (args.length === 0) throw linksError('ref takes a rule name');
      const reference = { kind: 'ref', name: decodedWord(args[0], 'a rule name') };
      if (args.length > 1) reference.arguments = args.slice(1).map(parseLinksExpression);
      return reference;
    }
    case 'choice': {
      if (args.length === 0) throw linksError('choice needs ordered or unordered');
      const ordered = flag(args[0], 'ordered', 'unordered');
      return { kind: 'choice', items: args.slice(1).map(parseLinksExpression), ordered };
    }
    case 'seq': return { kind: 'seq', items: args.map(parseLinksExpression) };
    case 'repeat': {
      arity(head, args, 3);
      const min = bound(args[0], false);
      const max = bound(args[1], true);
      if (max !== null && max < min) throw linksError(`repetition bounds ${min}, ${max} are reversed`);
      return { kind: 'repeat', item: parseLinksExpression(args[2]), min, max };
    }
    case 'capture': {
      if (args.length === 0) throw linksError('capture needs labeled or unlabeled');
      if (flag(args[0], 'labeled', 'unlabeled')) {
        arity(head, args, 3);
        return { kind: 'capture', label: decodedWord(args[1], 'a capture label'), item: parseLinksExpression(args[2]) };
      }
      arity(head, args, 2);
      return { kind: 'capture', label: null, item: parseLinksExpression(args[1]) };
    }
    default: {
      if (UNARY.has(head)) {
        arity(head, args, 1);
        return { kind: head, item: parseLinksExpression(args[0]) };
      }
      const feature = readLinksFeatureExpression(head, args, LINKS_HELPERS);
      if (feature === null) throw linksError(`unknown expression ${head}`);
      return feature;
    }
  }
}

const LINKS_HELPERS = {
  parts,
  word,
  decodedWord,
  parseLinksExpression,
  fail: (detail) => {
    throw linksError(detail);
  },
};

function names(value, head) {
  const [found, args] = parts(value);
  if (found !== head) throw linksError(`expected (${head} ...), not ${found}`);
  return args.map((item) => decodedWord(item, `a ${head} name`));
}

function operations(value, head) {
  const [found, args] = parts(value);
  if (found !== head) throw linksError(`expected (${head} ...), not ${found}`);
  return args.map((item) => readLinksOperation(item, 'statement', LINKS_HELPERS));
}

// The optional rule fields after the expression, in their fixed order.
const RULE_FIELDS = ['parameters', 'channel', 'modes', 'action', 'concept', 'source-names', 'doc'];

// The `(SOURCE NAME)` pairs of a `(source-names ...)` field.
function sourceNames(args) {
  if (args.length === 0) throw linksError('source-names lists at least one source name');
  return args.map((item) => {
    const [source, name] = parts(item);
    if (name.length !== 1) throw linksError('a source name is (SOURCE NAME)');
    return { source: percentDecodeLinksText(source), name: decodedWord(name[0], 'a source name') };
  });
}

function readRuleFields(fields, rule, name, docs) {
  let order = 0;
  for (const field of fields) {
    const [head, args] = parts(field);
    const position = RULE_FIELDS.indexOf(head);
    if (position < order) throw linksError(position < 0 ? `unexpected rule field ${head}` : `rule field ${head} is out of order`);
    order = position + 1;
    if (head === 'parameters') rule.parameters = names(field, 'parameters');
    else if (head === 'modes') rule.modes = names(field, 'modes');
    else if (head === 'action') rule.action = operations(field, 'action');
    else if (head === 'source-names') rule.sourceNames = sourceNames(args);
    else {
      arity(head, args, 1);
      if (head === 'channel') rule.channel = decodedWord(args[0], 'a channel name');
      else if (head === 'concept') rule.concept = decodedWord(args[0], 'a concept id');
      else docs.set(name, decodedWord(args[0], 'a doc text'));
    }
  }
}

// Reads one declaration link into `declarations`; returns false for a rule link.
function readDeclaration(head, args, declarations) {
  const one = () => {
    arity(head, args, 1);
    return args[0];
  };
  switch (head) {
    case 'import': declarations.imports.push(decodedWord(one(), 'an imported grammar')); return true;
    case 'mode': declarations.modes.push(decodedWord(one(), 'a mode')); return true;
    case 'extra': declarations.extras.push(parseLinksExpression(one())); return true;
    case 'conflict':
      if (args.length === 0) throw linksError('conflict names at least one rule');
      declarations.conflicts.push(args.map((item) => decodedWord(item, 'a rule name')));
      return true;
    case 'precedences':
      if (args.length < 2) throw linksError('precedences orders at least two entries');
      declarations.precedences.push(args.map((item) => {
        const [kind, values] = parts(item);
        if (kind !== 'name' && kind !== 'rule') throw linksError(`a precedence entry is (name NAME) or (rule NAME), not ${kind}`);
        arity(kind, values, 1);
        return { kind, value: decodedWord(values[0], kind === 'name' ? 'a precedence name' : 'a rule name') };
      }));
      return true;
    case 'macro':
      arity(head, args, 3);
      declarations.macros.push({
        name: decodedWord(args[0], 'a macro name'),
        parameters: names(args[1], 'parameters'),
        expression: parseLinksExpression(args[2]),
      });
      return true;
    case 'scanner':
      arity(head, args, 3);
      declarations.scanners.push({
        name: decodedWord(args[0], 'a scanner name'),
        tokens: names(args[1], 'tokens'),
        operations: operations(args[2], 'operations'),
      });
      return true;
    default: return false;
  }
}

/**
 * Reads the native links form written by `renderGrammarLinks`, throwing a
 * `GrammarImportError` of the `meta-language` format.
 */
export function parseGrammarLinks(source) {
  let statements;
  try {
    statements = new Parser({ comments: false }).parse(source);
  } catch (error) {
    throw linksError(error.message);
  }
  if (statements.length === 0) throw linksError('the links define no grammar');
  const [headerHead, headerArgs] = parts(statements[0]);
  if (headerHead !== 'grammar') throw linksError('the first link must be the grammar link');
  let sourceFormat = null;
  let start = null;
  const declarations = {
    matching: null, settling: null, imports: [], modes: [], extras: [], conflicts: [], precedences: [], macros: [], scanners: [],
  };
  for (const field of headerArgs) {
    const [key, values] = parts(field);
    if (key === 'settling' && declarations.settling === null) {
      declarations.settling = values.map((value) => word(value, 'a settling step'));
      const problem = settlingProblem(declarations.settling);
      if (problem) throw linksError(problem);
      continue;
    }
    arity(key, values, 1);
    if (key === 'format' && sourceFormat === null) {
      sourceFormat = word(values[0], 'a format');
      if (!SOURCE_FORMATS.has(sourceFormat)) throw linksError(`unknown source format ${sourceFormat}`);
    } else if (key === 'start' && start === null) {
      start = decodedWord(values[0], 'a start rule');
    } else if (key === 'matching' && declarations.matching === null) {
      declarations.matching = word(values[0], 'a matching');
      if (!MATCHING_MODES.includes(declarations.matching)) throw linksError(`unknown matching ${declarations.matching}`);
    } else {
      throw linksError(`unexpected grammar field ${key}`);
    }
  }
  const rules = new Map();
  const docs = new Map();
  const kinds = [];
  for (const statement of statements.slice(1)) {
    const [head, args] = parts(statement);
    if (head === 'kind' && rules.size === 0) {
      arity(head, args, 2);
      const name = decodedWord(args[0], 'a kind name');
      if (kinds.some((kind) => kind.name === name)) throw linksError(`kind ${name} is given twice`);
      const [field, names] = parts(args[1]);
      if (field !== 'source-names') throw linksError(`expected (source-names ...), not ${field}`);
      kinds.push({ name, sourceNames: sourceNames(names) });
      continue;
    }
    if (head !== 'rule') {
      if (rules.size > 0 || !readDeclaration(head, args, declarations)) throw linksError(`unexpected link ${head}`);
      continue;
    }
    if (args.length < 3) throw linksError('rule takes a name, a kind, an expression and optional fields');
    const name = decodedWord(args[0], 'a rule name');
    const kind = word(args[1], 'a rule kind');
    if (!RULE_KINDS.has(kind)) throw linksError(`unknown rule kind ${kind}`);
    if (rules.has(name)) throw linksError(`rule ${name} is defined twice`);
    const rule = { kind, expression: parseLinksExpression(args[2]) };
    readRuleFields(args.slice(3), rule, name, docs);
    rules.set(name, rule);
  }
  if (rules.size === 0) throw linksError('the links define no rules');
  if (start !== null && !rules.has(start)) throw linksError(`start rule ${start} is not defined`);
  const grammar = new Grammar(start ?? rules.keys().next().value, rules, sourceFormat, declarations);
  for (const [name, doc] of docs) grammar.rules.set(name, Object.freeze({ ...grammar.rules.get(name), doc }));
  grammar.kinds = kinds;
  return grammar;
}
