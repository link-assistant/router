import {requireOriginalSelfCrateAlias} from './original-self-crate-alias-20261103.mjs';
// Native source context, privately associated with the actual original scope
// array and Cargo inputs. This does not establish an invoked rustc sysroot.
import {createHash} from 'node:crypto';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {originalSourceModuleItems,isSourceModuleView} from './source-module-views.mjs';
import {originalCargoEditionEvidence} from './cargo-edition-context.mjs';
import {deriveDependencyOriginalInputs} from './derive-dependencies.mjs';
import {itemConfiguration} from './cfg-profile.mjs';
import {withCompleteSourceClosingFence} from './complete-source-closing-fence.mjs';
import {requireOriginalOrderedTextMapStandardSources} from './ordered-text-map-callers-20261102-standard-source.mjs';
const issued=new WeakMap(),hash=value=>createHash('sha256').update(value).digest('hex');
const fail=message=>{throw TypeError('Borrowed standard-map native original source context: '+message);};
export function proveBorrowedStandardMapNativeSourceContext({modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies,standardSources}={}){
 requireOriginalOrderedTextMapStandardSources(standardSources);
 if(!isResolvedSourceScopeSet(sourceScopes))fail('actual private original scopes required');assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile});
 const roots=modules.filter(module=>module.path.length===0),leaves=modules.filter(module=>module.path.join('::')==='borrowed_standard_map_20261102');if(roots.length!==1||leaves.length!==1)fail('actual root/native leaf required');
 const selected=[roots[0],leaves[0]],edition=originalCargoEditionEvidence(cargoEditionContext),cargo=deriveDependencyOriginalInputs(deriveDependencies);
 if(edition?.status!=='explicit-package-edition'||edition.edition!=='2024'||edition.sourceSha256!==hash(cargo.manifest))fail('one actual Cargo source must own both edition and dependency closure');
 const scopes=selected.map(module=>{
  if(!isSourceModuleView(module.sourceView)||module.configurationCondition!=='active'||module.sourceView.configurationCondition!=='active')fail('genuine active full source views required');
  const scope=sourceScopes.find(scope=>scope.file===module.file&&scope.path.join('::')===module.path.join('::'));
  if(!scope||scope.configurationCondition!=='active'||scope.unresolvedBangMacroScope!==false||scope.unresolvedTypeScope!==false||scope.unresolvedAttributeMacroScope!==false)fail('unknown native/parent producer refused');
  for(const binding of scope.bindings)if(['std','core','alloc','String','Vec'].includes(binding.name)&&['type','macro'].includes(binding.namespace))fail('standard/prelude source shadow requires separate original ownership');
  for(const item of originalSourceModuleItems(module)){
   const condition=itemConfiguration(item.tokens,compilationProfile);if(condition.status==='inactive')continue;
   if(condition.attributes.some(attribute=>['no_core','no_std','no_implicit_prelude','prelude_import'].includes(attribute.name)))fail('ordinary canonical std/prelude source domain required');
   // Explicit external identities may depend on an invocation's --extern. The
   // ordinary injected std route accepts no source replacement/rename here.
   if(item.term==='extern'&&item.tokens.some(token=>token.text==='crate'))requireOriginalSelfCrateAlias({modules,sourceScopes,compilationProfile,module,scope,item});
  }
  return scope;
 });
 const close=()=>{assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile});if(originalCargoEditionEvidence(cargoEditionContext)!==edition||deriveDependencyOriginalInputs(deriveDependencies)!==cargo)fail('private Cargo input association changed');for(const module of selected)originalSourceModuleItems(module);requireOriginalOrderedTextMapStandardSources(standardSources);};
 return withCompleteSourceClosingFence(()=>{
  const value=Object.freeze({schema:'borrowed-standard-map-native-source-context-20261103-v1',edition:'2024',canonicalStandardAbi:'rust-1.89-ordinary-std-source-namespace-v1',sourcePaths:Object.freeze(selected.map(module=>module.file)),manifestSha256:hash(cargo.manifest),lockSha256:hash(cargo.lock),rootAndLeafProducerScopesClosed:true,standardRootShadowAbsent:true,ordinarySourcePreludeSelected:true,invokedCompilerUnitIdentity:false,traitDispatchAuthority:false,runtimeAuthority:false});
  issued.set(value,{modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies,standardSources,close,scopes});return value;
 },[close]);
}
export function requireBorrowedStandardMapNativeSourceContext(value,input){
 const record=issued.get(value);if(!record||record.modules!==input.modules||record.sourceScopes!==input.sourceScopes||record.compilationProfile!==input.compilationProfile||record.cargoEditionContext!==input.cargoEditionContext||record.deriveDependencies!==input.deriveDependencies||record.standardSources!==input.standardSources)fail('copied/foreign native source context');record.close();return value;
}
