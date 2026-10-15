import {
  GrammarBuilder,
  canonicalRepeat,
  choice,
  sequence,
} from '../grammar.js';
import {
  Cursor,
  grammarFromRules,
  parseError,
  rule,
  stripLineComment,
  unsupportedError,
} from './common.js';
import { decorateGrammar } from '../grammar-decorators.js';

const FORMAT = 'abnf';

/** Imports RFC 5234 ABNF, including core rules and incremental alternatives. */
export function importAbnf(source, options = {}) {
  return decorateGrammar(readAbnf(source), options.decorators, 'importer');
}

function readAbnf(source) {
  const parsed = [];
  for (const line of logicalLines(source)) {
    const match = /^([A-Za-z][A-Za-z0-9-]*)\s*(=\/|=)\s*(.*)$/.exec(line);
    if (!match) throw parseError(FORMAT, `invalid rule ${JSON.stringify(line)}`);
    const [, name, operator, rhs] = match;
    const expression = new AbnfExpressionParser(rhs).parse();
    const existing = parsed.find((candidate) => candidate.name.toLowerCase() === name.toLowerCase());
    if (operator === '=/') {
      if (!existing) throw parseError(FORMAT, `incremental alternative for undefined rule ${name}`);
      existing.expression = choice([existing.expression, expression], false);
    } else if (existing) {
      throw parseError(FORMAT, `duplicate rule ${name}`);
    } else {
      parsed.push(rule(name, expression));
    }
  }

  canonicalizeReferences(parsed);
  injectCoreRules(parsed);
  return grammarFromRules(FORMAT, parsed);
}

class AbnfExpressionParser extends Cursor {
  constructor(source) {
    super(source, FORMAT);
  }

  parse() {
    const expression = this.alternation();
    this.skipSpace();
    if (!this.eof()) this.error('unexpected ABNF input');
    return expression;
  }

  alternation(close = null) {
    const alternatives = [this.concatenation(close)];
    while (this.tryConsume('/')) alternatives.push(this.concatenation(close));
    return choice(alternatives, false);
  }

  concatenation(close) {
    const items = [];
    while (true) {
      this.skipSpace();
      if (this.eof() || this.peek() === '/' || (close && this.peek() === close)) break;
      items.push(this.repetition());
    }
    return sequence(items);
  }

  repetition() {
    this.skipSpace();
    const rest = this.source.slice(this.offset);
    const repeated = /^(?:(\d*)\*(\d*)|(\d+))/.exec(rest);
    let bounds = null;
    if (repeated) {
      this.offset += repeated[0].length;
      bounds = repeated[3]
        ? [Number(repeated[3]), Number(repeated[3])]
        : [repeated[1] === '' ? 0 : Number(repeated[1]),
          repeated[2] === '' ? null : Number(repeated[2])];
    }
    const atom = this.atom();
    return bounds ? canonicalRepeat(atom, bounds[0], bounds[1]) : atom;
  }

  atom() {
    this.skipSpace();
    if (this.eof()) this.error('expected ABNF element');
    if (this.tryConsume('(')) {
      const expression = this.alternation(')');
      this.consume(')');
      return expression;
    }
    if (this.tryConsume('[')) {
      const expression = this.alternation(']');
      this.consume(']');
      return GrammarBuilder.optional(expression);
    }
    if (this.peek() === '"') {
      return GrammarBuilder.literalInsensitive(this.quoted());
    }
    if (this.peek() === '<') {
      throw unsupportedError(FORMAT, 'prose-val');
    }
    if (this.peek() === '%') return this.percentValue();
    return GrammarBuilder.ref(this.identifier(/[A-Za-z][A-Za-z0-9-]*/y));
  }

  percentValue() {
    this.consume('%');
    const kind = this.take()?.toLowerCase();
    if ((kind === 's' || kind === 'i') && this.peek() === '"') {
      const value = this.quoted();
      return kind === 's'
        ? GrammarBuilder.literal(value)
        : GrammarBuilder.literalInsensitive(value);
    }
    if (!['b', 'd', 'x'].includes(kind)) this.error('invalid percent value');
    const radix = { b: 2, d: 10, x: 16 }[kind];
    const digits = { b: '[01]', d: '[0-9]', x: '[0-9A-Fa-f]' }[kind];
    const pattern = new RegExp(`^(${digits}+)(?:-(${digits}+)|((?:\\.${digits}+)+))?`);
    const match = pattern.exec(this.source.slice(this.offset));
    if (!match) this.error('invalid numeric terminal');
    this.offset += match[0].length;
    if (match[2]) return GrammarBuilder.charRange(
      decodeCodePoint(match[1], radix),
      decodeCodePoint(match[2], radix),
    );
    if (match[3]) {
      const values = [match[1], ...match[3].slice(1).split('.')];
      return GrammarBuilder.literal(values.map((value) => decodeCodePoint(value, radix)).join(''));
    }
    return GrammarBuilder.literal(decodeCodePoint(match[1], radix));
  }
}

function logicalLines(source) {
  const lines = [];
  for (const physical of String(source).split(/\r?\n/)) {
    const withoutComment = stripLineComment(physical).replace(/\s+$/, '');
    if (!withoutComment.trim()) continue;
    if (/^[ \t]/.test(withoutComment)) {
      if (lines.length === 0) throw parseError(FORMAT, 'continuation without a rule');
      lines[lines.length - 1] += ` ${withoutComment.trim()}`;
    } else {
      lines.push(withoutComment);
    }
  }
  return lines;
}

function decodeCodePoint(value, radix) {
  const codePoint = Number.parseInt(value, radix);
  if (!Number.isSafeInteger(codePoint) || codePoint > 0x10ffff) {
    throw unsupportedError(FORMAT, `numeric terminal value ${value}`);
  }
  return String.fromCodePoint(codePoint);
}

function canonicalizeReferences(rules) {
  const names = new Map(rules.map(({ name }) => [name.toLowerCase(), name]));
  for (const current of rules) visit(current.expression, (expression) => {
    if (expression.kind === 'ref' && names.has(expression.name.toLowerCase())) {
      expression.name = names.get(expression.name.toLowerCase());
    }
  });
}

function injectCoreRules(rules) {
  while (true) {
    const defined = new Set(rules.map(({ name }) => name));
    const referenced = new Set();
    for (const current of rules) visit(current.expression, (expression) => {
      if (expression.kind === 'ref') referenced.add(expression.name);
    });
    const missing = [...referenced].filter((name) => !defined.has(name));
    let added = false;
    for (const name of missing) {
      const expression = coreExpression(name);
      if (expression) {
        rules.push(rule(name, expression));
        added = true;
      }
    }
    if (!added) return;
  }
}

function coreExpression(name) {
  const range = (start, end) => ({ kind: 'range', start, end });
  const character = (value) => ({ kind: 'char', value });
  switch (name.toUpperCase()) {
    case 'ALPHA': return GrammarBuilder.charClass([range('A', 'Z'), range('a', 'z')]);
    case 'BIT': return GrammarBuilder.charRange('0', '1');
    case 'CHAR': return GrammarBuilder.charRange('\u0001', '\u007f');
    case 'CR': return GrammarBuilder.literal('\r');
    case 'CRLF': return sequence([GrammarBuilder.literal('\r'), GrammarBuilder.literal('\n')]);
    case 'CTL': return choice([
      GrammarBuilder.charRange('\u0000', '\u001f'),
      GrammarBuilder.charRange('\u007f', '\u007f'),
    ]);
    case 'DIGIT': return GrammarBuilder.charRange('0', '9');
    case 'DQUOTE': return GrammarBuilder.literal('"');
    case 'HEXDIG': return GrammarBuilder.charClass([
      range('0', '9'), range('A', 'F'), range('a', 'f'),
    ]);
    case 'HTAB': return GrammarBuilder.literal('\t');
    case 'LF': return GrammarBuilder.literal('\n');
    case 'OCTET': return GrammarBuilder.charRange('\u0000', '\u00ff');
    case 'SP': return GrammarBuilder.literal(' ');
    case 'VCHAR': return GrammarBuilder.charRange('!', '~');
    case 'WSP': return GrammarBuilder.charClass([character(' '), character('\t')]);
    case 'LWSP': return GrammarBuilder.repeat0(choice([
      GrammarBuilder.charClass([character(' '), character('\t')]),
      sequence([
        GrammarBuilder.literal('\r\n'),
        GrammarBuilder.charClass([character(' '), character('\t')]),
      ]),
    ]));
    default: return null;
  }
}

function visit(expression, callback) {
  callback(expression);
  for (const item of expression.items ?? []) visit(item, callback);
  if (expression.item) visit(expression.item, callback);
}
