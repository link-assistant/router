// Explicit unresolved native owner boundary. Source observations are useful
// progress, but neither a library pin nor a resolved public descriptor issues
// std/prelude/derive/Cargo-unit authority for this opaque native type.
import {STANDARD_NAMESPACE_EVIDENCE,isStandardNamespaceEvidence} from './namespace-standard.mjs';
import {originalOrderedTextMapStandardSources,requireOriginalOrderedTextMapStandardSources,requireOriginalOrderedMapStandardNamespaceFact} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {proveOrderedTextMapNativeSourceContext,requireOrderedTextMapNativeSourceContext} from './ordered-text-map-callers-20261102-native-context.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {createDeriveFootprintContext,deriveFootprintAt} from './derive-footprints.mjs';
import {proveBuiltinDeriveEmptyEnclosingEffect,builtinDeriveEmptyEnclosingEffectFacts} from './derive-output-effects.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {originalCargoEditionEvidence} from './cargo-edition-context.mjs';
const fail=message=>{throw TypeError('Ordered text map native owner boundary OPEN: '+message);};
export function requireOrderedTextMapNativeLibraryOwners({modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies}={}){
 if(!isResolvedSourceScopeSet(sourceScopes))fail('genuine original source scopes required');assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile});
 const leaves=modules.filter(module=>module.path.join('::')==='translation_ordered_text_map_core');if(leaves.length!==1)fail('actual native module required');const module=leaves[0],items=originalSourceModuleItems(module),owners=items.filter(item=>item.term==='struct'&&item.name==='OrderedTextMap');if(owners.length!==1)fail('actual original opaque declaration required');
 for(const path of [['std','collections','BTreeMap'],['std','string','String']]){
  const facts=STANDARD_NAMESPACE_EVIDENCE.facts.filter(fact=>fact.target.join('::')===path.join('::'));
  if(facts.length!==1||!isStandardNamespaceEvidence(facts[0]))fail('no genuine registered original standard owner for '+path.join('::'));requireOriginalOrderedMapStandardNamespaceFact(facts[0]);
 }
 const standardSources=originalOrderedTextMapStandardSources();requireOriginalOrderedTextMapStandardSources(standardSources);for(const original of standardSources.facts){const fact=STANDARD_NAMESPACE_EVIDENCE.facts.find(fact=>fact.target.join('::')===original.target.join('::'));if(!fact||JSON.stringify(fact.route)!==JSON.stringify(original.route))fail('fresh full original standard-owner source route differs');}
 const sourceInput={modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies,standardSources},nativeSourceContext=proveOrderedTextMapNativeSourceContext(sourceInput);requireOrderedTextMapNativeSourceContext(nativeSourceContext,sourceInput);
 const scope=sourceScopes.find(scope=>scope.file===module.file&&scope.path.join('::')==='translation_ordered_text_map_core'),bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='BTreeMap');
 if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].target?.join('::')!=='std::collections::BTreeMap')fail('actual native import still lacks its original standard owner');
 const edition=originalCargoEditionEvidence(cargoEditionContext);if(edition?.status!=='explicit-package-edition'||edition.edition!=='2024')fail('actual private original Cargo edition2024 source required');
 if(!deriveDependencies)fail('actual original derive dependency closure required');
 const context=createDeriveFootprintContext({modules,dependencies:deriveDependencies,compilationProfile,externalModules:registeredStandardHostBindings()}),certificate=deriveFootprintAt(context,module,owners[0]);if(!certificate)fail('actual native derive invocation required');
 const effect=proveBuiltinDeriveEmptyEnclosingEffect(context,module,owners[0]);builtinDeriveEmptyEnclosingEffectFacts(effect,context,module,owners[0]);
 // The original std import/prelude SOURCE branches and actual root/leaf
 // source-context joins now have receipts. They do not identify an invoked
 // compiler's sysroot/extern replacements or generated method trait dispatch.
 fail('original invoked native unit/extern-std identity and generated trait dispatch owner joins are not yet issued');
}
