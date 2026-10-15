// Project-aware JavaScript semantics: package.json dialect, name and import
// map; ECMAScript module requests resolved to project files; named,
// namespace and default imports, JSON modules with their import attributes,
// tagged templates expanded into the call they denote, and project
// references checked by `node:assert` assertions (runtime-checked
// propositions: JavaScript has no proof terms).
import {
  childrenOf,
  declaration,
  descendants,
  dirname,
  firstChild,
  joinPath,
  jsonString,
  leafAt,
  nodeText,
} from './program-project-tree.js';

const ASSERT_MODULES = new Set(['node:assert', 'node:assert/strict', 'assert', 'assert/strict']);

export function analyzeJavaScriptProject(context) {
  const manifest = readPackageManifest(context);
  const { tree } = context.entry;
  const locals = new Map();
  const assertions = new Set();
  for (const statement of tree.roots.flatMap((root) => childrenOf(root, 'import_statement'))) {
    const specifier = firstChild(statement, 'string');
    const fragment = specifier && firstChild(specifier, 'string_fragment');
    if (!fragment) continue;
    const request = nodeText(tree, fragment);
    if (ASSERT_MODULES.has(request)) {
      for (const name of importedLocals(firstChild(statement, 'import_clause'))) assertions.add(nodeText(tree, name));
      continue;
    }
    const path = resolveRequest(request, context.entry.path, manifest);
    if (!path || !context.has(path)) continue;
    context.module(request, path, path, statement.start, statement.end);
    const exports = moduleExports(context, path);
    const clause = firstChild(statement, 'import_clause');
    const attribute = firstChild(statement, 'import_attribute');
    const type = attribute && importAttributeType(tree, attribute);
    const json = path.endsWith('.json');
    if (json && type !== 'json') context.diagnose('missing-import-attribute', request, statement.start, statement.end);
    if (type === 'json' && !json) context.diagnose('import-attribute-mismatch', request, statement.start, statement.end);
    if (attribute && type === 'json' && json) {
      context.reference('attribute', `type: ${type}`, attribute.start, attribute.end, exports.get('default'));
    }
    if (!clause) continue;
    for (const child of clause.children) {
      if (child.term === 'identifier') {
        importName(context, exports, 'default', child, nodeText(tree, child), locals, path);
      } else if (child.term === 'namespace_import') {
        const local = firstChild(child, 'identifier');
        const namespace = { symbol: `${path}#*`, kind: 'namespace', traits: [], file: path, start: 0, end: context.text(path).length };
        context.reference('import', '*', child.start, child.end, namespace);
        locals.set(nodeText(tree, local), { path, name: '*', exports });
      } else if (child.term === 'named_imports') {
        for (const item of childrenOf(child, 'import_specifier')) {
          const names = childrenOf(item, 'identifier');
          if (names.length === 0) continue;
          importName(context, exports, nodeText(tree, names[0]), item, nodeText(tree, names.at(-1)), locals, path);
        }
      }
    }
  }
  for (const binding of context.bindings.filter(({ kind }) => kind === 'import')) {
    const local = locals.get(binding.name);
    if (!local) continue;
    for (const { start, end } of binding.references) {
      const leaf = leafAt(tree, start, end);
      if (leaf) referenceUse(context, local, leaf, insideAssertion(tree, leaf, assertions) ? 'assertion' : 'reference');
    }
  }
}

function importName(context, exports, name, node, local, locals, path) {
  const target = exports.get(name);
  if (!target) {
    context.diagnose('missing-project-symbol', `${path}#${name}`, node.start, node.end);
    return;
  }
  context.reference('import', name, node.start, node.end, target);
  locals.set(local, { path, name, exports });
}

// One use of an imported local: a namespace or JSON member access, a tagged
// template, or a plain reference.
function referenceUse(context, local, leaf, role) {
  const { tree } = context.entry;
  const parent = leaf.parent;
  const member = parent?.term === 'member_expression' && parent.children[0] === leaf
    ? firstChild(parent, 'property_identifier')
    : undefined;
  if (member && (local.name === '*' || local.name === 'default')) {
    const name = local.name === '*' ? nodeText(tree, member) : `default.${nodeText(tree, member)}`;
    const target = local.exports.get(name);
    if (target) context.reference(role, name, parent.start, parent.end, target);
    else context.diagnose('missing-project-symbol', `${local.path}#${name}`, parent.start, parent.end);
    return;
  }
  const target = local.exports.get(local.name);
  const template = parent?.term === 'call_expression' && parent.children[0] === leaf
    ? firstChild(parent, 'template_string')
    : undefined;
  if (template) {
    context.reference('template-tag', local.name, parent.start, parent.end, target);
    const expansion = templateCall(tree, leaf, template);
    if (expansion) context.expansion(local.name, 'tagged-template', parent.start, parent.end, expansion, target.symbol);
    return;
  }
  context.reference(role, local.name, leaf.start, leaf.end, target);
}

// The local identifiers an import clause binds.
function importedLocals(clause) {
  return (clause?.children ?? []).flatMap((child) => {
    if (child.term === 'identifier') return [child];
    if (child.term === 'namespace_import') return childrenOf(child, 'identifier');
    if (child.term === 'named_imports') return childrenOf(child, 'import_specifier').map((item) => childrenOf(item, 'identifier').at(-1)).filter(Boolean);
    return [];
  });
}

// Whether a node is an argument of `assert(...)`, `assert.method(...)` for an
// imported assertion module, or `console.assert(...)`.
function insideAssertion(tree, node, assertions) {
  for (let current = node; current.parent; current = current.parent) {
    const call = current.parent;
    if (call.term !== 'call_expression' || current.term !== 'arguments') continue;
    const callee = call.children[0];
    const object = callee?.term === 'member_expression' ? callee.children[0] : callee;
    if (object?.term === 'identifier' && assertions.has(nodeText(tree, object))) return true;
    if (callee?.term === 'member_expression' && nodeText(tree, callee) === 'console.assert') return true;
  }
  return false;
}

// `tag\`a${x}b\`` calls tag with the frozen strings array (carrying its raw
// strings) followed by the substituted values.
function templateCall(tree, tag, template) {
  const strings = [];
  const values = [];
  let current = '';
  for (const child of template.children) {
    if (child.term === 'string_fragment') current += nodeText(tree, child);
    else if (child.term === 'escape_sequence') return undefined;
    else if (child.term === 'template_substitution') {
      strings.push(current);
      current = '';
      const inner = child.children.slice(1, -1);
      if (inner.length !== 1) return undefined;
      values.push(nodeText(tree, inner[0]));
    }
  }
  strings.push(current);
  const array = `[${strings.map(jsonString).join(', ')}]`;
  const argument = `Object.freeze(Object.assign(${array}, { raw: Object.freeze(${array}) }))`;
  return `${nodeText(tree, tag)}(${[argument, ...values].join(', ')})`;
}

function importAttributeType(tree, attribute) {
  for (const pair of descendants(attribute, 'pair')) {
    const [key, , value] = pair.children;
    const fragment = value?.term === 'string' ? firstChild(value, 'string_fragment') : undefined;
    const name = key && nodeText(tree, firstChild(key, 'string_fragment') ?? key);
    if (fragment && name === 'type') return nodeText(tree, fragment);
  }
  return undefined;
}

function resolveRequest(request, entry, manifest) {
  if (request.startsWith('./') || request.startsWith('../')) return joinPath(dirname(entry), request);
  if (request.startsWith('#')) {
    const target = manifest.imports.get(request);
    return target ? joinPath('', target) : undefined;
  }
  return undefined;
}

// package.json: the package name, its module dialect ("type"), the
// package-internal import map and the declared dependencies.
function readPackageManifest(context) {
  const manifest = { imports: new Map() };
  const file = context.load('package.json', 'JSON');
  if (!file) return manifest;
  const { tree } = file;
  context.fact('project-manifest', 'package.json', 'package.json', 0, file.source.length);
  const members = jsonMembers(tree, jsonRoot(tree));
  const text = (node) => nodeText(tree, firstChild(node, 'string_content') ?? node);
  const name = members.get('name');
  if (name?.term === 'string') context.fact('project-package', text(name), 'package.json', ...contentRange(name));
  const type = members.get('type');
  const dialect = type?.term === 'string' ? text(type) : 'commonjs';
  context.fact('project-dialect', dialect, 'package.json', ...(type ? contentRange(type) : [0, 0]));
  const imports = members.get('imports');
  if (imports?.term === 'object') {
    for (const [key, value] of jsonMembers(tree, imports)) {
      if (value.term !== 'string') continue;
      manifest.imports.set(key, text(value));
      context.fact('project-import-map', key, 'package.json', ...contentRange(value));
    }
  }
  for (const section of ['dependencies', 'devDependencies', 'peerDependencies']) {
    const dependencies = members.get(section);
    if (dependencies?.term !== 'object') continue;
    for (const [key, value] of jsonMembers(tree, dependencies)) {
      context.fact('project-dependency', key, 'package.json', value.start, value.end);
    }
  }
  return manifest;
}

function contentRange(node) {
  const content = firstChild(node, 'string_content');
  return content ? [content.start, content.end] : [node.start + 1, node.end - 1];
}

function jsonRoot(tree) {
  const document = tree.roots.find((root) => root.term === 'document') ?? tree.roots[0];
  return document?.children.find((child) => child.term === 'object') ?? document;
}

// The members of a JSON object, keyed by their decoded-as-written key text.
function jsonMembers(tree, object) {
  const members = new Map();
  for (const pair of childrenOf(object, 'pair')) {
    const [key, , value] = pair.children;
    if (!key || !value) continue;
    const content = firstChild(key, 'string_content');
    members.set(content ? nodeText(tree, content) : '', value);
  }
  return members;
}

// The exports of a project module: exported declarations of a JavaScript
// module, or the default value and top-level members of a JSON module.
function moduleExports(context, path) {
  const exports = new Map();
  if (path.endsWith('.json')) {
    const file = context.load(path, 'JSON');
    const root = jsonRoot(file.tree);
    exports.set('default', declaration(path, 'default', 'json-value', [], root ?? { start: 0, end: 0 }));
    if (root?.term === 'object') {
      for (const pair of childrenOf(root, 'pair')) {
        const content = firstChild(pair.children[0], 'string_content');
        if (!content) continue;
        const name = `default.${nodeText(file.tree, content)}`;
        exports.set(name, declaration(path, name, 'json-member', [], content));
      }
    }
    return exports;
  }
  const file = context.load(path);
  const { tree } = file;
  for (const statement of tree.roots.flatMap((root) => childrenOf(root, 'export_statement'))) {
    const declared = firstChild(statement, 'function_declaration', 'generator_function_declaration',
      'class_declaration', 'lexical_declaration', 'variable_declaration');
    if (firstChild(statement, 'default')) {
      exports.set('default', declaration(path, 'default', 'default', [], declared ?? statement));
      continue;
    }
    if (!declared) continue;
    if (declared.term === 'lexical_declaration' || declared.term === 'variable_declaration') {
      for (const declarator of childrenOf(declared, 'variable_declarator')) {
        const name = firstChild(declarator, 'identifier');
        if (name) exports.set(nodeText(tree, name), declaration(path, nodeText(tree, name), 'variable', [], name));
      }
      continue;
    }
    const name = firstChild(declared, 'identifier');
    if (!name) continue;
    const text = nodeText(tree, name);
    const traits = [];
    if (firstChild(declared, 'async')) traits.push('async');
    if (declared.term === 'generator_function_declaration') traits.push('generator');
    const body = firstChild(declared, 'statement_block', 'class_body');
    if (body && descendants(body, 'identifier').some((node) => nodeText(tree, node) === text)) traits.push('recursive');
    const kind = declared.term === 'class_declaration' ? 'class' : 'function';
    exports.set(text, declaration(path, text, kind, traits, name));
  }
  return exports;
}
