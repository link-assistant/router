import { createHash } from 'node:crypto';
import { sourceItems } from './rust-structure.mjs';
import { parseRust } from './vendor/meta-language/translation/rust.js';
import { checkProgram } from './vendor/meta-language/translation/check.js';
import { emitJavaScript } from './vendor/meta-language/translation/emit-javascript.js';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';

export const PIN = 'e46e196db5ec34bf13a73b8645aa38d409737e60';
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? { $bigint: item.toString() } : item instanceof Map ? Object.fromEntries(item) : item) + '\n';
const tsType = type => ({ fixed: 'bigint', nat: 'bigint', int: 'bigint', bool: 'boolean', string: 'string', unit: 'null', float: 'number' })[type.kind] ?? 'unknown';

function relocate(value, offset) {
  if (Array.isArray(value)) return value.map(item => relocate(item, offset));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, key === 'span' && item ? { start: item.start + offset, end: item.end + offset } : relocate(item, offset)]));
}

export function translateSource(source, path = 'input.rs') {
  let structural;
  let structuralDiagnostic = null;
  try { structural = sourceItems(source); }
  catch (error) {
    structural = [{ start: 0, end: source.length, comment: false, term: 'opaque', name: null, tokens: [] }];
    structuralDiagnostic = { kind: 'structure', message: error.message, span: { start: 0, end: source.length } };
  }
  const items = [];
  let offset = 0;
  const append = (start, end, item = {}) => {
    const text = source.slice(start, end);
    const value = { term: item.term ?? 'trivia', name: item.name ?? null, span: { start, end, unit: 'utf16', byteStart: Buffer.byteLength(source.slice(0, start)), byteEnd: Buffer.byteLength(source.slice(0, end)) }, sha256: sha256(text), source: text, status: item.comment || !text.trim() ? 'preserved' : 'carried', diagnostic: structuralDiagnostic, ...item };
    const previous = items.at(-1);
    if (value.status === 'preserved' && previous?.status === 'preserved') {
      previous.source += text;
      previous.sha256 = sha256(previous.source);
      previous.span.end = end;
      previous.span.byteEnd = value.span.byteEnd;
      previous.term = 'trivia';
    } else items.push(value);
  };
  for (const item of structural) {
    if (item.start > offset) append(offset, item.start);
    append(item.start, item.end, { term: item.term, name: item.name, comment: item.comment });
    offset = item.end;
  }
  if (offset < source.length) append(offset, source.length);
  const candidates = new Map();
  const ambiguous = new Set();
  for (const item of items) {
    if (item.status === 'preserved') continue;
    try {
      if (!['fn', 'enum', 'const'].includes(item.term) || item.name === 'main') throw new TranslationError('unsupported', `draft item ${item.term}: no supported library declaration emission`, { start: 0, end: item.source.length });
      const surface = parseRust(item.source + '\nfn main() {}\n');
      if (surface.items.length !== 1 || surface.items[0].k !== 'fn') throw new TranslationError('unsupported', 'data declarations need a module-level type dependency lowering', { start: 0, end: item.source.length });
      item.surface = relocate(surface.items[0], item.span.start);
      if (candidates.has(item.name) || ambiguous.has(item.name)) {
        const previous = candidates.get(item.name);
        if (previous) previous.diagnostic = { kind: 'ambiguous', message: 'duplicate declaration requires conditional compilation resolution', span: { start: previous.span.start, end: previous.span.end } };
        candidates.delete(item.name);
        ambiguous.add(item.name);
        throw new TranslationError('ambiguous', 'duplicate declaration requires conditional compilation resolution', { start: 0, end: item.source.length });
      }
      candidates.set(item.name, item);
    } catch (error) {
      if (!(error instanceof TranslationError)) throw error;
      item.diagnostic = { kind: error.kind, message: error.reason, span: error.span ? { start: item.span.start + error.span.start, end: Math.min(item.span.end, item.span.start + error.span.end) } : { start: item.span.start, end: item.span.end }, details: error.details };
    }
  }
  const surfaceNames = node => {
    if (!node || typeof node !== 'object') return [];
    return [...(node.k === 'name' && node.path?.length === 1 ? node.path : []), ...Object.values(node).flatMap(surfaceNames)];
  };
  const closure = root => {
    const found = new Map();
    const visit = item => {
      if (found.has(item.name)) return;
      found.set(item.name, item);
      for (const name of surfaceNames(item.surface.body)) if (candidates.has(name)) visit(candidates.get(name));
    };
    visit(root);
    return [...found.values()];
  };
  const emissions = new Map();
  for (const item of candidates.values()) {
    try {
      const checked = checkProgram({ language: 'Rust', items: closure(item).map(entry => entry.surface), main: null });
      const emitted = emitJavaScript(checked);
      item.status = 'executable';
      item.semantic = { checkedIR: checked.items[0], encodings: emitted.encodings, assumptions: emitted.assumptions, mappings: emitted.mappings, params: item.surface.params, returns: item.surface.ret };
      emissions.set(item.name, emitted);
    } catch (error) {
      if (!(error instanceof TranslationError)) throw error;
      item.diagnostic = { kind: error.kind, message: error.reason, span: error.span ?? { start: item.span.start, end: item.span.end }, details: error.details };
    }
  }
  // A parsed signature is no implementation. Reject every dependent of a
  // carried function, transitively, before exposing executable definitions.
  const dependencies = node => {
    if (!node || typeof node !== 'object') return [];
    return [...(node.k === 'call' && typeof node.fn === 'string' ? [node.fn] : []), ...Object.values(node).flatMap(dependencies)];
  };
  let changed;
  do {
    changed = false;
    for (const item of candidates.values()) if (item.status === 'executable') {
      const missing = dependencies(item.semantic.checkedIR).filter(name => candidates.has(name) && candidates.get(name).status !== 'executable');
      if (missing.length) {
        item.status = 'carried';
        item.diagnostic = { kind: 'dependency', message: 'called function remains carried', names: [...new Set(missing)], span: { start: item.span.start, end: item.span.end } };
        delete item.semantic;
        changed = true;
      }
    }
  } while (changed);
  for (const item of items) delete item.surface;
  const executable = items.filter(item => item.status === 'executable');
  const preludes = [...new Set(executable.flatMap(item => emissions.get(item.name).preludes))];
  const definitions = [...new Set(executable.flatMap(item => emissions.get(item.name).definitions))];
  const ir = { schemaVersion: 1, kind: 'router-rust-draft', runtimeParity: false, sourceLanguage: 'Rust', targetLanguages: ['JavaScript', 'TypeScript'], sourcePath: path, sourceSha256: sha256(source), sourceBytes: Buffer.byteLength(source), translator: { repository: 'link-foundation/meta-language', commit: PIN, structuralFrontend: 'formal-ai lexer with Router opaque-literal extensions' }, semantics: { integerEncoding: 'BigInt with checked fixed-width arithmetic; usize/isize assume 64 bits', assumptions: ['Rust integer arithmetic uses checked overflow behavior (debug/test profile); release wrapping arithmetic is outside this draft contract', 'String case conversion depends on the source and host Unicode tables'], observation: 'portable pure function results and aborts only; carried items supply no executable behavior' }, counts: { executable: executable.length, carried: items.filter(item => item.status === 'carried').length, preserved: items.filter(item => item.status === 'preserved').length }, items };
  const header = `// Generated draft from ${path}; sha256=${ir.sourceSha256}\n// Carried constructs are data, never runtime parity evidence.\n`;
  const body = [...preludes, ...definitions].join('\n\n');
  const entries = executable.map(item => emissions.get(item.name).mappings.find(mapping => mapping.source === item.name)?.target ?? item.name);
  const runtimeEntries = entries.map((entry, index) => executable[index].term === 'const' ? `${JSON.stringify(entry)}: ${entry}()` : entry);
  const runtime = `${header}${body}\n\nexport const translated = { ${runtimeEntries.join(', ')} };\nexport const provenance = ${JSON.stringify({ sourcePath: path, sourceSha256: ir.sourceSha256, ...ir.counts, runtimeParity: false })};\n`;
  const types = executable.map((item, index) => `${JSON.stringify(entries[index])}: ${item.term === 'const' ? tsType(item.semantic.returns) : `(${item.semantic.params.map(param => `${param.name}: ${tsType(param.type)}`).join(', ')}) => ${tsType(item.semantic.returns)}`}`).join('; ');
  const parameterTypes = new Map(executable.flatMap(item => item.semantic.mappings.filter(mapping => mapping.source === item.name).map(mapping => [mapping.target, item.semantic.params])));
  const typedRuntime = runtime.replace(/function ([A-Za-z_$][A-Za-z0-9_$]*)\(([^)]*)\)/gu, (_, name, params) => {
    const known = parameterTypes.get(name);
    const annotated = params.split(',').filter(param => param.trim()).map((param, index) => `${param.trim()}: ${known?.[index] ? tsType(known[index].type) : 'any'}`);
    return `function ${name}(${annotated.join(', ')})`;
  });
  const typescript = typedRuntime.replace('export const translated =', `export const translated: { ${types} } =`);
  return { ir, javascript: runtime, typescript };
}
