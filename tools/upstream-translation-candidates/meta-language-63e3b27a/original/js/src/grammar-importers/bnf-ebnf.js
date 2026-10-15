import { GrammarBuilder, choice, sequence } from '../grammar.js';
import {
  Cursor,
  grammarFromRules,
  parseError,
  rule,
  stripLineComment,
  unsupportedError,
} from './common.js';
import { decorateGrammar } from '../grammar-decorators.js';

/** Imports classic angle-bracket Backus-Naur Form. */
export function importBnf(source, options = {}) {
  return decorateGrammar(readBnf(source), options.decorators, 'importer');
}

function readBnf(source) {
  const rules = [];
  for (const rawLine of String(source).split(/\r?\n/)) {
    const line = stripLineComment(rawLine, ';', { escapes: false }).trim();
    if (!line) continue;
    const match = /^<([^<>]+)>\s*::=\s*(.*)$/.exec(line);
    if (!match) throw parseError('bnf', `invalid production ${JSON.stringify(line)}`);
    const name = match[1].trim();
    const expression = new BnfExpressionParser(match[2]).parse();
    const existing = rules.find((candidate) => candidate.name === name);
    if (existing) existing.expression = choice([existing.expression, expression]);
    else rules.push(rule(name, expression));
  }
  return grammarFromRules('bnf', rules);
}

class BnfExpressionParser extends Cursor {
  constructor(source) {
    super(source, 'bnf');
  }

  parse() {
    const alternatives = [];
    do {
      const items = [];
      while (true) {
        this.skipSpace();
        if (this.eof() || this.peek() === '|') break;
        items.push(this.atom());
      }
      alternatives.push(sequence(items));
    } while (this.tryConsume('|'));
    this.skipSpace();
    if (!this.eof()) this.error('unexpected BNF input');
    return alternativesChoice(alternatives);
  }

  atom() {
    this.skipSpace();
    // Classic BNF terminals have no escape sequences, as in the Rust BNF importer.
    if (this.peek() === '"' || this.peek() === "'") return terminal(this.quoted(null));
    if (this.tryConsume('<')) {
      const end = this.source.indexOf('>', this.offset);
      if (end < 0) this.error('unterminated non-terminal');
      const name = this.source.slice(this.offset, end).trim();
      this.offset = end + 1;
      if (!name) this.error('empty non-terminal');
      return GrammarBuilder.ref(name);
    }
    this.error('expected literal or non-terminal');
  }
}

/** Imports ISO-style EBNF with groups, options, repetitions, and postfixes. */
export function importEbnf(source, options = {}) {
  return decorateGrammar(readEbnf(source), options.decorators, 'importer');
}

function readEbnf(source) {
  const parser = new EbnfGrammarParser(removeEbnfComments(String(source)));
  return grammarFromRules('ebnf', parser.parse());
}

class EbnfGrammarParser extends Cursor {
  constructor(source) {
    super(source, 'ebnf');
  }

  parse() {
    const rules = [];
    while (true) {
      this.skipSpace();
      if (this.eof()) break;
      const name = this.identifier();
      if (rules.some((candidate) => candidate.name === name)) {
        throw parseError('ebnf', `duplicate rule ${name}`);
      }
      if (!this.tryConsume('::=')) this.consume('=');
      const expression = this.alternation(';');
      this.consume(';');
      rules.push(rule(name, expression));
    }
    return rules;
  }

  alternation(close) {
    const alternatives = [this.concatenation(close)];
    while (this.tryConsume('|')) alternatives.push(this.concatenation(close));
    return alternativesChoice(alternatives);
  }

  concatenation(close) {
    const items = [];
    while (true) {
      this.skipSpace();
      const character = this.peek();
      if (this.eof() || character === '|' || character === close || ')]}'.includes(character)) break;
      if (character === ',') {
        this.offset += 1;
        continue;
      }
      items.push(this.postfix());
    }
    return sequence(items);
  }

  postfix() {
    let expression = this.atom();
    if (this.tryConsume('?')) expression = GrammarBuilder.optional(expression);
    else if (this.tryConsume('*')) expression = GrammarBuilder.repeat0(expression);
    else if (this.tryConsume('+')) expression = GrammarBuilder.repeat1(expression);
    return expression;
  }

  atom() {
    this.skipSpace();
    if (this.peek() === '"' || this.peek() === "'") {
      return terminal(this.quoted(decodeEbnfEscape));
    }
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
    if (this.tryConsume('{')) {
      const expression = this.alternation('}');
      this.consume('}');
      return GrammarBuilder.repeat0(expression);
    }
    if (this.peek() === '?') throw unsupportedError('ebnf', 'special sequence');
    if (this.peek() === '#') throw unsupportedError('ebnf', 'inline regex');
    return GrammarBuilder.ref(this.identifier());
  }
}

const EBNF_ESCAPES = { t: '\t', b: '\b', n: '\n', r: '\r', f: '\f', '/': '/', '\\': '\\' };

/** Decodes the escape set the EBNF importers (JS and Rust) accept inside a quoted terminal. */
function decodeEbnfEscape(escaped, quote) {
  if (escaped === quote) return quote;
  if (Object.hasOwn(EBNF_ESCAPES, escaped)) return EBNF_ESCAPES[escaped];
  throw parseError('ebnf', `unsupported string escape \\${escaped}`);
}

function removeEbnfComments(source) {
  let result = '';
  let quote = null;
  for (let index = 0; index < source.length;) {
    const character = source[index];
    if (quote) {
      result += character;
      if (character === '\\' && index + 1 < source.length) {
        result += source[index + 1];
        index += 2;
        continue;
      }
      if (character === quote) quote = null;
      index += 1;
      continue;
    }
    if (character === '"' || character === "'") {
      quote = character;
      result += character;
      index += 1;
      continue;
    }
    if (source.startsWith('(*', index)) {
      const end = source.indexOf('*)', index + 2);
      if (end < 0) throw parseError('ebnf', 'unterminated comment');
      result += ' ';
      index = end + 2;
      continue;
    }
    result += character;
    index += 1;
  }
  if (quote) throw parseError('ebnf', 'unterminated string literal');
  return result;
}

// A choice of only empty alternatives is itself empty, as in the Rust importers.
function alternativesChoice(alternatives) {
  return alternatives.every(({ kind }) => kind === 'empty')
    ? GrammarBuilder.empty()
    : choice(alternatives, false);
}

// An empty terminal matches the empty string, as in the Rust importers.
function terminal(value) {
  return value === '' ? GrammarBuilder.empty() : GrammarBuilder.literal(value);
}
