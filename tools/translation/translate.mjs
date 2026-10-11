import { createHash } from 'node:crypto';
import { sourceItems } from './rust-structure.mjs';
import { parseRust, checkProgram, emitJavaScript } from './extensions/iterators.mjs';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';
import { tokenize } from './vendor/meta-language/translation/lexer.js';
import { roundTripProgram } from './semantic-meta.mjs';

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
  const layouts = new Map();
  const ambiguous = new Set();
  for (const item of items) {
    if (item.status === 'preserved') continue;
    try {
      if (!['fn', 'enum', 'struct', 'const'].includes(item.term) || item.name === 'main') throw new TranslationError('unsupported', `draft item ${item.term}: no supported library declaration emission`, { start: 0, end: item.source.length });
      const surface = parseRust(item.source + '\nfn main() {}\n');
      const declarations = surface.items.filter(entry => !entry.generated);
      if (declarations.length !== 1 || !['fn', 'data'].includes(declarations[0].k)) throw new TranslationError('unsupported', 'item requires module-level declaration lowering', { start: 0, end: item.source.length });
      item.surface = relocate(declarations[0], item.span.start);
      item.supportTypes = surface.items.filter(entry => entry.generated).map(entry => relocate(entry, item.span.start));
      const table = declarations[0].k === 'data' ? layouts : candidates;
      if (candidates.has(item.name) || layouts.has(item.name) || ambiguous.has(item.name)) {
        const previous = candidates.get(item.name) ?? layouts.get(item.name);
        if (previous) previous.diagnostic = { kind: 'ambiguous', message: 'duplicate declaration requires conditional compilation resolution', span: { start: previous.span.start, end: previous.span.end } };
        candidates.delete(item.name); layouts.delete(item.name);
        ambiguous.add(item.name);
        throw new TranslationError('ambiguous', 'duplicate declaration requires conditional compilation resolution', { start: 0, end: item.source.length });
      }
      table.set(item.name, item);
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
  const layoutClosure = declarations => {
    const found = new Map();
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      const names = node.kind === 'named' ? [node.path.at(-1)] : ['routerRecord', 'name'].includes(node.k) ? [node.path?.[0]] : [];
      for (const name of names) if (layouts.has(name) && !found.has(name)) {
        const item = layouts.get(name); found.set(name, item.surface); visit(item.surface);
        item.supportTypes.forEach(type => { if (!found.has(type.name)) { found.set(type.name, type); visit(type); } });
      }
      for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else visit(value);
    };
    declarations.forEach(visit);
    return [...found.values()];
  };
  for (const item of layouts.values()) {
    try {
      const layout = item.surface;
      const constructors = layout.ctors.map(ctor => ({ k: 'fn', generated: 'router-data-constructor', name: `ml_make_${layout.name}_${ctor.name}`, params: ctor.fields.map((field, index) => ({ name: field.name ?? `field${index}`, type: field.type, span: layout.span })), ret: { kind: 'named', path: [layout.name] }, body: { k: 'app', fn: { k: 'name', path: [layout.name, ctor.name], span: layout.span }, args: ctor.fields.map((field, index) => ({ k: 'name', path: [field.name ?? `field${index}`], span: layout.span })), span: layout.span }, span: layout.span }));
      const support = [...new Map([layout, ...layoutClosure([layout]), ...item.supportTypes].map(type => [type.name, type])).values()];
      const checked = roundTripProgram(checkProgram({ language: 'Rust', items: [...support, ...constructors], main: null }));
      const emitted = emitJavaScript(checked);
      item.status = 'executable';
      const own = checked.declarations.get(layout.name);
      item.semantic = { checkedIR: own, dataTypes: [...checked.declarations.values()].filter(entry => entry.k === 'data'), encodings: emitted.encodings, assumptions: emitted.assumptions, mappings: emitted.mappings, constructors: constructors.map(ctor => checked.declarations.get(ctor.name)), params: [], returns: { kind: 'data', name: layout.name } };
      emissions.set(item.name, emitted);
    } catch (error) {
      if (!(error instanceof TranslationError)) throw error;
      item.diagnostic = { kind: error.kind, message: error.reason, span: error.span ?? { start: item.span.start, end: item.span.end }, details: error.details };
    }
  }
  for (const item of candidates.values()) {
    try {
      const group = closure(item);
      const supportTypes = [...new Map([...group.flatMap(entry => entry.supportTypes), ...layoutClosure(group.map(entry => entry.surface))].map(type => [type.name, type])).values()];
      const checked = roundTripProgram(checkProgram({ language: 'Rust', items: [...group.map(entry => entry.surface), ...supportTypes], main: null }));
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
  const ir = { schemaVersion: 1, kind: 'router-rust-draft', runtimeParity: false, sourceLanguage: 'Rust', targetLanguages: ['JavaScript', 'TypeScript'], sourcePath: path, sourceSha256: sha256(source), sourceBytes: Buffer.byteLength(source), translator: { repository: 'link-foundation/meta-language', commit: PIN, structuralFrontend: 'formal-ai lexer with Router opaque-literal extensions', pipeline: 'Rust syntax → serialized/reparsed checked semantic IR → JavaScript/TypeScript', extensions: ['checked Rust strings and scalar domain', 'monomorphic Option/Result and immutable vectors', 'Rust raw literals and ASCII continuation normalization', 'checked mutable scalar control flow and immutable slice indexing', 'module-local immutable records and algebraic constructors'] }, semantics: { integerEncoding: 'BigInt with checked fixed-width arithmetic; usize/isize assume 64 bits', assumptions: ['Rust integer arithmetic uses checked overflow behavior (debug/test profile); release wrapping arithmetic is outside this draft contract', 'String case conversion depends on the source and host Unicode tables', 'const fn is lowered for pure runtime calls only; compile-time evaluability is not established', 'Immutable strings encode scalar values; monomorphic tagged values encode Option/Result; vectors/slices are immutable arrays'], observation: 'portable value results, local scalar mutation, immutable constructors and aborts; carried items supply no executable behavior' }, counts: { executable: executable.length, executableFunctions: executable.filter(item => item.term === 'fn').length, executableConstants: executable.filter(item => item.term === 'const').length, executableTypes: executable.filter(item => item.semantic.constructors).length, executableConstructors: executable.reduce((sum, item) => sum + (item.semantic.constructors?.length ?? 0), 0), carried: items.filter(item => item.status === 'carried').length, preserved: items.filter(item => item.status === 'preserved').length }, items };
  const header = `// Generated draft from ${path}; sha256=${ir.sourceSha256}\n// Carried constructs are data, never runtime parity evidence.\n`;
  const body = [...preludes, ...definitions].join('\n\n');
  const entries = executable.map(item => item.semantic.constructors ? item.name : emissions.get(item.name).mappings.find(mapping => mapping.source === item.name)?.target ?? item.name);
  const constructorTarget = (item, ctor) => emissions.get(item.name).mappings.find(mapping => mapping.source === ctor.fullName).target;
  const runtimeEntries = entries.map((entry, index) => {
    const item = executable[index];
    if (item.semantic.constructors) return `[${JSON.stringify(entry)}]: ${item.term === 'struct' ? constructorTarget(item, item.semantic.constructors[0]) : `Object.freeze({ ${item.semantic.constructors.map((ctor, index) => `[${JSON.stringify(item.semantic.checkedIR.ctors[index].name)}]: ${constructorTarget(item, ctor)}`).join(', ')} })`}`;
    return item.term === 'const' ? `${JSON.stringify(entry)}: ${entry}()` : entry;
  });
  const runtime = `${header}${body}\n\nexport const translated = { ${runtimeEntries.join(', ')} };\nexport const provenance = ${JSON.stringify({ sourcePath: path, sourceSha256: ir.sourceSha256, ...ir.counts, runtimeParity: false })};\n`;
  const dataTypes = [...new Map(executable.flatMap(item => item.semantic.dataTypes.map(entry => [entry.fullName, entry]))).values()];
  const signature = (params, returns) => `(${params.map(param => `${param.name}: ${tsType(param.type, dataTypes)}`).join(', ')}) => ${tsType(returns, dataTypes)}`;
  const types = executable.map((item, index) => `${JSON.stringify(entries[index])}: ${item.semantic.constructors ? item.term === 'struct' ? signature(item.semantic.constructors[0].params, item.semantic.returns) : `Readonly<{ ${item.semantic.constructors.map((ctor, index) => `${JSON.stringify(item.semantic.checkedIR.ctors[index].name)}: ${signature(ctor.params, item.semantic.returns)}`).join('; ')} }>` : item.term === 'const' ? tsType(item.semantic.returns, dataTypes) : signature(item.semantic.params, item.semantic.returns)}`).join('; ');
  const parameterTypes = new Map(executable.flatMap(item => item.semantic.constructors ? item.semantic.constructors.map(ctor => [constructorTarget(item, ctor), ctor.params]) : item.semantic.mappings.filter(mapping => mapping.source === item.name).map(mapping => [mapping.target, item.semantic.params])));
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
    ml_at: ['ReadonlyArray<any>', 'number | bigint'],
    ml_forall: ['any[]', '(value: any) => boolean'],
    ml_router_strip: ['string', 'string', 'boolean'],
    ml_router_unwrap: ['any', 'any', 'boolean'],
    ml_router_unexpected: ['any'],
    ml_router_array: ['ReadonlyArray<any>', '(value: any) => boolean'],
    ml_router_iter: ['ReadonlyArray<any>'],
    ml_router_map: ['Iterable<any>', '(value: any) => any'],
    ml_router_filter: ['Iterable<any>', '(value: any) => boolean'],
    ml_router_take: ['Iterator<any>', 'bigint'],
    ml_router_collect: ['Iterable<any>'],
    ml_router_count: ['Iterable<any>'],
    ml_router_any: ['Iterable<any>', '(value: any) => boolean'],
    ml_router_all: ['Iterable<any>', '(value: any) => boolean'],
    ml_router_fold: ['Iterable<any>', 'any', '(accumulator: any, value: any) => any'],
  };
  for (let at = 0; at < tokens.length; at++) {
    if (tokens[at].kind !== 'identifier' || tokens[at].value !== 'function') continue;
    const nameAt = at + (tokens[at + 1]?.value === '*' ? 2 : 1);
    if (tokens[nameAt + 1]?.value !== '(') continue;
    const name = tokens[nameAt].value;
    const known = parameterTypes.get(name);
    const helper = helperTypes[name];
    let index = 0;
    for (let parameter = nameAt + 2; tokens[parameter]?.value !== ')'; parameter++) {
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
