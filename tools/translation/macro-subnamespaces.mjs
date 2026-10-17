// Rust bang macros and attribute/derive macros resolve in distinct subspaces.
// Explicit use imports still share a binding slot: ambiguity is never erased.
// https://doc.rust-lang.org/reference/names/namespaces.html#sub-namespaces
export function macroBindingAffects(binding,subnamespace) {
  if(!['bang','attribute'].includes(subnamespace))throw new TypeError('Unknown macro subnamespace');
  if(binding.namespace!=='macro')return false;
  if(binding.status==='ambiguous')return true;
  const kind=binding.macroKind;
  if(!['bang','derive','attribute','unknown'].includes(kind))return true;
  return kind==='unknown'||(subnamespace==='bang'?kind==='bang':kind!=='bang');
}
export function macroScopeUncertain(scope,subnamespace) {
  if(!['bang','attribute'].includes(subnamespace))throw new TypeError('Unknown macro subnamespace');
  const property=subnamespace==='bang'?'unresolvedBangMacroScope':'unresolvedAttributeMacroScope';
  // Legacy evidence remains conservative; absence is never completeness.
  return typeof scope[property]==='boolean'?scope[property]:scope.unresolvedMacroScope!==false;
}
export function attributeMacroProvenance(scopes) {
  const bindings=scopes.flatMap(scope=>scope.bindings.filter(binding=>macroBindingAffects(binding,'attribute')));
  return {
    macroSubnamespace:'attribute',
    sourceScopes:scopes.map(scope=>({source:scope.file,module:[...scope.path],unresolvedTypeScope:scope.unresolvedTypeScope,unresolvedAttributeMacroScope:macroScopeUncertain(scope,'attribute'),bindings:scope.bindings.filter(binding=>macroBindingAffects(binding,'attribute')).map(binding=>({name:binding.name,macroKind:binding.macroKind??'unknown',status:binding.status,source:binding.source,span:binding.span??null,target:binding.target??null}))})),
    shadowedNames:[...new Set(bindings.filter(binding=>binding.standardDerive!==true).map(binding=>binding.name))],
    importedNames:[...new Set(bindings.filter(binding=>binding.standardDerive!==true&&['named-import','glob-import'].includes(binding.via)).map(binding=>binding.name))],
    unresolvedImportScope:scopes.some(scope=>scope.unresolvedTypeScope!==false||macroScopeUncertain(scope,'attribute')),
  };
}
