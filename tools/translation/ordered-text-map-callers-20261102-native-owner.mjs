// The actual original private source frames select one narrow native source
// compatibility ABI. No arbitrary host, pin, spelling or public table issues
// this Router-owned opaque type; native execution qualification stays separate.
import {issueOrderedTextMapNativeSourceABI} from './ordered-text-map-callers-20261102-native-abi.mjs';
import {STANDARD_NAMESPACE_EVIDENCE,isStandardNamespaceEvidence} from './namespace-standard.mjs';
import {originalOrderedTextMapStandardSources,requireOriginalOrderedTextMapStandardSources,requireOriginalOrderedMapStandardNamespaceFact,sameOrderedMapSourceData} from './ordered-text-map-callers-20261102-standard-source.mjs';
import {proveOrderedTextMapNativeSourceContext,requireOrderedTextMapNativeSourceContext} from './ordered-text-map-callers-20261102-native-context.mjs';
import {isResolvedSourceScopeSet,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {originalSourceModuleItems} from './source-module-views.mjs';
import {createDeriveFootprintContext,deriveFootprintAt} from './derive-footprints.mjs';
import {proveBuiltinDeriveEmptyEnclosingEffect,builtinDeriveEmptyEnclosingEffectFacts} from './derive-output-effects.mjs';
import {registeredStandardHostBindings} from './standard-host-bindings.mjs';
import {originalCargoEditionEvidence} from './cargo-edition-context.mjs';
const fail=message=>{throw TypeError('Ordered text map native owner boundary OPEN: '+message);};
export function requireOrderedTextMapNativeLibraryOwners({modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies,parser}={}){
 if(!isResolvedSourceScopeSet(sourceScopes))fail('genuine original source scopes required');assertResolvedSourceScopeOrigin(sourceScopes,{modules,compilationProfile});
 const leaves=modules.filter(module=>module.path.join('::')==='translation_ordered_text_map_core');if(leaves.length!==1)fail('actual native module required');const module=leaves[0],items=originalSourceModuleItems(module),owners=items.filter(item=>item.term==='struct'&&item.name==='OrderedTextMap');if(owners.length!==1)fail('actual original opaque declaration required');
 for(const path of [['std','collections','BTreeMap'],['std','string','String']]){
  const facts=STANDARD_NAMESPACE_EVIDENCE.facts.filter(fact=>fact.target.join('::')===path.join('::'));
  if(facts.length!==1||!isStandardNamespaceEvidence(facts[0]))fail('no genuine registered original standard owner for '+path.join('::'));requireOriginalOrderedMapStandardNamespaceFact(facts[0]);
 }
 const standardSources=originalOrderedTextMapStandardSources();requireOriginalOrderedTextMapStandardSources(standardSources);for(const original of standardSources.facts){const fact=STANDARD_NAMESPACE_EVIDENCE.facts.find(fact=>fact.target.join('::')===original.target.join('::'));if(!fact||!sameOrderedMapSourceData(fact.route,original.route))fail('fresh full original standard-owner source route differs');}
 const sourceInput={modules,sourceScopes,compilationProfile,cargoEditionContext,deriveDependencies,standardSources},nativeSourceContext=proveOrderedTextMapNativeSourceContext(sourceInput);requireOrderedTextMapNativeSourceContext(nativeSourceContext,sourceInput);
 const scope=sourceScopes.find(scope=>scope.file===module.file&&scope.path.join('::')==='translation_ordered_text_map_core'),bindings=scope?.bindings.filter(binding=>binding.namespace==='type'&&binding.name==='BTreeMap');
 if(bindings?.length!==1||bindings[0].status!=='resolved'||bindings[0].target?.join('::')!=='std::collections::BTreeMap')fail('actual native import still lacks its original standard owner');
 const edition=originalCargoEditionEvidence(cargoEditionContext);if(edition?.status!=='explicit-package-edition'||edition.edition!=='2024')fail('actual private original Cargo edition2024 source required');
 if(!deriveDependencies)fail('actual original derive dependency closure required');
 const context=createDeriveFootprintContext({modules,dependencies:deriveDependencies,compilationProfile,externalModules:registeredStandardHostBindings()}),certificate=deriveFootprintAt(context,module,owners[0]);if(!certificate)fail('actual native derive invocation required');
 const effect=proveBuiltinDeriveEmptyEnclosingEffect(context,module,owners[0]);builtinDeriveEmptyEnclosingEffectFacts(effect,context,module,owners[0]);
 // Deliberate narrow monomorphic compatibility ABI: generic BTreeMap and
 // String trait/allocator internals remain native. Actual observed compiler
 // and oracle conformance remain independent UNRUN receiving obligations.
 return issueOrderedTextMapNativeSourceABI({...sourceInput,parser,nativeSourceContext});
}
