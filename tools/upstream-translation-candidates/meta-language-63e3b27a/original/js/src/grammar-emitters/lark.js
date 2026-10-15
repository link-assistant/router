// Mirrors rust/src/grammar/emit/lark.rs: the Lark grammar emitter. Output
// text, `report.lossy` notes and GrammarEmitError messages are byte-identical
// to the Rust `emit_lark` for the same grammar.

import { importLark } from '../grammar-importers/lark.js';
import { codePoint, decorateEmitted, emitReport, finishLines, unsupportedError } from './common.js';
import {
  NamePlan,
  Precedence,
  checkRepeatBounds,
  classItems,
  collectReferences,
  docLines,
  isAsciiDigit,
  isAsciiLower,
  isAsciiUpper,
  isControl,
  isWhitespace,
  joinChoice,
  joinSequence,
  negatedLookaheadSet,
  ruleDoc,
  ruleKind,
  rustDebugCharLiteral,
  rustDebugOption,
  rustDebugString,
  rustTrim,
  snakeCase,
  wrap,
} from './structural.js';

const FORMAT = 'lark';
const LABEL = 'Lark';

/** Documentation `importLark` attaches to rules created from `%ignore`. */
const IGNORE_DOC = '%ignore';

const ANY_CHAR_RANGE = Object.freeze({ kind: 'range', start: '\0', end: '\u{10FFFF}' });
const USIZE_MAX = 18446744073709551615n;

/**
 * Emits a Lark grammar.
 *
 * Normal rules become lower-case Lark rules, silent rules become inlined
 * `?rule`s, and token and atomic rules become upper-case terminals. Rule names
 * are adjusted deterministically to Lark's case conventions; every rename is
 * recorded in `report.lossy`. Silent rules documented exactly as `%ignore`
 * are written back as `%ignore` directives. Character classes, ranges and
 * any-character become regex terminals, case-insensitive literals `(?i:...)`
 * regexes, counted repetition `~ n..m`, and `regex`-labelled captures of a
 * literal the regex they were imported from; lookahead and other captures
 * are dropped with a note. Documentation is written as `//` comments, with
 * trailing `inline` / `priority N` parts written back as `?` and `.N`.
 *
 * Throws GrammarEmitError for empty non-negated character classes, descending
 * character ranges, repetitions whose maximum is below their minimum, and
 * regexes that Lark cannot delimit.
 */
export function emitLark(grammar, options = {}) {
  return decorateEmitted('lark', writeLark(grammar), options.decorators);
}

function writeLark(grammar) {
  return new LarkEmitter(grammar).emit();
}

class LarkEmitter {
  constructor(grammar) {
    this.grammar = grammar;
    this.rules = [...grammar.rules.values()];
    const ignored = [];
    this.rules.forEach((rule, index) => {
      if (ruleKind(rule) === 'silent' && ruleDoc(grammar, rule) === IGNORE_DOC) ignored.push(index);
    });
    this.ignored = ignored.length === this.rules.length ? [] : ignored;
    this.foreign = grammar.sourceFormat !== FORMAT;
    this.report = emitReport();
    const candidates = this.rules.map((rule) => ruleCandidate(rule, this.foreign, this.report));
    this.ignored.forEach((index, position) => {
      candidates[index] = position === 0 ? '_ignore' : `_ignore_${position + 1}`;
    });
    this.names = new NamePlan(grammar, LABEL, candidates, this.ignored, referenceCandidate, this.report);
    this.rule = '';
  }

  emit() {
    const [order, effective] = this.emissionOrder();
    this.noteStart(effective);
    const lines = [];
    for (const index of order) this.emitRule(index, lines);
    return { source: finishLines(lines), report: this.report };
  }

  /**
   * Orders rules so that `importLark` picks the same start rule: source order
   * is kept when a rule is named `start`, otherwise the start rule moves first.
   * `%ignore` directives come last because the importer appends them.
   */
  emissionOrder() {
    const ignored = new Set(this.ignored);
    const regular = this.rules.map((_rule, index) => index).filter((index) => !ignored.has(index));
    const namedStart = regular.find((index) => this.names.ruleName(index) === 'start');
    let order;
    let effective;
    if (namedStart !== undefined) {
      order = [...regular];
      effective = namedStart;
    } else {
      const { start } = this.grammar;
      const found = start === null || start === undefined
        ? undefined
        : regular.find((index) => this.rules[index].name === start);
      effective = found ?? regular[0] ?? null;
      order = effective === null ? [] : [effective];
      order.push(...regular.filter((index) => index !== effective));
    }
    order.push(...this.ignored);
    return [order, effective];
  }

  noteStart(effective) {
    const { start } = this.grammar;
    if (start === null || start === undefined || effective === null) return;
    const expected = this.names.resolve(start);
    const actual = this.names.ruleName(effective);
    if (expected !== actual) {
      this.report.lossy.push(`Lark re-imports start rule as ${rustDebugString(actual)} instead of ${rustDebugString(expected)}, because Lark starts at \`start\` or the first rule`);
    }
  }

  emitRule(index, lines) {
    const rule = this.rules[index];
    const kind = ruleKind(rule);
    const name = this.names.ruleName(index);
    this.rule = name;
    const [body] = this.render(rule.expression);

    if (this.ignored.includes(index)) {
      if (body === '') throw unsupportedError(FORMAT, 'empty %ignore expression');
      lines.push(`%ignore ${body}`);
      return;
    }

    const silent = kind === 'silent';
    const sourceDoc = ruleDoc(this.grammar, rule);
    const doc = planDoc(sourceDoc, silent);
    if (doc.reimported !== sourceDoc) {
      this.report.lossy.push(`Lark re-imports the documentation of rule ${rustDebugString(name)} as ${rustDebugOption(doc.reimported)}`);
    }
    lines.push(...doc.comments);

    let line = silent ? '?' : '';
    line += name;
    if (doc.priority !== null) line += `.${doc.priority}`;
    line += ':';
    if (body !== '') line += ` ${body}`;
    lines.push(line);

    if (kind === 'atomic') {
      this.report.lossy.push(`Lark emitted atomic rule ${rustDebugString(rule.name)} as terminal ${rustDebugString(name)}, which re-imports as a token rule`);
    }
    if (this.foreign && isTerminalName(name)) this.noteTerminalReferences(rule, name);
  }

  noteTerminalReferences(rule, name) {
    for (const reference of collectReferences(rule.expression)) {
      const emitted = this.names.resolve(reference);
      if (this.grammar.rule(reference) !== undefined && !isTerminalName(emitted)) {
        this.report.lossy.push(`Lark terminal ${rustDebugString(name)} references rule ${rustDebugString(emitted)}, which Lark rejects`);
      }
    }
  }

  note(message) {
    this.report.lossy.push(`Lark ${message} in rule ${rustDebugString(this.rule)}`);
  }

  render(expression) {
    switch (expression.kind) {
      case 'empty':
        return ['', Precedence.SEQUENCE];
      case 'literal':
        if (expression.value === '') this.note('keeps an empty literal, which Lark rejects,');
        return [quote(expression.value), Precedence.ATOM];
      case 'literalInsensitive':
        this.note(`emitted case-insensitive literal ${rustDebugString(expression.value)} as a (?i:...) regex`);
        return [`/(?i:${regexLiteralText(expression.value)})/`, Precedence.ATOM];
      case 'charRange': {
        const { start, end } = expression;
        if (codePoint(start) > codePoint(end)) {
          throw unsupportedError(FORMAT, `descending character range ${rustDebugCharLiteral(start)}..${rustDebugCharLiteral(end)}`);
        }
        this.note('emitted character range as a regex character class');
        return renderClassText(false, [{ kind: 'range', start, end }]);
      }
      case 'charClass':
        return this.renderClass(Boolean(expression.negated), classItems(FORMAT, expression));
      case 'any':
        this.note('emitted any character as a regex character class');
        return renderClassText(false, [ANY_CHAR_RANGE]);
      case 'ref':
        return [this.names.resolve(expression.name), Precedence.ATOM];
      case 'choice':
        if (expression.ordered && expression.items.length > 1) {
          this.note('treats ordered choice as unordered choice');
        }
        return joinChoice(expression.items.map((alternative) => this.render(alternative)));
      case 'seq':
        return this.renderSequence(expression.items);
      case 'optional': {
        const [text] = this.render(expression.item);
        return [`[${text}]`, Precedence.ATOM];
      }
      case 'repeat0':
        return this.renderPostfix(expression.item, '*');
      case 'repeat1':
        return this.renderPostfix(expression.item, '+');
      case 'repeat':
        return this.renderRepeat(expression.item, expression.min, expression.max ?? null);
      case 'and':
        this.note('dropped positive lookahead');
        return ['', Precedence.SEQUENCE];
      case 'not':
        this.note('dropped negative lookahead');
        return ['', Precedence.SEQUENCE];
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
      const set = negatedLookaheadSet(FORMAT, items, index);
      if (set !== null) {
        this.note('lowered negative lookahead followed by any character to a complemented character class');
        rendered.push(renderClassText(set[0], set[1]));
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
    return [`${wrap(operand, Precedence.ATOM)}${operator}`, Precedence.POSTFIX];
  }

  renderRepeat(inner, min, max) {
    checkRepeatBounds(FORMAT, min, max);
    const operand = wrap(this.render(inner), Precedence.ATOM);
    if (max !== null && max === min) return [`${operand} ~ ${min}`, Precedence.POSTFIX];
    if (max !== null) return [`${operand} ~ ${min}..${max}`, Precedence.POSTFIX];
    if (min === 0) {
      this.note('emitted unbounded repetition {0,} as `*`');
      return [`${operand}*`, Precedence.POSTFIX];
    }
    if (min === 1) {
      this.note('emitted unbounded repetition {1,} as `+`');
      return [`${operand}+`, Precedence.POSTFIX];
    }
    this.note(`emitted unbounded repetition {${min},} as \`~ ${min}\` followed by \`*\``);
    return [`${operand} ~ ${min} ${operand}*`, Precedence.SEQUENCE];
  }

  renderCapture(label, inner) {
    if (label === 'regex' && inner.kind === 'literal') return this.renderRegex(inner.value);
    if (label !== null) this.note(`dropped capture label ${rustDebugString(label)}`);
    else this.note('dropped anonymous capture');
    return this.render(inner);
  }

  renderRegex(pattern) {
    if (pattern === '') {
      this.note('emitted an empty regex as /(?:)/');
      return ['/(?:)/', Precedence.ATOM];
    }
    const body = delimitRegex(pattern);
    if (body !== pattern) this.note(`escaped regex /${pattern}/ as /${body}/`);
    if (isClassShaped(body)) {
      try {
        importLark(`probe: /${body}/\n`);
      } catch (error) {
        throw unsupportedError(FORMAT, `regex /${body}/ does not re-import as a character class: ${error.message}`);
      }
      this.note(`regex /${body}/ re-imports as a character class`);
    }
    return [`/${body}/`, Precedence.ATOM];
  }

  renderClass(negated, items) {
    if (items.length === 0) {
      if (negated) {
        this.note('emitted an empty negated character class as any character');
        return renderClassText(false, [ANY_CHAR_RANGE]);
      }
      throw unsupportedError(FORMAT, 'empty character class');
    }
    const descending = items.find((item) => item.kind === 'range' &&
      codePoint(item.start) > codePoint(item.end));
    if (descending !== undefined) {
      throw unsupportedError(FORMAT, `descending character class range ${rustDebugCharLiteral(descending.start)}-${rustDebugCharLiteral(descending.end)}`);
    }
    return renderClassText(negated, items);
  }
}

function isTerminalName(name) {
  return isAsciiUpper(name[0]);
}

/** Returns Lark's conventional spelling of a rule or terminal name. */
function ruleCandidate(rule, foreign, report) {
  const kind = ruleKind(rule);
  if (kind === 'token' || kind === 'atomic') return terminalCandidate(rule.name);
  if (kind === 'normal' && isFilteredTerminalName(rule.name)) {
    if (foreign) {
      report.lossy.push(`Lark keeps rule ${rustDebugString(rule.name)} as a filtered terminal name, which re-imports as a normal rule`);
    }
    return rule.name;
  }
  return lowerCandidate(rule.name);
}

/** Returns a valid spelling for a reference without a rule, keeping its case. */
function referenceCandidate(name) {
  if (isFilteredTerminalName(name)) return name;
  if (isTerminalName(name)) return terminalCandidate(name);
  return lowerCandidate(name);
}

function isTerminalTail(characters) {
  return characters.every((character) => isAsciiUpper(character) || isAsciiDigit(character) || character === '_');
}

/** Recognizes `_NAME`, the spelling Lark uses for filtered terminals. */
function isFilteredTerminalName(name) {
  const characters = [...name];
  return characters[0] === '_' && isAsciiUpper(characters[1]) && isTerminalTail(characters.slice(2));
}

function lowerCandidate(name) {
  const output = snakeCase(name);
  const valid = output[0] === '_' ? isAsciiLower(output[1]) : isAsciiLower(output[0]);
  if (valid) return output;
  return output.startsWith('_') ? `r${output}` : `r_${output}`;
}

function terminalCandidate(name) {
  const characters = [...name];
  if (isAsciiUpper(characters[0]) && isTerminalTail(characters.slice(1))) return name;
  const output = snakeCase(name).toUpperCase();
  if (isAsciiUpper(output[0])) return output;
  return output.startsWith('_') ? `T${output}` : `T_${output}`;
}

/** Quotes a Lark string literal. */
function quote(value) {
  let output = '"';
  for (const character of value) {
    if (character === '"') output += '\\"';
    else if (character === '\\') output += '\\\\';
    else output += plainChar(character);
  }
  return `${output}"`;
}

/** Escapes regex metacharacters so a regex matches `value` literally. */
function regexLiteralText(value) {
  let output = '';
  for (const character of value) {
    output += /^[!-/:-@[-`{-~]$/.test(character) ? `\\${character}` : plainChar(character);
  }
  return output;
}

/** Renders a regex character class terminal. */
function renderClassText(negated, items) {
  let output = negated ? '/[^' : '/[';
  for (const item of items) {
    if (item.kind === 'range') output += `${classChar(item.start)}-${classChar(item.end)}`;
    else output += classChar(item.value);
  }
  return [`${output}]/`, Precedence.ATOM];
}

function classChar(character) {
  return ['\\', ']', '[', '-', '^', '/'].includes(character) ? `\\${character}` : plainChar(character);
}

/**
 * Escapes line breaks, tabs, controls, whitespace other than space, and
 * characters outside the Basic Multilingual Plane.
 */
function plainChar(character) {
  if (character === '\n') return '\\n';
  if (character === '\r') return '\\r';
  if (character === '\t') return '\\t';
  const code = codePoint(character);
  if (isControl(character) || (isWhitespace(character) && character !== ' ') || code > 0xffff) {
    const hex = code.toString(16).toUpperCase();
    if (code <= 0xff) return `\\x${hex.padStart(2, '0')}`;
    if (code <= 0xffff) return `\\u${hex.padStart(4, '0')}`;
    return `\\U${hex.padStart(8, '0')}`;
  }
  return character;
}

/** Escapes unescaped `/` and raw line breaks so the pattern fits in `/.../`. */
function delimitRegex(pattern) {
  let output = '';
  const characters = [...pattern];
  for (let index = 0; index < characters.length; index += 1) {
    const character = characters[index];
    if (character === '\\') {
      index += 1;
      const next = characters[index];
      if (next === undefined) {
        throw unsupportedError(FORMAT, `regex /${pattern}/ ends with a lone backslash`);
      }
      if (next === '\n') output += '\\n';
      else if (next === '\r') output += '\\r';
      else output += `\\${next}`;
    } else if (character === '/') {
      output += '\\/';
    } else if (character === '\n') {
      output += '\\n';
    } else if (character === '\r') {
      output += '\\r';
    } else {
      output += character;
    }
  }
  return output;
}

/** Mirrors the importer's test for regexes it lowers to character classes. */
function isClassShaped(body) {
  if (body.length < 2 || !body.startsWith('[') || !body.endsWith(']')) return false;
  let escaped = false;
  for (const character of body.slice(1, -1)) {
    if (escaped) escaped = false;
    else if (character === '\\') escaped = true;
    else if (character === ']') return false;
  }
  return true;
}

/**
 * Plans how rule documentation is written so that `importLark` reads the same
 * documentation back whenever it consists of comments, `inline` and
 * `priority N`.
 */
function planDoc(doc, silent) {
  let text = doc ?? '';
  let priority = null;
  const last = splitLastPart(text);
  if (last !== null && last[1].startsWith('priority ')) {
    const digits = last[1].slice('priority '.length);
    if (/^(0|[1-9][0-9]*)$/.test(digits) && BigInt(digits) <= USIZE_MAX) {
      priority = digits;
      text = last[0];
    }
  }
  if (silent) {
    const inline = splitLastPart(text);
    if (inline !== null && inline[1] === 'inline') text = inline[0];
  }

  const trimmed = rustTrim(text);
  const comments = trimmed.startsWith('//') && !/[\n\r]/.test(trimmed)
    ? [trimmed]
    : docLines(text).map((line) => (line.startsWith('//') ? line : `// ${line}`));

  const parts = [...comments];
  if (silent) parts.push('inline');
  if (priority !== null) parts.push(`priority ${priority}`);
  return { comments, priority, reimported: parts.length === 0 ? null : parts.join('; ') };
}

/** Splits the last `; `-separated part off documentation. */
function splitLastPart(text) {
  if (text === '') return null;
  const position = text.lastIndexOf('; ');
  return position < 0 ? ['', text] : [text.slice(0, position), text.slice(position + 2)];
}
