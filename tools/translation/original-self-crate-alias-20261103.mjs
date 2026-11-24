// Actual own-crate declaration only; never an external --extern/sysroot claim.
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {withSourceInputValidation} from './source-failure-operations.mjs';
const fail=message=>{throw TypeError('Original self crate alias: '+message);};
export function requireOriginalSelfCrateAlias({modules,sourceScopes,compilationProfile,module,scope,item}={}){
 return withSourceInputValidation(()=>{
  if(!isResolvedSourceScopeSet(sourceScopes))fail('genuine private source scope set required');
  const close=()=>{
   assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile});
   if(!modules.includes(module)||!sourceScopes.includes(scope)||scope.file!==module.file||scope.path.join('::')!==module.path.join('::')||!originalSourceModuleItems(module).includes(item))fail('actual declaration/module/scope association changed');
  };
  return withCompleteSourceClosingFence(()=>{
   close();const tokens=item.tokens,at=tokens.findIndex(token=>token.text==='extern');
   if(item.term!=='extern'||at<0||!['','pub','pub(crate)','pub(self)','pub(super)'].includes(tokens.slice(0,at).map(token=>token.text).join('')))fail('ordinary exact original extern declaration required');
   const source=tokens.slice(at).map(token=>token.text),alias=tokens[at+4];
   if(source.length!==6||source[0]!=='extern'||source[1]!=='crate'||source[2]!=='self'||source[3]!=='as'||source[5]!==';'||tokens[at+2].rawIdentifier||alias?.type!=='ident'||!/^[_\p{ID_Start}][_\p{ID_Continue}]*$/u.test(alias.text)||['crate','self','super','Self','std','core','alloc','String','Vec'].includes(alias.text))fail('only actual self identity with nonstandard explicit alias admitted');
   if(module.configurationCondition!=='active'||scope.configurationCondition!=='active'||scope.unresolvedTypeScope!==false||scope.unresolvedBangMacroScope!==false||scope.unresolvedAttributeMacroScope!==false)fail('actual active closed declaration producer/type scope required');
   const roots=modules.filter(row=>row.path.length===0);if(roots.length!==1)fail('one original tracked crate root required');originalSourceModuleItems(roots[0]);
   if(alias.text!=='_'){
    const bindings=scope.bindings.filter(binding=>binding.namespace==='type'&&binding.name===alias.text);
    if(bindings.length!==1)fail('one actual own-crate type binding required');const binding=bindings[0];
    if(binding.status!=='resolved'||binding.kind!=='mod'||binding.via!=='declaration'||binding.externCrateBinding!==true||binding.externCrateSelf!==true||binding.target?.join('::')!=='crate'||binding.source!==module.file||binding.span?.start!==item.start||binding.span?.end!==item.end||binding.declaration?.source!==module.file||binding.declaration.span?.start!==item.start||binding.declaration.span?.end!==item.end)fail('actual original self alias binding differs');
   }
   close();return Object.freeze({kind:'original-self-crate-alias-source-data',alias:alias.text,source:module.file,target:'crate',externalDependencyIdentity:false,invokedCompilerIdentity:false,semanticAuthority:false});
  },[close]);
 });
}
