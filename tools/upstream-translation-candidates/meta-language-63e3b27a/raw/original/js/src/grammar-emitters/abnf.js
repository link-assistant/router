import {
  ABNF_RULE_TEMPLATE,
  charClassItems,
  codePoint,
  decorateEmitted,
  emitReport,
  finishLines,
  hex4,
  orderedRules,
  renderRuleLine,
  reportCaptureLoss,
  unsupportedError,
} from './common.js';

const FORMAT = 'abnf';
const CHOICE = 0;
const SEQUENCE = 1;
const ATOM = 2;

/**
 * Emits Augmented Backus-Naur Form text with native alternation, grouping,
 * optional expressions, counted repetition, numeric ranges, and RFC 7405
 * case-sensitive string prefixes.
 */
export function emitAbnf(grammar, options = {}) {
  return decorateEmitted('abnf', writeAbnf(grammar), options.decorators);
}

function writeAbnf(grammar) {
  const report = emitReport();
  const lines = orderedRules(grammar).map((rule) =>
    renderRuleLine(ABNF_RULE_TEMPLATE, rule.name, emitExpression(rule.expression, CHOICE, report)));
  return { source: finishLines(lines), report };
}

function emitExpression(expression, parent, report) {
  let text;
  let precedence = ATOM;
  switch (expression.kind) {
    case 'empty': text = '""'; break;
    case 'literal': text = quoteTerminal('%s', expression.value); break;
    case 'literalInsensitive': text = quoteTerminal('%i', expression.value); break;
    case 'charRange': text = emitCharRange(expression.start, expression.end); break;
    case 'charClass': text = emitCharClass(expression); break;
    case 'any': text = '%x00-10FFFF'; break;
    case 'ref': text = expression.name; break;
    case 'choice':
      if (expression.ordered) report.lossy.push('ABNF treats ordered choice as unordered choice');
      text = expression.items.map((item) => emitExpression(item, CHOICE, report)).join(' / ');
      precedence = CHOICE;
      break;
    case 'seq': text = emitSequence(expression.items, report); precedence = SEQUENCE; break;
    case 'optional': text = `[ ${emitExpression(expression.item, CHOICE, report)} ]`; break;
    case 'repeat0': text = `*( ${emitExpression(expression.item, CHOICE, report)} )`; break;
    case 'repeat1': text = `1*( ${emitExpression(expression.item, CHOICE, report)} )`; break;
    case 'repeat': text = emitRepeat(expression, report); break;
    case 'and': throw unsupportedError(FORMAT, 'And');
    case 'not': throw unsupportedError(FORMAT, 'Not');
    case 'capture':
      reportCaptureLoss(report, FORMAT, expression.label);
      return emitExpression(expression.item, parent, report);
    default: throw unsupportedError(FORMAT, expression.kind);
  }
  return precedence < parent ? `( ${text} )` : text;
}

function emitSequence(items, report) {
  const emitted = items
    .filter((item) => item.kind !== 'empty')
    .map((item) => emitExpression(item, SEQUENCE, report))
    .filter((text) => text !== '');
  return emitted.length === 0 ? '""' : emitted.join(' ');
}

function emitRepeat({ item, min, max }, report) {
  if (max !== null && max < min) {
    throw unsupportedError(FORMAT, `Repeat with min ${min} greater than max Some(${max})`);
  }
  const inner = emitExpression(item, CHOICE, report);
  const lower = min === 0 ? '' : String(min);
  return `${lower}*${max === null ? '' : max}( ${inner} )`;
}

function emitCharRange(start, end) {
  const first = codePoint(start);
  const last = codePoint(end);
  if (first > last) {
    throw unsupportedError(
      FORMAT,
      `CharRange has descending bounds U+${hex4(first)}..=U+${hex4(last)}`,
    );
  }
  return `%x${hexChar(first)}-${hexChar(last)}`;
}

function emitCharClass(expression) {
  if (expression.negated) throw unsupportedError(FORMAT, 'negated CharClass');
  const items = charClassItems(FORMAT, expression);
  if (items.length === 0) throw unsupportedError(FORMAT, 'empty CharClass');
  const rendered = items.map((item) => item.kind === 'range'
    ? emitCharRange(item.start, item.end)
    : `%x${hexChar(codePoint(item.value))}`);
  return `( ${rendered.join(' / ')} )`;
}

function quoteTerminal(prefix, value) {
  if (value === '') return '""';
  if ([...value].every((character) => {
    const point = codePoint(character);
    return point === 0x20 || point === 0x21 || (point >= 0x23 && point <= 0x7e);
  })) {
    return `${prefix}"${value}"`;
  }
  return `%x${[...value].map((character) => hexChar(codePoint(character))).join('.')}`;
}

function hexChar(point) {
  const hex = point.toString(16).toUpperCase();
  return point <= 0xff ? hex.padStart(2, '0') : hex;
}
