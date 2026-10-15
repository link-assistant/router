// Grammar interchange commands shared by the JavaScript and Rust command-line
// tools: import, validate, convert, merge, rename, export and round-trip
// grammars. `runGrammarCommand` is the whole command-line behavior with file
// reading injected, so the library and the `meta-language` binary report the
// same standard output, standard error and exit status. It mirrors
// rust/src/grammar/interchange/mod.rs, and the native grammar listing mirrors
// rust/src/grammar/interchange/native.rs.
import { Grammar } from './grammar.js';
import {
  emitAbnf,
  emitAntlr,
  emitBnf,
  emitEbnf,
  emitGbnf,
  emitLark,
  emitPest,
  emitTreeSitterJson,
} from './grammar-emitters.js';
import {
  GrammarImportError,
  importAbnf,
  importAntlr,
  importBnf,
  importEbnf,
  importGbnf,
  importLark,
  importPest,
  importTreeSitterJson,
} from './grammar-importers.js';
import { GrammarMergeError, GrammarRenameError, mergeGrammars, renameGrammarRule } from './grammar-merge.js';
import { checkGrammarRoundTrip } from './grammar-round-trip.js';
import { validateGrammar } from './grammar-validate.js';
import {
  grammarDeclarations,
  lineCodec,
  MATCHING_MODES,
  readLineFeatureExpression,
  readLineInteger,
  readLineOperation,
  renderFeatureExpression,
  renderOperation,
  settlingProblem,
} from './grammar-feature-forms.js';

const IMPORTERS = {
  abnf: importAbnf,
  antlr: importAntlr,
  bnf: importBnf,
  ebnf: importEbnf,
  gbnf: importGbnf,
  lark: importLark,
  native: parseNativeGrammar,
  pest: importPest,
  'tree-sitter-json': importTreeSitterJson,
};

const EMITTERS = {
  abnf: emitAbnf,
  antlr: emitAntlr,
  bnf: emitBnf,
  ebnf: emitEbnf,
  gbnf: emitGbnf,
  lark: emitLark,
  native: (grammar) => ({ source: renderNativeGrammar(grammar), report: { lossy: [] } }),
  pest: emitPest,
  'tree-sitter-json': emitTreeSitterJson,
};

/** The formats `grammarImporter` and the `--from` options read. */
export const GRAMMAR_IMPORT_FORMATS = Object.freeze(Object.keys(IMPORTERS));

/** The formats `grammarEmitter` and the `--to` options write. */
export const GRAMMAR_EXPORT_FORMATS = Object.freeze(Object.keys(EMITTERS));

/** The source format tags a native listing may name on its `format` line. */
const SOURCE_FORMATS = new Set(['meta-language', 'bnf', 'ebnf', 'abnf', 'peg', 'antlr', 'lark', 'gbnf', 'tree-sitter', 'inferred']);

/** The importer of one of `GRAMMAR_IMPORT_FORMATS`, or `null`. */
export function grammarImporter(format) {
  return Object.hasOwn(IMPORTERS, format) ? IMPORTERS[format] : null;
}

/** The emitter of one of `GRAMMAR_EXPORT_FORMATS`, or `null`. */
export function grammarEmitter(format) {
  return Object.hasOwn(EMITTERS, format) ? EMITTERS[format] : null;
}

function nativeError(line, detail) {
  return new GrammarImportError('meta-language', 'parse', line === null ? detail : `line ${line}: ${detail}`);
}

/**
 * Renders the native grammar listing: an optional `format TAG` line, a
 * `start NAME` line for the start rule, the grammar feature union
 * declarations (`matching`, `import`, `mode`, `extra`, `conflict`, `precedences`, `macro`
 * and `scanner` lines, in that order), then one `rule NAME = KIND EXPRESSION`
 * line per rule in grammar order, spelling expressions as the shared grammar
 * parity fixtures do (`seq(ref(a), literal("b"))`). A parameterized rule is
 * `rule NAME(PARAMETER, ...) = ...` and the rule attributes follow the
 * expression as `channel(NAME)`, `modes(MODE, ...)` and `action(OPERATION, ...)`.
 */
export function renderNativeGrammar(grammar) {
  const lines = [];
  if (grammar.sourceFormat) lines.push(`format ${grammar.sourceFormat}`);
  const start = grammar.startRule();
  if (start) lines.push(`start ${renderName(start.name)}`);
  const declarations = grammarDeclarations(grammar);
  const codec = lineCodec(renderNativeExpression, renderName);
  const parameters = (names) => (names?.length > 0 ? `(${names.map(renderName).join(', ')})` : '');
  if (declarations.matching) lines.push(`matching ${declarations.matching}`);
  if (declarations.settling) lines.push(`settling ${declarations.settling.join(' ')}`);
  for (const name of declarations.imports) lines.push(`import ${renderName(name)}`);
  for (const name of declarations.modes) lines.push(`mode ${renderName(name)}`);
  for (const extra of declarations.extras) lines.push(`extra ${renderNativeExpression(extra)}`);
  for (const group of declarations.conflicts) lines.push(`conflict ${group.map(renderName).join(' ')}`);
  for (const order of declarations.precedences) lines.push(`precedences ${order.map((entry) => `${entry.kind}(${renderName(entry.value)})`).join(' ')}`);
  for (const macro of declarations.macros) {
    lines.push(`macro ${renderName(macro.name)}${parameters(macro.parameters)} = ${renderNativeExpression(macro.expression)}`);
  }
  for (const scanner of declarations.scanners) {
    lines.push(`scanner ${renderName(scanner.name)} tokens(${scanner.tokens.map(renderName).join(', ')}) `
      + `operations(${scanner.operations.map((operation) => renderOperation(operation, codec)).join(', ')})`);
  }
  for (const rule of grammar.rules.values()) {
    let line = `rule ${renderName(rule.name)}${parameters(rule.parameters)} = ${rule.kind} ${renderNativeExpression(rule.expression)}`;
    if (rule.channel !== undefined) line += ` channel(${renderName(rule.channel)})`;
    if (rule.modes !== undefined) line += ` modes(${rule.modes.map(renderName).join(', ')})`;
    if (rule.action !== undefined) {
      line += ` action(${rule.action.map((operation) => renderOperation(operation, codec)).join(', ')})`;
    }
    lines.push(line);
  }
  return `${lines.map((line) => `${line}\n`).join('')}`;
}

/** Renders one expression with the native listing spelling. */
export function renderNativeExpression(expression) {
  const inner = renderNativeExpression;
  const list = (items) => items.map(inner).join(', ');
  const quote = (value) => JSON.stringify(value);
  switch (expression.kind) {
    case 'empty': return 'empty';
    case 'any': return 'any';
    case 'literal': return `literal(${quote(expression.value)})`;
    case 'literalInsensitive': return `literalInsensitive(${quote(expression.value)})`;
    case 'charRange': return `range(${quote(expression.start)}, ${quote(expression.end)})`;
    case 'charClass':
      return `${expression.negated ? 'notClass' : 'class'}(${expression.items.map((item) => {
        if (item.kind === 'range') return `range(${quote(item.start)}, ${quote(item.end)})`;
        if (item.kind === 'category' || item.kind === 'script') return `${item.kind}(${quote(item.value)})`;
        return `char(${quote(item.value)})`;
      }).join(', ')})`;
    case 'ref':
      return expression.arguments?.length > 0
        ? `ref(${renderName(expression.name)}, ${list(expression.arguments)})`
        : `ref(${renderName(expression.name)})`;
    case 'choice': return `${expression.ordered ? 'orderedChoice' : 'choice'}(${list(expression.items)})`;
    case 'seq': return `seq(${list(expression.items)})`;
    case 'optional': case 'repeat0': case 'repeat1': case 'and': case 'not':
      return `${expression.kind}(${inner(expression.item)})`;
    case 'repeat': return `repeat(${inner(expression.item)}, ${expression.min}, ${expression.max ?? 'unbounded'})`;
    case 'capture':
      return `capture(${expression.label === null ? 'null' : quote(expression.label)}, ${inner(expression.item)})`;
    default: {
      const rendered = renderFeatureExpression(expression, lineCodec(inner, renderName));
      if (rendered === null) throw new TypeError(`unknown grammar expression kind ${expression.kind}`);
      return rendered;
    }
  }
}

const NAME_STOP = /[\p{White_Space}(),"=]/u;

function renderName(name) {
  return name.length > 0 && ![...name].some((char) => NAME_STOP.test(char)) ? name : JSON.stringify(name);
}

const RULE_KINDS = new Set(['normal', 'atomic', 'silent', 'token']);
const UNARY = new Set(['optional', 'repeat0', 'repeat1', 'and', 'not']);
const MAX_BOUND_DIGITS = 9;

/**
 * Parses a native grammar listing written by `renderNativeGrammar`, throwing a
 * `GrammarImportError` of the `meta-language` format that names the line.
 */
export function parseNativeGrammar(source) {
  const rules = new Map();
  let start = null;
  let startLine = 0;
  let sourceFormat = null;
  const declarations = {
    matching: null, settling: null, imports: [], modes: [], extras: [], conflicts: [], precedences: [], macros: [], scanners: [],
  };
  for (const [index, text] of source.split('\n').entries()) {
    const line = index + 1;
    const cursor = new Cursor([...text.replace(/\r$/u, '')], line);
    cursor.skipSpaces();
    if (cursor.done() || cursor.peek() === '#') continue;
    const directive = cursor.word();
    cursor.requireSpace();
    if (directive === 'format') {
      if (sourceFormat !== null) cursor.fail('the format is given twice');
      sourceFormat = cursor.word();
      if (!SOURCE_FORMATS.has(sourceFormat)) cursor.fail(`unknown source format ${sourceFormat}`);
    } else if (directive === 'start') {
      if (start !== null) cursor.fail('the start rule is given twice');
      start = cursor.name();
      startLine = line;
    } else if (directive === 'rule') {
      const name = cursor.name();
      const parameters = cursor.parameters();
      cursor.skipSpaces();
      cursor.expect('=');
      cursor.skipSpaces();
      const kind = cursor.word();
      if (!RULE_KINDS.has(kind)) cursor.fail(`unknown rule kind ${kind}`);
      cursor.requireSpace();
      const expression = cursor.expression();
      if (rules.has(name)) cursor.fail(`rule ${name} is defined twice`);
      const rule = { kind, expression };
      if (parameters.length > 0) rule.parameters = parameters;
      cursor.ruleAttributes(rule);
      rules.set(name, rule);
    } else if (directive === 'matching') {
      if (declarations.matching !== null) cursor.fail('the matching is given twice');
      declarations.matching = cursor.word();
      if (!MATCHING_MODES.includes(declarations.matching)) cursor.fail(`unknown matching ${declarations.matching}`);
    } else if (directive === 'settling') {
      if (declarations.settling !== null) cursor.fail('the settling is given twice');
      const steps = [cursor.word()];
      for (cursor.skipSpaces(); !cursor.done(); cursor.skipSpaces()) steps.push(cursor.word());
      const problem = settlingProblem(steps);
      if (problem) cursor.fail(problem);
      declarations.settling = steps;
    } else if (directive === 'import') {
      declarations.imports.push(cursor.name());
    } else if (directive === 'mode') {
      declarations.modes.push(cursor.name());
    } else if (directive === 'extra') {
      declarations.extras.push(cursor.expression());
    } else if (directive === 'conflict') {
      const group = [cursor.name()];
      for (cursor.skipSpaces(); !cursor.done(); cursor.skipSpaces()) group.push(cursor.name());
      declarations.conflicts.push(group);
    } else if (directive === 'precedences') {
      const order = [];
      for (; !cursor.done(); cursor.skipSpaces()) {
        const kind = cursor.word();
        if (kind !== 'name' && kind !== 'rule') cursor.fail(`a precedence entry is name(NAME) or rule(NAME), not ${kind}`);
        const [value, ...rest] = cursor.list(() => cursor.name());
        if (value === undefined || rest.length > 0) cursor.fail(`${kind}(...) names one entry`);
        order.push({ kind, value });
      }
      if (order.length < 2) cursor.fail('precedences orders at least two entries');
      declarations.precedences.push(order);
    } else if (directive === 'macro') {
      const name = cursor.name();
      const parameters = cursor.parameters();
      cursor.skipSpaces();
      cursor.expect('=');
      cursor.skipSpaces();
      declarations.macros.push({ name, parameters, expression: cursor.expression() });
    } else if (directive === 'scanner') {
      const name = cursor.name();
      cursor.requireSpace();
      if (cursor.word() !== 'tokens') cursor.fail('expected tokens(...)');
      const tokens = cursor.list(() => cursor.name());
      cursor.requireSpace();
      if (cursor.word() !== 'operations') cursor.fail('expected operations(...)');
      const operations = cursor.list(() => readLineOperation(cursor, 'statement'));
      declarations.scanners.push({ name, tokens, operations });
    } else {
      cursor.fail(`unknown directive ${directive}`);
    }
    cursor.skipSpaces();
    if (!cursor.done()) cursor.fail('unexpected text at the end of the line');
  }
  if (rules.size === 0) throw nativeError(null, 'the listing defines no rules');
  if (start !== null && !rules.has(start)) throw nativeError(startLine, `start rule ${start} is not defined`);
  return new Grammar(start ?? rules.keys().next().value, rules, sourceFormat, declarations);
}

class Cursor {
  constructor(chars, line) {
    this.chars = chars;
    this.line = line;
    this.position = 0;
  }

  fail(detail) {
    throw nativeError(this.line, detail);
  }

  done() {
    return this.position >= this.chars.length;
  }

  peek() {
    return this.chars[this.position];
  }

  skipSpaces() {
    while (this.peek() === ' ' || this.peek() === '\t') this.position += 1;
  }

  requireSpace() {
    if (this.peek() !== ' ' && this.peek() !== '\t') this.fail('expected a space');
    this.skipSpaces();
  }

  expect(char) {
    if (this.peek() !== char) this.fail(`expected ${char}`);
    this.position += 1;
  }

  word() {
    const begin = this.position;
    while (!this.done() && /[A-Za-z0-9_-]/u.test(this.peek())) this.position += 1;
    if (begin === this.position) this.fail('expected a word');
    return this.chars.slice(begin, this.position).join('');
  }

  name() {
    if (this.peek() === '"') return this.string();
    const begin = this.position;
    while (!this.done() && !NAME_STOP.test(this.peek())) this.position += 1;
    if (begin === this.position) this.fail('expected a name');
    return this.chars.slice(begin, this.position).join('');
  }

  string() {
    if (this.peek() !== '"') this.fail('expected a string');
    const begin = this.position;
    this.position += 1;
    while (!this.done() && this.peek() !== '"') this.position += this.peek() === '\\' ? 2 : 1;
    if (this.done()) this.fail('unterminated string');
    this.position += 1;
    let value;
    try {
      value = JSON.parse(this.chars.slice(begin, this.position).join(''));
    } catch {
      this.fail('invalid string');
    }
    // A lone surrogate escape is not a Unicode scalar value, which the Rust
    // runtime's strings cannot hold.
    if (/\p{Cs}/u.test(value)) this.fail('invalid string');
    return value;
  }

  character() {
    const value = this.string();
    if ([...value].length !== 1) this.fail('a character must be one code point');
    return value;
  }

  integer() {
    return readLineInteger(this);
  }

  /** The optional `(NAME, ...)` parameter list after a rule or macro name. */
  parameters() {
    if (this.peek() !== '(') return [];
    const names = this.list(() => this.name());
    if (names.length === 0) this.fail('a parameter list names at least one parameter');
    if (new Set(names).size !== names.length) this.fail('a parameter is named twice');
    return names;
  }

  /** The `channel(NAME)`, `modes(MODE, ...)` and `action(OPERATION, ...)` attributes after a rule expression. */
  ruleAttributes(rule) {
    const order = ['channel', 'modes', 'action'];
    let next = 0;
    for (this.skipSpaces(); !this.done(); this.skipSpaces()) {
      // Text that is not `channel(`, `modes(` or `action(` is trailing text,
      // reported as it was before rule attributes existed.
      const begin = this.position;
      while (!this.done() && /[A-Za-z]/u.test(this.peek())) this.position += 1;
      const attribute = this.chars.slice(begin, this.position).join('');
      const position = order.indexOf(attribute);
      if (position < 0 || this.peek() !== '(') {
        this.position = begin;
        this.fail('unexpected text at the end of the line');
      }
      if (position < next) this.fail(`rule attribute ${attribute} is out of order`);
      next = position + 1;
      if (attribute === 'channel') {
        this.open();
        rule.channel = this.name();
        this.close();
      } else if (attribute === 'modes') {
        rule.modes = this.list(() => this.name());
      } else {
        rule.action = this.list(() => readLineOperation(this, 'statement'));
      }
    }
  }

  bound(allowUnbounded) {
    if (allowUnbounded && this.peek() === 'u') {
      if (this.word() !== 'unbounded') this.fail('expected a repetition bound');
      return null;
    }
    const begin = this.position;
    while (!this.done() && /[0-9]/u.test(this.peek())) this.position += 1;
    const digits = this.chars.slice(begin, this.position).join('');
    if (digits.length === 0) this.fail('expected a repetition bound');
    if (digits.length > MAX_BOUND_DIGITS) this.fail(`repetition bound ${digits} is too large`);
    return Number(digits);
  }

  separator() {
    this.skipSpaces();
    this.expect(',');
    this.skipSpaces();
  }

  open() {
    this.expect('(');
    this.skipSpaces();
  }

  close() {
    this.skipSpaces();
    this.expect(')');
  }

  list(item) {
    this.open();
    const items = [];
    this.skipSpaces();
    while (this.peek() !== ')') {
      if (items.length > 0) this.separator();
      items.push(item());
      this.skipSpaces();
      if (this.done()) this.fail('expected )');
    }
    this.close();
    return items;
  }

  expression() {
    const kind = this.word();
    switch (kind) {
      case 'empty': return { kind: 'empty' };
      case 'any': return { kind: 'any' };
      case 'literal': case 'literalInsensitive': {
        this.open();
        const value = this.string();
        this.close();
        return { kind, value };
      }
      case 'range': {
        this.open();
        const start = this.character();
        this.separator();
        const end = this.character();
        this.close();
        return { kind: 'charRange', start, end };
      }
      case 'class': case 'notClass':
        return { kind: 'charClass', negated: kind === 'notClass', items: this.list(() => this.classItem()) };
      case 'ref': {
        this.open();
        const name = this.name();
        const args = [];
        for (this.skipSpaces(); this.peek() === ','; this.skipSpaces()) {
          this.separator();
          args.push(this.expression());
        }
        this.close();
        return args.length > 0 ? { kind: 'ref', name, arguments: args } : { kind: 'ref', name };
      }
      case 'choice': case 'orderedChoice':
        return { kind: 'choice', items: this.list(() => this.expression()), ordered: kind === 'orderedChoice' };
      case 'seq': return { kind: 'seq', items: this.list(() => this.expression()) };
      case 'repeat': {
        this.open();
        const item = this.expression();
        this.separator();
        const min = this.bound(false);
        this.separator();
        const max = this.bound(true);
        this.close();
        if (max !== null && max < min) this.fail(`repetition bounds ${min}, ${max} are reversed`);
        return { kind, item, min, max };
      }
      case 'capture': {
        this.open();
        let label = null;
        if (this.peek() === '"') label = this.string();
        else if (this.word() !== 'null') this.fail('expected a capture label or null');
        this.separator();
        const item = this.expression();
        this.close();
        return { kind, label, item };
      }
      default: {
        const feature = readLineFeatureExpression(kind, this);
        if (feature !== null) return feature;
        if (!UNARY.has(kind)) this.fail(`unknown expression ${kind}`);
        this.open();
        const item = this.expression();
        this.close();
        return { kind, item };
      }
    }
  }

  classItem() {
    const kind = this.word();
    this.open();
    let item;
    if (kind === 'char') {
      item = { kind: 'char', value: this.character() };
    } else if (kind === 'range') {
      const start = this.character();
      this.separator();
      item = { kind: 'range', start, end: this.character() };
    } else if (kind === 'category' || kind === 'script') {
      item = { kind, value: this.string() };
    } else {
      this.fail(`unknown class item ${kind}`);
    }
    this.close();
    return item;
  }
}

/** The help text of `meta-language grammar`, the same in both runtimes. */
export const GRAMMAR_COMMAND_USAGE = `usage: meta-language grammar <command> [options]

commands:
  formats
      list the import and export formats
  import --from FORMAT FILE
      print the grammar as a native listing
  validate --from FORMAT FILE
      report grammar diagnostics; exit 1 when one is an error
  convert --from FORMAT --to FORMAT FILE
      translate a grammar to another format; lossy steps go to standard error
  export --to FORMAT FILE
      export a native listing to another format
  merge --source FORMAT:FILE... [--language NAME] [--require A=B]... [--to FORMAT]
      merge grammars of one language; earlier sources take precedence
  rename --from FORMAT --rule OLD --name NEW [--namespace NS] [--to FORMAT] FILE
      rename a rule and every reference to it
  round-trip --from FORMAT [--accept TEXT]... [--reject TEXT]... FILE
      export and re-import a mutated grammar; exit 1 when it is not preserved
  help
      print this help

exit status: 0 success, 1 a problem was found, 2 a usage or input error
`;

class CommandError extends Error {
  constructor(message, detail = null) {
    super(message);
    this.detail = detail;
  }
}

const COMMANDS = {
  formats: { options: {}, files: 0, run: formatsCommand },
  import: { options: { from: 'one' }, files: 1, run: importCommand },
  validate: { options: { from: 'one' }, files: 1, run: validateCommand },
  convert: { options: { from: 'one', to: 'one' }, files: 1, run: convertCommand },
  export: { options: { to: 'one' }, files: 1, run: exportCommand },
  merge: { options: { source: 'many', language: 'one', require: 'many', to: 'one' }, files: 0, run: mergeCommand },
  rename: { options: { from: 'one', rule: 'one', name: 'one', namespace: 'one', to: 'one' }, files: 1, run: renameCommand },
  'round-trip': { options: { from: 'one', accept: 'many', reject: 'many' }, files: 1, run: roundTripCommand },
};

const REQUIRED = {
  import: ['from'],
  validate: ['from'],
  convert: ['from', 'to'],
  export: ['to'],
  merge: ['source'],
  rename: ['from', 'rule', 'name'],
  'round-trip': ['from'],
};

/**
 * Runs `meta-language grammar <command> ...` over `args` and returns
 * `{ exitCode, stdout, stderr }`; `readFile(path)` returns a file's text.
 */
export function runGrammarCommand(args, { readFile }) {
  const [name, ...rest] = args;
  if (name === undefined) return { exitCode: 2, stdout: '', stderr: GRAMMAR_COMMAND_USAGE };
  if (name === 'help' || name === '--help' || name === '-h') return { exitCode: 0, stdout: GRAMMAR_COMMAND_USAGE, stderr: '' };
  const output = { stdout: [], stderr: [] };
  try {
    const command = COMMANDS[name];
    if (!command) throw new CommandError(`unknown command ${name}; run meta-language grammar help`);
    const { options, files } = parseArguments(name, command, rest);
    const exitCode = command.run({ options, files, readFile, output });
    return { exitCode, stdout: joinLines(output.stdout), stderr: joinLines(output.stderr) };
  } catch (error) {
    if (!(error instanceof CommandError)) throw error;
    output.stderr.push(`error: ${error.message}`);
    if (error.detail !== null) output.stderr.push(error.detail);
    return { exitCode: 2, stdout: joinLines(output.stdout), stderr: joinLines(output.stderr) };
  }
}

function joinLines(lines) {
  return lines.map((line) => (line.endsWith('\n') ? line : `${line}\n`)).join('');
}

function parseArguments(name, command, rest) {
  const options = {};
  const files = [];
  for (let index = 0; index < rest.length; index += 1) {
    const argument = rest[index];
    if (!argument.startsWith('--')) {
      files.push(argument);
      continue;
    }
    const option = argument.slice(2);
    const arity = command.options[option];
    if (!arity) throw new CommandError(`unknown option ${argument} for grammar ${name}`);
    if (index + 1 >= rest.length) throw new CommandError(`option ${argument} needs a value`);
    const value = rest[index + 1];
    index += 1;
    if (arity === 'many') {
      (options[option] ??= []).push(value);
    } else {
      if (option in options) throw new CommandError(`option ${argument} is given twice`);
      options[option] = value;
    }
  }
  for (const option of REQUIRED[name] ?? []) {
    if (!(option in options)) throw new CommandError(`grammar ${name} needs --${option}`);
  }
  if (files.length > command.files) throw new CommandError(`unexpected argument ${files[command.files]}`);
  if (files.length < command.files) throw new CommandError(`grammar ${name} needs a grammar file`);
  return { options, files };
}

function importFormat(format) {
  if (!GRAMMAR_IMPORT_FORMATS.includes(format)) {
    throw new CommandError(`unknown import format ${format} (expected one of: ${GRAMMAR_IMPORT_FORMATS.join(', ')})`);
  }
  return format;
}

function exportFormat(format) {
  if (!GRAMMAR_EXPORT_FORMATS.includes(format)) {
    throw new CommandError(`unknown export format ${format} (expected one of: ${GRAMMAR_EXPORT_FORMATS.join(', ')})`);
  }
  return format;
}

function read(readFile, file) {
  try {
    return readFile(file);
  } catch {
    throw new CommandError(`cannot read ${file}`);
  }
}

function importFailure(file, format, error) {
  if (error instanceof GrammarImportError) {
    const category = error.kind === 'unsupported' ? 'unsupported construct' : 'parse error';
    return new CommandError(`cannot import ${file} as ${format} (${category})`, error.message);
  }
  return null;
}

function load(readFile, file, format) {
  const source = read(readFile, file);
  try {
    return grammarImporter(format)(source);
  } catch (error) {
    throw importFailure(file, format, error) ?? error;
  }
}

function emit(output, format, grammar) {
  let emitted;
  try {
    emitted = grammarEmitter(format)(grammar);
  } catch (error) {
    if (error?.name !== 'GrammarEmitError') throw error;
    throw new CommandError(`cannot export as ${format}`, error.message);
  }
  output.stdout.push(emitted.source);
  for (const note of emitted.report.lossy) output.stderr.push(`lossy: ${note}`);
}

function formatsCommand({ output }) {
  output.stdout.push(`import: ${GRAMMAR_IMPORT_FORMATS.join(' ')}`, `export: ${GRAMMAR_EXPORT_FORMATS.join(' ')}`);
  return 0;
}

function importCommand({ options, files: [file], readFile, output }) {
  output.stdout.push(renderNativeGrammar(load(readFile, file, importFormat(options.from))));
  return 0;
}

function validateCommand({ options, files: [file], readFile, output }) {
  const diagnostics = validateGrammar(load(readFile, file, importFormat(options.from)));
  for (const { severity, kind, rule, message } of diagnostics) output.stdout.push(`${severity} ${kind} ${rule}: ${message}`);
  const errors = diagnostics.filter(({ severity }) => severity === 'error').length;
  output.stdout.push(`${errors} error(s), ${diagnostics.length - errors} warning(s)`);
  return errors > 0 ? 1 : 0;
}

function convertCommand({ options, files: [file], readFile, output }) {
  const to = exportFormat(options.to);
  emit(output, to, load(readFile, file, importFormat(options.from)));
  return 0;
}

function exportCommand({ options, files: [file], readFile, output }) {
  const to = exportFormat(options.to);
  emit(output, to, load(readFile, file, 'native'));
  return 0;
}

function mergeCommand({ options, readFile, output }) {
  const to = exportFormat(options.to ?? 'native');
  const language = options.language ?? 'grammar';
  const ids = new Set();
  const sources = options.source.map((argument, precedence) => {
    const colon = argument.indexOf(':');
    if (colon < 0) throw new CommandError(`a merge source is FORMAT:FILE, not ${argument}`);
    const format = importFormat(argument.slice(0, colon));
    const file = argument.slice(colon + 1);
    const id = baseName(file);
    if (ids.has(id)) throw new CommandError(`merge sources need distinct file names, ${id} is given twice`);
    ids.add(id);
    return { id, language, precedence, grammar: load(readFile, file, format) };
  });
  const requiredEquivalences = (options.require ?? []).map((pair) => {
    const equals = pair.indexOf('=');
    if (equals < 0) throw new CommandError(`a required equivalence is SOURCE:RULE=SOURCE:RULE, not ${pair}`);
    return [pair.slice(0, equals), pair.slice(equals + 1)];
  });
  let result;
  try {
    result = mergeGrammars(sources, { requiredEquivalences });
  } catch (error) {
    if (!(error instanceof GrammarMergeError)) throw error;
    throw new CommandError(error.message);
  }
  const [group] = result.groups;
  emit(output, to, group.grammar);
  for (const { kind, name, members, basis } of group.decisions) output.stderr.push(`${kind} ${name}: ${members.join(' ')} (${basis})`);
  for (const { reason, name, options: choices } of [...group.alternatives, ...result.alternatives]) {
    output.stderr.push(`alternative ${reason} ${name}: ${choices.join(' ')}`);
  }
  for (const { members, reason } of result.failures) output.stderr.push(`unresolved ${members.join(' = ')}: ${reason}`);
  return result.status === 'complete' ? 0 : 1;
}

function baseName(file) {
  return file.slice(Math.max(file.lastIndexOf('/'), file.lastIndexOf('\\')) + 1);
}

function renameCommand({ options, files: [file], readFile, output }) {
  const to = exportFormat(options.to ?? 'native');
  const grammar = load(readFile, file, importFormat(options.from));
  let renamed;
  try {
    renamed = renameGrammarRule(grammar, options.rule, options.name, { namespace: options.namespace ?? null });
  } catch (error) {
    if (!(error instanceof GrammarRenameError)) throw error;
    throw new CommandError(error.message);
  }
  emit(output, to, renamed.grammar);
  for (const { canonical, original } of renamed.aliases) output.stderr.push(`alias ${canonical} = ${original}`);
  return 0;
}

function roundTripCommand({ options, files: [file], readFile, output }) {
  const format = importFormat(options.from);
  if (!GRAMMAR_EXPORT_FORMATS.includes(format)) {
    throw new CommandError(`round-trip needs a format that is both imported and exported (one of: ${GRAMMAR_EXPORT_FORMATS.join(', ')})`);
  }
  const source = read(readFile, file);
  let report;
  try {
    report = checkGrammarRoundTrip(source, {
      importGrammar: grammarImporter(format),
      emitGrammar: grammarEmitter(format),
      accepts: options.accept ?? [],
      rejects: options.reject ?? [],
    });
  } catch (error) {
    const failure = importFailure(file, format, error);
    if (failure) throw failure;
    if (error?.name === 'GrammarEmitError') throw new CommandError(`cannot export as ${format}`, error.message);
    if (error instanceof GrammarMergeError || error?.message === 'the grammar has no start rule to mutate') {
      throw new CommandError(`cannot round-trip ${file}`, error.message);
    }
    throw error;
  }
  output.stdout.push(report.status);
  for (const { kind, stage, detail } of report.failures) output.stdout.push(`${kind} ${stage}: ${detail}`);
  return report.status === 'preserved' ? 0 : 1;
}
