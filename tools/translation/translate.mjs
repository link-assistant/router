import { createHash } from 'node:crypto';
import { posix } from 'node:path';
import { sourceItems,rustTokens } from './rust-structure.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import { parseRust, checkProgram, emitJavaScript } from './extensions/host-contracts.mjs';
import {standaloneMatchesMacroContext} from './matches-macro-context.mjs';
import {captureOriginalCargoEdition} from './cargo-edition-context.mjs';
import {typeScriptType,typeScriptAliases} from './type-layout.mjs';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';
import { tokenize } from './vendor/meta-language/translation/lexer.js';
import { roundTripProgram } from './semantic-meta.mjs';
import {relocateSourceLink} from './extensions/source-links.mjs';
import {DEFAULT_JSON_PARSER_PROFILE,actualJsonCapabilityProfile} from './json-capabilities.mjs';

export const PIN = 'e46e196db5ec34bf13a73b8645aa38d409737e60';
export const sha256 = text => createHash('sha256').update(text).digest('hex');
export const json = value => JSON.stringify(value, (_, item) => typeof item === 'bigint' ? { $bigint: item.toString() } : item instanceof Map ? Object.fromEntries(item) : item) + '\n';
export const typeParameterName = (name, index) => /^[A-Za-z_$][A-Za-z0-9_$]*$/u.test(name) && !new Set('break case catch class const continue debugger default delete do else enum export extends false finally for function if import in instanceof new null return super switch this throw true try typeof var void while with yield await let static implements interface package private protected public arguments eval'.split(' ')).has(name) ? name : `arg${index}`;
export const tsType = (type, dataTypes = []) => {
  if (type.kind === 'routerFuture') return `PromiseLike<${tsType(type.value, dataTypes)}>`;
  if (['array','data','named'].includes(type.kind))return typeScriptType(type,new Map(dataTypes.map(entry=>[entry.fullName,entry])));
  return ({ fixed: 'bigint', nat: 'bigint', int: 'bigint', bool: 'boolean', string: 'string', unit: 'null', float: 'number' })[type.kind] ?? 'unknown';
};

// Different checked dependency closures can use overlapping host contracts.
// Merge their generated named imports structurally, retaining module order and
// every binding; string-set deduplication alone cannot merge partial groups.
export function mergePreludeImports(preludes) {
  const modules=new Map(),locals=new Map(),result=[];
  for(const text of preludes){
    if(!/^import\s*\{/u.test(text)){result.push(text);continue;}
    const tokens=tokenize(text,'JavaScript').tokens;let at=2;const bindings=[];
    while(tokens[at]?.value!=='}'){
      const imported=tokens[at++];if(imported?.kind!=='identifier')throw new Error('invalid generated import binding');
      let local=imported.value;if(tokens[at]?.value==='as'){at++;const name=tokens[at++];if(name?.kind!=='identifier')throw new Error('invalid generated import alias');local=name.value;}
      bindings.push({imported:imported.value,local});if(tokens[at]?.value===',')at++;else if(tokens[at]?.value!=='}')throw new Error('invalid generated import separator');
    }
    at++;if(tokens[at++]?.value!=='from'||tokens[at]?.kind!=='string')throw new Error('invalid generated import module');const module=tokens[at++].value;
    if(tokens[at++]?.value!==';'||tokens[at]?.kind!=='eof')throw new Error('invalid generated import terminator');
    if(!modules.has(module)){modules.set(module,new Map());result.push({module});}
    const entries=modules.get(module);
    for(const binding of bindings){const previous=locals.get(binding.local);if(previous&&(previous.module!==module||previous.imported!==binding.imported))throw new Error('conflicting generated import alias '+binding.local);locals.set(binding.local,{module,...binding});entries.set(binding.local,binding.imported);}
  }
  return result.map(item=>typeof item==='string'?item:`import { ${[...modules.get(item.module)].map(([local,imported])=>imported===local?local:imported+' as '+local).join(', ')} } from ${JSON.stringify(item.module)};`);
}

function relocate(value, offset) {
  if (Array.isArray(value)) return value.map(item => relocate(item, offset));
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, ['copyCertificate','sourceParameterPatterns','sourceParameterPattern','sourcePattern','constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceBoolFromScope'].includes(key)?item:['span','subjectSyntaxSpan','patternSpan'].includes(key) && item ? { start: item.start + offset, end: item.end + offset } : relocate(item, offset)]));
}

export function translateSource(source, path = 'input.rs', { projectDeclarations = [],projectSourceScopes=[],jsonParserProfile:parserProfile,cargoManifest } = {}) {
  const macroEvidence=macroProvenance(source),sourceHash=sha256(source);
  const matchingScopes=projectSourceScopes.filter(entry=>entry.source===path&&entry.sha256===sourceHash&&(!entry.sourceView||entry.sourceView.modulePath.length===0));
  const sourceScope=matchingScopes.length===1?matchingScopes[0]:null;
  const jsonParserProfile=parserProfile??(matchingScopes.length?(sourceScope?.jsonParserProfile??actualJsonCapabilityProfile()):DEFAULT_JSON_PARSER_PROFILE);
  const runtimeModule = posix.relative(posix.dirname(path), 'runtime/effects.mjs');
  const emit = program => {
    const emitted = emitJavaScript(program, { runtimeModule: runtimeModule.startsWith('.') ? runtimeModule : './' + runtimeModule, reserved: [...candidates.keys(), ...layouts.keys()] });
    return { ...emitted, signatures: [...program.declarations.values()].filter(entry => entry.k === 'fn').map(entry => ({ target: emitted.mappings.find(mapping => mapping.source === entry.fullName)?.target, params: entry.params, ret: entry.async ? { kind: 'routerFuture', value: entry.ret } : entry.ret })) };
  };
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
  let standaloneOriginalContext=null,standaloneContextError=null;
  if(!sourceScope)try{standaloneOriginalContext=standaloneMatchesMacroContext(source,{file:path,cargoEditionContext:cargoManifest===undefined||cargoManifest===null?null:captureOriginalCargoEdition(cargoManifest)});}catch(error){standaloneContextError=error;}
  const candidates = new Map();
  const layouts = new Map();
  const ambiguous = new Set();
  for (const item of items) {
    if (item.status === 'preserved') continue;
    try {
      if(sourceScope?.compilationProfile){
        item.configuration=itemConfiguration(rustTokens(item.source),sourceScope.compilationProfile);
        if(sourceScope.configurationCondition!=='active'||item.configuration.status!=='active')throw new TranslationError('configuration','source item requires an active checked compilation condition',{start:0,end:item.source.length});
      }
      if (!['fn', 'enum', 'struct', 'const'].includes(item.term) || item.name === 'main') throw new TranslationError('unsupported', `draft item ${item.term}: no supported library declaration emission`, { start: 0, end: item.source.length });
      if(standaloneContextError)throw standaloneContextError;
      const surface = parseRust(item.source + '\nfn main() {}\n', { macroEvidence, sourceScope, standaloneSourceContext:standaloneOriginalContext?{context:standaloneOriginalContext,file:path,offset:item.span.start}:null, shadowedPreludeTypes: new Set(items.filter(entry=>['enum','struct','type','mod'].includes(entry.term)).map(entry=>entry.name)), shadowedEffectRoots: new Set(items.filter(entry => entry.term === 'mod' && ['std', 'tokio','serde_json'].includes(entry.name)).map(entry => entry.name)) });
      const declarations = surface.items.filter(entry => !entry.generated);
      if (declarations.length !== 1 || !['fn', 'data'].includes(declarations[0].k)) throw new TranslationError('unsupported', 'item requires module-level declaration lowering', { start: 0, end: item.source.length });
      item.surface = relocate(declarations[0], item.span.start);
      relocateSourceLink(declarations[0],item.surface,{source,sourcePath:path,itemSpan:{start:item.span.start,end:item.span.end},scope:{sourceScope:sourceScope?.scope??null,macroEvidence,compilationProfile:sourceScope?.compilationProfile??null,configurationCondition:sourceScope?.configurationCondition??null}});
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
  // Whole-source namespace resolution qualifies actual root declarations.
  // Only the actual crate root can feed this standalone root-item closure.
  const rootName=path=>Array.isArray(path)?path.length===1?path[0]:path[0]==='crate'&&path.length===2?path[1]:null:null;
  const surfaceNames = node => {
    if (!node || typeof node !== 'object') return [];
    const constantPattern=['bind','bindOrCtor'].includes(node.k)&&candidates.get(node.name)?.surface.constant;
    return [...(node.k === 'name' && rootName(node.path) ? [rootName(node.path)] : constantPattern?[node.name]:[]), ...Object.values(node).flatMap(surfaceNames)];
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
  // Conditional variants can share a source name; their emissions belong to
  // the exact item identity rather than the name of an inactive sibling.
  const emissions = new Map();
  const layoutClosure = declarations => {
    const found = new Map();
    const visit = node => {
      if (!node || typeof node !== 'object') return;
      const names = node.kind === 'named' ? [rootName(node.path)] : ['routerRecord', 'name'].includes(node.k) ? [rootName(node.path)??(node.path?.[0]==='crate'&&node.path.length===3?node.path[1]:node.path?.length===2?node.path[0]:null)] : [];
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
      const checked = roundTripProgram(checkProgram({ language: 'Rust', items: [...support, ...constructors], main: null },{jsonParserProfile}));
      const emitted = emit(checked);
      item.status = 'executable';
      const own = checked.declarations.get(layout.name);
      item.semantic = { checkedIR: own, dataTypes: [...checked.declarations.values()].filter(entry => entry.k === 'data'), encodings: emitted.encodings, assumptions: emitted.assumptions, mappings: emitted.mappings, constructors: constructors.map(ctor => checked.declarations.get(ctor.name)), params: [], returns: { kind: 'data', name: layout.name } };
      emissions.set(item, emitted);
    } catch (error) {
      if (!(error instanceof TranslationError)) throw error;
      item.diagnostic = { kind: error.kind, message: error.reason, span: error.span ?? { start: item.span.start, end: item.span.end }, details: error.details };
    }
  }
  for (const item of candidates.values()) {
    try {
      const group = closure(item);
      const supportTypes = [...new Map([...group.flatMap(entry => entry.supportTypes), ...layoutClosure(group.map(entry => entry.surface))].map(type => [type.name, type])).values()];
      const checked = roundTripProgram(checkProgram({ language: 'Rust', items: [...group.map(entry => entry.surface), ...supportTypes], main: null },{jsonParserProfile}));
      const emitted = emit(checked);
      item.status = 'executable';
      const own = checked.declarations.get(item.surface.name);
      item.semantic = { checkedIR: own, dataTypes: [...checked.declarations.values()].filter(entry => entry.k === 'data'), encodings: emitted.encodings, assumptions: emitted.assumptions, mappings: emitted.mappings, params: own.params, returns: own.async ? { kind: 'routerFuture', value: own.ret } : own.ret };
      emissions.set(item, emitted);
    } catch (error) {
      if (!(error instanceof TranslationError)) throw error;
      item.diagnostic = { kind: error.kind, message: error.reason, span: error.span ?? { start: item.span.start, end: item.span.end }, details: error.details };
    }
  }
  for (const item of items.filter(item => ['fn', 'const'].includes(item.term) && (item.status === 'carried'||matchingScopes.length))) {
    if(item.configuration&&item.configuration.status!=='active'||sourceScope?.compilationProfile&&sourceScope.configurationCondition!=='active')continue;
    const contexts = projectDeclarations.filter(entry => entry.source === path && entry.sourceSha256 === sourceHash && entry.name === item.name && entry.span.start === item.span.start && entry.span.end === item.span.end);
    // A source reached through two crate roots may have different bindings.
    // Keep that ambiguity carried rather than selecting a guessed namespace.
    if (contexts.length !== 1) {if(matchingScopes.length){item.status='carried';emissions.delete(item);item.diagnostic={kind:'module-binding',message:matchingScopes.length>1?'source has ambiguous crate compilation contexts':'body has no checked implementation in its resolved crate scope',span:item.span};}continue;}
    const context = contexts[0];if(sourceScope&&context.project!==sourceScope.project)continue;const { own, program, emitted } = context.lower({ runtimeModule: runtimeModule.startsWith('.') ? runtimeModule : './' + runtimeModule });
    item.status = 'executable'; item.diagnostic = null;
    item.semantic = { checkedIR: own, dataTypes: [...program.declarations.values()].filter(entry => entry.k === 'data'), encodings: emitted.encodings, assumptions: emitted.assumptions, mappings: emitted.mappings, params: own.params, returns: own.async ? { kind: 'routerFuture', value: own.ret } : own.ret, project: { entry: context.project, declaration: context.qualifiedName } };
    emissions.set(item, emitted);
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
  const preludes = mergePreludeImports([...new Set(executable.flatMap(item => emissions.get(item).preludes))]);
  const definitions = [...new Set(executable.flatMap(item => emissions.get(item).definitions))];
  const ir = { schemaVersion: 1, kind: 'router-rust-draft', runtimeParity: false, jsonParserProfile, compilationProfile:sourceScope?.compilationProfile??null, configurationCondition:sourceScope?.configurationCondition??null, sourceLanguage: 'Rust', targetLanguages: ['JavaScript', 'TypeScript'], sourcePath: path, sourceSha256: sha256(source), sourceBytes: Buffer.byteLength(source), translator: { repository: 'link-foundation/meta-language', commit: PIN, structuralFrontend: 'formal-ai lexer with Router opaque-literal extensions', pipeline: 'Rust syntax → serialized/reparsed checked semantic IR → JavaScript/TypeScript', extensions: ['checked Rust strings and scalar domain', 'monomorphic Option/Result and immutable vectors', 'Rust raw literals and ASCII continuation normalization', 'checked mutable scalar control flow and immutable slice indexing', 'module-local immutable records and algebraic constructors', 'lazy typed scalar iterators, contextual closures and bounded integer ranges', 'checked standard-library filesystem/environment reads, lazy async futures and identity-error propagation'] }, semantics: { integerEncoding: 'BigInt with checked fixed-width arithmetic; usize/isize assume 64 bits', assumptions: ['Rust integer arithmetic uses checked overflow behavior (debug/test profile); release wrapping arithmetic is outside this draft contract', 'String case conversion depends on the source and host Unicode tables', 'Concrete admitted constants require bounded checked evaluation with original parser source links; const fn runtime eligibility alone proves no all-input compile-time behavior', 'Immutable strings encode scalar values; monomorphic tagged values encode Option/Result; vectors/slices are immutable arrays'], observation: 'checked value results, local scalar mutation, immutable constructors, lazy future polling and named host effects; carried items supply no executable behavior' }, counts: { executable: executable.length, executableFunctions: executable.filter(item => item.term === 'fn').length, executableConstants: executable.filter(item => item.term === 'const').length, executableTypes: executable.filter(item => item.semantic.constructors).length, executableConstructors: executable.reduce((sum, item) => sum + (item.semantic.constructors?.length ?? 0), 0), carried: items.filter(item => item.status === 'carried').length, preserved: items.filter(item => item.status === 'preserved').length }, items };
  const header = `// Generated draft from ${path}; sha256=${ir.sourceSha256}\n// Carried constructs are data, never runtime parity evidence.\n`;
  const body = [...preludes, ...definitions].join('\n\n');
  const entries = executable.map(item => item.name);
  const constructorTarget = (item, ctor) => emissions.get(item).mappings.find(mapping => mapping.source === ctor.fullName).target;
  const runtimeEntries = entries.map((entry, index) => {
    const item = executable[index];
    if (item.semantic.project) { const target = emissions.get(item).mappings.find(mapping => mapping.source === item.name).target; return `[${JSON.stringify(entry)}]: ${target}${item.term === 'const' ? '()' : ''}`; }
    if (item.semantic.constructors) return `[${JSON.stringify(entry)}]: ${item.term === 'struct' ? constructorTarget(item, item.semantic.constructors[0]) : `Object.freeze({ ${item.semantic.constructors.map((ctor, index) => `[${JSON.stringify(item.semantic.checkedIR.ctors[index].name)}]: ${constructorTarget(item, ctor)}`).join(', ')} })`}`;
    const target=emissions.get(item).mappings.find(mapping=>mapping.source===item.name)?.target??item.name;
    return `[${JSON.stringify(entry)}]: ${target}${item.term === 'const' ? '()' : ''}`;
  });
  const runtime = `${header}${body}\n\nexport const translated = { ${runtimeEntries.join(', ')} };\nexport const provenance = ${JSON.stringify({ sourcePath: path, sourceSha256: ir.sourceSha256, ...ir.counts, runtimeParity: false })};\n`;
  const dataTypes = [...new Map(executable.flatMap(item => item.semantic.dataTypes.map(entry => [entry.fullName, entry]))).values()];
  const signature = (params, returns) => `(${params.map((param, index) => `${typeParameterName(param.name, index)}: ${tsType(param.type, dataTypes)}`).join(', ')}) => ${tsType(returns, dataTypes)}`;
  const types = executable.map((item, index) => `${JSON.stringify(entries[index])}: ${item.semantic.constructors ? item.term === 'struct' ? signature(item.semantic.constructors[0].params, item.semantic.returns) : `Readonly<{ ${item.semantic.constructors.map((ctor, index) => `${JSON.stringify(item.semantic.checkedIR.ctors[index].name)}: ${signature(ctor.params, item.semantic.returns)}`).join('; ')} }>` : item.term === 'const' ? tsType(item.semantic.returns, dataTypes) : signature(item.semantic.params, item.semantic.returns)}`).join('; ');
  const parameterTypes = new Map(executable.flatMap(item => item.semantic.constructors ? item.semantic.constructors.map(ctor => [constructorTarget(item, ctor), ctor.params]) : item.semantic.mappings.filter(mapping => mapping.source === item.name).map(mapping => [mapping.target, item.semantic.params])));
  const returnTypes = new Map();
  for (const item of executable) for (const signature of emissions.get(item).signatures ?? []) { if (signature.target) { parameterTypes.set(signature.target, signature.params); returnTypes.set(signature.target, signature.ret); } }
  const typedRuntime = annotateRuntimeTypes(runtime, parameterTypes, dataTypes, returnTypes);
  const typescript = typedRuntime.replace('export const translated =', `export const translated: { ${types} } =`);
  return { ir, javascript: runtime, typescript };
}

export function annotateRuntimeTypes(runtime, parameterTypes = new Map(), dataTypes = [], returnTypes = new Map()) {
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
    ml_at: ['ReadonlyArray<T>', 'number | bigint'],
    ml_forall: ['any[]', '(value: any) => boolean'],
    ml_router_strip: ['string', 'string', 'boolean'],
    ml_router_unwrap: ["Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>|Readonly<{$:'Ok';field0:T}>|Readonly<{$:'Err';field0:unknown}>", 'T', 'boolean'],
    ml_router_unexpected: ['any'],
    ml_router_array: ['ReadonlyArray<any>', '(value: any) => boolean'],
    ml_router_iter: ['ReadonlyArray<T>','boolean'],
    ml_router_range: ['bigint', 'bigint', 'boolean'],
    ml_router_reverse_range: ['bigint', 'bigint', 'boolean', '(value: bigint) => bigint'],
    ml_router_enumerate: ['Iterable<T>', '(count: bigint) => bigint'],
    ml_router_map: ['Iterable<T>', '(value: T) => U'],
    ml_router_filter: ['Iterable<T>', '(value: T) => boolean'],
    ml_router_find_map: ['Iterable<T>', "(value: T) => Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>"],
    ml_router_filter_map: ['Iterable<T>', "(value: T) => Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>"],
    ml_router_find: ['Iterable<T>', '(value: T) => boolean'],
    ml_router_flatten: ['Iterable<ReadonlyArray<T>>'],
    ml_router_take: ['Iterator<T>', 'bigint'],
    ml_router_collect: ['Iterable<T>'],
    ml_router_count: ['Iterable<T>'],
    ml_router_any: ['Iterable<T>', '(value: T) => boolean'],
    ml_router_all: ['Iterable<T>', '(value: T) => boolean'],
    ml_router_fold: ['Iterable<T>', 'A', '(accumulator: A, value: T) => A'],
    ml_router_future: ['() => T | PromiseLike<T>'],
    ml_router_defer: ['(...args: any[]) => T | PromiseLike<T>', 'ReadonlyArray<any>'],
    ml_router_try: ["Readonly<{$:'Some'|'Ok';field0:T}>|Readonly<{$:'None'}>|Readonly<{$:'Err';field0:E}>", 'boolean'],
    ml_router_propagated: ['any'],
    ml_validate_duration: ['any'],
    ml_host_option_bind: ['{ $: string; field0?: any }','(...values: any[]) => any','string'],
    ml_host_bool_then:['boolean','() => T'],
    ml_host_bool_then_some:['boolean','T'],
    ml_host_result_ok:["Readonly<{ $: 'Ok'; field0: T }> | Readonly<{ $: 'Err'; field0: unknown }>"],
    ml_host_option_map_or:["Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>",'U','(value: T) => U'],
    ml_host_option_map:["Readonly<{ $: 'Some'; field0: T }> | Readonly<{ $: 'None' }>",'(value: T) => U'],
  };
  const generics = { ml_host_bool_then:'T',ml_host_result_ok:'T',ml_host_option_map:'T, U',ml_host_option_map_or:'T, U', ml_router_future: 'T', ml_router_defer: 'T', ml_at: 'T', ml_router_iter: 'T', ml_router_map: 'T, U', ml_router_filter: 'T', ml_router_take: 'T', ml_router_collect: 'T', ml_router_count: 'T', ml_router_any: 'T', ml_router_all: 'T', ml_router_fold: 'T, A' };
  Object.assign(generics,{ml_router_find_map:'T, U',ml_router_filter_map:'T, U',ml_router_find:'T',ml_router_flatten:'T',ml_router_try:'T, E',ml_router_unwrap:'T'});
  generics.ml_router_enumerate='T';
  generics.ml_host_bool_then_some='T';
  for (let at = 0; at < tokens.length; at++) {
    if (tokens[at].kind !== 'identifier' || tokens[at].value !== 'function') continue;
    const nameAt = at + (tokens[at + 1]?.value === '*' ? 2 : 1);
    if (tokens[nameAt + 1]?.value !== '(') continue;
    const name = tokens[nameAt].value;
    if(name==='ml_router_try')annotations.push({offset:tokens[at].start,text:[
      "function ml_router_try<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, option:true): T;",
      "function ml_router_try<R extends Readonly<{$:'Err';field0:unknown}>|Readonly<{$:'Ok';field0:unknown}>>(value: R, option:false): Extract<R,Readonly<{$:'Ok';field0:unknown}>>['field0'];",
      '',
    ].join('\n')});
    if(name==='ml_host_option_bind')annotations.push({offset:tokens[at].start,text:[
      "function ml_host_option_bind<T,U>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>, mode:'and_then'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:U}>;",
      "function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: ()=>Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, mode:'or_else'): Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>;",
      "function ml_host_option_bind<T>(value: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:T}>, operation: (value:T)=>boolean, mode:'is_some_and'): boolean;",
      '',
    ].join('\n')});
    if (generics[name]) annotations.push({ offset: tokens[nameAt].end, text: `<${generics[name]}>` });
    const known = parameterTypes.get(name);
    const helper = helperTypes[name];
    let index = 0;
    for (let parameter = nameAt + 2; tokens[parameter]?.value !== ')'; parameter++) {
      if (tokens[parameter].kind !== 'identifier') continue;
      annotations.push({ offset: tokens[parameter].end, text: `: ${known?.[index] ? tsType(known[index].type, dataTypes) : helper?.[index] ?? 'any'}` });
      index++;
    }
    if(name==='ml_host_option_map_or'){const close=tokens.find((token,index)=>index>nameAt+1&&token.value===')');annotations.push({offset:close.end,text:': U'});}
    if(name==='ml_router_unwrap'){const close=tokens.find((token,index)=>index>nameAt+1&&token.value===')');annotations.push({offset:close.end,text:': T'});}
    if(name==='ml_router_try'){const close=tokens.find((token,index)=>index>nameAt+1&&token.value===')');annotations.push({offset:close.end,text:': T'});}
    if(name==='ml_router_enumerate'){const close=tokens.find((token,index)=>index>nameAt+1&&token.value===')');annotations.push({offset:close.end,text:": IterableIterator<Readonly<{$:'Tuple';field0:bigint;field1:T}>>"});}
    if(['ml_router_find_map','ml_router_find','ml_router_filter_map','ml_router_flatten'].includes(name)) {
      const close=tokens.find((token,index)=>index>nameAt+1&&token.value===')'),element=name==='ml_router_find_map'||name==='ml_router_filter_map'?'U':'T';
      annotations.push({offset:close.end,text:['ml_router_filter_map','ml_router_flatten'].includes(name)?`: IterableIterator<${element}>`:`: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:${element}}>`});
    }
    const standardResult={ml_host_bool_then_some:'T',ml_host_bool_then:'T',ml_host_result_ok:'T',ml_host_option_map:'U'}[name];
    if(standardResult){const close=tokens.find((token,index)=>index>nameAt+1&&token.value===')');annotations.push({offset:close.end,text:`: Readonly<{$:'None'}>|Readonly<{$:'Some';field0:${standardResult}}>`});}
    if (returnTypes.has(name)) {
      const close = tokens.find((token, index) => index > nameAt + 1 && token.value === ')');
      annotations.push({ offset: close.end, text: `: ${tsType(returnTypes.get(name), dataTypes)}` });
    }
    if (['ml_abort', 'ml_router_unexpected'].includes(name)) {
      const close = tokens.find((token, index) => index > at + 2 && token.value === ')');
      annotations.push({ offset: close.end, text: ': never' });
    }
    if (['ml_router_future', 'ml_router_defer'].includes(name)) {
      const close = tokens.find((token, index) => index > nameAt + 1 && token.value === ')');
      annotations.push({ offset: close.end, text: ': PromiseLike<T>' });
    }
    if (name === 'ml_router_iter') {
      const close = tokens.find((token, index) => index > nameAt + 1 && token.value === ')');
      annotations.push({ offset: close.end, text: ': ArrayIterator<T>' });
    }
  }
  for (let at = 0; at < tokens.length; at++) {
    if (tokens[at].value === 'let' && tokens[at + 1]?.value === 'pending' && tokens[at + 2]?.value === ';') annotations.push({ offset: tokens[at + 1].end, text: ': Promise<T> | undefined' });
    if (tokens[at].value === 'catch' && tokens[at + 2]?.value === 'ml_router_error') annotations.push({ offset: tokens[at + 2].end, text: ': any' });
  }
  let typedRuntime = runtime;
  for (const { offset, text } of annotations.sort((a, b) => b.offset - a.offset)) typedRuntime = typedRuntime.slice(0, offset) + text + typedRuntime.slice(offset);
  return typeScriptAliases(new Map(dataTypes.map(entry=>[entry.fullName,entry])))+'\n'+typedRuntime;
}
