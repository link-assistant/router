// Binding-aware renaming of grammar rules: one rule and every reference to
// it, in rule bodies, actions and declarations. It mirrors the renaming in
// rust/src/grammar/merge/ and is kept apart from merging so the pipeline
// decorators can rename rules without loading the merge machinery.
import { carryRuleDocs, Grammar } from './grammar.js';
import { grammarDeclarations } from './grammar-feature-forms.js';

/** Raised when a rename is unknown, invalid or would capture another name. */
export class GrammarRenameError extends Error {
  constructor(kind, message) {
    super(message);
    this.name = 'GrammarRenameError';
    this.kind = kind;
  }
}

/**
 * Renames one rule and every reference to it, including recursive references,
 * references inside captures and references qualified with `namespace` (as
 * `namespace.rule` or `namespace::rule`). Capture labels are a separate scope
 * and are never renamed. The returned aliases map canonical names back to the
 * original source names, so the grammar can be exported with them.
 */
export function renameGrammarRule(grammar, from, to, { namespace = null, aliases = [] } = {}) {
  if (typeof to !== 'string' || !/^\S+$/u.test(to)) {
    throw new GrammarRenameError('invalid-name', `invalid rule name ${JSON.stringify(to)}`);
  }
  if (!grammar.rules.has(from)) {
    throw new GrammarRenameError('unknown-rule', `grammar has no rule ${from}`);
  }
  if (from === to) return { grammar, aliases: [...aliases] };
  const mapping = new Map([[from, to]]);
  if (namespace !== null) {
    mapping.set(`${namespace}.${from}`, `${namespace}.${to}`);
    mapping.set(`${namespace}::${from}`, `${namespace}::${to}`);
  }
  const taken = new Set([...grammar.ruleNames(), ...grammar.referencedNonterminals()]);
  for (const target of mapping.values()) {
    if (taken.has(target)) {
      throw new GrammarRenameError('collision', `renaming ${from} to ${to} would capture the existing name ${target}`);
    }
  }
  let chained = false;
  const nextAliases = aliases.map((alias) => {
    if (alias.canonical !== from) return { ...alias };
    chained = true;
    return { canonical: to, original: alias.original };
  });
  if (!chained) nextAliases.push({ canonical: to, original: from });
  return { grammar: renameAll(grammar, mapping), aliases: nextAliases };
}

/** Renames canonical rule names back to their source names for export. */
export function restoreSourceNames(grammar, aliases, { namespace = null } = {}) {
  const mapping = new Map();
  for (const { canonical, original } of aliases) {
    if (!grammar.rules.has(canonical) || canonical === original) continue;
    mapping.set(canonical, original);
    if (namespace !== null) {
      mapping.set(`${namespace}.${canonical}`, `${namespace}.${original}`);
      mapping.set(`${namespace}::${canonical}`, `${namespace}::${original}`);
    }
  }
  const rename = (name) => mapping.get(name) ?? name;
  const ruleNames = grammar.ruleNames().map(rename);
  const externals = grammar.referencedNonterminals().filter((name) => !grammar.rules.has(name)).map(rename);
  if (new Set(ruleNames).size !== ruleNames.length || externals.some((name) => ruleNames.includes(name))) {
    throw new GrammarRenameError('collision', 'restoring source names would give two bindings the same name');
  }
  return renameAll(grammar, mapping);
}

// Renames rules and every reference to them: in rule bodies, in rule actions
// and in the declarations (extras, conflict groups, macro bodies and scanner
// operations). Macro names, scanner names and tokens are separate scopes.
function renameAll(grammar, mapping) {
  const rename = (name) => mapping.get(name) ?? name;
  const rules = new Map();
  for (const rule of grammar.rules.values()) rules.set(rename(rule.name), renamedRule(rule, rename));
  return carryRuleDocs(
    new Grammar(
      grammar.start === null ? null : rename(grammar.start),
      rules,
      grammar.sourceFormat,
      mapDeclarations(grammarDeclarations(grammar), rename),
    ),
    grammar,
    rename,
  );
}

// A rule with its body and action references renamed. A parameter is used
// through its own `(parameter name)` form, never through `ref`, so renaming
// rule references never touches it.
export function renamedRule(rule, rename) {
  const renamed = { kind: rule.kind, expression: mapReferences(rule.expression, rename) };
  if (rule.parameters?.length > 0) renamed.parameters = [...rule.parameters];
  if (rule.channel !== undefined) renamed.channel = rule.channel;
  if (rule.modes !== undefined) renamed.modes = [...rule.modes];
  if (rule.action !== undefined) renamed.action = mapReferences(rule.action, rename);
  if (rule.concept !== undefined) renamed.concept = rule.concept;
  if (rule.sourceNames !== undefined) renamed.sourceNames = rule.sourceNames;
  return renamed;
}

export function mapDeclarations(declarations, rename) {
  return {
    ...(declarations.matching === null ? {} : { matching: declarations.matching }),
    ...(declarations.settling === null ? {} : { settling: [...declarations.settling] }),
    imports: [...declarations.imports],
    modes: [...declarations.modes],
    extras: declarations.extras.map((extra) => mapReferences(extra, rename)),
    conflicts: declarations.conflicts.map((group) => group.map(rename)),
    precedences: declarations.precedences.map((order) => order.map((entry) => (entry.kind === 'rule' ? { kind: 'rule', value: rename(entry.value) } : { ...entry }))),
    macros: declarations.macros.map((macro) => ({
      name: macro.name,
      parameters: [...(macro.parameters ?? [])],
      expression: mapReferences(macro.expression, rename),
    })),
    scanners: declarations.scanners.map((scanner) => ({
      name: scanner.name,
      tokens: [...scanner.tokens],
      operations: mapReferences(scanner.operations, rename),
    })),
  };
}

// Renames every rule reference (`ref`, with or without arguments) in an
// expression, a feature form or an operation list, at any depth.
export function mapReferences(value, rename) {
  if (Array.isArray(value)) return value.map((item) => mapReferences(item, rename));
  if (value === null || typeof value !== 'object') return value;
  const copy = {};
  for (const [key, field] of Object.entries(value)) copy[key] = mapReferences(field, rename);
  if (value.kind === 'ref' && value.operation === undefined && typeof value.name === 'string') {
    copy.name = rename(value.name);
  }
  return copy;
}
