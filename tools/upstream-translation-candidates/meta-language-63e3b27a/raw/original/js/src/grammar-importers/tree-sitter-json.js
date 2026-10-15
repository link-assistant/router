import { GrammarBuilder, choice, sequence } from '../grammar.js';
import {
  grammarFromRules,
  parseError,
  rule,
  unsupportedError,
} from './common.js';
import { decorateGrammar } from '../grammar-decorators.js';

const FORMAT = 'tree-sitter';

/** Imports the declarative grammar.json form emitted by tree-sitter generate. */
export function importTreeSitterJson(source, options = {}) {
  return decorateGrammar(readTreeSitterJson(source), options.decorators, 'importer');
}

function readTreeSitterJson(source) {
  let root;
  try {
    root = typeof source === 'string' ? JSON.parse(source) : source;
  } catch (error) {
    throw parseError(FORMAT, error.message);
  }
  if (!isObject(root)) throw parseError(FORMAT, 'grammar.json root must be an object');
  if (!isObject(root.rules)) throw parseError(FORMAT, 'grammar.json must contain object rules');
  const names = Object.keys(root.rules);
  if (names.length === 0) throw parseError(FORMAT, 'rules object must not be empty');

  const rules = names.map((name) => lowerRule(name, root.rules[name]));
  if (root.extras !== undefined) {
    if (!Array.isArray(root.extras)) throw parseError(FORMAT, 'extras must be an array');
    if (root.extras.length > 0) {
      rules.push(rule('_extras', lowerChoice(root.extras), 'silent'));
    }
  }
  return grammarFromRules(FORMAT, rules, names[0]);
}

function lowerRule(name, node) {
  const type = nodeType(node);
  if (type === 'TOKEN') return rule(name, lowerContent(node), 'token');
  if (type === 'IMMEDIATE_TOKEN') {
    return rule(name, GrammarBuilder.capture('immediate_token', lowerContent(node)), 'token');
  }
  return rule(name, lowerNode(node));
}

function lowerNode(node) {
  const type = nodeType(node);
  switch (type) {
    case 'SYMBOL': return GrammarBuilder.ref(stringField(node, 'name'));
    case 'STRING': return GrammarBuilder.literal(stringField(node, 'value'));
    case 'PATTERN': return lowerPattern(stringField(node, 'value'));
    case 'BLANK': return GrammarBuilder.empty();
    case 'SEQ': return sequence(arrayField(node, 'members').map(lowerNode));
    case 'CHOICE': return lowerChoice(arrayField(node, 'members'));
    case 'REPEAT': return GrammarBuilder.repeat0(lowerContent(node));
    case 'REPEAT1': return GrammarBuilder.repeat1(lowerContent(node));
    case 'PREC': return lowerPrecedence(node, 'prec');
    case 'PREC_LEFT': return lowerPrecedence(node, 'prec_left');
    case 'PREC_RIGHT': return lowerPrecedence(node, 'prec_right');
    case 'PREC_DYNAMIC': return lowerPrecedence(node, 'prec_dynamic');
    case 'TOKEN': return GrammarBuilder.capture('token', lowerContent(node));
    case 'IMMEDIATE_TOKEN': return GrammarBuilder.capture('immediate_token', lowerContent(node));
    case 'FIELD': return GrammarBuilder.capture(stringField(node, 'name'), lowerContent(node));
    case 'ALIAS':
      return GrammarBuilder.capture(`alias:${stringField(node, 'value')}`, lowerContent(node));
    case 'RESERVED': {
      const label = node.context_name === undefined
        ? 'reserved'
        : `reserved:${stringField(node, 'context_name')}`;
      return GrammarBuilder.capture(label, lowerContent(node));
    }
    default: throw unsupportedError(FORMAT, type);
  }
}

function lowerChoice(nodes) {
  const alternatives = nodes.map(lowerNode);
  if (alternatives.length === 2) {
    if (alternatives[0].kind === 'empty') return GrammarBuilder.optional(alternatives[1]);
    if (alternatives[1].kind === 'empty') return GrammarBuilder.optional(alternatives[0]);
  }
  return choice(alternatives, false);
}

function lowerContent(node) {
  if (!isObject(node) || node.content === undefined) {
    throw parseError(FORMAT, 'node is missing content');
  }
  return lowerNode(node.content);
}

function lowerPrecedence(node, label) {
  if (typeof node.value !== 'number' && typeof node.value !== 'string') {
    throw parseError(FORMAT, 'precedence value must be a number or string');
  }
  return GrammarBuilder.capture(`${label}=${node.value}`, lowerContent(node));
}

function lowerPattern(pattern) {
  const parsed = parseCharClassPattern(pattern);
  return parsed ?? GrammarBuilder.capture('regex', GrammarBuilder.literal(pattern));
}

function parseCharClassPattern(pattern) {
  if (!pattern.startsWith('[') || !pattern.endsWith(']')) return null;
  let content = pattern.slice(1, -1);
  let negated = false;
  if (content.startsWith('^')) {
    negated = true;
    content = content.slice(1);
  }
  const characters = [...content];
  const items = [];
  for (let index = 0; index < characters.length;) {
    const first = readClassCharacter(characters, index);
    if (!first) return null;
    index = first.next;
    if (characters[index] === '-' && index + 1 < characters.length) {
      const last = readClassCharacter(characters, index + 1);
      if (!last || first.value > last.value) return null;
      items.push({ kind: 'range', start: first.value, end: last.value });
      index = last.next;
    } else {
      items.push({ kind: 'char', value: first.value });
    }
  }
  return items.length > 0 ? GrammarBuilder.charClass(items, negated) : null;
}

function readClassCharacter(characters, index) {
  const character = characters[index];
  if (character === undefined) return null;
  if (character !== '\\') return { value: character, next: index + 1 };
  const escaped = characters[index + 1];
  if (escaped === undefined) return null;
  const value = ({ n: '\n', r: '\r', t: '\t' })[escaped] ??
    ('\\"\'[]-^'.includes(escaped) ? escaped : null);
  return value === null ? null : { value, next: index + 2 };
}

function nodeType(node) {
  if (!isObject(node) || typeof node.type !== 'string') {
    throw parseError(FORMAT, 'grammar node is missing string type');
  }
  return node.type;
}

function stringField(node, field) {
  if (!isObject(node) || typeof node[field] !== 'string') {
    throw parseError(FORMAT, `node is missing string ${field}`);
  }
  return node[field];
}

function arrayField(node, field) {
  if (!isObject(node) || !Array.isArray(node[field])) {
    throw parseError(FORMAT, `node is missing array ${field}`);
  }
  return node[field];
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
