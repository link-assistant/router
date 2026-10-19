import {compilationProfile} from './cfg-profile.mjs';
import {macroBindingAffects,macroScopeUncertain} from './macro-subnamespaces.mjs';
import {isResolvedSourceScopeSet} from './module-bindings.mjs';
import {immutableNamespaceIntrinsicsUnchanged,closedFrozenNamespaceScopes,closedNamespaceVisibilityMask,closedNamespaceConsumerPath} from './immutable-source-namespace-paths.mjs';
// Resolved namespace evidence configures parsers without expanding macros or
// inferring a callable implementation from an imported signature.
function sourceNamespaceMaps(scope){
  const namespaceAliases={},namespaceShadows={};
  for(const namespace of ['type','value','macro']){
    const grouped=new Map(),aliases=new Map(),shadowedBindings=new Set();
    for(const binding of scope.bindings.filter(binding=>binding.namespace===namespace)){
      if(!grouped.has(binding.name))grouped.set(binding.name,[]);grouped.get(binding.name).push(binding);
    }
    for(const [name,bindings] of grouped){
      const targets=new Set(bindings.map(binding=>JSON.stringify(binding.target)));
      if(bindings.every(binding=>binding.status==='resolved'&&binding.target)&&targets.size===1)aliases.set(name,[...bindings[0].target]);
      else {shadowedBindings.add(name);aliases.set(name,['crate','ml_unresolved_source_binding',name]);}
    }
    namespaceAliases[namespace]=aliases;namespaceShadows[namespace]=shadowedBindings;
  }
  return {namespaceAliases,namespaceShadows};
}
const namespaceTemplates=new WeakMap();
const immutableBootstrap=immutableNamespaceIntrinsicsUnchanged();
const immutableTemplates=immutableBootstrap?new WeakSet():null,immutableParsers=immutableBootstrap?new WeakSet():null;
const immutableTargets=immutableBootstrap?new WeakMap():null;
let immutableStorageEnabled=immutableBootstrap;
function sharingEnvironment(){
  if(!immutableStorageEnabled)return false;
  // A changed collection/iterator can expose a formerly private template.
  // Never reuse an earlier frozen copy after that possible escape boundary.
  if(!immutableNamespaceIntrinsicsUnchanged()){immutableStorageEnabled=false;return false;}
  return true;
}
// An explicit request changes storage mutability only; it is no source proof.
// Standalone/public setup keeps its original fresh mutable target arrays.
export function requestImmutableNamespaceTargets(parser){
  if(immutableBootstrap&&immutableNamespaceIntrinsicsUnchanged())immutableParsers.add(parser);
  return parser;
}
function sourceNamespaceTemplate(scopes){
  const native=sharingEnvironment();
  const reusable=isResolvedSourceScopeSet(scopes),known=reusable&&namespaceTemplates.get(scopes);
  if(known)return known;
  const shareable=native&&reusable&&closedFrozenNamespaceScopes(scopes)&&isResolvedSourceScopeSet(scopes);
  const ownedScopes=new Map(),restricted=[],bindings=[];
  for(const candidate of scopes){
    const key=candidate.path.join('.');
    if(ownedScopes.has(key))throw new TypeError('Source namespace scopes have duplicate module paths');
    ownedScopes.set(key,sourceNamespaceMaps(candidate));bindings.push([key,candidate.bindings]);
    for(const binding of candidate.bindings)if(binding.visibility&&binding.visibility.kind!=='public')restricted.push({key,path:candidate.path,binding});
  }
  const restrictionSlots=Object.fromEntries(['type','value','macro'].map(namespace=>[namespace,new Map()]));
  restricted.forEach((candidate,index)=>{
    const slots=restrictionSlots[candidate.binding.namespace];
    if(!slots.has(candidate.key))slots.set(candidate.key,new Map());
    const names=slots.get(candidate.key);if(!names.has(candidate.binding.name))names.set(candidate.binding.name,[]);names.get(candidate.binding.name).push(index);
  });
  const template={ownedScopes,restricted,bindings,restrictionSlots,visibilityMasks:new Map(),scopePaths:new Set(scopes.map(scope=>JSON.stringify(scope.path))),reusable};
  if(shareable&&sharingEnvironment()){
    // Preserve the original private mutable targets for the exact fallback:
    // an observed Array iterator can inspect or mutate those original arrays.
    for(const owned of ownedScopes.values())for(const namespace of ['type','value','macro'])for(const target of owned.namespaceAliases[namespace].values())immutableTargets.set(target,Object.freeze([...target]));
    for(const candidate of restricted)immutableTargets.set(candidate,Object.freeze(['crate','ml_inaccessible_source_binding',...candidate.path,candidate.binding.name]));
    immutableTemplates.add(template);
  }
  if(reusable)namespaceTemplates.set(scopes,template);
  return template;
}
function sourceVisibilityMask(template,path){
  const key=JSON.stringify(path),cacheable=template.reusable&&template.scopePaths.has(key);
  if(cacheable&&template.visibilityMasks.has(key))return template.visibilityMasks.get(key);
  // Path serialization can invoke a caller hook after the entry qualifier.
  // Qualify the actual from boundary immediately before its original call.
  sharingEnvironment();
  const mask=Uint8Array.from(template.restricted,candidate=>candidate.binding.visibility.path.every((name,index)=>path[index]===name)?0:1);
  if(cacheable)template.visibilityMasks.set(key,mask);
  return mask;
}
function cloneSourceNamespaces(template,path,immutable=false){
  if(sharingEnvironment()&&!closedNamespaceConsumerPath(path))immutableStorageEnabled=false;
  const mask=sourceVisibilityMask(template,path);
  const share=sharingEnvironment()&&immutable&&immutableTemplates.has(template)&&closedNamespaceVisibilityMask(mask,template.restricted.length);
  return Object.fromEntries(['type','value','macro'].map(namespace=>[namespace,new Map([...template.ownedScopes].map(([key,owned])=>{
    const restrictions=template.restrictionSlots[namespace].get(key);
    const aliases=new Map([...owned.namespaceAliases[namespace]].map(([name,target])=>{
      const indices=restrictions?.get(name);let inaccessible=null;
      for(const index of indices??[])if(mask[index])inaccessible=template.restricted[index];
      return [name,share?immutableTargets.get(inaccessible??target):inaccessible?['crate','ml_inaccessible_source_binding',...inaccessible.path,name]:[...target]];
    }));
    return [key,aliases];
  }))]));
}
export function parserSourceScope(scope,scopes=[scope]){
  const {namespaceAliases,namespaceShadows}=sourceNamespaceMaps(scope);
  const ancestors=scopes.filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
  return {compilationProfile:compilationProfile(scope.compilationProfile),aliases:namespaceAliases.type,shadowedBindings:namespaceShadows.type,namespaceAliases,namespaceShadows,shadowedPreludeTypes:new Set(scope.bindings.filter(binding=>binding.namespace==='type').map(binding=>binding.name)),
    shadowedBuiltinMacros:new Set(ancestors.flatMap(scope=>scope.bindings.filter(binding=>macroBindingAffects(binding,'bang')).map(binding=>binding.name))),
    unresolvedTypeScope:scope.unresolvedTypeScope,unresolvedMacroScope:ancestors.some(scope=>scope.unresolvedMacroScope),unresolvedBangMacroScope:ancestors.some(scope=>macroScopeUncertain(scope,'bang')),unresolvedAttributeMacroScope:ancestors.some(scope=>macroScopeUncertain(scope,'attribute'))};
}
export function configureParserSourceScope(parser,scope,scopes=[scope],path=scope.path){
  const evidence=parserSourceScope(scope,scopes);
  const template=sourceNamespaceTemplate(scopes),{bindings}=template;
  parser.compilationProfile=evidence.compilationProfile;
  // Reuse only private visibility decisions for genuine immutable scopes.
  // Every parser owns complete native maps. Explicit internal consumers may
  // share privately frozen target vectors; ordinary callers keep fresh paths.
  // copied/caller scopes and paths outside the actual graph remain uncached.
  parser.sourceNamespaceAliases=cloneSourceNamespaces(template,path,immutableBootstrap&&immutableNamespaceIntrinsicsUnchanged()&&immutableParsers.has(parser));
  parser.aliases=parser.sourceNamespaceAliases.type;
  parser.sourceNamespaceBindingEvidence=new Map(bindings);
  parser.sourceNamespaceShadows=evidence.namespaceShadows;
  parser.sourceNamespaceEvidence={source:scope.file,module:[...scope.path],bindings:scope.bindings.map(binding=>({name:binding.name,namespace:binding.namespace,kind:binding.kind,status:binding.status,target:binding.target?[...binding.target]:null,source:binding.source,sourceSpan:binding.span?{...binding.span}:null}))};
  parser.shadowedPreludeTypes=evidence.shadowedPreludeTypes;parser.shadowedImportedBindings=evidence.shadowedBindings;
  parser.shadowedBuiltinMacros=evidence.shadowedBuiltinMacros;parser.unresolvedImportScope=evidence.unresolvedTypeScope;parser.unresolvedMacroScope=evidence.unresolvedBangMacroScope;parser.unresolvedAttributeMacroScope=evidence.unresolvedAttributeMacroScope;
  return parser;
}
