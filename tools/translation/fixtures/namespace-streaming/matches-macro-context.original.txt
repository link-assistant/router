// Per-call proof from genuine original module views. No caller-closed flags or
// external namespace tables are accepted as authority.
import {createHash} from 'node:crypto';
import {lockedTomlValueNamespaceBindings} from './toml-value-namespace.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {types} from 'node:util';
import {copyMetadata,metadataDigest,ownData} from './extensions/source-links.mjs';
import {captureOriginalMacroModules,originalMacroModules} from './original-macro-module-context.mjs';
import {captureSourceModuleViews,originalSourceModuleItems,moduleScopeKey} from './source-module-views.mjs';
import {resolveModuleBindings} from './module-bindings.mjs';
import {createDeriveFootprintContext,deriveFootprintExternalModules} from './derive-footprints.mjs';
import {createDeriveBangContext} from './derive-bang-context.mjs';
import {createToolAttributeContext} from './tool-attributes.mjs';
import {capturedRustTokenSource} from './extensions/lexical.mjs';
import {loadStandardMatchesSourceProfile,isStandardMatchesSourceProfile} from './matches-source-profile.mjs';
import {freezeMacroTree,originalMacroInvocation} from './macro-token-trees.mjs';
import {macroProvenance} from './macro-provenance.mjs';
import {originalMethodMember} from './impl-resolver.mjs';
import {originalMethodTransformFacts,originalMethodParserTokenFacts} from './source-method-transforms.mjs';
import {configureParserSourceScope} from './source-scopes.mjs';
import {itemConfiguration,compilationProfile as normalizeProfile} from './cfg-profile.mjs';
import {originalCargoEditionEvidence,configureRustEditionParser} from './cargo-edition-context.mjs';
const contexts=new WeakMap(),immutableContexts=new WeakMap(),parsers=new WeakMap(),issuedFrames=new WeakMap(),calls=new WeakMap(),hash=text=>createHash('sha256').update(text).digest('hex');
let standardProfile=null;
const mapEntries=Map.prototype.entries,mapGet=Map.prototype.get,mapHas=Map.prototype.has,mapSet=Map.prototype.set,mapDelete=Map.prototype.delete,mapSize=Object.getOwnPropertyDescriptor(Map.prototype,'size').get,mapNext=Object.getPrototypeOf(new Map().entries()).next;
function nativeEntries(map){if(!map||types.isProxy(map)||Object.getPrototypeOf(map)!==Map.prototype||Reflect.ownKeys(map).length)throw new TypeError('Matches namespace resolution requires original native binding maps');return [...mapEntries.call(map)];}
function namespaceDigest(parser){const aliases=ownData(parser,'sourceNamespaceAliases');if(types.isProxy(aliases))throw new TypeError('Matches namespace evidence is a proxy');return metadataDigest(['type','value','macro'].map(namespace=>[namespace,nativeEntries(ownData(aliases,namespace)).map(([path,map])=>[path,nativeEntries(map)])]));}
// Initial capture may reuse only a privately reconstructed immutable value.
// Caller Maps never enter this cache. Validation compares every mutable map
// entry and target descriptor against a live private capture; eviction or
// changed ambient machinery retains the original complete digest route.
const namespaceCaptureLimits=Object.freeze({contextEntries:2,entries:8,entryBytes:2097152,bytes:8388608});
const originalJson=JSON,originalJsonStringify=JSON.stringify;
const originalArray=Array,originalArrayIsArray=Array.isArray,originalArrayIterator=Array.prototype[Symbol.iterator],originalArraySome=Array.prototype.some;
const originalMap=Map,originalMapPrototype=Map.prototype,mapDescriptors=Object.freeze(Reflect.ownKeys(Map.prototype).map(key=>Object.freeze([key,Object.freeze(Object.getOwnPropertyDescriptor(Map.prototype,key))]))),mapIteratorPrototype=Object.getPrototypeOf(new Map().entries());
const iteratorPrototype=Object.getPrototypeOf(mapIteratorPrototype),iteratorMethod=Object.getOwnPropertyDescriptor(iteratorPrototype,Symbol.iterator).value;
const namespaceCaptureEntries=new Map();let namespaceCaptureBytes=0;
const parserNamespaceCaptures=new WeakMap();
const namespaceCaptureReleases=new FinalizationRegistry(token=>discardNamespaceCapture(token));
const registerNamespaceRelease=FinalizationRegistry.prototype.register,unregisterNamespaceRelease=FinalizationRegistry.prototype.unregister;
function discardNamespaceCapture(token){
  const entry=mapGet.call(namespaceCaptureEntries,token);if(!entry)return;
  mapDelete.call(namespaceCaptureEntries,token);namespaceCaptureBytes-=entry.bytes;
  // Global bookkeeping never retains issuer/module roots. Clearing the data
  // immediately also prevents inactive issuer slots retaining evicted bytes.
  entry.snapshot=null;entry.digest=null;entry.active=false;unregisterNamespaceRelease.call(namespaceCaptureReleases,entry);
}
const firstMapEntry=map=>mapNext.call(mapEntries.call(map)).value;
function exactNamespaceTarget(actual,expected){
  if(types.isProxy(actual)||!Array.isArray(actual)||Object.getPrototypeOf(actual)!==Array.prototype)return false;
  const descriptors=Object.getOwnPropertyDescriptors(actual),keys=Reflect.ownKeys(descriptors);
  if(keys.length!==expected.length+1||descriptors.length?.value!==expected.length)return false;
  const ownIndexes={__proto__:null};for(let at=0;at<keys.length;at++)ownIndexes[keys[at]]=true;
  for(let index=0;index<expected.length;index++){const descriptor=ownIndexes[index]===true?descriptors[index]:undefined;if(!descriptor||!Object.hasOwn(descriptor,'value')||!descriptor.enumerable||descriptor.value!==expected[index]||typeof expected[index]!=='string')return false;}
  return true;
}
function exactNamespaceCapture(parser,snapshot){
  const aliases=ownData(parser,'sourceNamespaceAliases');if(types.isProxy(aliases))throw new TypeError('Matches namespace evidence is a proxy');
  for(const[namespace,scopes]of snapshot){
    const actualScopes=nativeEntries(ownData(aliases,namespace));if(actualScopes.length!==scopes.length)return false;
    for(let index=0;index<scopes.length;index++){
      const[path,bindings]=scopes[index],[actualPath,map]=actualScopes[index];if(actualPath!==path)return false;
      const actualBindings=nativeEntries(map);if(actualBindings.length!==bindings.length)return false;
      for(let at=0;at<bindings.length;at++){const[name,target]=bindings[at],[actualName,actualTarget]=actualBindings[at];if(actualName!==name||!exactNamespaceTarget(actualTarget,target))return false;}
    }
  }
  return true;
}
function issuedNamespaceCapture(issued,module,scope){
  let entry=mapGet.call(issued.namespaceCaptures,module);
  if(entry?.active){mapDelete.call(issued.namespaceCaptures,module);mapSet.call(issued.namespaceCaptures,module,entry);mapDelete.call(namespaceCaptureEntries,entry.token);mapSet.call(namespaceCaptureEntries,entry.token,entry);return entry;}
  if(entry)mapDelete.call(issued.namespaceCaptures,module);
  // The null-prototype carrier cannot consume a caller parser's properties or
  // setters. The unchanged source-scope builder supplies fresh native Maps.
  // A private build failure cannot add a refusal to the old capture route.
  let snapshot,digest,bytes;
  try{
    const carrier=Object.create(null);configureParserSourceScope(carrier,scope,issued.evidence.scopes,module.path);
    snapshot=freezeMacroTree(copyMetadata(['type','value','macro'].map(namespace=>[namespace,nativeEntries(ownData(carrier.sourceNamespaceAliases,namespace)).map(([path,map])=>[path,nativeEntries(map)])])));
    digest=metadataDigest(snapshot);bytes=Buffer.byteLength(JSON.stringify(snapshot));
    if(bytes>namespaceCaptureLimits.entryBytes)return null;
  }catch{return null;}
  while(mapSize.call(issued.namespaceCaptures)>=namespaceCaptureLimits.contextEntries){const[oldModule,old]=firstMapEntry(issued.namespaceCaptures);mapDelete.call(issued.namespaceCaptures,oldModule);discardNamespaceCapture(old.token);}
  while(mapSize.call(namespaceCaptureEntries)>=namespaceCaptureLimits.entries||namespaceCaptureBytes+bytes>namespaceCaptureLimits.bytes)discardNamespaceCapture(firstMapEntry(namespaceCaptureEntries)[0]);
  entry={snapshot,digest,bytes,token:Symbol('private original matches namespace capture'),active:true};
  mapSet.call(issued.namespaceCaptures,module,entry);mapSet.call(namespaceCaptureEntries,entry.token,entry);namespaceCaptureBytes+=bytes;registerNamespaceRelease.call(namespaceCaptureReleases,issued,entry.token,entry);return entry;
}
function originalNamespaceCaptureIntrinsics(){
  // The original metadata serializer remains the fallback under ambient
  // serializer/prototype changes. A cached byte digest cannot stand in for a
  // changed stringify callback or an inherited toJSON hook.
  if(Object.getOwnPropertyDescriptor(globalThis,'JSON')?.value!==originalJson||Object.getOwnPropertyDescriptor(originalJson,'stringify')?.value!==originalJsonStringify||Object.getOwnPropertyDescriptor(Array.prototype,'toJSON')||Object.getOwnPropertyDescriptor(Object.prototype,'toJSON'))return false;
  // Direct comparisons iterate ordinary arrays and the guard below uses
  // their `some` method. Check these data values before either can dispatch
  // through changed ambient callbacks; the full original digest is fallback.
  if(Object.getOwnPropertyDescriptor(globalThis,'Array')?.value!==originalArray||Object.getOwnPropertyDescriptor(originalArray,'isArray')?.value!==originalArrayIsArray||Object.getOwnPropertyDescriptor(Array.prototype,Symbol.iterator)?.value!==originalArrayIterator||Object.getOwnPropertyDescriptor(Array.prototype,'some')?.value!==originalArraySome)return false;
  // Avoid an additional private builder call when its public Map machinery
  // has changed. The original caller construction/capture remains the route.
  if(Object.getOwnPropertyDescriptor(globalThis,'Map')?.value!==originalMap||Reflect.ownKeys(originalMapPrototype).length!==mapDescriptors.length||mapDescriptors.some(([key,expected])=>{const actual=Object.getOwnPropertyDescriptor(originalMapPrototype,key);return !actual||Reflect.ownKeys(expected).some(field=>actual[field]!==expected[field]);})||Object.getOwnPropertyDescriptor(mapIteratorPrototype,'next')?.value!==mapNext||Object.getPrototypeOf(mapIteratorPrototype)!==iteratorPrototype||Object.getOwnPropertyDescriptor(mapIteratorPrototype,Symbol.iterator)||Object.getOwnPropertyDescriptor(iteratorPrototype,Symbol.iterator)?.value!==iteratorMethod)return false;
  return true;
}
function initialNamespaceDigest(parser,issued,module,scope){
  parserNamespaceCaptures.delete(parser);
  if(!originalNamespaceCaptureIntrinsics())return namespaceDigest(parser);
  const capture=issuedNamespaceCapture(issued,module,scope);
  if(!capture||!exactNamespaceCapture(parser,capture.snapshot))return namespaceDigest(parser);
  parserNamespaceCaptures.set(parser,capture);return capture.digest;
}
function originalParserNamespaceUnchanged(parser,expected){
  const capture=parserNamespaceCaptures.get(parser);
  // Eviction clears snapshot/digest even while a parser retains this small
  // entry carrier. No independent per-parser namespace tree is retained.
  if(capture?.active&&capture.digest===expected&&originalNamespaceCaptureIntrinsics()&&exactNamespaceCapture(parser,capture.snapshot))return true;
  return namespaceDigest(parser)===expected;
}
// Only the actual producer's recursively frozen roots qualify for reuse.
// Publicly exposed context wrappers remain untrusted mutable surfaces.
function immutableContext(context,facts){
  const issued=immutableContexts.get(context);
  if(!issued||facts!==issued.facts||['modules','evidence','profile','compilationProfile','cargoEditionContext'].some(key=>ownData(facts,key)!==issued[key]))throw new TypeError('Matches context immutable roots differ from their private issuance');
  return issued;
}
function immutableNamespaceIndices(modules,evidence){
  const moduleByKey=new Map(),scopeByKey=new Map(),scopeByPath=new Map(),ancestors=new WeakMap();
  // Retain find-first behavior. Only the genuine deeply frozen issuer roots
  // enter these private indices; exposed facts and parser Maps never do.
  for(const module of modules){const key=moduleScopeKey(module);if(!mapHas.call(moduleByKey,key))mapSet.call(moduleByKey,key,module);}
  for(const scope of evidence.scopes){const key=moduleScopeKey(scope),path=JSON.stringify(scope.path);if(!mapHas.call(scopeByKey,key))mapSet.call(scopeByKey,key,scope);if(!mapHas.call(scopeByPath,path))mapSet.call(scopeByPath,path,scope);}
  for(const module of modules)ancestors.set(module,Object.freeze(evidence.scopes.filter(scope=>scope.path.every((part,index)=>module.path[index]===part))));
  const shadowedEffectRoots=Object.freeze([...new Set(modules.flatMap(module=>[...module.path.filter(name=>['std','tokio','serde_json'].includes(name)),...originalSourceModuleItems(module).filter(item=>item.term==='mod'&&['std','tokio','serde_json'].includes(item.name)).map(item=>item.name)]))]);
  return {moduleByKey,scopeByKey,scopeByPath,ancestors,shadowedEffectRoots};
}
// Configure sites alone bind these original fields. The exposed frame remains
// mutable so consumers cannot mistake its own recomputable digest for issuance.
function recordParserFrame(parser,frame){
  immutableContext(frame.context,frame.facts);
  const fields=Object.freeze({...frame}),keys=Object.freeze(Reflect.ownKeys(fields));
  const descriptors=Object.freeze(Object.fromEntries(keys.map(key=>[key,Object.freeze(Object.getOwnPropertyDescriptor(frame,key))])));
  parsers.set(parser,frame);issuedFrames.set(frame,Object.freeze({parser,fields,keys,descriptors}));
}
function originalParserFrame(frame){
  const issued=issuedFrames.get(frame);
  if(!issued||parsers.get(issued.parser)!==frame||Object.getPrototypeOf(frame)!==Object.prototype)throw new TypeError('Matches parser frame differs from its private issuance');
  const keys=Reflect.ownKeys(frame);
  if(keys.length!==issued.keys.length||keys.some(key=>!issued.keys.includes(key))||issued.keys.some(key=>{
    const actual=Object.getOwnPropertyDescriptor(frame,key),expected=issued.descriptors[key];
    return !actual||!Object.hasOwn(actual,'value')||actual.value!==expected.value||actual.enumerable!==expected.enumerable||actual.writable!==expected.writable||actual.configurable!==expected.configurable;
  }))throw new TypeError('Matches parser frame fields differ from their private issuance');
  immutableContext(issued.fields.context,issued.fields.facts);
  return frame;
}
function parserFrame(parser){const frame=parsers.get(parser);return frame?originalParserFrame(frame):null;}
function originalOwnerHashes(issued,module,scope){
  if(!issued.moduleHashes.has(module)||!issued.scopes.has(scope))throw new TypeError('Matches owner hashes require the actual issued module and scope');
  let scopeHashes=issued.scopeHashes.get(scope);
  if(!scopeHashes){
    // Keep the original full metadata shape/cycle/depth/cell/byte validation.
    // A cache hit is safe only because the validated issued scope is deeply
    // frozen. Mutable members, parser evidence, tokens and Maps never enter.
    const scopeMetadataSha256=metadataDigest(scope);
    scopeHashes=Object.freeze({scopeSha256:hash(JSON.stringify(scope)),scopeMetadataSha256});
    issued.scopeHashes.set(scope,scopeHashes);
  }
  return {...scopeHashes,sourceSha256:issued.moduleHashes.get(module)};
}
export function originalMatchesNamespaceBindings(){const profile=standardProfile??=loadStandardMatchesSourceProfile();return ['std','core'].map(root=>Object.freeze({name:profile.name,namespace:'macro',macroKind:'bang',target:[root,profile.name],kind:'macro',originalNamespaceDigest:profile.digest}));}
function standardExternal(dependencies){return registeredStandardHostBindings([...originalMatchesNamespaceBindings(),...lockedTomlValueNamespaceBindings(dependencies)]);}

export function createMatchesMacroContext({modules,compilationProfile=null,deriveDependencies=null,cargoEditionContext=null}={}) {
  if(cargoEditionContext!==null&&!originalCargoEditionEvidence(cargoEditionContext))throw new TypeError('Matches source context requires private original Cargo edition evidence');
  const profile=standardProfile??=loadStandardMatchesSourceProfile(),snapshot=captureOriginalMacroModules({modules,compilationProfile}),original=originalMacroModules(snapshot),external=standardExternal(deriveDependencies);
  const deriveContext=deriveDependencies?createDeriveFootprintContext({modules:original.modules,dependencies:deriveDependencies,externalModules:external,compilationProfile:original.compilationProfile}):null;
  const resolvedExternal=deriveContext?deriveFootprintExternalModules(deriveContext):external;
  const toolContext=createToolAttributeContext({modules:original.modules,externalModules:resolvedExternal,deriveContext,compilationProfile:original.compilationProfile});
  const deriveBangContext=deriveContext?createDeriveBangContext({deriveContext}):null;
  const evidence=freezeMacroTree(resolveModuleBindings({modules:original.modules,externalModules:resolvedExternal,deriveContext,deriveBangContext,toolContext,compilationProfile:original.compilationProfile}));
  const certificate=freezeMacroTree({schema:'original-standard-matches-call-context-v1',profileDigest:profile.digest,compilationProfile:original.compilationProfile,originalModules:original.modules.map(module=>({file:module.file,path:module.path,sha256:hash(module.source),sourceViewDigest:module.sourceView.digest,configurationCondition:module.configurationCondition??module.sourceView.configurationCondition})),namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
  const facts={...original,profile,evidence,cargoEditionContext};
  contexts.set(certificate,facts);
  immutableContexts.set(certificate,Object.freeze({facts,...original,profile,evidence,cargoEditionContext,...immutableNamespaceIndices(original.modules,evidence),moduleHashes:new WeakMap(original.modules.map((module,index)=>[module,certificate.originalModules[index].sha256])),scopes:new WeakSet(evidence.scopes),scopeHashes:new WeakMap(),namespaceCaptures:new Map()}));
  return certificate;
}
export const isMatchesMacroContext=value=>!!value&&contexts.has(value);
export function standaloneMatchesMacroContext(source,{file='src/module.rs',compilationProfile=null,cargoEditionContext=null}={}) {
  const captured=captureSourceModuleViews({source,sourcePath:file,compilationProfile});
  return createMatchesMacroContext({modules:captured.views.map(sourceView=>({file,path:[...sourceView.modulePath],source,sourceView,compilationProfile,configurationCondition:sourceView.configurationCondition})),compilationProfile,cargoEditionContext});
}
export function configureMatchesMacroParser(parser,context,{file,modulePath=[],offset=0,allowEmptyMainCarrier=false}={}) {
  const facts=contexts.get(context),captured=capturedRustTokenSource(parser.cursor.tokens);
  if(!facts||!captured||!Number.isSafeInteger(offset)||offset<0)throw new TypeError('Matches parser requires private original context and tokenizer source');
  const issued=immutableContext(context,facts);
  const module=mapGet.call(issued.moduleByKey,JSON.stringify([file,modulePath]));
  if(!module)throw new TypeError('Matches parser module is outside its original context');
  let source=captured.source;
  if(allowEmptyMainCarrier&&source.endsWith('\nfn main() {}\n'))source=source.slice(0,-'\nfn main() {}\n'.length);
  if(module.source.slice(offset,offset+source.length)!==source||offset<module.sourceView.bodySpan.start||offset+source.length>module.sourceView.bodySpan.end)throw new TypeError('Matches parser source slice differs from its original module view');
  if(JSON.stringify(normalizeProfile(parser.compilationProfile??null))!==JSON.stringify(facts.compilationProfile))throw new TypeError('Matches parser compilation profile differs from its source context');
  const scope=mapGet.call(issued.scopeByKey,moduleScopeKey(module));
  configureParserSourceScope(parser,scope,facts.evidence.scopes,module.path);parser.modulePath=[...module.path];
  // The legacy use parser may update its working alias table. The genuine
  // namespace maps consumed by source resolution stay separate and sealed.
  parser.aliases=new Map(nativeEntries(parser.sourceNamespaceAliases.type).map(([path,map])=>[path,new Map(nativeEntries(map))]));
  configureRustEditionParser(parser,facts.cargoEditionContext);
  recordParserFrame(parser,{context,facts,module,offset,sourceLength:source.length,captured,tokens:parser.cursor.tokens,namespaceDigest:initialNamespaceDigest(parser,issued,module,scope)});return parser;
}
export function matchesParserFacts(parser) {
  const facts=parserFrame(parser);
  const captured=facts?.methodTransform?originalMethodParserTokenFacts(facts.tokens):facts?capturedRustTokenSource(facts.tokens):null;
  if(!facts||parser.cursor.tokens!==facts.tokens||(facts.methodTransform?captured.proof!==facts.methodTransform:captured!==facts.captured)||JSON.stringify(normalizeProfile(parser.compilationProfile??null))!==JSON.stringify(facts.facts.compilationProfile)||JSON.stringify(parser.modulePath??[])!==JSON.stringify(facts.module.path)||!originalParserNamespaceUnchanged(parser,facts.namespaceDigest))throw new TypeError('Matches parser lost its original private source association');
  return facts;
}
function resolvedMacroPath(state,segments) {
  const issued=immutableContext(state.context,state.facts),scope=mapGet.call(issued.scopeByKey,moduleScopeKey(state.module)),consumer=state.module.path;
  const visible=binding=>!binding?.visibility||binding.visibility.kind==='public'||binding.visibility.path.every((part,index)=>consumer[index]===part);
  if(segments.length===1){const binding=scope.bindings.find(binding=>binding.namespace==='macro'&&binding.name===segments[0]);if(!binding)return {path:segments[0]===state.facts.profile.name?['std',state.facts.profile.name]:[...segments],binding:null};return binding.status==='resolved'&&visible(binding)?{path:binding.target,binding}:{path:null,binding};}
  const first=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===segments[0]);
  let path=first?.status==='resolved'&&visible(first)?[...first.target,...segments.slice(1)]:first?null:[...segments];
  if(!path)return {path:null,binding:first};
  if(path[0]==='self')path=['crate',...consumer,...path.slice(1)];
  if(path[0]==='super'){const parent=[...consumer];let index=0;while(path[index]==='super'){if(!parent.length)return {path:null,binding:first};parent.pop();index++;}path=['crate',...parent,...path.slice(index)];}
  if(path[0]==='crate') {
    const owner=mapGet.call(issued.scopeByPath,JSON.stringify(path.slice(1,-1))),leaf=owner?.bindings.find(binding=>binding.namespace==='macro'&&binding.name===path.at(-1));
    if(!leaf||leaf.status!=='resolved'||!visible(leaf))return {path:null,binding:leaf??first};
    path=leaf.target;return {path,binding:leaf};
  }
  return {path,binding:first};
}
export function sourceMatchesCandidate(parser,segments) {
  const state=parserFrame(parser);if(!state)return segments.at(-1)==='matches';
  const resolved=resolvedMacroPath(state,segments).path;
  return segments.at(-1)===state.facts.profile.name||resolved&&['std','core'].some(root=>resolved.join('::')===root+'::'+state.facts.profile.name);
}
export function originalMatchesImport(parser,segments) {
  const state=parserFrame(parser);if(!state||segments.length<2)return false;
  const resolved=resolvedMacroPath(state,segments).path;
  return !!resolved&&['std','core'].some(root=>resolved.join('::')===root+'::'+state.facts.profile.name);
}
export function proveOriginalMatchesCall(parser,{segments,start,end}={}) {
  const state=matchesParserFacts(parser),{facts,module}=state;
  if(!Array.isArray(segments)||!segments.length||!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<=start||end>state.sourceLength)throw new TypeError('Matches call escapes its original source slice');
  if(state.methodTransform&&(start<state.captured.originalBodySpan.start||end>state.captured.originalBodySpan.end))throw new TypeError('Matches method call escapes its exact original member body');
  const source=state.captured.source.slice(start,end),invocation=originalMacroInvocation(source);
  if(JSON.stringify(invocation.path)!==JSON.stringify(segments)||!state.tokens.some(token=>token.start===start&&['identifier','macro'].includes(token.kind))||!state.tokens.some(token=>token.end===end&&[')',']','}'].includes(token.value)))throw new TypeError('Matches proof differs from actual original invocation tokens/path');
  const enclosing=originalSourceModuleItems(module).filter(item=>item.start<=start+state.offset&&item.end>=end+state.offset);
  for(const item of enclosing){const local=macroProvenance(module.source.slice(item.start,item.end));if(local.unresolvedImportScope||local.shadowedNames.includes(segments[0])||local.importedNames.includes(segments[0]))throw new TypeError('Matches local macro/import scope requires actual lexical expansion resolution');}
  const issued=immutableContext(state.context,facts),scope=mapGet.call(issued.scopeByKey,moduleScopeKey(module)),ancestors=issued.ancestors.get(module);
  if(!scope||ancestors.some(parent=>parent.configurationCondition!=='active'||parent.unresolvedBangMacroScope!==false||parent.unresolvedTypeScope!==false||parent.unresolvedAttributeMacroScope!==false))throw new TypeError('Matches owner requires active original type/bang/attribute scopes');
  for(const parent of ancestors)for(const item of originalSourceModuleItems(mapGet.call(issued.moduleByKey,moduleScopeKey(parent))))if(item.tokens[0]?.text==='#'&&item.tokens[1]?.text==='!'&&itemConfiguration(item.tokens,facts.compilationProfile).attributes.some(attribute=>['no_core','no_std','no_implicit_prelude'].includes(attribute.name)))throw new TypeError('Matches owner requires its proved original standard prelude/profile');
  const {path:resolved,binding}=resolvedMacroPath(state,segments);
  if(!resolved||!['std::'+facts.profile.name,'core::'+facts.profile.name].includes(resolved.join('::')))throw new TypeError('Matches call is not its original standard macro owner');
  if(segments.length===1&&ancestors.some(parent=>parent!==scope&&parent.bindings.some(binding=>binding.namespace==='macro'&&binding.name===segments[0]&&binding.target?.join('::')!==resolved.join('::'))))throw new TypeError('Matches call has an original ancestor textual macro shadow');
  if(segments.length>1&&!binding&&ancestors.some(parent=>parent.bindings.some(binding=>binding.namespace==='type'&&binding.name===segments[0]&&binding.target?.join('::')!==segments[0])))throw new TypeError('Matches qualified root is shadowed in original source');
  const proof=freezeMacroTree({schema:'original-standard-matches-call-v1',file:module.file,modulePath:module.path,sourceViewDigest:module.sourceView.digest,sourceScopeSha256:hash(JSON.stringify(scope)),compilationProfile:facts.compilationProfile,originalSpan:{start:start+state.offset,end:end+state.offset},sourceSha256:hash(module.source),originalInvocation:source,originalInvocationSha256:hash(source),written:segments,resolved,profileDigest:facts.profile.digest,macroOwnerResolved:true,namespaceAuthority:false,applicationEffectCompleteness:false,runtimeParity:false,constEligible:false});
  calls.set(proof,Object.freeze({state,start,end}));return proof;
}
export function originalMatchesCallFacts(proof){const facts=calls.get(proof);if(!facts)throw new TypeError('Unsealed original matches call');originalParserFrame(facts.state);return facts;}

export function configureMatchesParserFromSourceScope(parser,sourceScope) {
  const context=sourceScope?.matchesMacroContext;if(!isMatchesMacroContext(context))throw new TypeError('Source-scope matches context is absent or not genuine');
  const facts=contexts.get(context),issued=immutableContext(context,facts);
  const module=mapGet.call(issued.moduleByKey,JSON.stringify([sourceScope.source,sourceScope.module]));
  if(!module||module.sourceView!==sourceScope.sourceView||JSON.stringify(normalizeProfile(sourceScope.compilationProfile))!==JSON.stringify(facts.compilationProfile)||sourceScope.configurationCondition!==(module.configurationCondition??module.sourceView.configurationCondition))throw new TypeError('Source-scope matches context differs from its original view/profile/condition');
  const captured=capturedRustTokenSource(parser.cursor.tokens),suffix='\nfn main() {}\n';
  if(!captured)throw new TypeError('Matches source scope has no original tokenizer');
  const text=captured.source.endsWith(suffix)?captured.source.slice(0,-suffix.length):captured.source;
  const items=originalSourceModuleItems(module).filter(item=>module.source.slice(item.start,item.end)===text);
  if(items.length!==1)throw new TypeError('Matches source scope has no unique exact original declaration slice');
  return configureMatchesMacroParser(parser,context,{file:module.file,modulePath:module.path,offset:items[0].start,allowEmptyMainCarrier:true});
}

// A source member can inherit only an actual nominal type owner. This does not
// certify Copy, method dispatch, attributes, macro expansion or body effects.
export class OriginalMethodOwnerUnproved extends TypeError {}
export function originalMethodNamespaceOwner(context,method) {
  const facts=contexts.get(context),original=originalMethodMember(method);
  if(!facts)throw new TypeError('Original method owner requires its private module context');
  const issued=immutableContext(context,facts);
  const module=mapGet.call(issued.moduleByKey,JSON.stringify([original.sourcePath,original.modulePath]));
  if(!module||module.source!==original.source||module.sourceView!==original.sourceView||JSON.stringify(normalizeProfile(original.compilationProfile))!==JSON.stringify(facts.compilationProfile))throw new TypeError('Original method source/module/view/profile identity differs');
  const scope=mapGet.call(issued.scopeByKey,moduleScopeKey(module)),ancestors=issued.ancestors.get(module);
  if(!scope||ancestors.some(scope=>scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.unresolvedAttributeMacroScope!==false))throw new OriginalMethodOwnerUnproved('Original method nominal owner has unresolved source type/attribute scope');
  let route=[...method.typePath],binding;
  if(route[0]==='self')route=['crate',...module.path,...route.slice(1)];
  else if(route[0]==='super'){const parent=[...module.path];let at=0;while(route[at]==='super'){if(!parent.length)throw new TypeError('Original method owner escapes crate modules');parent.pop();at++;}route=['crate',...parent,...route.slice(at)];}
  else if(route[0]!=='crate'){binding=scope.bindings.find(binding=>binding.namespace==='type'&&binding.name===route[0]);if(!binding||binding.status!=='resolved')throw new OriginalMethodOwnerUnproved('Original method owner has no resolved actual type binding');route=[...binding.target,...route.slice(1)];}
  if(route[0]!=='crate')throw new OriginalMethodOwnerUnproved('Original inherent method owner is not a source crate nominal type');
  const owner=mapGet.call(issued.scopeByPath,JSON.stringify(route.slice(1,-1))),nominal=owner?.bindings.find(binding=>binding.namespace==='type'&&binding.name===route.at(-1));
  if(!nominal||nominal.status!=='resolved'||!['struct','enum'].includes(nominal.kind)||nominal.via!=='declaration'||JSON.stringify(nominal.target)!==JSON.stringify(route))throw new OriginalMethodOwnerUnproved('Original method owner needs its actual declared nominal type');
  const consumer=module.path;
  if(nominal.visibility?.kind!=='public'&&nominal.visibility?.path&&!nominal.visibility.path.every((part,index)=>consumer[index]===part))throw new TypeError('Original method nominal owner is inaccessible from its source module');
  const hashes=originalOwnerHashes(issued,module,scope);
  return freezeMacroTree({schema:'original-method-namespace-owner-v1',file:module.file,modulePath:module.path,sourceSha256:hashes.sourceSha256,sourceViewDigest:module.sourceView.digest,compilationProfile:facts.compilationProfile,owner:route,originalSpan:method.span,originalImplementationSpan:original.implementationSpan,scopeSha256:hashes.scopeSha256,scopeMetadataSha256:hashes.scopeMetadataSha256,namespaceAuthority:false,copyAuthority:false,applicationEffectCompleteness:false,runtimeParity:false});
}

// Read-only original facts. A caller cannot register a scope or turn copied
// owner metadata into this context. High consumers recheck the member issuer.
export function originalMethodParserNamespace(context,method) {
  originalMethodNamespaceOwner(context,method);
  const facts=contexts.get(context),original=originalMethodMember(method),issued=immutableContext(context,facts);
  const scope=mapGet.call(issued.scopeByKey,JSON.stringify([original.sourcePath,original.modulePath]));
  if(!scope)throw new TypeError('Original method parser has no actual module scope');
  const shadowedEffectRoots=issued.shadowedEffectRoots;
  return Object.freeze({scope,scopes:facts.evidence.scopes,modulePath:original.modulePath,compilationProfile:facts.compilationProfile,shadowedEffectRoots});
}

export function configureMatchesMethodParser(parser,context,method) {
  const captured=originalMethodParserTokenFacts(parser.cursor.tokens),transform=originalMethodTransformFacts(captured.proof),namespace=originalMethodParserNamespace(context,method),facts=contexts.get(context),issued=immutableContext(context,facts);
  if(transform.context!==context||transform.method!==method)throw new TypeError('Matches method parser has another original source transform/member context');
  const module=mapGet.call(issued.moduleByKey,JSON.stringify([captured.sourcePath,captured.modulePath]));
  if(!module||module.source!==captured.source||module.sourceView!==captured.sourceView||JSON.stringify(normalizeProfile(captured.compilationProfile))!==JSON.stringify(facts.compilationProfile))throw new TypeError('Matches method parser changed its full original view/profile');
  configureParserSourceScope(parser,namespace.scope,namespace.scopes,namespace.modulePath);parser.modulePath=[...namespace.modulePath];
  parser.aliases=new Map(nativeEntries(parser.sourceNamespaceAliases.type).map(([path,map])=>[path,new Map(nativeEntries(map))]));
  configureRustEditionParser(parser,facts.cargoEditionContext);
  recordParserFrame(parser,{context,facts,module,offset:0,sourceLength:module.source.length,captured,tokens:parser.cursor.tokens,methodTransform:captured.proof,namespaceDigest:initialNamespaceDigest(parser,issued,module,namespace.scope)});
  return parser;
}
