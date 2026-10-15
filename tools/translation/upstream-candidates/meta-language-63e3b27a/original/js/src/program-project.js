// Project-aware semantics: resolves an entry program's module requests to the
// project's source files, reads the project manifests, and links the entry's
// imports, references, attributes, macros, notations and tactics to the
// declarations they name in other files. Every symbol is identified as
// `<file>#<qualified name>`. The Rust runtime implements the same analysis in
// rust/src/program_representation/project.rs.
import { syntaxTree } from './program-project-tree.js';
import { analyzeJavaScriptProject } from './program-project-javascript.js';
import { analyzeRustProject } from './program-project-rust.js';
import { analyzeLeanProject } from './program-project-lean.js';
import { analyzeRocqProject } from './program-project-rocq.js';

const ANALYZERS = Object.freeze({
  JavaScript: analyzeJavaScriptProject,
  Rust: analyzeRustProject,
  Lean: analyzeLeanProject,
  Rocq: analyzeRocqProject,
});

const TYPE_KINDS = new Set(['class', 'struct', 'enum', 'trait', 'type', 'structure', 'inductive', 'constructor', 'universe']);
const EFFECT_TRAITS = new Set(['async', 'generator', 'io', 'proof-state']);
const PROOF_KINDS = new Set(['theorem', 'lemma', 'tactic']);
// Tactic steps, and the checked assertions of languages without proof terms.
const PROOF_ROLES = new Set(['tactic', 'assertion', 'const-assertion']);

/**
 * Analyzes an entry program within its project. `parse(source, language)`
 * returns the source mappings of another project file and whether it parsed
 * cleanly. Returns empty results unless the project names an entry file.
 */
export function projectSemantics({ language, source, mappings, bindings, unresolved, project, parse }) {
  const result = {
    modules: [],
    facts: [],
    references: [],
    expansions: [],
    diagnostics: [],
    requests: [],
    resolvedRequests: [],
  };
  if (!project.entry) return result;
  const context = new ProjectContext({ language, source, mappings, bindings, unresolved, project, parse, result });
  ANALYZERS[language](context);
  for (const { path } of context.project.sources) {
    const file = context.parsed.get(path);
    if (file && !file.clean) result.diagnostics.push({ kind: 'project-parse-error', term: path, start: 0, end: 0 });
  }
  return result;
}

export class ProjectContext {
  constructor({ language, source, mappings, bindings, unresolved, project, parse, result }) {
    this.language = language;
    this.project = { ...project, sources: project.sources ?? [] };
    this.bindings = bindings;
    this.unresolved = unresolved;
    this.parse = parse;
    this.result = result;
    this.sources = new Map(this.project.sources.map(({ path, source: text }) => [path, text]));
    this.entry = { path: project.entry, source, tree: syntaxTree(mappings, source), clean: true };
    this.parsed = new Map();
    for (const { path } of this.project.sources) {
      this.fact('project-file', path, path, 0, this.sources.get(path).length);
    }
  }

  has(path) {
    return path === this.entry.path || this.sources.has(path);
  }

  text(path) {
    return path === this.entry.path ? this.entry.source : this.sources.get(path);
  }

  /** Parses a project file once; undefined when the project has no such file. */
  load(path, language = this.language) {
    if (path === this.entry.path) return this.entry;
    if (!this.sources.has(path)) return undefined;
    if (!this.parsed.has(path)) {
      const source = this.sources.get(path);
      const { mappings, clean } = this.parse(source, language);
      this.parsed.set(path, { path, source, tree: syntaxTree(mappings, source), clean });
    }
    return this.parsed.get(path);
  }

  fact(kind, name, file, start, end) {
    this.result.facts.push({ kind, name, file, start, end });
  }

  module(request, module, file, start, end) {
    this.result.modules.push({ request, module, file, start, end });
    this.result.resolvedRequests.push({ name: request, start });
  }

  /** A module request the language-neutral request scan does not see. */
  request(name, start, end) {
    this.result.requests.push({ name, start, end });
  }

  /** Links an entry range to a declaration: {symbol, kind, traits, file, start, end}. */
  reference(role, name, start, end, target) {
    this.result.references.push({
      role,
      name,
      start,
      end,
      symbol: target.symbol,
      targetKind: target.kind,
      traits: [...target.traits],
      file: target.file,
      declaration: { start: target.start, end: target.end },
    });
  }

  expansion(name, kind, start, end, expansion, target) {
    this.result.expansions.push({ name, kind, start, end, expansion, target });
  }

  diagnose(kind, term, start, end) {
    this.result.diagnostics.push({ kind, term, start, end });
  }
}

/** Construct evidence contributed by the project analysis. */
export function projectEvidence(project, result, construct) {
  const entry = project.entry;
  const reference = (item) => ({
    kind: `project-reference:${item.role}:${item.targetKind}`,
    name: item.symbol,
    start: item.start,
    end: item.end,
    file: entry,
  });
  const references = (predicate) => result.references.filter(predicate).map(reference);
  switch (construct) {
    case 'modules-and-imports':
      return [
        ...result.modules.map(({ module, start, end }) => ({ kind: 'project-module', name: module, start, end, file: entry })),
        ...references(({ role }) => role === 'import'),
      ];
    case 'scopes-and-bindings':
      return references(({ role }) => role === 'reference');
    case 'recursive-definitions':
      return references(({ traits }) => traits.includes('recursive'));
    case 'types-and-universes':
      return references(({ targetKind, traits }) => TYPE_KINDS.has(targetKind) || traits.includes('universe-polymorphic'));
    case 'effects':
      return references(({ traits }) => traits.some((trait) => EFFECT_TRAITS.has(trait)));
    case 'attributes':
      return references(({ role }) => role === 'attribute');
    case 'macros-and-notation':
      return references(({ role }) => ['macro', 'notation', 'template-tag'].includes(role));
    case 'proof-terms-and-tactics':
      return references(({ role, targetKind }) => PROOF_ROLES.has(role) || PROOF_KINDS.has(targetKind));
    case 'surface-expansion-elaboration-traces':
      return result.expansions.map(({ kind, target, start, end }) => ({ kind: `expansion:${kind}`, name: target, start, end, file: entry }));
    case 'project-context-and-dependencies':
      return result.facts.map(({ kind, name, file, start, end }) => ({ kind, name, start, end, file }));
    default:
      return [];
  }
}
