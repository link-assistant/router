import {
  charClassItems,
  debugString,
  decorateEmitted,
  emitReport,
  orderedRules,
  unsupportedError,
} from './common.js';

const FORMAT = 'tree-sitter';
const EXTRAS_RULE = '_extras';
const PRECEDENCE_TYPES = [
  ['prec=', 'PREC'],
  ['prec_left=', 'PREC_LEFT'],
  ['prec_right=', 'PREC_RIGHT'],
  ['prec_dynamic=', 'PREC_DYNAMIC'],
];

/**
 * Emits the declarative tree-sitter `grammar.json` form, the inverse of
 * `importTreeSitterJson`. Captures produced by the importer map back to their
 * FIELD, ALIAS, PREC*, TOKEN, IMMEDIATE_TOKEN, RESERVED, and PATTERN nodes.
 */
export function emitTreeSitterJson(grammar, options = {}) {
  return decorateEmitted('tree-sitter-json', writeTreeSitterJson(grammar), options.decorators);
}

function writeTreeSitterJson(grammar) {
  const report = emitReport();
  const rules = {};
  const inline = [];
  let extras = null;
  for (const rule of orderedRules(grammar)) {
    if (rule.name === EXTRAS_RULE && rule.kind === 'silent') {
      extras = extrasMembers(rule.expression, report);
      continue;
    }
    if (rule.kind === 'silent') {
      report.lossy.push(
        `tree-sitter emits RuleKind::Silent rule ${debugString(rule.name)} in the inline list`,
      );
      inline.push(rule.name);
    }
    rules[rule.name] = emitRule(rule, report);
  }
  const document = { name: grammarName(grammar), rules };
  if (extras !== null) document.extras = extras;
  if (inline.length > 0) document.inline = inline;
  return { source: `${JSON.stringify(document, null, 2)}\n`, report };
}

function emitRule(rule, report) {
  if (rule.kind === 'token' && rule.expression.kind === 'capture' &&
    rule.expression.label === 'immediate_token') {
    return { type: 'IMMEDIATE_TOKEN', content: emitNode(rule.expression.item, report) };
  }
  if (rule.kind === 'atomic') {
    report.lossy.push(
      `tree-sitter emits RuleKind::Atomic rule ${debugString(rule.name)} as a token`,
    );
  }
  const node = emitNode(rule.expression, report);
  return rule.kind === 'token' || rule.kind === 'atomic' ? { type: 'TOKEN', content: node } : node;
}

function extrasMembers(expression, report) {
  if (expression.kind === 'choice' && !expression.ordered) {
    return expression.items.map((item) => emitNode(item, report));
  }
  return [emitNode(expression, report)];
}

function emitNode(expression, report) {
  switch (expression.kind) {
    case 'empty': return { type: 'BLANK' };
    case 'literal': return { type: 'STRING', value: expression.value };
    case 'literalInsensitive':
      report.lossy.push(
        `tree-sitter expands case-insensitive terminal ${debugString(expression.value)} to a pattern`,
      );
      return { type: 'PATTERN', value: caseInsensitivePattern(expression.value) };
    case 'charRange':
      return {
        type: 'PATTERN',
        value: `[${escapeClassCharacter(expression.start)}-${escapeClassCharacter(expression.end)}]`,
      };
    case 'charClass': return { type: 'PATTERN', value: charClassPattern(expression) };
    case 'any': return { type: 'PATTERN', value: '.' };
    case 'regex': return { type: 'PATTERN', value: expression.value };
    case 'ref': return { type: 'SYMBOL', name: expression.name };
    case 'choice':
      if (expression.items.length === 0) throw unsupportedError(FORMAT, 'empty Choice');
      if (expression.ordered) {
        report.lossy.push('tree-sitter treats ordered choice as unordered choice');
      }
      return { type: 'CHOICE', members: expression.items.map((item) => emitNode(item, report)) };
    case 'seq':
      return { type: 'SEQ', members: expression.items.map((item) => emitNode(item, report)) };
    case 'optional':
      return { type: 'CHOICE', members: [emitNode(expression.item, report), { type: 'BLANK' }] };
    case 'repeat0': return { type: 'REPEAT', content: emitNode(expression.item, report) };
    case 'repeat1': return { type: 'REPEAT1', content: emitNode(expression.item, report) };
    case 'repeat': return emitRepeat(expression, report);
    case 'and': case 'not': throw unsupportedError(FORMAT, 'predicate');
    case 'capture': return emitCapture(expression, report);
    default: throw unsupportedError(FORMAT, expression.kind);
  }
}

function emitRepeat({ item, min, max }, report) {
  if (max !== null && max < min) {
    throw unsupportedError(FORMAT, `Repeat with min ${min} greater than max Some(${max})`);
  }
  report.lossy.push(`tree-sitter desugared Repeat with min ${min} and max ${
    max === null ? 'None' : `Some(${max})`}`);
  const node = emitNode(item, report);
  const members = Array.from({ length: min }, () => node);
  if (max === null) members.push({ type: 'REPEAT', content: node });
  else {
    for (let index = min; index < max; index += 1) {
      members.push({ type: 'CHOICE', members: [node, { type: 'BLANK' }] });
    }
  }
  if (members.length === 0) return { type: 'BLANK' };
  return members.length === 1 ? members[0] : { type: 'SEQ', members };
}

function emitCapture({ label, item }, report) {
  if (label === null || label === undefined) {
    report.lossy.push('tree-sitter dropped anonymous capture');
    return emitNode(item, report);
  }
  if (label === 'regex' && item.kind === 'literal') return { type: 'PATTERN', value: item.value };
  for (const [prefix, type] of PRECEDENCE_TYPES) {
    if (label.startsWith(prefix)) {
      return { type, value: precedenceValue(label.slice(prefix.length)), content: emitNode(item, report) };
    }
  }
  if (label.startsWith('alias:')) {
    const value = label.slice('alias:'.length);
    return { type: 'ALIAS', content: emitNode(item, report), named: isIdentifier(value), value };
  }
  if (label === 'token') return { type: 'TOKEN', content: emitNode(item, report) };
  if (label === 'immediate_token') return { type: 'IMMEDIATE_TOKEN', content: emitNode(item, report) };
  if (label === 'reserved') return { type: 'RESERVED', content: emitNode(item, report) };
  if (label.startsWith('reserved:')) {
    return {
      type: 'RESERVED',
      context_name: label.slice('reserved:'.length),
      content: emitNode(item, report),
    };
  }
  return { type: 'FIELD', name: label, content: emitNode(item, report) };
}

function charClassPattern(expression) {
  const items = charClassItems(FORMAT, expression);
  if (items.length === 0) throw unsupportedError(FORMAT, 'empty CharClass');
  const content = items.map((item) => item.kind === 'range'
    ? `${escapeClassCharacter(item.start)}-${escapeClassCharacter(item.end)}`
    : escapeClassCharacter(item.value)).join('');
  return `[${expression.negated ? '^' : ''}${content}]`;
}

function caseInsensitivePattern(value) {
  return [...value].map((character) => {
    const lower = character.toLowerCase();
    const upper = character.toUpperCase();
    if (lower === upper || [...lower].length !== 1 || [...upper].length !== 1) {
      return escapePatternCharacter(character);
    }
    return `[${escapeClassCharacter(lower)}${escapeClassCharacter(upper)}]`;
  }).join('');
}

function escapeClassCharacter(character) {
  switch (character) {
    case '\n': return '\\n';
    case '\r': return '\\r';
    case '\t': return '\\t';
    case '\\': case ']': case '[': case '-': case '^': return `\\${character}`;
    default: return character;
  }
}

function escapePatternCharacter(character) {
  if (character === '\n') return '\\n';
  if (character === '\r') return '\\r';
  if (character === '\t') return '\\t';
  return /[\\^$.|?*+()[\]{}/]/.test(character) ? `\\${character}` : character;
}

function precedenceValue(value) {
  return /^-?(0|[1-9][0-9]*)$/.test(value) && Number.isSafeInteger(Number(value))
    ? Number(value)
    : value;
}

function grammarName(grammar) {
  const rule = grammar.startRule() ?? grammar.rules.values().next().value;
  const name = (rule?.name ?? 'grammar').replace(/[^A-Za-z0-9_]/gu, '_');
  return /^[A-Za-z_]/.test(name) ? name : `_${name}`;
}

function isIdentifier(value) {
  return /^[A-Za-z_][A-Za-z0-9_]*$/.test(value);
}
