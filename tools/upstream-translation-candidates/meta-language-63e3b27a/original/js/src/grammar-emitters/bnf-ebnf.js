import {
  BNF_RULE_TEMPLATE,
  charClassItems,
  codePoint,
  debugString,
  decorateEmitted,
  EBNF_RULE_TEMPLATE,
  emitReport,
  expandedChars,
  finishLines,
  HelperRules,
  orderedRules,
  renderRuleLine,
  reportCaptureLoss,
  unsupportedError,
} from './common.js';

const MAX_EXPANSION = 256;
const PRODUCTION = 'production';
const SEQUENCE_ITEM = 'sequence-item';
const CHOICE = 0;
const SEQUENCE = 1;
const ATOM = 2;

/**
 * Emits classic Backus-Naur Form text. BNF has no grouping, optional,
 * repetition, range, or class operators, so deterministic helper productions
 * are synthesized whenever a faithful expansion is possible.
 */
export function emitBnf(grammar, options = {}) {
  return decorateEmitted('bnf', writeBnf(grammar), options.decorators);
}

function writeBnf(grammar) {
  const emitter = new BnfEmitter(grammar);
  const lines = orderedRules(grammar).map((rule) =>
    renderRuleLine(BNF_RULE_TEMPLATE, rule.name, emitter.emit(rule.expression, PRODUCTION)));
  for (const helper of emitter.helpers.entries) {
    lines.push(renderRuleLine(BNF_RULE_TEMPLATE, helper.name, helper.body));
  }
  return { source: finishLines(lines), report: emitter.report };
}

/**
 * Emits ISO/IEC 14977-style EBNF text. Optional and repetition operators are
 * native; character ranges and classes expand through helper productions.
 */
export function emitEbnf(grammar, options = {}) {
  return decorateEmitted('ebnf', writeEbnf(grammar), options.decorators);
}

function writeEbnf(grammar) {
  const emitter = new EbnfEmitter(grammar);
  const lines = orderedRules(grammar).map((rule) =>
    renderRuleLine(EBNF_RULE_TEMPLATE, rule.name, emitter.emit(rule.expression, CHOICE)));
  for (const helper of emitter.helpers.entries) {
    lines.push(renderRuleLine(EBNF_RULE_TEMPLATE, helper.name, helper.body));
  }
  return { source: finishLines(lines), report: emitter.report };
}

class HelperEmitter {
  constructor(grammar, format) {
    this.format = format;
    this.report = emitReport();
    this.helpers = new HelperRules(grammar);
  }

  alternativesHelper(kind, key, characters, quote) {
    const [name, isNew] = this.helpers.reserve(kind, key);
    if (isNew) {
      const values = characters();
      if (values.length === 0) throw unsupportedError(this.format, 'empty CharClass');
      this.helpers.push(name, values.map(quote).join(' | '));
    }
    return name;
  }

  rangeHelper(start, end, quote) {
    return this.alternativesHelper(
      'range',
      `${codePoint(start)}:${codePoint(end)}`,
      () => expandRange(this.format, start, end),
      quote,
    );
  }

  classHelper(expression, quote) {
    if (expression.negated) throw unsupportedError(this.format, 'negated CharClass');
    const items = charClassItems(this.format, expression);
    return this.alternativesHelper(
      'class',
      JSON.stringify(items),
      () => expandClassItems(this.format, items),
      quote,
    );
  }

  checkRepeat(min, max) {
    if (max !== null && max < min) {
      throw unsupportedError(
        this.format,
        `Repeat with min ${min} greater than max ${max === null ? 'None' : `Some(${max})`}`,
      );
    }
  }
}

class BnfEmitter extends HelperEmitter {
  constructor(grammar) {
    super(grammar, 'bnf');
  }

  emit(expression, context) {
    switch (expression.kind) {
      case 'empty': return '';
      case 'literal': return this.emitTerminal(expression.value);
      case 'literalInsensitive':
        this.report.lossy.push(
          `BNF cannot preserve case-insensitive terminal ${debugString(expression.value)}`,
        );
        return this.emitTerminal(expression.value);
      case 'charRange': return nonterminal(this.rangeHelper(expression.start, expression.end, quoteBnf));
      case 'charClass': return nonterminal(this.classHelper(expression, quoteBnf));
      case 'any': throw unsupportedError(this.format, 'AnyChar');
      case 'ref': return nonterminal(expression.name);
      case 'choice': return this.emitChoice(expression, context);
      case 'seq': return this.emitSequence(expression.items);
      case 'optional': return this.optionalHelper(expression.item);
      case 'repeat0': return this.starHelper(expression.item);
      case 'repeat1': return this.plusHelper(expression.item);
      case 'repeat': return this.emitRepeat(expression);
      case 'and': throw unsupportedError(this.format, 'And');
      case 'not': throw unsupportedError(this.format, 'Not');
      case 'capture':
        reportCaptureLoss(this.report, this.format, expression.label);
        return this.emit(expression.item, context);
      default: throw unsupportedError(this.format, expression.kind);
    }
  }

  // Classic BNF terminals have no escapes, so a terminal containing both
  // quote characters is emitted as a sequence of separately quoted runs.
  emitTerminal(value) {
    const runs = quoteRuns(value);
    if (runs.length > 1) {
      this.report.lossy.push(
        `BNF splits terminal ${debugString(value)} containing both quote characters`,
      );
    }
    return runs.map(quoteBnf).join(' ');
  }

  emitChoice(expression, context) {
    if (expression.ordered) this.report.lossy.push('BNF treats ordered choice as unordered choice');
    if (context === SEQUENCE_ITEM) {
      return this.helper('choice', expression, () => this.emit(expression, PRODUCTION));
    }
    return expression.items.map((item) => this.emit(item, PRODUCTION)).join(' | ');
  }

  emitSequence(items) {
    return items.map((item) => this.emit(item, SEQUENCE_ITEM)).filter(Boolean).join(' ');
  }

  emitRepeat({ item, min, max }) {
    this.checkRepeat(min, max);
    const parts = [];
    for (let index = 0; index < min; index += 1) parts.push(this.emit(item, SEQUENCE_ITEM));
    if (max === null) parts.push(this.starHelper(item));
    else for (let index = min; index < max; index += 1) parts.push(this.optionalHelper(item));
    return parts.filter(Boolean).join(' ');
  }

  optionalHelper(item) {
    if (item.kind === 'empty') return '';
    return this.helper('opt', item, () => `${this.emit(item, PRODUCTION)} |`);
  }

  starHelper(item) {
    if (item.kind === 'empty') return '';
    return this.helper('star', item, (name) => {
      const text = this.emit(item, SEQUENCE_ITEM);
      return text === '' ? '' : `${text} ${nonterminal(name)} |`;
    });
  }

  plusHelper(item) {
    if (item.kind === 'empty') return '';
    return this.helper('plus', item, (name) => {
      const text = this.emit(item, SEQUENCE_ITEM);
      return text === '' ? '' : `${text} ${nonterminal(name)} | ${text}`;
    });
  }

  helper(kind, expression, body) {
    const [name, isNew] = this.helpers.reserve(kind, JSON.stringify(expression));
    if (isNew) this.helpers.push(name, body(name));
    return nonterminal(name);
  }
}

class EbnfEmitter extends HelperEmitter {
  constructor(grammar) {
    super(grammar, 'ebnf');
  }

  emit(expression, parent) {
    let text;
    let precedence = ATOM;
    switch (expression.kind) {
      case 'empty': text = ''; break;
      case 'literal': text = quoteEbnf(expression.value); break;
      case 'literalInsensitive':
        this.report.lossy.push(
          `EBNF cannot preserve case-insensitive terminal ${debugString(expression.value)}`,
        );
        text = quoteEbnf(expression.value);
        break;
      case 'charRange': text = this.rangeHelper(expression.start, expression.end, quoteEbnf); break;
      case 'charClass': text = this.classHelper(expression, quoteEbnf); break;
      case 'any': text = '? any character ?'; break;
      case 'ref': text = expression.name; break;
      case 'choice':
        if (expression.ordered) {
          this.report.lossy.push('EBNF treats ordered choice as unordered choice');
        }
        text = expression.items.map((item) => this.emit(item, CHOICE)).join(' | ');
        precedence = CHOICE;
        break;
      case 'seq':
        text = expression.items.map((item) => this.emit(item, SEQUENCE)).filter(Boolean).join(' , ');
        precedence = SEQUENCE;
        break;
      case 'optional': text = `[ ${this.emit(expression.item, CHOICE)} ]`; break;
      case 'repeat0': text = `{ ${this.emit(expression.item, CHOICE)} }`; break;
      case 'repeat1': text = this.emitRepeat(expression.item, 1, null); precedence = SEQUENCE; break;
      case 'repeat':
        text = this.emitRepeat(expression.item, expression.min, expression.max);
        precedence = SEQUENCE;
        break;
      case 'and': throw unsupportedError(this.format, 'And');
      case 'not': throw unsupportedError(this.format, 'Not');
      case 'capture':
        reportCaptureLoss(this.report, this.format, expression.label);
        return this.emit(expression.item, parent);
      default: throw unsupportedError(this.format, expression.kind);
    }
    return precedence < parent && text !== '' ? `(${text})` : text;
  }

  emitRepeat(item, min, max) {
    this.checkRepeat(min, max);
    const parts = [];
    for (let index = 0; index < min; index += 1) parts.push(this.emit(item, SEQUENCE));
    if (max === null) {
      const inner = this.emit(item, CHOICE);
      if (inner !== '') parts.push(`{ ${inner} }`);
    } else {
      for (let index = min; index < max; index += 1) {
        const inner = this.emit(item, CHOICE);
        if (inner !== '') parts.push(`[ ${inner} ]`);
      }
    }
    return parts.filter(Boolean).join(' , ');
  }
}

function expandRange(format, start, end) {
  return expandedChars(format, 'CharRange', start, end, MAX_EXPANSION);
}

function expandClassItems(format, items) {
  const characters = [];
  for (const item of items) {
    if (item.kind === 'range') characters.push(...expandRange(format, item.start, item.end));
    else characters.push(item.value);
    if (characters.length > MAX_EXPANSION) {
      throw unsupportedError(
        format,
        `CharClass expands to more than ${MAX_EXPANSION} characters`,
      );
    }
  }
  return characters;
}

function nonterminal(name) {
  return `<${name}>`;
}

function quoteRuns(value) {
  const runs = [];
  let run = '';
  for (const character of value) {
    if ((character === '"' && run.includes("'")) || (character === "'" && run.includes('"'))) {
      runs.push(run);
      run = '';
    }
    run += character;
  }
  runs.push(run);
  return runs;
}

function quoteBnf(value) {
  const quote = value.includes('"') ? "'" : '"';
  return `${quote}${value}${quote}`;
}

const EBNF_ESCAPES = { '\\': '\\\\', '\n': '\\n', '\r': '\\r', '\t': '\\t' };

function quoteEbnf(value) {
  const quote = value.includes('"') && !value.includes("'") ? "'" : '"';
  const body = [...value]
    .map((character) => character === quote ? `\\${quote}` : EBNF_ESCAPES[character] ?? character)
    .join('');
  return `${quote}${body}${quote}`;
}
