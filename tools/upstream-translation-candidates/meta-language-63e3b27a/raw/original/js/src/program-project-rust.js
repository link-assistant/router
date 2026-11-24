// Project-aware Rust semantics: the Cargo manifest, the crate's module tree
// loaded from `mod name;` declarations (`name.rs` or `name/mod.rs`), use
// trees and paths resolved with item visibility, `#[macro_use]` modules, and
// `macro_rules!` invocations expanded by their matching rule, and project
// references checked by `assert!` macros: compile-time evaluated inside a
// `const` or `static` item, runtime-checked elsewhere (Rust has no proof
// terms).
import {
  ancestor,
  childrenOf,
  declaration,
  descendants,
  dirname,
  firstChild,
  joinPath,
  leafAt,
  leavesOf,
  nodeText,
  tomlEntries,
} from './program-project-tree.js';

const ITEM_KINDS = Object.freeze({
  function_item: ['function', 'identifier'],
  struct_item: ['struct', 'type_identifier'],
  enum_item: ['enum', 'type_identifier'],
  union_item: ['union', 'type_identifier'],
  trait_item: ['trait', 'type_identifier'],
  type_item: ['type', 'type_identifier'],
  const_item: ['constant', 'identifier'],
  static_item: ['static', 'identifier'],
  mod_item: ['module', 'identifier'],
  macro_definition: ['macro', 'identifier'],
});
const PATH_SEGMENTS = new Set(['identifier', 'type_identifier', 'crate', 'self', 'super']);
const NON_REFERENCE_CONTEXTS = ['use_declaration', 'mod_item', 'attribute_item', 'inner_attribute_item', 'macro_definition'];
const WHITESPACE = new Set([' ', '\t', '\n', '\r']);
const ASSERT_MACROS = new Set(['assert', 'assert_eq', 'assert_ne', 'debug_assert', 'debug_assert_eq', 'debug_assert_ne']);

export function analyzeRustProject(context) {
  readCargoManifest(context);
  const crate = new Crate(context);
  crate.loadFile('crate', context.entry.path, true);
  const { tree } = context.entry;
  for (const node of tree.nodes.filter(({ term }) => term === 'mod_item')) {
    if (firstChild(node, 'declaration_list')) continue;
    const name = firstChild(node, 'identifier');
    if (!name) continue;
    context.request(nodeText(tree, name), node.start, node.end);
    const module = crate.modules.get(`${crate.moduleOf(node)}::${nodeText(tree, name)}`);
    if (module) context.module(nodeText(tree, name), module.file, module.file, node.start, node.end);
  }
  const locals = new Map();
  const role = (node) => {
    const invocation = ancestor(node, 'macro_invocation');
    const name = invocation?.children[0];
    if (name?.term !== 'identifier' || !ASSERT_MACROS.has(nodeText(tree, name))) return 'reference';
    return ancestor(invocation, 'const_item', 'static_item') ? 'const-assertion' : 'assertion';
  };
  for (const node of tree.nodes.filter(({ term }) => term === 'use_declaration')) {
    crate.useDeclaration(node, locals);
  }
  for (const node of tree.nodes.filter(({ term }) => term === 'attribute_item')) {
    crate.attribute(node);
  }
  for (const node of tree.nodes.filter(({ term }) => term === 'scoped_identifier' || term === 'scoped_type_identifier')) {
    if (node.parent && ['scoped_identifier', 'scoped_type_identifier'].includes(node.parent.term)) continue;
    if (ancestor(node, ...NON_REFERENCE_CONTEXTS)) continue;
    const resolved = crate.resolve(pathSegments(tree, node), crate.moduleOf(node), locals);
    if (resolved?.target) context.reference(role(node), nodeText(tree, node), node.start, node.end, resolved.target);
  }
  for (const { name, start, end } of context.unresolved) {
    const leaf = leafAt(tree, start, end);
    if (!leaf || ancestor(leaf, ...NON_REFERENCE_CONTEXTS)) continue;
    if (['scoped_identifier', 'scoped_type_identifier'].includes(leaf.parent?.term)) continue;
    if (leaf.parent?.term === 'macro_invocation' && leaf.parent.children[0] === leaf) continue;
    const local = locals.get(name);
    if (local) context.reference(role(leaf), name, start, end, local.target);
  }
  for (const node of tree.nodes.filter(({ term }) => term === 'macro_invocation')) {
    crate.macroInvocation(node);
  }
}

// Cargo.toml: the package name and edition and the declared dependencies.
function readCargoManifest(context) {
  const source = context.text('Cargo.toml');
  if (source === undefined) return;
  context.fact('project-manifest', 'Cargo.toml', 'Cargo.toml', 0, source.length);
  for (const { table, key, value, start, end } of tomlEntries(source)) {
    if (table === 'package' && key === 'name') context.fact('project-package', value, 'Cargo.toml', start, end);
    if (table === 'package' && key === 'edition') context.fact('project-edition', value, 'Cargo.toml', start, end);
    if (['dependencies', 'dev-dependencies', 'build-dependencies'].includes(table)) {
      context.fact('project-dependency', key, 'Cargo.toml', start, end);
    }
  }
}

function pathSegments(tree, node) {
  return leavesOf(tree, node).filter(({ term }) => PATH_SEGMENTS.has(term)).map((leaf) => nodeText(tree, leaf));
}

function collapseWhitespace(text) {
  let result = '';
  let space = false;
  for (const character of text) {
    if (WHITESPACE.has(character)) {
      space = result.length > 0;
      continue;
    }
    if (space) result += ' ';
    result += character;
    space = false;
  }
  return result;
}

class Crate {
  constructor(context) {
    this.context = context;
    this.modules = new Map();
    this.entryModules = new Map();
  }

  /** Loads a module file and, recursively, the modules it declares. */
  loadFile(qualified, file, root) {
    const loaded = this.context.load(file);
    if (!loaded) return undefined;
    const container = loaded.tree.roots.find(({ term }) => term === 'source_file') ?? loaded.tree.roots[0];
    const stem = file.slice(dirname(file).length).replace(/^\//u, '').replace(/\.rs$/u, '');
    const directory = root || stem === 'mod' ? dirname(file) : joinPath(dirname(file), stem);
    const node = { start: 0, end: loaded.source.length };
    return this.loadModule(qualified, file, loaded.tree, container, directory, declaration(file, qualified, 'module', [], node));
  }

  loadModule(qualified, file, tree, container, directory, module) {
    const record = { qualified, file, tree, items: new Map(), macros: [], module };
    this.modules.set(qualified, record);
    let attributes = [];
    for (const child of container?.children ?? []) {
      if (child.term === 'attribute_item') {
        const name = firstChild(firstChild(child, 'attribute') ?? child, 'identifier');
        if (name) attributes.push(nodeText(tree, name));
        continue;
      }
      if (child.term === 'line_comment' || child.term === 'block_comment') continue;
      const item = this.item(record, child, directory, attributes);
      attributes = [];
      if (item) record.items.set(item.name, item);
    }
    return record;
  }

  item(record, node, directory, attributes) {
    const shape = ITEM_KINDS[node.term];
    if (!shape) return undefined;
    const [kind, nameTerm] = shape;
    const { tree, qualified, file } = record;
    const nameNode = firstChild(node, nameTerm);
    if (!nameNode) return undefined;
    const name = nodeText(tree, nameNode);
    const item = { name, kind, pub: Boolean(firstChild(node, 'visibility_modifier')), attributes, node };
    if (kind === 'module') {
      const body = firstChild(node, 'declaration_list');
      const child = `${qualified}::${name}`;
      if (body) {
        const module = declaration(file, child, 'module', [], node);
        item.module = this.loadModule(child, file, tree, body, joinPath(directory, name), module);
      } else {
        const candidates = [joinPath(directory, `${name}.rs`), joinPath(directory, `${name}/mod.rs`)];
        const path = candidates.find((candidate) => this.context.has(candidate));
        item.module = path ? this.loadFile(child, path, false) : undefined;
      }
      item.target = item.module?.module;
      return item;
    }
    if (kind === 'macro') {
      item.target = declaration(file, `${qualified}::${name}!`, 'macro', [], node);
      item.record = record;
      record.macros.push(item);
      return undefined;
    }
    const traits = [];
    const modifiers = firstChild(node, 'function_modifiers');
    if (modifiers && firstChild(modifiers, 'async')) traits.push('async');
    if (modifiers && firstChild(modifiers, 'const')) traits.push('const');
    const body = firstChild(node, 'block');
    if (body && descendants(body, 'identifier').some((leaf) => nodeText(tree, leaf) === name)) traits.push('recursive');
    item.target = declaration(file, `${qualified}::${name}`, kind, traits, nameNode);
    return item;
  }

  /** The module an entry node belongs to: the crate root plus enclosing inline modules. */
  moduleOf(node) {
    const names = [];
    for (let current = node.parent; current; current = current.parent) {
      if (current.term === 'declaration_list' && current.parent?.term === 'mod_item') {
        names.unshift(nodeText(this.context.entry.tree, firstChild(current.parent, 'identifier')));
      }
    }
    return ['crate', ...names].join('::');
  }

  /**
   * Resolves a path from a module. Returns undefined for paths outside the
   * crate (other crates, the prelude), {target} for an accessible item, or
   * {missing} / {inaccessible} with the symbol that fails.
   */
  resolve(segments, from, locals = new Map()) {
    let module = this.modules.get(from);
    let index = 0;
    if (segments[0] === 'crate') {
      module = this.modules.get('crate');
      index = 1;
    } else if (segments[0] === 'self') {
      index = 1;
    } else if (segments[0] === 'super') {
      while (segments[index] === 'super') {
        module = module && this.modules.get(module.qualified.split('::').slice(0, -1).join('::'));
        index += 1;
      }
    } else if (!module?.items.has(segments[0])) {
      const local = locals.get(segments[0]);
      if (!local?.module) return undefined;
      module = local.module;
      index = 1;
    }
    if (!module) return undefined;
    if (index === segments.length) return { target: module.module, module };
    for (; index < segments.length; index += 1) {
      const item = module.items.get(segments[index]);
      const symbol = `${module.file}#${module.qualified}::${segments[index]}`;
      if (!item) return { missing: symbol };
      if (!item.pub && !(from === module.qualified || from.startsWith(`${module.qualified}::`))) {
        return { inaccessible: symbol };
      }
      if (index === segments.length - 1) return { target: item.target, module: item.module };
      if (!item.module) return item.kind === 'module' ? undefined : { missing: `${symbol}::${segments[index + 1]}` };
      module = item.module;
    }
    return undefined;
  }

  /** Flattens a use tree into imported locals and links each to its declaration. */
  useDeclaration(node, locals) {
    const { context } = this;
    const { tree } = context.entry;
    const from = this.moduleOf(node);
    const first = node.children[1];
    if (first) {
      const head = leavesOf(tree, first)[0];
      if (head && PATH_SEGMENTS.has(head.term)) {
        const resolved = this.resolve([nodeText(tree, head)], from);
        if (resolved?.module) context.module(nodeText(tree, head), resolved.module.file, resolved.module.file, node.start, node.end);
      }
    }
    for (const entry of this.useTree(first, [])) {
      const resolved = this.resolve(entry.segments, from);
      if (!resolved) continue;
      if (resolved.missing) {
        context.diagnose('missing-project-symbol', resolved.missing, entry.node.start, entry.node.end);
        continue;
      }
      if (resolved.inaccessible) {
        context.diagnose('inaccessible-project-symbol', resolved.inaccessible, entry.node.start, entry.node.end);
        continue;
      }
      context.reference('import', nodeText(tree, entry.node), entry.node.start, entry.node.end, resolved.target);
      if (entry.wildcard) {
        for (const item of resolved.module?.items.values() ?? []) {
          if (item.pub && item.target) locals.set(item.name, item);
        }
      } else {
        locals.set(entry.alias, { target: resolved.target, module: resolved.module });
      }
    }
  }

  useTree(node, prefix) {
    const { tree } = this.context.entry;
    if (!node) return [];
    if (node.term === 'use_list') {
      return node.children.flatMap((child) => this.useTree(child, prefix));
    }
    if (node.term === 'scoped_use_list') {
      const path = node.children[0]?.term === 'use_list' ? [] : pathSegments(tree, node.children[0]);
      return this.useTree(firstChild(node, 'use_list'), [...prefix, ...path]);
    }
    if (node.term === 'use_as_clause') {
      const alias = node.children.at(-1);
      return [{ segments: [...prefix, ...pathSegments(tree, node.children[0])], alias: nodeText(tree, alias), node }];
    }
    if (node.term === 'use_wildcard') {
      const path = node.children[0]?.term === '*' ? [] : pathSegments(tree, node.children[0]);
      return [{ segments: [...prefix, ...path], alias: '*', node, wildcard: true }];
    }
    if (node.term === 'self' && prefix.length > 0) {
      return [{ segments: prefix, alias: prefix.at(-1), node }];
    }
    if (PATH_SEGMENTS.has(node.term) || node.term === 'scoped_identifier') {
      const segments = [...prefix, ...pathSegments(tree, node)];
      return [{ segments, alias: segments.at(-1), node }];
    }
    return [];
  }

  /** `#[macro_use] mod name;` brings the module's macros into textual scope. */
  attribute(node) {
    const { tree } = this.context.entry;
    const name = firstChild(firstChild(node, 'attribute') ?? node, 'identifier');
    if (!name || nodeText(tree, name) !== 'macro_use') return;
    const parent = node.parent;
    const next = parent?.children[parent.children.indexOf(node) + 1];
    if (next?.term !== 'mod_item') return;
    const module = this.modules.get(`${this.moduleOf(node)}::${nodeText(tree, firstChild(next, 'identifier'))}`);
    if (module) this.context.reference('attribute', 'macro_use', node.start, node.end, module.module);
  }

  /** The macros in textual scope at an entry node. */
  visibleMacros(node) {
    const macros = [];
    const collect = (module) => {
      macros.push(...module.macros);
      for (const item of module.items.values()) {
        if (item.kind === 'module' && item.attributes.includes('macro_use') && item.module) collect(item.module);
      }
    };
    const module = this.modules.get(this.moduleOf(node));
    if (module) collect(module);
    return macros.filter((item) => item.target.file !== this.context.entry.path || item.node.end <= node.start);
  }

  macroInvocation(node) {
    const { context } = this;
    const { tree } = context.entry;
    const name = node.children[0];
    if (name?.term !== 'identifier') return;
    const item = this.visibleMacros(node).find((candidate) => candidate.name === nodeText(tree, name));
    if (!item) return;
    context.reference('macro', item.name, node.start, node.end, item.target);
    const argument = firstChild(node, 'token_tree');
    const expansion = argument && expandMacro(item.record.tree, item.node, tree, argument);
    if (expansion !== undefined) context.expansion(item.name, 'macro-rules', node.start, node.end, expansion, item.target.symbol);
  }
}

/**
 * Expands a macro_rules! invocation by its first rule whose pattern matches:
 * literal tokens must match, and each `$name:fragment` binds the tokens up to
 * the next literal. Expression fragments of more than one token keep their
 * grouping in parentheses. Returns undefined when no rule applies.
 */
function expandMacro(definitionTree, definition, tree, argument) {
  const tokens = argument.children.slice(1, -1);
  for (const rule of childrenOf(definition, 'macro_rule')) {
    const pattern = firstChild(rule, 'token_tree_pattern');
    const transcriber = firstChild(rule, 'token_tree');
    if (!pattern || !transcriber) continue;
    const bindings = matchPattern(definitionTree, pattern.children.slice(1, -1), tree, tokens);
    if (!bindings) continue;
    const body = transcriber.children.slice(1, -1);
    if (body.length === 0) return '';
    let text = '';
    let cursor = body[0].start;
    for (const variable of descendants(transcriber, 'metavariable')) {
      const binding = bindings.get(nodeText(definitionTree, variable));
      if (binding === undefined) return undefined;
      text += definitionTree.source.slice(cursor, variable.start) + binding;
      cursor = variable.end;
    }
    return collapseWhitespace(text + definitionTree.source.slice(cursor, body.at(-1).end));
  }
  return undefined;
}

function matchPattern(definitionTree, pattern, tree, tokens) {
  const bindings = new Map();
  let position = 0;
  for (let index = 0; index < pattern.length; index += 1) {
    const element = pattern[index];
    if (element.term === 'token_repetition_pattern') return undefined;
    if (element.term !== 'token_binding_pattern') {
      if (position >= tokens.length || nodeText(tree, tokens[position]) !== nodeText(definitionTree, element)) return undefined;
      position += 1;
      continue;
    }
    const next = pattern[index + 1];
    const stop = next ? nodeText(definitionTree, next) : undefined;
    const from = position;
    while (position < tokens.length && nodeText(tree, tokens[position]) !== stop) position += 1;
    if (position === from) return undefined;
    const text = tree.source.slice(tokens[from].start, tokens[position - 1].end);
    const fragment = nodeText(definitionTree, firstChild(element, 'fragment_specifier') ?? element);
    const grouped = fragment === 'expr' && position - from > 1 ? `(${text})` : text;
    bindings.set(nodeText(definitionTree, firstChild(element, 'metavariable')), grouped);
  }
  return position === tokens.length ? bindings : undefined;
}
