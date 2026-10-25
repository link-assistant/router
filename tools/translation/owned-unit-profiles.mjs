// Profile dispatch is DATA plumbing. Every call freshly checks original inputs.
import {OWNED_STATE_NATIVE_INPUTS,ownedStateUnitRuntimeSources,translateOwnedStateUnit} from './owned-state-unit.mjs';
import {OWNED_OUTCOME_NATIVE_INPUTS,ownedOutcomeUnitRuntimeSources,translateOwnedOutcomeUnit} from './owned-outcome-unit.mjs';
import {hostRuntimeAssets} from './host-assets.mjs';
import {ownedOutcomeRuntimeAssets} from './owned-outcome-runtime-assets.mjs';
import {ASYNC_CONTROL_NATIVE_INPUTS,asyncControlUnitRuntimeSources,translateAsyncControlUnit} from './async-control-unit.mjs';
import {OWNED_CANCELLATION_NATIVE_INPUTS,ownedCancellationUnitRuntimeSources,translateOwnedCancellationUnit} from './owned-cancellation-unit.mjs';
export function ownedUnitProfile(profile){
 if(profile==='owned-state')return {nativeInputs:OWNED_STATE_NATIVE_INPUTS,runtimeSources:ownedStateUnitRuntimeSources,translate:translateOwnedStateUnit,runtimeAssets:hostRuntimeAssets};
 if(profile==='async-control')return {nativeInputs:ASYNC_CONTROL_NATIVE_INPUTS,runtimeSources:asyncControlUnitRuntimeSources,translate:translateAsyncControlUnit,runtimeAssets:ownedOutcomeRuntimeAssets};
 if(profile==='owned-cancellation')return {nativeInputs:OWNED_CANCELLATION_NATIVE_INPUTS,runtimeSources:ownedCancellationUnitRuntimeSources,translate:translateOwnedCancellationUnit,runtimeAssets:ownedOutcomeRuntimeAssets};
 if(profile==='owned-outcome')return {nativeInputs:OWNED_OUTCOME_NATIVE_INPUTS,runtimeSources:ownedOutcomeUnitRuntimeSources,translate:translateOwnedOutcomeUnit,runtimeAssets:ownedOutcomeRuntimeAssets};
 return null;
}
export function runtimeAssetsForSourceUnit(unit,assets,runtime){
 const owned=ownedUnitProfile(unit.profile);if(!owned||unit.profile==='owned-state')return assets;
 const selected=owned.runtimeAssets();selected.set('effects.mjs',runtime.javascript);selected.set('effects.d.mts',runtime.declarations);return selected;
}
