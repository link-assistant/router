// Reconciliation of corresponding rules across the sources of one language
// edition, the `reconcile: true` mode of `mergeGrammars`. It mirrors
// rust/src/grammar/merge/reconcile.rs.
//
// The strict merge unites only the rules it proves equivalent. Real grammars
// of one language from different sources (a tree-sitter grammar.json and a
// grammars-v4 ANTLR grammar) almost never are: they spell the same lexical
// concepts with different details, and they decompose the same constructs in
// the same way but write them differently. Reconciliation recognizes such
// corresponding rules under any names:
//
// - A lexical rule, one that reaches only other lexical rules and no
//   recursion, is compared by its lexical role. A rule that spells finitely
//   many strings is compared by its exact text. Otherwise the role is the
//   delimiters that every alternative opens and closes with, or else the kind
//   of character it starts with, a letter or a digit.
// - A parser rule is compared by a bisimulation up to these roles, after a
//   normalization that keeps the language of the rule. Fields, precedences,
//   aliases and token wrappers are dropped. An end-of-input check that ends a
//   sequence is dropped. A sequence with at most three optional items is
//   expanded into the alternatives with and without each of them.
//
// A class of corresponding rules is reconciled only when every source in it
// has exactly one strictly distinct rule in it. So a source's own rules are
// never united by correspondence, and a role that two rules of one source
// share is no evidence at all: those rules are compared by their exact text.
import { compareText, normalize, q } from './grammar-merge-normalize.js';
import { mapReferences } from './grammar-rename.js';
import { renderRuleFieldLinks } from './grammar-links.js';
import { acceptRuleCorrespondence } from './grammar-merge-decisions.js';

/** How a reconciled class of corresponding rules is justified. */
export const GRAMMAR_RECONCILE_METHOD = 'structural-correspondence-up-to-lexical-roles';
/** How a reconciled class of rules that only share a name is justified. */
export const GRAMMAR_NAME_RECONCILE_METHOD = 'name-correspondence';

// Feature wrappers that change how a parse is chosen or named, not what it
// accepts.
const WRAPPERS = new Set(['precedence', 'namedPrecedence', 'dynamicPrecedence', 'lexicalPrecedence', 'token', 'immediateToken', 'alias']);
// The expression kinds a lexical rule is made of.
const LEXICAL_KINDS = new Set([
  'empty', 'literal', 'literalInsensitive', 'charRange', 'charClass', 'any', 'ref',
  'seq', 'choice', 'repeat0', 'repeat1', 'optional', 'repeat', 'and', 'not', 'capture', ...WRAPPERS,
]);
const MAX_OPTIONALS = 3;
const MAX_EXPANSION = 4096;
const LETTERS = [...'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'];
const DIGITS = [...'0123456789'];

/**
 * The reconciled classes of a merge group. `nodes` are its rules in source
 * precedence order, `index` maps `sourceId:ruleName` to a node position,
 * `strict` holds the strict bisimulation class of every node and
 * `sourceLabel(source, internal)` labels a reference of a source. Returns
 * `{ classes, bases }`: a class key for every node (`s<strict>` for a strict
 * class, `r<class>` for a structurally reconciled one, `n<strict>` for one
 * reconciled by name) and the basis of every reconciled class key. `trace`,
 * when given, is called with `{ alias, token, role, signature, key }` for
 * every node.
 */
export function reconcileClasses(nodes, index, strict, sourceLabel, trace = null) {
  const tokens = tokenRules(nodes, index, lexicalRules(nodes, index));
  const roles = lexicalRoles(nodes, index, strict, tokens);
  // Rules of a rejected class keep their strict classes in the next round,
  // so no accepted class rests on a correspondence that was rejected.
  const fixed = nodes.map(() => false);
  let classes;
  let signatures;
  let reconciled;
  for (;;) {
    ({ classes, signatures } = refineUpToRoles(nodes, index, strict, sourceLabel, tokens, roles, fixed));
    const members = new Map();
    for (const [position, id] of classes.entries()) {
      if (!members.has(id)) members.set(id, []);
      members.get(id).push(position);
    }
    // A class is reconciled when it spans sources and each of its sources
    // has one strict class in it.
    reconciled = new Set();
    let rejected = false;
    for (const [id, positions] of members) {
      const bySource = strictClassesBySource(nodes, strict, positions);
      if (bySource.size < 2) continue;
      const concepts = new Set(positions.map((position) => nodes[position].rule.concept).filter((concept) => concept !== undefined));
      if (acceptRuleCorrespondence(bySource.size > 1, [...bySource.values()].every((set) => set.size === 1), concepts.size <= 1)) reconciled.add(id);
      else {
        for (const position of positions) fixed[position] = true;
        rejected = true;
      }
    }
    if (!rejected) break;
  }
  const keys = classes.map((id, position) => (reconciled.has(id) ? `r${id}` : `s${strict[position]}`));
  const bases = new Map();
  for (const key of keys) if (key.startsWith('r')) bases.set(key, GRAMMAR_RECONCILE_METHOD);
  reconcileByName(nodes, strict, tokens, keys, bases);
  if (trace) {
    for (const [position, node] of nodes.entries()) {
      trace({ alias: node.alias, token: tokens[position], role: roles[position], signature: signatures[position], key: keys[position] });
    }
  }
  return { classes: keys, bases };
}

// The greatest bisimulation up to lexical roles, by partition refinement as
// in the strict merge. A fixed rule starts in a class of its own strict
// class.
function refineUpToRoles(nodes, index, strict, sourceLabel, tokens, roles, fixed) {
  const roleOf = (node, name) => roles[index.get(`${node.source.id}:${name}`)];
  let classes = nodes.map(() => 0);
  let count = 0;
  for (;;) {
    const current = classes;
    const signatures = nodes.map((node, position) => {
      const prefix = count === 0 ? (fixed[position] ? `!${strict[position]}` : '') : String(current[position]);
      if (tokens[position]) return `${prefix}|lex|${roles[position]}|${ruleFields(node.rule, (name) => name)}`;
      const label = sourceLabel(node.source, (name) => {
        const target = index.get(`${node.source.id}:${name}`);
        if (!tokens[target]) return `#${current[target]}`;
        // A token of an exact role reads as its text, so a parser rule that
        // spells the token inline compares equal to one that references it.
        const role = roleOf(node, name);
        return role.startsWith('exact(') ? role.slice('exact('.length, -1) : role;
      });
      return `${prefix}|${comparisonText(node.rule, label)}`;
    });
    const ranks = new Map([...new Set(signatures)].sort(compareText).map((key, rank) => [key, rank]));
    classes = signatures.map((key) => ranks.get(key));
    if (ranks.size === count) return { classes, signatures };
    count = ranks.size;
  }
}

function strictClassesBySource(nodes, strict, positions) {
  const bySource = new Map();
  for (const position of positions) {
    const source = nodes[position].source.id;
    if (!bySource.has(source)) bySource.set(source, new Set());
    bySource.get(source).add(strict[position]);
  }
  return bySource;
}

// The rules no correspondence matched are reconciled by name: the strict
// classes of different sources whose rules have one name up to case, `_`, `-`
// and a leading language name (grammars-v4's `htmlElement` is HTML's
// `element`), when each source has one such class, none of them is shared with
// another source yet, and they are all tokens or all not. Their keys become
// `n<strict>` of the first of them.
function reconcileByName(nodes, strict, tokens, keys, bases) {
  const shared = new Set();
  const classSources = new Map();
  for (const [position, node] of nodes.entries()) {
    if (!classSources.has(strict[position])) classSources.set(strict[position], new Set());
    classSources.get(strict[position]).add(node.source.id);
  }
  for (const [id, sources] of classSources) if (sources.size > 1) shared.add(id);
  const byName = new Map();
  for (const [position, node] of nodes.entries()) {
    if (!keys[position].startsWith('s') || shared.has(strict[position])) continue;
    const compared = comparedName(node.name, node.source.language);
    if (compared.length === 0) continue;
    const name = `${compared}\u0000${ruleFields(node.rule, (reference) => reference)}`;
    if (!byName.has(name)) byName.set(name, []);
    byName.get(name).push(position);
  }
  const used = new Set();
  for (const name of [...byName.keys()].sort(compareText)) {
    const positions = byName.get(name);
    const bySource = strictClassesBySource(nodes, strict, positions);
    if (bySource.size < 2 || [...bySource.values()].some((set) => set.size !== 1)) continue;
    const ids = [...new Set(positions.map((position) => strict[position]))];
    if (ids.some((id) => used.has(id))) continue;
    if (new Set(positions.map((position) => tokens[position])).size !== 1) continue;
    if (new Set(positions.map((position) => nodes[position].rule.concept).filter((concept) => concept !== undefined)).size > 1) continue;
    const key = `n${strict[positions[0]]}`;
    for (const id of ids) used.add(id);
    for (const [position, current] of keys.entries()) if (ids.includes(strict[position]) && current.startsWith('s')) keys[position] = key;
    bases.set(key, GRAMMAR_NAME_RECONCILE_METHOD);
  }
}

// A rule name up to case, `_` and `-`, without a leading name of its language
// that a case change or `_` ends: `htmlElement` and `HTML_ELEMENT` of HTML
// compare as `element`, `comment` of C stays `comment`.
export function comparedName(name, language) {
  const prefix = language.toLowerCase().replace(/[^a-z0-9]/gu, '');
  const bare = (text) => text.toLowerCase().replace(/[-_]/gu, '');
  if (prefix.length > 0 && name.length > prefix.length && name.slice(0, prefix.length).toLowerCase() === prefix) {
    const rest = name.slice(prefix.length);
    const boundary = /^[-_]/u.test(rest) || (/^[A-Z]/u.test(rest) && name[prefix.length - 1] !== name[prefix.length - 1].toUpperCase());
    if (boundary && bare(rest).length > 0) return bare(rest);
  }
  return bare(name);
}

// Whether each node is lexical: it reaches only lexical kinds and defined
// rules of its source, without recursion.
function lexicalRules(nodes, index) {
  const state = nodes.map(() => 0);
  const lexical = nodes.map(() => false);
  const visit = (position) => {
    if (state[position] === 2) return lexical[position];
    if (state[position] === 1) return false;
    state[position] = 1;
    const node = nodes[position];
    let result = onlyLexicalKinds(node.expression) && node.rule.parameters === undefined;
    if (result) {
      for (const name of references(node.expression)) {
        const target = index.get(`${node.source.id}:${name}`);
        if (target === undefined || !visit(target)) {
          result = false;
          break;
        }
      }
    }
    state[position] = 2;
    lexical[position] = result;
    return result;
  };
  for (let position = 0; position < nodes.length; position += 1) visit(position);
  return lexical;
}

function onlyLexicalKinds(expression) {
  if (!LEXICAL_KINDS.has(expression.kind)) return false;
  if (expression.kind === 'ref') return !(expression.arguments?.length > 0);
  if (expression.kind === 'charClass') return expression.items === undefined || expression.items.every(({ kind }) => kind !== 'byte');
  return children(expression).every(onlyLexicalKinds);
}

function children(expression) {
  if (expression.items) return expression.items;
  return expression.item ? [expression.item] : [];
}

function references(expression) {
  const names = [];
  mapReferences(expression, (name) => {
    if (!names.includes(name)) names.push(name);
    return name;
  });
  return names;
}

// Which lexical rules are tokens, compared by their roles: a rule its source
// declares a token, one that references no rule, or one a non-lexical rule
// references. The other lexical rules are compositions of tokens, such as the
// rows and fields of a grammar without recursion, and are compared like
// parser rules.
function tokenRules(nodes, index, lexical) {
  const tokens = nodes.map((node, position) => lexical[position]
    && (node.kind === 'token' || references(node.expression).every((name) => !index.has(`${node.source.id}:${name}`))));
  for (const [position, node] of nodes.entries()) {
    if (lexical[position]) continue;
    for (const name of references(node.expression)) {
      const target = index.get(`${node.source.id}:${name}`);
      if (target !== undefined && lexical[target]) tokens[target] = true;
    }
  }
  return tokens;
}

// The lexical role of every token; null for the others.
function lexicalRoles(nodes, index, strict, lexical) {
  const expanded = new Map();
  const expand = (position) => {
    if (expanded.has(position)) return expanded.get(position);
    const node = nodes[position];
    const result = expandExpression(node.expression, (name) => expand(index.get(`${node.source.id}:${name}`)));
    expanded.set(position, result);
    return result;
  };
  // A fragment, a lexical rule that only other lexical rules reference, is
  // part of a token rather than a token; it keeps its exact text.
  const fragment = nodes.map(() => false);
  const token = nodes.map(() => false);
  for (const [position, node] of nodes.entries()) {
    for (const name of references(node.expression)) {
      const target = index.get(`${node.source.id}:${name}`);
      if (target === undefined) continue;
      if (lexical[position]) fragment[target] = true;
      else token[target] = true;
    }
  }
  const described = nodes.map((node, position) => {
    if (!lexical[position]) return null;
    const form = expand(position);
    if (form === null) return { exact: `opaque(${q(node.alias)})`, role: null };
    const cleaned = lexicalForm(form.expr);
    const exact = `exact(${normalize(cleaned, () => '').text})`;
    if (fragment[position] && !token[position]) return { exact, role: null };
    return { exact, role: finite(cleaned) ? null : delimiters(cleaned) ?? lead(cleaned) };
  });
  // A role two strictly distinct rules of one source share tells them apart
  // from nothing: those rules keep their exact text.
  const shared = new Map();
  for (const [position, entry] of described.entries()) {
    if (entry?.role == null) continue;
    const key = `${nodes[position].source.id}\u0000${entry.role}`;
    if (!shared.has(key)) shared.set(key, new Set());
    shared.get(key).add(strict[position]);
  }
  return described.map((entry, position) => {
    if (entry === null) return null;
    if (entry.role === null) return entry.exact;
    return shared.get(`${nodes[position].source.id}\u0000${entry.role}`).size > 1 ? entry.exact : entry.role;
  });
}

// The expression with every reference replaced by its expansion, and its
// size; null when it grows past MAX_EXPANSION nodes.
function expandExpression(expression, expandName) {
  if (expression.kind === 'ref') return expandName(expression.name);
  const parts = children(expression).map((item) => expandExpression(item, expandName));
  if (parts.some((part) => part === null)) return null;
  const size = 1 + parts.reduce((sum, part) => sum + part.size, 0);
  if (size > MAX_EXPANSION) return null;
  const exprs = parts.map((part) => part.expr);
  if (expression.items) return { expr: { ...expression, items: exprs }, size };
  if (expression.item) return { expr: { ...expression, item: exprs[0] }, size };
  return { expr: expression, size };
}

// A lexical expression without wrappers or captures, with nested sequences
// flattened and adjacent literals joined.
function lexicalForm(expression) {
  if (WRAPPERS.has(expression.kind) || expression.kind === 'capture') return lexicalForm(expression.item);
  if (expression.kind === 'seq') {
    const items = [];
    for (const item of expression.items.map(lexicalForm)) {
      for (const part of item.kind === 'seq' ? item.items : [item]) {
        const value = literalValue(part);
        const previous = items.length === 0 ? null : literalValue(items.at(-1));
        if (value !== null && previous !== null) items[items.length - 1] = { kind: 'literal', value: previous + value };
        else items.push(part);
      }
    }
    if (items.length === 0) return { kind: 'empty' };
    return items.length === 1 ? items[0] : { kind: 'seq', items };
  }
  if (expression.items) return { ...expression, items: expression.items.map(lexicalForm) };
  if (expression.item) return { ...expression, item: lexicalForm(expression.item) };
  return expression;
}

function literalValue(expression) {
  if (expression.kind === 'literal') return expression.value;
  if (expression.kind === 'charRange' && expression.start === expression.end) return expression.start;
  return null;
}

// Whether a lexical expression spells finitely many strings.
function finite(expression) {
  switch (expression.kind) {
    case 'empty':
    case 'literal':
    case 'literalInsensitive':
    case 'charRange':
      return true;
    case 'charClass':
      return expression.negated !== true && Array.isArray(expression.items) && expression.items.every(({ kind }) => kind === 'char' || kind === 'range');
    case 'seq':
    case 'choice':
      return expression.items.every(finite);
    case 'optional':
      return finite(expression.item);
    case 'repeat':
      return expression.max !== undefined && expression.max !== null && finite(expression.item);
    case 'and':
    case 'not':
      return true;
    default:
      return false;
  }
}

// `delimited(open:close,...)` when every alternative opens with a literal
// starting with ASCII punctuation: a sequence of two or more items that
// starts with such a literal, or such a literal of two or more characters.
// `open` is the first character of the alternative and `close` its last, or
// `_` when it does not end with a literal.
function delimiters(expression) {
  const alternatives = [];
  const collect = (item) => {
    if (item.kind === 'choice') item.items.forEach(collect);
    else alternatives.push(item);
  };
  collect(expression);
  const pairs = new Set();
  for (const alternative of alternatives) {
    const whole = literalValue(alternative);
    const items = alternative.kind === 'seq' ? alternative.items : [];
    if (whole === null ? items.length < 2 : [...whole].length < 2) return null;
    const open = whole ?? literalValue(items[0]);
    if (open === null || !isAsciiPunctuation(open.codePointAt(0))) return null;
    const close = whole ?? literalValue(items.at(-1));
    pairs.add(`${q(String.fromCodePoint(open.codePointAt(0)))}:${close === null || close.length === 0 ? '_' : q([...close].at(-1))}`);
  }
  return `delimited(${[...pairs].sort(compareText).join(',')})`;
}

function isAsciiPunctuation(code) {
  return (code >= 0x21 && code <= 0x2f) || (code >= 0x3a && code <= 0x40) || (code >= 0x5b && code <= 0x60) || (code >= 0x7b && code <= 0x7e);
}

// `lead(letter)` or `lead(digit)` when the first character of every match is
// drawn from letters and not digits, or from digits and not letters, among the
// ASCII letters and digits.
function lead(expression) {
  const first = firstAtoms(expression);
  if (first === null) return null;
  const accepts = (probes) => probes.some((probe) => first.atoms.some((atom) => atomAccepts(atom, probe)));
  const letter = accepts(LETTERS);
  const digit = accepts(DIGITS);
  if (letter === digit) return null;
  return letter ? 'lead(letter)' : 'lead(digit)';
}

// The atoms a match can start with, and whether the expression matches the
// empty string; null when a start is unknown.
function firstAtoms(expression) {
  switch (expression.kind) {
    case 'empty':
    case 'and':
    case 'not':
      return { atoms: [], nullable: true };
    case 'literal':
    case 'literalInsensitive':
      if (expression.value.length === 0) return { atoms: [], nullable: true };
      return { atoms: [{ kind: expression.kind, value: String.fromCodePoint(expression.value.codePointAt(0)) }], nullable: false };
    case 'charRange':
    case 'charClass':
    case 'any':
      if (expression.kind === 'charClass' && !Array.isArray(expression.items)) return null;
      return { atoms: [expression], nullable: false };
    case 'seq': {
      const atoms = [];
      for (const item of expression.items) {
        const first = firstAtoms(item);
        if (first === null) return null;
        atoms.push(...first.atoms);
        if (!first.nullable) return { atoms, nullable: false };
      }
      return { atoms, nullable: true };
    }
    case 'choice': {
      const atoms = [];
      let nullable = false;
      for (const item of expression.items) {
        const first = firstAtoms(item);
        if (first === null) return null;
        atoms.push(...first.atoms);
        nullable ||= first.nullable;
      }
      return { atoms, nullable };
    }
    case 'repeat0':
    case 'optional':
    case 'repeat1':
    case 'repeat': {
      const first = firstAtoms(expression.item);
      if (first === null) return null;
      const optional = expression.kind === 'repeat0' || expression.kind === 'optional' || (expression.kind === 'repeat' && expression.min === 0);
      return { atoms: first.atoms, nullable: first.nullable || optional };
    }
    default:
      return null;
  }
}

function atomAccepts(atom, probe) {
  switch (atom.kind) {
    case 'any': return true;
    case 'literal': return atom.value === probe;
    case 'literalInsensitive': return atom.value.length === 1 && atom.value.codePointAt(0) < 0x80 && atom.value.toLowerCase() === probe.toLowerCase();
    case 'charRange': return inRange(probe, atom.start, atom.end);
    case 'charClass': return atom.items.some((item) => itemAccepts(item, probe)) !== (atom.negated === true);
    default: return false;
  }
}

function itemAccepts(item, probe) {
  switch (item.kind) {
    case 'char': return item.value === probe;
    case 'range': return inRange(probe, item.start, item.end);
    case 'category': {
      const letter = /^[a-zA-Z]$/u.test(probe);
      if (item.value === 'L') return letter;
      if (item.value === 'Lu') return letter && probe === probe.toUpperCase();
      if (item.value === 'Ll') return letter && probe === probe.toLowerCase();
      if (item.value === 'N' || item.value === 'Nd') return !letter;
      return false;
    }
    case 'script':
      if (item.value === 'Latin') return /^[a-zA-Z]$/u.test(probe);
      return item.value === 'Common' && /^[0-9]$/u.test(probe);
    default:
      return false;
  }
}

function inRange(probe, start, end) {
  const code = probe.codePointAt(0);
  return code >= start.codePointAt(0) && code <= end.codePointAt(0);
}

// The comparison text of a parser rule: its language-preserving form with
// references printed by `label`, and its parameters.
function comparisonText(rule, label) {
  return `${normalize(parserForm(rule.expression, true), label).text}${ruleFields(rule, label)}`;
}

function ruleFields(rule, label) {
  const action = rule.action === undefined ? undefined : mapReferences(rule.action, label);
  return renderRuleFieldLinks({ ...rule, action }).join(' ');
}

// A parser expression without wrappers, captures, a closing end-of-input
// check, and with the optional items of a short sequence expanded.
function parserForm(expression, top = false) {
  if (WRAPPERS.has(expression.kind) || expression.kind === 'capture') return parserForm(expression.item, top);
  if (expression.kind === 'seq') {
    const items = expression.items.map((item) => parserForm(item));
    if (top && items.length > 1 && isEndOfInput(items.at(-1))) items.pop();
    const optional = items.filter(isOptional).length;
    if (optional === 0 || optional > MAX_OPTIONALS) return { kind: 'seq', items };
    let alternatives = [[]];
    for (const item of items) {
      if (isOptional(item)) alternatives = alternatives.flatMap((prefix) => [prefix, [...prefix, item.item]]);
      else alternatives = alternatives.map((prefix) => [...prefix, item]);
    }
    return { kind: 'choice', ordered: false, items: alternatives.map((list) => ({ kind: 'seq', items: list })) };
  }
  if (expression.kind === 'choice') return { ...expression, ordered: false, items: expression.items.map((item) => parserForm(item, top)) };
  if (expression.items) return { ...expression, items: expression.items.map((item) => parserForm(item)) };
  if (expression.item) return { ...expression, item: parserForm(expression.item) };
  return expression;
}

function isOptional(expression) {
  return expression.kind === 'optional' || (expression.kind === 'repeat' && expression.min === 0 && expression.max === 1);
}

function isEndOfInput(expression) {
  return expression.kind === 'not' && expression.item.kind === 'any';
}
