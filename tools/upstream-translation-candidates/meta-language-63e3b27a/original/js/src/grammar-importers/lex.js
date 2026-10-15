// A native import of declarative Lex/Flex token rules. Mode changes, skipped
// trivia and numeric/text token values are operations shared by both executors.
import { Grammar, GrammarBuilder as build } from '../grammar.js';
import { decorateGrammar } from '../grammar-decorators.js';
import { parseError, unsupportedError } from './common.js';
import { tokenizeYacc, stripYaccComments } from './yacc-lexer.js';
import { parseTreeSitterPattern, renderTreeSitterPattern } from './tree-sitter-native.js';
import { parseGrammarLinks } from '../grammar-links.js';

const FORMAT = 'Lex';

function actionBody(text) {
  if (!text.startsWith('{')) return text.trim();
  const [action, ...rest] = tokenizeYacc(text);
  if (action?.kind !== 'action' || rest.some(({ kind }) => kind !== 'newline')) throw parseError(FORMAT, 'expected one balanced action block');
  return action.value.trim();
}

function lexicalAction(text, options) {
  const statements = stripYaccComments(text).split(';').map((part) => part.trim()).filter(Boolean);
  const operations = [];
  let token = null;
  for (const statement of statements) {
    if (token !== null) throw unsupportedError(FORMAT, 'scanner statements after a token return');
    const mode = /^BEGIN\s*\(\s*([A-Za-z_][A-Za-z0-9_]*)\s*\)$/u.exec(statement);
    if (mode) { operations.push({ operation: 'setMode', mode: mode[1] === 'INITIAL' ? 'default' : mode[1] }); continue; }
    const returned = /^return\s+([A-Za-z_][A-Za-z0-9_]*|[0-9]+|'(?:[^'\\]|\\.)*')$/u.exec(statement);
    if (returned) {
      if (token !== null) throw unsupportedError(FORMAT, 'multiple token returns in one action');
      if (returned[1].startsWith("'")) token = tokenizeYacc(returned[1])[0].value;
      else if (/^[0-9]+$/u.test(returned[1])) {
        token = options.tokenNamesByCode?.[returned[1]];
        if (!token) throw unsupportedError(FORMAT, `numeric token ${returned[1]} has no shared token-name mapping`);
      } else token = returned[1];
      continue;
    }
    if (/^yylval\s*=\s*atoi\s*\(\s*yytext\s*\)$/u.test(statement)) {
      operations.push({ operation: 'setAttribute', attribute: 'value', value: { operation: 'number', value: { operation: 'matched' } } });
      continue;
    }
    if (/^yylval\s*=\s*yytext$/u.test(statement)) {
      operations.push({ operation: 'setAttribute', attribute: 'value', value: { operation: 'matched' } });
      continue;
    }
    throw unsupportedError(FORMAT, `scanner action ${JSON.stringify(statement)}`);
  }
  return { token, operations };
}

function nativePattern(pattern, definitions, stack = []) {
  let result = '';
  for (let offset = 0; offset < pattern.length;) {
    if (pattern[offset] === '\\') { result += pattern.slice(offset, offset + 2); offset += 2; continue; }
    if (pattern[offset] === '"') {
      let end = offset + 1;
      while (end < pattern.length) {
        if (pattern[end] === '\\') end += 2;
        else if (pattern[end++] === '"') break;
      }
      const tokens = tokenizeYacc(pattern.slice(offset, end));
      if (tokens.length !== 1 || tokens[0].kind !== 'literal') throw parseError(FORMAT, 'unterminated quoted pattern');
      result += tokens[0].value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&');
      offset = end;
      continue;
    }
    if (pattern[offset] === '[') {
      let end = offset + 1;
      while (end < pattern.length) {
        if (pattern[end] === '\\') end += 2;
        else if (pattern[end++] === ']') break;
      }
      const characterClass = pattern.slice(offset, end);
      if (!characterClass.endsWith(']')) throw parseError(FORMAT, 'unterminated character class');
      if (characterClass.includes('[:')) throw unsupportedError(FORMAT, 'POSIX named character classes');
      result += characterClass;
      offset = end;
      continue;
    }
    const macro = /^\{([A-Za-z_][A-Za-z0-9_]*)\}/u.exec(pattern.slice(offset));
    if (macro) {
      const name = macro[1];
      if (!definitions.has(name)) throw parseError(FORMAT, `undefined lexical definition ${name}`);
      if (stack.includes(name)) throw parseError(FORMAT, `recursive lexical definition ${[...stack, name].join(' -> ')}`);
      result += `(${nativePattern(definitions.get(name), definitions, [...stack, name])})`;
      offset += macro[0].length;
      continue;
    }
    if (pattern[offset] === '/' || pattern[offset] === '^' || pattern[offset] === '$' || pattern.startsWith('<<EOF>>', offset)) {
      throw unsupportedError(FORMAT, 'trailing context, line anchors or EOF scanner rules');
    }
    result += pattern[offset++];
  }
  return result;
}

/** Import lexer definitions and token rules without executing their C code. */
export function importLex(source, options = {}) {
  const sections = String(source).split(/^\s*%%\s*$/mu);
  if (sections.length < 2 || sections.length > 3) throw parseError(FORMAT, 'a lexer has a declaration section and a rules section');
  if (sections[2]?.trim()) throw unsupportedError(FORMAT, 'C lexer epilogue');
  const definitions = new Map();
  const modes = new Set(['default']);
  const inclusive = new Set(['default']);
  let rejectsUnmatched = false;
  for (const raw of sections[0].split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('/*') && line.endsWith('*/')) continue;
    const mode = /^%([sx])\s+(.+)$/u.exec(line);
    if (mode) {
      for (const name of mode[2].split(/\s+/u)) { modes.add(name); if (mode[1] === 's') inclusive.add(name); }
      continue;
    }
    const option = /^%option\s+(.+)$/u.exec(line);
    if (option) {
      for (const name of option[1].split(/\s+/u)) {
        if (!['noyywrap', 'nodefault', 'nounput', 'noinput', 'never-interactive'].includes(name)) throw unsupportedError(FORMAT, `lexer option ${name}`);
        if (name === 'nodefault') rejectsUnmatched = true;
      }
      continue;
    }
    const definition = /^([A-Za-z_][A-Za-z0-9_]*)\s+(.+)$/u.exec(line);
    if (!definition) throw unsupportedError(FORMAT, `lexer declaration ${JSON.stringify(line)}`);
    if (definitions.has(definition[1])) throw parseError(FORMAT, `duplicate lexical definition ${definition[1]}`);
    definitions.set(definition[1], definition[2]);
  }
  if (!rejectsUnmatched) throw unsupportedError(FORMAT, 'the default ECHO action needs its native output effect; use a source that explicitly declares %option nodefault');
  const rules = new Map();
  const extras = [];
  let index = 0;
  // Each pattern/action boundary is outside quotes and character classes.
  const lines = sections[1].split('\n');
  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    let line = lines[lineIndex].trim();
    if (!line || line.startsWith('/*') && line.endsWith('*/')) continue;
    let active = [...inclusive];
    const mode = /^<([^>]+)>/u.exec(line);
    if (mode) {
      active = mode[1] === '*' ? [...modes] : mode[1].split(',');
      if (active.some((name) => !modes.has(name))) throw parseError(FORMAT, `unknown lexer mode ${mode[1]}`);
      line = line.slice(mode[0].length);
    }
    let offset = 0;
    let quote = false;
    let characterClass = false;
    while (offset < line.length) {
      const character = line[offset];
      if (character === '\\') { offset += 2; continue; }
      if (!characterClass && character === '"') quote = !quote;
      if (!quote && character === '[') characterClass = true;
      if (!quote && character === ']') characterClass = false;
      if (!quote && !characterClass && /\s/u.test(character)) break;
      offset += 1;
    }
    const pattern = line.slice(0, offset);
    let action = line.slice(offset).trim();
    while (action.startsWith('{')) {
      try { actionBody(action); break; } catch (error) {
        if (!/unterminated action block/u.test(error.message) || lineIndex + 1 === lines.length) throw error;
        action += `\n${lines[++lineIndex]}`;
      }
    }
    if (!pattern || !action) throw parseError(FORMAT, 'each lexer rule has a pattern and an action');
    const { token, operations } = lexicalAction(actionBody(action), options);
    if (token === null && operations.some(({ operation }) => operation === 'setMode')) {
      throw unsupportedError(FORMAT, 'mode-changing skipped rules need the native lexer mode-context operation');
    }
    for (const operation of operations) {
      if (operation.operation === 'setMode' && !modes.has(operation.mode)) throw parseError(FORMAT, `unknown lexer mode ${operation.mode}`);
    }
    const name = token ?? `lexer trivia ${++index}`;
    const patternLinks = renderTreeSitterPattern(parseTreeSitterPattern(nativePattern(pattern, definitions)));
    const native = parseGrammarLinks(`(grammar (start pattern))\n(rule pattern token ${patternLinks})\n`).rule('pattern').expression;
    const expression = { kind: 'lexicalPrecedence', level: 0, item: native };
    const rule = { name, kind: 'token', expression, modes: active, action: operations, sourceNames: [{ source: FORMAT, name }] };
    if (token === null) { rule.channel = 'skip'; extras.push(build.ref(name)); }
    if (rules.has(name)) {
      throw unsupportedError(FORMAT, `token ${name} has separate lexical rules whose global order needs native lexer reconciliation`);
    }
    rules.set(name, rule);
  }
  if (rules.size === 0) throw parseError(FORMAT, 'the lexer has no rules');
  const start = 'lexer token sequence';
  rules.set(start, { name: start, kind: 'normal', expression: build.repeat0(build.choice(...[...rules.values()].filter(({ channel }) => channel !== 'skip').map(({ name }) => build.ref(name)))) });
  return decorateGrammar(new Grammar(start, rules, 'meta-language', {
    matching: 'longest', settling: ['tokens', 'precedence', 'dynamic', 'first'], modes: [...modes].filter((mode) => mode !== 'default'), extras,
  }), options.decorators, 'importer');
}
