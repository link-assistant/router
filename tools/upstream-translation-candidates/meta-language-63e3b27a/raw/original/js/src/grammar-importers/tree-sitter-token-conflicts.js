// The lexical conflict status of two tokens of a tree-sitter grammar JSON, as
// `compute_conflict_status` in tree-sitter's build_tables/token_conflicts.rs
// computes it: a breadth-first walk of the two tokens' NFAs together, noting
// what each token does that the other does not. The NFAs run over a sampled
// alphabet: every character below 256 and one character of each class part
// above, grouped by the transitions they take.
import { parseTreeSitterPattern } from './tree-sitter-native.js';

/** The flags of a conflict status of one token towards another. */
export const MATCHES_PREFIX = 1;
export const DOES_MATCH_CONTINUATION = 2;
export const DOES_MATCH_VALID_CONTINUATION = 4;
export const MATCHES_SAME_STRING = 16;
export const MATCHES_DIFFERENT_STRING = 32;

const WRAPPERS = new Set(['PREC', 'PREC_LEFT', 'PREC_RIGHT', 'PREC_DYNAMIC', 'FIELD', 'ALIAS', 'RESERVED', 'TOKEN', 'IMMEDIATE_TOKEN']);

// Whether a class item holds the character `c`.
function holds(item, c) {
  switch (item.kind) {
    case 'char': return item.value === c;
    case 'range': return c >= item.start && c <= item.end;
    case 'category': return new RegExp(`^\\p{${item.value}}$`, 'u').test(c);
    case 'script': return new RegExp(`^\\p{Script=${item.value}}$`, 'u').test(c);
    default: return false;
  }
}

// The first character above 255 a class item holds, or null.
function sampleAbove(item) {
  if (item.kind === 'char') return item.value.codePointAt(0) > 255 ? item.value : null;
  if (item.kind === 'range') {
    const end = item.end.codePointAt(0);
    return end > 255 ? String.fromCodePoint(Math.max(256, item.start.codePointAt(0))) : null;
  }
  for (let code = 256; code < 0x30000; code += 1) {
    if (code >= 0xd800 && code < 0xe000) continue;
    const c = String.fromCodePoint(code);
    if (holds(item, c)) return c;
  }
  return null;
}

/**
 * The conflict statuses of the tokens of a grammar JSON. `nodes` maps each
 * token key to its lexical node and `order` each key to its index, the
 * lexical variable order tree-sitter breaks a tie by; `rules` resolves the
 * symbols a token names; `following(key)` is the set of characters the
 * tokens that can follow the token begin with.
 */
export function tokenConflicts(rules, nodes, order, following) {
  const patterns = new Map();
  const patternOf = (node) => {
    const id = `${node.value}\u0000${node.flags ?? ''}`;
    if (!patterns.has(id)) patterns.set(id, parseTreeSitterPattern(node.value, node.flags ?? ''));
    return patterns.get(id);
  };
  // The alphabet: the characters below 256 and a sample of each class part above.
  const samples = new Set(Array.from({ length: 256 }, (_, code) => String.fromCharCode(code)));
  samples.add('一');
  const sampleTree = (tree) => {
    if (tree.kind === 'char' && tree.value.codePointAt(0) > 255) samples.add(tree.value);
    if (tree.kind === 'class') for (const item of tree.items) { const c = sampleAbove(item); if (c !== null) samples.add(c); }
    for (const child of tree.items ?? (tree.item ? [tree.item] : [])) sampleTree(child);
  };
  const sampleNode = (node, seen) => {
    if (node.type === 'PATTERN') sampleTree(patternOf(node));
    else if (node.type === 'STRING') [...node.value].forEach((c) => samples.add(c));
    else if (node.type === 'SYMBOL') { if (rules[node.name] && !seen.has(node.name)) sampleNode(rules[node.name], new Set([...seen, node.name])); }
    else for (const child of node.members ?? (node.content ? [node.content] : [])) sampleNode(child, seen);
  };
  for (const node of nodes.values()) sampleNode(node, new Set());
  const alphabet = [...samples];

  // One NFA per token: states with edges on character sets (sets of
  // alphabet indices), empty moves, and the precedence each was made under.
  const sets = [];
  const setOf = (test) => {
    const set = new Set();
    alphabet.forEach((c, index) => { if (test(c)) set.add(index); });
    sets.push(set);
    return set;
  };
  const build = (node) => {
    const states = [];
    const state = () => (states.push({ edges: [], moves: [], accept: null }), states.length - 1);
    const edge = (from, set, to, precedence) => states[from].edges.push({ set, to, precedence });
    const move = (from, to) => states[from].moves.push(to);
    // A single character class of a pattern tree, or null.
    const single = (tree) => {
      if (tree.kind === 'char') return (c) => c === tree.value;
      if (tree.kind === 'class') return (c) => tree.items.some((item) => holds(item, c)) !== tree.negated;
      if (tree.kind === 'alt') {
        const tests = tree.items.map(single);
        return tests.every(Boolean) ? (c) => tests.some((test) => test(c)) : null;
      }
      return null;
    };
    const tree = (pattern, from, precedence) => {
      const test = single(pattern);
      if (test !== null) {
        const to = state();
        edge(from, setOf(test), to, precedence);
        return to;
      }
      switch (pattern.kind) {
        case 'seq': {
          // [^x\S]: the characters of no alternative.
          const [not, any] = pattern.items;
          if (pattern.items.length === 2 && not.kind === 'not' && any.kind === 'class' && any.negated && any.items.length === 0 && single(not.item)) {
            const inner = single(not.item);
            const to = state();
            edge(from, setOf((c) => !inner(c)), to, precedence);
            return to;
          }
          return pattern.items.reduce((at, item) => tree(item, at, precedence), from);
        }
        case 'alt': {
          const to = state();
          for (const item of pattern.items) move(tree(item, from, precedence), to);
          return to;
        }
        case 'repeat': return repeat(pattern.min, pattern.max, from, (at) => tree(pattern.item, at, precedence));
        default: return from;
      }
    };
    const repeat = (min, max, from, once) => {
      let at = from;
      for (let count = 0; count < min && count < 16; count += 1) at = once(at);
      if (max === null || max > 16) {
        const loop = state();
        move(at, loop);
        move(once(loop), loop);
        return loop;
      }
      const to = state();
      move(at, to);
      for (let count = min; count < max; count += 1) {
        at = once(at);
        move(at, to);
      }
      return to;
    };
    const lexical = (node, from, precedence, seen) => {
      switch (node.type) {
        case 'STRING': return [...node.value].reduce((at, c) => {
          const to = state();
          edge(at, setOf((x) => x === c), to, precedence);
          return to;
        }, from);
        case 'PATTERN': return tree(patternOf(node), from, precedence);
        case 'BLANK': return from;
        case 'SYMBOL': {
          if (!rules[node.name] || seen.has(node.name)) return from;
          return lexical(rules[node.name], from, precedence, new Set([...seen, node.name]));
        }
        case 'SEQ': return node.members.reduce((at, member) => lexical(member, at, precedence, seen), from);
        case 'CHOICE': {
          const to = state();
          for (const member of node.members) move(lexical(member, from, precedence, seen), to);
          return to;
        }
        case 'REPEAT': return repeat(0, null, from, (at) => lexical(node.content, at, precedence, seen));
        case 'REPEAT1': return repeat(1, null, from, (at) => lexical(node.content, at, precedence, seen));
        case 'PREC': case 'PREC_LEFT': case 'PREC_RIGHT':
          return lexical(node.content, from, typeof node.value === 'number' ? node.value : precedence, seen);
        default: return WRAPPERS.has(node.type) ? lexical(node.content, from, precedence, seen) : from;
      }
    };
    const start = state();
    const end = lexical(node, start, 0, new Set());
    // The precedence of an accepting state is the one its token ends under.
    const precedenceAt = (node) => (['PREC', 'PREC_LEFT', 'PREC_RIGHT'].includes(node.type) && typeof node.value === 'number' ? node.value
      : WRAPPERS.has(node.type) ? precedenceAt(node.content) : 0);
    states[end].accept = precedenceAt(node);
    return { states, start };
  };
  const nfas = new Map();
  const nfaOf = (key) => {
    if (!nfas.has(key)) nfas.set(key, build(nodes.get(key)));
    return nfas.get(key);
  };
  // tree-sitter's implicit precedence: a string token outranks a pattern.
  const implicit = (node) => (node.type === 'STRING' ? 2 : WRAPPERS.has(node.type) ? implicit(node.content) : 0);
  const prefer = ([leftPrecedence, left], [rightPrecedence, right]) => {
    if (leftPrecedence !== rightPrecedence) return leftPrecedence > rightPrecedence;
    const [a, b] = [implicit(nodes.get(left)), implicit(nodes.get(right))];
    if (a !== b) return a > b;
    return (order.get(left) ?? Infinity) < (order.get(right) ?? Infinity);
  };

  const statuses = new Map();
  // The statuses of `a` towards `b` and of `b` towards `a`.
  const compute = (a, b) => {
    const tokens = [a, b];
    const machines = tokens.map(nfaOf);
    const close = (pairs) => {
      const seen = new Set(pairs.map(([side, at]) => `${side}:${at}`));
      const stack = [...pairs];
      while (stack.length > 0) {
        const [side, at] = stack.pop();
        for (const to of machines[side].states[at].moves) {
          const id = `${side}:${to}`;
          if (seen.has(id)) continue;
          seen.add(id);
          stack.push([side, to]);
        }
      }
      return [...seen].map((id) => id.split(':').map(Number)).sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    };
    const result = [0, 0];
    const visited = new Set();
    const queue = [close([[0, machines[0].start], [1, machines[1].start]])];
    while (queue.length > 0) {
      const set = queue.pop();
      const sides = new Set(set.map(([side]) => side));
      if (sides.size === 1) {
        result[[...sides][0]] |= MATCHES_DIFFERENT_STRING;
        continue;
      }
      let completion = null;
      for (const side of [0, 1]) {
        const accepts = set.filter(([s, at]) => s === side && machines[side].states[at].accept !== null).map(([, at]) => machines[side].states[at].accept);
        if (accepts.length === 0) continue;
        const precedence = Math.max(...accepts);
        if (completion === null) {
          completion = [side, precedence];
          continue;
        }
        const preferred = prefer([completion[1], tokens[completion[0]]], [precedence, tokens[side]]) ? completion[0] : side;
        if (preferred === side) completion = [side, precedence];
        result[preferred] |= MATCHES_SAME_STRING;
      }
      // The successors by character, grouped by the states they reach.
      const successors = new Map();
      alphabet.forEach((_, c) => {
        const targets = [];
        let precedence = -Infinity;
        for (const [side, at] of set) {
          for (const { set: chars, to, precedence: own } of machines[side].states[at].edges) {
            if (!chars.has(c)) continue;
            targets.push([side, to]);
            precedence = Math.max(precedence, own);
          }
        }
        if (targets.length === 0) return;
        const next = close(targets);
        const id = next.map((pair) => pair.join(':')).join(' ');
        if (!successors.has(id)) successors.set(id, { next, precedence, chars: [] });
        successors.get(id).chars.push(c);
      });
      for (const [id, { next, precedence, chars }] of successors) {
        if (completion !== null) {
          const [completed, completedPrecedence] = completion;
          const advanced = next.some(([side]) => side !== completed);
          const continues = next.some(([side]) => side === completed);
          if (advanced && !continues) {
            const other = 1 - completed;
            if (precedence >= completedPrecedence) {
              result[other] |= DOES_MATCH_CONTINUATION;
              const valid = following(tokens[completed]);
              if (chars.some((c) => valid.has(alphabet[c]))) result[other] |= DOES_MATCH_VALID_CONTINUATION;
            } else result[completed] |= MATCHES_PREFIX;
          }
        }
        if (!visited.has(id)) {
          visited.add(id);
          queue.push(next);
        }
      }
    }
    return result;
  };
  /** The conflict status of the token `a` towards the token `b`. */
  return (a, b) => {
    const pair = `${a}\u0000${b}`;
    if (!statuses.has(pair)) {
      const [ab, ba] = compute(a, b);
      statuses.set(pair, ab);
      statuses.set(`${b}\u0000${a}`, ba);
    }
    return statuses.get(pair);
  };
}

/** The characters a token's NFA can begin with, as alphabet samples. */
export function firstCharacters(rules, node) {
  const chars = new Set();
  const first = (node, seen) => {
    switch (node.type) {
      case 'STRING': if (node.value !== '') chars.add(node.value[0]); return node.value === '';
      case 'PATTERN': return firstOfTree(parseTreeSitterPattern(node.value, node.flags ?? ''), chars);
      case 'BLANK': return true;
      case 'SYMBOL': return rules[node.name] && !seen.has(node.name) ? first(rules[node.name], new Set([...seen, node.name])) : false;
      case 'SEQ': return node.members.every((member) => first(member, seen));
      case 'CHOICE': return node.members.map((member) => first(member, seen)).some(Boolean);
      case 'REPEAT': first(node.content, seen); return true;
      default: return WRAPPERS.has(node.type) || node.type === 'REPEAT1' ? first(node.content, seen) : true;
    }
  };
  first(node, new Set());
  return chars;
}

// Adds the characters below 256 and samples above a pattern tree begins with
// to `chars`; true where it matches the empty text.
function firstOfTree(tree, chars) {
  switch (tree.kind) {
    case 'char': chars.add(tree.value); return false;
    case 'class': {
      for (let code = 0; code < 256; code += 1) {
        const c = String.fromCharCode(code);
        if (tree.items.some((item) => holds(item, c)) !== tree.negated) chars.add(c);
      }
      for (const item of tree.items) { const c = sampleAbove(item); if (c !== null && !tree.negated) chars.add(c); }
      return false;
    }
    case 'seq': return tree.items.every((item) => firstOfTree(item, chars));
    case 'alt': return tree.items.map((item) => firstOfTree(item, chars)).some(Boolean);
    case 'repeat': return firstOfTree(tree.item, chars) || tree.min === 0;
    default: return true;
  }
}
