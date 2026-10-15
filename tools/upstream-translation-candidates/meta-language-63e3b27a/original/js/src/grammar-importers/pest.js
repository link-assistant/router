import { GrammarBuilder, canonicalRepeat, choice, sequence } from '../grammar.js';
import {
  Cursor,
  grammarFromRules,
  parseError,
  rule,
  unsupportedError,
} from './common.js';
import { decorateGrammar } from '../grammar-decorators.js';

const FORMAT = 'peg';
const PEST_BUILTINS = [
  'ANY', 'SOI', 'EOI', 'ASCII_DIGIT', 'ASCII_NONZERO_DIGIT', 'ASCII_BIN_DIGIT',
  'ASCII_OCT_DIGIT', 'ASCII_HEX_DIGIT', 'ASCII_ALPHA_LOWER', 'ASCII_ALPHA_UPPER',
  'ASCII_ALPHA', 'ASCII_ALPHANUMERIC', 'ASCII', 'NEWLINE',
  'UNICODE', 'LETTER', 'CASED_LETTER', 'UPPERCASE_LETTER', 'LOWERCASE_LETTER',
  'TITLECASE_LETTER', 'MODIFIER_LETTER', 'OTHER_LETTER', 'MARK', 'NUMBER',
  'PUNCTUATION', 'SEPARATOR', 'SYMBOL', 'CONTROL', 'XID_START', 'XID_CONTINUE',
];

/** Imports pest PEG grammar source into the shared grammar representation. */
export function importPest(source, options = {}) {
  return decorateGrammar(readPest(source), options.decorators, 'importer');
}

function readPest(source) {
  const parser = new PestParser(String(source));
  return grammarFromRules(FORMAT, parser.parseRules(), null, PEST_BUILTINS);
}

class PestParser extends Cursor {
  constructor(source) {
    super(source, FORMAT);
  }

  skipSpace() {
    while (true) {
      while (/\s/.test(this.peek())) this.offset += 1;
      if (this.source.startsWith('//', this.offset)) {
        const end = this.source.indexOf('\n', this.offset + 2);
        this.offset = end < 0 ? this.source.length : end + 1;
      } else if (this.source.startsWith('/*', this.offset)) {
        const end = this.source.indexOf('*/', this.offset + 2);
        if (end < 0) this.error('unterminated block comment');
        this.offset = end + 2;
      } else {
        return;
      }
    }
  }

  parseRules() {
    const rules = [];
    while (true) {
      this.skipSpace();
      if (this.eof()) break;
      const name = this.identifier();
      if (rules.some((candidate) => candidate.name === name)) {
        throw parseError(FORMAT, `duplicate rule ${name}`);
      }
      this.consume('=');
      this.skipSpace();
      let kind = 'normal';
      if (['_', '@', '$', '!'].includes(this.peek())) {
        const modifier = this.take();
        kind = { _: 'silent', '@': 'atomic', $: 'token' }[modifier] ?? 'normal';
      }
      this.consume('{');
      const expression = this.alternation();
      this.consume('}');
      rules.push(rule(name, expression, kind));
    }
    return rules;
  }

  alternation() {
    const alternatives = [this.sequence()];
    while (this.tryConsume('|')) alternatives.push(this.sequence());
    return choice(alternatives, true);
  }

  sequence() {
    const items = [this.prefix()];
    while (this.tryConsume('~')) items.push(this.prefix());
    return sequence(items);
  }

  prefix() {
    if (this.tryConsume('&')) return GrammarBuilder.and(this.prefix());
    if (this.tryConsume('!')) return GrammarBuilder.not(this.prefix());
    return this.postfix();
  }

  postfix() {
    let expression = this.atom();
    if (this.tryConsume('?')) return GrammarBuilder.optional(expression);
    if (this.tryConsume('*')) return GrammarBuilder.repeat0(expression);
    if (this.tryConsume('+')) return GrammarBuilder.repeat1(expression);
    this.skipSpace();
    const counted = /^\{\s*(\d*)\s*(?:,\s*(\d*)\s*)?\}/.exec(this.source.slice(this.offset));
    if (counted && (counted[1] !== '' || counted[2] !== undefined)) {
      this.offset += counted[0].length;
      const hasComma = counted[0].includes(',');
      const min = counted[1] === '' ? 0 : Number(counted[1]);
      const max = hasComma
        ? counted[2] === '' ? null : Number(counted[2])
        : min;
      expression = canonicalRepeat(expression, min, max);
    }
    return expression;
  }

  atom() {
    this.skipSpace();
    if (this.tryConsume('(')) {
      const expression = this.alternation();
      this.consume(')');
      return expression;
    }
    if (this.peek() === '^') {
      this.offset += 1;
      if (this.peek() !== '"') this.error('case-insensitive marker must precede a string');
      return GrammarBuilder.literalInsensitive(this.quoted());
    }
    if (this.peek() === '"') return GrammarBuilder.literal(this.quoted());
    if (this.peek() === "'") {
      const start = this.quoted();
      this.consume('..');
      const end = this.quoted();
      if ([...start].length !== 1 || [...end].length !== 1) {
        throw parseError(FORMAT, 'character range endpoints must be one character');
      }
      return GrammarBuilder.charRange(start, end);
    }
    const name = this.identifier();
    this.skipSpace();
    if (name === 'PUSH' && this.peek() === '(') throw unsupportedError(FORMAT, 'Push');
    if (name === 'PEEK' && this.peek() === '[') throw unsupportedError(FORMAT, 'PeekSlice');
    return name === 'ANY' ? GrammarBuilder.any() : GrammarBuilder.ref(name);
  }
}
