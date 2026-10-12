import {compilationProfile,itemConfiguration,isInertConditionalAttribute} from './cfg-profile.mjs';
import {translationProgressReporter} from './translation-progress.mjs';
// Resolve tracked Rust module edges before semantic checking. External crates,
// conditional modules, macro expansion and effects remain explicit obligations.
import { posix } from 'node:path';
import {captureSourceModuleViews,originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {planTrackedModulePath,planConditionalModuleSourcePath,isTrackedModulePathPlan,MODULE_PATH_PROFILE} from './module-paths.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {STANDARD_NAMESPACE_EVIDENCE} from './namespace-standard.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import { HostRustParser as MethodRustParser, checkProjectProgram, emitJavaScript,hostData as effectData } from './extensions/host-contracts.mjs';
import {declarationRefusals} from './extensions/declaration-refusals.mjs';
import { extractImplDeclarations, lowerSharedMethodTokens, lowerCopyMethodTokens } from './impl-resolver.mjs';
import {projectCopyEvidence} from './project-copy.mjs';
import {admittedHostData} from './extensions/source-namespaces.mjs';
import { tokenizeRust } from './extensions/lexical.mjs';
import { TranslationError } from './vendor/meta-language/translation/diagnostics.js';
import { roundTripProgram, serializeProgram } from './semantic-meta.mjs';
import { sha256, tsType, annotateRuntimeTypes, typeParameterName } from './translate.mjs';
import {linkProjectDeclaration,linkProjectMethodDeclaration,copyMetadata,metadataDigest} from './extensions/source-links.mjs';
import {createOriginalMethodTokenTransform,originalMethodTransformFacts} from './source-method-transforms.mjs';
import {parseOriginalMethodTransform,originalMethodParsedFacts} from './source-method-parser.mjs';
import {originalMethodSemantic,relocateOriginalMethodSemantic} from './source-method-admission.mjs';
import {freezeMacroTree} from './macro-token-trees.mjs';
import {createDeriveFootprintContext,deriveFootprintAt,deriveFootprintExternalModules} from './derive-footprints.mjs';
import {configureDeriveLayout} from './derive-layout.mjs';
import {createToolAttributeContext} from './tool-attributes.mjs';
import {configureToolAttributes} from './tool-attribute-layout.mjs';
import {actualJsonCapabilityProfile} from './json-capabilities.mjs';
import {createJsonMacroContext,configureJsonMacroParser} from './json-macro-context.mjs';
import {createMatchesMacroContext,configureMatchesMacroParser,originalMatchesNamespaceBindings,OriginalMethodOwnerUnproved} from './matches-macro-context.mjs';
import {captureOriginalCargoEdition,originalCargoEditionEvidence} from './cargo-edition-context.mjs';

// Only the actual original-source project pipeline can issue this identity.
// Public JSON digests/certificates are integrity data, never its authority.
const methodFieldEvidence=new WeakMap(),checkedMethodFieldOrigins=new WeakMap();
function issueMethodFieldEvidence(parsed,fields) {
  const capture=originalMethodParsedFacts(parsed),transform=capture.transform;
  originalMethodTransformFacts(transform);copyMetadata(fields);
  const clone=node=>{
    if(!node||typeof node!=='object')return node;
    const descriptors=Object.getOwnPropertyDescriptors(node);
    if(Array.isArray(node))return Array.from({length:descriptors.length.value},(_,index)=>clone(descriptors[String(index)].value));
    return Object.fromEntries(Object.keys(descriptors).map(key=>[key,clone(descriptors[key].value)]));
  };
  const frozenFields=freezeMacroTree(clone(fields)),token=Object.freeze({schema:'original-project-method-field-evidence-v1'});
  const facts=Object.freeze({token,transform,fields:frozenFields});
  methodFieldEvidence.set(token,Object.freeze({parsed,transform,facts,fieldDigest:metadataDigest(frozenFields),parsedDigest:capture.digest}));return token;
}
// Read-only real facade inspection supports source revalidation. Cloned
// facades, fake tokens and proxy/getter objects fail private identity first.
export function originalProjectMethodFieldEvidence(value,transform) {
  if(transform===undefined){
    const origin=checkedMethodFieldOrigins.get(value);
    if(!origin)throw new TypeError('Original project method field facade is copied, unissued or caller fabricated');
    return originalProjectMethodFieldEvidence(origin.token,origin.transform);
  }
  const state=methodFieldEvidence.get(value);
  if(!state)throw new TypeError('Original project method field evidence is copied, unissued or caller fabricated');
  if(state.transform!==transform)throw new TypeError('Original project method field evidence belongs to another genuine transform');
  const capture=originalMethodParsedFacts(state.parsed);originalMethodTransformFacts(transform);
  if(capture.transform!==transform||capture.digest!==state.parsedDigest||metadataDigest(state.facts.fields)!==state.fieldDigest)throw new TypeError('Original project method field source/signature/prepass evidence changed');
  return state.facts;
}

const diagnostic = error => ({ kind: error.kind ?? 'module', message: error.reason ?? error.message, span: error.span ?? null });
const relocate = (node, offset) => Array.isArray(node) ? node.map(value => relocate(value, offset)) : node && typeof node === 'object' ? Object.fromEntries(Object.entries(node).map(([key, value]) => [key, sourceEvidence(key)?value:['span','subjectSyntaxSpan','patternSpan'].includes(key) && value ? { start: value.start + offset, end: value.end + offset } : relocate(value, offset)])) : node;
// Original pattern evidence uses frontend nodes, including ctor
// syntax without checked declaration links. Keep it out of target renaming
// and executable dependency discovery while preserving it in serialized meta.
const sourceEvidence = key => ['copyCertificate', 'sourceParameterPatterns', 'sourceParameterPattern', 'sourcePattern', 'constantEvaluationProof','deriveNamespaceProof','toolAttributeProof','jsonMacroProof','sourceMatchesProof','pinnedStandardBodyProof','sourceMethodProof','sourceBoolFromScope'].includes(key);

export function resolveModuleGraph({ entry, paths, readSource, compilationProfile:profileInput=null }) {
  const profile=compilationProfile(profileInput);
  const tracked = new Set(paths);
  if (!tracked.has(entry)) throw new Error(`crate entrypoint is not tracked: ${entry}`);
  const modules = [], edges = [], diagnostics = [], visited = new Set();
  const boundedChild=(file,path,item)=>{
    if(path.length<=MODULE_PATH_PROFILE.limits.graphDepth)return true;
    diagnostics.push({file,module:path,kind:'module',message:'Tracked module graph exceeds its bounded combined module depth',limit:MODULE_PATH_PROFILE.limits.graphDepth,span:{start:item.start,end:item.end}});return false;
  };
  let offset = 0;
  const visit = (file, path, directory, parentCondition='active',original=null,sourceView=null,pathDirectory=posix.dirname(file),ancestors=[]) => {
    if(modules.length>=MODULE_PATH_PROFILE.limits.modules){diagnostics.push({file,module:path,kind:'module',message:'Tracked module graph exceeds its bounded module count'});return;}
    const key = path.join('.');
    if (visited.has(key)) throw new Error(`duplicate module path ${key}`);
    visited.add(key);
    const source = original?.source??readSource(file);
    const fileOffset=original?.offset??offset;
    if(!original)offset += source.length + 1;
    const module = { file, path, directory, pathDirectory, source, offset:fileOffset, items: [], compilationProfile:profile, inactiveItems:[], configurationEvidence:[] };
    modules.push(module);
    try {
      const capture=original?.capture??captureSourceModuleViews({source,sourcePath:file,compilationProfile:profile});
      module.sourceView=sourceView??capture.views[0];
      original={source,offset:fileOffset,capture,ancestors:original?.ancestors??[...ancestors,file]};
      module.allItems=originalSourceModuleItems(module);
      const inner=module.allItems.filter(item=>item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!').map(item=>itemConfiguration(item.tokens,profile));
      module.configurationCondition=parentCondition==='inactive'||inner.some(item=>item.status==='inactive')?'inactive':parentCondition==='unknown'||inner.some(item=>item.status==='unknown')?'unknown':'active';
      module.items=module.allItems.filter(item=>{
        const condition=itemConfiguration(item.tokens,profile);module.configurationEvidence.push(Object.freeze({span:Object.freeze({start:item.start,end:item.end}),...condition}));
        if(module.configurationCondition==='inactive'||condition.status==='inactive'){module.inactiveItems.push({span:{start:item.start,end:item.end},condition});return false;}return true;
      });
    }
    catch (error) { module.configurationCondition='unknown';diagnostics.push({ file, ...diagnostic(error) }); return; }
    for (const item of module.items.filter(item => item.term === 'mod')) {
      const condition=itemConfiguration(item.tokens,profile);
      const childView=original.capture.views.find(view=>view.declaration?.span.start===item.start&&view.declaration?.span.end===item.end);
      let plan=null;
      if(condition.status==='active'||condition.status==='unknown'){
        try{plan=(condition.status==='active'?planTrackedModulePath:planConditionalModuleSourcePath)(module,item,paths);if(!isTrackedModulePathPlan(plan))throw new TypeError('Original tracked module plan is unsealed');}
        catch(error){diagnostics.push({file,module:[...path,childView?.modulePath.at(-1)??item.name],kind:'module',message:error.message,span:{start:item.start,end:item.end}});continue;}
      }
      if(childView){
        const supported=condition.attributes.every(attribute=>isInertConditionalAttribute(attribute)||attribute.name==='cfg'||attribute.name==='macro_use'&&attribute.tokens.join('')==='#[macro_use]');
        if(!plan&&!supported){diagnostics.push({file,module:[...path,childView.modulePath.at(-1)],kind:'module',message:'Original inline module attribute owner or expansion remains unresolved',span:{start:item.start,end:item.end}});continue;}
        const name=childView.modulePath.at(-1),childPath=[...path,name];
        if(plan&&(!plan.inline||plan.name!==name))throw new TypeError('Tracked module header differs from its original inline view');
        if(!boundedChild(file,childPath,item))continue;
        edges.push({from:file,to:file,module:childPath,kind:'original-inline-module',span:{start:item.start,end:item.end},sourceViewDigest:childView.digest,...(plan?{pathSelection:plan}:{}),...(condition.attributes.some(attribute=>attribute.name==='macro_use')?{macroUse:{kind:'textual-module-scope',span:{start:item.start,end:item.end},visibleAfter:item.end}}:{})});
        const inherited=module.configurationCondition==='inactive'||condition.status==='inactive'?'inactive':module.configurationCondition==='unknown'||condition.status==='unknown'?'unknown':'active';
        const childDirectory=plan?.directory??posix.join(directory,name);
        visit(file,childPath,childDirectory,inherited,original,childView,plan?.pathDirectory??childDirectory);continue;
      }
      if(!plan||plan.inline){diagnostics.push({file,module:[...path,item.name],kind:'module',message:'External module compilation condition or original header remains unresolved',span:{start:item.start,end:item.end}});continue;}
      const name=plan.name,target=plan.target;
      if(condition.status==='unknown')diagnostics.push({file,module:[...path,name],kind:'module',message:'External module compilation condition remains unproved; complete tracked source candidate retained',span:{start:item.start,end:item.end}});
      if(!boundedChild(file,[...path,name],item))continue;
      if(original.ancestors.includes(target)){diagnostics.push({file,module:[...path,name],kind:'module',message:'Circular tracked module files require compiler rejection',cycle:[...original.ancestors,target],span:{start:item.start,end:item.end}});continue;}
      if(original.ancestors.length>=MODULE_PATH_PROFILE.limits.externalDepth){diagnostics.push({file,module:[...path,name],kind:'module',message:'Tracked module graph exceeds its bounded external-file depth',limit:MODULE_PATH_PROFILE.limits.externalDepth,target,span:{start:item.start,end:item.end}});continue;}
      edges.push({from:file,to:target,module:[...path,name],pathSelection:plan,...(condition.attributes.some(attribute=>attribute.name==='macro_use')?{macroUse:{kind:'textual-module-scope',span:{start:item.start,end:item.end},visibleAfter:item.end}}:{})});
      const inherited=module.configurationCondition==='unknown'||condition.status==='unknown'?'unknown':module.configurationCondition;
      visit(target,[...path,name],plan.directory,inherited,null,null,plan.pathDirectory,original.ancestors);
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

function captureGenericDeclarations(declarations,parser,module,globalSpan,offset){
  const origin={file:module.file,path:[...module.path]};
  for(const type of parser.genericTypes.values()){
    const previous=declarations.find(candidate=>candidate.name===type.name&&candidate.path.length===0);
    if(previous){
      if(previous.term==='generated-type'&&!previous.sourceModuleOrigins.some(candidate=>moduleScopeKey(candidate)===moduleScopeKey(origin)))previous.sourceModuleOrigins.push(origin);
      continue;
    }
    declarations.push({file:module.file,path:[],sourceModuleOrigins:[origin],name:type.name,term:'generated-type',globalSpan,surface:relocate(type,offset)});
  }
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
  const visit = (node, path) => {
    if (!node || typeof node !== 'object') return;
    const link = ['call', 'routerFutureCall'].includes(node.k) ? 'fn' : node.k === 'ctor' ? 'data' : node.kind === 'data' ? 'name' : null;
    if (link) include(node[link], `${path}.${link}`);
    for (const [key,value] of Object.entries(node)) if(!sourceEvidence(key)) {
      if (Array.isArray(value)) value.forEach((item,index)=>visit(item,`${path}.${key}[${index}]`));
      else visit(value,`${path}.${key}`);
    }
  };
  const include = (name, path) => {
    if (needed.has(name)) return;
    const declaration = program.declarations.get(name);
    if (!declaration) throw new Error(`missing checked project dependency ${name} at ${path} (root ${root})`);
    needed.add(name); visit(declaration, `declarations[${JSON.stringify(name)}]`);
  };
  include(root, 'root');
  const declarations = new Map([...program.declarations].filter(([name]) => needed.has(name)));
  return roundTripProgram({ ...program, declarations, items: [...declarations.values()], main: null });
}

export function translateProject(options) {
  const progress=translationProgressReporter(options.progress);
  progress({stage:'project-graph',state:'start',entry:options.entry});
  const cargoEditionContext=options.cargoManifest===undefined||options.cargoManifest===null?null:captureOriginalCargoEdition(options.cargoManifest);
  const graph = resolveModuleGraph(options);
  progress({stage:'project-graph',state:'end',entry:options.entry,total:graph.modules.length});
  progress({stage:'namespace',state:'start',entry:options.entry});
  const jsonParserProfile=options.jsonParserProfile??actualJsonCapabilityProfile();
  let jsonMacroContext=null,jsonMacroDiagnostic=null;
  if(options.jsonMacroDependencies)try{jsonMacroContext=createJsonMacroContext({modules:graph.modules,dependencies:options.jsonMacroDependencies,compilationProfile:graph.compilationProfile});}catch(error){if(!(error instanceof TypeError))throw error;jsonMacroDiagnostic={kind:'unsupported-profile',message:error.message};}
  const externalModules=registeredStandardHostBindings(originalMatchesNamespaceBindings());
  const deriveContext=options.deriveDependencies?createDeriveFootprintContext({modules:graph.modules,dependencies:options.deriveDependencies,externalModules,compilationProfile:graph.compilationProfile}):null;
  const resolvedExternal=deriveContext?deriveFootprintExternalModules(deriveContext):externalModules;
  const toolContext=createToolAttributeContext({modules:graph.modules,externalModules:resolvedExternal,deriveContext,compilationProfile:graph.compilationProfile});
  const bindingEvidence=resolveModuleBindings({modules:graph.modules,externalModules:resolvedExternal,deriveContext,toolContext,compilationProfile:graph.compilationProfile});
  const scopes=new Map(bindingEvidence.scopes.map(scope=>[moduleScopeKey(scope),scope]));
  const configureSourceScope=(parser,module)=>configureParserSourceScope(parser,scopes.get(moduleScopeKey(module)),bindingEvidence.scopes,module.path);
  const matchesMacroContext=createMatchesMacroContext({modules:graph.modules,compilationProfile:graph.compilationProfile,deriveDependencies:options.deriveDependencies??null,cargoEditionContext});
  progress({stage:'namespace',state:'end',entry:options.entry,total:bindingEvidence.scopes.length});
  const declarations = [], refused = [], imports = [], unloweredItems = [], moduleAliases = new Map();
  let completedModules=0,completedMethods=0;
  progress({stage:'module-parse',state:'start',entry:options.entry,total:graph.modules.length});
  for (const module of graph.modules) {
    progress({stage:'module-parse',state:'advance',entry:options.entry,source:module.file,completed:completedModules++,total:graph.modules.length});
    if(module.configurationCondition==='unknown'){refused.push({file:module.file,term:'module',kind:'unsupported',message:'unknown crate compilation condition',span:{start:0,end:module.source.length}});continue;}
    for (const item of module.items.filter(item => !['fn', 'const', 'enum', 'struct', 'use', 'mod'].includes(item.term) || item.name === 'main')) unloweredItems.push({ source: module.file, module: module.path, name: item.name, term: item.term, span: { start: item.start, end: item.end }, sha256: sha256(module.source.slice(item.start, item.end)), diagnostic: 'declaration needs effect, implementation, entrypoint or macro lowering' });
    const configured=configureSourceScope(new MethodRustParser([]),module),aliases=configured.aliases;
    for (const item of module.items.filter(item => item.term === 'use')) {
      const scope=scopes.get(moduleScopeKey(module)),own=scope.unresolvedImports.filter(entry=>entry.span?.start===item.start&&entry.span?.end===item.end);
      imports.push({file:module.file,module:module.path,span:{start:item.start,end:item.end},aliases:Object.fromEntries(aliases.get(module.path.join('.'))??[]),diagnostics:own});
      for(const entry of own)refused.push({file:module.file,name:item.name,term:'use',kind:entry.kind,message:entry.message,span:entry.span});
    }
    moduleAliases.set(moduleScopeKey(module), aliases);
    for (const item of module.items.filter(item => ['fn', 'const', 'enum', 'struct'].includes(item.term) && item.name !== 'main')) {
      try {
        const parser = new MethodRustParser(tokenizeRust(module.source.slice(item.start, item.end)));
        parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
        configureSourceScope(parser,module);
        if(jsonMacroContext)configureJsonMacroParser(parser,jsonMacroContext,{file:module.file,modulePath:module.path,offset:item.start});
        configureToolAttributes(parser,toolContext,module,item,module.source.slice(item.start,item.end));
        parser.aliases = aliases;
        parser.modulePath = module.path;
        configureMatchesMacroParser(parser,matchesMacroContext,{file:module.file,modulePath:module.path,offset:item.start});
        const deriveCertificate=deriveContext&&['struct','enum'].includes(item.term)?deriveFootprintAt(deriveContext,module,item):null;
        if(deriveCertificate)configureDeriveLayout(parser,deriveCertificate,module.source.slice(item.start,item.end),item.start);
        let surface;
        if (['struct', 'enum'].includes(item.term)) {
          // Layout parsing owns outer, variant and field attributes. Feeding
          // the original token cursor from zero retains their exact metadata.
          const root = { main: null }; const items = [];
          parser.items(root, items, module.path, () => parser.cursor.atEnd());
          if (items.length !== 1 || items[0].k !== 'data') throw new TranslationError('syntax', 'expected one original data declaration', parser.cursor.peek());
          surface = items[0];
        } else {
          const attributes=parser.attributes(); parser.visibility();
          if (parser.cursor.is('const') && parser.cursor.is('fn', 1)) { const qualifier=parser.cursor.next(),fn=parser.fn(module.path); surface = {...fn,constFunction:true,span:{...fn.span,start:qualifier.start}}; }
          else if (parser.cursor.is('fn') || parser.cursor.is('async')) surface = parser.fn(module.path);
          else if (parser.cursor.is('const')) surface = parser.constItem(module.path);
          else throw new TranslationError('syntax', 'expected original function or constant', parser.cursor.peek());
          if(attributes.some(attribute=>attribute.kind==='tool'))surface={...surface,rustAttributes:attributes};
        }
        if (!parser.cursor.atEnd()) throw new TranslationError('syntax', 'unconsumed declaration tokens', parser.cursor.peek());
        const base = module.offset + item.start;
        const semantic=relocate(surface,base);
        linkProjectDeclaration(parser,surface,semantic,{source:module.source,sourcePath:module.file,itemSpan:{start:item.start,end:item.end},itemOffset:item.start,globalOffset:module.offset,path:module.path,scope:{bindingEvidence:scopes.get(moduleScopeKey(module)),compilationProfile:graph.compilationProfile,configurationCondition:module.configurationCondition}});
        declarations.push({ file: module.file, path: module.path, name: [...module.path, item.name].join('.'), term: item.term, span: { start: item.start, end: item.end }, globalSpan: { start: base, end: module.offset + item.end }, surface: semantic });
        captureGenericDeclarations(declarations,parser,module,{start:base,end:module.offset+item.end},base);
      } catch (error) {
        if (!(error instanceof TranslationError)) throw error;
        const refusal=diagnostic(error);
        // This parser consumed the original declaration slice. Its UTF-16
        // cursor coordinates become whole-file coordinates exactly once.
        if(refusal.span)refusal.span={start:item.start+refusal.span.start,end:item.start+refusal.span.end};
        refused.push({ file: module.file, module: module.path, name: item.name, term: item.term, ...refusal });
      }
    }
  }
  progress({stage:'module-parse',state:'end',entry:options.entry,completed:completedModules,total:graph.modules.length});
  progress({stage:'method-parse',state:'start',entry:options.entry});
  const copyEvidence=projectCopyEvidence(declarations,graph.modules,moduleAliases,scopes),fieldEvidenceBySurface=new Map();
  for (const module of graph.modules) {
    if(module.configurationCondition!=='active')continue;
    const extracted = extractImplDeclarations(module.source, {sourcePath:module.file,modulePath:module.path,sourceView:module.sourceView,compilationProfile:module.compilationProfile});
    for (const implementation of extracted.implementations) {
      const original=(module.allItems??module.items).find(item=>item.term==='impl'&&item.start===implementation.span.start);
      if(original&&itemConfiguration(original.tokens,graph.compilationProfile).status==='inactive')continue;
      for (const method of implementation.methods) {
        if(completedMethods%32===0)progress({stage:'method-parse',state:'advance',entry:options.entry,source:module.file,completed:completedMethods});
        completedMethods++;
        const aliases = moduleAliases.get(moduleScopeKey(module))?.get(module.path.join('.'));
        const resolved = aliases?.has(implementation.typePath[0]) ? [...aliases.get(implementation.typePath[0]), ...implementation.typePath.slice(1)] : implementation.typePath;
        const qualifiedType = ['crate','self','super'].includes(resolved[0]) ? resolved : ['crate',...module.path,...resolved];
        const display = [...qualifiedType.slice(1),method.name].join('.');
        const copyProof=method.receiver==='value'?copyEvidence(qualifiedType,module,method.span):null,certificate=copyProof?.verified?copyProof:null;
        if (!method.loweringReady && !certificate) {refused.push({file:module.file,name:display,term:'method',span:method.span,kind:'unsupported',message:method.diagnostics.map(item=>item.message).join('; '),...(copyProof?{copyDiagnostics:copyProof.diagnostics}: {})});continue;}
        try {
          const lowered = certificate ? lowerCopyMethodTokens(method,certificate.type,certificate) : lowerSharedMethodTokens(method,qualifiedType);
          let transform=null;
          // A closed original owner can acquire source association. Existing
          // independent method checking remains available without that claim;
          // its unconfigured original macro route still refuses explicitly.
          try{transform=createOriginalMethodTokenTransform(matchesMacroContext,method,lowered);}catch(error){if(!(error instanceof OriginalMethodOwnerUnproved))throw error;}
          let originalParsed=null;
          if(transform){try{originalParsed=parseOriginalMethodTransform(transform);}catch(error){if(error instanceof TypeError)throw new TranslationError('unsupported','original method source contract: '+error.message,method.span);throw error;}}
          const parser = originalParsed?originalMethodParsedFacts(originalParsed).parser:new MethodRustParser(lowered.tokens);
          if(!originalParsed){
          parser.modulePath = module.path;
          configureSourceScope(parser,module);
          // Methods inherit the module's checked import aliases.
          parser.aliases = moduleAliases.get(moduleScopeKey(module)) ?? new Map();
          parser.shadowedEffectRoots = new Set(graph.modules.flatMap(entry => [...entry.path.filter(name => ['std', 'tokio','serde_json'].includes(name)), ...entry.items.filter(item => item.term === 'mod' && ['std', 'tokio','serde_json'].includes(item.name)).map(item => item.name)]));
          parser.attributes(); parser.visibility();
          }
          const qualifier=!originalParsed&&parser.cursor.is('const')?parser.cursor.next():null,fn=originalParsed?.entry??parser.fn(module.path);
          const fieldEvidence=originalParsed?issueMethodFieldEvidence(originalParsed,lowered.sharedReceiverSource?copyEvidence.fieldCertificates?.(qualifiedType,module,method.receiverSpan)??[]:[]):null;
          const surface = originalParsed?originalMethodSemantic(originalParsed,{fieldEvidence}):{...fn,...(qualifier?{constFunction:true,span:{...fn.span,start:qualifier.start}}:{})};
          if (!parser.cursor.atEnd()) throw new TranslationError('syntax','unconsumed inherent method tokens',parser.cursor.peek());
          if(!originalParsed){
          surface.name = `ml_impl_${Buffer.from(qualifiedType.join('.')).toString('hex')}_${Buffer.from(method.name).toString('hex')}`;
          surface.generated = 'router-checked-inherent-method';
          if(lowered.sharedReceiverSource) {
            const type=surface.params[0]?.type;
            if(type?.rustReference?.kind!=='shared'||!type.rustReference.pointee)throw new TranslationError('unsupported','shared inherent receiver requires an actual checked pointee',method.receiverSpan);
            surface.params[0].type={...type,rustReference:{...type.rustReference,pointee:{...type.rustReference.pointee,rustSharedReceiverSource:lowered.sharedReceiverSource,rustSharedFieldCopies:copyEvidence.fieldCertificates?.(qualifiedType,module,method.receiverSpan)??[]}}};
          }
          surface.impl = {type:{kind:'named',path:qualifiedType},method:method.name,receiver:method.receiver,receiverName:lowered.receiverName,...(lowered.sharedReceiverSource?{sharedReceiverSource:lowered.sharedReceiverSource}:{}),...(certificate?{copyCertificate:certificate}:{}),rewrites:lowered.rewrites,assumptions:lowered.assumptions};
          }
          const globalSpan = {start:module.offset+method.span.start,end:module.offset+method.span.end};
          const semantic=originalParsed?relocateOriginalMethodSemantic(surface,module.offset):relocate(surface,module.offset);
          if(fieldEvidence)fieldEvidenceBySurface.set(semantic,fieldEvidence);
          if(!originalParsed&&certificate)semantic.impl.copyCertificate=certificate;
          if(originalParsed)linkProjectMethodDeclaration(parser,originalParsed.entry,surface,semantic,{source:module.source,sourcePath:module.file,memberSpan:method.span,bodySpan:method.bodySpan,globalOffset:module.offset,scope:{bindingEvidence:scopes.get(moduleScopeKey(module)),compilationProfile:graph.compilationProfile,configurationCondition:module.configurationCondition}});
          declarations.push({file:module.file,path:module.path,name:[...module.path,surface.name].join('.'),displayName:display,term:'method',span:method.span,globalSpan,surface:semantic});
          captureGenericDeclarations(declarations,parser,module,globalSpan,module.offset);
        } catch(error) {if(!(error instanceof TranslationError))throw error;refused.push({file:module.file,name:display,term:'method',...diagnostic(error)});}
      }
    }
  }
  progress({stage:'method-parse',state:'end',entry:options.entry,completed:completedMethods});
  const duplicateNames = new Set(declarations.filter((entry, index) => declarations.findIndex(candidate => candidate.name === entry.name) !== index).map(entry => entry.name));
  for (const entry of declarations.filter(entry => duplicateNames.has(entry.name))) refused.push({ file: entry.file, name: entry.name, term: entry.term, kind: 'ambiguous', message: 'duplicate module-scoped declaration', span: entry.span });
  let active = declarations.filter(entry => !duplicateNames.has(entry.name)), checked;
  // Discard a failed declaration phase and remove its attributed original
  // owners. Opt-in body collection does not return partial IR. Every survivor
  // and caller is checked afresh; post-check proof failures remain ordinary.
  progress({stage:'semantic-check',state:'start',entry:options.entry,remaining:active.length});
  for (let attempts = 0; attempts <= declarations.length; attempts++) {
    progress({stage:'semantic-check',state:'advance',entry:options.entry,attempt:attempts,remaining:active.length});
    try { checked = roundTripProgram(checkProjectProgram({ language: 'Rust', items: [...tree(active), ...admittedHostData(effectData(),tree(active))], main: null },{jsonParserProfile,collectIndependentBodies:options.collectIndependentBodies??true})); break; }
    catch (error) {
      const failures=declarationRefusals(error)??(error instanceof TranslationError?[{error}]:null);
      if(!failures)throw error;
      const owners=new Set();
      for(const failure of failures) {
        const cause=failure.error;
        const owner=active.find(declaration=>cause.span&&declaration.globalSpan.start<=cause.span.start&&cause.span.start<declaration.globalSpan.end);
        if(!owner||failure.name&&failure.name!==owner.name)throw new Error(`unattributed project semantic refusal: ${cause.reason}`,{cause});
        if(owners.has(owner))continue;
        owners.add(owner);refused.push({file:owner.file,name:owner.name,term:owner.term,...diagnostic(cause)});
        progress({stage:'semantic-refusal',state:'advance',entry:options.entry,source:owner.file,declaration:owner.name,phase:failure.phase??'uncollected',attempt:attempts,completed:owners.size});
      }
      active=active.filter(declaration=>!owners.has(declaration));
    }
  }
  if (!checked) throw new Error('project declaration checking did not converge');
  progress({stage:'semantic-check',state:'end',entry:options.entry,remaining:active.length});
  progress({stage:'target-emit',state:'start',entry:options.entry});
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
  progress({stage:'target-emit',state:'end',entry:options.entry});
  progress({stage:'project-serialize',state:'start',entry:options.entry});
  const meta = { schema: 'tracked-rust-project-semantic-meta-v1', compilationProfile:graph.compilationProfile, standardNamespaceCensus:STANDARD_NAMESPACE_EVIDENCE, configurationEvidence:graph.modules.map(module=>({source:module.file,condition:module.configurationCondition,items:module.configurationEvidence})), status: 'partial', entry: options.entry, runtimeParity: false, sources: graph.modules.map(module => ({ source: module.file, sha256: sha256(module.source), module: module.path })), moduleEdges: graph.edges, imports, moduleDiagnostics: graph.diagnostics, bindingEvidence, refused, unloweredItems, executable: entries.map(entry => ({ source: entry.file, name: entry.name, term: entry.term, span: entry.span })), checkedSemanticProgram: JSON.parse(serializeProgram(checked)), targetSemanticProgram: JSON.parse(serializeProgram(target.program)), checkedMethods: methods.map(entry=>({source:entry.file,name:entry.displayName,span:entry.span,receiver:entry.surface.impl.receiver})), encodings: emitted.encodings, assumptions: emitted.assumptions };
  if(deriveContext)meta.deriveNamespaceFootprints=deriveContext;
  if(toolContext.certificates.length)meta.toolAttributeFootprints=toolContext;
  if(jsonMacroContext)meta.jsonMacroContext=jsonMacroContext;
  if(jsonMacroDiagnostic)meta.jsonMacroDiagnostic=jsonMacroDiagnostic;
  meta.jsonParserProfile=jsonParserProfile;
  meta.matchesMacroContext=matchesMacroContext;
  meta.originalCargoEditionInput=originalCargoEditionEvidence(cargoEditionContext);
  const sourceScopes=graph.modules.map(module=>Object.freeze({source:module.file,module:[...module.path],sourceView:module.sourceView,sha256:sha256(module.source),project:options.entry,compilationProfile:graph.compilationProfile,configurationCondition:module.configurationCondition,configurationEvidence:Object.freeze([...module.configurationEvidence]),scope:scopes.get(moduleScopeKey(module)),scopes:bindingEvidence.scopes,jsonParserProfile,matchesMacroContext}));
  const lowerDeclaration=(entry,name)=>function(lowerOptions={}) {
    const program=declarationProgram(target.program,target.names.get(entry.name));
    const emitted=emitJavaScript(program,lowerOptions),own=program.declarations.get(target.names.get(entry.name));
    const targetMapping=emitted.mappings.find(mapping=>mapping.source===own.fullName);
    const signatures=[...program.declarations.values()].filter(entry=>entry.k==='fn').map(entry=>({target:emitted.mappings.find(mapping=>mapping.source===entry.fullName)?.target,params:entry.params,ret:entry.async?{kind:'routerFuture',value:entry.ret}:entry.ret}));
    return {own,program,emitted:{...emitted,signatures,mappings:[...emitted.mappings,{...targetMapping,source:name}]}};
  };
  const executableDeclarations=entries.map(entry=>({source:entry.file,sourceSha256:sha256(graph.modules.find(module=>module.file===entry.file).source),name:entry.name.split('.').at(-1),span:entry.span,project:options.entry,qualifiedName:entry.name,lower:lowerDeclaration(entry,entry.name.split('.').at(-1))}));
  // This additive facade closes over the same actual checked program. It does
  // not append a synthetic Rust wrapper or count a method as a source fn.
  const checkedMethodDeclarations=methods.map(entry=>{
    const own=checked.declarations.get(entry.name),name=entry.surface.impl.method;
    const facade=Object.freeze({source:entry.file,sourceSha256:sha256(graph.modules.find(module=>module.file===entry.file).source),name,term:'method',span:Object.freeze({...entry.span}),project:options.entry,qualifiedName:entry.name,displayName:entry.displayName,receiver:entry.surface.impl.receiver,compilationProfile:graph.compilationProfile,signature:freezeMacroTree(structuredClone({params:own.params,ret:own.ret})),lower:lowerDeclaration(entry,name)});
    const token=fieldEvidenceBySurface.get(entry.surface);if(token)checkedMethodFieldOrigins.set(facade,originalProjectMethodFieldEvidence(token,methodFieldEvidence.get(token).transform));
    return facade;
  });
  progress({stage:'project-serialize',state:'end',entry:options.entry});
  return { meta, javascript, typescript, executableDeclarations, checkedMethodDeclarations, sourceScopes };
}
