import { DecoratorError, decoratorSet } from './decorators.js';
import { carryRuleDocs, Grammar } from './grammar.js';
import { renameGrammarRule } from './grammar-rename.js';

/**
 * The grammar the `importer` or `grammar-rule` decorators of `decorators`
 * make of `grammar`. Each rule is shown as `{ name, kind, concept }`, with
 * `format` (the grammar's source format) added at the `importer` level.
 * Setting `name` renames the rule and every reference to it, setting `kind`
 * or `concept` changes the rule, and `drop` removes it. The rules are
 * decorated in grammar order; a grammar without decorators of the level is
 * returned unchanged.
 */
export function decorateGrammar(grammar, decorators, level = 'grammar-rule') {
  const set = decoratorSet(decorators);
  if (!set.has(level)) return grammar;
  const renames = [];
  const dropped = new Set();
  const changed = new Map();
  for (const rule of grammar.rules.values()) {
    const record = { name: rule.name, kind: rule.kind, concept: rule.concept ?? '' };
    if (level === 'importer') record.format = grammar.sourceFormat ?? '';
    const decorated = set.decorate(level, record);
    if (decorated === null) {
      dropped.add(rule.name);
      continue;
    }
    if (decorated.kind !== rule.kind || decorated.concept !== (rule.concept ?? '')) {
      changed.set(rule.name, { kind: decorated.kind, concept: decorated.concept === '' ? null : decorated.concept });
    }
    if (decorated.name !== rule.name) renames.push([rule.name, decorated.name]);
  }
  let result = grammar;
  if (dropped.size > 0 || changed.size > 0) {
    const rules = [...grammar.rules.values()]
      .filter((rule) => !dropped.has(rule.name))
      .map((rule) => [rule.name, changed.has(rule.name) ? { ...rule, ...changed.get(rule.name) } : rule]);
    result = new Grammar(grammar.start, rules, grammar.sourceFormat, grammar.declarations);
    result.kinds = grammar.kinds;
    carryRuleDocs(result, grammar);
  }
  for (const [from, to] of renames) ({ grammar: result } = renameGrammarRule(result, from, to));
  return result;
}

const withoutEmpty = (target, field, value) => {
  if (value === '') delete target[field];
  else target[field] = value;
};

/**
 * The syntax tree the `executor` and `recovery` decorators of `decorators`
 * make of a public tree `tree`, which is not changed. The `executor` level
 * shows every node and token as `{ type, kind, field, text }` (`text` for
 * tokens): setting `kind` or `field` changes it, and `drop` replaces a node
 * with its children, so the tree still holds every byte; a token cannot be
 * dropped. The `recovery` level shows every ERROR node as `{ type, reason,
 * text }` and every MISSING node as `{ type, kind }`: setting `reason` or
 * `kind` changes it, and `drop` removes a MISSING node, which spans no
 * input; an ERROR node cannot be dropped.
 */
export function decorateSyntaxTree(tree, decorators) {
  const set = decoratorSet(decorators);
  if (tree === null || (!set.has('executor') && !set.has('recovery'))) return tree;
  const visit = (node) => {
    switch (node.type) {
      case 'node': case 'token': {
        const record = { type: node.type, kind: node.kind, field: node.field ?? '' };
        if (node.type === 'token') record.text = node.text ?? '';
        const decorated = set.decorate('executor', record);
        const children = node.type === 'node' ? node.children.flatMap(visit) : undefined;
        if (decorated === null) {
          if (node.type === 'token') throw new DecoratorError(`a decorator dropped the token ${node.kind}; the executor level keeps every token`);
          return children;
        }
        const copy = { ...node, kind: decorated.kind };
        withoutEmpty(copy, 'field', decorated.field);
        if (children) copy.children = children;
        return [copy];
      }
      case 'error': {
        const decorated = set.decorate('recovery', { type: 'error', reason: node.reason ?? '', text: node.text ?? '' });
        if (decorated === null) throw new DecoratorError('a decorator dropped an ERROR node; only a MISSING node can be dropped');
        const copy = { ...node };
        withoutEmpty(copy, 'reason', decorated.reason);
        return [copy];
      }
      case 'missing': {
        const decorated = set.decorate('recovery', { type: 'missing', kind: node.kind });
        return decorated === null ? [] : [{ ...node, kind: decorated.kind }];
      }
      case 'embed': {
        const [root] = visit(node.root);
        return [{ ...node, root }];
      }
      default: return [node];
    }
  };
  const roots = visit(tree);
  if (roots.length !== 1) throw new DecoratorError('a decorator dropped the root of the syntax tree');
  return roots[0];
}
