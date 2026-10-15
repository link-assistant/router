import {
  charClassItems,
  codePoint,
  debugString,
  decorateEmitted,
  emitReport,
  finishLines,
  hex4,
  orderedRules,
  pegChoiceAlternatives,
  PEST_RULE_TEMPLATE,
  renderRuleLine,
  unsupportedError,
} from './common.js';

const FORMAT = 'peg';
const CHOICE = 0;
const SEQUENCE = 1;
const PREFIX = 2;
const POSTFIX = 3;
const ATOM = 4;
const MODIFIERS = { normal: '', atomic: '@', silent: '_', token: '$' };

/**
 * Emits pest PEG text: ordered choice uses `|`, sequences use `~`, predicates
 * use `&`/`!`, and token rules use pest's compound-atomic `$` modifier.
 */
export function emitPest(grammar, options = {}) {
  return decorateEmitted('pest', writePest(grammar), options.decorators);
}

function writePest(grammar) {
  const report = emitReport();
  const lines = [];
  for (const rule of orderedRules(grammar)) {
    if (containsUnorderedChoice(rule.expression)) {
      lines.push('// NOTE: unordered choice in source is emitted as ordered pest choice.');
    }
    lines.push(renderRuleLine(
      PEST_RULE_TEMPLATE,
      rule.name,
      emitExpression(rule.expression, CHOICE, report),
      MODIFIERS[rule.kind] ?? '',
    ));
  }
  return { source: finishLines(lines), report };
}

function emitExpression(expression, parent, report) {
  let text;
  let precedence = ATOM;
  switch (expression.kind) {
    case 'empty': text = quoteTerminal(''); break;
    case 'literal': text = quoteTerminal(expression.value); break;
    case 'literalInsensitive': text = `^${quoteTerminal(expression.value)}`; break;
    case 'charRange': text = emitCharRange(expression.start, expression.end); break;
    case 'charClass': text = emitCharClass(expression); break;
    case 'any': text = 'ANY'; break;
    case 'ref': text = expression.name; break;
    case 'choice':
      if (expression.items.length === 0) throw unsupportedError(FORMAT, 'empty Choice');
      if (!expression.ordered) report.lossy.push('PEG treats unordered choice as ordered choice');
      text = pegChoiceAlternatives(expression.ordered, expression.items)
        .map((item) => emitExpression(item, CHOICE, report))
        .join(' | ');
      precedence = CHOICE;
      break;
    case 'seq': {
      const items = expression.items
        .filter((item) => item.kind !== 'empty')
        .map((item) => emitExpression(item, SEQUENCE, report))
        .filter((item) => item !== '');
      text = items.length === 0 ? quoteTerminal('') : items.join(' ~ ');
      precedence = SEQUENCE;
      break;
    }
    case 'optional': text = `${emitExpression(expression.item, POSTFIX, report)}?`; precedence = POSTFIX; break;
    case 'repeat0': text = `${emitExpression(expression.item, POSTFIX, report)}*`; precedence = POSTFIX; break;
    case 'repeat1': text = `${emitExpression(expression.item, POSTFIX, report)}+`; precedence = POSTFIX; break;
    case 'repeat': text = emitRepeat(expression, report); precedence = POSTFIX; break;
    case 'and': text = `&${emitExpression(expression.item, PREFIX, report)}`; precedence = PREFIX; break;
    case 'not': text = `!${emitExpression(expression.item, PREFIX, report)}`; precedence = PREFIX; break;
    case 'capture':
      if (expression.label !== null && expression.label !== undefined) {
        report.lossy.push(`PEG dropped capture label ${debugString(expression.label)}`);
      }
      text = `(${emitExpression(expression.item, CHOICE, report)})`;
      break;
    default: throw unsupportedError(FORMAT, expression.kind);
  }
  return precedence < parent ? `(${text})` : text;
}

function emitRepeat({ item, min, max }, report) {
  if (max !== null && max < min) {
    throw unsupportedError(FORMAT, `Repeat with min ${min} greater than max Some(${max})`);
  }
  const inner = emitExpression(item, POSTFIX, report);
  if (max === null) return `${inner}{${min},}`;
  return min === max ? `${inner}{${min}}` : `${inner}{${min},${max}}`;
}

function emitCharClass(expression) {
  const items = charClassItems(FORMAT, expression);
  if (items.length === 0) throw unsupportedError(FORMAT, 'empty CharClass');
  const inner = items.map((item) => item.kind === 'range'
    ? emitCharRange(item.start, item.end)
    : quoteTerminal(item.value)).join(' | ');
  return expression.negated ? `(!(${inner}) ~ ANY)` : `(${inner})`;
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
  return `${quoteCharacter(start)}..${quoteCharacter(end)}`;
}

function containsUnorderedChoice(expression) {
  if (expression.kind === 'choice' && !expression.ordered) return true;
  if (expression.items) return expression.items.some(containsUnorderedChoice);
  if (expression.item) return containsUnorderedChoice(expression.item);
  return false;
}

function quoteTerminal(value) {
  return `"${[...value].map((character) => escapeCharacter(character, '"')).join('')}"`;
}

function quoteCharacter(value) {
  return `'${escapeCharacter(String(value), "'")}'`;
}

function escapeCharacter(character, quote) {
  if (character === quote) return `\\${quote}`;
  switch (character) {
    case '\\': return '\\\\';
    case '\n': return '\\n';
    case '\r': return '\\r';
    case '\t': return '\\t';
    default:
      return /\p{Cc}/u.test(character)
        ? `\\u{${codePoint(character).toString(16).toUpperCase()}}`
        : character;
  }
}
