// The public face of the native grammar executor: compile a grammar once,
// then parse sources into lossless concrete syntax trees. Loading
// (grammar-runtime/load.js) resolves imports, macros and parameterized rules
// and checks every scanner, action and predicate; the executor
// (grammar-runtime/executor.js) runs it within explicit resource limits; the
// tree module (grammar-runtime/syntax-tree.js) copies and renders the result.
// docs/grammar/feature-union.md is the specification the Rust port follows.
import { Executor, Expectations, KeywordLexing, MemoryBudgetReached, memoryBudget, NestingTooDeep, StepLimitReached, stepBudget } from './grammar-runtime/executor.js';
import { GrammarRuntimeError, loadProgram } from './grammar-runtime/load.js';
import { decorateGrammar, decorateSyntaxTree } from './grammar-decorators.js';
import { collectAmbiguities, firstRecovery, publicTree, renderSyntaxTree } from './grammar-runtime/syntax-tree.js';
import { inputBytes, lineAndColumn } from './grammar-runtime/text.js';

export { GrammarRuntimeError, renderSyntaxTree };

/** A source the grammar rejects; `rejection` holds the reason and position. */
export class GrammarParseError extends Error {
  constructor(rejection) {
    super(describeRejection(rejection));
    this.name = 'GrammarParseError';
    this.rejection = rejection;
    this.reason = rejection.reason;
    this.offset = rejection.offset ?? null;
    this.line = rejection.line ?? null;
    this.column = rejection.column ?? null;
    this.expected = rejection.expected ?? [];
  }
}

function describeRejection(rejection) {
  const where = rejection.line ? ` at line ${rejection.line} column ${rejection.column}` : '';
  switch (rejection.reason) {
    case 'syntax': return `syntax error${where}: expected ${rejection.expected.join(', ') || 'nothing more'}`;
    case 'nestingDepth': return `the input nests deeper than ${rejection.limit} rules`;
    case 'stepLimit': return `the parse needed more than ${rejection.limit} steps`;
    case 'memoryBudget': return `the parse needed more than ${rejection.limit} memo cells`;
    case 'recovered': return `the input needed error recovery${where}`;
    case 'ambiguity': return `the input is ambiguous${where}`;
    default: return `the input is rejected (${rejection.reason})`;
  }
}

function positioned(reason, bytes, offset, extra = {}) {
  return { reason, offset, ...lineAndColumn(bytes, offset), ...extra };
}

/**
 * Parses the whole input with a fresh executor that `prepare` sets up. While
 * a scanner's `expected` was answered before the parse made the request it
 * asks about, the parse runs again with the requests so far (see
 * `Expectations` in grammar-runtime/executor.js). Each run has its own step
 * budget; all runs share the parse's `memory` budget.
 */
function runParse(program, bytes, startRule, options, maxDepth, expectations, memory, prepare) {
  for (;;) {
    const executor = new Executor(program, bytes, 0, bytes.length, options, stepBudget(options, bytes.length, memory), maxDepth);
    executor.expectations = expectations.restart();
    prepare(executor);
    const outcome = executor.run(startRule);
    if (!expectations.stale) return outcome;
  }
}

/**
 * Automatic error recovery after a failed parse: each round reparses with
 * one more repair point, the farthest offset where an element failed without
 * a repair, until a parse completes. After `maxRepairs` rounds (default 32),
 * or when no new point appears, the last round's partial tree stands, the
 * rest of the input an ERROR leaf. Each round has its own step budget; a
 * round that runs out of steps ends the rounds as well.
 */
function repairParse(program, bytes, startRule, options, maxDepth, failed, keywords, expectations, memory) {
  const points = new Set();
  const maxRepairs = options.maxRepairs ?? 32;
  let outcome = failed;
  while (points.size < maxRepairs) {
    const point = outcome.elementFarthest >= 0 ? outcome.elementFarthest : outcome.farthest;
    if (points.has(point)) break;
    points.add(point);
    try {
      outcome = runParse(program, bytes, startRule, options, maxDepth, expectations, memory, (executor) => {
        executor.repairPoints = points;
        executor.keywords = keywords;
      });
    } catch (error) {
      if (!(error instanceof StepLimitReached)) throw error;
      break;
    }
    if (outcome.ok) return outcome;
  }
  return { ok: true, root: outcome.partial };
}

/**
 * Parses `source` (a string or UTF-8 bytes) with a loaded program. Returns
 * `{ ok, tree, ambiguities, rejection }`: `ok` is true only without a
 * rejection; the tree is kept whenever one was built.
 */
function parseProgram(program, source, options) {
  const bytes = inputBytes(source);
  const startRule = options.startRule ?? program.start;
  if (!program.rules.has(startRule)) throw new GrammarRuntimeError(`undefined start rule ${startRule}`, 'reference');
  const memory = memoryBudget(options);
  const budget = stepBudget(options, bytes.length, memory);
  const maxDepth = options.maxDepth ?? 1000;
  let outcome;
  // Under `(matching longest)` the input is parsed again while the tree takes
  // a token rule's leaf where a keyword a lexer prefers matched.
  const keywords = program.tokenRanks && program.settling?.tokens !== false ? new KeywordLexing({ ...program.tokenRanks, bytes }, program) : null;
  const expectations = new Expectations();
  try {
    do {
      outcome = runParse(program, bytes, startRule, options, maxDepth, expectations, memory, (executor) => {
        executor.keywords = keywords;
        // With no repair point yet, recovery only notes where elements fail.
        if (options.errorRecovery) executor.repairPoints = new Set();
      });
      if (!outcome.ok && options.errorRecovery) outcome = repairParse(program, bytes, startRule, options, maxDepth, outcome, keywords, expectations, memory);
    } while (keywords && outcome.ok && keywords.conflicts(outcome.root));
  } catch (error) {
    if (error instanceof StepLimitReached) {
      return { ok: false, tree: null, ambiguities: [], rejection: { reason: 'stepLimit', limit: budget.limit } };
    }
    if (error instanceof MemoryBudgetReached) {
      return { ok: false, tree: null, ambiguities: [], rejection: { reason: 'memoryBudget', limit: memory.limit } };
    }
    if (error instanceof NestingTooDeep || (error instanceof RangeError && /call stack/u.test(error.message))) {
      const tree = publicTree({ type: 'error', start: 0, end: bytes.length, reason: 'nestingDepth' }, bytes);
      return { ok: false, tree, ambiguities: [], rejection: { reason: 'nestingDepth', limit: maxDepth } };
    }
    throw error;
  }
  if (!outcome.ok) {
    return { ok: false, tree: null, ambiguities: [], rejection: positioned('syntax', bytes, outcome.farthest, { expected: outcome.expected }) };
  }
  const tree = decorateSyntaxTree(publicTree(outcome.root, bytes), options.decorators);
  const ambiguities = collectAmbiguities(outcome.root, program);
  let rejection = null;
  const recovery = firstRecovery(tree);
  if (recovery && options.recovery !== 'accept') rejection = positioned('recovered', bytes, recovery.start);
  else if (ambiguities.length > 0 && options.ambiguity === 'reject') rejection = positioned('ambiguity', bytes, ambiguities[0].start);
  return { ok: rejection === null, tree, ambiguities, rejection };
}

/**
 * Compiles `grammar` (a Grammar or its normalized document) for the native
 * executor. `options.resolveGrammar(name)` returns the grammar an import or
 * an embedded language names; `maxDepth`, `stepLimit`, `memoLimit` and
 * `memoryLimit` (the memo cells a parse keeps) bound a parse;
 * `ambiguity: 'reject'` turns a reported ambiguity into a rejection and
 * `recovery: 'accept'` accepts a tree with ERROR or MISSING nodes;
 * `errorRecovery: true` repairs a failed parse into such a tree (at most
 * `maxRepairs` repair points) instead of rejecting it without one.
 * Each parse may override the options and choose a `startRule`.
 * `options.decorators` (a DecoratorSet) decorates the grammar's rules at the
 * `grammar-rule` level before it is loaded and every tree at the `executor`
 * and `recovery` levels (see `decorateSyntaxTree`).
 */
export function createGrammarParser(grammar, options = {}) {
  const decorated = grammar?.rules instanceof Map ? decorateGrammar(grammar, options.decorators) : grammar;
  const program = loadProgram(decorated, options);
  const parseTree = (source, parseOptions = {}) => parseProgram(program, source, { ...options, ...parseOptions });
  return {
    parseTree,
    parse(source, parseOptions = {}) {
      const outcome = parseTree(source, parseOptions);
      if (!outcome.ok) throw new GrammarParseError(outcome.rejection);
      return outcome.tree;
    },
  };
}
