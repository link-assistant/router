// Compose existing resolver/output rules without merging public scope flags.
import {resolveModuleBindings,assertResolvedSourceScopeOrigin} from './module-bindings.mjs';
import {deriveFootprintSourceContext} from './derive-footprints.mjs';
import {createDeriveBangContext} from './derive-bang-context.mjs';
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
