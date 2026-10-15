// The keyword candidates tree-sitter keeps out of keyword extraction because
// lexing the word token for them would change their lexical conflicts:
// `identify_keywords` in tree-sitter's build_tables.rs excludes a candidate
// where, in a parse state that holds it and no word token, a token that is no
// candidate conflicts with the word token otherwise than with the candidate.
// Solidity's `_` of `hex"aa_bb"` is no keyword: after a `_hex_digit`, where
// no identifier is valid, the word token would conflict with the next
// `_hex_digit`, the `_` does not.
//
// The parse states are approximated by the start and the tokens that can
// follow each member of each rule (FIRST and FOLLOW sets) with the extras; the
// conflicts are tree-sitter's, of the tokens' NFAs.
import { MATCHES_DIFFERENT_STRING, MATCHES_SAME_STRING, firstCharacters, tokenConflicts } from './tree-sitter-token-conflicts.js';

const unwrap = (node) => (node.type.startsWith('PREC') || node.type === 'FIELD' || node.type === 'ALIAS' || node.type === 'RESERVED' || node.type === 'NATIVE_PREFIX_EXCLUSION' ? unwrap(node.content) : node);
const isLexical = (node) => ['STRING', 'PATTERN', 'TOKEN', 'IMMEDIATE_TOKEN'].includes(unwrap(node).type);

/**
 * The texts of the keyword `candidates` (each `{ key, node, texts }`, `key`
 * naming its token as `tokenKey` does) tree-sitter excludes from the
 * keywords of `grammar`, whose word token is the rule `word`. `tokenKey(node,
 * name)` names the token of a lexical node, `name` the rule whose body it
 * is, or null.
 */
export function excludedKeywordTexts(grammar, word, candidates, tokenKey) {
  const rules = grammar.rules;
  const externals = new Set((grammar.externals ?? []).map((member) => member.name ?? member.value));
  const wordKey = tokenKey(rules[word], word);
  const nodes = new Map();
  const keyOf = (node, name = null) => {
    const key = tokenKey(node, name);
    let lexical = node;
    while (lexical.type === 'NATIVE_PREFIX_EXCLUSION') lexical = lexical.content;
    if (!nodes.has(key)) nodes.set(key, lexical);
    return key;
  };
  // FIRST sets of the syntactic rules, to a fixed point.
  const first = new Map(Object.keys(rules).map((name) => [name, { keys: new Set(), nullable: false }]));
  const firstOf = (node) => {
    switch (node.type) {
      case 'STRING': case 'PATTERN': case 'TOKEN': case 'IMMEDIATE_TOKEN': return { keys: new Set([keyOf(node)]), nullable: false };
      case 'BLANK': return { keys: new Set(), nullable: true };
      case 'SYMBOL': {
        if (!rules[node.name]) return { keys: new Set(externals.has(node.name) ? [`external ${node.name}`] : []), nullable: false };
        if (isLexical(rules[node.name])) return { keys: new Set([keyOf(rules[node.name], node.name)]), nullable: false };
        return first.get(node.name);
      }
      case 'SEQ': {
        const keys = new Set();
        for (const member of node.members) {
          const own = firstOf(member);
          own.keys.forEach((key) => keys.add(key));
          if (!own.nullable) return { keys, nullable: false };
        }
        return { keys, nullable: true };
      }
      case 'NATIVE_ORDERED_CHOICE': case 'CHOICE': {
        const owns = node.members.map(firstOf);
        return { keys: new Set(owns.flatMap((own) => [...own.keys])), nullable: owns.some((own) => own.nullable) };
      }
      case 'REPEAT': return { keys: firstOf(node.content).keys, nullable: true };
      case 'NATIVE_LITERAL_BOUNDARY': case 'NATIVE_WORD_BOUNDARY': case 'NATIVE_PREFIX_EXCLUSION': case 'NATIVE_KEYWORD_REQUIREMENT': case 'NATIVE_KEYWORD_EXCLUSION': case 'NATIVE_PATTERN_LOOKAHEAD': case 'NATIVE_KEYWORD_CONTEXT_VARIANT': case 'NATIVE_COMPLETE_CONTEXT_VARIANT': case 'NATIVE_OPTIONAL_SUFFIX_CONTEXT': case 'NATIVE_END_BOUNDARY':
      case 'REPEAT1': case 'PREC': case 'PREC_LEFT': case 'PREC_RIGHT': case 'PREC_DYNAMIC': case 'FIELD': case 'ALIAS': case 'RESERVED':
        return firstOf(node.content);
      default: return { keys: new Set(), nullable: true };
    }
  };
  const syntactic = Object.keys(rules).filter((name) => !isLexical(rules[name]));
  for (let changed = true; changed;) {
    changed = false;
    for (const name of syntactic) {
      const own = firstOf(rules[name]);
      const known = first.get(name);
      if (own.keys.size > known.keys.size || own.nullable !== known.nullable) {
        first.set(name, { keys: new Set(own.keys), nullable: own.nullable });
        changed = true;
      }
    }
  }
  // The tokens that can begin a node, then what follows it.
  const startOf = (node, follow) => {
    const own = firstOf(node);
    return own.nullable ? new Set([...own.keys, ...follow]) : own.keys;
  };
  // Walks a rule body with the tokens that can follow it, calling `visit`
  // with the tokens valid at each position and widening the rules' FOLLOW
  // sets; true when one grew.
  const follows = new Map(Object.keys(rules).map((name) => [name, new Set()]));
  // The tokens that can follow each token.
  const followers = new Map();
  const followedBy = (key, follow) => {
    if (!followers.has(key)) followers.set(key, new Set());
    follow.forEach((other) => followers.get(key).add(other));
  };
  const walk = (node, follow, visit) => {
    let grew = false;
    switch (node.type) {
      case 'STRING': case 'PATTERN': case 'TOKEN': case 'IMMEDIATE_TOKEN': followedBy(keyOf(node), follow); return false;
      case 'SYMBOL': {
        if (rules[node.name] && isLexical(rules[node.name])) followedBy(keyOf(rules[node.name], node.name), follow);
        const known = follows.get(node.name);
        if (known && !isLexical(rules[node.name])) {
          for (const key of follow) {
            if (known.has(key)) continue;
            known.add(key);
            grew = true;
          }
        }
        return grew;
      }
      case 'SEQ': {
        let after = follow;
        const afters = [];
        for (let index = node.members.length - 1; index >= 0; index -= 1) {
          afters[index] = after;
          after = startOf(node.members[index], after);
        }
        // A parse state follows each member: the tokens valid after it.
        node.members.forEach((member, index) => {
          grew = walk(member, afters[index], visit) || grew;
          visit(afters[index]);
        });
        return grew;
      }
      case 'NATIVE_ORDERED_CHOICE': case 'CHOICE': return node.members.map((member) => walk(member, follow, visit)).some(Boolean);
      case 'REPEAT': case 'REPEAT1': return walk(node.content, new Set([...firstOf(node.content).keys, ...follow]), visit);
      case 'NATIVE_LITERAL_BOUNDARY': case 'NATIVE_WORD_BOUNDARY': case 'NATIVE_PREFIX_EXCLUSION': case 'NATIVE_KEYWORD_REQUIREMENT': case 'NATIVE_KEYWORD_EXCLUSION': case 'NATIVE_PATTERN_LOOKAHEAD': case 'NATIVE_KEYWORD_CONTEXT_VARIANT': case 'NATIVE_COMPLETE_CONTEXT_VARIANT': case 'NATIVE_OPTIONAL_SUFFIX_CONTEXT': case 'NATIVE_END_BOUNDARY':
      case 'PREC': case 'PREC_LEFT': case 'PREC_RIGHT': case 'PREC_DYNAMIC': case 'FIELD': case 'ALIAS': case 'RESERVED':
        return walk(node.content, follow, visit);
      default: return false;
    }
  };
  for (let changed = true; changed;) {
    changed = false;
    for (const name of syntactic) changed = walk(rules[name], follows.get(name), () => {}) || changed;
  }
  // An extra of no rule is a separator of tree-sitter's lexer, no token.
  const extras = new Set((grammar.extras ?? []).filter((extra) => extra.type === 'SYMBOL' && rules[extra.name] && isLexical(rules[extra.name]))
    .map((extra) => keyOf(rules[extra.name], extra.name)));
  // The states without the word token, once each, by the tokens they hold.
  const states = new Map();
  const holding = new Map();
  const visit = (keys) => {
    if (keys.has(wordKey)) return;
    const state = [...new Set([...keys, ...extras])].sort();
    const id = state.join('\u0000');
    if (states.has(id)) return;
    states.set(id, state);
    for (const key of state) holding.set(key, [...(holding.get(key) ?? []), state]);
  };
  // The start state, then the states after each member of each rule.
  visit(startOf(rules[syntactic[0]], new Set()));
  for (const name of syntactic) walk(rules[name], follows.get(name), visit);
  // The lexical variable order, tree-sitter's last tie-break between two
  // tokens: the tokens in the order the rule bodies hold them, a rule that is
  // a token at its own place.
  const order = new Map();
  const number = (key) => { if (!order.has(key)) order.set(key, order.size); };
  const extract = (node) => {
    if (['STRING', 'PATTERN', 'TOKEN', 'IMMEDIATE_TOKEN'].includes(node.type)) number(keyOf(node));
    else if (node.type !== 'SYMBOL') for (const child of node.members ?? (node.content ? [node.content] : [])) extract(child);
  };
  for (const [name, rule] of Object.entries(rules)) {
    if (isLexical(rule)) number(keyOf(rule, name));
    else extract(rule);
  }
  // The characters the separators, the extras of no rule, begin with: every
  // token but an immediate one can begin with them.
  const separators = new Set((grammar.extras ?? []).filter((extra) => extra.type !== 'SYMBOL')
    .flatMap((extra) => [...firstCharacters(rules, extra)]));
  const immediate = (node) => (node.type === 'IMMEDIATE_TOKEN' ? true : node.content && node.type !== 'TOKEN' ? immediate(node.content) : false);
  const starts = new Map();
  const startsOf = (key) => {
    if (!starts.has(key)) {
      const node = nodes.get(key);
      starts.set(key, node ? new Set([...firstCharacters(rules, node), ...(immediate(node) ? [] : separators)]) : new Set());
    }
    return starts.get(key);
  };
  const followingChars = new Map();
  const following = (key) => {
    if (!followingChars.has(key)) followingChars.set(key, new Set([...(followers.get(key) ?? []), ...extras].flatMap((other) => [...startsOf(other)])));
    return followingChars.get(key);
  };
  const status = tokenConflicts(rules, nodes, order, following);
  if (process.env.NATIVE_KEYWORDS_TRACE) for (const key of nodes.keys()) if (process.env.NATIVE_KEYWORDS_TRACE.split(',').some((part) => key.includes(part))) console.error(`keywords: ${key} #${order.get(key)} towards the word #${order.get(wordKey)}: ${status(key, wordKey)}, back ${status(wordKey, key)}`);
  // The tokens tree-sitter takes for keyword candidates: those that begin
  // with letters or `_` only and match no text but one the word token does.
  const alphabetic = /^[\p{Alphabetic}_]$/u;
  const detected = [...nodes.keys()].filter((key) => key !== wordKey && [...firstCharacters(rules, nodes.get(key))].every((c) => alphabetic.test(c))
    && firstCharacters(rules, nodes.get(key)).size > 0
    && (status(key, wordKey) & MATCHES_SAME_STRING) !== 0 && (status(key, wordKey) & MATCHES_DIFFERENT_STRING) === 0);
  const candidateKeys = new Set([...candidates.map(({ key }) => key), ...detected]);
  const excluded = new Set();
  for (const { key, node, texts } of candidates) {
    if (!nodes.has(key)) nodes.set(key, node);
    let clash = null;
    for (const state of holding.get(key) ?? []) {
      const other = state.find((other) => !candidateKeys.has(other) && nodes.has(other) && status(key, other) !== status(wordKey, other));
      if (other !== undefined) {
        clash = { other, state };
        break;
      }
    }
    if (clash === null) continue;
    // NATIVE_KEYWORDS_TRACE=1 reports why each candidate is excluded.
    if (process.env.NATIVE_KEYWORDS_TRACE) console.error(`keywords: exclude ${key} for ${clash.other}: ${status(key, clash.other)} against the word's ${status(wordKey, clash.other)} in [${clash.state.join(' | ')}]`);
    texts.forEach((text) => excluded.add(text));
  }
  return excluded;
}
