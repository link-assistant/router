// Mirrors rust/src/grammar/emit/antlr.rs: the ANTLR v4 grammar emitter. Output
// text, `report.lossy` notes and GrammarEmitError messages are byte-identical
// to the Rust `emit_antlr` for the same grammar.

import { importAntlr } from '../grammar-importers/antlr.js';
import { codePoint, decorateEmitted, emitReport, finishLines, unsupportedError } from './common.js';
import {
  NamePlan,
  Precedence,
  asciiIdentifier,
  caseVariants,
  classItems,
  collectReferences,
  docLines,
  isAsciiAlphabetic,
  isAsciiUpper,
  isControl,
  joinChoice,
  joinSequence,
  lowerRepeat,
  negatedLookaheadSet,
  repeatBounds,
  ruleDoc,
  ruleKind,
  rustDebugCharLiteral,
  rustDebugOption,
  rustDebugString,
  rustTrim,
  wrap,
} from './structural.js';

const FORMAT = 'antlr';
const LABEL = 'ANTLR';

/** Lower-case words ANTLR reserves, which cannot name parser rules or labels. */
const RESERVED_WORDS = [
  'catch', 'channels', 'finally', 'fragment', 'grammar', 'import', 'lexer', 'locals', 'mode',
  'options', 'parser', 'returns', 'throws', 'tokens',
];

/** Token names ANTLR predefines, which cannot name lexer rules. */
const RESERVED_TOKENS = ['EOF'];

/**
 * Emits a combined ANTLR v4 grammar.
 *
 * Normal rules become parser rules (lower-case first letter), token and atomic
 * rules become lexer rules (upper-case first letter) and silent rules become
 * `fragment` lexer rules. Rule names are adjusted deterministically to ANTLR's
 * case conventions and reserved words; every rename and every lowering
 * (ordered choice, lookahead, case-insensitive literals, counted repetition,
 * captures) is recorded in `report.lossy`. Rule documentation is written as
 * comments, and a trailing `-> command` part of a lexer rule's documentation
 * is written back as the lexer command.
 *
 * Throws GrammarEmitError for empty non-negated character classes, descending
 * character ranges, repetitions whose maximum is below their minimum, and
 * counted repetitions that would expand to more than 256 copies.
 */
export function emitAntlr(grammar, options = {}) {
  return decorateEmitted('antlr', writeAntlr(grammar), options.decorators);
}

function writeAntlr(grammar) {
  return new AntlrEmitter(grammar).emit();
}

class AntlrEmitter {
  constructor(grammar) {
    this.grammar = grammar;
    this.rules = [...grammar.rules.values()];
    this.report = emitReport();
    const candidates = this.rules.map((rule) => ruleCandidate(rule.name, isLexerKind(ruleKind(rule))));
    this.names = new NamePlan(grammar, LABEL, candidates, [], referenceCandidate, this.report);
    this.foreign = grammar.sourceFormat !== FORMAT;
    this.rule = '';
  }

  emit() {
    const order = this.emissionOrder();
    this.noteStart(order);

    const hasParserRules = this.rules.some((rule) => ruleKind(rule) === 'normal');
    let grammarName = order.length === 0 ? '' : pascalCase(this.names.ruleName(order[0]));
    if (!isAsciiAlphabetic(grammarName[0])) grammarName = 'Grammar';
    const lines = [hasParserRules ? `grammar ${grammarName};` : `lexer grammar ${grammarName};`];
    if (order.length > 0) lines.push('');
    for (const index of order) this.emitRule(index, lines);
    return { source: finishLines(lines), report: this.report };
  }

  /** Orders rules so that `importAntlr` picks the same start rule (the first parser rule). */
  emissionOrder() {
    const { start } = this.grammar;
    const found = start === null || start === undefined
      ? -1
      : this.rules.findIndex((rule) => rule.name === start);
    const startIndex = found < 0 ? null : found;
    let effective;
    if (startIndex !== null && ruleKind(this.rules[startIndex]) === 'normal') {
      effective = startIndex;
    } else {
      const firstParser = this.rules.findIndex((rule) => ruleKind(rule) === 'normal');
      effective = firstParser >= 0 ? firstParser : startIndex;
    }
    const order = effective === null ? [] : [effective];
    this.rules.forEach((_rule, index) => {
      if (index !== effective) order.push(index);
    });
    return order;
  }

  noteStart(order) {
    const { start } = this.grammar;
    if (start === null || start === undefined || order.length === 0) return;
    const expected = this.names.resolve(start);
    const actual = this.names.ruleName(order[0]);
    if (expected !== actual) {
      this.report.lossy.push(`ANTLR re-imports start rule as ${rustDebugString(actual)} instead of ${rustDebugString(expected)}, because ANTLR starts at the first parser rule`);
    }
  }

  emitRule(index, lines) {
    const rule = this.rules[index];
    const kind = ruleKind(rule);
    const name = this.names.ruleName(index);
    this.rule = name;
    const lexer = isLexerKind(kind);
    this.noteKind(rule, kind, name);

    const sourceDoc = ruleDoc(this.grammar, rule);
    const doc = planDoc(sourceDoc, lexer);
    if (doc.reimported !== sourceDoc) {
      this.report.lossy.push(`ANTLR re-imports the documentation of rule ${rustDebugString(name)} as ${rustDebugOption(doc.reimported)}`);
    }
    lines.push(...doc.comments);

    const [body] = this.render(rule.expression);
    let line = kind === 'silent' ? `fragment ${name} :` : `${name} :`;
    if (body !== '') line += ` ${body}`;
    if (doc.command !== null) line += ` ${doc.command}`;
    line += ' ;';
    lines.push(line);

    if (this.foreign) this.noteRulePlacement(rule, name, lexer);
  }

  noteKind(rule, kind, name) {
    if (kind === 'atomic') {
      this.report.lossy.push(`ANTLR emitted atomic rule ${rustDebugString(rule.name)} as lexer rule ${rustDebugString(name)}, which re-imports as a token rule`);
    } else if (kind === 'silent' && this.foreign) {
      this.report.lossy.push(`ANTLR emitted silent rule ${rustDebugString(rule.name)} as lexer fragment ${rustDebugString(name)}`);
    }
  }

  /**
   * Records rules that real ANTLR would reject: lexer rules referring to parser
   * rules, parser rules referring to fragments, and parser rules using
   * character-level constructs.
   */
  noteRulePlacement(rule, name, lexer) {
    for (const reference of collectReferences(rule.expression)) {
      const target = this.grammar.rule(reference);
      if (target === undefined) continue;
      const emitted = this.names.resolve(reference);
      const targetKind = ruleKind(target);
      if (lexer && targetKind === 'normal') {
        this.report.lossy.push(`ANTLR lexer rule ${rustDebugString(name)} references parser rule ${rustDebugString(emitted)}`);
      } else if (!lexer && targetKind === 'silent') {
        this.report.lossy.push(`ANTLR parser rule ${rustDebugString(name)} references lexer fragment ${rustDebugString(emitted)}`);
      }
    }
    if (!lexer && usesCharacterConstructs(rule.expression)) {
      this.report.lossy.push(`ANTLR parser rule ${rustDebugString(name)} uses character-level constructs that ANTLR matches only in lexer rules`);
    }
  }

  note(message) {
    this.report.lossy.push(`ANTLR ${message} in rule ${rustDebugString(this.rule)}`);
  }

  render(expression) {
    switch (expression.kind) {
      case 'empty':
        return ['', Precedence.SEQUENCE];
      case 'literal':
        if (expression.value === '') this.note('keeps an empty literal, which the ANTLR tool rejects,');
        return [quote(expression.value), Precedence.ATOM];
      case 'literalInsensitive':
        return this.renderInsensitive(expression.value);
      case 'charRange': {
        const { start, end } = expression;
        if (codePoint(start) > codePoint(end)) {
          throw unsupportedError(FORMAT, `descending character range ${rustDebugCharLiteral(start)}..${rustDebugCharLiteral(end)}`);
        }
        return [`${quote(start)}..${quote(end)}`, Precedence.ATOM];
      }
      case 'charClass':
        return this.renderClass(Boolean(expression.negated), classItems(FORMAT, expression));
      case 'any':
        return ['.', Precedence.ATOM];
      case 'ref':
        return [this.names.resolve(expression.name), Precedence.ATOM];
      case 'choice': {
        if (expression.ordered && expression.items.length > 1) {
          this.note('treats ordered choice as unordered choice');
        }
        return joinChoice(expression.items.map((alternative) => this.render(alternative)));
      }
      case 'seq':
        return this.renderSequence(expression.items);
      case 'optional':
        return this.renderPostfix(expression.item, '?');
      case 'repeat0':
        return this.renderPostfix(expression.item, '*');
      case 'repeat1':
        return this.renderPostfix(expression.item, '+');
      case 'repeat': {
        const max = expression.max ?? null;
        const lowered = lowerRepeat(FORMAT, expression.item, expression.min, max);
        this.note(`expanded counted repetition ${repeatBounds(expression.min, max)}`);
        return this.render(lowered);
      }
      case 'and':
        this.note('dropped positive lookahead');
        return ['', Precedence.SEQUENCE];
      case 'not':
        return this.renderNot(expression.item);
      case 'capture':
        return this.renderCapture(expression.label ?? null, expression.item);
      default:
        throw unsupportedError(FORMAT, expression.kind);
    }
  }

  renderSequence(items) {
    const rendered = [];
    let index = 0;
    while (index < items.length) {
      const set = this.foreign ? negatedLookaheadSet(FORMAT, items, index) : null;
      if (set !== null) {
        this.note('lowered negative lookahead followed by any character to a complemented set');
        rendered.push(renderSet(set[0], set[1]));
        index += 2;
        continue;
      }
      rendered.push(this.render(items[index]));
      index += 1;
    }
    return joinSequence(rendered);
  }

  renderPostfix(inner, operator) {
    const operand = this.render(inner);
    return [`${wrap(operand, Precedence.PREFIX)}${operator}`, Precedence.POSTFIX];
  }

  renderNot(inner) {
    if (inner.kind === 'charClass' && !inner.negated) {
      this.note('emitted negative lookahead over a character set as a complemented set');
    } else if (this.foreign) {
      this.note('emitted negative lookahead as the `~` complement, which consumes one symbol');
    }
    const operand = this.render(inner);
    return [`~${wrap(operand, Precedence.ATOM)}`, Precedence.PREFIX];
  }

  renderCapture(label, inner) {
    if (label === null) {
      this.note('dropped anonymous capture');
      return this.render(inner);
    }
    if (label === 'non_greedy' && ['optional', 'repeat0', 'repeat1'].includes(inner.kind)) {
      const [text] = this.render(inner);
      return [`${text}?`, Precedence.POSTFIX];
    }
    const emitted = labelCandidate(label);
    if (emitted !== label) {
      this.note(`renamed capture label ${rustDebugString(label)} to ${rustDebugString(emitted)}`);
    }
    if (label === 'regex' && this.grammar.sourceFormat === 'lark' && inner.kind === 'literal') {
      this.note(`emitted regex /${inner.value}/ as a literal labelled \`regex\`; regex semantics are not translated`);
    }
    const operand = this.render(inner);
    return [`${emitted}=${wrap(operand, Precedence.POSTFIX)}`, Precedence.LABELED];
  }

  renderInsensitive(value) {
    if (value === '') return this.render({ kind: 'literal', value: '' });
    const items = [];
    let literal = '';
    for (const character of value) {
      const variants = caseVariants(character);
      if (variants !== null) {
        if (literal !== '') {
          items.push({ kind: 'literal', value: literal });
          literal = '';
        }
        items.push({
          kind: 'charClass',
          negated: false,
          items: variants.map((variant) => ({ kind: 'char', value: variant })),
        });
      } else {
        literal += character;
      }
    }
    if (literal !== '') items.push({ kind: 'literal', value: literal });
    this.note(`expanded case-insensitive literal ${rustDebugString(value)} to per-letter character sets`);
    return this.render(items.length === 1 ? items[0] : { kind: 'seq', items });
  }

  renderClass(negated, items) {
    if (items.length === 0) {
      if (negated) {
        this.note('emitted an empty negated character class as `.`');
        return ['.', Precedence.ATOM];
      }
      throw unsupportedError(FORMAT, 'empty character class');
    }
    const descending = items.find((item) => item.kind === 'range' &&
      codePoint(item.start) > codePoint(item.end));
    if (descending !== undefined) {
      throw unsupportedError(FORMAT, `descending character class range ${rustDebugCharLiteral(descending.start)}-${rustDebugCharLiteral(descending.end)}`);
    }
    return renderSet(negated, items);
  }
}

function isLexerKind(kind) {
  return kind !== 'normal';
}

/** Returns ANTLR's conventional spelling of a rule name. */
function ruleCandidate(name, lexer) {
  let output = asciiIdentifier(name);
  const first = output[0];
  if (isAsciiAlphabetic(first)) {
    output = (lexer ? first.toUpperCase() : first.toLowerCase()) + output.slice(1);
  } else {
    output = (lexer ? 'T' : 'r') + output;
  }
  if ((lexer ? RESERVED_TOKENS : RESERVED_WORDS).includes(output)) output += '_';
  return output;
}

/** Returns a valid spelling for a reference without a rule, keeping its case. */
function referenceCandidate(name) {
  const lexer = isAsciiUpper(name[0]);
  let output = asciiIdentifier(name);
  if (!isAsciiAlphabetic(output[0])) output = (lexer ? 'T' : 'r') + output;
  if (RESERVED_WORDS.includes(output)) output += '_';
  return output;
}

function labelCandidate(label) {
  let output = asciiIdentifier(label);
  if (!(isAsciiAlphabetic(output[0]) || output[0] === '_')) output = `l${output}`;
  if (RESERVED_WORDS.includes(output)) output += '_';
  return output;
}

function pascalCase(name) {
  return name.split('_')
    .filter((part) => part !== '')
    .map((part) => {
      const first = part[0];
      return (isAsciiAlphabetic(first) ? first.toUpperCase() : first) + part.slice(1);
    })
    .join('');
}

function usesCharacterConstructs(expression) {
  switch (expression.kind) {
    case 'literalInsensitive': case 'charRange': case 'charClass': case 'any':
      return true;
    case 'choice': case 'seq':
      return expression.items.some(usesCharacterConstructs);
    case 'optional': case 'repeat0': case 'repeat1': case 'and': case 'not':
    case 'repeat': case 'capture':
      return usesCharacterConstructs(expression.item);
    default:
      return false;
  }
}

/** Quotes an ANTLR string literal. */
function quote(value) {
  let output = "'";
  for (const character of value) {
    switch (character) {
      case "'": output += "\\'"; break;
      case '\\': output += '\\\\'; break;
      case '\n': output += '\\n'; break;
      case '\r': output += '\\r'; break;
      case '\t': output += '\\t'; break;
      case '\u0008': output += '\\b'; break;
      case '\u000c': output += '\\f'; break;
      default:
        output += isControl(character)
          ? `\\u${codePoint(character).toString(16).toUpperCase().padStart(4, '0')}`
          : character;
    }
  }
  return `${output}'`;
}

/** Renders a lexer set as `[...]`, or `~[...]` when negated. */
function renderSet(negated, items) {
  let body = '';
  for (const item of items) {
    if (item.kind === 'range') {
      body = pushSetChar(body, item.start);
      body += '-';
      body = pushSetChar(body, item.end);
    } else {
      body = pushSetChar(body, item.value);
    }
  }
  return negated ? [`~[${body}]`, Precedence.PREFIX] : [`[${body}]`, Precedence.ATOM];
}

function pushSetChar(body, character) {
  switch (character) {
    case '\\': case ']': case '-': return `${body}\\${character}`;
    case '^': return body === '' ? '\\^' : `${body}^`;
    case '\n': return `${body}\\n`;
    case '\r': return `${body}\\r`;
    case '\t': return `${body}\\t`;
    case '\u0008': return `${body}\\b`;
    case '\u000c': return `${body}\\f`;
    default: return body + character;
  }
}

/**
 * Plans how rule documentation is written so that `importAntlr` reads the same
 * documentation back whenever it consists of comments and a lexer command.
 */
function planDoc(doc, lexer) {
  if (doc === null) return { comments: [], command: null, reimported: null };
  const [text, command] = lexer ? splitCommand(doc) : [doc, null];
  const comments = commentLines(text);
  const parts = comments.map(rustTrim);
  if (command !== null) parts.push(command);
  return { comments, command, reimported: parts.length === 0 ? null : parts.join('; ') };
}

/** Splits a trailing `-> command` part off lexer rule documentation when it re-imports verbatim. */
function splitCommand(doc) {
  let text;
  let command;
  if (doc.startsWith('->')) {
    text = '';
    command = doc;
  } else {
    const position = doc.lastIndexOf('; ->');
    if (position < 0) return [doc, null];
    text = doc.slice(0, position);
    command = doc.slice(position + 2);
  }
  return !/[\n\r]/.test(command) && reimportedCommand(command) === command
    ? [text, command]
    : [doc, null];
}

function reimportedCommand(command) {
  try {
    return importAntlr(`A : 'a' ${command} ;`).rule('A')?.doc ?? null;
  } catch {
    return null;
  }
}

/** Writes documentation as ANTLR comments; existing comments are kept verbatim. */
function commentLines(text) {
  const lines = [];
  for (const part of splitCommentParts(text)) {
    const block = part.startsWith('/*') && part.indexOf('*/', 2) === part.length - 2;
    const line = part.startsWith('//') && !/[\n\r]/.test(part);
    if (block || line) {
      lines.push(part);
    } else {
      for (const docLine of docLines(part)) lines.push(docLine.startsWith('//') ? docLine : `// ${docLine}`);
    }
  }
  return lines;
}

/** Splits documentation at `; ` separators that precede a comment. */
function splitCommentParts(text) {
  const parts = [];
  let rest = text;
  for (;;) {
    const positions = ['; //', '; /*'].map((separator) => rest.indexOf(separator))
      .filter((position) => position >= 0);
    if (positions.length === 0) {
      parts.push(rest);
      break;
    }
    const position = Math.min(...positions);
    parts.push(rest.slice(0, position));
    rest = rest.slice(position + 2);
  }
  return parts.filter((part) => rustTrim(part) !== '');
}
