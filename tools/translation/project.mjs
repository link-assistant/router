import {compilationProfile,itemConfiguration} from './cfg-profile.mjs';
// Resolve tracked Rust module edges before semantic checking. External crates,
// conditional modules, macro expansion and effects remain explicit obligations.
import { posix } from 'node:path';
import { sourceItems } from './rust-structure.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {externalModuleBindings} from './registered-bindings.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {EFFECT_CONTRACTS} from './extensions/effects-contracts.mjs';
import { HostRustParser as MethodRustParser, checkProgram, emitJavaScript,HOST_CONTRACTS,hostData as effectData } from './extensions/host-contracts.mjs';
import { extractImplDeclarations, lowerSharedMethodTokens, lowerCopyMethodTokens } from './impl-resolver.mjs';
import {projectCopyEvidence} from './project-copy.mjs';
import { tokenizeRust } from './extensions/lexical.mjs';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';
import { roundTripProgram, serializeProgram } from './semantic-meta.mjs';
import { sha256, tsType, annotateRuntimeTypes, typeParameterName } from './translate.mjs';

const diagnostic = error => ({ kind: error.kind ?? 'module', message: error.reason ?? error.message, span: error.span ?? null });
const relocate = (node, offset) => Array.isArray(node) ? node.map(value => relocate(value, offset)) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([key, value]) => [key, key==='copyCertificate'?value:key === 'span' && value ? { start: value.start + offset, end: value.end + offset } : relocate(value, offset)])) : node;
// Original parameter-pattern evidence uses frontend nodes, including ctor
// syntax without checked declaration links. Keep it out of target renaming
// and executable dependency discovery while preserving it in serialized meta.
const sourceEvidence = key => ['copyCertificate', 'sourceParameterPatterns', 'sourceParameterPattern'].includes(key);

export function resolveModuleGraph({ entry, paths, readSource, compilationProfile:profileInput=null }) {
  const profile=compilationProfile(profileInput);
  const tracked = new Set(paths);
  if (!tracked.has(entry)) throw new Error(`crate entrypoint is not tracked: ${entry}`);
  const modules = [], edges = [], diagnostics = [], visited = new Set();
  let offset = 0;
  const visit = (file, path, directory, parentCondition='active') => {
    const key = path.join('.');
    if (visited.has(key)) throw new Error(`duplicate module path ${key}`);
    visited.add(key);
    const source = readSource(file);
    const module = { file, path, directory, source, offset, items: [], compilationProfile:profile, inactiveItems:[], configurationEvidence:[] };
    offset += source.length + 1;
    modules.push(module);
    try {
      module.allItems=sourceItems(source).filter(item=>!item.comment);
      const inner=module.allItems.filter(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!').map(item=>itemConfiguration(item.tokens,profile));
      module.configurationCondition=parentCondition==='inactive'||inner.some(item=>item.status==='inactive')?'inactive':parentCondition==='unknown'||inner.some(item=>item.status==='unknown')?'unknown':'active';
      module.items=module.allItems.filter(item=>{
        const condition=itemConfiguration(item.tokens,profile);module.configurationEvidence.push(Object.freeze({span:Object.freeze({start:item.start,end:item.end}),...condition}));
        if(module.configurationCondition==='inactive'||condition.status==='inactive'){module.inactiveItems.push({span:{start:item.start,end:item.end},condition});return false;}return true;
      });
    }
    catch (error) { diagnostics.push({ file, ...diagnostic(error) }); return; }
    for (const item of module.items.filter(item => item.term === 'mod')) {
      const condition=itemConfiguration(item.tokens,profile);
      const prefix=condition.status==='active'&&condition.attributes.length&&condition.attributes.every(attribute=>attribute.name==='cfg'||attribute.name==='macro_use'&&attribute.tokens.join('')==='#[macro_use]')?condition.attributes.at(-1).span.end:item.start;
      const text = source.slice(prefix, item.end);
      const plain = /^\s*(?:pub(?:\s*\([^)]*\))?\s+)?mod\s+([\p{L}_][\p{L}\p{N}_]*)\s*;\s*$/u.exec(text);
      if (!plain) { diagnostics.push({ file, module: [...path, item.name], kind: 'module', message: 'module attributes or inline body require separate compilation-condition lowering', span: { start: item.start, end: item.end } }); continue; }
      const name = plain[1];
      const candidates = [posix.normalize(`${directory}/${name}.rs`), posix.normalize(`${directory}/${name}/mod.rs`)].filter(candidate => tracked.has(candidate));
      if (candidates.length !== 1) { diagnostics.push({ file, module: [...path, name], kind: 'module', message: candidates.length ? 'ambiguous module files' : 'missing tracked module file', candidates, span: { start: item.start, end: item.end } }); continue; }
      const target = candidates[0];
      edges.push({ from: file, to: target, module: [...path, name], ...(condition.attributes.some(attribute=>attribute.name==='macro_use')?{macroUse:{kind:'textual-module-scope',span:{start:item.start,end:item.end},visibleAfter:item.end}}:{}) });
      visit(target, [...path, name], target.endsWith('/mod.rs') ? posix.dirname(target) : target.slice(0, -3),module.configurationCondition);
    }
  };
  visit(entry, [], posix.dirname(entry));
  return { entry, modules, edges, diagnostics, compilationProfile:profile };
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
    const result = Object.fromEntries(Object.entries(node).map(([key, value]) => [key, sourceEvidence(key) ? value : visit(value)]));
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
    for (const [key,value] of Object.entries(node)) if(!sourceEvidence(key)){if (Array.isArray(value)) value.forEach(visit); else visit(value);}
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
  const registeredTypes=[['std','option','Option'],['std','result','Result'],['std','time','Duration'],['serde_json','Value'],['serde_json','Number'],['serde_json','Error'],['serde_json','error','Category'],['std','io','Error'],['std','env','VarError'],['std','ffi','OsString'],['std','num','ParseIntError'],['std','num','IntErrorKind'],['std','time','TryFromFloatSecsError']];
  const externalModules=externalModuleBindings({data:effectData(),contracts:[...HOST_CONTRACTS,...EFFECT_CONTRACTS],extraBindings:[...registeredTypes.map(target=>({name:target.at(-1),namespace:'type',target,kind:['Option','Result','Value','Category','VarError','IntErrorKind'].includes(target.at(-1))?'enum':'struct'})),...['Some','None','Ok','Err'].flatMap(name=>['type','value'].map(namespace=>({name,namespace,target:name==='Some'||name==='None'?['std','option','Option',name]:['std','result','Result',name],kind:'constructor'}))),{name:'FromStr',namespace:'type',target:['std','str','FromStr'],kind:'trait'},{name:'json',namespace:'macro',target:['serde_json','json'],kind:'macro'}]});
  const bindingEvidence=resolveModuleBindings({modules:graph.modules,externalModules,compilationProfile:graph.compilationProfile});
  const scopes=new Map(bindingEvidence.scopes.map(scope=>[scope.file,scope]));
  const configureSourceScope=(parser,module)=>configureParserSourceScope(parser,scopes.get(module.file),bindingEvidence.scopes,module.path);
  const declarations = [], refused = [], imports = [], unloweredItems = [], moduleAliases = new Map();
  for (const module of graph.modules) {
    if(module.configurationCondition==='unknown'){refused.push({file:module.file,term:'module',kind:'unsupported',message:'unknown crate compilation condition',span:{start:0,end:module.source.length}});continue;}
    for (const item of module.items.filter(item => !['fn', 'const', 'enum', 'struct', 'use', 'mod'].includes(item.term) || item.name === 'main')) unloweredItems.push({ source: module.file, module: module.path, name: item.name, term: item.term, span: { start: item.start, end: item.end }, sha256: sha256(module.source.slice(item.start, item.end)), diagnostic: 'declaration needs effect, implementation, entrypoint or macro lowering' });
    const configured=configureSourceScope(new MethodRustParser([]),module),aliases=configured.aliases;
    for (const item of module.items.filter(item => item.term === 'use')) {
      const scope=scopes.get(module.file),own=scope.unresolvedImports.filter(entry=>entry.span?.start===item.start&&entry.span?.end===item.end);
      imports.push({file:module.file,module:module.path,span:{start:item.start,end:item.end},aliases:Object.fromEntries(aliases.get(module.path.join('.'))??[]),diagnostics:own});
      for(const entry of own)refused.push({file:module.file,name:item.name,term:'use',kind:entry.kind,message:entry.message,span:entry.span});
    }
    moduleAliases.set(module.file, aliases);
    for (const item of module.items.filter(item => ['fn', 'const', 'enum', 'struct'].includes(item.term) && item.name !== 'main')) {
      try {
        const parser = new MethodRustParser(tokenizeRust(module.source.slice(item.start, item.end)));
        parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
        configureSourceScope(parser,module);
        parser.aliases = aliases;
        parser.modulePath = module.path;
        let surface;
        if (['struct', 'enum'].includes(item.term)) {
          // Layout parsing owns outer, variant and field attributes. Feeding
          // the original token cursor from zero retains their exact metadata.
          const root = { main: null }; const items = [];
          parser.items(root, items, module.path, () => parser.cursor.atEnd());
          if (items.length !== 1 || items[0].k !== 'data') throw new TranslationError('syntax', 'expected one original data declaration', parser.cursor.peek());
          surface = items[0];
        } else {
          parser.attributes(); parser.visibility();
          if (parser.cursor.is('const') && parser.cursor.is('fn', 1)) { const qualifier=parser.cursor.next(),fn=parser.fn(module.path); surface = {...fn,constFunction:true,span:{...fn.span,start:qualifier.start}}; }
          else if (parser.cursor.is('fn') || parser.cursor.is('async')) surface = parser.fn(module.path);
          else if (parser.cursor.is('const')) surface = parser.constItem(module.path);
          else throw new TranslationError('syntax', 'expected original function or constant', parser.cursor.peek());
        }
        if (!parser.cursor.atEnd()) throw new TranslationError('syntax', 'unconsumed declaration tokens', parser.cursor.peek());
        const base = module.offset + item.start;
        declarations.push({ file: module.file, path: module.path, name: [...module.path, item.name].join('.'), term: item.term, span: { start: item.start, end: item.end }, globalSpan: { start: base, end: module.offset + item.end }, surface: relocate(surface, base) });
        for (const type of parser.genericTypes.values()) if (!declarations.some(candidate => candidate.name === type.name && candidate.path.length === 0)) declarations.push({ file: module.file, path: [], name: type.name, term: 'generated-type', globalSpan: { start: base, end: module.offset + item.end }, surface: relocate(type, base) });
      } catch (error) { if (!(error instanceof TranslationError)) throw error; refused.push({ file: module.file, module: module.path, name: item.name, term: item.term, ...diagnostic(error) }); }
    }
  }
  const copyEvidence=projectCopyEvidence(declarations,graph.modules,moduleAliases,scopes);
  for (const module of graph.modules) {
    if(module.configurationCondition!=='active')continue;
    const extracted = extractImplDeclarations(module.source, {sourcePath:module.file,modulePath:module.path});
    for (const implementation of extracted.implementations) {
      const original=(module.allItems??module.items).find(item=>item.term==='impl'&&item.start===implementation.span.start);
      if(original&&itemConfiguration(original.tokens,graph.compilationProfile).status==='inactive')continue;
      for (const method of implementation.methods) {
        const aliases = moduleAliases.get(module.file)?.get(module.path.join('.'));
        const resolved = aliases?.has(implementation.typePath[0]) ? [...aliases.get(implementation.typePath[0]), ...implementation.typePath.slice(1)] : implementation.typePath;
        const qualifiedType = ['crate','self','super'].includes(resolved[0]) ? resolved : ['crate',...module.path,...resolved];
        const display = [...qualifiedType.slice(1),method.name].join('.');
        const copyProof=method.receiver==='value'?copyEvidence(qualifiedType,module,method.span):null,certificate=copyProof?.verified?copyProof:null;
        if (!method.loweringReady && !certificate) {refused.push({file:module.file,name:display,term:'method',span:method.span,kind:'unsupported',message:method.diagnostics.map(item=>item.message).join('; '),...(copyProof?{copyDiagnostics:copyProof.diagnostics}: {})});continue;}
        try {
          const lowered = certificate ? lowerCopyMethodTokens(method,certificate.type,certificate) : lowerSharedMethodTokens(method,qualifiedType);
          const parser = new MethodRustParser(lowered.tokens);
          parser.modulePath = module.path;
          configureSourceScope(parser,module);
          // Methods inherit the module's checked import aliases.
          parser.aliases = moduleAliases.get(module.file) ?? new Map();
          parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
          parser.attributes(); parser.visibility();
          const qualifier=parser.cursor.is('const')?parser.cursor.next():null,fn=parser.fn(module.path);
          const surface = {...fn,...(qualifier?{constFunction:true,span:{...fn.span,start:qualifier.start}}:{})};
          if (!parser.cursor.atEnd()) throw new TranslationError('syntax','unconsumed inherent method tokens',parser.cursor.peek());
          surface.name = `ml_impl_${Buffer.from(qualifiedType.join('.')).toString('hex')}_${Buffer.from(method.name).toString('hex')}`;
          surface.generated = 'router-checked-inherent-method';
          if(lowered.sharedReceiverSource) {
            const type=surface.params[0]?.type;
            if(type?.rustReference?.kind!=='shared'||!type.rustReference.pointee)throw new TranslationError('unsupported','shared inherent receiver requires an actual checked pointee',method.receiverSpan);
            surface.params[0].type={...type,rustReference:{...type.rustReference,pointee:{...type.rustReference.pointee,rustSharedReceiverSource:lowered.sharedReceiverSource,rustSharedFieldCopies:copyEvidence.fieldCertificates?.(qualifiedType,module,method.receiverSpan)??[]}}};
          }
          surface.impl = {type:{kind:'named',path:qualifiedType},method:method.name,receiver:method.receiver,receiverName:lowered.receiverName,...(lowered.sharedReceiverSource?{sharedReceiverSource:lowered.sharedReceiverSource}:{}),...(certificate?{copyCertificate:certificate}:{}),rewrites:lowered.rewrites,assumptions:lowered.assumptions};
          const globalSpan = {start:module.offset+method.span.start,end:module.offset+method.span.end};
          declarations.push({file:module.file,path:module.path,name:[...module.path,surface.name].join('.'),displayName:display,term:'method',span:method.span,globalSpan,surface:(()=>{const value=relocate(surface,module.offset);if(certificate)value.impl.copyCertificate=certificate;return value;})()});
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
  const meta = { schema: 'tracked-rust-project-semantic-meta-v1', compilationProfile:graph.compilationProfile, configurationEvidence:graph.modules.map(module=>({source:module.file,condition:module.configurationCondition,items:module.configurationEvidence})), status: 'partial', entry: options.entry, runtimeParity: false, sources: graph.modules.map(module => ({ source: module.file, sha256: sha256(module.source), module: module.path })), moduleEdges: graph.edges, imports, moduleDiagnostics: graph.diagnostics, bindingEvidence, refused, unloweredItems, executable: entries.map(entry => ({ source: entry.file, name: entry.name, term: entry.term, span: entry.span })), checkedSemanticProgram: JSON.parse(serializeProgram(checked)), targetSemanticProgram: JSON.parse(serializeProgram(target.program)), checkedMethods: methods.map(entry=>({source:entry.file,name:entry.displayName,span:entry.span,receiver:entry.surface.impl.receiver})), encodings: emitted.encodings, assumptions: emitted.assumptions };
  const sourceScopes=graph.modules.map(module=>Object.freeze({source:module.file,sha256:sha256(module.source),project:options.entry,compilationProfile:graph.compilationProfile,configurationCondition:module.configurationCondition,configurationEvidence:Object.freeze([...module.configurationEvidence]),scope:scopes.get(module.file),scopes:bindingEvidence.scopes}));
  const executableDeclarations = entries.map(entry => ({ source: entry.file, sourceSha256:sha256(graph.modules.find(module=>module.file===entry.file).source), name: entry.name.split('.').at(-1), span: entry.span, project: options.entry, qualifiedName: entry.name, lower(options = {}) {
    const program = declarationProgram(target.program, target.names.get(entry.name));
    const emitted = emitJavaScript(program, options);
    const own = program.declarations.get(target.names.get(entry.name));
    const targetMapping = emitted.mappings.find(mapping => mapping.source === own.fullName);
    const signatures = [...program.declarations.values()].filter(entry=>entry.k === 'fn').map(entry=>({target:emitted.mappings.find(mapping=>mapping.source === entry.fullName)?.target,params:entry.params,ret:entry.async?{kind:'routerFuture',value:entry.ret}:entry.ret}));
    return { own, program, emitted: { ...emitted, signatures, mappings: [...emitted.mappings, { ...targetMapping, source: entry.name.split('.').at(-1) }] } };
  } }));
  return { meta, javascript, typescript, executableDeclarations, sourceScopes };
}
