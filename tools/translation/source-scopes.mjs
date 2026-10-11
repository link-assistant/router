import {compilationProfile} from './cfg-profile.mjs';
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
    shadowedBuiltinMacros:new Set(ancestors.flatMap(scope=>scope.bindings.filter(binding=>binding.namespace==='macro').map(binding=>binding.name))),
    unresolvedTypeScope:scope.unresolvedTypeScope,unresolvedMacroScope:ancestors.some(scope=>scope.unresolvedMacroScope)};
}
export function configureParserSourceScope(parser,scope,scopes=[scope],path=scope.path){
  const evidence=parserSourceScope(scope,scopes);
  parser.compilationProfile=evidence.compilationProfile;
  parser.aliases=new Map([[path.join('.'),new Map(evidence.aliases)]]);
  parser.sourceNamespaceAliases=Object.fromEntries(Object.entries(evidence.namespaceAliases).map(([namespace,aliases])=>[namespace,new Map([[path.join('.'),new Map(aliases)]])]));
  parser.sourceNamespaceShadows=evidence.namespaceShadows;
  parser.sourceNamespaceEvidence={source:scope.file,module:[...scope.path],bindings:scope.bindings.map(binding=>({name:binding.name,namespace:binding.namespace,status:binding.status,target:binding.target?[...binding.target]:null,source:binding.source,sourceSpan:binding.span?{...binding.span}:null}))};
  parser.shadowedPreludeTypes=evidence.shadowedPreludeTypes;parser.shadowedImportedBindings=evidence.shadowedBindings;
  parser.shadowedBuiltinMacros=evidence.shadowedBuiltinMacros;parser.unresolvedImportScope=evidence.unresolvedTypeScope;parser.unresolvedMacroScope=evidence.unresolvedMacroScope;
  return parser;
}
