// The grammar feature union forms (docs/vision.md#grammar-feature-union) of
// the two native grammar serializations: the line listing of
// grammar-interchange.js and the links form of grammar-links.js. One table
// describes every expression kind, every operation of the scanner and action
// language and every grammar declaration the feature union adds, and the two
// codecs below render and read them from that table, so both serializations
// stay in step. docs/grammar/feature-union.md is the specification.

/** The expression kinds the feature union adds, with their fields in listing order. */
export const FEATURE_EXPRESSION_FORMS = Object.freeze({
  precedence: [['level', 'integer'], ['associativity', ['left', 'right', 'none']], ['item', 'expression']],
  namedPrecedence: [['name', 'name'], ['associativity', ['left', 'right', 'none']], ['item', 'expression']],
  dynamicPrecedence: [['level', 'integer'], ['item', 'expression']],
  lexicalPrecedence: [['level', 'integer'], ['item', 'expression']],
  longest: [['items', 'expressions']],
  token: [['item', 'expression']],
  immediateToken: [['item', 'expression']],
  alias: [['name', 'name'], ['item', 'expression']],
  parameter: [['name', 'name']],
  predicate: [['item', 'expression'], ['condition', 'condition']],
  recover: [['item', 'expression'], ['synchronize', 'expression']],
  missing: [['item', 'expression']],
  embed: [['language', 'name'], ['item', 'expression']],
  expand: [['name', 'name'], ['arguments', 'expressions']],
});

/**
 * The operation language of external scanners, semantic actions and
 * predicates: each operation is a statement, a condition or a value, with its
 * fields in listing order. A `block:WORD` field is a statement list written
 * as `WORD(...)`; a trailing `?` makes it optional.
 */
export const OPERATION_FORMS = Object.freeze({
  advance: ['statement', []],
  consume: ['statement', [['item', 'expression']]],
  skip: ['statement', [['item', 'expression']]],
  mark: ['statement', []],
  emit: ['statement', [['token', 'name']]],
  fail: ['statement', []],
  if: ['statement', [['condition', 'condition'], ['consequent', 'block:then'], ['alternative', 'block:else?']]],
  while: ['statement', [['condition', 'condition'], ['body', 'block:do']]],
  push: ['statement', [['stack', 'name'], ['value', 'value']]],
  pop: ['statement', [['stack', 'name']]],
  set: ['statement', [['variable', 'name'], ['value', 'value']]],
  pushMode: ['statement', [['mode', 'name']]],
  popMode: ['statement', []],
  setMode: ['statement', [['mode', 'name']]],
  setAttribute: ['statement', [['attribute', 'name'], ['value', 'value']]],
  buildNode: ['statement', [['kind', 'name']]],
  valid: ['condition', [['token', 'name']]],
  expected: ['condition', [['item', 'expression']]],
  next: ['condition', [['item', 'expression']]],
  atEnd: ['condition', []],
  equal: ['condition', [['left', 'value'], ['right', 'value']]],
  less: ['condition', [['left', 'value'], ['right', 'value']]],
  greater: ['condition', [['left', 'value'], ['right', 'value']]],
  all: ['condition', [['conditions', 'conditions']]],
  some: ['condition', [['conditions', 'conditions']]],
  not: ['condition', [['condition', 'condition']]],
  integer: ['value', [['value', 'integer']]],
  text: ['value', [['value', 'text']]],
  variable: ['value', [['name', 'name']]],
  top: ['value', [['stack', 'name']]],
  depth: ['value', [['stack', 'name']]],
  column: ['value', []],
  matched: ['value', []],
  mode: ['value', []],
  attribute: ['value', [['field', 'name'], ['attribute', 'name']]],
  sumOf: ['value', [['field', 'name'], ['attribute', 'name']]],
  fieldText: ['value', [['field', 'name']]],
  length: ['value', [['value', 'value']]],
  uppercase: ['value', [['value', 'value']]],
  number: ['value', [['value', 'value']]],
  add: ['value', [['left', 'value'], ['right', 'value']]],
  subtract: ['value', [['left', 'value'], ['right', 'value']]],
  multiply: ['value', [['left', 'value'], ['right', 'value']]],
});

/**
 * The ways a grammar may match: generalized (every alternative), PEG (first
 * and greedy) or longest (generalized, ties going to the longer token).
 */
export const MATCHING_MODES = Object.freeze(['generalized', 'peg', 'longest']);

/**
 * The steps that settle two parses of one text that end alike, as a
 * grammar's `(settling STEP ...)` declares them, in order (the lower repair
 * cost always decides first): `tokens`, the tokens a lexer prefers (higher
 * lexical precedence, longer, a literal over a pattern, earlier), with the
 * lexing that goes with it (keywords, separators, immediate tokens);
 * `precedence`, the shift or reduction an LR parser keeps by precedence and
 * associativity, forking where a declared conflict asks; `dynamic`, the
 * higher dynamic precedence. The last step settles a tie: `first` keeps the
 * parse reached first, `ambiguity` keeps it and reports the ambiguity.
 */
export const SETTLING_STEPS = Object.freeze(['tokens', 'precedence', 'dynamic', 'first', 'ambiguity']);

/** The settling of a grammar that declares none, by its matching. */
export const DEFAULT_SETTLING = Object.freeze({
  generalized: Object.freeze(['dynamic', 'ambiguity']),
  peg: Object.freeze(['first']),
  longest: Object.freeze(['tokens', 'precedence', 'dynamic', 'ambiguity']),
});

/**
 * Why `steps` is no settling, or null: every step is known and given once,
 * and exactly the last one settles a tie.
 */
export function settlingProblem(steps) {
  if (steps.length === 0) return 'the settling names no step';
  for (const [index, step] of steps.entries()) {
    if (!SETTLING_STEPS.includes(step)) return `unknown settling step ${step}`;
    if (steps.indexOf(step) !== index) return `the settling step ${step} is given twice`;
    const tie = step === 'first' || step === 'ambiguity';
    if (tie !== (index === steps.length - 1)) return 'the settling ends with exactly one of first and ambiguity';
  }
  return null;
}

/** The rule attributes, in the order both serializations write them. */
export const RULE_ATTRIBUTES = Object.freeze(['channel', 'modes', 'action']);

const MAX_INTEGER_DIGITS = 15;

/** The declarations of `grammar`, with every list present. */
export function grammarDeclarations(grammar) {
  const declarations = grammar.declarations ?? {};
  return {
    matching: declarations.matching ?? null,
    settling: declarations.settling ?? null,
    imports: declarations.imports ?? [],
    modes: declarations.modes ?? [],
    extras: declarations.extras ?? [],
    conflicts: declarations.conflicts ?? [],
    precedences: declarations.precedences ?? [],
    macros: declarations.macros ?? [],
    scanners: declarations.scanners ?? [],
  };
}

/** Drops the empty declarations, so a grammar without any keeps its earlier shape. */
export function compactDeclarations(declarations) {
  const compact = {};
  for (const [key, value] of Object.entries(declarations ?? {})) {
    if (value === null || value === undefined) continue;
    if (Array.isArray(value) && value.length === 0) continue;
    compact[key] = value;
  }
  return compact;
}

// A codec turns field values into the text of one serialization.
function renderFields(fields, object, codec) {
  const parts = [];
  for (const [key, type] of fields) {
    const value = object[key];
    if (Array.isArray(type)) parts.push(value);
    else if (type === 'integer') parts.push(String(value));
    else if (type === 'name') parts.push(codec.name(value));
    else if (type === 'text') parts.push(codec.text(value));
    else if (type === 'expression') parts.push(codec.expression(value));
    else if (type === 'expressions') parts.push(...value.map(codec.expression));
    else if (type === 'condition' || type === 'value') parts.push(renderOperation(value, codec));
    else if (type === 'conditions') parts.push(...value.map((item) => renderOperation(item, codec)));
    else if (type.startsWith('block:')) {
      if (value === undefined) continue;
      const word = type.slice('block:'.length).replace('?', '');
      parts.push(codec.block(word, value.map((item) => renderOperation(item, codec))));
    } else {
      throw new TypeError(`unknown field type ${type}`);
    }
  }
  return parts;
}

/** Renders one operation of the scanner and action language. */
export function renderOperation(operation, codec) {
  const form = OPERATION_FORMS[operation?.operation];
  if (!form) throw new TypeError(`unknown grammar operation ${operation?.operation}`);
  return codec.call(operation.operation, renderFields(form[1], operation, codec));
}

/** Renders a feature union expression, or returns `null` for an expression kind it does not add. */
export function renderFeatureExpression(expression, codec) {
  if (expression.kind === 'byteClass') {
    const items = expression.items.map((item) => (item.kind === 'byteRange'
      ? codec.call('byteRange', [String(item.start), String(item.end)])
      : codec.call('byte', [String(item.value)])));
    return codec.byteClass(expression.negated, items);
  }
  const fields = FEATURE_EXPRESSION_FORMS[expression.kind];
  if (!fields) return null;
  return codec.call(expression.kind, renderFields(fields, expression, codec));
}

/** The line listing codec: `head(field, field)` with quoted texts. */
export function lineCodec(renderExpression, renderName) {
  const codec = {
    name: renderName,
    text: (value) => JSON.stringify(value),
    expression: renderExpression,
    call: (head, parts) => (parts.length === 0 ? head : `${head}(${parts.join(', ')})`),
    block: (word, parts) => `${word}(${parts.join(', ')})`,
    byteClass: (negated, items) => `${negated ? 'notByteClass' : 'byteClass'}(${items.join(', ')})`,
  };
  return codec;
}

/** The links codec: `(head field field)` with percent-encoded texts. */
export function linksCodec(renderExpression, encode) {
  return {
    name: encode,
    text: encode,
    expression: renderExpression,
    call: (head, parts) => (parts.length === 0 ? head : `(${[head, ...parts].join(' ')})`),
    block: (word, parts) => `(${[word, ...parts].join(' ')})`,
    byteClass: (negated, items) => `(${['byteClass', negated ? 'negated' : 'plain', ...items].join(' ')})`,
  };
}

function checkInteger(text, fail) {
  if (!/^-?[0-9]+$/u.test(text)) fail(`expected an integer, not ${text}`);
  if (text.replace('-', '').length > MAX_INTEGER_DIGITS) fail(`integer ${text} is too large`);
  return Number(text);
}

function checkByte(value, fail) {
  if (!Number.isInteger(value) || value < 0 || value > 255) fail(`byte ${value} is outside 0..255`);
  return value;
}

/**
 * Reads the fields of one form from the line listing cursor, which stands
 * after the head word. The cursor is grammar-interchange.js's `Cursor`.
 */
function readLineFields(fields, cursor, object) {
  if (fields.length === 0) return object;
  cursor.open();
  let first = true;
  const separate = () => {
    if (!first) cursor.separator();
    first = false;
  };
  for (const [key, type] of fields) {
    cursor.skipSpaces();
    if (Array.isArray(type)) {
      separate();
      const word = cursor.word();
      if (!type.includes(word)) cursor.fail(`expected ${type.join(' or ')}, not ${word}`);
      object[key] = word;
    } else if (type === 'integer') {
      separate();
      object[key] = cursor.integer();
    } else if (type === 'name') {
      separate();
      object[key] = cursor.name();
    } else if (type === 'text') {
      separate();
      object[key] = cursor.string();
    } else if (type === 'expression') {
      separate();
      object[key] = cursor.expression();
    } else if (type === 'condition' || type === 'value') {
      separate();
      object[key] = readLineOperation(cursor, type);
    } else if (type === 'expressions' || type === 'conditions') {
      const items = [];
      cursor.skipSpaces();
      while (cursor.peek() !== ')') {
        separate();
        items.push(type === 'expressions' ? cursor.expression() : readLineOperation(cursor, 'condition'));
        cursor.skipSpaces();
        if (cursor.done()) cursor.fail('expected )');
      }
      object[key] = items;
    } else if (type.startsWith('block:')) {
      const optional = type.endsWith('?');
      const word = type.slice('block:'.length).replace('?', '');
      cursor.skipSpaces();
      if (optional && cursor.peek() === ')') continue;
      separate();
      if (cursor.word() !== word) cursor.fail(`expected ${word}(...)`);
      object[key] = cursor.list(() => readLineOperation(cursor, 'statement'));
    }
  }
  cursor.close();
  return object;
}

/** Reads one operation of the given category (statement, condition or value) from the line listing. */
export function readLineOperation(cursor, category) {
  const head = cursor.word();
  const form = OPERATION_FORMS[head];
  if (!form) cursor.fail(`unknown operation ${head}`);
  if (form[0] !== category) cursor.fail(`${head} is a ${form[0]}, not a ${category}`);
  return readLineFields(form[1], cursor, { operation: head });
}

/** Reads a feature union expression headed by `head` from the line listing, or returns `null`. */
export function readLineFeatureExpression(head, cursor) {
  if (head === 'byteClass' || head === 'notByteClass') {
    const items = cursor.list(() => readLineByteItem(cursor));
    return { kind: 'byteClass', negated: head === 'notByteClass', items };
  }
  const fields = FEATURE_EXPRESSION_FORMS[head];
  if (!fields) return null;
  const expression = readLineFields(fields, cursor, { kind: head });
  if (head === 'longest' && expression.items.length === 0) cursor.fail('longest needs an alternative');
  return expression;
}

function readLineByteItem(cursor) {
  const head = cursor.word();
  const fail = (detail) => cursor.fail(detail);
  if (head === 'byte') {
    cursor.open();
    const value = checkByte(cursor.integer(), fail);
    cursor.close();
    return { kind: 'byte', value };
  }
  if (head === 'byteRange') {
    cursor.open();
    const start = checkByte(cursor.integer(), fail);
    cursor.separator();
    const end = checkByte(cursor.integer(), fail);
    cursor.close();
    if (end < start) fail(`byte range ${start}, ${end} is reversed`);
    return { kind: 'byteRange', start, end };
  }
  return fail(`unknown byte class item ${head}`);
}

/** Reads a signed integer at the cursor. */
export function readLineInteger(cursor) {
  const begin = cursor.position;
  if (cursor.peek() === '-') cursor.position += 1;
  while (!cursor.done() && /[0-9]/u.test(cursor.peek())) cursor.position += 1;
  return checkInteger(cursor.chars.slice(begin, cursor.position).join(''), (detail) => cursor.fail(detail));
}

// The links reader: `helpers` carries grammar-links.js's `parts`, `word`,
// `decodedWord`, `parseLinksExpression` and `fail`.
function readLinksFields(fields, args, helpers, object, head) {
  let index = 0;
  for (const [key, type] of fields) {
    const next = () => {
      if (index >= args.length) helpers.fail(`${head} needs ${key}`);
      const value = args[index];
      index += 1;
      return value;
    };
    if (Array.isArray(type)) {
      const word = helpers.word(next(), type.join(' or '));
      if (!type.includes(word)) helpers.fail(`expected ${type.join(' or ')}, not ${word}`);
      object[key] = word;
    } else if (type === 'integer') {
      object[key] = checkInteger(helpers.word(next(), 'an integer'), helpers.fail);
    } else if (type === 'name') {
      object[key] = helpers.decodedWord(next(), `a ${key}`);
    } else if (type === 'text') {
      object[key] = helpers.decodedWord(next(), 'a text');
    } else if (type === 'expression') {
      object[key] = helpers.parseLinksExpression(next());
    } else if (type === 'condition' || type === 'value') {
      object[key] = readLinksOperation(next(), type, helpers);
    } else if (type === 'expressions') {
      object[key] = args.slice(index).map(helpers.parseLinksExpression);
      index = args.length;
    } else if (type === 'conditions') {
      object[key] = args.slice(index).map((item) => readLinksOperation(item, 'condition', helpers));
      index = args.length;
    } else if (type.startsWith('block:')) {
      const optional = type.endsWith('?');
      const word = type.slice('block:'.length).replace('?', '');
      if (optional && index >= args.length) continue;
      const [blockHead, blockArgs] = helpers.parts(next());
      if (blockHead !== word) helpers.fail(`expected (${word} ...), not ${blockHead}`);
      object[key] = blockArgs.map((item) => readLinksOperation(item, 'statement', helpers));
    }
  }
  if (index !== args.length) helpers.fail(`${head} takes fewer values`);
  return object;
}

/** Reads one operation of the given category from the links form. */
export function readLinksOperation(value, category, helpers) {
  const [head, args] = helpers.parts(value);
  const form = OPERATION_FORMS[head];
  if (!form) helpers.fail(`unknown operation ${head}`);
  if (form[0] !== category) helpers.fail(`${head} is a ${form[0]}, not a ${category}`);
  return readLinksFields(form[1], args, helpers, { operation: head }, head);
}

/** Reads a feature union expression from the links form, or returns `null`. */
export function readLinksFeatureExpression(head, args, helpers) {
  if (head === 'byteClass') {
    if (args.length === 0) helpers.fail('byteClass needs plain or negated');
    const flag = helpers.word(args[0], 'plain or negated');
    if (flag !== 'plain' && flag !== 'negated') helpers.fail(`expected plain or negated, not ${flag}`);
    const items = args.slice(1).map((item) => {
      const [itemHead, itemArgs] = helpers.parts(item);
      const byte = (value) => checkByte(checkInteger(helpers.word(value, 'a byte'), helpers.fail), helpers.fail);
      if (itemHead === 'byte' && itemArgs.length === 1) return { kind: 'byte', value: byte(itemArgs[0]) };
      if (itemHead === 'byteRange' && itemArgs.length === 2) {
        const start = byte(itemArgs[0]);
        const end = byte(itemArgs[1]);
        if (end < start) helpers.fail(`byte range ${start}, ${end} is reversed`);
        return { kind: 'byteRange', start, end };
      }
      return helpers.fail(`unknown byte class item ${itemHead}`);
    });
    return { kind: 'byteClass', negated: flag === 'negated', items };
  }
  const fields = FEATURE_EXPRESSION_FORMS[head];
  if (!fields) return null;
  const expression = readLinksFields(fields, args, helpers, { kind: head }, head);
  if (head === 'longest' && expression.items.length === 0) helpers.fail('longest needs an alternative');
  return expression;
}
