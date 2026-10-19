// Compose existing resolver/output rules without merging public scope flags.
import {resolveModuleBindings,resolveEnclosingNamespaceModuleBindings,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {deriveFootprintSourceContext} from './derive-footprints.mjs';
import {createDeriveBangContext} from './derive-bang-context.mjs';
import {createDeriveEnclosingNamespaceContext} from './derive-enclosing-namespace-context.mjs';
import {createRulePipeline} from './rule-pipeline.mjs';

const pipeline=createRulePipeline([
  {phase:'language',rules:[
    {id:'rust.derived-source-binding.enriched-resolution.v1',apply(state){
      state.binding=resolveModuleBindings(state.input);
      state.source=deriveFootprintSourceContext(state.input.deriveContext);
      // Even the unchanged fast path must belong to this genuine context's
      // complete original graph/views/profile, not a foreign input certificate.
      assertResolvedSourceScopeOrigin(state.binding.scopes,{modules:state.source.modules,compilationProfile:state.source.compilationProfile});
      state.uncertain=state.binding.scopes.some(scope=>scope.unresolvedTypeScope);
      return state;
    }},
    {id:'rust.derived-source-binding.complete-resolution-equivalence.v1',apply(state){
      if(!state.uncertain)return state;
      const input={...state.input,externalModules:state.source.externalModules};
      const binding=resolveModuleBindings(input);
      // Every binding, diagnostic, condition, flag, ordering and extern-prelude
      // entry must agree. An enrichment that affects lookup keeps the old result.
      if(JSON.stringify(binding)===JSON.stringify(state.binding))state.original=input;
      return state;
    }},
    {id:'rust.derived-source-binding.original-complete-output-effects.v1',apply(state){
      if(!state.original)return state;
      const deriveBangContext=createDeriveBangContext({deriveContext:state.input.deriveContext});
      // This is a complete genuine resolver result, not a copied/edited scope.
      // Its original external table, graph/profile and each invocation pass the
      // existing deriveBangModules/deriveBangOutputAt/empty-effect checks.
      state.binding=resolveModuleBindings({...state.original,deriveBangContext});
      return state;
    }},
  ]},
  {phase:'repository',rules:[]},
]);

export function resolveDerivedSourceBindings({modules,externalModules,deriveContext,compilationProfile}){
  return pipeline.run({input:{modules,externalModules,deriveContext,compilationProfile}}).value.binding;
}

// Additive enclosing-name consumer. Keep the complete legacy output pipeline
// above for its existing callers; this format uses its own genuine issuer.
const enclosingPipeline=createRulePipeline([
  {phase:'language',rules:[
    {id:'rust.derived-enclosing-source-binding.enriched-resolution.v1',apply(state){
      state.binding=resolveModuleBindings(state.input);
      state.source=deriveFootprintSourceContext(state.input.deriveContext);
      assertResolvedSourceScopeOrigin(state.binding.scopes,{modules:state.source.modules,compilationProfile:state.source.compilationProfile});
      return state;
    }},
    {id:'rust.derived-enclosing-source-binding.complete-resolution-equivalence.v1',apply(state){
      if(!state.binding.scopes.some(scope=>scope.unresolvedTypeScope))return state;
      const input={...state.input,externalModules:state.source.externalModules},binding=resolveModuleBindings(input);
      if(JSON.stringify(binding)===JSON.stringify(state.binding))state.original=input;
      return state;
    }},
    {id:'rust.derived-enclosing-source-binding.original-enclosing-effects.v1',apply(state){
      if(!state.original)return state;
      const deriveBangContext=state.deriveBangContext??createDeriveEnclosingNamespaceContext({deriveContext:state.input.deriveContext});
      state.binding=resolveEnclosingNamespaceModuleBindings({...state.original,deriveBangContext});
      return state;
    }},
  ]},
  {phase:'repository',rules:[]},
]);
export function resolveDerivedEnclosingSourceBindings({modules,externalModules,deriveContext,compilationProfile,deriveBangContext}){
  // Explicit composition of a genuine context inside one project invocation.
  // The resolver rechecks its complete original source/profile on consumption;
  // no result is memoized and the ordinary equivalence check stays first.
  return enclosingPipeline.run({input:{modules,externalModules,deriveContext,compilationProfile},deriveBangContext}).value.binding;
}
