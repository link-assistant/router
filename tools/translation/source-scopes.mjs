// Resolved namespace evidence configures parsers without expanding macros or
// inferring a callable implementation from an imported signature.
export function parserSourceScope(scope,scopes=[scope]){
  const grouped=new Map(),aliases=new Map(),shadowedBindings=new Set();
  for(const binding of scope.bindings.filter(binding=>binding.namespace!=='macro')){
    if(!grouped.has(binding.name))grouped.set(binding.name,[]);grouped.get(binding.name).push(binding);
  }
  for(const [name,bindings] of grouped){
    const targets=new Set(bindings.map(binding=>JSON.stringify(binding.target)));
    if(bindings.every(binding=>binding.status==='resolved'&&binding.target)&&targets.size===1)aliases.set(name,bindings[0].target);
    else {shadowedBindings.add(name);aliases.set(name,['crate','ml_unresolved_source_binding',name]);}
  }
  const ancestors=scopes.filter(candidate=>candidate.path.every((name,index)=>scope.path[index]===name));
  return {aliases,shadowedBindings,shadowedPreludeTypes:new Set(scope.bindings.filter(binding=>binding.namespace==='type').map(binding=>binding.name)),
    shadowedBuiltinMacros:new Set(ancestors.flatMap(scope=>scope.bindings.filter(binding=>binding.namespace==='macro').map(binding=>binding.name))),
    unresolvedTypeScope:scope.unresolvedTypeScope,unresolvedMacroScope:ancestors.some(scope=>scope.unresolvedMacroScope)};
}
export function configureParserSourceScope(parser,scope,scopes=[scope],path=scope.path){
  const evidence=parserSourceScope(scope,scopes);
  parser.aliases=new Map([[path.join('.'),new Map(evidence.aliases)]]);
  parser.shadowedPreludeTypes=evidence.shadowedPreludeTypes;parser.shadowedImportedBindings=evidence.shadowedBindings;
  parser.shadowedBuiltinMacros=evidence.shadowedBuiltinMacros;parser.unresolvedImportScope=evidence.unresolvedTypeScope;parser.unresolvedMacroScope=evidence.unresolvedMacroScope;
  return parser;
}
