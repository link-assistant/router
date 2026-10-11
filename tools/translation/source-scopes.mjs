import {compilationProfile} from './cfg-profile.mjs';
import {macroBindingAffects,macroScopeUncertain} from './macro-subnamespaces.mjs';
// Resolved namespace evidence configures parsers without expanding macros or
// inferring a callable implementation from an imported signature.
export function parserSourceScope(scope,scopes=[scope]){
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
  const ancestors=scopes.filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
  return {compilationProfile:compilationProfile(scope.compilationProfile),aliases:namespaceAliases.type,shadowedBindings:namespaceShadows.type,namespaceAliases,namespaceShadows,shadowedPreludeTypes:new Set(scope.bindings.filter(binding=>binding.namespace==='type').map(binding=>binding.name)),
    shadowedBuiltinMacros:new Set(ancestors.flatMap(scope=>scope.bindings.filter(binding=>macroBindingAffects(binding,'bang')).map(binding=>binding.name))),
    unresolvedTypeScope:scope.unresolvedTypeScope,unresolvedMacroScope:ancestors.some(scope=>scope.unresolvedMacroScope),unresolvedBangMacroScope:ancestors.some(scope=>macroScopeUncertain(scope,'bang')),unresolvedAttributeMacroScope:ancestors.some(scope=>macroScopeUncertain(scope,'attribute'))};
}
export function configureParserSourceScope(parser,scope,scopes=[scope],path=scope.path){
  const evidence=parserSourceScope(scope,scopes);
  const ownedScopes=new Map();
  for(const candidate of scopes){
    const key=candidate.path.join('.');
    if(ownedScopes.has(key))throw new TypeError('Source namespace scopes have duplicate module paths');
    ownedScopes.set(key,parserSourceScope(candidate,scopes));
  }
  parser.compilationProfile=evidence.compilationProfile;
  parser.sourceNamespaceAliases=Object.fromEntries(['type','value','macro'].map(namespace=>[namespace,new Map([...ownedScopes].map(([key,owned])=>[key,new Map(owned.namespaceAliases[namespace])]))]));
  // A qualified path still checks visibility from the consuming module. Keep
  // inaccessible bindings explicit so a later declaration lookup cannot grant
  // them merely because their canonical source name exists.
  for(const candidate of scopes)for(const binding of candidate.bindings){
    const visibility=binding.visibility;
    if(visibility&&visibility.kind!=='public'&&!visibility.path.every((name,index)=>path[index]===name))parser.sourceNamespaceAliases[binding.namespace].get(candidate.path.join('.')).set(binding.name,['crate','ml_inaccessible_source_binding',...candidate.path,binding.name]);
  }
  parser.aliases=parser.sourceNamespaceAliases.type;
  parser.sourceNamespaceBindingEvidence=new Map(scopes.map(candidate=>[candidate.path.join('.'),candidate.bindings]));
  parser.sourceNamespaceShadows=evidence.namespaceShadows;
  parser.sourceNamespaceEvidence={source:scope.file,module:[...scope.path],bindings:scope.bindings.map(binding=>({name:binding.name,namespace:binding.namespace,kind:binding.kind,status:binding.status,target:binding.target?[...binding.target]:null,source:binding.source,sourceSpan:binding.span?{...binding.span}:null}))};
  parser.shadowedPreludeTypes=evidence.shadowedPreludeTypes;parser.shadowedImportedBindings=evidence.shadowedBindings;
  parser.shadowedBuiltinMacros=evidence.shadowedBuiltinMacros;parser.unresolvedImportScope=evidence.unresolvedTypeScope;parser.unresolvedMacroScope=evidence.unresolvedBangMacroScope;parser.unresolvedAttributeMacroScope=evidence.unresolvedAttributeMacroScope;
  return parser;
}
