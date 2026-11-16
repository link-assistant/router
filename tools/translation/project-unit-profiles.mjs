// Additive source profile. Reuse all original profiles and runtime contracts.
import {ownedUnitProfile as originalProfile,runtimeAssetsForSourceUnit as originalAssets} from './owned-unit-profiles.mjs';
import {OWNED_PROJECT_NATIVE_INPUTS,ownedProjectUnitRuntimeSources,translateOwnedProjectUnit} from './owned-project-unit.mjs';
import {ownedOutcomeRuntimeAssets} from './owned-outcome-runtime-assets.mjs';
export function ownedUnitProfile(profile){return profile==='owned-project'?{nativeInputs:OWNED_PROJECT_NATIVE_INPUTS,runtimeSources:ownedProjectUnitRuntimeSources,translate:translateOwnedProjectUnit,runtimeAssets:ownedOutcomeRuntimeAssets}:originalProfile(profile);}
export function runtimeAssetsForSourceUnit(unit,assets,runtime){if(unit.profile!=='owned-project')return originalAssets(unit,assets,runtime);const selected=ownedOutcomeRuntimeAssets();selected.set('effects.mjs',runtime.javascript);selected.set('effects.d.mts',runtime.declarations);return selected;}
