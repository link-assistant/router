import {withCurrentRetainedPrivateNativeProofCostScope} from './private-native-proof-json.mjs';
import {resolveUnscopedModuleBindings} from './module-bindings.mjs';
export function resolveOriginalWholeOwnerBindingBootstrap({modules,externalModules=new Map(),compilationProfile:profileInput=null,deriveContext=null,deriveBangContext=null,toolContext=null}={}) {
 return withCurrentRetainedPrivateNativeProofCostScope(()=>resolveUnscopedModuleBindings({modules,externalModules,compilationProfile:profileInput,deriveContext,deriveBangContext,toolContext}));
}
