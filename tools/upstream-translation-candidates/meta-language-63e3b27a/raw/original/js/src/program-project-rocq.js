// Project-aware Rocq semantics: the _CoqProject load paths (`-Q`/`-R`
// physical directory to logical prefix) and listed files, `Require Import`
// resolved through them, declarations qualified by their logical module,
// hint databases targeted by attributes, Ltac tactics, and notations
// expanded to their definition.
import {
  ancestor,
  childrenOf,
  declaration,
  descendants,
  firstChild,
  leafAt,
  leavesOf,
  nodeText,
  operandAfter,
  operandBefore,
} from './program-project-tree.js';

const DECLARATION_COMMANDS = Object.freeze({
  definition_command: 'definition',
  fixpoint_command: 'fixpoint',
  theorem_command: 'theorem',
  inductive_command: 'inductive',
});
const PROOF_KEYWORDS = Object.freeze({ Lemma: 'lemma', Theorem: 'theorem', Corollary: 'theorem', Fact: 'theorem', Remark: 'theorem' });
const NON_REFERENCE_CONTEXTS = ['require_command', 'notation_command', 'attributes'];

export function analyzeRocqProject(context) {
  const loadPaths = readCoqProject(context);
  const environment = new Environment(context, loadPaths);
  const { tree } = context.entry;
  for (const node of tree.nodes.filter(({ term }) => term === 'require_command')) {
    for (const { name, imported } of requireNames(tree, node)) {
      const path = environment.require(name, imported);
      if (path) context.module(name, path, path, node.start, node.end);
    }
  }
  const role = (node) => (ancestor(node, 'tactic_invocation', 'ltac_definition') ? 'tactic' : 'reference');
  for (const { name, start, end } of context.unresolved) {
    const leaf = leafAt(tree, start, end);
    if (!leaf || ancestor(leaf, ...NON_REFERENCE_CONTEXTS)) continue;
    const hint = ancestor(leaf, 'hint_command');
    if (hint && hint.children.findIndex(({ term }) => term === ':') >= 0 &&
      leaf.start > hint.children.find(({ term }) => term === ':').start) continue;
    const target = environment.resolve(name);
    if (target) context.reference(role(leaf), name, start, end, target);
  }
  for (const sentence of tree.nodes.filter(({ term }) => term === 'sentence')) {
    const attributes = firstChild(sentence, 'attributes');
    const hint = firstChild(sentence, 'hint_command');
    if (!attributes || !hint) continue;
    const colon = hint.children.findIndex(({ term }) => term === ':');
    const names = descendants(attributes, 'identifier').map((leaf) => nodeText(tree, leaf)).join(' ');
    for (const database of colon < 0 ? [] : hint.children.slice(colon + 1)) {
      const target = environment.hintDatabases.get(nodeText(tree, database));
      if (target) context.reference('attribute', names, attributes.start, attributes.end, target);
    }
  }
  for (const notation of environment.notations.filter(({ module }) => environment.imported.has(module))) {
    for (const match of notationMatches(tree, notation)) {
      context.reference('notation', notation.atom, match.start, match.end, notation.target);
      context.expansion(notation.atom, 'notation', match.start, match.end, notation.expand(match.operands), notation.target.symbol);
    }
  }
}

// `From P Require Import A B` requires P.A and P.B; `Require Import A.B`
// requires A.B. Import and Export also make the short names visible.
function requireNames(tree, node) {
  const from = node.children[0]?.term === 'From' ? nodeText(tree, node.children[1]) : undefined;
  const mode = node.children.findIndex(({ term }) => term === 'Import' || term === 'Export');
  if (mode < 0) return [];
  const names = splitWords(tree.source.slice(node.children[mode].end, node.end));
  return names.map((name) => ({ name: from ? `${from}.${name}` : name, imported: true }));
}

function splitWords(text) {
  const words = [];
  let current = '';
  for (const character of text) {
    if (character === ' ' || character === '\t' || character === '\n' || character === '\r') {
      if (current) words.push(current);
      current = '';
    } else {
      current += character;
    }
  }
  if (current) words.push(current);
  return words;
}

// _CoqProject: `-Q dir Prefix` and `-R dir Prefix` load paths and listed files.
function readCoqProject(context) {
  const source = context.text('_CoqProject');
  const loadPaths = [];
  if (source === undefined) return loadPaths;
  context.fact('project-manifest', '_CoqProject', '_CoqProject', 0, source.length);
  const words = [];
  let offset = 0;
  for (const line of source.split('\n')) {
    let index = 0;
    while (index < line.length && line[index] !== '#') {
      if (line[index] === ' ' || line[index] === '\t' || line[index] === '\r') {
        index += 1;
        continue;
      }
      const start = index;
      while (index < line.length && ![' ', '\t', '\r'].includes(line[index])) index += 1;
      words.push({ text: line.slice(start, index), start: offset + start, end: offset + index });
    }
    offset += line.length + 1;
  }
  for (let index = 0; index < words.length; index += 1) {
    const word = words[index];
    if ((word.text === '-Q' || word.text === '-R') && index + 2 < words.length) {
      const directory = words[index + 1].text.replace(/^\.\//u, '').replace(/\/$/u, '');
      const prefix = words[index + 2];
      loadPaths.push({ directory: directory === '.' ? '' : directory, prefix: prefix.text });
      context.fact('project-load-path', prefix.text, '_CoqProject', words[index + 1].start, words[index + 1].end);
      index += 2;
    } else if (word.text.endsWith('.v')) {
      context.fact('project-source', word.text, '_CoqProject', word.start, word.end);
    }
  }
  return loadPaths;
}

class Environment {
  constructor(context, loadPaths) {
    this.context = context;
    this.loadPaths = loadPaths;
    this.declarations = [];
    this.hintDatabases = new Map();
    this.notations = [];
    this.loaded = new Map();
    this.imported = new Set();
  }

  /** The file of a required logical module, found through the load paths. */
  require(name, imported) {
    for (const { directory, prefix } of this.loadPaths) {
      if (!name.startsWith(`${prefix}.`)) continue;
      const relative = `${name.slice(prefix.length + 1).split('.').join('/')}.v`;
      const path = directory ? `${directory}/${relative}` : relative;
      if (!this.context.has(path) || path === this.context.entry.path) continue;
      if (!this.loaded.has(name)) {
        this.loaded.set(name, path);
        const file = this.context.load(path);
        for (const node of file.tree.nodes.filter(({ term }) => term === 'require_command')) {
          for (const required of requireNames(file.tree, node)) this.require(required.name, false);
        }
        this.declare(name, path, file.tree);
      }
      if (imported) this.imported.add(name);
      return path;
    }
    return undefined;
  }

  /** A declaration by qualified name, or by short name from an imported module. */
  resolve(name) {
    return this.declarations.find(({ qualified }) => qualified === name)?.target ??
      this.declarations.find(({ module, qualified }) => this.imported.has(module) && qualified === `${module}.${name}`)?.target;
  }

  declare(module, path, tree) {
    const add = (name, kind, traits, node) => {
      const qualified = `${module}.${name}`;
      this.declarations.push({ module, qualified, target: declaration(path, qualified, kind, traits, node) });
    };
    for (const sentence of tree.nodes.filter(({ term }) => term === 'sentence')) {
      const command = sentence.children.find(({ term }) => DECLARATION_COMMANDS[term] || term === 'ltac_definition' ||
        term === 'notation_command' || term === 'create_hintdb_command');
      if (!command) continue;
      if (command.term === 'ltac_definition') {
        const name = firstChild(command, 'ident');
        if (name) add(nodeText(tree, name), 'tactic', ['proof-state'], name);
      } else if (command.term === 'create_hintdb_command') {
        const name = firstChild(command, 'ident');
        if (name) this.hintDatabases.set(nodeText(tree, name), declaration(path, `hintdb:${nodeText(tree, name)}`, 'hint-database', [], name));
      } else if (command.term === 'notation_command') {
        this.notation(module, path, tree, command);
      } else if (command.term === 'inductive_command') {
        for (const body of childrenOf(command, 'inductive_definition')) {
          const name = firstChild(body, 'ident');
          if (!name) continue;
          add(nodeText(tree, name), 'inductive', [], name);
          for (const constructor of descendants(body, 'constructor')) {
            const constructorName = firstChild(constructor, 'ident');
            if (constructorName) add(nodeText(tree, constructorName), 'constructor', [], constructorName);
          }
        }
      } else {
        const name = firstChild(firstChild(command, 'ident_decl') ?? command, 'ident');
        if (!name) continue;
        const text = nodeText(tree, name);
        const keyword = nodeText(tree, command.children[0]);
        const kind = command.term === 'theorem_command' ? PROOF_KEYWORDS[keyword] ?? 'theorem' : DECLARATION_COMMANDS[command.term];
        const recursive = leavesOf(tree, command).some((leaf) => leaf.start >= name.end && leaf.term === 'identifier' && nodeText(tree, leaf) === text);
        add(text, kind, recursive ? ['recursive'] : [], name);
      }
    }
  }

  // `Notation "x ++2" := (body)`: pattern words that occur in the body are
  // variables, the others are atoms; one atom with operands around it.
  notation(module, path, tree, command) {
    const declarationNode = firstChild(command, 'notation_declaration');
    const pattern = declarationNode && firstChild(declarationNode, 'string');
    const assign = declarationNode?.children.findIndex(({ term }) => term === ':=') ?? -1;
    const body = assign >= 0 ? declarationNode.children[assign + 1] : undefined;
    if (!pattern || !body) return;
    const bodyNames = new Set(leavesOf(tree, body).filter(({ term }) => term === 'identifier').map((leaf) => nodeText(tree, leaf)));
    const words = splitWords(nodeText(tree, pattern).slice(1, -1));
    const atoms = words.filter((word) => !bodyNames.has(word));
    if (atoms.length !== 1 || words.length > 3) return;
    const atomIndex = words.indexOf(atoms[0]);
    const variables = words.filter((word) => bodyNames.has(word));
    const target = declaration(path, `notation:"${words.join(' ')}"`, 'notation', [], command);
    const expand = (operands) => {
      let text = '';
      let cursor = body.start;
      for (const leaf of leavesOf(tree, body)) {
        const index = leaf.term === 'identifier' ? variables.indexOf(nodeText(tree, leaf)) : -1;
        if (index < 0) continue;
        text += tree.source.slice(cursor, leaf.start) + operands[index];
        cursor = leaf.end;
      }
      return text + tree.source.slice(cursor, body.end);
    };
    this.notations.push({
      module,
      atom: atoms[0],
      before: atomIndex > 0,
      after: atomIndex < words.length - 1,
      target,
      expand,
    });
  }
}

// Entry occurrences of a notation atom (possibly split over adjacent tokens)
// with the operands written around it.
function notationMatches(tree, notation) {
  const matches = [];
  const { leaves } = tree;
  for (let index = 0; index < leaves.length; index += 1) {
    if (ancestor(leaves[index], ...NON_REFERENCE_CONTEXTS)) continue;
    let text = '';
    let last = index;
    while (last < leaves.length && text.length < notation.atom.length &&
      (last === index || leaves[last].start === leaves[last - 1].end)) {
      text += nodeText(tree, leaves[last]);
      last += 1;
    }
    if (text !== notation.atom) continue;
    const first = leaves[index];
    const final = leaves[last - 1];
    const before = notation.before ? operandBefore(tree, first) : undefined;
    const after = notation.after ? operandAfter(tree, final) : undefined;
    if ((notation.before && !before) || (notation.after && !after)) continue;
    const operands = [before, after].filter(Boolean).map((operand) => {
      const operandText = nodeText(tree, operand);
      return leavesOf(tree, operand).length > 1 && !operand.term.startsWith('parenthesized') ? `(${operandText})` : operandText;
    });
    matches.push({ start: (before ?? first).start, end: (after ?? final).end, operands });
    index = last - 1;
  }
  return matches;
}
