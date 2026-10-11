// Resolve tracked Rust module edges before semantic checking. External crates,
// conditional modules, macro expansion and effects remain explicit obligations.
import { posix } from 'node:path';
import { sourceItems } from './rust-structure.mjs';
import { HostRustParser as MethodRustParser, checkProgram, emitJavaScript,hostData as effectData } from './extensions/host-contracts.mjs';
import { extractImplDeclarations, lowerSharedMethodTokens } from './impl-resolver.mjs';
import { tokenizeRust } from './extensions/lexical.mjs';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';
import { roundTripProgram, serializeProgram } from './semantic-meta.mjs';
import { sha256, tsType, annotateRuntimeTypes, typeParameterName } from './translate.mjs';

const diagnostic = error => ({ kind: error.kind ?? 'module', message: error.reason ?? error.message, span: error.span ?? null });
const relocate = (node, offset) => Array.isArray(node) ? node.map(value => relocate(value, offset)) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key === 'span' && value ? { start: value.start + offset, end: value.end + offset } : relocate(value, offset)])) : node;

export function resolveModuleGraph({ entry, paths, readSource }) {
  const tracked = new Set(paths);
  if (!tracked.has(entry)) throw new Error(`crate entrypoint is not tracked: ${entry}`);
  const modules = [], edges = [], diagnostics = [], visited = new Set();
  let offset = 0;
  const visit = (file, path, directory) => {
    const key = path.join('.');
    if (visited.has(key)) throw new Error(`duplicate module path ${key}`);
    visited.add(key);
    const source = readSource(file);
    const module = { file, path, directory, source, offset, items: [] };
    offset += source.length + 1;
    modules.push(module);
    try { module.items = sourceItems(source).filter(item => !item.comment); }
    catch (error) { diagnostics.push({ file, ...diagnostic(error) }); return; }
    for (const item of module.items.filter(item => item.term === 'mod')) {
      const text = source.slice(item.start, item.end);
      const plain = /^(?:pub(?:\s*\([^)]*\))?\s+)?mod\s+([\p{L}_][\p{L}\p{N}_]*)\s*;\s*$/u.exec(text);
      if (!plain) { diagnostics.push({ file, module: [...path, item.name], kind: 'module', message: 'module attributes or inline body require separate compilation-condition lowering', span: { start: item.start, end: item.end } }); continue; }
      const name = plain[1];
      const candidates = [posix.normalize(`${directory}/${name}.rs`), posix.normalize(`${directory}/${name}/mod.rs`)].filter(candidate => tracked.has(candidate));
      if (candidates.length !== 1) { diagnostics.push({ file, module: [...path, name], kind: 'module', message: candidates.length ? 'ambiguous module files' : 'missing tracked module file', candidates, span: { start: item.start, end: item.end } }); continue; }
      const target = candidates[0];
      edges.push({ from: file, to: target, module: [...path, name] });
      visit(target, [...path, name], target.endsWith('/mod.rs') ? posix.dirname(target) : target.slice(0, -3));
    }
  };
  visit(entry, [], posix.dirname(entry));
  return { entry, modules, edges, diagnostics };
}

function tree(declarations) {
  const root = { items: [] };
  for (const declaration of declarations) {
    let owner = root;
    for (const name of declaration.path) {
      let module = owner.items.find(item => item.k === 'module' && item.name === name);
      if (!module) { module = { k: 'module', name, items: [] }; owner.items.push(module); }
      owner = module;
    }
    owner.items.push(declaration.surface);
  }
  return root.items;
}

function flatten(program) {
  const names = new Map([...program.declarations.keys()].map(name => [name, `rp_${Buffer.from(name).toString('hex')}`]));
  const visit = node => {
    if (Array.isArray(node)) return node.map(visit);
    if (!node || typeof node !== 'object') return node;
    const result = Object.fromEntries(Object.entries(node).map(([key, value]) => [key, visit(value)]));
    if (node.kind === 'data' && names.has(node.name)) result.name = names.get(node.name);
    if (['call', 'routerFutureCall'].includes(node.k)) result.fn = names.get(node.fn) ?? node.fn;
    if (node.k === 'ctor') result.data = names.get(node.data) ?? node.data;
    return result;
  };
  const declarations = new Map([...program.declarations].map(([name, entry]) => {
    const target = names.get(name);
    return [target, { ...visit(entry), name: target, fullName: target, modulePath: [], generated: 'router-project-flattened' }];
  }));
  return { names, program: roundTripProgram({ ...program, declarations, items: [...declarations.values()] }) };
}

function declarationProgram(program, root) {
  const needed = new Set();
  const visit = node => {
    if (!node || typeof node !== 'object') return;
    const names = ['call', 'routerFutureCall'].includes(node.k) ? [node.fn] : node.k === 'ctor' ? [node.data] : node.kind === 'data' ? [node.name] : [];
    for (const name of names) include(name);
    for (const value of Object.values(node)) if (Array.isArray(value)) value.forEach(visit); else visit(value);
  };
  const include = name => {
    if (needed.has(name)) return;
    const declaration = program.declarations.get(name);
    if (!declaration) throw new Error(`missing checked project dependency ${name}`);
    needed.add(name); visit(declaration);
  };
  include(root);
  const declarations = new Map([...program.declarations].filter(([name]) => needed.has(name)));
  return roundTripProgram({ ...program, declarations, items: [...declarations.values()], main: null });
}

export function translateProject(options) {
  const graph = resolveModuleGraph(options);
  const declarations = [], refused = [], imports = [], unloweredItems = [], moduleAliases = new Map();
  for (const module of graph.modules) {
    for (const item of module.items.filter(item => !['fn', 'const', 'enum', 'struct', 'use', 'mod'].includes(item.term) || item.name === 'main')) unloweredItems.push({ source: module.file, module: module.path, name: item.name, term: item.term, span: { start: item.start, end: item.end }, sha256: sha256(module.source.slice(item.start, item.end)), diagnostic: 'declaration needs effect, implementation, entrypoint or macro lowering' });
    const aliases = new Map();
    for (const item of module.items.filter(item => item.term === 'use')) {
      try {
        const parser = new MethodRustParser(tokenizeRust(module.source.slice(item.start, item.end)));
        parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
        parser.shadowedPreludeTypes=new Set(module.items.filter(item=>['enum','struct','type'].includes(item.term)&&['Option','Result'].includes(item.name)).map(item=>item.name));
        parser.aliases = aliases;
        parser.modulePath = module.path;
        parser.attributes(); parser.visibility(); parser.use(module.path);
        imports.push({ file: module.file, module: module.path, span: { start: item.start, end: item.end }, aliases: Object.fromEntries(aliases.get(module.path.join('.')) ?? []) });
      } catch (error) { if (!(error instanceof TranslationError)) throw error; refused.push({ file: module.file, name: item.name, term: item.term, ...diagnostic(error) }); }
    }
    moduleAliases.set(module.file, aliases);
    for (const item of module.items.filter(item => ['fn', 'const', 'enum', 'struct'].includes(item.term) && item.name !== 'main')) {
      try {
        const parser = new MethodRustParser(tokenizeRust(module.source.slice(item.start, item.end)));
        parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
        parser.shadowedPreludeTypes=new Set(module.items.filter(item=>['enum','struct','type'].includes(item.term)&&['Option','Result'].includes(item.name)).map(item=>item.name));
        parser.aliases = aliases;
        parser.modulePath = module.path;
        parser.attributes(); parser.visibility();
        let surface;
        if (parser.cursor.is('const') && parser.cursor.is('fn', 1)) { parser.cursor.next(); surface = parser.fn(module.path); }
        else if (parser.cursor.is('fn')) surface = parser.fn(module.path);
        else if (parser.cursor.is('const')) surface = parser.constItem(module.path);
        else if (parser.cursor.is('enum')) surface = parser.enumItem();
        else {
          const root = { main: null }; const items = [];
          parser.items(root, items, module.path, () => parser.cursor.atEnd()); surface = items[0];
        }
        if (!parser.cursor.atEnd()) throw new TranslationError('syntax', 'unconsumed declaration tokens', parser.cursor.peek());
        const base = module.offset + item.start;
        declarations.push({ file: module.file, path: module.path, name: [...module.path, item.name].join('.'), term: item.term, span: { start: item.start, end: item.end }, globalSpan: { start: base, end: module.offset + item.end }, surface: relocate(surface, base) });
        for (const type of parser.genericTypes.values()) if (!declarations.some(candidate => candidate.name === type.name && candidate.path.length === 0)) declarations.push({ file: module.file, path: [], name: type.name, term: 'generated-type', globalSpan: { start: base, end: module.offset + item.end }, surface: relocate(type, base) });
      } catch (error) { if (!(error instanceof TranslationError)) throw error; refused.push({ file: module.file, module: module.path, name: item.name, term: item.term, ...diagnostic(error) }); }
    }
  }
  for (const module of graph.modules) {
    const extracted = extractImplDeclarations(module.source, {sourcePath:module.file,modulePath:module.path});
    for (const implementation of extracted.implementations) {
      for (const method of implementation.methods) {
        const aliases = moduleAliases.get(module.file)?.get(module.path.join('.'));
        const resolved = aliases?.has(implementation.typePath[0]) ? [...aliases.get(implementation.typePath[0]), ...implementation.typePath.slice(1)] : implementation.typePath;
        const qualifiedType = ['crate','self','super'].includes(resolved[0]) ? resolved : ['crate',...module.path,...resolved];
        const display = [...qualifiedType.slice(1),method.name].join('.');
        if (!method.loweringReady) {refused.push({file:module.file,name:display,term:'method',span:method.span,kind:'unsupported',message:method.diagnostics.map(item=>item.message).join('; ')});continue;}
        try {
          const lowered = lowerSharedMethodTokens(method,qualifiedType);
          const parser = new MethodRustParser(lowered.tokens);
          parser.modulePath = module.path;
          // Methods inherit the module's checked import aliases.
          parser.aliases = moduleAliases.get(module.file) ?? new Map();
          parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
          parser.attributes(); parser.visibility();
          if (parser.cursor.is('const')) parser.cursor.next();
          const surface = parser.fn(module.path);
          if (!parser.cursor.atEnd()) throw new TranslationError('syntax','unconsumed inherent method tokens',parser.cursor.peek());
          surface.name = `ml_impl_${Buffer.from(qualifiedType.join('.')).toString('hex')}_${Buffer.from(method.name).toString('hex')}`;
          surface.generated = 'router-checked-inherent-method';
          surface.impl = {type:{kind:'named',path:qualifiedType},method:method.name,receiver:method.receiver,rewrites:lowered.rewrites,assumptions:lowered.assumptions};
          const globalSpan = {start:module.offset+method.span.start,end:module.offset+method.span.end};
          declarations.push({file:module.file,path:module.path,name:[...module.path,surface.name].join('.'),displayName:display,term:'method',span:method.span,globalSpan,surface:relocate(surface,module.offset)});
          for (const type of parser.genericTypes.values()) if (!declarations.some(candidate=>candidate.name === type.name && candidate.path.length === 0)) declarations.push({file:module.file,path:[],name:type.name,term:'generated-type',globalSpan,surface:relocate(type,module.offset)});
        } catch(error) {if(!(error instanceof TranslationError))throw error;refused.push({file:module.file,name:display,term:'method',...diagnostic(error)});}
      }
    }
  }
  const duplicateNames = new Set(declarations.filter((entry, index) => declarations.findIndex(candidate => candidate.name === entry.name) !== index).map(entry => entry.name));
  for (const entry of declarations.filter(entry => duplicateNames.has(entry.name))) refused.push({ file: entry.file, name: entry.name, term: entry.term, kind: 'ambiguous', message: 'duplicate module-scoped declaration', span: entry.span });
  let active = declarations.filter(entry => !duplicateNames.has(entry.name)), checked;
  // Every surviving body must check. Remove an actual failing declaration,
  // then recheck all callers; no parsed signature is a callable implementation.
  for (let attempts = 0; attempts <= declarations.length; attempts++) {
    try { checked = roundTripProgram(checkProgram({ language: 'Rust', items: [...tree(active), ...effectData().filter(item => !tree(active).some(entry => entry.name === item.name))], main: null })); break; }
    catch (error) {
      if (!(error instanceof TranslationError)) throw error;
      const owner = active.find(declaration => error.span && declaration.globalSpan.start <= error.span.start && error.span.start <= declaration.globalSpan.end);
      if (!owner) throw new Error(`unattributed project semantic refusal: ${error.reason}`);
      refused.push({ file: owner.file, name: owner.name, term: owner.term, ...diagnostic(error) });
      active = active.filter(declaration => declaration !== owner);
    }
  }
  if (!checked) throw new Error('project declaration checking did not converge');
  const target = flatten(checked);
  const runtimeModule = posix.relative(posix.dirname(options.entry.replace(/\.rs$/u,'.mjs')), 'runtime/effects.mjs');
  const emitted = emitJavaScript(target.program, { runtimeModule: runtimeModule.startsWith('.') ? runtimeModule : './' + runtimeModule });
  const methods = active.filter(declaration => declaration.term === 'method');
  const entries = active.filter(declaration => ['fn', 'const'].includes(declaration.term));
  const targetName = name => emitted.mappings.find(mapping => mapping.source === target.names.get(name)).target;
  const exports = entries.map(declaration => `[${JSON.stringify(declaration.name)}]: ${targetName(declaration.name)}${declaration.term === 'const' ? '()' : ''}`).join(', ');
  const javascript = `${emitted.text}\nexport const translated = Object.freeze({ ${exports} });\nexport const provenance = ${JSON.stringify({ entry: options.entry, runtimeParity: false, moduleCount: graph.modules.length, executableFunctions: entries.filter(entry => entry.term === 'fn').length, executableConstants: entries.filter(entry => entry.term === 'const').length })};\n`;
  const dataTypes = [...target.program.declarations.values()].filter(declaration => declaration.k === 'data');
  const functionSignatures = [...target.program.declarations.values()].filter(entry => entry.k === 'fn').map(entry => ({target: emitted.mappings.find(mapping => mapping.source === entry.fullName)?.target,params:entry.params,ret:entry.async?{kind:'routerFuture',value:entry.ret}:entry.ret}));
  const parameterTypes = new Map(functionSignatures.map(entry=>[entry.target,entry.params]));
  const returnTypes = new Map(functionSignatures.map(entry=>[entry.target,entry.ret]));
  const types = entries.map(entry => {
    const own = target.program.declarations.get(target.names.get(entry.name));
    return `${JSON.stringify(entry.name)}: ${entry.term === 'const' ? tsType(own.async ? {kind:'routerFuture',value:own.ret} : own.ret, dataTypes) : `(${own.params.map((param,index) => `${typeParameterName(param.name,index)}: ${tsType(param.type, dataTypes)}`).join(', ')}) => ${tsType(own.async ? {kind:'routerFuture',value:own.ret} : own.ret, dataTypes)}`}`;
  }).join('; ');
  const typescript = annotateRuntimeTypes(javascript, parameterTypes, dataTypes, returnTypes).replace('export const translated =', `export const translated: Readonly<{ ${types} }> =`);
  const meta = { schema: 'tracked-rust-project-semantic-meta-v1', status: 'partial', entry: options.entry, runtimeParity: false, sources: graph.modules.map(module => ({ source: module.file, sha256: sha256(module.source), module: module.path })), moduleEdges: graph.edges, imports, moduleDiagnostics: graph.diagnostics, refused, unloweredItems, executable: entries.map(entry => ({ source: entry.file, name: entry.name, term: entry.term, span: entry.span })), checkedSemanticProgram: JSON.parse(serializeProgram(checked)), targetSemanticProgram: JSON.parse(serializeProgram(target.program)), checkedMethods: methods.map(entry=>({source:entry.file,name:entry.displayName,span:entry.span,receiver:entry.surface.impl.receiver})), encodings: emitted.encodings, assumptions: emitted.assumptions };
  const executableDeclarations = entries.map(entry => ({ source: entry.file, name: entry.name.split('.').at(-1), span: entry.span, project: options.entry, qualifiedName: entry.name, lower(options = {}) {
    const program = declarationProgram(target.program, target.names.get(entry.name));
    const emitted = emitJavaScript(program, options);
    const own = program.declarations.get(target.names.get(entry.name));
    const targetMapping = emitted.mappings.find(mapping => mapping.source === own.fullName);
    const signatures = [...program.declarations.values()].filter(entry=>entry.k === 'fn').map(entry=>({target:emitted.mappings.find(mapping=>mapping.source === entry.fullName)?.target,params:entry.params,ret:entry.async?{kind:'routerFuture',value:entry.ret}:entry.ret}));
    return { own, program, emitted: { ...emitted, signatures, mappings: [...emitted.mappings, { ...targetMapping, source: entry.name.split('.').at(-1) }] } };
  } }));
  return { meta, javascript, typescript, executableDeclarations };
}
