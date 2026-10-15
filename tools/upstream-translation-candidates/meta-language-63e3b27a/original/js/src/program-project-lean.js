// Project-aware Lean semantics: the Lake manifest (lakefile.toml) and the
// toolchain pin, `import A.B` resolved to `A/B.lean` within a declared
// library, declarations qualified by their namespaces, `open` namespaces,
// attributes, tactic references, and prefix notations expanded to their
// definition.
import {
  ancestor,
  childrenOf,
  declaration,
  descendants,
  firstChild,
  leafAt,
  leavesOf,
  nodeText,
  tomlEntries,
} from './program-project-tree.js';

const DEFINITION_KEYWORDS = new Set(['def', 'theorem', 'lemma', 'abbrev', 'instance', 'opaque', 'axiom']);
const DOTTED = new Set(['identifier', '.']);

export function analyzeLeanProject(context) {
  const libraries = readLakeManifest(context);
  const environment = new Environment(context);
  const { tree } = context.entry;
  const body = moduleNode(tree);
  for (const node of childrenOf(body, 'import')) {
    for (const name of importNames(tree, node)) {
      const path = environment.importFile(name, libraries);
      if (path === undefined) continue;
      if (path === null) {
        context.diagnose('missing-project-library', name.split('.')[0], node.start, node.end);
        continue;
      }
      context.module(name, path, path, node.start, node.end);
    }
  }
  const opens = [];
  for (const node of descendants(body, 'open')) {
    if (node.children.length === 0) continue;
    const scoped = Boolean(firstChild(node, 'in'));
    for (const name of dottedNames(tree, node)) {
      const namespace = environment.namespaces.get(name.text);
      if (!namespace) continue;
      context.reference('import', name.text, name.start, name.end, namespace);
      opens.push({ name: name.text, start: scoped ? node.start : node.end, end: scoped ? node.end : tree.source.length });
    }
  }
  const resolve = (name, position) => {
    const candidates = [name, ...opens.filter(({ start, end }) => start <= position && position <= end).map((open) => `${open.name}.${name}`)];
    return candidates.map((candidate) => environment.declarations.get(candidate)).find(Boolean);
  };
  const role = (node) => (ancestor(node, 'by') ? 'tactic' : 'reference');
  const notationAt = (node) => {
    if (node.parent?.term !== 'application' || node.parent.children[0] !== node) return undefined;
    const name = nodeText(tree, node);
    return environment.notations.find((notation) => notation.atom === name &&
      notation.visibility !== 'local' &&
      (notation.visibility !== 'scoped' || opens.some((open) => open.name === notation.namespace && open.start <= node.start && node.start <= open.end)) &&
      node.parent.children.length - 1 === notation.variables.length);
  };
  for (const { name, start, end } of context.unresolved) {
    const leaf = leafAt(tree, start, end);
    if (!leaf || leaf.parent?.term === 'projection' || ancestor(leaf, 'import', 'attributes', 'notation')) continue;
    if (leaf.parent?.term === 'open' || isAttributeCommand(leaf.parent) || notationAt(leaf)) continue;
    const target = resolve(name, start);
    if (target) context.reference(role(leaf), name, start, end, target);
  }
  for (const node of tree.nodes.filter(({ term }) => term === 'projection')) {
    if (node.parent?.term === 'projection' || !leavesOf(tree, node).every(({ term }) => DOTTED.has(term))) continue;
    if (ancestor(node, 'import', 'attributes', 'notation')) continue;
    const target = resolve(nodeText(tree, node), node.start);
    if (target) context.reference(role(node), nodeText(tree, node), node.start, node.end, target);
  }
  for (const node of tree.nodes.filter(isAttributeCommand)) {
    const close = node.children.findIndex(({ term }) => term === ']');
    const names = node.children.slice(0, close).filter(({ term }) => term === 'identifier').map((leaf) => nodeText(tree, leaf));
    for (const leaf of node.children.slice(close + 1).filter(({ term }) => term === 'identifier')) {
      const target = resolve(nodeText(tree, leaf), leaf.start);
      if (target) context.reference('attribute', names.join(' '), node.start, node.end, target);
    }
  }
  for (const leaf of tree.leaves.filter(({ term }) => term === 'identifier')) {
    const notation = notationAt(leaf);
    if (!notation) continue;
    const application = leaf.parent;
    context.reference('notation', notation.atom, application.start, application.end, notation.target);
    const expansion = notation.expand(application.children.slice(1).map((argument) => {
      const text = nodeText(tree, argument);
      return leavesOf(tree, argument).length > 1 && argument.term !== 'parenthesized' ? `(${text})` : text;
    }));
    context.expansion(notation.atom, 'notation', application.start, application.end, expansion, notation.target.symbol);
  }
}

function isAttributeCommand(node) {
  return node?.term === 'attribute' && node.children[0]?.term === 'attribute';
}

function moduleNode(tree) {
  const file = tree.roots[0];
  return file ? firstChild(file, 'module') ?? file : { children: [] };
}

// `import A.B C` names the modules A.B and C.
function importNames(tree, node) {
  return dottedNames(tree, node).map(({ text }) => text);
}

// The dotted names written directly in a command, before an `in` body.
function dottedNames(tree, node) {
  const names = [];
  for (const child of node.children.slice(1)) {
    if (!DOTTED.has(child.term)) break;
    const last = names.at(-1);
    if (last && last.end === child.start) {
      last.end = child.end;
      last.text = tree.source.slice(last.start, last.end);
    } else {
      names.push({ text: nodeText(tree, child), start: child.start, end: child.end });
    }
  }
  return names;
}

// lakefile.toml: the package name, its libraries and required packages, and
// the lean-toolchain pin.
function readLakeManifest(context) {
  const source = context.text('lakefile.toml');
  const toolchain = context.text('lean-toolchain');
  if (toolchain !== undefined) {
    const trimmed = toolchain.trim();
    const start = toolchain.indexOf(trimmed);
    context.fact('project-toolchain', trimmed, 'lean-toolchain', start, start + trimmed.length);
  }
  if (source === undefined) return undefined;
  context.fact('project-manifest', 'lakefile.toml', 'lakefile.toml', 0, source.length);
  const libraries = new Set();
  for (const { table, key, value, start, end } of tomlEntries(source)) {
    if (table === '' && key === 'name') context.fact('project-package', value, 'lakefile.toml', start, end);
    if (table === 'lean_lib' && key === 'name') {
      libraries.add(value);
      context.fact('project-library', value, 'lakefile.toml', start, end);
    }
    if (table === 'require' && key === 'name') context.fact('project-dependency', value, 'lakefile.toml', start, end);
  }
  return libraries;
}

class Environment {
  constructor(context) {
    this.context = context;
    this.declarations = new Map();
    this.namespaces = new Map();
    this.notations = [];
    this.loaded = new Set();
  }

  /**
   * The file of an imported module, loading its declarations and imports:
   * undefined when the project has no such file, null when the file is
   * outside every declared library.
   */
  importFile(name, libraries) {
    const path = `${name.split('.').join('/')}.lean`;
    if (!this.context.has(path) || path === this.context.entry.path) return undefined;
    if (libraries && !libraries.has(name.split('.')[0])) return null;
    if (this.loaded.has(path)) return path;
    this.loaded.add(path);
    const file = this.context.load(path);
    const body = moduleNode(file.tree);
    for (const node of childrenOf(body, 'import')) {
      for (const imported of importNames(file.tree, node)) this.importFile(imported, libraries);
    }
    this.declare(path, file.tree, body);
    return path;
  }

  declare(path, tree, body) {
    const scopes = [];
    const universes = new Set();
    const prefix = () => scopes.filter(Boolean).join('.');
    const qualify = (name) => (prefix() ? `${prefix()}.${name}` : name);
    let visibility = 'global';
    for (const child of body.children) {
      if (child.term === 'scoped' || child.term === 'local') {
        visibility = child.term;
        continue;
      }
      if (child.term === 'namespace' && child.children.length > 0) {
        for (const name of dottedNames(tree, child)) {
          scopes.push(name.text);
          if (!this.namespaces.has(prefix())) this.namespaces.set(prefix(), declaration(path, prefix(), 'namespace', [], child));
        }
      } else if (child.term === 'section' && child.children.length > 0) {
        scopes.push('');
      } else if (child.term === 'end' && child.children.length > 0) {
        scopes.pop();
      } else if (child.term === 'universe' && child.children.length > 0) {
        for (const name of childrenOf(child, 'identifier')) universes.add(nodeText(tree, name));
      } else if (child.term === 'declaration') {
        const inner = firstChild(child, 'definition', 'structure', 'inductive');
        if (inner) this.definition(path, tree, inner, qualify, universes);
      } else if (['definition', 'structure', 'inductive'].includes(child.term)) {
        this.definition(path, tree, child, qualify, universes);
      } else if (child.term === 'notation' && child.children.length > 0) {
        this.notation(path, tree, child, prefix(), visibility);
      }
      visibility = 'global';
    }
  }

  definition(path, tree, node, qualify, universes) {
    const keyword = node.children[0];
    const kind = node.term === 'definition' ? nodeText(tree, keyword) : node.term;
    if (node.term === 'definition' && !DEFINITION_KEYWORDS.has(kind)) return;
    const [name] = dottedNames(tree, node);
    if (!name || name.start !== node.children[1].start) return;
    const qualified = qualify(name.text);
    const traits = [];
    const rest = leavesOf(tree, node).filter(({ start }) => start >= name.end);
    const shortName = name.text.split('.').at(-1);
    if (rest.some((leaf) => leaf.term === 'identifier' && [name.text, shortName, qualified].includes(nodeText(tree, leaf)))) {
      traits.push('recursive');
    }
    const assign = node.children.findIndex(({ term }) => term === ':=' || term === 'where');
    const header = (assign < 0 ? node.children : node.children.slice(0, assign)).flatMap((child) => leavesOf(tree, child));
    if (header.some((leaf) => leaf.term === 'identifier' && nodeText(tree, leaf) === 'IO')) traits.push('io');
    if (header.some((leaf) => leaf.term === 'identifier' && universes.has(nodeText(tree, leaf)))) traits.push('universe-polymorphic');
    this.declarations.set(qualified, declaration(path, qualified, kind, traits, name));
    for (const constructor of childrenOf(node, 'constructor')) {
      const constructorName = firstChild(constructor, 'identifier');
      if (!constructorName) continue;
      const constructorQualified = `${qualified}.${nodeText(tree, constructorName)}`;
      this.declarations.set(constructorQualified, declaration(path, constructorQualified, 'constructor', [], constructorName));
    }
  }

  // `notation "atom " x y => body`: a prefix notation with its variables.
  notation(path, tree, node, namespace, visibility) {
    const arrow = node.children.findIndex(({ term }) => term === '=>');
    if (arrow < 1 || arrow + 1 >= node.children.length) return;
    const pattern = node.children.slice(1, arrow).filter(({ term }) => term !== ':' && term !== 'number');
    const elements = pattern.flatMap((element) => flattenApplication(element));
    if (elements[0]?.term !== 'string' || elements.slice(1).some(({ term }) => term !== 'identifier')) return;
    const atom = nodeText(tree, elements[0]).slice(1, -1).trim();
    const variables = elements.slice(1).map((element) => nodeText(tree, element));
    const body = node.children[arrow + 1];
    const symbol = namespace ? `${namespace}.«${atom}»` : `«${atom}»`;
    const target = declaration(path, `notation:${symbol}`, 'notation', [], node);
    const expand = (argumentsText) => {
      let text = '';
      let cursor = body.start;
      for (const leaf of leavesOf(tree, body)) {
        const index = leaf.term === 'identifier' ? variables.indexOf(nodeText(tree, leaf)) : -1;
        if (index < 0) continue;
        text += tree.source.slice(cursor, leaf.start) + argumentsText[index];
        cursor = leaf.end;
      }
      return text + tree.source.slice(cursor, body.end);
    };
    this.notations.push({ atom, variables, namespace, visibility, target, expand });
  }
}

function flattenApplication(node) {
  return node.term === 'application' ? node.children.flatMap((child) => flattenApplication(child)) : [node];
}
