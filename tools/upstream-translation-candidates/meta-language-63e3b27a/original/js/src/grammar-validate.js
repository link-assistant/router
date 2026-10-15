// Semantic validation of grammar IR values, mirroring
// rust/src/grammar/validate.rs check for check, message for message and in
// the same deterministic order, so both runtimes report the same diagnostics
// for the same grammar.

/** The diagnostic kinds `validateGrammar` reports, in their sort order. */
export const GRAMMAR_DIAGNOSTIC_KINDS = Object.freeze([
  'duplicate-rule',
  'undefined-non-terminal',
  'left-recursion',
  'unreachable-rule',
  'nullable-repetition',
  'unused-capture',
]);

/**
 * Runs every grammar validation check and returns the diagnostics as
 * `{ kind, severity: 'error' | 'warning', rule, message, ...details }`.
 */
export function validateGrammar(grammar) {
  const rules = [...grammar.rules.values()];
  const definedNames = rules.map(({ name }) => name);
  const nullability = computeNullability(rules);
  const diagnostics = [
    ...checkUndefinedNonterminals(rules, definedNames),
    ...checkLeftRecursion(rules, nullability),
    ...checkUnreachableRules(grammar, rules),
    ...checkNullableRepetition(rules, nullability),
    ...checkUnusedCaptures(rules),
  ];
  return sortDiagnostics(rules, diagnostics);
}

/**
 * Renders an expression the way the Rust `Display` of `GrammarExpr` does, for
 * the diagnostic messages both runtimes share.
 */
export function displayGrammarExpression(expression) {
  const inner = displayGrammarExpression;
  switch (expression.kind) {
    case 'empty': return 'empty';
    case 'literal': return debugString(expression.value);
    case 'literalInsensitive': return `i${debugString(expression.value)}`;
    case 'charRange': return `${debugChar(expression.start)}..=${debugChar(expression.end)}`;
    case 'charClass':
      return `[${expression.negated ? '^' : ''}${expression.items.map((item) => (item.kind === 'range'
        ? `${escapeDefault(item.start)}-${escapeDefault(item.end)}`
        : escapeDefault(item.value))).join('')}]`;
    case 'any': return '.';
    case 'ref': return expression.name;
    case 'choice': return expression.items.map(inner).join(expression.ordered ? ' / ' : ' | ');
    case 'seq': return expression.items.map(inner).join(' ');
    case 'optional': return `(${inner(expression.item)})?`;
    case 'repeat0': return `(${inner(expression.item)})*`;
    case 'repeat1': return `(${inner(expression.item)})+`;
    case 'repeat': return `(${inner(expression.item)}){${expression.min},${expression.max ?? ''}}`;
    case 'and': return `&(${inner(expression.item)})`;
    case 'not': return `!(${inner(expression.item)})`;
    case 'capture':
      return expression.label === null
        ? `capture(${inner(expression.item)})`
        : `${expression.label}:(${inner(expression.item)})`;
    default: throw new TypeError(`unknown grammar expression kind ${expression.kind}`);
  }
}

function checkUndefinedNonterminals(rules, definedNames) {
  const defined = new Set(definedNames);
  const diagnostics = [];
  for (const rule of rules) {
    for (const name of collectNonterminals(rule.expression)) {
      if (defined.has(name)) continue;
      const suggestion = nearestRuleName(name, definedNames);
      const message = suggestion === null
        ? `rule \`${rule.name}\` references undefined non-terminal \`${name}\`; define it or fix the spelling.`
        : `rule \`${rule.name}\` references undefined non-terminal \`${name}\`; did you mean \`${suggestion}\`? Define it or fix the spelling.`;
      diagnostics.push({ kind: 'undefined-non-terminal', severity: 'error', rule: rule.name, message, name, referencedIn: rule.name });
    }
  }
  return diagnostics;
}

function checkLeftRecursion(rules, nullability) {
  const graph = leftReferenceGraph(rules, nullability);
  const diagnostics = [];
  const seenCycles = new Set();
  const visit = (target, current, seenRules, path) => {
    for (const next of graph.get(current) ?? []) {
      if (next === target) {
        const cycle = [...path, target];
        const key = canonicalCycleKey(cycle);
        if (seenCycles.has(key)) continue;
        seenCycles.add(key);
        diagnostics.push({
          kind: 'left-recursion',
          severity: 'error',
          rule: target,
          message: `rule \`${target}\` is left-recursive (\`${cycle.join(' -> ')}\`); a recursive-descent/PEG parser may not terminate. Rewrite using repetition or factor the common prefix.`,
          cycle,
        });
      } else if (graph.has(next) && !seenRules.has(next)) {
        seenRules.add(next);
        path.push(next);
        visit(target, next, seenRules, path);
        path.pop();
        seenRules.delete(next);
      }
    }
  };
  for (const rule of rules) visit(rule.name, rule.name, new Set([rule.name]), [rule.name]);
  return diagnostics;
}

function checkUnreachableRules(grammar, rules) {
  const start = grammar.startRule();
  if (!start) return [];
  const defined = new Set(rules.map(({ name }) => name));
  const reachable = new Set();
  const stack = [start.name];
  while (stack.length > 0) {
    const name = stack.pop();
    if (reachable.has(name)) continue;
    reachable.add(name);
    const rule = grammar.rule(name);
    if (!rule) continue;
    for (const reference of collectNonterminals(rule.expression)) {
      if (defined.has(reference)) stack.push(reference);
    }
  }
  return rules.filter(({ name }) => !reachable.has(name)).map(({ name }) => ({
    kind: 'unreachable-rule',
    severity: 'warning',
    rule: name,
    message: `rule \`${name}\` is not reachable from start rule \`${start.name}\`; remove it or reference it from a reachable rule.`,
    name,
  }));
}

function checkNullableRepetition(rules, nullability) {
  const suspicious = computeSuspiciousNullability(rules, nullability);
  const diagnostics = [];
  for (const rule of rules) {
    if (suspicious.get(rule.name)) {
      diagnostics.push({
        kind: 'nullable-repetition',
        severity: 'warning',
        rule: rule.name,
        message: `rule \`${rule.name}\` can match empty; add a required terminal/non-terminal or document the rule as intentional.`,
        detail: 'rule body is nullable',
      });
    }
    collectNullableRepetitions(rule.name, rule.expression, nullability, diagnostics);
  }
  return diagnostics;
}

const REPETITIONS = { repeat0: 'zero-or-more repetition', repeat1: 'one-or-more repetition', repeat: 'counted repetition' };

function collectNullableRepetitions(ruleName, expression, nullability, diagnostics) {
  const repetition = REPETITIONS[expression.kind];
  if (repetition && isNullable(expression.item, nullability)) {
    const detail = `${repetition} has nullable inner expression \`${displayGrammarExpression(expression.item)}\``;
    diagnostics.push({
      kind: 'nullable-repetition',
      severity: 'warning',
      rule: ruleName,
      message: `rule \`${ruleName}\` uses a ${detail}; make the repeated expression consume input or move the optional part outside the repetition.`,
      detail,
    });
  }
  for (const child of children(expression)) collectNullableRepetitions(ruleName, child, nullability, diagnostics);
}

function checkUnusedCaptures(rules) {
  const diagnostics = [];
  const visit = (ruleName, expression) => {
    if (expression.kind === 'capture' && expression.label !== null) {
      diagnostics.push({
        kind: 'unused-capture',
        severity: 'warning',
        rule: ruleName,
        message: `capture label \`${expression.label}\` in rule \`${ruleName}\` is not used by grammar semantics; remove the label or wire it to a consumer.`,
        label: expression.label,
      });
    }
    for (const child of children(expression)) visit(ruleName, child);
  };
  for (const rule of rules) visit(rule.name, rule.expression);
  return diagnostics;
}

function leftReferenceGraph(rules, nullability) {
  const defined = new Set(rules.map(({ name }) => name));
  const graph = new Map();
  for (const rule of rules) {
    const references = new Set();
    collectLeftReferences(rule.expression, nullability, references);
    const targets = graph.get(rule.name) ?? new Set();
    for (const name of references) if (defined.has(name)) targets.add(name);
    graph.set(rule.name, targets);
  }
  // The Rust graph keeps its targets in a sorted set.
  return new Map([...graph].map(([name, targets]) => [name, [...targets].sort(compareText)]));
}

function collectLeftReferences(expression, nullability, references) {
  switch (expression.kind) {
    case 'ref': references.add(expression.name); return;
    case 'choice':
      for (const item of expression.items) collectLeftReferences(item, nullability, references);
      return;
    case 'seq':
      for (const item of expression.items) {
        collectLeftReferences(item, nullability, references);
        if (!isNullable(item, nullability)) break;
      }
      return;
    default:
      if (expression.item) collectLeftReferences(expression.item, nullability, references);
  }
}

function computeNullability(rules) {
  const nullability = new Map(rules.map(({ name }) => [name, false]));
  for (let changed = true; changed;) {
    changed = false;
    for (const rule of rules) {
      if (isNullable(rule.expression, nullability) && !nullability.get(rule.name)) {
        nullability.set(rule.name, true);
        changed = true;
      }
    }
  }
  return nullability;
}

function isNullable(expression, nullability) {
  switch (expression.kind) {
    case 'literal': case 'literalInsensitive': return expression.value.length === 0;
    case 'charRange': case 'charClass': case 'any': return false;
    case 'ref': return nullability.get(expression.name) ?? false;
    case 'choice': return expression.items.some((item) => isNullable(item, nullability));
    case 'seq': return expression.items.every((item) => isNullable(item, nullability));
    case 'empty': case 'optional': case 'repeat0': case 'and': case 'not': return true;
    case 'repeat1': case 'capture': return isNullable(expression.item, nullability);
    case 'repeat': return expression.min === 0 || isNullable(expression.item, nullability);
    default: throw new TypeError(`unknown grammar expression kind ${expression.kind}`);
  }
}

function computeSuspiciousNullability(rules, nullability) {
  const suspicious = new Map(rules.map(({ name }) => [name, false]));
  for (let changed = true; changed;) {
    changed = false;
    for (const rule of rules) {
      if (isSuspiciousNullable(rule.expression, nullability, suspicious) && !suspicious.get(rule.name)) {
        suspicious.set(rule.name, true);
        changed = true;
      }
    }
  }
  return suspicious;
}

function isSuspiciousNullable(expression, nullability, suspicious) {
  switch (expression.kind) {
    case 'literal': case 'literalInsensitive': return expression.value.length === 0;
    case 'charRange': case 'charClass': case 'any': return false;
    case 'ref': return suspicious.get(expression.name) ?? false;
    case 'choice': return expression.items.some((item) => isSuspiciousNullable(item, nullability, suspicious));
    case 'seq':
      return expression.items.length === 0
        || (expression.items.every((item) => isNullable(item, nullability))
          && expression.items.some((item) => isSuspiciousNullable(item, nullability, suspicious)));
    case 'empty': case 'optional': case 'and': case 'not': return true;
    case 'repeat0': case 'repeat1': case 'repeat': return isNullable(expression.item, nullability);
    case 'capture': return isSuspiciousNullable(expression.item, nullability, suspicious);
    default: throw new TypeError(`unknown grammar expression kind ${expression.kind}`);
  }
}

function children(expression) {
  if (expression.kind === 'choice' || expression.kind === 'seq') return expression.items;
  return expression.item ? [expression.item] : [];
}

function collectNonterminals(expression) {
  const names = new Set();
  const visit = (node) => {
    if (node.kind === 'ref') names.add(node.name);
    for (const child of children(node)) visit(child);
  };
  visit(expression);
  return [...names].sort(compareText);
}

function nearestRuleName(name, candidates) {
  let best = null;
  for (const candidate of candidates) {
    const distance = levenshtein(name, candidate);
    if (distance > 2) continue;
    if (best === null || distance < best.distance || (distance === best.distance && compareText(candidate, best.name) < 0)) {
      best = { name: candidate, distance };
    }
  }
  return best?.name ?? null;
}

function levenshtein(left, right) {
  const leftChars = [...left];
  const rightChars = [...right];
  let previous = rightChars.map((_, index) => index).concat(rightChars.length);
  for (const [leftIndex, leftChar] of leftChars.entries()) {
    const current = [leftIndex + 1];
    for (const [rightIndex, rightChar] of rightChars.entries()) {
      current.push(Math.min(
        previous[rightIndex + 1] + 1,
        current[rightIndex] + 1,
        previous[rightIndex] + (leftChar === rightChar ? 0 : 1),
      ));
    }
    previous = current;
  }
  return previous[rightChars.length];
}

function canonicalCycleKey(cycle) {
  const nodes = cycle.slice(0, -1);
  let best = null;
  for (let start = 0; start < nodes.length; start += 1) {
    const rotation = nodes.map((_, offset) => nodes[(start + offset) % nodes.length]).join('\u0000');
    if (best === null || compareText(rotation, best) < 0) best = rotation;
  }
  return best ?? '';
}

const SEVERITY_RANK = { error: 0, warning: 1 };

function sortDiagnostics(rules, diagnostics) {
  const indices = new Map();
  for (const [index, { name }] of rules.entries()) if (!indices.has(name)) indices.set(name, index);
  const indexOf = (name) => indices.get(name) ?? Number.MAX_SAFE_INTEGER;
  return diagnostics.sort((left, right) => indexOf(left.rule) - indexOf(right.rule)
    || compareText(left.rule, right.rule)
    || SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]
    || GRAMMAR_DIAGNOSTIC_KINDS.indexOf(left.kind) - GRAMMAR_DIAGNOSTIC_KINDS.indexOf(right.kind)
    || compareText(left.message, right.message));
}

// Rust orders strings by their UTF-8 bytes, which is code point order.
function compareText(left, right) {
  const leftPoints = [...left];
  const rightPoints = [...right];
  for (let index = 0; index < Math.min(leftPoints.length, rightPoints.length); index += 1) {
    const difference = leftPoints[index].codePointAt(0) - rightPoints[index].codePointAt(0);
    if (difference !== 0) return difference;
  }
  return leftPoints.length - rightPoints.length;
}

// Characters the Rust `Debug` escapes print as `\u{..}`: controls, format
// characters, separators other than the space and combining marks.
const NOT_PRINTABLE = /^[\p{Cc}\p{Cf}\p{Cs}\p{Co}\p{Cn}\p{Zl}\p{Zp}\p{Zs}\p{Grapheme_Extend}]$/u;

function escapeDebug(char, quote) {
  switch (char) {
    case '\0': return '\\0';
    case '\t': return '\\t';
    case '\r': return '\\r';
    case '\n': return '\\n';
    case '\\': return '\\\\';
    case ' ': return ' ';
    default:
      if (char === quote) return `\\${char}`;
      return NOT_PRINTABLE.test(char) ? `\\u{${char.codePointAt(0).toString(16)}}` : char;
  }
}

function debugString(value) {
  return `"${[...value].map((char) => escapeDebug(char, '"')).join('')}"`;
}

function debugChar(value) {
  return `'${escapeDebug(value, "'")}'`;
}

// `char::escape_default`: printable ASCII stays, everything else is escaped.
function escapeDefault(char) {
  switch (char) {
    case '\t': return '\\t';
    case '\r': return '\\r';
    case '\n': return '\\n';
    case '\\': case "'": case '"': return `\\${char}`;
    default: {
      const point = char.codePointAt(0);
      return point >= 0x20 && point <= 0x7e ? char : `\\u{${point.toString(16)}}`;
    }
  }
}
