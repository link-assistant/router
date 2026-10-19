// Yacc/Bison productions lower to the shared links grammar and action language.
// Foreign semantic code and scanner behavior that cannot be lowered are explicit
// import failures; neither source text nor host callbacks stand in for behavior.
import { Grammar, GrammarBuilder as build } from '../grammar.js';
import { decorateGrammar } from '../grammar-decorators.js';
import { parseError, unsupportedError } from './common.js';
import { tokenizeYacc, stripYaccComments } from './yacc-lexer.js';
export { importLex } from './lex.js';

const FORMAT = 'Yacc';
const reference = (token, aliases) => token.kind === 'literal'
  ? token.quote === '"' && aliases.has(token.value) ? build.ref(aliases.get(token.value)) : build.literal(token.value)
  : build.ref(token.value);

/** Lower integer/text assignments and RHS field references to native operations. */
export function lowerYaccAction(source, count) {
  const text = stripYaccComments(String(source)).trim();
  if (text === '') return [];
  if (text === 'YYERROR;' || text === 'YYERROR') return [{ operation: 'fail' }];
  const assignment = /^\$\$\s*=\s*([^]*?);?\s*$/u.exec(text);
  if (!assignment) throw unsupportedError(FORMAT, 'semantic action: expected a native-lowerable $$ assignment or YYERROR');
  const expression = assignment[1].replace(/;\s*$/u, '');
  const tokens = expression.match(/\$[0-9]+|[0-9]+|"(?:[^"\\]|\\.)*"|[()+*-]|\S/gu) ?? [];
  let cursor = 0;
  const fail = () => { throw unsupportedError(FORMAT, `semantic action value near ${JSON.stringify(tokens[cursor] ?? 'end')}`); };
  const primary = () => {
    const token = tokens[cursor++];
    if (token === '(') {
      const result = value(0);
      if (tokens[cursor++] !== ')') fail();
      return result;
    }
    if (token === '-') return { operation: 'subtract', left: { operation: 'integer', value: 0 }, right: primary() };
    if (/^[0-9]+$/u.test(token ?? '')) {
      const number = Number(token);
      if (!Number.isSafeInteger(number)) fail();
      return { operation: 'integer', value: number };
    }
    if (/^\$[0-9]+$/u.test(token ?? '')) {
      const index = Number(token.slice(1));
      if (index < 1 || index > count) fail();
      return { operation: 'attribute', field: `argument ${index}`, attribute: 'value' };
    }
    if (token?.startsWith('"')) {
      try { return { operation: 'text', value: JSON.parse(token) }; } catch { fail(); }
    }
    fail();
  };
  const value = (minimum) => {
    let left = primary();
    while (cursor < tokens.length) {
      const operator = tokens[cursor];
      const priority = operator === '*' ? 2 : operator === '+' || operator === '-' ? 1 : 0;
      if (priority <= minimum) break;
      cursor += 1;
      const right = value(priority);
      left = { operation: ({ '+': 'add', '-': 'subtract', '*': 'multiply' })[operator], left, right };
    }
    return left;
  };
  const result = value(0);
  if (cursor !== tokens.length) fail();
  return [{ operation: 'setAttribute', attribute: 'value', value: result }];
}

/**
 * Import a source grammar. `tokenRules` and `extras` are shared native rule
 * objects, not functions. An undeclared scanner token remains a visible
 * undefined reference, so compiling cannot pretend it has a lexer.
 */
export function importYacc(source, options = {}) {
  if (options.dialect === 'menhir') throw unsupportedError(FORMAT, 'Menhir parameterized productions and OCaml actions need their native translator');
  const tokens = tokenizeYacc(String(source));
  let cursor = 0;
  const take = () => tokens[cursor++];
  const peek = () => tokens[cursor];
  const skipLines = () => { while (peek()?.kind === 'newline') cursor += 1; };
  const expected = (kind) => {
    const token = take();
    if (token?.kind !== kind) throw parseError(FORMAT, `expected ${kind} at offset ${token?.offset ?? source.length}`);
    return token;
  };
  const precedence = new Map();
  const tokenRules = new Map((options.tokenRules ?? []).map((rule) => [rule.name, { ...rule }]));
  const declaredTokens = new Set(tokenRules.keys());
  const aliases = new Map();
  let start = options.start ?? null;
  let level = 0;
  while (peek() && peek().kind !== 'section') {
    skipLines();
    if (peek()?.kind === 'section') break;
    const token = take();
    if (!token) break;
    if (token.kind === 'prologue') {
      if (token.value.replace(/\/\*[^]*?\*\//gu, '').trim()) throw unsupportedError(FORMAT, `C prologue at offset ${token.offset}`);
      continue;
    }
    if (token.kind !== 'directive') throw parseError(FORMAT, `expected declaration at offset ${token.offset}`);
    const members = [];
    while (peek() && !['newline', 'directive', 'section'].includes(peek().kind)) members.push(take());
    if (token.value === '%start') {
      if (members.length !== 1 || members[0].kind !== 'identifier') throw parseError(FORMAT, '%start names exactly one rule');
      start = members[0].value;
    } else if (token.value === '%token') {
      let name = null;
      for (const member of members) {
        if (member.kind === 'type') throw unsupportedError(FORMAT, 'typed token values');
        if (member.kind === 'identifier') { name = member.value; declaredTokens.add(name); }
        else if (member.kind === 'number') {
          if (!name) throw parseError(FORMAT, 'a token code follows a token name');
        } else if (member.kind === 'literal') {
          if (!name) throw parseError(FORMAT, 'a token alias follows a token name');
          if (member.quote !== '"') throw unsupportedError(FORMAT, 'single-quoted token declarations');
          if (aliases.has(member.value) && aliases.get(member.value) !== name) throw parseError(FORMAT, `token alias ${member.value} names two tokens`);
          aliases.set(member.value, name);
        } else throw parseError(FORMAT, `unexpected token declaration ${member.value}`);
      }
    } else if (token.value === '%left' || token.value === '%right' || token.value === '%precedence') {
      level += 1;
      const associativity = token.value === '%left' ? 'left' : token.value === '%right' ? 'right' : 'none';
      for (const member of members) {
        if (!['identifier', 'literal'].includes(member.kind)) throw parseError(FORMAT, 'precedence names tokens');
        precedence.set(aliases.get(member.value) ?? member.value, { level, associativity });
        declaredTokens.add(member.value);
      }
    } else {
      throw unsupportedError(FORMAT, `declaration ${token.value} at offset ${token.offset}`);
    }
  }
  expected('section');
  const rules = [];
  const names = new Set();
  while (peek() && peek().kind !== 'section') {
    skipLines();
    if (!peek() || peek().kind === 'section') break;
    const name = expected('identifier').value;
    if (names.has(name)) throw parseError(FORMAT, `duplicate rule ${name}`);
    names.add(name);
    skipLines();
    expected(':');
    const alternatives = [];
    let finished = false;
    while (!finished) {
      const symbols = [];
      let action = null;
      let override = null;
      let empty = false;
      while (peek() && !['|', ';', 'section'].includes(peek().kind)) {
        if (peek().kind === 'newline') { take(); continue; }
        if (peek().kind === 'identifier' && tokens[cursor + 1]?.kind === ':') { finished = true; break; }
        const item = take();
        if (item.kind === 'identifier' || item.kind === 'literal') {
          if (empty) throw parseError(FORMAT, '%empty is the entire production');
          if (action !== null) throw unsupportedError(FORMAT, `midrule semantic action at offset ${item.offset}`);
          symbols.push(item);
        } else if (item.kind === 'action') {
          if (action !== null) throw unsupportedError(FORMAT, 'multiple semantic actions in one production');
          action = item.value;
        } else if (item.kind === 'directive' && item.value === '%empty') {
          if (symbols.length !== 0) throw parseError(FORMAT, '%empty cannot follow symbols');
          empty = true;
        } else if (item.kind === 'directive' && item.value === '%prec') {
          const symbol = take();
          if (!symbol || !['identifier', 'literal'].includes(symbol.kind)) throw parseError(FORMAT, '%prec names one token');
          override = symbol.value;
        } else throw unsupportedError(FORMAT, `production construct ${item.value} at offset ${item.offset}`);
      }
      const rightmostToken = [...symbols].reverse().find((symbol) => symbol.kind === 'literal' || declaredTokens.has(symbol.value));
      const terminal = override ?? rightmostToken?.value;
      const rank = precedence.get(aliases.get(terminal) ?? terminal);
      if (override !== null && !rank) throw parseError(FORMAT, `%prec token ${override} has no precedence declaration`);
      let expression = build.seq(...symbols.map((symbol, index) => build.capture(`argument ${index + 1}`, reference(symbol, aliases))));
      if (rank) expression = { kind: 'precedence', ...rank, item: expression };
      alternatives.push({ expression, action: action === null ? null : lowerYaccAction(action, symbols.length) });
      if (peek()?.kind === '|') take();
      else { if (peek()?.kind === ';') take(); finished = true; }
    }
    if (alternatives.some((alternative) => alternative.action !== null)) {
      const references = alternatives.map((alternative, index) => {
        const helper = `${name} alternative ${index + 1}`;
        if (names.has(helper) || tokenRules.has(helper)) throw parseError(FORMAT, `generated rule collides with ${helper}`);
        rules.push([helper, { name: helper, kind: 'normal', expression: alternative.expression, action: alternative.action ?? [] }]);
        return { kind: 'alias', name, item: build.ref(helper) };
      });
      rules.push([name, { name, kind: 'silent', expression: build.choice(...references) }]);
    } else rules.push([name, { name, kind: 'normal', expression: build.choice(...alternatives.map(({ expression }) => expression)) }]);
    start ??= name;
  }
  if (peek()?.kind === 'section') {
    take();
    skipLines();
    if (peek()) throw unsupportedError(FORMAT, `C epilogue at offset ${peek().offset}`);
  }
  if (!start || !names.has(start)) throw parseError(FORMAT, 'the start rule must be a defined production');
  for (const rule of tokenRules.values()) {
    if (names.has(rule.name)) throw parseError(FORMAT, `token ${rule.name} is also a production`);
    rules.push([rule.name, rule]);
  }
  for (const [, rule] of rules) rule.sourceNames ??= [{ source: FORMAT, name: rule.name }];
  for (const [alias, name] of aliases) {
    const tokenRule = rules.find(([ruleName]) => ruleName === name)?.[1];
    if (tokenRule) tokenRule.sourceNames = [...tokenRule.sourceNames, { source: 'Yacc token alias', name: alias }];
  }
  const grammar = new Grammar(start, rules, 'meta-language', {
    matching: 'longest', settling: ['tokens', 'precedence', 'dynamic', 'first'], extras: options.extras ?? [], modes: options.modes ?? [],
  });
  return decorateGrammar(grammar, options.decorators, 'importer');
}
