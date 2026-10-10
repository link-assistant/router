import { createHash } from 'node:crypto';
import { sourceItems } from './rust-structure.mjs';
import { parseRust, checkProgram, emitJavaScript } from './extensions/strings.mjs';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';
import { tokenize } from './vendor/meta-language/translation/lexer.js';

export const PIN = 'e46e196db5ec34bf13a73b8645aa38d409737e60';
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? { $bigint: item.toString() } : item instanceof Map ? Object.fromEntries(item) : item) + '\n';
const tsType = (type, dataTypes = []) => {
  if (type.kind === 'array') return `ReadonlyArray<${tsType(type.element, dataTypes)}>`;
  if (type.kind === 'data') {
    const definition = dataTypes.find(entry => entry.fullName === type.name);
    if (!definition) return 'unknown';
    return definition.ctors.map(ctor => `Readonly<{ $: ${JSON.stringify(ctor.name)}${ctor.fields.map(field => `; ${field.name}: ${tsType(field.type, dataTypes)}`).join('')} }>`).join(' | ');
  }
  return ({ fixed: 'bigint', nat: 'bigint', int: 'bigint', bool: 'boolean', string: 'string', unit: 'null', float: 'number' })[type.kind] ?? 'unknown';
};

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
      const declarations = surface.items.filter(entry => !entry.generated);
      if (declarations.length !== 1 || declarations[0].k !== 'fn') throw new TranslationError('unsupported', 'data declarations need a module-level type dependency lowering', { start: 0, end: item.source.length });
      item.surface = relocate(declarations[0], item.span.start);
      item.supportTypes = surface.items.filter(entry => entry.generated).map(entry => relocate(entry, item.span.start));
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
      const group = closure(item);
      const supportTypes = [...new Map(group.flatMap(entry => entry.supportTypes.map(type => [type.name, type]))).values()];
      const checked = checkProgram({ language: 'Rust', items: [...group.map(entry => entry.surface), ...supportTypes], main: null });
      const emitted = emitJavaScript(checked);
      item.status = 'executable';
      const own = checked.declarations.get(item.surface.name);
      item.semantic = { checkedIR: own, dataTypes: [...checked.declarations.values()].filter(entry => entry.k === 'data'), encodings: emitted.encodings, assumptions: emitted.assumptions, mappings: emitted.mappings, params: own.params, returns: own.ret };
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
  for (const item of items) { delete item.surface; delete item.supportTypes; }
  const executable = items.filter(item => item.status === 'executable');
  const preludes = [...new Set(executable.flatMap(item => emissions.get(item.name).preludes))];
  const definitions = [...new Set(executable.flatMap(item => emissions.get(item.name).definitions))];
  const ir = { schemaVersion: 1, kind: 'router-rust-draft', runtimeParity: false, sourceLanguage: 'Rust', targetLanguages: ['JavaScript', 'TypeScript'], sourcePath: path, sourceSha256: sha256(source), sourceBytes: Buffer.byteLength(source), translator: { repository: 'link-foundation/meta-language', commit: PIN, structuralFrontend: 'formal-ai lexer with Router opaque-literal extensions', extensions: ['checked Rust strings and scalar domain', 'monomorphic Option/Result and immutable vectors', 'Rust raw literals and ASCII continuation normalization'] }, semantics: { integerEncoding: 'BigInt with checked fixed-width arithmetic; usize/isize assume 64 bits', assumptions: ['Rust integer arithmetic uses checked overflow behavior (debug/test profile); release wrapping arithmetic is outside this draft contract', 'String case conversion depends on the source and host Unicode tables', 'const fn is lowered for pure runtime calls only; compile-time evaluability is not established', 'Immutable strings encode scalar values; monomorphic tagged values encode Option/Result; vectors/slices are immutable arrays'], observation: 'portable pure function results and aborts only; carried items supply no executable behavior' }, counts: { executable: executable.length, executableFunctions: executable.filter(item => item.term === 'fn').length, executableConstants: executable.filter(item => item.term === 'const').length, carried: items.filter(item => item.status === 'carried').length, preserved: items.filter(item => item.status === 'preserved').length }, items };
  const header = `// Generated draft from ${path}; sha256=${ir.sourceSha256}\n// Carried constructs are data, never runtime parity evidence.\n`;
  const body = [...preludes, ...definitions].join('\n\n');
  const entries = executable.map(item => emissions.get(item.name).mappings.find(mapping => mapping.source === item.name)?.target ?? item.name);
  const runtimeEntries = entries.map((entry, index) => executable[index].term === 'const' ? `${JSON.stringify(entry)}: ${entry}()` : entry);
  const runtime = `${header}${body}\n\nexport const translated = { ${runtimeEntries.join(', ')} };\nexport const provenance = ${JSON.stringify({ sourcePath: path, sourceSha256: ir.sourceSha256, ...ir.counts, runtimeParity: false })};\n`;
  const dataTypes = [...new Map(executable.flatMap(item => item.semantic.dataTypes.map(entry => [entry.fullName, entry]))).values()];
  const types = executable.map((item, index) => `${JSON.stringify(entries[index])}: ${item.term === 'const' ? tsType(item.semantic.returns, dataTypes) : `(${item.semantic.params.map(param => `${param.name}: ${tsType(param.type, dataTypes)}`).join(', ')}) => ${tsType(item.semantic.returns, dataTypes)}`}`).join('; ');
  const parameterTypes = new Map(executable.flatMap(item => item.semantic.mappings.filter(mapping => mapping.source === item.name).map(mapping => [mapping.target, item.semantic.params])));
  const tokens = tokenize(runtime, 'JavaScript').tokens;
  const annotations = [];
  const helperTypes = {
    ml_natSub: ['bigint', 'bigint'],
    ml_fixed: ['bigint', 'bigint', 'bigint', 'string'],
    ml_divide: ['bigint', 'bigint', 'string', 'string | null', 'boolean', '[bigint, bigint, string] | null'],
    ml_toNatChecked: ['bigint', 'string'],
    ml_abort: ['string'],
    ml_assert: ['boolean', 'string'],
    ml_showNumber: ['number'],
    ml_at: ['any[]', 'number | bigint'],
    ml_forall: ['any[]', '(value: any) => boolean'],
    ml_router_strip: ['string', 'string', 'boolean'],
    ml_router_unwrap: ['any', 'any', 'boolean'],
    ml_router_unexpected: ['any'],
  };
  for (let at = 0; at < tokens.length; at++) {
    if (tokens[at].kind !== 'identifier' || tokens[at].value !== 'function' || tokens[at + 2]?.value !== '(') continue;
    const name = tokens[at + 1].value;
    const known = parameterTypes.get(name);
    const helper = helperTypes[name];
    let index = 0;
    for (let parameter = at + 3; tokens[parameter]?.value !== ')'; parameter++) {
      if (tokens[parameter].kind !== 'identifier') continue;
      annotations.push({ offset: tokens[parameter].end, text: `: ${known?.[index] ? tsType(known[index].type, dataTypes) : helper?.[index] ?? 'any'}` });
      index++;
    }
    if (['ml_abort', 'ml_router_unexpected'].includes(name)) {
      const close = tokens.find((token, index) => index > at + 2 && token.value === ')');
      annotations.push({ offset: close.end, text: ': never' });
    }
  }
  let typedRuntime = runtime;
  for (const { offset, text } of annotations.sort((a, b) => b.offset - a.offset)) typedRuntime = typedRuntime.slice(0, offset) + text + typedRuntime.slice(offset);
  const typescript = typedRuntime.replace('export const translated =', `export const translated: { ${types} } =`);
  return { ir, javascript: runtime, typescript };
}
